# Esquema Completo de Base de Datos - Proyecto Sion

## Arquitectura General

### Diagrama de Relaciones Principales

<lov-mermaid>
erDiagram
    users ||--o{ discipleship_hierarchy : "tiene"
    users ||--o{ discipleship_groups : "lidera"
    users ||--o{ user_permissions : "posee"
    users ||--o{ audit_logs : "modifica"
    
    discipleship_groups ||--o{ discipleship_metrics : "genera"
    discipleship_groups ||--o{ cell_multiplication_tracking : "multiplica"
    discipleship_hierarchy ||--o{ discipleship_reports : "reporta"
    
    permissions ||--o{ role_permissions : "asigna"
    role_permissions }o--|| users : "aplicado_a"
    
    users {
        uuid id PK
        text email UK
        text first_name
        text last_name
        text full_name
        text id_number UK
        text phone
        text address
        user_role role
        boolean is_active
        date birth_date
        boolean baptized
        date baptism_date
        text zone_name
        uuid cell_leader_id FK
    }
    
    discipleship_hierarchy {
        uuid id PK
        uuid user_id FK
        integer hierarchy_level
        uuid supervisor_id FK
        text zone_name
        text territory
        integer active_groups_assigned
    }
    
    discipleship_groups {
        uuid id PK
        text group_name
        uuid leader_id FK
        uuid supervisor_id FK
        text zone_name
        text meeting_location
        text meeting_day
        time meeting_time
        integer member_count
        integer active_members
        text status
    }
    
    discipleship_metrics {
        uuid id PK
        uuid group_id FK
        date week_date
        integer attendance
        integer new_visitors
        integer conversions
        integer spiritual_temperature
        text leader_notes
    }
</lov-mermaid>

## Tablas Existentes

### 1. Tabla `users` - Usuarios del Sistema

**Propósito**: Almacena información completa de todos los usuarios del sistema.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Identificador único |
| `email` | TEXT | NOT NULL, UNIQUE | Correo electrónico |
| `first_name` | TEXT | NOT NULL | Primer nombre |
| `last_name` | TEXT | NOT NULL | Apellidos |
| `id_number` | TEXT | NOT NULL, UNIQUE | Cédula de identidad |
| `phone` | TEXT | NOT NULL | Teléfono |
| `address` | TEXT | NOT NULL | Dirección completa |
| `role` | user_role | DEFAULT 'server' | Rol del sistema |
| `birth_date` | DATE | NULL | Fecha de nacimiento |
| `baptized` | BOOLEAN | DEFAULT false | Estado de bautismo |
| `baptism_date` | TIMESTAMP | NULL | Fecha de bautismo |
| `zone_name` | TEXT | NULL | Zona geográfica asignada |
| `cell_leader_id` | UUID | FK users(id) | Líder de célula asignado |
| `is_active` | BOOLEAN | DEFAULT true | Usuario activo |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | Última modificación |

**Índices**:
- `idx_users_email` (email)
- `idx_users_id_number` (id_number)
- `idx_users_role` (role)
- `idx_users_zone` (zone_name)

### 2. Tabla `discipleship_hierarchy` - Jerarquía del Discipulado

**Propósito**: Define la estructura jerárquica del ministerio de discipulado.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | UUID | PK | Identificador único |
| `user_id` | UUID | FK users(id), NOT NULL | Usuario en la jerarquía |
| `hierarchy_level` | INTEGER | NOT NULL, CHECK (1-5) | Nivel jerárquico (1=Pastor, 5=Líder) |
| `supervisor_id` | UUID | FK discipleship_hierarchy(user_id) | Supervisor directo |
| `zone_name` | TEXT | NULL | Zona de responsabilidad |
| `territory` | TEXT | NULL | Territorio específico |
| `active_groups_assigned` | INTEGER | DEFAULT 0 | Grupos activos asignados |

### 3. Tabla `discipleship_groups` - Grupos de Discipulado

**Propósito**: Gestiona la información de grupos/células de discipulado.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | UUID | PK | Identificador único |
| `group_name` | TEXT | NOT NULL | Nombre del grupo |
| `leader_id` | UUID | FK users(id), NOT NULL | Líder del grupo |
| `supervisor_id` | UUID | FK users(id) | Supervisor asignado |
| `zone_name` | TEXT | NULL | Zona geográfica |
| `meeting_location` | TEXT | NULL | Lugar de reunión |
| `meeting_day` | TEXT | NULL | Día de reunión |
| `meeting_time` | TIME | NULL | Hora de reunión |
| `member_count` | INTEGER | DEFAULT 0 | Total de miembros |
| `active_members` | INTEGER | DEFAULT 0 | Miembros activos |
| `status` | TEXT | DEFAULT 'active' | Estado del grupo |

### 4. Tabla `discipleship_metrics` - Métricas Semanales

**Propósito**: Almacena métricas semanales de cada grupo.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | UUID | PK | Identificador único |
| `group_id` | UUID | FK discipleship_groups(id) | Grupo relacionado |
| `week_date` | DATE | NOT NULL | Fecha de la semana |
| `attendance` | INTEGER | DEFAULT 0 | Asistencia total |
| `new_visitors` | INTEGER | DEFAULT 0 | Visitantes nuevos |
| `returning_visitors` | INTEGER | DEFAULT 0 | Visitantes que regresan |
| `conversions` | INTEGER | DEFAULT 0 | Conversiones |
| `baptisms` | INTEGER | DEFAULT 0 | Bautismos |
| `spiritual_temperature` | INTEGER | DEFAULT 5, CHECK (1-10) | Temperatura espiritual |
| `leader_notes` | TEXT | NULL | Notas del líder |

### 5. Tabla `audit_logs` - Auditoría del Sistema

**Propósito**: Registra todos los cambios realizados en el sistema.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | UUID | PK | Identificador único |
| `table_name` | TEXT | NOT NULL | Tabla modificada |
| `record_id` | UUID | NOT NULL | ID del registro |
| `action` | TEXT | NOT NULL | Acción (INSERT/UPDATE/DELETE) |
| `old_values` | JSONB | NULL | Valores anteriores |
| `new_values` | JSONB | NULL | Valores nuevos |
| `changed_by` | UUID | FK users(id) | Usuario que realizó el cambio |
| `changed_at` | TIMESTAMPTZ | DEFAULT now() | Fecha del cambio |

## Tablas Pendientes por Crear

### 1. Tabla `zones` - Gestión de Zonas

<lov-mermaid>
erDiagram
    zones {
        uuid id PK
        text name UK
        text description
        text color
        uuid supervisor_id FK
        jsonb boundaries
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }
    
    zones ||--o{ discipleship_groups : "pertenece"
    users ||--o{ zones : "supervisa"
</lov-mermaid>

**Propósito**: Define zonas geográficas para organizar grupos y líderes.

```sql
CREATE TABLE public.zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  supervisor_id UUID REFERENCES users(id),
  boundaries JSONB, -- Coordenadas geográficas
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 2. Tabla `group_members` - Miembros de Grupos

**Propósito**: Relación many-to-many entre usuarios y grupos.

```sql
CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES discipleship_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  join_date DATE DEFAULT CURRENT_DATE,
  role TEXT DEFAULT 'member', -- 'leader', 'assistant', 'member'
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);
```

### 3. Tabla `training_modules` - Módulos de Capacitación

**Propósito**: Gestión de contenido de capacitación por niveles.

```sql
CREATE TABLE public.training_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  hierarchy_level INTEGER NOT NULL CHECK (hierarchy_level BETWEEN 1 AND 5),
  content_type TEXT DEFAULT 'document', -- 'document', 'video', 'quiz'
  content_url TEXT,
  duration_minutes INTEGER,
  is_required BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4. Tabla `user_training_progress` - Progreso de Capacitación

**Propósito**: Seguimiento del progreso de capacitación de usuarios.

```sql
CREATE TABLE public.user_training_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed'
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  score INTEGER CHECK (score BETWEEN 0 AND 100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, module_id)
);
```

### 5. Tabla `notifications` - Sistema de Notificaciones

**Propósito**: Gestión de notificaciones del sistema.

```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- 'info', 'warning', 'error', 'success'
  priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  is_read BOOLEAN DEFAULT false,
  related_table TEXT,
  related_id UUID,
  action_url TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Diagrama de Flujo de Datos

### Flujo de Reportes por Nivel

<lov-mermaid>
flowchart TD
    A[Líder Célula - Nivel 5] --> B[Reporte Semanal]
    B --> C[Supervisor Auxiliar - Nivel 4]
    C --> D[Reporte Quincenal]
    D --> E[Supervisor General - Nivel 3]
    E --> F[Reporte Mensual]
    F --> G[Coordinador - Nivel 2]
    G --> H[Reporte Trimestral]
    H --> I[Pastor - Nivel 1]
    
    B --> J[(discipleship_metrics)]
    D --> K[(discipleship_reports)]
    F --> K
    H --> K
    
    J --> L[Panel Analytics]
    K --> L
    L --> M[Alertas Automáticas]
    L --> N[Métricas Consolidadas]
</lov-mermaid>

### Flujo de Multiplicación de Células

<lov-mermaid>
flowchart LR
    A[Célula Original] --> B{¿Lista para Multiplicar?}
    B -->|Sí| C[Planificación]
    B -->|No| D[Continuar Crecimiento]
    
    C --> E[Seleccionar Líder]
    E --> F[Dividir Miembros]
    F --> G[Nueva Célula]
    
    G --> H[(cell_multiplication_tracking)]
    A --> I[(discipleship_groups - Original)]
    G --> J[(discipleship_groups - Nueva)]
    
    H --> K[Métricas de Multiplicación]
    I --> L[Panel Consolidado]
    J --> L
</lov-mermaid>

## Normalización de la Base de Datos

### Primera Forma Normal (1NF) ✅
- Todos los campos contienen valores atómicos
- No hay grupos repetitivos
- Cada fila es única

### Segunda Forma Normal (2NF) ✅
- Cumple 1NF
- Todos los atributos no clave dependen completamente de la clave primaria
- No hay dependencias parciales

### Tercera Forma Normal (3NF) ✅
- Cumple 2NF
- No hay dependencias transitivas
- Atributos no clave no dependen de otros atributos no clave

### Forma Normal de Boyce-Codd (BCNF) ✅
- Cumple 3NF
- Cada determinante es una superclave
- Optimizada para evitar anomalías de actualización

## Índices Estratégicos Recomendados

### Índices de Rendimiento
```sql
-- Búsquedas frecuentes por zona
CREATE INDEX idx_users_zone_active ON users(zone_name, is_active);
CREATE INDEX idx_groups_zone_status ON discipleship_groups(zone_name, status);

-- Métricas por fecha
CREATE INDEX idx_metrics_date_group ON discipleship_metrics(week_date, group_id);
CREATE INDEX idx_metrics_group_date ON discipleship_metrics(group_id, week_date DESC);

-- Jerarquía de discipulado
CREATE INDEX idx_hierarchy_level_supervisor ON discipleship_hierarchy(hierarchy_level, supervisor_id);
CREATE INDEX idx_hierarchy_user_level ON discipleship_hierarchy(user_id, hierarchy_level);

-- Auditoría
CREATE INDEX idx_audit_table_date ON audit_logs(table_name, changed_at DESC);
CREATE INDEX idx_audit_user_date ON audit_logs(changed_by, changed_at DESC);
```

### Índices de Integridad Referencial
```sql
-- Para mejorar rendimiento de JOINs
CREATE INDEX idx_groups_leader ON discipleship_groups(leader_id);
CREATE INDEX idx_groups_supervisor ON discipleship_groups(supervisor_id);
CREATE INDEX idx_hierarchy_supervisor ON discipleship_hierarchy(supervisor_id);
```

## Vistas Estratégicas

### Vista `v_group_summary` - Resumen de Grupos
```sql
CREATE VIEW v_group_summary AS
SELECT 
  dg.id,
  dg.group_name,
  dg.zone_name,
  u.first_name || ' ' || u.last_name as leader_name,
  dg.member_count,
  dg.active_members,
  AVG(dm.attendance) as avg_attendance,
  AVG(dm.spiritual_temperature) as avg_spiritual_temp,
  COUNT(dm.id) as reports_count
FROM discipleship_groups dg
LEFT JOIN users u ON dg.leader_id = u.id
LEFT JOIN discipleship_metrics dm ON dg.id = dm.group_id
  AND dm.week_date >= CURRENT_DATE - INTERVAL '8 weeks'
WHERE dg.status = 'active'
GROUP BY dg.id, dg.group_name, dg.zone_name, u.first_name, u.last_name, dg.member_count, dg.active_members;
```

### Vista `v_hierarchy_structure` - Estructura Jerárquica
```sql
CREATE VIEW v_hierarchy_structure AS
WITH RECURSIVE hierarchy_tree AS (
  -- Nivel 1: Pastores
  SELECT 
    h.id,
    h.user_id,
    h.hierarchy_level,
    h.supervisor_id,
    u.first_name || ' ' || u.last_name as user_name,
    h.zone_name,
    1 as depth,
    ARRAY[h.user_id] as path
  FROM discipleship_hierarchy h
  JOIN users u ON h.user_id = u.id
  WHERE h.hierarchy_level = 1
  
  UNION ALL
  
  -- Niveles subordinados
  SELECT 
    h.id,
    h.user_id,
    h.hierarchy_level,
    h.supervisor_id,
    u.first_name || ' ' || u.last_name as user_name,
    h.zone_name,
    ht.depth + 1,
    ht.path || h.user_id
  FROM discipleship_hierarchy h
  JOIN users u ON h.user_id = u.id
  JOIN hierarchy_tree ht ON h.supervisor_id = ht.user_id
  WHERE h.hierarchy_level > 1
)
SELECT * FROM hierarchy_tree
ORDER BY depth, hierarchy_level, user_name;
```

## Triggers y Funciones Automáticas

### Trigger para Actualización Automática de Timestamps
```sql
CREATE TRIGGER update_discipleship_groups_updated_at
  BEFORE UPDATE ON discipleship_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discipleship_hierarchy_updated_at
  BEFORE UPDATE ON discipleship_hierarchy
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Función para Validar Jerarquía
```sql
CREATE OR REPLACE FUNCTION validate_hierarchy_level()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar que el supervisor tenga un nivel jerárquico menor
  IF NEW.supervisor_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM discipleship_hierarchy 
      WHERE user_id = NEW.supervisor_id 
      AND hierarchy_level < NEW.hierarchy_level
    ) THEN
      RAISE EXCEPTION 'El supervisor debe tener un nivel jerárquico menor';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_hierarchy_before_insert_update
  BEFORE INSERT OR UPDATE ON discipleship_hierarchy
  FOR EACH ROW
  EXECUTE FUNCTION validate_hierarchy_level();
```

## Consideraciones de Escalabilidad

### Particionamiento por Fecha (Futuro)
```sql
-- Para la tabla discipleship_metrics cuando crezca mucho
CREATE TABLE discipleship_metrics_2024 PARTITION OF discipleship_metrics
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE discipleship_metrics_2025 PARTITION OF discipleship_metrics
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
```

### Archivado de Datos Históricos
```sql
-- Mover métricas antiguas a tabla de archivo
CREATE TABLE discipleship_metrics_archive (LIKE discipleship_metrics);

-- Función para archivar datos antiguos (ejecutar mensualmente)
CREATE OR REPLACE FUNCTION archive_old_metrics()
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  WITH moved_data AS (
    DELETE FROM discipleship_metrics 
    WHERE week_date < CURRENT_DATE - INTERVAL '2 years'
    RETURNING *
  )
  INSERT INTO discipleship_metrics_archive 
  SELECT * FROM moved_data;
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;
```

## Próximos Pasos de Implementación

1. **Crear tablas pendientes** (zones, group_members, training_modules)
2. **Implementar vistas estratégicas** para consultas frecuentes
3. **Agregar índices de rendimiento** según patrones de uso
4. **Implementar triggers de validación** para integridad de datos
5. **Configurar particionamiento** para tablas que crezcan rápidamente
6. **Establecer políticas de archivado** para datos históricos