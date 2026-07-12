package middleware

import (
	"context"
	"os"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
)

// defaultRequestTimeout bounds how long a single request may run before its
// context is cancelled. Kept above the DB statement_timeout (config.NewDatabase,
// 5s) so Postgres aborts a hung query first and returns a clean error; this is
// the HTTP-layer backstop that also propagates cancellation to any
// context-aware query downstream (e.g. the TenantTx transaction).
const defaultRequestTimeout = 8 * time.Second

// requestTimeout resolves the timeout from REQUEST_TIMEOUT_MS (ms), falling back
// to defaultRequestTimeout. Exposed as a var-free helper so tests can exercise
// the parsing without touching global state.
func requestTimeout(env string) time.Duration {
	if env != "" {
		if n, err := strconv.Atoi(env); err == nil && n > 0 {
			return time.Duration(n) * time.Millisecond
		}
	}
	return defaultRequestTimeout
}

// RequestTimeout returns middleware that attaches a deadline to every request's
// context. Fase 3 (scalability hardening): before this, a request whose query
// was stuck behind the saturated 15-connection pool hung for the client's full
// 60s timeout, never releasing its slot. With a bounded context, context-aware
// DB calls unwind at the deadline; combined with the DB-level statement_timeout
// the system fails fast instead of hanging (spec SLO: zero hung requests).
//
// Wire it early (after Recover/Metrics, before routes) so the deadline covers
// the whole handler chain including TenantTx.
func RequestTimeout() echo.MiddlewareFunc {
	timeout := requestTimeout(os.Getenv("REQUEST_TIMEOUT_MS"))
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			ctx, cancel := context.WithTimeout(c.Request().Context(), timeout)
			defer cancel()
			c.SetRequest(c.Request().WithContext(ctx))
			return next(c)
		}
	}
}
