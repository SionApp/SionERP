# Índice Técnico — SionERP

**Versión**: 1.0  
**Fecha**: 18 de Abril de 2026  
**Última actualización**: Esta versión

---

## 1. Visión General del Proyecto

SionERP es un sistema de gestión cristiana que abarca:

- **Discipulado**: Sistema jerárquico de células con 5 niveles de liderazgo
- **Zonas**: Gestión geográfica de grupos y líderes
- **Usuarios**: Gestión de miembros, roles y permisos
- **Reportes**: Métricas y analytics por nivel jerárquico
- **Configuración**: Módulos, settings, church info

**Stack Tecnológico**:

- **Frontend**: React + TypeScript + Vite
- **Backend**: Go + Echo
- **Base de Datos**: PostgreSQL (Supabase)
- **Auth**: Supabase Auth (JWT)

---

## 2. Estructura del Proyecto

```
SionERP/
├── apps/
│   └── backend-go/          # API REST en Go
│       ├── main.go          # Punto de entrada
│       ├── routes/         # Definición de rutas
│       ├── handlers/        # Controladores (lógica HTTP)
│       ├── models/          # Modelos de datos
│       ├── middleware/      # Middlewares auth y módulos
│       ├── database/       # Queries a BD
│       ├── cache/          # Caché en memoria
│       ├── config/         # Configuración
│       └── utils/           # Utilidades
├── src/                     # Frontend React
│   ├── pages/
│   │   ├── dashboard/      # Dashboards por nivel jerárquico
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── SetupPage.tsx
│   │   └── ...
│   ├── components/
│   │   ├── dashboard/      # Componentes de dashboards
│   │   └── ...
│   ├── services/           # Servicios API (llamadas al backend)
│   ├── hooks/            # Hooks de React para datos
│   ├── lib/              # Utilidades y helpers
│   └── __tests__/        # Tests unitarios
├── supabase/
│   ├── migrations/        # SQL migrations
│   └── seed.sql          # Datos iniciales
├── docs/                 # Documentación técnica
└── packages/             # Paquetes compartidos
```

---

## 3. Estado de Implementación por Módulo

### 3.1 Backend Go — Endpoints

| Módulo           | Ruta base              | Métodos                                                    | Estado      |
| ---------------- | ---------------------- | ---------------------------------------------------------- | ----------- |
| **Auth**         | `/api/v1/auth`         | POST login, logout                                         | ✅ Completo |
| **Users**        | `/api/v1/users`        | CRUD completo                                              | ✅ Completo |
| **Dashboard**    | `/api/v1/dashboard`    | GET stats                                                  | ✅ Completo |
| **Setup**        | `/api/v1/setup`        | GET status, POST perform                                   | ✅ Completo |
| **Modules**      | `/api/v1/modules`      | PUT actualizar estado                                      | ✅ Completo |
| **Invitations**  | `/api/v1/invitations`  | CRUD completos                                             | ✅ Completo |
| **Settings**     | `/api/v1/settings`     | Sistema, church, notifications                             | ✅ Completo |
| **Preferences**  | `/api/v1/preferences`  | GET, PUT user prefs                                        | ✅ Completo |
| **Discipleship** | `/api/v1/discipleship` | Grupos, jerarquía, métricas, reportes, alertas, asistencia | ✅ Completo |
| **Zones**        | `/api/v1/zones`        | CRUD completos + stats                                     | ✅ Completo |

**Notas**:

- Todos los endpoints requieren auth (jwt) excepto `/api/v1/auth/*` y `/api/v1/setup/*`
- Algunos endpoints requieren módulo activo (ej. `/discipleship` requiere módulo "discipleship" habilitado)

---

### 3.2 Frontend — Servicios

| Servicio                            | Uso                         | Estado      |
| ----------------------------------- | --------------------------- | ----------- |
| `api.service.ts`                    | Cliente HTTP base           | ✅ Completo |
| `user.service.ts`                   | Gestión de usuarios         | ✅ Completo |
| `dashboard.service.ts`              | Stats del dashboard         | ✅ Completo |
| `discipleship.service.ts`           | Grupos, jerarquía, reportes | ✅ Completo |
| `discipleship-analytics.service.ts` | Analytics y métricas        | ✅ Completo |
| `zones.service.ts`                  | Gestión de zonas            | ✅ Completo |
| `settings.service.ts`               | Settings del sistema        | ✅ Completo |

---

### 3.3 Frontend — Dashboards por Nivel

| Nivel | Rol                 | Dashboard                | Componente                         | Estado      |
| ----- | ------------------- | ------------------------ | ---------------------------------- | ----------- |
| 5     | Pastor              | Dashboard Ejecutivo      | `PastoralDashboard.tsx`            | ✅ Completo |
| 4     | Coordinador         | Dashboard Estratégico    | `CoordinatorDashboard.tsx`         | ✅ Completo |
| 3     | Supervisor General  | Dashboard Zonal          | `GeneralSupervisorDashboard.tsx`   | ✅ Completo |
| 2     | Supervisor Auxiliar | Dashboard de Supervisión | `AuxiliarySupervisorDashboard.tsx` | ✅ Completo |
| 1     | Líder               | Dashboard de Grupo       | `LeaderDashboard.tsx`              | ✅ Completo |

---

### 3.4 Base de Datos — Tablas

| Tabla                    | Estado       | Descripción               |
| ------------------------ | ------------ | ------------------------- |
| `users`                  | ✅ Existente | Usuarios del sistema      |
| `discipleship_hierarchy` | ✅ Existente | Jerarquía de 5 niveles    |
| `discipleship_groups`    | ✅ Existente | Grupos de células         |
| `discipleship_metrics`   | ✅ Existente | Métricas semanales        |
| `discipleship_reports`   | ✅ Existente | Reportes por nivel        |
| `zones`                  | ✅ Existente | Zonas geográficas         |
| `group_members`          | ✅ Existente | Miembros de grupos        |
| `audit_logs`             | ✅ Existente | Auditoría de cambios      |
| `invitations`            | ✅ Existente | Invitaciones de usuarios  |
| `settings`               | ✅ Existente | Configuración del sistema |
| `user_preferences`       | ✅ Existente | Preferencias por usuario  |
| `alerts`                 | ✅ Existente | Alertas del sistema       |

**Pending de verificar en código** (no found en migrations):

- `training_modules` - Módulos de capacitación
- `user_training_progress` - Progreso de capacitación
- `notifications` - Sistema de notificaciones

---

### 3.5 Mocks en el Código

| Archivo                                   | Estado                  | Notas                      |
| ----------------------------------------- | ----------------------- | -------------------------- |
| `src/mocks/discipleship/data.mock.ts`     | ⚠️ legacy               | Ya no se usa en producción |
| `src/mocks/discipleship/services.mock.ts` | ⚠️ legacy               | Ya no se usa en producción |
| **`PersonalDashboard.tsx`**               | ❌ **Pendiente migrar** | Usa `mockNotifications`    |

**Plan**: Migrar `PersonalDashboard.tsx` al sistema real de notificaciones cuando esté implementado.

---

## 4. Arquitectura de Rutas del Backend

### 4.1 Diagrama de Rutas

```
/api/v1/
├── /health                    # Health check (público)
├── /auth/
│   ├── POST /login            # Iniciar sesión
│   └── POST /logout          # Cerrar sesión
├── /users                   # (protegido)
│   ├── GET /               # Listar usuarios
│   ├── POST /              # Crear usuario
│   ├── GET /:id            # Obtener usuario
│   ├── PUT /:id            # Actualizar usuario
│   ├── DELETE /:id         # Eliminar usuario
│   ├── GET /me             # Perfil actual
│   └── PUT /me             # Actualizar perfil
├── /dashboard/stats         # Estadísticas
├── /setup/
│   ├── GET /status         # Estado de setup
│   └── POST /             # Realizar setup
├── /modules/:key           # Actualizar módulo
├── /invitations/           # Gestión de invitaciones
├── /settings/
│   ├── /system            # Settings del sistema
│   ├── /church           # Info de la iglesia
│   └── /notifications    # Config de notificaciones
├── /preferences/         # Preferencias de usuario
├── /discipleship/        # Módulo de discipulado
│   ├── /groups          # Grupos de células
│   ├── /hierarchy     # Jerarquía
│   ├── /levels        # Niveles
│   ├── /metrics      # Métricas
│   ├── /reports     # Reportes
│   ��── /alerts     # Alertas
│   ├── /analytics  # Analytics
│   └── /attendance # Asistencia
└── /zones/           # Gestión de zonas
    ├── /map           # Datos para mapa
    ├── /:id/stats   # Stats de zona
    └── /:id/groups # Grupos de zona
```

### Middlewares Applied

| Ruta                              | Middleware                      | Función                |
| --------------------------------- | ------------------------------- | ---------------------- |
| Todas (excepto `/auth`, `/setup`) | `SupabaseAuth()`                | Valida JWT             |
| `/discipleship/*`                 | `RequireModule("discipleship")` | Requiere módulo activo |
| `/zones/*`                        | `RequireModule("zones")`        | Requiere módulo activo |

---

## 5. Flujos de Datos Principales

### 5.1 Login y Acceso

```
Usuario → Login.tsx → API /auth/login
                          ↓
                    Validar credentials con Supabase
                          ↓
                    Generar JWT
                          ↓
                   .Redirect a Dashboard según nivel
```

### 5.2 Reporte Semanal (Líder)

```
LeaderDashboard → Formulario semanal
                ↓
POST /api/v1/discipleship/metrics
                ↓
POST /api/v1/discipleship/reports
                ↓
Alerta automática al supervisor si asistencia < umbral
```

### 5.3 Gestión de Zonas

```
ZonesPage → Listar zonas
           ↓
GET /api/v1/zones
           ↓
Seleccionar zona → GET /api/v1/zones/:id/stats
                      ↓
                 Asignar grupos y usuarios
```

---

## 6. Guías de Contribución

### 6.1 Agregar Nueva Ruta al Backend

1. **Crear handler** en `apps/backend-go/handlers/`

   ```go
   func (h *Handler) NewEndpoint(c echo.Context) error {
       // lógica
   }
   ```

2. **Registrar ruta** en `apps/backend-go/routes/routes.go`

   ```go
   module.POST("/endpoint", handler.NewEndpoint)
   ```

3. **Agregar middleware si es necesario**
   ```go
   module.Use(middleware.RequireModule("module_name"))
   ```

---

### 6.2 Agregar Nuevo Componente al Frontend

1. **Crear componente** en `src/components/`
2. **Crear hook si necesita datos** en `src/hooks/`
3. **Agregar ruta** en el router
4. **Agregar permisos** en `src/lib/permissions.ts`

---

### 6.3 Agregar Nueva Tabla a la Base de Datos

1. **Crear migration** en `supabase/migrations/`

   ```sql
   CREATE TABLE public.new_table ();
   ```

2. **Agregar modelo en Go** en `apps/backend-go/models/`
3. **Agregar handler y rutas**
4. **Agregar servicio en Frontend** si es necesario
5. **Agregar tipo en TypeScript** si es necesario

---

## 7. Variables de Entorno

### Backend Go (.env)

| Variable               | Descripción         | Default |
| ---------------------- | ------------------- | ------- |
| `PORT`                 | Puerto del servidor | 8081    |
| `SUPABASE_URL`         | URL de Supabase     | -       |
| `SUPABASE_KEY`         | Key de Supabase     | -       |
| `SUPABASE_SERVICE_KEY` | Service role key    | -       |

### Frontend (.env)

| Variable                 | Descripción     |
| ------------------------ | --------------- |
| `VITE_SUPABASE_URL`      | URL de Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon key        |

---

## 8. Comandos de Desarrollo

### Backend

```bash
cd apps/backend-go

# Instalar dependencias
go mod download

# Ejecutar con hot reload (air)
air

# Build
go build -o backend-sion
```

### Frontend

```bash
# Instalar dependencias
yarn install

# Ejecutar desarrollo
yarn dev

# Build producción
yarn build
```

### Base de Datos

```bash
# Aplicar migrations
supabase db push

# Resetear DB
supabase db reset
```

---

## 9. Tests

### Backend

- Tests unitarios en Go con estándar `testing`
- Ubicación: junto a cada archivo `_test.go`

### Frontend

- Tests con Vitest y React Testing Library
- Ubicación: `src/__tests__/`

---

## 10. Pendientes y Known Issues

### Pendientes de Implementación

1. **Migrar PersonalDashboard.tsx** — Actualmente usa mocks, debe usar backend real
2. **Verificar training_modules y user_training_progress** — ¿Están implementados?
3. **Verificar tabla notifications** — ¿Existe o es necesario?
4. **Dashboard multi-módulo por rol** — El dashboard debe mostrar datos de TODOS los módulos activos (discipulado, zonas, eventos, reportes, etc.) según el rol del usuario

### Known Issues

- El módulo "events" y "reports" están mencionados en código pero el análisis está incompleto
- Algunos documentos en `docs/` pueden estar desactualizados

---

## 11. Dashboard Multi-Módulo — Requerimiento Clave

### 11.1 Problema Actual

El dashboard actual **solo muestra datos del módulo Discipulado**. Está diseñado para un sistema mono-módulo, no para un ERP multi-módulo.

### 11.2 Requerimiento

El dashboard debe ser **dinámico** y mostrar:

- **Widgets de cada módulo activo**: Para cada módulo habilitado (discipulado, zonas, eventos, reportes), mostrar un widget relevante
- **Según el rol del usuario**: Un pastor verá diferente a un líder, y diferente a un staff administrativo
- **No abruma**: Solo mostrar lo relevante para el rol específico

### 11.3 Arquitectura Propuesta

```
Dashboard Dinámico
├── Cargar módulos activos del sistema
├── Cargar permisos/rol del usuario
├── Por cada módulo activo:
│   └── Si el usuario tiene acceso:
│       └── Renderizar widget del módulo
└──Mostrar widgets relevantes solo
```

### 11.4 Módulos Actuales y Potentiales

| Módulo          | Widget sugerida para Dashboard              |
| --------------- | ------------------------------------------- |
| **Discipulado** | Métricas de grupos, asistencia, crecimiento |
| **Zonas**       | Mapa de zonas, grupos por zona              |
| **Eventos**     | Próximos eventos, asistencia                |
| **Reportes**    | Reportes pendientes de aprobar              |
| **Usuarios**    | Nuevos miembros, estados                    |
| **Finanzas**    | (futuro) state financiero                   |

### 11.5 Pendiente Detallado

- [ ] Definir estructura de "Widget" genérico para módulos
- [ ] Crear endpoint que devuelva módulos ativos + permisos del usuario
- [ ] Modificar frontend para renderizar dinámicamente según módulos activos
- [ ] Agregar widgets para cada módulo existente (o crear skip si no hay datos aún)
- [ ] Definir qué ve cada rol en cada módulo

**Nota**: Este es un requerimiento crítico para la evolución del sistema hacia un ERP real.

---

## 13. Dashboard de Discipulado — Pastoral y Otros

### 13.1 Estructura de Dashboards por Nivel

El sistema tiene dashboards específicos por nivel jerárquico en el módulo de discipulado:

| Nivel | Rol                 | Dashboard                          | Ubicación       |
| ----- | ------------------- | ---------------------------------- | --------------- |
| 5     | Pastor              | `PastoralDashboard.tsx`            | ✅ Implementado |
| 4     | Coordinador         | `CoordinatorDashboard.tsx`         | ✅ Implementado |
| 3     | Supervisor General  | `GeneralSupervisorDashboard.tsx`   | ✅ Implementado |
| 2     | Supervisor Auxiliar | `AuxiliarySupervisorDashboard.tsx` | ✅ Implementado |
| 1     | Líder               | `LeaderDashboard.tsx`              | ✅ Implementado |

### 13.2 pastoralDashboard — Tabs y Fuentes de Datos

El `PastoralDashboard` tiene 5 tabs, cada unoconectado a endpoints específicos:

| Tab                   | Usa estos datos                | Endpoint del Backend                                                                                    | Tabla en DB                                            |
| --------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Vista General**     | weeklyTrends, zoneStats, stats | `/discipleship/weekly-trends`, `/discipleship/analytics/zones`, `/discipleship/dashboard-stats?level=5` | `discipleship_metrics`, `discipleship_groups`, `zones` |
| **Estratégico**       | goals                          | `/discipleship/goals`                                                                                   | `discipleship_goals`                                   |
| **Aprobaciones**      | pendingReports                 | `/discipleship/reports?status=submitted`                                                                | `discipleship_reports`                                 |
| **Alertas**           | alerts                         | `/discipleship/alerts?resolved=false`                                                                   | `discipleship_alerts`                                  |
| **Salud del Sistema** | stats varios                   | `/discipleship/dashboard-stats`                                                                         | Varias                                                 |

### 13.3 Hook que Carga los Datos

Todos los dashboards de discipulado usan el hook `useDiscipleshipData`:

```typescript
// src/hooks/useDiscipleshipData.ts
const { loading, stats, zoneStats, weeklyTrends, goals, alerts, pendingReports, refetch } =
  useDiscipleshipData({ level: 5 }); // nivel 5 = Pastor
```

El hook determina qué datos cargar según el nivel del usuario.

### 13.4 Endpoints del Backend Go

| Endpoint                                            | Retorna               | Tabla(s) Involved                             |
| --------------------------------------------------- | --------------------- | --------------------------------------------- |
| `GET /api/v1/discipleship/dashboard-stats?level=X`  | Stats según nivel     | `discipleship_groups`, `discipleship_metrics` |
| `GET /api/v1/discipleship/weekly-trends?weeks=N`    | Tendencias por semana | `discipleship_metrics`                        |
| `GET /api/v1/discipleship/analytics/zones`          | Stats por zona        | `discipleship_groups`, `zones`                |
| `GET /api/v1/discipleship/goals`                    | Objetivos             | `discipleship_goals`                          |
| `GET /api/v1/discipleship/reports?status=submitted` | Reportes pendientes   | `discipleship_reports`                        |
| `GET /api/v1/discipleship/alerts?resolved=false`    | Alertas activas       | `discipleship_alerts`                         |

### 13.5 Tablas de la Base de Datos

| Tabla                  | Uso                    | Estado Actual        |
| ---------------------- | ---------------------- | -------------------- |
| `discipleship_groups`  | Grupos de células      | ✅ Existe            |
| `discipleship_metrics` | Métricas semanales     | ✅ Tiene 6 registros |
| `discipleship_goals`   | Objetivos estratégicos | ⚠️ Vacía o sin datos |
| `discipleship_reports` | Reportes por nivel     | ⚠️ Vacía o sin datos |
| `discipleship_alerts`  | Alertas del sistema    | ⚠️ Vacía o sin datos |
| `zones`                | Zonas geográficas      | ✅ Existe            |

### 13.6 Por qué Parece "Mockeado"

El dashboard **NO está mockeado**. El código está bien conectado al backend. Si las gráficas o datos aparecen en 0 o muestran "No hay datos", es porque:

1. Las tablas de la base de datos están vacías
2. No se han creado registros de prueba

Para verificar:

```sql
-- Verificar datos en cada tabla
SELECT COUNT(*) FROM discipleship_groups;
SELECT COUNT(*) FROM discipleship_metrics;  -- Tiene 6 registros
SELECT COUNT(*) FROM discipleship_goals;
SELECT COUNT(*) FROM discipleship_reports WHERE status = 'submitted';
SELECT COUNT(*) FROM discipleship_alerts WHERE resolved = false;
```

### 13.7 Cómo Agregar Datos de Prueba

Los datos se pueden agregar desde:

1. **La UI del sistema** — Crear grupos, objetivos, reportes desde los formularios
2. **Seed de Supabase** — En `supabase/seed.sql` hay datos de ejemplo
3. **Directamente en SQL** — Insertando registros en las tablas

### 13.8 Recomendación

El dashboard está **totalmente funcional** a nivel de código. Solo falta populación de datos en:

- `discipleship_goals`
- `discipleship_reports`
- `discipleship_alerts`

Crear algunos objetivos y reportes de prueba para ver el dashboard completo en acción.

---

## 12. Especificación de Widgets para Dashboard Multi-Módulo

### 12.1 Interfaz de Widget

Cada-widget-debe-tener-esta-estructura:

```typescript
interface DashboardWidget {
  module: string; // 'discipulado' | 'zonas' | 'eventos' | 'reportes' | 'usuarios'
  title: string; // Título visible del widget
  icon: string; // Icono (lucide-react)
  roles: string[]; // Roles que pueden ver este widget
  priority: number; // Orden de visualización (1 = arriba)
  component: string; // Componente React a renderizar
  dataEndpoint: string; // Endpoint del backend
}
```

### 12.2 Widgets por Módulo

| Módulo          | Widget Title            | Roles                     | Priority | Endpoint                         | Notas                           |
| --------------- | ----------------------- | ------------------------- | -------- | -------------------------------- | ------------------------------- |
| **discipulado** | Métricas de Discipulado | admin, pastor, staff      | 1        | `/api/v1/discipleship/analytics` | Grupos, asistencia, crecimiento |
| **zonas**       | Vista de Zonas          | admin, pastor             | 2        | `/api/v1/zones`                  | Mapa y stats de zonas           |
| **eventos**     | Próximos Eventos        | todos                     | 3        | `/api/v1/events`                 | Lista de eventos                |
| **reportes**    | Reportes Pendientes     | admin, pastor, supervisor | 4        | `/api/v1/discipleship/reports`   | Reportes por aprobar            |
| **usuarios**    | Usuarios Recientes      | admin, pastor, staff      | 5        | `/api/v1/users`                  | Últimos registrados             |

### 12.3 Estructura de Renderizado

```tsx
// Pseudocódigo del DashboardHome
const DashboardHome = () => {
  const { installedModules, currentUserRole } = useDashboardStats();

  // Filtrar widgets según: módulo activo + rol del usuario
  const activeWidgets = WIDGETS.filter(
    widget => installedModules.includes(widget.module) && widget.roles.includes(user.role)
  ).sort((a, b) => a.priority - b.priority);

  return (
    <div className="grid...">
      {activeWidgets.map(widget => (
        <WidgetRenderer key={widget.module} widget={widget} />
      ))}
    </div>
  );
};
```

### 12.4 Registro de Widgets (Frontend)

Ubicación propuesta: `src/config/dashboard-widgets.ts`

```typescript
export const DASHBOARD_WIDGETS: DashboardWidget[] = [
  {
    module: 'discipulado',
    title: 'Métricas de Discipulado',
    icon: 'Users',
    roles: ['admin', 'pastor', 'staff'],
    priority: 1,
    component: 'DiscipleshipWidget',
    dataEndpoint: '/api/v1/discipleship/analytics',
  },
  {
    module: 'zonas',
    title: 'Distribución por Zonas',
    icon: 'MapPin',
    roles: ['admin', 'pastor'],
    priority: 2,
    component: 'ZonesWidget',
    dataEndpoint: '/api/v1/zones',
  },
  {
    module: 'eventos',
    title: 'Próximos Eventos',
    icon: 'Calendar',
    roles: ['admin', 'pastor', 'staff', 'usuario'],
    priority: 3,
    component: 'EventsWidget',
    dataEndpoint: '/api/v1/events',
  },
  // ... más widgets
];
```

### 12.5 Ejemplo de Componente de Widget

```typescript
// src/components/dashboard/widgets/DiscipleshipWidget.tsx
interface DiscipleshipWidgetProps {
  data: DiscipleshipDashboardStats;
}

export const DiscipleshipWidget = ({ data }: DiscipleshipWidgetProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Métricas de Discipulado</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <StatItem label="Grupos" value={data.totalGroups} />
          <StatItem label="Miembros" value={data.totalMembers} />
          <StatItem label="Asistencia Promedio" value={data.avgAttendance} />
          <StatItem label="Crecimiento" value={data.monthlyGrowth} />
        </div>
      </CardContent>
    </Card>
  );
};
```

### 12.6 Tareas de Implementación

- [ ] **Crear archivo de configuración** `src/config/dashboard-widgets.ts`
- [ ] **Crear componentes base** para cada widget en `src/components/dashboard/widgets/`
- [ ] **Modificar `DashboardHome.tsx`** para usar el sistema de widgets dinámicos
- [ ] **Agregar endpoints** en Go para cada módulo si no existen
- [ ] **Actualizar tipos** en TypeScript

### 12.7 Reglas de Expansión

Cuando se agrega un **nuevo módulo**:

1. Agregar widget en `src/config/dashboard-widgets.ts`
2. Crear componente en `src/components/dashboard/widgets/{Module}Widget.tsx`
3. Agregar endpoint en backend Go
4. El dashboard automáticamente lo renderiza si:
   - El módulo está activo (`installedModules.includes(module)`)
   - El usuario tiene el rol permitido (`widget.roles.includes(user.role)`)

---

## 11. Referencias Rápidas

| Recurso      | Ubicación                             |
| ------------ | ------------------------------------- |
| Backend main | `apps/backend-go/main.go`             |
| Rutas API    | `apps/backend-go/routes/routes.go`    |
| DB Schema    | `docs/ESQUEMA_BASE_DATOS_COMPLETO.md` |
| Discipulado  | `docs/DISCIPLESHIP_MODULE.md`         |
| Permisos     | `src/lib/permissions.ts`              |

---

_Documento mantenido automáticamente. Actualizar al agregar/modificar módulos._
