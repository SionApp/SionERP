# Integración de Roles: Sistema General vs Discipulado

## Resumen Ejecutivo

Este documento explica cómo integrar los roles del sistema general con la jerarquía específica del discipulado, manteniendo flexibilidad y seguridad en el acceso a datos.

## Arquitectura de Roles Híbrida

### Roles del Sistema General
- **Pastor**: Acceso completo al sistema
- **Staff**: Acceso administrativo limitado
- **Supervisor**: Gestión de usuarios específicos
- **Server**: Usuario básico con permisos mínimos

### Jerarquía del Discipulado (1-5)
- **Nivel 1**: Pastor Principal
- **Nivel 2**: Coordinador General
- **Nivel 3**: Supervisor General
- **Nivel 4**: Supervisor Auxiliar
- **Nivel 5**: Líder de Célula

## Diagrama de Integración

<lov-mermaid>
graph TD
    A[Usuario del Sistema] --> B{¿Tiene Rol General?}
    B -->|Sí| C[Pastor/Staff/Supervisor/Server]
    B -->|No| D[Server por defecto]
    
    C --> E{¿Participa en Discipulado?}
    D --> E
    
    E -->|Sí| F[Asignar Nivel de Discipulado 1-5]
    E -->|No| G[Solo acceso general]
    
    F --> H[Permisos Combinados]
    G --> I[Permisos Solo Generales]
    
    H --> J[Acceso a Panel Discipulado]
    I --> K[Acceso a Panel General]
</lov-mermaid>

## Estrategia de Implementación

### 1. Tabla `discipleship_hierarchy` (Ya existe)
```sql
-- Esta tabla ya maneja la jerarquía del discipulado
TABLE discipleship_hierarchy (
  id UUID,
  user_id UUID,
  hierarchy_level INTEGER (1-5),
  supervisor_id UUID,
  zone_name TEXT,
  territory TEXT,
  active_groups_assigned INTEGER
)
```

### 2. Función de Permisos Híbridos
```sql
CREATE OR REPLACE FUNCTION can_access_discipleship_data(target_user_id UUID, data_level INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  user_system_role TEXT;
  user_discipleship_level INTEGER;
BEGIN
  -- Obtener rol del sistema
  SELECT role INTO user_system_role FROM users WHERE id = auth.uid();
  
  -- Pastor y Staff siempre tienen acceso
  IF user_system_role IN ('pastor', 'staff') THEN
    RETURN TRUE;
  END IF;
  
  -- Obtener nivel de discipulado
  SELECT hierarchy_level INTO user_discipleship_level 
  FROM discipleship_hierarchy 
  WHERE user_id = auth.uid();
  
  -- Verificar acceso basado en jerarquía
  RETURN user_discipleship_level <= data_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Panel Dinámico por Contexto

<lov-mermaid>
flowchart LR
    A[Usuario Autenticado] --> B{Verificar Contexto}
    B --> C[Panel General]
    B --> D[Panel Discipulado]
    
    C --> E[Gestión de Usuarios]
    C --> F[Reportes Generales]
    C --> G[Configuración]
    
    D --> H[Grupos de Discipulado]
    D --> I[Métricas Espirituales]
    D --> J[Multiplicación de Células]
    D --> K[Reportes por Nivel]
</lov-mermaid>

## Casos de Uso Específicos

### Caso 1: Pastor con Responsabilidades de Discipulado
- **Rol Sistema**: Pastor
- **Nivel Discipulado**: 1 (Pastor Principal)
- **Acceso**: Total a ambos sistemas

### Caso 2: Líder de Célula sin Rol Administrativo
- **Rol Sistema**: Server
- **Nivel Discipulado**: 5 (Líder)
- **Acceso**: Solo datos de su grupo y métricas

### Caso 3: Staff Administrativo sin Discipulado
- **Rol Sistema**: Staff
- **Nivel Discipulado**: N/A
- **Acceso**: Admin general, sin acceso a discipulado

## Matriz de Permisos

| Nivel Discipulado | Puede Ver | Puede Editar | Reportes | Métricas |
|-------------------|-----------|--------------|----------|----------|
| **1 - Pastor** | Todo | Todo | Todos | Todas |
| **2 - Coordinador** | Niveles 2-5 | Niveles 3-5 | Estratégicos | Zonales |
| **3 - Supervisor General** | Niveles 3-5 | Niveles 4-5 | Zonales | Zonales |
| **4 - Supervisor Auxiliar** | Niveles 4-5 | Nivel 5 | Supervisión | Grupos |
| **5 - Líder** | Solo su grupo | Solo su grupo | Semanales | Grupo |

## Implementación en Frontend

### Context de Permisos Híbridos
```typescript
interface HybridPermissions {
  systemRole: 'pastor' | 'staff' | 'supervisor' | 'server';
  discipleshipLevel?: 1 | 2 | 3 | 4 | 5;
  canAccessDiscipleship: boolean;
  canManageUsers: boolean;
  canViewReports: boolean;
}
```

### Componente de Navegación Dinámica
```typescript
const DynamicNavigation = ({ permissions }: { permissions: HybridPermissions }) => {
  return (
    <nav>
      {/* Navegación general siempre visible */}
      <GeneralNavItems />
      
      {/* Navegación de discipulado condicional */}
      {permissions.canAccessDiscipleship && (
        <DiscipleshipNavItems level={permissions.discipleshipLevel} />
      )}
    </nav>
  );
};
```

## Migración de Datos Existentes

### Paso 1: Identificar Usuarios Actuales
```sql
-- Identificar usuarios que deberían tener roles de discipulado
SELECT u.id, u.first_name, u.last_name, u.role
FROM users u
WHERE u.role IN ('pastor', 'staff') 
   OR u.cell_leader_id IS NOT NULL;
```

### Paso 2: Asignar Niveles Iniciales
```sql
-- Asignar nivel 1 a pastores
INSERT INTO discipleship_hierarchy (user_id, hierarchy_level)
SELECT id, 1 FROM users WHERE role = 'pastor';

-- Asignar nivel 5 a líderes de célula existentes
INSERT INTO discipleship_hierarchy (user_id, hierarchy_level)
SELECT DISTINCT cell_leader_id, 5 
FROM users 
WHERE cell_leader_id IS NOT NULL;
```

## Consideraciones de Seguridad

1. **Principio de Menor Privilegio**: Los usuarios solo obtienen permisos necesarios
2. **Separación de Contextos**: Los permisos del sistema no interfieren con el discipulado
3. **Auditoría Completa**: Todos los cambios se registran en `audit_logs`
4. **Validación Doble**: Cliente y servidor validan permisos

## Próximos Pasos

1. Implementar función `can_access_discipleship_data()`
2. Crear Context de permisos híbridos en React
3. Actualizar componentes para usar permisos dinámicos
4. Migrar usuarios existentes
5. Implementar pruebas de seguridad