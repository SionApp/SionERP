# Scalability Hardening — Baseline Report

**Estado:** Skeleton (Fase 0) · **Fecha:** 2026-07-10

Este documento se llena en **Fase 1** (baseline con load test) con números reales
producidos por `tests/load/k6/scenario.js` contra el backend instrumentado en
Fase 0 (`GET /metrics`). Ver el diseño en
`docs/superpowers/specs/2026-07-10-scalability-hardening-1k-multitenant-design.md`
para el modelo de carga objetivo y los SLOs.

**No llenar con estimaciones — solo números medidos.** Principio rector del
spec: *se mide, no se adivina.*

## 1. Latencia p50/p95/p99 por endpoint

Fuente: `sionerp_http_request_duration_seconds` (histograma Prometheus,
`histogram_quantile()` sobre method+route+status).

| Endpoint (method + route) | p50 (ms) | p95 (ms) | p99 (ms) | Objetivo SLO | Cumple |
|---|---|---|---|---|---|
| _pendiente Fase 1_ | | | | p95 < 300ms / p99 < 800ms | |

## 2. Saturación del pool de DB

Fuente: `sionerp_db_pool_in_use`, `sionerp_db_pool_idle`,
`sionerp_db_pool_wait_count`, `sionerp_db_pool_max_open_connections`
(gauges Prometheus, ver `apps/backend-go/middleware/metrics.go`).

| Momento de la carga | in_use | idle | wait_count (acumulado) | max_open_connections | Observación |
|---|---|---|---|---|---|
| Reposo | | | | 15 (default `DB_MAX_OPEN_CONNS`) | |
| Rampa media | | | | | |
| Punto de saturación | | | | | primer request colgado/lento |

## 3. Requests por tenant

Fuente: `sionerp_tenant_requests_total` (counter Prometheus, labeled by
`church_id`; `"none"` = sin contexto de tenant, Fase 0 pre-JWT-backfill).

| Tenant (church_id) | Requests totales | % del total | Fairness (¿degrada a otros tenants?) |
|---|---|---|---|
| _pendiente Fase 1 (seed-at-scale + k6)_ | | | |

## 4. Throughput y punto de ruptura

| Métrica | Valor |
|---|---|
| Throughput máximo sostenido (req/s) | _pendiente_ |
| Objetivo de carga (diseño) | ~300–500 req/s |
| Primer request colgado/fallido (VUs / tiempo) | _pendiente_ |
| Error rate en el punto de ruptura | _pendiente_ |

## 5. Auditoría Postgres (Fase 2 — placeholder)

- `EXPLAIN (ANALYZE, BUFFERS)` top-10 queries por frecuencia×costo
  (`pg_stat_statements`): _pendiente Fase 2_.
- Índices faltantes (`church_id`, FKs, hot-path): _pendiente Fase 2_.
- Overhead de RLS (`SET LOCAL ROLE jetro_app` on/off): _pendiente Fase 2_.
- Config del pooler vs `DB_MAX_OPEN_CONNS=15`: _pendiente Fase 2_.
- N+1 detectados: _pendiente Fase 2_.

## 6. Matriz impacto/esfuerzo (Fase 3 — placeholder)

_pendiente Fase 3 — se construye a partir de los hallazgos de Fase 2._

## Cómo se produce este reporte

1. `apps/backend-go/scripts/seed-at-scale` — genera K tenants sintéticos.
2. `tests/load/k6/scenario.js` — corre la carga modelada; ver
   `tests/load/k6/README.md` para el comando exacto.
3. Resultado crudo → `tests/load/k6/results/baseline-<fecha>.json`.
4. Este documento se completa con los números de ese resultado — nunca con
   estimaciones.
