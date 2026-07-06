# Índice Técnico — SionERP

**Versión**: 2.0
**Fecha**: Mayo 2026
**Última actualización**: Migración analytics, alertas automáticas, objetivos estratégicos, Sentry

---

## 1. Visión General del Proyecto

SionERP es un sistema de gestión cristiana para iglesias. Módulos implementados:

- **Discipulado**: Sistema jerárquico de células con 5 niveles de liderazgo
- **Zonas**: Gestión geográfica de grupos y líderes con mapa Leaflet
- **Usuarios**: CRUD completo con RBAC (6 niveles de rol)
- **Reportes**: Métricas por nivel jerárquico con analytics basados en JSONB
- **Objetivos Estratégicos (Goals)**: Seguimiento de metas con progreso automático
- **Alertas**: 7 tipos automáticos (4 críticas + 3 celebración)
- **Configuración**: Módulos, settings, church info, preferencias de usuario

**Stack Tecnológico**:

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 18 + TypeScript + Vite, Tailwind CSS, shadcn/ui, TanStack Query, Zod |
| **Backend** | Go 1.24 + Echo v4 |
| **Base de Datos** | PostgreSQL (Supabase) |
| **Auth** | Supabase Auth (JWT) |
| **Monitoreo** | Sentry (`@sentry/react` frontend, `sentry-go` backend) |
| **PWA** | Service Worker + offline support |
| **Mapas** | Leaflet (migrado desde MapLibre en Mayo 2026) |

---

## 2. Cambios Recientes (Mayo 2026)

### 2.1 Unificación de IDs de Usuario
- **Cambio**: Se eliminó el campo `auth_id` de `public.users`. El `id` en `public.users` es el MISMO UUID que `auth.users.id`.
- **Impacto**: Middleware `AuthMiddleware` busca por `id` únicamente. `CreateUserDirect` usa UN SOLO UUID.
- **Migración**: `20260504000002_cleanup_auth_id.sql`

### 2.2 Sistema de Roles y Permisos (RBAC)
- **Jerarquía**: `admin`(500) > `pastor`(400) > `staff`(300) > `supervisor`(200) > `server`(100) > `member`(0)
- **Backend**: `middleware/role_check.go` con `RequireRole()` por ruta
- **Frontend**: `src/lib/permissions.ts` + hook `usePermissions` + componente `Can` + `ProtectedRoute`
- **has_admin_access**: flag que habilita acceso total para pastor y staff con permisos elevados

### 2.3 Migración de Métricas — `discipleship_metrics` ELIMINADA
- **`discipleship_metrics` fue dropeada** (`20260501000000_drop_discipleship_metrics.sql`). No existe más.
- Toda la analítica ahora lee de `discipleship_reports.report_data` (columna JSONB con 13 métricas objetivas).
- Nueva fórmula de temperatura espiritual: 1 punto por cada una de las 13 métricas activas (máx. 13 pts, no subjetivo).

### 2.4 Sistema de Alertas Automáticas (7 tipos)
Implementado en `handlers/discipleship_alerts.go` → `GenerateAutomaticAlerts()`:

**Críticas (prioridad 2-3)**:
- `no_reports` — sin reportes en 2 semanas
- `low_attendance` — asistencia < 50% por 4 semanas
- `spiritual_decline` — temperatura espiritual < 5 por 4 semanas
- `no_growth` — sin crecimiento en el período

**Celebración (prioridad 5)**:
- `consistency_milestone` — racha consistente de reportes
- `evangelism_champion` — métricas de evangelismo destacadas
- `solid_group` — grupo clasificado como sólido

### 2.5 Fases de Grupo
Calculadas en frontend a partir de datos del backend:
- 🌱 `germinating` — < 4 reportes totales
- 🌿 `growing` — 4+ reportes totales
- 💎 `solid` — 24+ reportes, 12+ con temp ≥ 8, temp actual ≥ 8
- 🔥 `multiplying` — `is_multiplying=true` en 2+ reportes últimos 28 días
- ⚠️ `at_risk` — tiene alertas críticas activas

### 2.6 Módulo de Objetivos Estratégicos (Goals)
- Tabla `discipleship_goals` con `goal_type`, `target_metric`, `current_value`, `deadline`, `priority`, `zone_id`
- Endpoints CRUD completos + `extend`, `close-incomplete`, `auto-update`
- Integrado en `PastoralDashboard` y `CoordinatorDashboard` (tab "Estratégico")

### 2.7 Monitoreo con Sentry
- **Frontend**: `@sentry/react` en `src/main.tsx` — inicialización condicional por `VITE_SENTRY_DSN`
- **Backend**: `sentry-go` con middleware custom en `main.go` (compatible con echo/v4)
- El middleware official `sentryecho` es incompatible con echo/v4 (usa v5). Se usa middleware propio.

---

## 3. Estructura del Proyecto

```
SionERP/
├── apps/
│   └── backend-go/             # API REST en Go
│       ├── main.go             # Entry point + Sentry + Echo setup
│       ├── routes/routes.go    # Todas las rutas y sus middlewares
│       ├── handlers/           # Controladores HTTP (uno por módulo)
│       ├── models/             # Structs de datos con json/db tags
│       ├── middleware/         # Auth, roles, módulos, audit log
│       ├── config/             # DB connection, email
│       ├── services/           # Bootstrap super admin
│       └── utils/CONST.go      # Niveles de rol y módulos
├── src/                        # Frontend React
│   ├── pages/dashboard/
│   │   ├── discipleship/       # Dashboards por nivel (5 componentes)
│   │   ├── DiscipleshipPage.tsx
│   │   ├── GoalsDashboard.tsx
│   │   └── ...
│   ├── components/
│   │   ├── discipleship/       # Modales y gestión
│   │   ├── dashboard/          # Widgets de dashboard
│   │   └── ui/                 # shadcn components
│   ├── hooks/                  # Hooks con TanStack Query por nivel
│   ├── services/               # Servicios de API
│   ├── lib/permissions.ts      # RBAC frontend
│   └── types/                  # TypeScript types
├── supabase/
│   ├── migrations/             # SQL migrations numeradas
│   └── seed.sql
└── docs/                       # Documentación técnica
```

---

## 4. Estado de Implementación

### 4.1 Endpoints del Backend

| Módulo | Ruta base | Endpoints | Auth | Nivel mínimo |
|--------|-----------|-----------|------|-------------|
| **Health** | `/api/v1/health` | GET | ❌ público | — |
| **Debug** | `/api/v1/debug/sentry-test` | GET | ❌ público | — ⚠️ temporal |
| **Auth** | `/api/v1/auth` | POST login, logout | ❌ público | — |
| **Setup** | `/api/v1/setup` | GET status, POST perform | opcional | — |
| **Users** | `/api/v1/users` | CRUD + `/direct` | ✅ | staff (300) |
| **Users/me** | `/api/v1/users/me` | GET, PUT, PUT onboarding | ✅ | member (0) |
| **Dashboard** | `/api/v1/dashboard` | GET stats | ✅ | member (0) |
| **Permissions** | `/api/v1/permissions/me` | GET | ✅ | member (0) |
| **Invitations** | `/api/v1/invitations` | CRUD + resend + accept | ✅ | staff (300) |
| **Modules** | `/api/v1/modules/:key` | PUT | ✅ | pastor (400) |
| **Settings** | `/api/v1/settings` | system, church, notifications | ✅ | pastor (400) |
| **Preferences** | `/api/v1/preferences` | GET, PUT | ✅ | member (0) |
| **Discipleship** | `/api/v1/discipleship` | Ver detalle abajo | ✅ + módulo | variable |
| **Zones** | `/api/v1/zones` | CRUD + map + stats + groups | ✅ + módulo | variable |

#### Discipleship sub-rutas

| Ruta | Métodos | Nivel mínimo |
|------|---------|-------------|
| `/groups` | GET | member |
| `/groups` | POST, PUT | supervisor (200) |
| `/groups/:id` | DELETE | staff (300) |
| `/groups/:id/members` | GET, POST | member |
| `/members/:memberId` | PUT, DELETE | member |
| `/groups/:id/attendance` | GET, POST, bulk | member |
| `/hierarchy` | GET, POST | member |
| `/levels` | CRUD | member |
| `/reports` | GET, POST | member |
| `/reports/:id/approve` `reject` | PUT | supervisor |
| `/goals` | GET, POST | member |
| `/goals/:id` | PUT, DELETE | member (dueño o admin) |
| `/goals/:id/extend` `close-incomplete` `auto-update` | POST | member |
| `/alerts` | GET, POST | member |
| `/alerts/:id/resolve` | PUT | member |
| `/alerts/generate` | POST | member |
| `/analytics` | GET | member |
| `/weekly-trends` | GET | member |
| `/dashboard-stats` | GET | member |
| `/leaders/:id/stats` | GET | member |
| `/supervisors/:id/subordinates` | GET | member |
| `/multiplications` | GET | member |

### 4.2 Dashboards del Frontend por Nivel

| Nivel | Dashboard | Componente | Tabs |
|-------|-----------|-----------|------|
| Pastor / isFullAccess | Ejecutivo | `PastoralDashboard.tsx` | Vista General, Estratégico, Aprobaciones, Alertas, Salud |
| 4 — Coordinador | Estratégico | `CoordinatorDashboard.tsx` | Resumen, Supervisores, Objetivos (GoalsDashboard), Reportes |
| 3 — Sup. General | Zonal | `GeneralSupervisorDashboard.tsx` | — |
| 2 — Sup. Auxiliar | Supervisión | `AuxiliarySupervisorDashboard.tsx` | — |
| 1 — Líder | Grupo | `LeaderDashboard.tsx` | Mi Grupo, Reportes, Asistencia |
| Sin nivel / sin acceso | Pantalla bloqueada | — | — |

### 4.3 Servicios del Frontend

| Servicio | Responsabilidad |
|---------|----------------|
| `api.service.ts` | Cliente HTTP base, manejo de errores |
| `user.service.ts` | CRUD usuarios, perfil, onboarding |
| `dashboard.service.ts` | Stats del dashboard principal |
| `discipleship.service.ts` | Grupos, jerarquía, reportes, alertas, asistencia, goals |
| `discipleship-analytics.service.ts` | Analytics, tendencias, stats por nivel |
| `zones.service.ts` | Zonas con mapa Leaflet |
| `settings.service.ts` | Settings del sistema e iglesia |

---

## 5. Base de Datos — Tablas

### 5.1 Tablas del Módulo Discipleship (confirmadas en código)

| Tabla | Descripción | Notas |
|-------|------------|-------|
| `discipleship_groups` | Grupos/células | Tiene `active_members` (actualizado por handler de asistencia) |
| `discipleship_hierarchy` | Jerarquía 1-5 | `hierarchy_level`, `supervisor_id` |
| `discipleship_group_members` | Membresía en grupos | |
| `discipleship_attendance` | Asistencia individual | `present`, `meeting_date` |
| `discipleship_reports` | Reportes semanales | `report_data` (JSONB, 13 métricas) + `is_multiplying` |
| `discipleship_goals` | Objetivos estratégicos | `goal_type`, `target_metric`, `current_value`, `deadline` |
| `discipleship_alerts` | Alertas | `alert_type`, `resolved`, `priority` (5=celebración) |
| `discipleship_levels` | Nombres de niveles configurables | 1-5, personalizables por iglesia |
| `discipleship_multiplications` | Conteo de multiplicaciones | Liviana, para dashboard |
| `cell_multiplication_tracking` | Historial detallado | Usado en analytics y goals |

> ⚠️ **`discipleship_metrics` NO EXISTE** — fue dropeada en `20260501000000_drop_discipleship_metrics.sql`. Nunca escribir queries a esta tabla.

### 5.2 Tablas del Sistema

| Tabla | Descripción |
|-------|------------|
| `users` | Usuarios con `role`, `role_level`, `has_admin_access` |
| `zones` | Zonas geográficas |
| `invitations` | Invitaciones de usuarios |
| `settings` | Configuración del sistema |
| `user_preferences` | Preferencias por usuario |
| `audit_logs` | Auditoría de cambios de acceso |
| `church_info` | Información de la iglesia |

### 5.3 Métricas JSONB — Campos de `report_data`

Los reportes semanales almacenan 13 métricas en `discipleship_reports.report_data`:

**Numéricas (1 punto si > 0)**:
`attendance_nd`, `attendance_dm`, `attendance_friends`, `attendance_kids`, `group_discipleships`, `group_evangelism`, `leader_new_disciples_care`, `leader_mature_disciples_care`, `spiritual_journal_days`, `leader_evangelism`

**Booleanas (1 punto si = true)**:
`service_attendance_sunday`, `service_attendance_prayer`, `doctrine_attendance`

**Temperatura espiritual** = suma de puntos sobre 28 días (máx. 13 por reporte). Objetivo > 8.

---

## 6. Arquitectura de Rutas del Backend

```
/api/v1/
├── GET  /health                           # público
├── GET  /debug/sentry-test                # público ⚠️ temporal
├── POST /auth/login
├── POST /auth/logout
├── GET  /setup/status
├── POST /setup
│
├── [AUTH] GET  /permissions/me
├── [AUTH] GET  /users/me
├── [AUTH] PUT  /users/me
├── [AUTH] PUT  /users/me/onboarding
├── [AUTH] GET  /dashboard/stats
├── [AUTH] GET  /preferences
├── [AUTH] PUT  /preferences
│
├── [AUTH+staff] GET    /users
├── [AUTH+staff] POST   /users
├── [AUTH+staff] GET    /users/:id
├── [AUTH+staff] PUT    /users/:id
├── [AUTH+staff] DELETE /users/:id
├── [AUTH+staff] POST   /users/direct
│
├── [AUTH+staff]  GET/POST /invitations
├── [AUTH+pastor] PUT      /modules/:key
├── [AUTH+pastor] GET/PUT  /settings/system
├── [AUTH+pastor] GET/PUT  /settings/church
├── [AUTH+pastor] GET/PUT  /settings/notifications
│
└── [AUTH+módulo_discipleship] /discipleship/...
    └── [AUTH+módulo_zones] /zones/...
```

### Middlewares en orden de ejecución

```
Request → Logger → Sentry (si DSN) → Recover → CORS → Route handlers
                              ↓
                       SupabaseAuth (rutas protegidas)
                              ↓
                       RequireModule (rutas de módulo)
                              ↓
                       RequireRole (rutas con nivel mínimo)
```

---

## 7. Flujos de Datos Principales

### 7.1 Login y Redirección por Nivel

```
Login → /auth/login → JWT válido
                          ↓
                    GET /permissions/me
                          ↓
                    ¿discipleship_level?
                          ├── null + no fullAccess → "Sin acceso" en DiscipleshipPage
                          ├── level 1 → LeaderDashboard
                          ├── level 2 → AuxiliarySupervisorDashboard
                          ├── level 3 → GeneralSupervisorDashboard
                          ├── level 4 → CoordinatorDashboard
                          └── level 5 / isFullAccess → PastoralDashboard
```

### 7.2 Reporte Semanal (Líder)

```
LeaderDashboard → LeaderReportModal
                        ↓
               13 métricas + is_multiplying
                        ↓
          POST /discipleship/reports (con report_data JSONB)
                        ↓
               UPDATE discipleship_groups.active_members
                        ↓
          POST /discipleship/alerts/generate (automático)
                        ↓
               7 alertas evaluadas con dedup
```

### 7.3 Dashboard Pastoral — Carga de Datos

```
PastoralDashboard → useDiscipleshipData({ level: 5 })
                             ↓ Promise.allSettled
       ┌─────────────────────┬──────────────────────┐
       ↓                     ↓                      ↓
/weekly-trends        /analytics             /dashboard-stats
/reports?submitted    /alerts?resolved=false  /goals
       └─────────────────────┴──────────────────────┘
                             ↓
                    Recharts + tablas + KPIs
```

---

## 8. Variables de Entorno

### Backend (`apps/backend-go/.env`)

| Variable | Descripción | Default |
|----------|------------|---------|
| `PORT` | Puerto del servidor | `8081` |
| `SUPABASE_URL` | URL de Supabase | — |
| `SUPABASE_DB_URL` | URL directa a PostgreSQL | — |
| `SUPABASE_ANON_KEY` | Anon key | — |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | — |
| `JWT_SECRET` | Secret para validar JWT | — |
| `ALLOWED_ORIGINS` | CORS origins | `http://localhost:5173` |
| `ENVIRONMENT` | `development` \| `production` | `development` |
| `SENTRY_DSN` | DSN del proyecto Go en Sentry | — (opcional) |
| `SION_ADMIN_EMAIL` | Email del super admin bootstrap | — |
| `SION_ADMIN_PASSWORD` | Password del super admin bootstrap | — |

### Frontend (`.env`)

| Variable | Descripción |
|----------|------------|
| `VITE_SUPABASE_URL` | URL de Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon key |
| `VITE_SENTRY_DSN` | DSN del proyecto React en Sentry (opcional) |

---

## 9. Comandos de Desarrollo

### Backend

```bash
cd apps/backend-go

# Dependencias
go mod download

# Dev con hot reload
air

# Build
go build -o backend-sion ./...

# Verificar compilación
go build ./...
```

### Frontend

```bash
# Instalar dependencias
yarn install

# Desarrollo
yarn dev

# Build producción
yarn build

# Tests
yarn test
```

### Base de Datos

```bash
# Aplicar migrations
supabase db push

# Resetear DB (dev)
supabase db reset

# Ver estado
supabase status
```

---

## 10. Tests

### Backend
- **Estado**: No hay tests unitarios en `apps/backend-go/` aún.
- **Herramienta planeada**: Go built-in `testing` package.

### Frontend
- **Framework**: Vitest + React Testing Library
- **Ubicación**: `src/__tests__/`
- **Configuración**: Jest preset, jsdom environment
- **Archivo de ejemplo**: `src/__tests__/utils/permissions.test.ts`

---

## 11. Guías de Contribución

### 11.1 Agregar Nuevo Endpoint al Backend

```
1. Crear handler en handlers/nuevo_modulo.go
   → struct NuevoHandler + NewNuevoHandler() + métodos
   
2. Registrar en routes/routes.go
   → nuevoHandler := handlers.NewNuevoHandler()
   → ruta := protected.Group("/nuevo")
   → ruta.Use(middleware.RequireRole(utils.LevelStaff))
   → ruta.GET("", nuevoHandler.GetItems)
   
3. Agregar modelo en models/ si hace falta

4. Hacer go build ./... para verificar
```

### 11.2 Agregar Nueva Migration

```
1. Crear archivo en supabase/migrations/
   → Nombre: YYYYMMDDHHMMSS_descripcion.sql
   
2. Escribir SQL idempotente
   → Usar IF NOT EXISTS, IF EXISTS

3. Aplicar: supabase db push
```

### 11.3 Agregar Nuevo Componente Frontend

```
1. Componente en src/components/ o src/pages/
2. Hook en src/hooks/ si necesita datos remotos
   → Usar TanStack Query (useQuery / useMutation)
3. Servicio en src/services/ si es un nuevo módulo
4. Tipos en src/types/
5. Permisos con <Can I={ROLE_LEVELS.staff}> para acciones
```

---

## 12. Dos Capas de Roles — CONCEPTUAL CLAVE

El sistema tiene DOS capas de roles **independientes**:

| Capa | Tabla / Campo | Valores | Uso |
|------|--------------|---------|-----|
| **ERP** | `users.role` | admin/pastor/staff/supervisor/server/member | Acceso general a la app |
| **Módulo** | `discipleship_hierarchy.hierarchy_level` | 1-5 | Vista y acceso dentro del módulo |

Un usuario con `role = member` puede ser Líder de Grupo (`hierarchy_level = 1`).
Un usuario con `role = pastor` tiene `isFullAccess = true` y ve todo sin hierarchy_level.

**Nunca confundir** el nivel ERP con el nivel de módulo. Son independientes y complementarios.

---

## 13. Pendientes y Known Issues

### Pendientes de Implementación

| Item | Prioridad | Notas |
|------|-----------|-------|
| Preferencias de usuario (UI) | Alta | Backend ✅, frontend falta |
| Configuración de iglesia (UI) | Alta | Backend ✅, frontend falta |
| PersonalDashboard con datos reales | Media | Actualmente usa `mockNotifications` |
| Módulo de Notificaciones | Baja | Planeado, no implementado |
| Tests backend Go | Baja | Estructura planeada, no implementada |
| Eliminar `/debug/sentry-test` | Media | Endpoint temporal de verificación |

### Known Issues

- `PersonalDashboard.tsx` usa `mockNotifications` — pendiente migrar al backend cuando se implemente el módulo de notificaciones
- El módulo "events" tiene ruta en el sidebar pero sin pantalla de contenido real
- Secciones de `ReportsPage.tsx`, `RolesPage.tsx` pueden tener funcionalidad parcial

---

## 14. KPIs y Analytics — Referencia

Ver documento dedicado:

📄 **`docs/DISCIPLESHIP_DASHBOARD_KPIS.md`**

Contiene:
- Tablas reales de BD (post-migración, sin `discipleship_metrics`)
- Queries SQL activos en `dashboard.go`
- Fórmula de temperatura espiritual (13 puntos objetivos)
- Consultas de verificación para Supabase SQL Editor

---

## 15. Referencias Rápidas

| Recurso | Ubicación |
|---------|-----------|
| Entry point backend | `apps/backend-go/main.go` |
| Todas las rutas + middlewares | `apps/backend-go/routes/routes.go` |
| Niveles de rol (constantes) | `apps/backend-go/utils/CONST.go` |
| RBAC frontend | `src/lib/permissions.ts` |
| KPIs y tablas de discipulado | `docs/DISCIPLESHIP_DASHBOARD_KPIS.md` |
| Módulo discipulado completo | `docs/DISCIPLESHIP_MODULE.md` |

---

_Documento técnico mantenido activamente. Actualizar al agregar o modificar módulos, rutas, tablas o decisiones de arquitectura._
