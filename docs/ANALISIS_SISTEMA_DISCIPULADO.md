# 📊 Análisis del Sistema de Discipulado - Métricas y Dashboards

## 🎯 Visión General del Sistema

El sistema de discipulado está estructurado en **5 niveles jerárquicos**, cada uno con su propio dashboard y necesidades de datos específicas:

```
Nivel 5: Pastor (PastoralDashboard)
  ↓
Nivel 4: Supervisor General (GeneralSupervisorDashboard)
  ↓
Nivel 3: Coordinador (CoordinatorDashboard)
  ↓
Nivel 2: Supervisor Auxiliar (AuxiliarySupervisorDashboard)
  ↓
Nivel 1: Líder de Grupo (LeaderDashboard)
```

---

## 📈 Tipos de Datos y Endpoints

### 1. **Métricas Individuales** (`/discipleship/metrics`)
**Servicio:** `DiscipleshipService.getMetrics()`

**Propósito:** Obtener métricas **detalladas e individuales** de grupos específicos

**Parámetros:**
- `group_id` (UUID) - Filtro opcional para un grupo específico
- `date_from` - Filtro por fecha inicial
- `date_to` - Filtro por fecha final

**Devuelve:** Array de métricas individuales con:
- `id`, `group_id`, `week_date`
- `attendance`, `new_visitors`, `returning_visitors`
- `conversions`, `baptisms`
- `spiritual_temperature`
- `testimonies_count`, `prayer_requests`
- `offering_amount`, `leader_notes`
- `group_name` (del JOIN)

**Uso:**
- ✅ Cuando necesitas métricas específicas de un grupo
- ✅ Para ver el detalle de cada reporte semanal
- ✅ Para filtrar por fechas específicas
- ✅ Para crear/editar métricas individuales

**Ejemplo de uso:**
```typescript
// Obtener todas las métricas de un grupo
const metrics = await DiscipleshipService.getMetrics({ 
  group_id: 'uuid-del-grupo' 
});

// Obtener métricas de un rango de fechas
const metrics = await DiscipleshipService.getMetrics({ 
  date_from: '2024-01-01',
  date_to: '2024-12-31'
});
```

---

### 2. **Tendencias Semanales Agregadas** (`/discipleship/weekly-trends`)
**Servicio:** `DiscipleshipAnalyticsService.getWeeklyTrends()`

**Propósito:** Obtener **tendencias agregadas** por semana para visualización en gráficos

**Parámetros:**
- `weeks` (número) - Número de semanas hacia atrás (default: 12)
- `groupId` (UUID, opcional) - Si se especifica, agrupa métricas de ese grupo

**Devuelve:** Array de tendencias semanales agregadas con:
- `week_start` - Fecha de inicio de la semana
- `total_attendance` - Suma de asistencia de todos los grupos
- `total_visitors` - Suma de visitantes
- `total_conversions` - Suma de conversiones
- `avg_spiritual_temp` - Promedio de temperatura espiritual
- `groups_reporting` - Cantidad de grupos que reportaron esa semana

**Uso:**
- ✅ Para gráficos de tendencias en dashboards
- ✅ Para ver evolución del ministerio en el tiempo
- ✅ Para análisis comparativo semana a semana
- ✅ Para visualizar crecimiento/declive

**Ejemplo de uso:**
```typescript
// Tendencias generales de las últimas 24 semanas
const trends = await DiscipleshipAnalyticsService.getWeeklyTrends(24);

// Tendencias de un grupo específico (últimas 12 semanas)
const groupTrends = await DiscipleshipAnalyticsService.getWeeklyTrends(12, 'uuid-del-grupo');
```

---

## 🎨 Uso en Cada Dashboard

### **Nivel 1: LeaderDashboard** (Líder de Grupo)
**Enfoque:** Gestión de su propio grupo

**Datos que usa:**
- ✅ `getLeaderGroupStats()` - Estadísticas de su grupo
- ✅ `createMetrics()` - Crear reporte semanal de su grupo
- ❌ NO usa `getWeeklyTrends()` - No necesita tendencias agregadas
- ❌ NO usa `getMetrics()` directamente - Usa el método específico de líder

**Flujo:**
1. Líder carga estadísticas de su grupo
2. Líder completa formulario de reporte semanal
3. Se crea una métrica individual con `createMetrics()`
4. Esa métrica se agrega a las tendencias generales

---

### **Nivel 2: AuxiliarySupervisorDashboard** (Supervisor Auxiliar)
**Enfoque:** Supervisión de 3-5 grupos

**Datos que usa:**
- ✅ `getDashboardStatsByLevel(2)` - Estadísticas de sus grupos
- ✅ `getGroups({ supervisor_id })` - Lista de grupos que supervisa
- ❌ NO usa `getWeeklyTrends()` - No muestra gráficos de tendencias
- ❌ NO usa `getMetrics()` directamente

**Flujo:**
1. Supervisor ve lista de grupos bajo su supervisión
2. Ve estadísticas agregadas de esos grupos
3. Genera reportes quincenales para su supervisor

---

### **Nivel 3: CoordinatorDashboard** (Coordinador)
**Enfoque:** Coordinación de zona/territorio

**Datos que usa:**
- ✅ `getDashboardStatsByLevel(4)` - Estadísticas de su nivel
- ✅ `getZoneStats()` - Estadísticas por zona
- ✅ `getWeeklyTrends(12)` - **Tendencias de las últimas 12 semanas** 📊
- ✅ `getGoals()` - Objetivos estratégicos

**Flujo:**
1. Coordinador ve tendencias semanales en gráficos
2. Analiza estadísticas por zona
3. Genera reportes trimestrales

**Gráficos que muestra:**
- Línea de tiempo de asistencia, conversiones, grupos activos
- Distribución por zonas

---

### **Nivel 4: GeneralSupervisorDashboard** (Supervisor General)
**Enfoque:** Supervisión de múltiples coordinadores

**Datos que usa:**
- ✅ `getDashboardStatsByLevel(3)` - Estadísticas de su nivel
- ✅ `getSupervisorSubordinates()` - Lista de subordinados
- ✅ `getWeeklyTrends(12)` - **Tendencias de las últimas 12 semanas** 📊

**Flujo:**
1. Supervisor General ve tendencias agregadas
2. Monitorea rendimiento de coordinadores
3. Genera reportes mensuales

**Gráficos que muestra:**
- Área chart de asistencia, visitantes, grupos

---

### **Nivel 5: PastoralDashboard** (Pastor)
**Enfoque:** Vista ejecutiva de todo el ministerio

**Datos que usa:**
- ✅ `getDashboardStatsByLevel(5)` - Estadísticas generales
- ✅ `getZoneStats()` - Estadísticas por zona
- ✅ `getWeeklyTrends(24)` - **Tendencias de las últimas 24 semanas** 📊
- ✅ `getGoals()` - Objetivos estratégicos
- ✅ `getAlerts()` - Alertas del sistema
- ✅ `getReports()` - Reportes pendientes de aprobación

**Flujo:**
1. Pastor ve panorama completo del ministerio
2. Analiza tendencias a largo plazo (24 semanas)
3. Aprueba reportes de niveles inferiores
4. Resuelve alertas críticas

**Gráficos que muestra:**
- Línea de tiempo de 24 semanas (asistencia, conversiones, grupos)
- Distribución por zonas (barras)
- Indicadores clave de rendimiento

---

## 🔄 Flujo de Datos Completo

```
┌─────────────────────────────────────────────────────────────┐
│                    LÍDER (Nivel 1)                          │
│  Crea métrica individual → createMetrics()                  │
│  ↓                                                           │
│  Se guarda en: discipleship_metrics                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│         SUPERVISORES (Niveles 2-4)                          │
│  Consultan: getGroups() → Lista de grupos                  │
│  Consultan: getDashboardStatsByLevel() → Estadísticas       │
│  Consultan: getWeeklyTrends() → Tendencias agregadas 📊     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              PASTOR (Nivel 5)                               │
│  Consulta: getWeeklyTrends(24) → Tendencias largas 📊      │
│  Consulta: getZoneStats() → Análisis por zona               │
│  Consulta: getGoals() → Objetivos estratégicos              │
│  Aprueba: getReports() → Reportes pendientes               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Resumen: ¿Cuándo usar cada endpoint?

| Necesidad | Endpoint | Servicio | Ejemplo |
|-----------|----------|----------|---------|
| **Métricas individuales de un grupo** | `/metrics?group_id=uuid` | `DiscipleshipService.getMetrics()` | Ver todos los reportes de "Célula Esperanza" |
| **Métricas de un rango de fechas** | `/metrics?date_from=X&date_to=Y` | `DiscipleshipService.getMetrics()` | Reportes de enero a marzo |
| **Tendencias agregadas para gráficos** | `/weekly-trends?weeks=24` | `DiscipleshipAnalyticsService.getWeeklyTrends()` | Gráfico de crecimiento en dashboard |
| **Tendencias de un grupo específico** | `/weekly-trends?weeks=12` + `groupId` | `DiscipleshipAnalyticsService.getWeeklyTrends(12, uuid)` | Evolución de un grupo en particular |
| **Crear nuevo reporte semanal** | `POST /metrics` | `DiscipleshipService.createMetrics()` | Líder envía su reporte |

---

## 🎯 Conclusión

**`/metrics`** = Datos **granulares e individuales** (cada reporte semanal de cada grupo)
- Para: Detalle, filtros específicos, CRUD de métricas

**`/weekly-trends`** = Datos **agregados y procesados** (sumas y promedios por semana)
- Para: Visualización, análisis de tendencias, dashboards

**La confusión anterior:**
- `getWeeklyTrends(24)` estaba llamando incorrectamente a `/metrics?group_id=24`
- El número 24 es semanas, no un UUID de grupo
- Ahora usa correctamente `/weekly-trends?weeks=24`

**El sistema está bien diseñado:**
- ✅ Separación clara entre datos individuales y agregados
- ✅ Cada nivel ve lo que necesita según su responsabilidad
- ✅ Los datos fluyen de abajo hacia arriba (líder → pastor)

