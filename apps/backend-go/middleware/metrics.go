// Package middleware — Fase 0 observability instrumentation.
//
// This file wires SionERP into Prometheus: per-endpoint latency, DB pool
// saturation, and per-tenant request counts. It is purely additive —
// no behaviour change, no TenantTx/pool-cap changes (those are Fase 3).
//
// Scrape target: GET /metrics (mounted directly in main.go, outside the
// authenticated /api/v1 group — Prometheus scrapers don't carry a Supabase
// JWT). Guarded by METRICS_TOKEN so it isn't wide open on a public deploy;
// see MetricsHandler for the exact contract.
package middleware

import (
	"database/sql"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	// requestDuration is a histogram of request latency in seconds, labeled by
	// method + route template + status. Prometheus/Grafana derive p50/p95/p99
	// from this via histogram_quantile() — we don't compute percentiles
	// ourselves, we export the buckets.
	requestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "sionerp_http_request_duration_seconds",
			Help:    "HTTP request latency in seconds, labeled by method/route/status. Use histogram_quantile() for p50/p95/p99.",
			Buckets: prometheus.DefBuckets, // 5ms .. 10s, matches the design's SLOs (p95<300ms, p99<800ms)
		},
		[]string{"method", "route", "status"},
	)

	// tenantRequestsTotal counts requests per church_id. "none" buckets requests
	// with no tenant context yet (Fase 0, pre-Fase-2 JWT backfill) to keep
	// cardinality bounded — see RecordTenantRequest.
	tenantRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "sionerp_tenant_requests_total",
			Help: `Requests per tenant (church_id). "none" = no tenant context on the request (bounded cardinality in Fase 0).`,
		},
		[]string{"church_id"},
	)

	// dbPoolInUse / dbPoolIdle / dbPoolWaitCount / dbPoolMaxOpenConnections mirror
	// database/sql.DBStats, computed at collect-time (GaugeFunc) so every
	// /metrics scrape reflects the pool's current state with no background
	// poller needed. This is THE key metric for the known concurrency
	// ceiling: SetMaxOpenConns(15) in config/database.go.
	dbPoolInUse              prometheus.GaugeFunc
	dbPoolIdle               prometheus.GaugeFunc
	dbPoolWaitCount          prometheus.GaugeFunc
	dbPoolMaxOpenConnections prometheus.GaugeFunc

	registerPoolStatsOnce sync.Once
)

// MetricsMiddleware records request latency + final status into
// requestDuration for every request that passes through it. Wired in main.go
// after middleware.Recover() (so a recovered panic still gets measured/labeled
// as its resulting status) and before routes.SetupRoutes(e).
func MetricsMiddleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			start := time.Now()
			err := next(c)
			duration := time.Since(start).Seconds()

			route := c.Path()
			if route == "" {
				// Unmatched route (404 before Echo resolves a handler, or a
				// pre-routing failure) — fall back to a fixed label instead of
				// the raw request path, which would blow up cardinality with
				// arbitrary/attacker-controlled URLs.
				route = "unmatched"
			}

			status := c.Response().Status
			if err != nil && status == 0 {
				status = http.StatusInternalServerError
			}

			requestDuration.
				WithLabelValues(c.Request().Method, route, strconv.Itoa(status)).
				Observe(duration)

			return err
		}
	}
}

// RecordTenantRequest increments the per-tenant request counter. An empty
// churchID (no tenant context yet — Fase 0, before Fase 2's JWT backfill) is
// bucketed as "none" so cardinality stays bounded instead of growing per
// anonymous/unauthenticated request.
func RecordTenantRequest(churchID string) {
	if churchID == "" {
		churchID = "none"
	}
	tenantRequestsTotal.WithLabelValues(churchID).Inc()
}

// RegisterPoolStats wires *sql.DB.Stats() into the pool-saturation gauges.
// Idempotent — only the first call actually registers the collectors, so it's
// safe to call from both main.go and tests without triggering Prometheus'
// duplicate-registration panic.
//
// Call once from main.go right after config.GetDB() is available.
func RegisterPoolStats(db *sql.DB) {
	registerPoolStatsOnce.Do(func() {
		dbPoolInUse = promauto.NewGaugeFunc(prometheus.GaugeOpts{
			Name: "sionerp_db_pool_in_use",
			Help: "Connections currently in use out of the pool.",
		}, func() float64 { return float64(db.Stats().InUse) })

		dbPoolIdle = promauto.NewGaugeFunc(prometheus.GaugeOpts{
			Name: "sionerp_db_pool_idle",
			Help: "Idle connections currently held by the pool.",
		}, func() float64 { return float64(db.Stats().Idle) })

		dbPoolWaitCount = promauto.NewGaugeFunc(prometheus.GaugeOpts{
			Name: "sionerp_db_pool_wait_count",
			Help: "Cumulative number of connections waited for because the pool was saturated. A rising rate under load indicates pool saturation.",
		}, func() float64 { return float64(db.Stats().WaitCount) })

		dbPoolMaxOpenConnections = promauto.NewGaugeFunc(prometheus.GaugeOpts{
			Name: "sionerp_db_pool_max_open_connections",
			Help: "Configured pool ceiling (SetMaxOpenConns / DB_MAX_OPEN_CONNS).",
		}, func() float64 { return float64(db.Stats().MaxOpenConnections) })
	})
}

// MetricsHandler exposes the Prometheus registry for internal scraping only.
//
// Guard contract: when METRICS_TOKEN is set (recommended for any environment
// reachable from the public internet), a request must present it via the
// X-Metrics-Token header or ?token= query param, or it gets a 404 (not 401 —
// a 401 would confirm the endpoint exists to an unauthenticated prober).
// When METRICS_TOKEN is unset (local dev default) the endpoint is served
// unguarded.
//
// This token check is a stopgap for Fase 0. The durable answer is binding
// /metrics to an internal network/VPC or a Render private service + putting
// it behind the platform's own network policy so it's never reachable from
// the public internet in the first place — do that before this ships to a
// multi-tenant production deploy.
func MetricsHandler() echo.HandlerFunc {
	promHandler := echo.WrapHandler(promhttp.Handler())
	return func(c echo.Context) error {
		token := os.Getenv("METRICS_TOKEN")
		if token != "" {
			got := c.Request().Header.Get("X-Metrics-Token")
			if got == "" {
				got = c.QueryParam("token")
			}
			if got != token {
				return c.NoContent(http.StatusNotFound)
			}
		}
		return promHandler(c)
	}
}
