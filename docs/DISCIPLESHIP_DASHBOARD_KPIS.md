# KPIs del Dashboard de Discipulado — SionERP

**Actualizado**: Mayo 2026
**Propósito**: Documentar las tablas reales de BD, fórmulas SQL activas y flujo de datos para los indicadores clave del módulo de Discipulado.

> **NOTA CRÍTICA**: La tabla `discipleship_metrics` fue planeada pero **nunca implementada**. El backend real obtiene los KPIs desde `discipleship_attendance` y `discipleship_groups.active_members`. No crear código que asuma que `discipleship_metrics` existe.

---

## 1. Tablas de la Base de Datos (Estado Real)

### 1.1 `discipleship_groups` — Grupos Celulares
Tabla central del módulo. Los conteos de asistencia se actualizan en cascada aquí.

| Columna | Tipo | Descripción | Uso en KPIs |
|---------|------|-------------|-------------|
| `id` | UUID | ID del grupo | **Total de Grupos** |
| `group_name` | Text | Nombre del grupo | Display |
| `leader_id` | UUID | FK → `users.id` | **Líderes Activos** |
| `member_count` | Integer | Total de miembros registrados | Base para % asistencia |
| `active_members` | Integer | Actualizado automáticamente tras cada asistencia | **Miembros Activos** |
| `status` | Text | `'active'` \| `'inactive'` \| `'multiplying'` | Filtro base de todos los KPIs |
| `zone_name` | Text | Zona geográfica | Segmentación por zona |
| `zone_id` | UUID | FK → `zones.id` | Filtrado por zona |

### 1.2 `discipleship_attendance` — Asistencia
Registro de cada reunión. Fuente real para temperatura espiritual.

| Columna | Tipo | Descripción | Uso en KPIs |
|---------|------|-------------|-------------|
| `id` | UUID | ID del registro | - |
| `group_id` | UUID | FK → `discipleship_groups.id` | Filtrado por grupo |
| `user_id` | UUID | FK → `users.id` | Asistente individual |
| `meeting_date` | Date | Fecha de reunión | Filtro temporal |
| `present` | Boolean | ¿Asistió? | Conteo de presentes |
| `spiritual_temperature` | Integer (1-10) | Salud espiritual reportada | **Salud Espiritual** |
| `attendance_type` | Text | Tipo de reunión | Categorización |
| `notes` | Text | Notas del líder | - |

> **Cómo se actualiza `active_members`**: Al registrar asistencia (`POST /groups/:id/attendance` o bulk), el handler hace un `UPDATE discipleship_groups SET active_members = (SELECT COUNT(*) FROM discipleship_attendance WHERE group_id = $1 AND present = true AND meeting_date = $2)`.

### 1.3 `discipleship_hierarchy` — Jerarquía de Liderazgo
Define la posición de cada usuario en la cadena de mando del ministerio.

| Columna | Tipo | Descripción | Uso en KPIs |
|---------|------|-------------|-------------|
| `user_id` | UUID | FK → `users.id` | Identificar nivel |
| `hierarchy_level` | Integer (1-5) | 1=Líder, 2=Sup.Aux, 3=Sup.Gral, 4=Coordinador, 5=Pastoral | Filtrado de vistas |
| `supervisor_id` | UUID | FK → `users.id` | Cadena de mando |

### 1.4 `discipleship_goals` — Objetivos Estratégicos
Módulo de Goals implementado en Mayo 2026.

| Columna | Tipo | Descripción | Uso en KPIs |
|---------|------|-------------|-------------|
| `id` | UUID | ID del objetivo | - |
| `goal_type` | Text | `'attendance'` \| `'growth'` \| `'multiplication'` \| `'spiritual'` | Categoría |
| `title` | Text | Nombre del objetivo | Display |
| `description` | Text | Descripción detallada | - |
| `target_metric` | Text | Métrica a alcanzar | Auto-update reference |
| `target_value` | Numeric | Valor meta | Barra de progreso |
| `current_value` | Numeric | Valor actual (actualizable) | Progreso real |
| `deadline` | Date | Fecha límite | Estado vencido |
| `status` | Text | `'active'` \| `'completed'` \| `'closed'` \| `'extended'` | Filtros de UI |
| `priority` | Text | `'high'` \| `'medium'` \| `'low'` | Ordenamiento |
| `created_by` | UUID | FK → `users.id` | Permiso de edición |
| `zone_id` | UUID | FK → `zones.id` (nullable) | Scope geográfico |

### 1.5 `discipleship_alerts` — Alertas
Sistema de alertas manuales y automáticas.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | ID de la alerta |
| `alert_type` | Text | `'no_reports'` \| `'low_attendance'` \| `'no_leader'` \| otros |
| `title` | Text | Título de la alerta |
| `message` | Text | Descripción detallada |
| `priority` | Text | `'high'` \| `'medium'` \| `'low'` |
| `resolved` | Boolean | ¿Resuelta? |
| `related_group_id` | UUID | Grupo relacionado (nullable) |
| `related_user_id` | UUID | Usuario relacionado (nullable) |
| `zone_id` | UUID | Zona relacionada (nullable) |
| `expires_at` | Timestamp | Expiración automática (nullable) |

### 1.6 `discipleship_multiplications` — Multiplicaciones (Dashboard)
Tabla liviana para conteo rápido en el dashboard principal.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | ID |
| `multiplication_date` | Date | Fecha del evento |

### 1.7 `cell_multiplication_tracking` — Historial Detallado de Multiplicaciones
Tabla con el historial completo. Usada en analytics y goals de tipo `multiplication`.

### 1.8 `discipleship_reports` — Reportes Semanales
Reportes enviados por líderes. Flujo: creación → aprobación/rechazo por supervisor.

### 1.9 `discipleship_levels` — Niveles Configurables
Nombres de los niveles jerárquicos (configurables por iglesia, no hardcodeados).

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | - |
| `level` | Integer (1-5) | Número de nivel |
| `name` | Text | Nombre personalizable (ej: "Líder de Célula") |
| `description` | Text | Descripción del rol |

---

## 2. KPIs Reales — Consultas SQL Activas

Estas son las queries que REALMENTE ejecuta `handlers/dashboard.go`:

### 2.1 Total de Grupos Activos
```sql
SELECT COUNT(*) FROM discipleship_groups WHERE status = 'active';
```

### 2.2 Total de Miembros
```sql
SELECT COALESCE(SUM(active_members), 0)
FROM discipleship_groups
WHERE status = 'active';
```
> Usa `active_members`, NO `member_count`. `active_members` se actualiza tras cada registro de asistencia.

### 2.3 Líderes Activos
```sql
SELECT COUNT(DISTINCT leader_id)
FROM discipleship_groups
WHERE status = 'active';
```

### 2.4 Porcentaje de Asistencia Promedio
```sql
SELECT COALESCE(
    AVG(CASE WHEN member_count > 0
        THEN active_members::float / member_count * 100
        ELSE 0 END), 0)
FROM discipleship_groups
WHERE status = 'active';
```
> El % se calcula como `active_members / member_count` en cada grupo, luego se promedian.

### 2.5 Multiplicaciones (últimos 30 días)
```sql
SELECT COUNT(*)
FROM discipleship_multiplications
WHERE multiplication_date >= NOW() - INTERVAL '30 days';
```

### 2.6 Alertas Pendientes
```sql
SELECT COUNT(*) FROM discipleship_alerts WHERE resolved = false;
```

### 2.7 Salud Espiritual (temperatura promedio últimos 30 días)
```sql
SELECT COALESCE(AVG(spiritual_temperature), 0)
FROM discipleship_attendance
WHERE meeting_date >= NOW() - INTERVAL '30 days';
```
> Fuente: `discipleship_attendance.spiritual_temperature` (1-10). En el frontend se puede multiplicar ×10 para mostrar como porcentaje.

### 2.8 Crecimiento Mensual (calculado en Go)
```go
// En dashboard.go — compara miembros actuales vs mes anterior
prevMembers := ... // query con WHERE ... < NOW() - INTERVAL '30 days'
if prevMembers > 0 {
    stats.MonthlyGrowth = (totalMembers - prevMembers) / prevMembers * 100
}
```

---

## 3. Flujo de Datos Real (De la UI al Gráfico)

```
1. Líder registra asistencia
   → POST /api/v1/discipleship/groups/:id/attendance
   → INSERT INTO discipleship_attendance
   → UPDATE discipleship_groups SET active_members = COUNT(present=true)

2. Dashboard carga KPIs
   → GET /api/v1/dashboard/stats
   → getDiscipleshipStats(db) en dashboard.go
   → 7 queries SQL independientes sobre las tablas reales

3. Filtrado por nivel jerárquico
   → GET /api/v1/discipleship/dashboard-stats?level=5
   → discipleshipHandler.GetDashboardStatsByLevel
   → Pastor (5): ve TODO / Líder (1): solo su grupo_id

4. Frontend renderiza
   → PastoralDashboard o CoordinatorDashboard según permissions.discipleship_level
   → Recharts usa los datos de /dashboard-stats para gráficos de tendencias
```

---

## 4. Queries SQL para Verificar Datos en Supabase

```sql
-- 1. Grupos activos y sus conteos reales
SELECT
    group_name,
    member_count,
    active_members,
    status,
    CASE WHEN member_count > 0
        THEN ROUND(active_members::float / member_count * 100, 1)
        ELSE 0 END AS attendance_pct
FROM discipleship_groups
WHERE status = 'active'
ORDER BY attendance_pct DESC;

-- 2. Temperatura espiritual últimos 30 días
SELECT
    g.group_name,
    ROUND(AVG(a.spiritual_temperature), 1) AS avg_temp,
    COUNT(*) AS meetings
FROM discipleship_attendance a
JOIN discipleship_groups g ON g.id = a.group_id
WHERE a.meeting_date >= NOW() - INTERVAL '30 days'
GROUP BY g.group_name
ORDER BY avg_temp DESC;

-- 3. Alertas pendientes por tipo
SELECT alert_type, COUNT(*) as total
FROM discipleship_alerts
WHERE resolved = false
GROUP BY alert_type;

-- 4. Objetivos activos y su progreso
SELECT
    title, goal_type, priority,
    current_value, target_value,
    ROUND(current_value / NULLIF(target_value, 0) * 100, 1) AS progress_pct,
    deadline,
    CASE WHEN deadline < NOW() AND status = 'active' THEN 'VENCIDO' ELSE status END AS real_status
FROM discipleship_goals
ORDER BY priority, deadline;

-- 5. Multiplicaciones últimos 6 meses
SELECT
    DATE_TRUNC('month', multiplication_date) as month,
    COUNT(*) as multiplications
FROM discipleship_multiplications
WHERE multiplication_date >= NOW() - INTERVAL '6 months'
GROUP BY month
ORDER BY month;
```

---

## 5. Arquitectura de Roles y Acceso a KPIs

### Dos capas de roles (INDEPENDIENTES entre sí)

| Capa | Tabla/Campo | Valores | Uso |
|------|-------------|---------|-----|
| **ERP** | `users.role` | admin(500) > pastor(400) > staff(300) > supervisor(200) > server(100) > member(0) | Acceso general a la app |
| **Módulo** | `discipleship_hierarchy.hierarchy_level` | 1=Líder, 2=Sup.Aux, 3=Sup.Gral, 4=Coordinador, 5=Pastoral | Acceso y vista dentro del módulo |

### Qué ve cada nivel de módulo

| Nivel | Dashboard | Datos visibles |
|-------|-----------|----------------|
| Pastor/Staff (`isFullAccess`) | `PastoralDashboard` | Todos los grupos, todas las zonas |
| Nivel 5 (Pastoral) | `PastoralDashboard` | Ídem |
| Nivel 4 (Coordinador) | `CoordinatorDashboard` | Su zona + subordinados |
| Nivel 3 (Sup. General) | `GeneralSupervisorDashboard` | Sus supervisores auxiliares |
| Nivel 2 (Sup. Auxiliar) | `AuxiliarySupervisorDashboard` | Sus líderes |
| Nivel 1 (Líder) | `LeaderDashboard` | Solo su grupo |
| Sin nivel | Pantalla "Sin Acceso" | Nada |

---

## 6. Problemas Comunes y Soluciones

### 6.1 KPIs en cero aunque haya datos
- **Causa A**: `discipleship_groups.active_members` es 0 porque no se registró asistencia aún. `active_members` solo se actualiza al hacer POST de asistencia, no al agregar miembros.
- **Causa B**: Todos los grupos tienen `status != 'active'`.
- **Solución**: Verificar con la Query 1 de la sección anterior.

### 6.2 Temperatura espiritual siempre 0
- **Causa**: `discipleship_attendance.spiritual_temperature` es NULL en todos los registros (el campo es opcional al registrar asistencia).
- **Solución**: El formulario de asistencia debe pedir y enviar siempre `spiritual_temperature`.

### 6.3 Error "column does not exist" en Goals
- **Causa**: El handler busca columnas que no existen en la migración (ej: `title` vs `goal_type`).
- **Referencia**: Ver columnas reales en sección 1.4 de este documento.

### 6.4 `discipleship_metrics` no existe
- **Causa**: La tabla fue planeada en una arquitectura inicial pero no se implementó.
- **Solución**: No hacer queries a esa tabla. Usar `discipleship_attendance` + `discipleship_groups` como se documenta arriba.

### 6.5 Badge mostrando "Alertas0"
- **Causa**: `stats.pending_alerts === 0` se evalúa como truthy en `{stats.pending_alerts && <Badge>}`.
- **Solución**: `{stats.pending_alerts > 0 && <Badge>{stats.pending_alerts}</Badge>}`.
