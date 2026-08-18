package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/labstack/echo/v4"
)

func TestRequestTimeout_ParsesEnv(t *testing.T) {
	cases := []struct {
		name string
		env  string
		want time.Duration
	}{
		{"empty falls back to default", "", defaultRequestTimeout},
		{"valid override", "2500", 2500 * time.Millisecond},
		{"zero ignored", "0", defaultRequestTimeout},
		{"negative ignored", "-1", defaultRequestTimeout},
		{"garbage ignored", "abc", defaultRequestTimeout},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := requestTimeout(tc.env); got != tc.want {
				t.Fatalf("requestTimeout(%q) = %v, want %v", tc.env, got, tc.want)
			}
		})
	}
}

// The middleware must attach a deadline to the request context so downstream
// DB calls can unwind when the pool is saturated.
func TestRequestTimeout_AttachesDeadline(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	var hadDeadline bool
	var remaining time.Duration
	h := RequestTimeout()(func(c echo.Context) error {
		dl, ok := c.Request().Context().Deadline()
		hadDeadline = ok
		if ok {
			remaining = time.Until(dl)
		}
		return c.NoContent(http.StatusOK)
	})

	if err := h(c); err != nil {
		t.Fatalf("handler returned error: %v", err)
	}
	if !hadDeadline {
		t.Fatal("expected the request context to carry a deadline, got none")
	}
	// Should be close to the default (8s), definitely not the client's 60s hang.
	if remaining <= 0 || remaining > defaultRequestTimeout {
		t.Fatalf("deadline remaining = %v, want (0, %v]", remaining, defaultRequestTimeout)
	}
}
