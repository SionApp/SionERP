// SionERP scalability-hardening baseline load test.
//
// Models the load profile from docs/superpowers/specs/2026-07-10-scalability-
// hardening-1k-multitenant-design.md: M virtual users spread across K tenants
// (churches), navigating dashboard -> discipleship -> music -> reports with
// think time between steps, ramping toward the target ~300-500 req/s.
//
// LOCAL-ONLY: refuses to run if BACKEND_URL or SUPABASE_URL contains
// "supabase.co" or "onrender.com". Run tools/loadtest/seed first — this
// script authenticates as the K session/login users that tool creates
// (see tools/loadtest/README.md).
//
// Usage:
//   k6 run tools/loadtest/scenario.js                                   # smoke (default)
//   k6 run -e PROFILE=baseline tools/loadtest/scenario.js               # ramp to target load
//   k6 run -e TENANTS=20 -e SUPABASE_ANON_KEY=... tools/loadtest/scenario.js
//
// See tools/loadtest/README.md for the full walkthrough and required env vars.

import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BACKEND_URL = __ENV.BACKEND_URL || 'http://localhost:8181';
const SUPABASE_URL = __ENV.SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || '';
const TENANTS = parseInt(__ENV.TENANTS || '20', 10);
const LOADTEST_PASSWORD = __ENV.LOADTEST_PASSWORD || 'LoadTest123!';
const PROFILE = __ENV.PROFILE || 'smoke'; // 'smoke' | 'baseline' | 'steady'
const THINK_MIN_S = parseFloat(__ENV.THINK_MIN_S || '1');
const THINK_MAX_S = parseFloat(__ENV.THINK_MAX_S || '3');

// ── Hard safety gate — this script only ever targets the LOCAL stack. ──────
for (const url of [BACKEND_URL, SUPABASE_URL]) {
  if (url.includes('supabase.co') || url.includes('onrender.com')) {
    throw new Error(
      `Refusing to run: target URL "${url}" looks like a remote/prod host. ` +
        'This script is LOCAL-ONLY — see the header comment.'
    );
  }
}

export const options =
  PROFILE === 'baseline'
    ? {
        // Ramp profile: find the breakpoint. Bounded to keep total runtime
        // inside the ~5-8 min budget for the Fase 1 baseline run.
        stages: [
          { duration: '30s', target: 50 },
          { duration: '1m', target: 150 },
          { duration: '1m30s', target: 300 },
          { duration: '1m30s', target: 500 },
          { duration: '30s', target: 0 },
        ],
        thresholds: {
          http_req_duration: ['p(95)<300', 'p(99)<800'],
          http_req_failed: ['rate<0.01'],
        },
      }
    : PROFILE === 'steady'
    ? {
        // Realistic sustained load: ~1k users spread across many tenants doing
        // normal navigation. With 1-3s think time and ~200ms responses, that's
        // ~120-150 concurrent in-flight requests, NOT 1k. Holds STEADY_VUS
        // (def 150) for a few minutes — this is the actual production target,
        // the SLO gate that matters, vs. baseline's 500-VU stress spike.
        stages: [
          { duration: '30s', target: parseInt(__ENV.STEADY_VUS || '150', 10) },
          { duration: '2m30s', target: parseInt(__ENV.STEADY_VUS || '150', 10) },
          { duration: '20s', target: 0 },
        ],
        thresholds: {
          http_req_duration: ['p(95)<300', 'p(99)<800'],
          http_req_failed: ['rate<0.01'],
        },
      }
    : {
        // Smoke: sanity-only. No `stages` here on purpose, so CLI
        // --vus/--duration flags (e.g. `k6 run --vus 10 --duration 30s`)
        // apply normally — see tools/loadtest/README.md.
        thresholds: {
          http_req_duration: ['p(95)<300'],
          http_req_failed: ['rate<0.05'], // looser — smoke is a sanity check, not the SLO gate
        },
      };

// setup() logs in ONCE PER TENANT (not once per VU) — K Supabase Auth logins
// total, reused by every VU assigned to that tenant. This is a deliberate
// simplification: JWTs are stateless, so N VUs sharing one tenant's token
// exercises the same query/auth paths a distinct-session model would, at a
// fraction of the login-storm cost. See tools/loadtest/README.md.
export function setup() {
  if (!SUPABASE_ANON_KEY) {
    throw new Error(
      'SUPABASE_ANON_KEY env var is required (the local Supabase anon/publishable key — ' +
        'see `supabase status`). Pass it with -e SUPABASE_ANON_KEY=...'
    );
  }

  const tokens = [];
  for (let t = 1; t <= TENANTS; t++) {
    const tenantIdx = String(t).padStart(3, '0');
    const email = `loadtest-t${tenantIdx}-u0000@loadtest.local`;

    const res = http.post(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      JSON.stringify({ email, password: LOADTEST_PASSWORD }),
      { headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' } }
    );

    if (res.status !== 200) {
      throw new Error(
        `setup: login failed for tenant ${t} (${email}): status=${res.status} body=${res.body}. ` +
          'Did you run tools/loadtest/seed first with a matching -tenants count?'
      );
    }

    const token = res.json('access_token');
    if (!token) {
      throw new Error(`setup: no access_token in login response for tenant ${t}`);
    }
    tokens.push(token);
  }

  console.log(`setup: logged in as ${tokens.length} tenant session user(s)`);
  return { tokens };
}

function think() {
  sleep(THINK_MIN_S + Math.random() * (THINK_MAX_S - THINK_MIN_S));
}

// default(): one simulated user "session" — dashboard, then a module mix,
// with think time between steps, mirroring a person navigating the app.
export default function (data) {
  const token = data.tokens[(__VU - 1) % data.tokens.length];
  const headers = { Authorization: `Bearer ${token}` };

  group('dashboard', () => {
    const res = http.get(`${BACKEND_URL}/api/v1/dashboard/stats`, {
      headers,
      tags: { name: 'dashboard_stats' },
    });
    check(res, { 'dashboard: status 200': (r) => r.status === 200 });
  });
  think();

  group('discipleship', () => {
    http.get(`${BACKEND_URL}/api/v1/discipleship/groups`, {
      headers,
      tags: { name: 'discipleship_groups' },
    });
    http.get(`${BACKEND_URL}/api/v1/discipleship/hierarchy`, {
      headers,
      tags: { name: 'discipleship_hierarchy' },
    });
    http.get(`${BACKEND_URL}/api/v1/discipleship/analytics`, {
      headers,
      tags: { name: 'discipleship_analytics' },
    });
  });
  think();

  group('music', () => {
    http.get(`${BACKEND_URL}/api/v1/music/events`, {
      headers,
      tags: { name: 'music_events' },
    });
    http.get(`${BACKEND_URL}/api/v1/music/songs`, {
      headers,
      tags: { name: 'music_songs' },
    });
  });
  think();

  group('zones', () => {
    http.get(`${BACKEND_URL}/api/v1/zones`, {
      headers,
      tags: { name: 'zones_list' },
    });
  });
  think();

  group('reports', () => {
    http.get(`${BACKEND_URL}/api/v1/reports/users`, {
      headers,
      tags: { name: 'reports_users' },
    });
    http.get(`${BACKEND_URL}/api/v1/reports/growth`, {
      headers,
      tags: { name: 'reports_growth' },
    });
  });
  think();
}
