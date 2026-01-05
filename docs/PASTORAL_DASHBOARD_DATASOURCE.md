# Fuentes de Datos del Dashboard Pastoral

## Resumen

El componente `PastoralDashboard.tsx` (líneas 244-630) se nutre principalmente del hook `useDiscipleshipData({ level: 5 })`, que carga datos desde múltiples endpoints del backend Go.

## ⚠️ IMPORTANTE: Fuente Original de Datos

**Las estadísticas se basan en los reportes semanales que los líderes llenan**. Los líderes reportan métricas cada semana en la tabla `discipleship_metrics`, y el backend agrega esos datos para calcular todas las estadísticas que ves en el dashboard.

📖 **Ver documento completo**: [`FLUJO_DATOS_REPORTES_ESTADISTICAS.md`](./FLUJO_DATOS_REPORTES_ESTADISTICAS.md)

## Estructura de Datos

### Hook Principal

```typescript
const { loading, stats, zoneStats, weeklyTrends, goals, alerts, pendingReports, refetch } =
  useDiscipleshipData({ level: 5 });
```

## Endpoints y Fuentes de Datos

### 1. **Estadísticas Generales (`stats`)**

**Endpoint**: `GET /api/v1/discipleship/dashboard-stats?level=5`

**Servicio**: `DiscipleshipAnalyticsService.getDashboardStatsByLevel(5)`

**Campos utilizados**:

- `stats.total_groups` → Total de grupos activos (línea 150)
- `stats.total_members` → Total de miembros (línea 161)
- `stats.multiplications` → Multiplicaciones este año (línea 172, 347, 624)
- `stats.spiritual_health` → Índice de salud espiritual (línea 183, 567, 572)
- `stats.average_attendance` → Asistencia promedio (línea 335, 555)
- `stats.active_leaders` → Líderes activos (línea 341, 620)
- `stats.pending_reports` → Reportes pendientes (línea 211-217)
- `stats.pending_alerts` → Alertas pendientes (línea 225-231)

**Backend Handler**: `handlers/discipleship.go` → `GetDashboardStatsByLevel`

---

### 2. **Tendencias Semanales (`weeklyTrends`)**

**Endpoint**: `GET /api/v1/discipleship/weekly-trends?weeks=24`

**Servicio**: `DiscipleshipAnalyticsService.getWeeklyTrends(24)`

**Datos utilizados**:

- `weeklyTrends` → Array con datos semanales para el gráfico de líneas (líneas 254-287)
  - `name` → Fecha formateada
  - `miembros` → Total de asistencia (línea 266)
  - `grupos` → Grupos activos reportando (línea 274)
  - `conversiones` → Total de conversiones (línea 282)

**Backend Handler**: `handlers/discipleship.go` → `GetWeeklyTrends`

---

### 3. **Estadísticas por Zona (`zoneStats`)**

**Endpoint**: `GET /api/v1/discipleship/analytics/zones`

**Servicio**: `DiscipleshipAnalyticsService.getZoneStats()`

**Datos utilizados**:

- `zoneStats` → Array con estadísticas por zona (líneas 305-323)
  - `zone_name` → Nombre de la zona (línea 310)
  - `total_groups` → Grupos por zona (línea 313)
  - `total_members` → Miembros por zona (línea 314)
- `zoneStats.length` → Cantidad de zonas activas (líneas 354, 612)

**Backend Handler**: `handlers/discipleship.go` → `GetZoneStats`

---

### 4. **Objetivos Estratégicos (`goals`)**

**Endpoint**: `GET /api/v1/discipleship/goals`

**Servicio**: `DiscipleshipAnalyticsService.getGoals()`

**Datos utilizados** (líneas 373-428):

- `goals` → Array de objetivos
  - `goal.id` → ID del objetivo
  - `goal.description` → Descripción (línea 386)
  - `goal.status` → Estado (completed, etc.) (línea 388-396)
  - `goal.progress_percentage` → Porcentaje de progreso (línea 391, 400)
  - `goal.current_value` → Valor actual (línea 405)
  - `goal.target_value` → Valor objetivo (línea 405)
  - `goal.deadline` → Fecha límite (línea 407)

**Backend Handler**: `handlers/discipleship.go` → `GetGoals`

---

### 5. **Alertas del Sistema (`alerts`)**

**Endpoint**: `GET /api/v1/discipleship/alerts?resolved=false`

**Servicio**: `DiscipleshipService.getAlerts({ resolved: false })`

**Datos utilizados** (líneas 490-537):

- `alerts` → Array de alertas (limitado a 10)
  - `alert.id` → ID de la alerta
  - `alert.title` → Título (línea 513)
  - `alert.message` → Mensaje (línea 514)
  - `alert.priority` → Prioridad (1=Alta, 2=Media, 3=Baja) (líneas 505-509, 521-523)
  - `alert.created_at` → Fecha de creación (línea 516)

**Backend Handler**: `handlers/discipleship_alerts.go` → `GetAlerts`

---

### 6. **Reportes Pendientes (`pendingReports`)**

**Endpoint**: `GET /api/v1/discipleship/reports?status=submitted`

**Servicio**: `DiscipleshipService.getReports({ status: 'submitted' })`

**Datos utilizados** (líneas 439-479):

- `pendingReports` → Array de reportes (limitado a 10)
  - `report.id` → ID del reporte
  - `report.reporter_name` → Nombre del reportero (línea 452)
  - `report.report_type` → Tipo de reporte (línea 454)
  - `report.period_end` → Fin del período (línea 454)
  - `report.submitted_at` → Fecha de envío (línea 458)

**Backend Handler**: `handlers/discipleship_reports.go` → `GetReports`

---

## Flujo de Carga de Datos

```
PastoralDashboard (level: 5)
    ↓
useDiscipleshipData({ level: 5 })
    ↓
    ├─→ DiscipleshipAnalyticsService.getDashboardStatsByLevel(5)
    │   └─→ GET /api/v1/discipleship/dashboard-stats?level=5
    │
    ├─→ DiscipleshipAnalyticsService.getWeeklyTrends(24)
    │   └─→ GET /api/v1/discipleship/weekly-trends?weeks=24
    │
    ├─→ DiscipleshipAnalyticsService.getZoneStats()
    │   └─→ GET /api/v1/discipleship/analytics/zones
    │
    ├─→ DiscipleshipAnalyticsService.getGoals()
    │   └─→ GET /api/v1/discipleship/goals
    │
    ├─→ DiscipleshipService.getAlerts({ resolved: false })
    │   └─→ GET /api/v1/discipleship/alerts?resolved=false
    │
    └─→ DiscipleshipService.getReports({ status: 'submitted' })
        └─→ GET /api/v1/discipleship/reports?status=submitted
```

## Problemas Conocidos

### Errores CORS

- Varios endpoints están fallando por problemas de CORS (ya corregido en `main.go`)

### Errores de Base de Datos

- Algunos endpoints pueden fallar si las migraciones de `zone_id` no se han ejecutado
- El endpoint `/discipleship/hierarchy` puede fallar si `discipleship_hierarchy.zone_id` no existe

### Campos Nullable

- Los campos `sql.NullString` pueden llegar como objetos `{String, Valid}` y necesitan normalización

## Archivos Relacionados

- **Frontend**:
  - `src/pages/dashboard/discipleship/PastoralDashboard.tsx` → Componente principal
  - `src/hooks/useDiscipleshipData.ts` → Hook de datos
  - `src/services/discipleship-analytics.service.ts` → Servicios de analytics
  - `src/services/discipleship.service.ts` → Servicios generales

- **Backend**:
  - `apps/backend-go/handlers/discipleship.go` → Handlers principales
  - `apps/backend-go/handlers/discipleship_alerts.go` → Handler de alertas
  - `apps/backend-go/handlers/discipleship_reports.go` → Handler de reportes
  - `apps/backend-go/routes/routes.go` → Definición de rutas

## Próximos Pasos

1. ✅ CORS ya corregido
2. ⏳ Ejecutar migraciones para agregar `zone_id` a todas las tablas
3. ⏳ Verificar que todos los endpoints funcionen correctamente
4. ⏳ Agregar manejo de errores más robusto en el frontend
