# Tasks: Scalability Hardening — 1k Concurrent Users, Multi-Tenant

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | Slice 1 (Fase 0+1): ~350-450 lines (new files: metrics middleware, k6 script, seed script, pg config). Full initiative: 2000+ lines across 5 phases. |
| 400-line budget risk | Medium (Slice 1) / High (whole initiative) |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Fase 0 observability) → PR 2 (Fase 1 baseline/k6) → PR 3+ (Fase 2 audit, no-code) → PR 4..N (Fase 3 fixes, one per fix) → PR N+1 (Fase 4 guardrails) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending — ask user: stacked-to-main vs feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Fase 0: metrics middleware + pool saturation gauge + pg slow-query log | PR 1 | Standalone, additive, no behavior change. First autonomous slice. |
| 2 | Fase 1: k6 load harness + seed-at-scale script + baseline run + report | PR 2 | Depends on Unit 1's metrics existing to read during the run. |
| 3 | Fase 2: Postgres/Infra/App audit (docs/findings only, no prod code) | PR 3 | Depends on Unit 2 baseline numbers. Output is a doc, not app code. |
| 4 | Fase 3: optimizations, one fix = one PR, each re-load-tested | PR 4..N | Scope refined after Unit 3 findings — placeholders below. |
| 5 | Fase 4: guardrails (timeouts, rate-limit, circuit breakers, alerts) + capacity doc | PR N+1 | Depends on Fase 3 fixes landing first. |

## Fase 0: Instrumentar y observabilidad (FIRST AUTONOMOUS SLICE, part A)

- [x] 0.1 Create `apps/backend-go/middleware/metrics.go`: Echo middleware recording p50/p95/p99 latency per route (method+path template) in-memory or via `expvar`/prometheus client. Verify: unit test asserts a request updates the histogram for its route key. **Done**: implemented with `github.com/prometheus/client_golang` (`requestDuration` HistogramVec, labeled method/route/status). Tests in `middleware/metrics_test.go`.
- [x] 0.2 Wire metrics middleware in `apps/backend-go/main.go` (after `middleware.Recover()`, before `routes.SetupRoutes(e)`). Verify: `go build ./...` passes, middleware order preserved. **Done**: `e.Use(appMiddleware.MetricsMiddleware())` added right after `middleware.Recover()`.
- [x] 0.3 Add pool saturation metric in `apps/backend-go/config/database.go`: expose `db.Stats()` (InUse, Idle, WaitCount, WaitDuration) via a `/metrics` or `/internal/pool-stats` endpoint. Verify: hitting the endpoint under `go test` returns non-nil stats struct. **Deviation**: implemented in `middleware/metrics.go` (`RegisterPoolStats`, GaugeFunc-based, called from `main.go` right after `config.GetDB()`) instead of `config/database.go`, to avoid a config→middleware import and keep all Prometheus wiring in one file; unified into the single `/metrics` Prometheus endpoint (no separate `/internal/pool-stats`) per explicit apply-phase instructions. Metrics: `sionerp_db_pool_in_use`, `_idle`, `_wait_count`, `_max_open_connections`.
- [x] 0.4 Add per-tenant request counter in `apps/backend-go/middleware/tenant.go` (increment a counter keyed by `church_id` before `next(c)`). Verify: unit test with 2 fake tenants asserts counts increment independently. **Done**: `RecordTenantRequest(churchID)` called at the top of `TenantTx()`, before the pass-through guard; empty churchID buckets as `"none"`.
- [x] 0.5 Enable Postgres slow-query log + `pg_stat_statements`: new migration `supabase/migrations/<timestamp>_enable_pg_stat_statements.sql` (`CREATE EXTENSION IF NOT EXISTS pg_stat_statements;`) + document `log_min_duration_statement` setting for the Supabase project (config note, not code — Supabase-managed). Verify: `SELECT * FROM pg_stat_statements LIMIT 1;` runs without error after migration. **Done**: `supabase/migrations/20260710000001_enable_pg_stat_statements.sql`. **Not verified against a live Postgres** — local Docker/Supabase was not running in this session; syntax is standard/idiomatic, needs `supabase db push` (or equivalent) verification before merge.
- [x] 0.6 Document Fase 0 output: `docs/superpowers/specs/2026-07-10-scalability-hardening-baseline-report.md` skeleton (empty tables for p50/p95/p99 per endpoint, pool stats, per-tenant counts) to be filled in Fase 1. Verify: file exists with the 3 empty tables. **Done**.

## Fase 1: Baseline con load test (FIRST AUTONOMOUS SLICE, part B)

- [ ] 1.1 Create `apps/backend-go/scripts/seed-at-scale/main.go` (or `scripts/seed-at-scale.sh` wrapping SQL): generates K synthetic tenants (`church_info` rows) with realistic row counts (users, discipleship groups, events, music assignments, reports) via existing seed patterns. Verify: running against local Supabase creates K tenants with `SELECT count(*) FROM church_info` = K.
- [ ] 1.2 Create `tests/load/k6/scenario.js`: k6 script modeling M virtual users across K tenants — login → dashboard → module navigation (discipleship, music, reports), ramp-up stages toward target ~300-500 req/s. Verify: `k6 run tests/load/k6/scenario.js --vus 10 --duration 30s` completes locally against a dev backend without script errors.
- [ ] 1.3 Add `tests/load/k6/README.md`: how to run against local/staging, how to read output, how it maps to the modeled load (M users, K tenants, req/s target). Verify: file documents exact CLI invocation used for the baseline run.
- [ ] 1.4 Execute baseline run against a representative environment (local or staging with seeded data), capture throughput, p95/p99, pool saturation point, first hung/failed request. Verify: raw k6 output + `/internal/pool-stats` snapshots saved as run artifacts (e.g. `tests/load/k6/results/baseline-<date>.json`).
- [ ] 1.5 Fill in `docs/superpowers/specs/2026-07-10-scalability-hardening-baseline-report.md` with real numbers from 1.4 (breaking point, SLO gap vs target). Verify: report has no placeholder cells left; committed to repo.

## Fase 2: Auditar Postgres / Infra / App (depends on Fase 1 baseline — scope refined once numbers exist)

> Note: these are investigation tasks. Exact sub-tasks will be refined against the real `pg_stat_statements` output and k6 results from Fase 1 — treat the list below as the initial checklist, not final.

- [ ] 2.1 Run `EXPLAIN (ANALYZE, BUFFERS)` on top-10 queries by frequency×cost from `pg_stat_statements`; document findings in the baseline report's "Postgres audit" section. Verify: 10 EXPLAIN outputs attached/linked in the doc.
- [ ] 2.2 Audit indexes on `church_id`, FKs, and hot-path filter/order columns across `supabase/migrations/`; list missing indexes. Verify: doc lists table+column+missing-index recommendation for each hot path found in 2.1.
- [ ] 2.3 Measure RLS overhead: compare query time with `SET LOCAL ROLE jetro_app` (RLS active) vs without, on 2-3 representative queries. Verify: before/after timing numbers recorded.
- [ ] 2.4 Document pooler config: Supabase plan connection limit, pgbouncer mode, current `DB_MAX_OPEN_CONNS=15` vs plan ceiling. Verify: doc states the real number sourced from Supabase dashboard/support, not assumed.
- [ ] 2.5 Detect N+1 patterns: grep handlers for per-row queries inside loops (discipleship, music, reports handlers); cross-reference with k6-observed duplicate query counts. Verify: doc lists concrete handler function + line where N+1 occurs.
- [ ] 2.6 Audit infra topology: Render backend instance size/count, Vercel frontend, Supabase region, inter-service latency. Verify: doc has topology diagram/table with current values.
- [ ] 2.7 Trace tx-hold duration per request (`middleware/tenant.go` `BeginTx`→`Commit`/`Rollback` span) — confirm hypothesis that tx is held for full request duration. Verify: trace/log sample showing tx open→close timestamps under load.
- [ ] 2.8 Confirm cache incoherence risk: document that `cache/cache.go` `InMemoryCache` is per-process (no cross-replica invalidation) and where it's currently used. Verify: doc lists every call site of `cache.GetCache()`.
- [ ] 2.9 Audit frontend query storm: inspect TanStack Query usage in music module (`src/services/music*`, related hooks/components) for missing `staleTime`, `refetchOnWindowFocus` defaults, unstable query-key dependencies causing re-fetch loops. Verify: doc names the specific hook(s)/component(s) and query keys causing duplicate GETs observed in Context.

## Fase 3: Priorizar y optimizar (depends on Fase 2 findings — impact/effort matrix built from real data; sub-tasks are placeholders until Fase 2 lands)

- [ ] 3.1 Build impact/effort matrix in the baseline report from Fase 2 findings; confirm/adjust the priority order proposed in the design (tx+pool → front query storm → fairness → indexes/N+1 → dashboard rollups). Verify: matrix table committed with each item scored.
- [ ] 3.2 Add request-level timeout (context deadline, fail-fast ~5s) in `apps/backend-go/middleware/tenant.go` and/or `main.go` global timeout middleware. Verify: integration test hitting a deliberately slow handler returns 504/timeout instead of hanging.
- [ ] 3.3 Right-size DB pool in `apps/backend-go/config/database.go` `SetMaxOpenConns`/`SetMaxIdleConns` to the real pooler ceiling found in 2.4 (currently hardcoded 15). Verify: `DB_MAX_OPEN_CONNS` env respected, unit test on the config path.
- [ ] 3.4 Evaluate/implement narrowing tx scope in `middleware/tenant.go` (tx only around queries, not the whole handler) if 2.7 confirms the hypothesis — likely a larger follow-up spec, not a same-PR change. Verify: decision documented even if deferred.
- [ ] 3.5 Fix frontend query storm per 2.9 findings — add/correct `staleTime`, dedup, stabilize query-key deps in the flagged music-module hooks (`src/pages/.../music` or `src/hooks/`). Verify: re-run k6 or manual network trace shows duplicate GET count drops for the affected endpoints.
- [ ] 3.6 Implement per-tenant rate limiting (design-level: Redis-backed or in-memory-per-replica interim) keyed by `church_id` in a new `apps/backend-go/middleware/ratelimit.go`. Verify: unit test — tenant A exceeding quota gets 429 while tenant B is unaffected.
- [ ] 3.7 Add missing indexes identified in 2.2 via new migration(s) in `supabase/migrations/`. Verify: `EXPLAIN ANALYZE` on the affected query shows index scan instead of seq scan.
- [ ] 3.8 Fix N+1 handlers identified in 2.5 (batch queries / joins instead of per-row calls). Verify: query count per request drops in the handler's k6-observed trace.
- [ ] 3.9 Precompute heavy dashboard aggregates (rollup table or materialized view) per 2.1/2.5 findings, if confirmed as a top offender. Verify: dashboard endpoint p95 measured before/after.
- [ ] 3.10 Re-run the Fase 1 k6 scenario after each fix in 3.2-3.9 lands; compare against baseline numbers from 1.5. Verify: updated numbers appended to the baseline report per fix, per `superpowers:verification-before-completion`.

## Fase 4: Guardrails y plan de capacidad (depends on Fase 3 fixes landing)

- [ ] 4.1 Confirm request/query timeouts from 3.2 are applied consistently across all protected routes (not just the ones tested). Verify: route audit checklist in the capacity doc.
- [ ] 4.2 Confirm per-tenant rate limiting from 3.6 is enabled on hot endpoints (dashboard, discipleship, music, reports). Verify: config list of rate-limited routes.
- [ ] 4.3 Add circuit breakers around external service calls (SMTP/email, Telegram ingestion in `handlers.StartTelegramIngestion`) so a slow external dependency can't block requests. Verify: unit test simulating a slow/failing external call trips the breaker instead of hanging.
- [ ] 4.4 Wire monitoring + alerts on p95 per endpoint, pool saturation, error rate (using metrics from Fase 0 middleware) — Grafana/Sentry/whatever the team's stack supports. Verify: alert fires in a manual test (e.g. force pool saturation locally).
- [ ] 4.5 Write `docs/superpowers/specs/2026-07-10-scalability-hardening-capacity-plan.md`: documented capacity model ("with Supabase plan X and N replicas we sustain Y users; scale levers are Z"). Verify: doc references concrete numbers from Fase 1/3 re-tests, not estimates.
- [ ] 4.6 Final verification: run the Fase 1 k6 scenario at full target load (1k users / N tenants / ~300-500 req/s) and confirm all SLOs from the design (p95<300ms, p99<800ms, 0 hung requests, fairness <10% cross-tenant degradation, error rate <1%) pass sustained. Verify: final k6 report committed, matches design's Verification section.

## Cross-Cutting / TDD Notes

- Metrics middleware (0.1) and rate limiter (3.6) are unit-testable in Go — apply RED→GREEN→REFACTOR per `strict_tdd: true`.
- k6 scripts (1.2) are not Go-testable; verification is the run output itself (1.4, 3.10, 4.6).
- Migrations (0.5, 3.7) verified via `EXPLAIN ANALYZE` before/after, not unit tests.
- Do not implement anything in this phase — this checklist is for `sdd-apply`.
