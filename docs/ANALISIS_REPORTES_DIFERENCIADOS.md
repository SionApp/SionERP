# Análisis: Reportes del Sistema vs Reportes de Discipulado

## 📋 Resumen Ejecutivo

Existen **DOS sistemas de reportes completamente diferenciados** en la aplicación:

1. **Reportes Administrativos Generales** (`reports` table) - Para administración del sistema
2. **Reportes de Discipulado** (`discipleship_reports` table) - Para jerarquía de discipulado

Ambos están **correctamente separados** y tienen propósitos distintos.

---

## 🔍 1. REPORTES ADMINISTRATIVOS GENERALES

### Ubicación
- **Tabla**: `reports` (en Supabase)
- **Página Frontend**: `/dashboard/reports` (`ReportsPage.tsx`)
- **Rutas Backend**: No implementadas aún (solo UI mock)

### Propósito
Reportes administrativos generales del sistema para análisis y toma de decisiones a nivel congregacional.

### Características

| Aspecto | Detalle |
|---------|---------|
| **Usuarios** | Pastores, Staff (roles administrativos) |
| **Tipos de Reportes** | - Reporte de Usuarios<br>- Reporte de Crecimiento<br>- Reporte Demográfico<br>- Reporte de Actividades |
| **Formato** | Archivos generados (PDF, Excel, CSV) |
| **Frecuencia** | Bajo demanda (on-demand) |
| **Estado** | `pending`, `completed`, `failed` |
| **Datos** | Consolidación de datos generales del sistema |

### Estructura de la Tabla

```sql
CREATE TABLE public.reports (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,              -- "Reporte Mensual - Marzo 2024"
  type TEXT NOT NULL,                -- 'user_summary', 'attendance', 'membership'
  parameters JSONB,                  -- Filtros y configuraciones
  generated_by UUID REFERENCES users(id),
  generated_at TIMESTAMPTZ DEFAULT now(),
  file_url TEXT,                     -- URL del archivo generado
  status TEXT DEFAULT 'pending'      -- 'pending', 'completed', 'failed'
);
```

### Flujo de Trabajo
1. Usuario selecciona tipo de reporte
2. Configura parámetros (fechas, filtros, formato)
3. Sistema genera archivo (PDF/Excel/CSV)
4. Usuario descarga o visualiza el reporte

### Estado Actual
- ✅ UI implementada (`ReportsPage.tsx`)
- ❌ Backend no implementado (solo mocks)
- ❌ Servicio no creado
- ❌ Endpoints no definidos

---

## 📊 2. REPORTES DE DISCIPULADO

### Ubicación
- **Tabla**: `discipleship_reports` (en Supabase)
- **Página Frontend**: Módulo de Discipulado (dashboards por nivel)
- **Rutas Backend**: `/api/v1/discipleship/reports/*`
- **Servicio**: `DiscipleshipService` en frontend

### Propósito
Reportes jerárquicos del sistema de discipulado donde cada nivel reporta a su supervisor según la estructura organizacional.

### Características

| Aspecto | Detalle |
|---------|---------|
| **Usuarios** | Líderes, Supervisores, Coordinadores, Pastores (jerarquía de discipulado) |
| **Tipos de Reportes** | - Semanal (Nivel 1 - Líder)<br>- Quincenal (Nivel 2 - Sup. Auxiliar)<br>- Mensual (Nivel 3 - Sup. General)<br>- Trimestral (Nivel 4 - Coordinador) |
| **Formato** | Datos estructurados en JSONB |
| **Frecuencia** | Periódica según nivel jerárquico |
| **Estado** | `draft`, `submitted`, `approved`, `needs_attention` |
| **Datos** | Métricas específicas de grupos, asistencia, salud espiritual, etc. |

### Estructura de la Tabla

```sql
CREATE TABLE public.discipleship_reports (
  id UUID PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES users(id),      -- Quien reporta
  supervisor_id UUID REFERENCES users(id),             -- A quien reporta
  report_level INTEGER NOT NULL CHECK (1-5),           -- Nivel jerárquico
  report_type TEXT NOT NULL,                           -- 'weekly', 'biweekly', 'monthly', 'quarterly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  report_data JSONB DEFAULT '{}',                     -- Datos específicos del reporte
  status TEXT DEFAULT 'draft',                         -- 'draft', 'submitted', 'approved', 'needs_attention'
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Flujo de Trabajo
1. Líder/Supervisor crea reporte (estado: `draft`)
2. Completa datos según su nivel jerárquico
3. Envía reporte (estado: `submitted`)
4. Supervisor revisa y aprueba/rechaza (estado: `approved` o `needs_attention`)
5. Reporte consolidado sube en la jerarquía

### Estado Actual
- ✅ Backend implementado (`discipleship_reports.go`)
- ✅ Servicio frontend implementado (`DiscipleshipService`)
- ✅ Endpoints definidos en rutas
- ✅ Integrado con jerarquía de discipulado

---

## 🔄 Comparación Directa

| Característica | Reportes Administrativos | Reportes de Discipulado |
|----------------|-------------------------|------------------------|
| **Tabla** | `reports` | `discipleship_reports` |
| **Propósito** | Análisis administrativo general | Seguimiento jerárquico de discipulado |
| **Audiencia** | Administradores (Pastor/Staff) | Líderes y supervisores de discipulado |
| **Frecuencia** | Bajo demanda | Periódica (semanal/mensual/trimestral) |
| **Formato** | Archivos (PDF/Excel/CSV) | Datos estructurados (JSONB) |
| **Flujo** | Generar → Descargar | Crear → Enviar → Aprobar |
| **Datos** | Consolidación general | Métricas específicas de grupos |
| **Estado** | `pending`, `completed`, `failed` | `draft`, `submitted`, `approved` |
| **Implementación** | ❌ Solo UI | ✅ Completo |

---

## 📁 Estructura de Archivos

### Reportes Administrativos
```
src/pages/dashboard/ReportsPage.tsx          # UI (sin backend aún)
src/integrations/supabase/types.ts            # Tipo: Report
packages/shared-types/src/index.ts            # Interface: Report
```

### Reportes de Discipulado
```
src/services/discipleship.service.ts          # Servicio completo
src/types/discipleship.types.ts               # DiscipleshipReport
apps/backend-go/handlers/discipleship_reports.go  # Handler backend
apps/backend-go/models/discipleship.go       # Modelo Go
```

---

## 🎯 Recomendaciones

### Para Reportes Administrativos
1. **Crear servicio backend** para generar reportes
2. **Implementar endpoints** en `routes.go`:
   ```go
   reports := protected.Group("/reports")
   {
     reports.GET("", reportHandler.GetReports)
     reports.POST("", reportHandler.GenerateReport)
     reports.GET("/:id", reportHandler.GetReport)
     reports.GET("/:id/download", reportHandler.DownloadReport)
   }
   ```
3. **Crear servicio frontend** (`report.service.ts`)
4. **Conectar UI** con el servicio

### Para Reportes de Discipulado
1. ✅ Ya está completo
2. Considerar agregar:
   - Exportación a PDF/Excel de reportes aprobados
   - Notificaciones cuando hay reportes pendientes
   - Dashboard consolidado para supervisores

---

## ✅ Conclusión

Los dos sistemas de reportes están **correctamente diferenciados**:

- **Reportes Administrativos**: Para análisis general del sistema (aún sin backend)
- **Reportes de Discipulado**: Para seguimiento jerárquico del ministerio (completo)

**No hay confusión arquitectónica** - están diseñados para propósitos distintos y no se solapan. La única acción pendiente es implementar el backend para los reportes administrativos.

---

## 📚 Referencias

- `docs/DATABASE_ARCHITECTURE.md` - Define tabla `reports`
- `docs/DISCIPLESHIP_MODULE.md` - Define sistema de reportes de discipulado
- `supabase/migrations/20251202000000_remote_schema.sql` - Esquema completo
- `apps/backend-go/routes/routes.go` - Rutas de discipulado implementadas

