# Scalability Hardening — 1k Concurrent Users, Multi-Tenant

**Estado:** Diseño (spec) · **Fecha:** 2026-07-10 · **Autor:** Daniel + Claude

## Context

JETRO deja de ser un producto para una sola iglesia y pasa a ser un SaaS comercial
multi-tenant. Antes de construir el back-office/control plane (spec aparte), hay que
**endurecer la base**: hoy el backend tiene un techo de concurrencia real de ~15
requests simultáneas y un cache que no escala horizontalmente. Construir el mega-admin
sobre esa base sería edificar sobre arena.

Este spec define el trabajo de **análisis de uso + optimización** para que SionERP
sostenga **1.000 usuarios activos repartidos en muchas iglesias** (pico tipo domingo),
con aislamiento y fairness entre tenants. Es trabajo de **capacidad a futuro**, no de
apagar un incendio actual (hoy hay ~1 iglesia con datos reales) — se hace medido y con
cabeza fría antes de que duela en producción.

Principio rector: **se mide, no se adivina.** Ninguna optimización se hace sin baseline
que la justifique ni sin re-test que la verifique.

## Goal / Non-Goals

**Goal:** SionERP cumple los SLO definidos abajo bajo el modelo de carga objetivo, con
guardrails que garanticen que ninguna petición se cuelga y que ningún tenant ahoga a los
demás.

**Non-Goals (fuera de este spec):**
- El control plane / back-office de JETRO (spec propio).
- La "mitad CRM" tomando referencia de Twenty (spec propio).
- Encender el enforcement del multi-tenancy como feature (F1) — este spec **descubre y
  arregla** el cuello de `TenantTx`, pero el rollout de tenancy vive en su spec.

## Modelo de carga objetivo

- **1.000 usuarios activos** repartidos en **N iglesias** (tenants), navegando en la
  misma ventana (pico de domingo a la mañana).
- No son 1.000 requests duras simultáneas: son 1.000 navegando → pico estimado de
  **~300–500 req/s** (el número exacto se fija en el baseline, Fase 1).
- Mezcla de endpoints calientes a modelar: dashboard, discipulado, música, reportes,
  auth/permissions.
- **Dimensión multi-tenant:** la carga está distribuida en tenants de tamaño desigual;
  una iglesia grande en pico no debe degradar a las chicas.

## SLOs (ajustables tras el baseline)

| Métrica | Objetivo |
|---|---|
| Latencia API p95 | < 300 ms a carga objetivo |
| Latencia API p99 | < 800 ms a carga objetivo |
| Requests colgadas | 0 — toda petición resuelve o **falla-rápido** (timeout ~5 s) |
| Fairness cross-tenant | el pico de un tenant no degrada el p95 de otro > ~10% |
| Error rate | < 1% a carga objetivo |

## Bottlenecks conocidos (hallazgos pre-auditoría)

Evidencia ya observada en el código/runtime, a **validar y cuantificar** en el baseline:

1. **Cuello de concurrencia #1 — `TenantTx` + pool.**
   `middleware/tenant.go` mantiene una transacción de Postgres **abierta durante toda la
   request** (el RLS necesita `set_config('app.current_church_id', …, is_local=true)`
   scopeado a la tx). El pool está capado en 15 (`config/database.go`,
   `SetMaxOpenConns(15)`) por el límite del pooler de Supabase. → techo de ~15 requests
   concurrentes antes de encolar; una request lenta cuelga a las demás. **Sin timeouts de
   request hoy.**
2. **Cache no-horizontal.** `cache/cache.go` es un `InMemoryCache` por proceso →
   incoherente con >1 réplica; cache stampede.
3. **Tormenta de queries en el front.** Observado en el network del módulo de música:
   decenas de GETs idénticos repetidos (`/music/events`, `/assignments`, `/members`,
   `/songs/stats`…) en loop. Huele a re-render loop o falta de `staleTime`/dedup en
   TanStack Query. A 1k usuarios multiplica la carga por un factor enorme. **Sospechoso
   de alto impacto y bajo esfuerzo.**
4. **N+1 e índices.** A validar: queries por `church_id`/FK sin índice, N+1 en handlers,
   agregados de dashboard calculados on-the-fly sobre muchos tenants.

## Approach — measure-first, 5 fases

### Fase 0 · Instrumentar y definir el modelo
Antes de tocar nada, observabilidad:
- Timing p50/p95/p99 **por endpoint** (middleware de métricas en Echo).
- Métrica de **saturación del pool** de DB (in-use vs max, wait count).
- **Slow-query log** de Postgres activado + `pg_stat_statements`.
- Conteo de requests **por tenant**.
Salida: un dashboard/reporte de "cómo se comporta hoy en reposo/carga leve".

### Fase 1 · Baseline con load test
- Script **k6** (o Artillery) que replica el modelo: M virtual users en K tenants,
  navegación realista (login → dashboard → módulos), ramp-up hasta el pico.
- **Generador de seed a escala:** K tenants con filas realistas (usuarios, grupos,
  eventos, música, reportes) — necesario para que el test sea representativo.
- Correr → **dónde se rompe HOY** (throughput máx, p95/p99, punto de saturación del
  pool, primeras requests colgadas). Registrar **números baseline**.

### Fase 2 · Auditar los 3 niveles (guiados por el baseline)

**Postgres**
- `EXPLAIN (ANALYZE, BUFFERS)` del top-10 de queries por frecuencia×costo (de
  `pg_stat_statements`).
- Auditoría de índices: `church_id`, FKs, columnas de orden/filtro de los hot paths.
- Overhead real del RLS (`SET LOCAL ROLE jetro_app` + policies) medido.
- Config del pooler (pgbouncer, modo transaction, límite del plan Supabase).
- Detección de N+1 (queries repetidas por request).

**Infra**
- Topología: Render (backend Go) + Vercel (frontend) + Supabase (DB/pooler).
- Tamaño de instancias, autoscaling, LB, región/latencia entre capas.
- Límite real de conexiones del plan de Supabase (define el techo del pool).
- CDN / caching de estáticos.

**App**
- Cuánto tiempo se sostiene abierta la tx por request (traza).
- Coherencia del cache in-memory con réplicas.
- N+1 en handlers Go; paginación faltante; tamaño de payloads.
- **Front:** la tormenta de queries — `staleTime`, dedup, `refetchOnWindowFocus`,
  dependencias de `useQuery` que causan re-fetch, posibles re-render loops.

### Fase 3 · Priorizar y optimizar (matriz impacto/esfuerzo)
Orden probable (a confirmar con datos):
1. **tx-por-request + pool** → agregar **timeouts de request** (context deadline;
   falla-rápido), dimensionar el pool al máximo del pooler, evaluar acortar el scope de
   la tx (abrir la tx sólo alrededor de las queries, no toda la request).
2. **Tormenta de queries del front** → `staleTime`/dedup/arreglar re-render (gran
   reducción de carga, casi gratis).
3. **Fairness multi-tenant** → rate-limit **por tenant** y/o fairness de conexiones para
   que una iglesia pesada no monopolice el pool.
4. **Índices + N+1** en Postgres.
5. **Agregados pesados de dashboard** → precomputar (rollup/materialized view).

Cada fix → **re-load-test para verificar** que movió la aguja. Evidencia antes de
declarar nada resuelto (superpowers:verification-before-completion).

### Fase 4 · Guardrails y plan de capacidad
- **Timeouts** de request y de query (fail-fast).
- **Rate limiting por tenant** (fairness + anti-abuso).
- **Circuit breakers** en llamadas a servicios externos.
- **Monitoreo + alertas:** p95 por endpoint, saturación del pool, error rate.
- **Modelo de capacidad documentado:** "con plan Supabase X y N réplicas aguantamos Y
  usuarios; las palancas de escala son Z."

## Herramientas de infraestructura nuevas

Se **diseñan desde ya** para no pintarnos solos, se **encienden cuando la carga lo pida**
(YAGNI en el deploy, no en el diseño):

- **Redis** — cache **compartido** (reemplaza `InMemoryCache`, con claves **por tenant** e
  invalidación en writes), rate-limiting por tenant, y backing de la cola. Elegido sobre
  memcached por versatilidad (no corremos ambos).
- **Cola de mensajes** — jobs async: email (Comms del control plane), provisioning,
  rollups de telemetría. Para Go: **Asynq** o **River** (sobre Redis/Postgres) antes que
  RabbitMQ, salvo que la escala lo justifique. Nunca bloquear una request esperando I/O
  externo (SMTP, provisioning).

## Estrategia de fairness multi-tenant

El riesgo propio del target elegido: con tx-por-request + RLS, una query lenta de un
tenant sostiene una conexión del pool y puede **starve** a los demás. Mitigaciones:
- Rate-limit por tenant (cuota de requests/seg por `church_id`).
- Timeouts de query agresivos → una query patológica de un tenant no bloquea el pool.
- Considerar un pool/quota por tenant si el baseline muestra starvation.

## Deliverables

1. Middleware de métricas + observabilidad (Fase 0).
2. Load harness k6 + generador de seed a escala (Fase 1).
3. **Reporte de baseline** con el punto de ruptura actual.
4. **Backlog de optimización** priorizado (impacto/esfuerzo) con baseline vs objetivo.
5. Fixes aplicados + **re-tests que los verifican**.
6. Guardrails (timeouts, rate-limit por tenant, circuit breakers, alertas).
7. **Modelo de capacidad** documentado.

## Verification

- Cada optimización se valida re-corriendo el load test y comparando contra el baseline.
- El spec se considera cumplido cuando el load test al **modelo de carga objetivo** pasa
  los **SLOs** de forma sostenida, sin requests colgadas y con fairness dentro del umbral.

## Out of scope / follow-ups

- **Control plane / back-office JETRO** — spec propio (depende de esta base).
- **Mitad CRM (referencia Twenty)** — spec propio; reimplementar la lógica en Go, sin
  copiar código (Twenty es AGPL v3).
- **Encendido del multi-tenancy (F1)** — spec propio; este trabajo destraba el cuello de
  `TenantTx` pero no hace el rollout.

## Open questions (a resolver en Fase 0/2)

- Plan de Supabase y **límite real de conexiones** del pooler (define el techo del pool).
- **N** de tenants objetivo y distribución de tamaños (para el modelo de seed).
- Hosting del backend: ¿Render escala horizontal? ¿cuántas réplicas objetivo?
