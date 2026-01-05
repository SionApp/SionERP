# Flujo de Datos: Reportes → Métricas → Estadísticas

## Resumen Ejecutivo

**Sí, las estadísticas del dashboard se basan en los reportes semanales que los líderes llenan**, pero hay una estructura específica:

1. **Métricas Semanales** (`discipleship_metrics`) - Los líderes reportan datos cada semana
2. **Estadísticas Agregadas** - Se calculan a partir de esas métricas
3. **Objetivos Estratégicos** (`discipleship_goals`) - Son metas independientes
4. **Reportes Consolidados** (`discipleship_reports`) - Son diferentes, son reportes periódicos de supervisores

---

## 🔄 Flujo Completo de Datos

```
┌─────────────────────────────────────────────────────────────┐
│  1. LÍDER LLENA MÉTRICAS SEMANALES                         │
│     (Formulario semanal de su grupo)                        │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  2. TABLA: discipleship_metrics                             │
│     - attendance (asistencia)                               │
│     - new_visitors (visitantes nuevos)                      │
│     - returning_visitors (visitantes que regresan)          │
│     - conversions (conversiones)                            │
│     - baptisms (bautismos)                                  │
│     - spiritual_temperature (temperatura espiritual 1-10)   │
│     - testimonies_count (testimonios)                       │
│     - prayer_requests (peticiones de oración)               │
│     - offering_amount (ofrenda)                             │
│     - leader_notes (notas del líder)                        │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  3. AGREGACIÓN Y CÁLCULO DE ESTADÍSTICAS                   │
│     (Backend Go agrega todas las métricas)                  │
└───────────────────┬─────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┬───────────┬───────────┐
        │           │           │           │           │
        ▼           ▼           ▼           ▼           ▼
┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
│ Tendencias│ │ Dashboard │ │ Analytics │ │ Zone Stats│ │ Goals     │
│ Semanales │ │   Stats   │ │           │ │           │ │           │
└───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘
```

---

## 📊 1. Métricas Semanales (Fuente Principal)

### Tabla: `discipleship_metrics`

**Quién las llena**: Los líderes de grupo (Nivel 1) cada semana

**Endpoint**: `POST /api/v1/discipleship/metrics`

**Handler**: `handlers/discipleship_reports.go` → `CreateMetrics`

**Datos que capturan**:
```sql
CREATE TABLE discipleship_metrics (
  id UUID PRIMARY KEY,
  group_id UUID REFERENCES discipleship_groups(id),
  week_date DATE,
  attendance INTEGER,              -- Asistencia del grupo
  new_visitors INTEGER,            -- Visitantes nuevos
  returning_visitors INTEGER,      -- Visitantes que regresan
  conversions INTEGER,             -- Conversiones
  baptisms INTEGER,                -- Bautismos
  spiritual_temperature INTEGER,   -- 1-10
  testimonies_count INTEGER,       -- Testimonios
  prayer_requests INTEGER,         -- Peticiones de oración
  offering_amount DECIMAL,         -- Ofrenda
  leader_notes TEXT,               -- Notas del líder
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

---

## 📈 2. Estadísticas Calculadas desde Métricas

### A. Tendencias Semanales (`weeklyTrends`)

**Endpoint**: `GET /api/v1/discipleship/weekly-trends?weeks=24`

**Handler**: `handlers/discipleship.go` → `GetWeeklyTrends`

**Cómo se calculan**:
```sql
SELECT 
  DATE_TRUNC('week', week_date)::date as week_start,
  SUM(attendance) as total_attendance,           -- Suma todas las asistencias
  SUM(new_visitors) as total_visitors,           -- Suma todos los visitantes
  SUM(conversions) as total_conversions,         -- Suma todas las conversiones
  AVG(spiritual_temperature) as avg_spiritual_temp,  -- Promedio de salud espiritual
  COUNT(DISTINCT group_id) as groups_reporting   -- Cuántos grupos reportaron
FROM discipleship_metrics
WHERE week_date >= CURRENT_DATE - ($1 || ' weeks')::interval
GROUP BY DATE_TRUNC('week', week_date)
ORDER BY week_start ASC
```

**Uso en Dashboard**: Gráfico de líneas "Análisis Integral de Crecimiento"

---

### B. Estadísticas del Dashboard (`dashboard-stats`)

**Endpoint**: `GET /api/v1/discipleship/dashboard-stats?level=5`

**Handler**: `handlers/discipleship.go` → `GetDashboardStatsByLevel`

**Cálculos desde métricas**:

1. **Asistencia Promedio** (`average_attendance`):
```sql
SELECT COALESCE(AVG(attendance), 0)
FROM discipleship_metrics 
WHERE week_date >= CURRENT_DATE - INTERVAL '28 days'
```

2. **Salud Espiritual** (`spiritual_health`):
```sql
SELECT COALESCE(AVG(spiritual_temperature), 0)
FROM discipleship_metrics 
WHERE week_date >= CURRENT_DATE - INTERVAL '28 days'
```

3. **Tasa de Crecimiento** (`growth_rate`):
```sql
-- Promedio últimos 30 días
SELECT COALESCE(AVG(attendance), 0)
FROM discipleship_metrics
WHERE week_date >= CURRENT_DATE - INTERVAL '30 days'

-- Promedio 30-60 días atrás
SELECT COALESCE(AVG(attendance), 0)
FROM discipleship_metrics
WHERE week_date BETWEEN CURRENT_DATE - INTERVAL '60 days' 
  AND CURRENT_DATE - INTERVAL '30 days'

-- Cálculo: ((actual - anterior) / anterior) * 100
```

**Otras estadísticas** (no vienen de métricas, sino de grupos):
- `total_groups` → COUNT de `discipleship_groups` con status='active'
- `total_members` → SUM de `member_count` de grupos activos
- `active_leaders` → COUNT DISTINCT de `leader_id`
- `multiplications` → COUNT de `cell_multiplication_tracking`

---

### C. Analytics por Zona (`analytics/zones`)

**Endpoint**: `GET /api/v1/discipleship/analytics/zones`

**Handler**: `handlers/discipleship.go` → `GetZoneStats`

**Cómo se calculan**:
```sql
SELECT 
  z.name as zone_name,
  z.id as zone_id,
  COUNT(DISTINCT g.id) as total_groups,
  COALESCE(SUM(g.member_count), 0) as total_members,
  COALESCE(AVG(m.attendance), 0) as avg_attendance,
  -- Cálculos de crecimiento y salud desde métricas
  COALESCE(AVG(m.spiritual_temperature), 0) as health_index
FROM zones z
LEFT JOIN discipleship_groups g ON g.zone_id = z.id AND g.status = 'active'
LEFT JOIN discipleship_metrics m ON m.group_id = g.id
WHERE z.is_active = true
GROUP BY z.id, z.name
```

**Uso en Dashboard**: Gráfico de barras "Distribución por Zonas"

---

## 🎯 3. Objetivos Estratégicos (Goals)

### Tabla: `discipleship_goals`

**IMPORTANTE**: Los objetivos NO se calculan automáticamente desde las métricas. Son metas que se definen manualmente.

**Endpoint**: `GET /api/v1/discipleship/goals`

**Handler**: `handlers/discipleship.go` → `GetGoals`

**Quién los crea**: Supervisores (Nivel 4+) o Pastores (Nivel 5)

**Estructura**:
```sql
CREATE TABLE discipleship_goals (
  id UUID PRIMARY KEY,
  goal_type TEXT,              -- 'growth', 'attendance', 'conversions', etc.
  description TEXT,            -- Descripción del objetivo
  target_metric TEXT,          -- Métrica objetivo
  target_value INTEGER,        -- Valor objetivo (ej: 100 personas)
  current_value INTEGER,       -- Valor actual (se actualiza manualmente o por triggers)
  progress_percentage DECIMAL, -- (current_value / target_value) * 100
  deadline DATE,              -- Fecha límite
  status TEXT,                -- 'active', 'completed', 'failed'
  supervisor_id UUID,
  zone_id UUID,               -- Puede estar asociado a una zona
  zone_name TEXT              -- Para compatibilidad
);
```

**Progreso de Goals**:
- El `current_value` puede actualizarse:
  - **Manualmente** por supervisores
  - **Automáticamente** por triggers que consultan métricas
  - Por **cálculos periódicos** que agregan datos de métricas

**Uso en Dashboard**: Pestaña "Estratégico" con barras de progreso

---

## 📋 4. Reportes Consolidados (Diferentes de Métricas)

### Tabla: `discipleship_reports`

**IMPORTANTE**: Estos son DIFERENTES a las métricas semanales.

**Quién los crea**: Supervisores (Nivel 2-5) periódicamente (semanal, quincenal, mensual)

**Endpoint**: `POST /api/v1/discipleship/reports`

**Handler**: `handlers/discipleship_reports.go` → `CreateReport`

**Estructura**:
```sql
CREATE TABLE discipleship_reports (
  id UUID PRIMARY KEY,
  reporter_id UUID,           -- El supervisor que reporta
  supervisor_id UUID,         -- Su supervisor
  report_type TEXT,           -- 'weekly', 'biweekly', 'monthly'
  report_level INTEGER,       -- Nivel jerárquico (2-5)
  period_start DATE,
  period_end DATE,
  report_data JSONB,          -- Datos estructurados del reporte
  status TEXT,                -- 'draft', 'submitted', 'approved', 'rejected'
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ
);
```

**Diferencia clave**:
- **Métricas** = Datos semanales de cada grupo (lo que llenan los líderes)
- **Reportes** = Consolidados periódicos de supervisores (pueden incluir análisis, observaciones, etc.)

---

## 🔍 Mapeo: Dashboard → Fuente de Datos

### Dashboard Pastoral - Fuentes de Datos

| **Sección del Dashboard** | **Fuente Principal** | **Tabla/Endpoint** |
|---------------------------|----------------------|-------------------|
| **Tendencias Semanales** (Gráfico de líneas) | Métricas agregadas | `discipleship_metrics` → `/weekly-trends` |
| **Asistencia Promedio** | Promedio de métricas | `discipleship_metrics` (últimas 4 semanas) |
| **Salud Espiritual** | Promedio de métricas | `discipleship_metrics.spiritual_temperature` |
| **Total Grupos** | Grupos activos | `discipleship_groups` (COUNT) |
| **Total Miembros** | Conteo de miembros | `discipleship_groups.member_count` (SUM) |
| **Multiplicaciones** | Tracking de multiplicaciones | `cell_multiplication_tracking` |
| **Distribución por Zonas** | Métricas + Grupos | `discipleship_metrics` + `discipleship_groups` JOIN `zones` |
| **Objetivos Estratégicos** | Goals manuales | `discipleship_goals` |
| **Alertas** | Alertas del sistema | `discipleship_alerts` |
| **Reportes Pendientes** | Reportes consolidados | `discipleship_reports` (status='submitted') |

---

## 📝 Resumen Final

### ✅ Lo que SÍ viene de los reportes semanales (métricas):

1. **Tendencias semanales** → Agregación de todas las métricas
2. **Asistencia promedio** → Promedio de `attendance` en métricas
3. **Salud espiritual** → Promedio de `spiritual_temperature`
4. **Tasa de crecimiento** → Comparación de promedios de asistencia
5. **Estadísticas por zona** → Agregación de métricas por zona

### ❌ Lo que NO viene directamente de métricas:

1. **Total de grupos** → De `discipleship_groups`
2. **Total de miembros** → De `discipleship_groups.member_count`
3. **Multiplicaciones** → De `cell_multiplication_tracking`
4. **Objetivos** → Son metas definidas manualmente (aunque pueden usar métricas para calcular progreso)

### 🔄 Proceso Completo:

1. **Líder** llena métricas semanales → `discipleship_metrics`
2. **Backend** agrega métricas → Calcula estadísticas
3. **Dashboard** muestra estadísticas agregadas
4. **Supervisores** pueden crear objetivos estratégicos basados en esas estadísticas
5. **Supervisores** también crean reportes consolidados periódicos (diferentes de métricas)

---

## 🔧 Endpoints Clave

### Para Líderes (Llenar Métricas):
- `POST /api/v1/discipleship/metrics` → Crear/Actualizar métricas semanales

### Para Dashboards (Ver Estadísticas):
- `GET /api/v1/discipleship/weekly-trends?weeks=24` → Tendencias desde métricas
- `GET /api/v1/discipleship/dashboard-stats?level=5` → Estadísticas agregadas
- `GET /api/v1/discipleship/analytics/zones` → Estadísticas por zona
- `GET /api/v1/discipleship/goals` → Objetivos estratégicos

### Para Supervisores (Reportes):
- `POST /api/v1/discipleship/reports` → Crear reporte consolidado
- `GET /api/v1/discipleship/reports?status=submitted` → Ver reportes pendientes

