# SionERP Load Test — Fase 1 (baseline)

Load-testing harness for the `scalability-hardening-1k-multitenant` initiative.
See `docs/superpowers/specs/2026-07-10-scalability-hardening-1k-multitenant-design.md`
for the target load model and SLOs.

## LOCAL-ONLY — hard rule

Both `seed/` and `scenario.js` refuse to run against any URL containing
`supabase.co` or `onrender.com`. They default to the local stack:

- Backend Go: `http://localhost:8181`
- Local Supabase Postgres: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- Local Supabase Auth/API: `http://127.0.0.1:54321`

Never override `-db-url` / `BACKEND_URL` / `SUPABASE_URL` to point at a remote
or production host.

## Prerequisites

- Local Supabase running: `supabase start` (from repo root).
- Backend running locally: `air` (from `apps/backend-go/`), listening on `:8181`.
- [k6](https://k6.io/) installed (`brew install k6`).
- `apps/backend-go/.env` populated with `SUPABASE_URL` and
  `SUPABASE_SERVICE_ROLE_KEY` (same values the backend itself uses) — the seed
  tool's session-user creation needs them.

## 1. Seed synthetic tenants

```bash
cd apps/backend-go && set -a && source .env && set +a && cd -
go run ./tools/loadtest/seed -tenants 20 -users-per-tenant 50
```

Creates K synthetic churches ("tenants"), each with realistic row counts:
users, zones, discipleship groups/members, and music events/songs/assignments.
Every row is namespaced with the `LOADTEST-` prefix (church name, zone names,
group names, `id_number`, emails) so it's identifiable and safe to remove.

Only **one user per tenant** (index 0, role `pastor`) is created as a real
Supabase Auth account — that's the session/login user the k6 scenario
authenticates as. The rest are inserted directly into `public.users` as
realistic FK data (group members, music members, zone assignments) and are
never logged into.

To remove all synthetic data:

```bash
go run ./tools/loadtest/seed -cleanup
```

### Why role=pastor for the session user

`middleware.RequireModuleLevel` bypasses entirely for `pastor`/`admin`, and
role `pastor` (level 400) satisfies every `middleware.RequireRole` gate the
k6 navigation mix touches. Using one uniform role for the login user avoids
seeding `module_user_roles` / `discipleship_hierarchy` rows just to satisfy
authorization — this is a load test of query/pool behavior, not an
authorization test.

### Why church_id isn't in the JWT

The seed tool passes `church_id` via Supabase Auth `user_metadata`, not
`app_metadata`. `middleware.SupabaseAuth` only reads `church_id` from
`app_metadata` into the JWT claim — but it **falls back to the
`users.church_id` column** when that claim is empty (see
`apps/backend-go/middleware/auth.go`). Since seeded users have `church_id`
set on their row, `middleware.TenantTx` genuinely opens a per-request
transaction with `SET LOCAL ROLE jetro_app` + RLS for every seeded session —
this is **not** a pass-through. That turned out to be a useful discovery: the
baseline run below measures the real tx-per-request + pool-cap behavior the
spec's Bottleneck #1 describes, not a bypassed one.

## 2. Smoke test (sanity)

```bash
export SUPABASE_ANON_KEY=<local anon/publishable key from `supabase status`>
k6 run --vus 5 --duration 20s -e SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" -e TENANTS=20 \
  tools/loadtest/scenario.js
```

Confirms the script authenticates and every endpoint in the navigation mix
returns 2xx before committing to a longer ramp run. No `stages` are defined
in `PROFILE=smoke` (the default), so `--vus`/`--duration` apply directly.

## 3. Baseline ramp (find the breakpoint)

```bash
k6 run -e PROFILE=baseline -e SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" -e TENANTS=20 \
  --summary-export=tools/loadtest/results/baseline-$(date +%Y%m%d-%H%M%S).json \
  tools/loadtest/scenario.js
```

Stages (5 min total, bounded to fit the Fase 1 time budget):

| Stage | Duration | Target VUs |
|---|---|---|
| ramp-up | 30s | 50 |
| ramp | 1m | 150 |
| ramp | 1m30s | 300 |
| ramp | 1m30s | 500 |
| ramp-down | 30s | 0 |

Thresholds encode the spec SLOs: `p(95)<300ms`, `p(99)<800ms`, error
rate `<1%`.

While it runs, watch pool saturation in another terminal:

```bash
watch -n 5 'curl -s http://localhost:8181/metrics | grep sionerp_db_pool'
```

(`METRICS_TOKEN` gates `/metrics` in any environment where it's set — see
`apps/backend-go/middleware/metrics.go`; unset locally, so no auth needed.)

## 4. Read the results

- k6's own summary (stdout + `--summary-export` JSON) has aggregate
  `http_req_duration` / `http_req_failed`.
- `sionerp_db_pool_in_use`, `_idle`, `_wait_count` from `/metrics` show pool
  saturation (a `_wait_count` that keeps climbing under steady load = the
  pool is the bottleneck).
- `sionerp_tenant_requests_total{church_id=...}` shows the request
  distribution across tenants (fairness — relevant for Fase 3, not scored
  against an SLO in Fase 1).
- Numbers get written into
  `docs/superpowers/specs/2026-07-10-scalability-hardening-baseline-report.md`.

## Environment variables (scenario.js)

| Var | Default | Notes |
|---|---|---|
| `BACKEND_URL` | `http://localhost:8181` | rejected if it contains `supabase.co`/`onrender.com` |
| `SUPABASE_URL` | `http://127.0.0.1:54321` | same rejection rule |
| `SUPABASE_ANON_KEY` | *(required)* | local anon/publishable key, from `supabase status` |
| `TENANTS` | `20` | must match `-tenants` used when seeding |
| `LOADTEST_PASSWORD` | `LoadTest123!` | must match the seed tool's `LOADTEST_PASSWORD` env if you override it |
| `PROFILE` | `smoke` | `smoke` or `baseline` |
| `THINK_MIN_S` / `THINK_MAX_S` | `1` / `3` | think time between navigation steps |

## Simplifications (documented, not hidden)

- **Login once per tenant, not once per VU.** K Supabase Auth logins total
  (not M). VUs assigned to the same tenant share that tenant's JWT. Stateless
  auth means this exercises the same query/tx paths a distinct-session model
  would, at a fraction of the login cost — see `setup()` in `scenario.js`.
- **Uniform `pastor` role for every session user** (see above) — this is a
  load test of the data/query path, not a permissions test.
- **`dashboard/stats` and a few other handlers are not yet tenant-scoped in
  their SQL** (Phase 3 migration, `config.Tx(c)` not adopted everywhere yet)
  — so some read paths return counts across ALL tenants (real + synthetic)
  rather than just the caller's church. This is a pre-existing Phase-0/1
  reality, not something this tool introduces; the baseline report notes
  where it affects interpretation of a given number.
- **Numbers are a laptop-local baseline** — relative, not absolute. Use them
  to compare before/after a Fase 3 fix, not as a production capacity number.
