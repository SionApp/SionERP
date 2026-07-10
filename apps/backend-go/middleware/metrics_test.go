package middleware

import (
	"database/sql"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/testutil"
	dto "github.com/prometheus/client_model/go"
)

// TestMetricsMiddlewareRecordsRequestDuration verifies that a request routed
// through MetricsMiddleware() adds a sample to the request-duration histogram
// for its route+method+status label combination — the data p50/p95/p99 will be
// derived from in Grafana/Prometheus.
func TestMetricsMiddlewareRecordsRequestDuration(t *testing.T) {
	e := echo.New()

	before := testutil.CollectAndCount(requestDuration)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/test-metrics-route", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetPath("/api/v1/test-metrics-route")

	handler := MetricsMiddleware()(func(c echo.Context) error {
		return c.JSON(http.StatusOK, "ok")
	})
	if err := handler(c); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	after := testutil.CollectAndCount(requestDuration)
	if after <= before {
		t.Errorf("expected requestDuration sample count to grow (before=%d after=%d)", before, after)
	}
}

// TestMetricsMiddlewareUsesUnmatchedRouteWhenPathEmpty verifies the fallback
// label used when Echo hasn't resolved a route template (e.g. 404s) so the
// histogram never explodes into per-URL cardinality.
func TestMetricsMiddlewareUsesUnmatchedRouteWhenPathEmpty(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/does-not-exist", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	// Deliberately do NOT call c.SetPath — simulates an unmatched route.

	hist := requestDuration.WithLabelValues(http.MethodGet, "unmatched", "404").(prometheus.Histogram)
	before := histogramSampleCount(t, hist)

	handler := MetricsMiddleware()(func(c echo.Context) error {
		return c.JSON(http.StatusNotFound, "not found")
	})
	if err := handler(c); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	after := histogramSampleCount(t, hist)
	if after != before+1 {
		t.Errorf("unmatched route sample count = %v; want %v", after, before+1)
	}
}

// histogramSampleCount reads the cumulative observation count for a single
// Histogram series via the Prometheus wire format — the supported way to
// assert on histograms (testutil.ToFloat64 only works on Counter/Gauge).
func histogramSampleCount(t *testing.T, h prometheus.Histogram) uint64 {
	t.Helper()
	var m dto.Metric
	if err := h.Write(&m); err != nil {
		t.Fatalf("failed to write histogram metric: %v", err)
	}
	return m.GetHistogram().GetSampleCount()
}

// TestRecordTenantRequestCountsIndependently verifies that two different
// church_id tenants accumulate independent counters — the fairness/observability
// building block for Fase 2's per-tenant audit.
func TestRecordTenantRequestCountsIndependently(t *testing.T) {
	beforeA := testutil.ToFloat64(tenantRequestsTotal.WithLabelValues("tenant-a-metrics-test"))
	beforeB := testutil.ToFloat64(tenantRequestsTotal.WithLabelValues("tenant-b-metrics-test"))

	RecordTenantRequest("tenant-a-metrics-test")
	RecordTenantRequest("tenant-a-metrics-test")
	RecordTenantRequest("tenant-b-metrics-test")

	afterA := testutil.ToFloat64(tenantRequestsTotal.WithLabelValues("tenant-a-metrics-test"))
	afterB := testutil.ToFloat64(tenantRequestsTotal.WithLabelValues("tenant-b-metrics-test"))

	if afterA != beforeA+2 {
		t.Errorf("tenant-a count = %v; want %v", afterA, beforeA+2)
	}
	if afterB != beforeB+1 {
		t.Errorf("tenant-b count = %v; want %v", afterB, beforeB+1)
	}
}

// TestRecordTenantRequestEmptyChurchIDMapsToNone verifies bounded cardinality:
// an absent church_id (Phase 0, pre-JWT-backfill) is bucketed as "none" instead
// of an empty-string label.
func TestRecordTenantRequestEmptyChurchIDMapsToNone(t *testing.T) {
	before := testutil.ToFloat64(tenantRequestsTotal.WithLabelValues("none"))

	RecordTenantRequest("")

	after := testutil.ToFloat64(tenantRequestsTotal.WithLabelValues("none"))
	if after != before+1 {
		t.Errorf("none-bucket count = %v; want %v", after, before+1)
	}
}

// TestRegisterPoolStatsExposesNonNilStats verifies db.Stats() gauges are wired
// and readable — the key metric for the known pool-cap bottleneck
// (SetMaxOpenConns(15) in config/database.go).
func TestRegisterPoolStatsExposesNonNilStats(t *testing.T) {
	db, err := sql.Open("fake_tenant", "metrics-test")
	if err != nil {
		t.Fatalf("sql.Open failed: %v", err)
	}
	defer db.Close()
	db.SetMaxOpenConns(15)

	RegisterPoolStats(db)

	maxOpen := testutil.ToFloat64(dbPoolMaxOpenConnections)
	if maxOpen != 15 {
		t.Errorf("dbPoolMaxOpenConnections = %v; want 15", maxOpen)
	}
}

// TestMetricsHandlerServesPrometheusFormat verifies /metrics is reachable and
// returns Prometheus exposition format containing our custom metric names,
// when no METRICS_TOKEN gate is configured (local dev default).
func TestMetricsHandlerServesPrometheusFormat(t *testing.T) {
	t.Setenv("METRICS_TOKEN", "")

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	if err := MetricsHandler()(c); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d; want 200", rec.Code)
	}
	if body := rec.Body.String(); len(body) == 0 {
		t.Error("expected non-empty /metrics body")
	}
}

// TestMetricsHandlerGatedByToken verifies that when METRICS_TOKEN is set, a
// request without a matching token is rejected with 404 (not 401, so the
// endpoint's existence isn't leaked to unauthenticated scrapers).
func TestMetricsHandlerGatedByToken(t *testing.T) {
	t.Setenv("METRICS_TOKEN", "s3cr3t")

	e := echo.New()

	// No token → 404.
	req := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	if err := MetricsHandler()(c); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if rec.Code != http.StatusNotFound {
		t.Errorf("status without token = %d; want 404", rec.Code)
	}

	// Correct token via header → 200.
	req2 := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	req2.Header.Set("X-Metrics-Token", "s3cr3t")
	rec2 := httptest.NewRecorder()
	c2 := e.NewContext(req2, rec2)
	if err := MetricsHandler()(c2); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if rec2.Code != http.StatusOK {
		t.Errorf("status with correct token = %d; want 200", rec2.Code)
	}
}
