# CLAUDE.md — SionERP Context

Este archivo da contexto completo a Claude (y otros agentes AI) sobre el proyecto SionERP.

## ¿Qué es SionERP?

Sistema de gestión cristiana para iglesias. Enfoque principal: **discipulado** (células), zonas geográficas, y jerarquía de liderazgo.

**Usuario**: Pastor/Administrador de iglesia (contexto ministerial, no corporativo).

## Stack Tecnológico

- **Frontend**: React 18 + TypeScript + Vite, Tailwind CSS, shadcn/ui, Zod, React Hook Form, TanStack Query
- **Backend**: Go 1.24 + Echo v4 framework, Supabase (PostgreSQL), JWT auth
- **Monorepo**: pnpm workspace — frontend en raíz, backend en `apps/backend-go/`
- **Testing**: Jest + @testing-library/react (frontend), Go built-in (backend, sin tests aún)
- **PWA**: Service Worker + Geolocation implementados

## Estructura Clave

```
SionERP/
├── apps/backend-go/          # API REST Go
│   ├── main.go               # Entrada
│   ├── routes/               # Rutas API
│   ├── handlers/             # Controladores HTTP
│   ├── models/               # Modelos datos
│   ├── middleware/            # Auth + módulos
│   └── database/             # Queries SQL
├── src/                      # Frontend React
│   ├── pages/dashboard/      # Dashboards por nivel
│   ├── components/           # Componentes UI
│   ├── services/             # Llamadas API
│   ├── hooks/                # Hooks React
│   └── __tests__/            # Tests unitarios
├── supabase/migrations/      # SQL migrations
└── docs/                     # Documentación técnica
```

## Estado de Implementación

### Backend (Go) — Endpoints Completos
Auth, Users, Dashboard, Setup, Modules, Invitations, Settings, Preferences, **Discipleship** (grupos, jerarquía, métricas, reportes, alertas, asistencia), **Zones** (CRUD + stats)

### Frontend — Servicios Completos
api.service, user.service, dashboard.service, discipleship.service, discipleship-analytics.service, zones.service, settings.service

### Módulo Discipulado (Completado)
- Jerarquía: Líder → Supervisor Auxiliar → Supervisor General → Coordinador → Pastoral
- Tablas: `discipleship_levels`, `discipleship_group_members`, `discipleship_attendance`
- Flujo: Zonas → Grupos → Miembros → Asistencia → Estadísticas
- Componentes: GroupManagement, GroupMembers, PastoralDashboard, UserZoneAssignment

## Decisiones de Arquitectura

### Multi-tenant: Una DB PostgreSQL por iglesia
- Aislamiento total de datos entre iglesias
- Self-hosted en VPS con Supabase local (costo fijo vs variable)
- Routing por subdomain: `iglesia1.sionerp.com` → DB correspondiente
- **Estado actual**: Single-tenant (una tabla `church_info`). Requiere re-arquitectura para multi-tenant.

### Mobile-first / PWA
- Diseño mobile-first siempre
- PWA implementada: Service Worker para offline + push notifications
- Geolocation service para check-ins

## Convenciones del Proyecto

- **TypeScript**: Strict mode desactivado (`"strict": false` en tsconfig.app.json)
- **Linter**: ESLint v9 + eslint-plugin-react-hooks + eslint-config-prettier
- **Formatter**: Prettier v3 (semicolons, single quotes, 100 print width)
- **Tests**: Jest con ts-jest preset, jsdom environment, patrones: `src/**/__tests__/**/*.(ts|tsx)`, `src/**/*.(test|spec).(ts|tsx)`
- **No hay Go tests** en `apps/backend-go/` aún

## Documentación Relacionada

- `docs/INDICE_TECNICO.md` — Documento técnico completo (682 líneas)
- `MANUAL_USUARIO.md` — Manual de usuario
- `docs/FLUJO_DISCIPULADO.md` — Flujo de datos del módulo discipulado
- `.atl/skill-registry.md` — Registro de skills del proyecto

## Gotchas / Lecciones Aprendidas

1. **Bug histórico**: `users` state inicializado como `undefined` en lugar de `[]` causaba error en filtros
2. **Backend GetUsers**: No retornaba `zone_id` — se corrigió haciendo JOIN con tabla zones
3. **Niveles de discipulado**: Estaban hardcodeados, ahora están en DB (`discipleship_levels`)
4. **Render infinito**: `useDiscipleshipLevels` llamaba `loadLevels()` sin `useEffect`
5. **Badge de zona**: Backend `GetZoneStats` no calculaba miembros reales — se implementó lógica dinámica

## Instrucciones para Claude

- El usuario habla español (rioplatense: "vos", "dale", etc.)
- Siempre verificar el código antes de afirmar algo
- Mobile-first: cualquier UI debe funcionar en móvil primero
- No agregar comentarios innecesarios al código
- Usar "ponete las pilas" / "dale" cuando corresponda (estilo enseñanza directa pero cariñosa)
- El usuario valora la arquitectura sólida sobre atajos rápidos

## Roles y Permisos — Plan de Implementación

### ✅ Lo que ya hicimos (Estado actual)

#### 1. Unificación de IDs (COMPLETO)
- **Backend**: `CreateUserWithEmailPassword` acepta `id` y lo pasa a Supabase Auth ✅
- **Backend**: `CreateUserDirect` usa UN SOLO UUID para Auth y users ✅
- **Backend**: `bootstrap.go` crea admin con el mismo UUID ✅
- **Backend**: `middleware/auth.go` busca SOLO por `id` (ya no `auth_id`) ✅
- **Backend**: `models/user.go` eliminado campo `AuthID` ✅
- **Frontend**: `DiscipleshipPage.tsx` usa `currentUser.id` ✅
- **Migración**: `20260504000002_cleanup_auth_id.sql` arregla trigger y políticas RLS ✅
- **Sentry**: Removido de frontend y backend ✅

#### 2. Sistema de Roles (IMPLEMENTADO)
- **Jerarquía**: admin (500) > pastor (400) > staff (300) > supervisor (200) > server (100) > member (0)
- **Backend**: Middleware `RequireRole()` en `middleware/role_check.go` ✅
- **Backend**: `HasAdminAccess()` para pastor/staff ✅
- **Frontend**: `permissions.ts` con `ROLE_LEVELS` y `fetchPermissions()` ✅
- **Frontend**: `usePermissions` hook ✅
- **Frontend**: `ProtectedRoute` con `minRole` y `requiredModule` ✅
- **Frontend**: `Can` component para acciones ✅

### ❌ Lo que falta (Pendientes)

#### 3. Restricción de Acciones en Frontend (FALTA TODO)
> *"el de restringir las acciones de los usuarios... de ahí nos falta todo lo demás"*

**Problema actual**: `ProtectedRoute` restringe RUTAS, pero NO restringe ACCIONES (botones, formularios).

**Plan de implementación**:

##### A. Backend: Resource-level filtering en TODOS los endpoints
- [ ] **Verificar `GetUser`**: ¿Server/member solo ven su propio perfil? ✅ (Ya tiene el `switch`)
- [ ] **Verificar `UpdateUser`**: ¿Users con `server` role pueden editar a OTROS? (Debe ser solo su propio `id`)
- [ ] **Verificar `DeleteUser`**: ¿Server/member pueden eliminar? (Debe ser NO)
- [ ] **Verificar endpoints de Discipleship**: ¿Supervisores solo ven sus grupos/subordinados?
- [ ] **Verificar endpoints de Zones**: ¿Líderes solo ven su zona?

##### B. Frontend: Ocultar acciones según rol (FALTA)
- [ ] **UsersPage.tsx**: 
  - Ocultar botón "Eliminar" si no es `admin`
  - Ocultar botón "Editar" si no es `admin/staff` o es su propio perfil
  - Ocultar "Cambiar Rol" si no es `admin`
- [ ] **ZonesPage.tsx**:
  - Ocultar "Crear Zona" si no es `pastor/staff`
  - Ocultar "Editar/Eliminar" si no tiene nivel jerárquico en esa zona
- [ ] **DiscipleshipPage.tsx**:
  - Ocultar "Crear Grupo" si no es `supervisor+`
  - Ocultar "Gestionar Miembros" si no es líder de ese grupo
- [ ] **Usar `<Can I={ROLE_LEVELS.admin}>`** en TODOS lados para proteger acciones

##### C. Sidebar dinámico (FALTA)
> *"de ahí nos falta todo lo demás... hasta el sidebar"*

**Problema actual**: `AppSidebar.tsx` muestra TODO para todos los roles.

- [ ] **`AppSidebar.tsx`**:
  - Ocultar "Módulos" si no es `admin` ✅ (Ya tiene `requiredModule: 'base'`)
  - Ocultar "Roles" si no es `admin` ✅ (Ya tiene `requiredModule: 'base'`)
  - Ocultar "Zonas" si no tiene módulo `zones` instalado ✅ (Ya tiene `requiredModule: 'zones'`)
  - Ocultar "Eventos" si no tiene módulo `events` ✅ (Ya tiene `requiredModule: 'events'`)
  - Ocultar "Reportes" si no tiene módulo `reports` ✅ (Ya tiene `requiredModule: 'reports'`)
  - **NUEVO**: Mostrar solo las pestañas del `DiscipleshipPage` según `discipleship_level`:
    - Si `isFullAccess` (pastor/staff) → Todas las pestañas ✅
    - Si `level >= 2` → "Dashboard", "Grupos", "Jerarquía", "Zonas", "Mapa"
    - Si `level == 1` (Líder) → "Resumen", "Mi Grupo"

##### D. Dashboard: Redirección según nivel (FALTA)
- [ ] **`DiscipleshipPage.tsx`**: 
  - Si `isFullAccess` → `PastoralDashboard` ✅
  - Si `level == 5` → `PastoralDashboard`
  - Si `level == 4` → `CoordinatorDashboard`
  - Si `level == 3` → `GeneralSupervisorDashboard`
  - Si `level == 2` → `AuxiliarySupervisorDashboard`
  - Si `level == 1` → `LeaderDashboard`
  - Si `level == null` y no es pastor → "Sin Acceso" ✅

#### 4. Migración: Ejecutar y verificar
- [ ] **Aplicar migración**: `supabase db push` (o `reset` si es desarrollo)
- [ ] **Verificar trigger**: `handle_new_user` sin `auth_id`, con `id_number` y `role` por defecto ✅
- [ ] **Probar login**: Usuario nuevo con contraseña → Debe entrar sin errores
- [ ] **Probar módulos**: Instalar/Desinstalar y verificar acceso

### 📋 Resumen para Claude (Contexto)
- **Usuario**: Pastor Daniel Rodríguez (pastor@sionerp.local)
- **ID único**: `b0000001-0000-0000-0000-000000000001` (mismo en Auth y users)
- **Rol**: pastor (nivel 400, `isFullAccess: true`)
- **Módulos instalados**: base, discipleship, events, reports, zones ✅
- **Problema resuelto**: IDs unificados (ya no hay `auth_id`)
- **Problema pendiente**: Restricción de acciones en frontend (botones, sidebar, dashboards)
