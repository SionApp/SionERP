# 🏗️ Arquitectura de Roles Separados - Sistema General vs Discipulado

## ✅ Acuerdo de Arquitectura

### **Principio Fundamental:**
Los roles del sistema general y los roles de discipulado son **completamente independientes** y sirven propósitos diferentes.

---

## 🔐 Roles del Sistema General

**Tabla:** `users.role` (enum: `user_role`)
**Valores:** `'pastor'`, `'staff'`, `'supervisor'`, `'server'`

**Propósito:**
- ✅ Controlar acceso general a la aplicación
- ✅ Administrar permisos de módulos generales (usuarios, reportes, eventos, etc.)
- ✅ Definir quién puede ver/editar/eliminar en el sistema general

**Relación con Discipulado:**
- **Pastor y Staff:** Pueden ver **TODA** la jerarquía de discipulado (sin filtros)
- **Supervisor y Server:** Acceso limitado según su `hierarchy_level` en discipulado

**Tabla de Permisos:** `role_permissions` (permisos granulares del sistema)

---

## 📊 Roles de Discipulado

**Tabla:** `discipleship_hierarchy.hierarchy_level` (INTEGER 1-5)
**Valores:** 
- `1` = Líder de Grupo
- `2` = Supervisor Auxiliar
- `3` = Supervisor General / Coordinador
- `4` = Coordinador General
- `5` = Pastoral

**Propósito:**
- ✅ Filtrar accesos y acciones **SOLO en el módulo de discipulado**
- ✅ Determinar qué datos puede ver cada usuario en discipulado
- ✅ Definir la jerarquía de supervisión en discipulado

**Independencia:**
- Un usuario puede tener `role = 'server'` pero `hierarchy_level = 3` (coordinador)
- Un usuario puede tener `role = 'pastor'` pero NO participar en discipulado
- Los niveles de discipulado NO afectan permisos fuera del módulo de discipulado

---

## 🎯 Matriz de Acceso al Módulo de Discipulado

| Rol Sistema | Hierarchy Level | Acceso en Discipulado |
|-------------|----------------|----------------------|
| **Pastor** | Cualquiera o NULL | ✅ Ve **TODA** la jerarquía (sin filtros) |
| **Staff** | Cualquiera o NULL | ✅ Ve **TODA** la jerarquía (sin filtros) |
| **Supervisor** | 1 (Líder) | ✅ Ve solo su grupo |
| **Supervisor** | 2 (Sup. Auxiliar) | ✅ Ve grupos que supervisa |
| **Supervisor** | 3 (Coordinador) | ✅ Ve su zona/territorio |
| **Supervisor** | 4 (Coord. General) | ✅ Ve múltiples zonas |
| **Supervisor** | 5 (Pastoral) | ✅ Ve todo el ministerio |
| **Server** | 1 (Líder) | ✅ Ve solo su grupo |
| **Server** | 2 (Sup. Auxiliar) | ✅ Ve grupos que supervisa |
| **Server** | 3 (Coordinador) | ✅ Ve su zona/territorio |
| **Server** | 4 (Coord. General) | ✅ Ve múltiples zonas |
| **Server** | 5 (Pastoral) | ✅ Ve todo el ministerio |
| **Cualquiera** | NULL (sin jerarquía) | ❌ Sin acceso al módulo de discipulado |

---

## 🔄 Flujo de Decisión de Acceso

```
┌─────────────────────────────────────────────────────────┐
│ Usuario intenta acceder al módulo de discipulado        │
└─────────────────────────────────────────────────────────┘
                    ↓
        ┌───────────────────────┐
        │ ¿Es Pastor o Staff?   │
        └───────────────────────┘
              ↓              ↓
            SÍ              NO
              ↓              ↓
    ┌─────────────────┐  ┌──────────────────────┐
    │ Acceso Completo │  │ Consultar hierarchy  │
    │ Sin Filtros     │  │ level en             │
    │ Ver Todo        │  │ discipleship_hierarchy│
    └─────────────────┘  └──────────────────────┘
                                ↓
                    ┌───────────────────────┐
                    │ ¿Tiene hierarchy_level?│
                    └───────────────────────┘
                          ↓              ↓
                        SÍ              NO
                          ↓              ↓
                ┌─────────────────┐  ┌──────────────┐
                │ Filtrar según   │  │ Sin Acceso    │
                │ hierarchy_level  │  │ al módulo     │
                └─────────────────┘  └──────────────┘
```

---

## 💻 Implementación

### 1. Función Helper para Determinar Acceso

```typescript
// src/utils/discipleship-access.ts

interface DiscipleshipAccess {
  canAccess: boolean;
  level: number | null;
  isFullAccess: boolean; // true para pastor/staff
}

export async function getDiscipleshipAccess(
  userId: string,
  userRole: 'pastor' | 'staff' | 'supervisor' | 'server'
): Promise<DiscipleshipAccess> {
  // Pastor y Staff tienen acceso completo sin filtros
  if (userRole === 'pastor' || userRole === 'staff') {
    return {
      canAccess: true,
      level: null, // null significa sin filtros
      isFullAccess: true,
    };
  }

  // Otros roles necesitan tener hierarchy_level asignado
  const hierarchy = await DiscipleshipService.getHierarchy(userId);
  
  if (!hierarchy || hierarchy.length === 0) {
    return {
      canAccess: false,
      level: null,
      isFullAccess: false,
    };
  }

  return {
    canAccess: true,
    level: hierarchy[0].hierarchy_level,
    isFullAccess: false,
  };
}
```

### 2. Modificar `DiscipleshipPage.tsx`

```typescript
const [discipleshipAccess, setDiscipleshipAccess] = useState<DiscipleshipAccess | null>(null);

useEffect(() => {
  const loadAccess = async () => {
    if (!user?.id || !user?.role) return;
    
    const access = await getDiscipleshipAccess(user.id, user.role);
    setDiscipleshipAccess(access);
  };
  
  loadAccess();
}, [user]);

const renderDiscipleshipDashboard = () => {
  if (!discipleshipAccess || !discipleshipAccess.canAccess) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            No tienes acceso al módulo de discipulado. 
            Contacta a un administrador para asignarte un nivel jerárquico.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Si es acceso completo (pastor/staff), mostrar dashboard pastoral
  if (discipleshipAccess.isFullAccess) {
    return <PastoralDashboard />;
  }

  // Si no, usar el nivel de jerarquía
  const level = discipleshipAccess.level || 1;
  
  switch (level) {
    case 5:
      return <PastoralDashboard />;
    case 4:
      return <GeneralSupervisorDashboard />;
    case 3:
      return <CoordinatorDashboard />;
    case 2:
      return <AuxiliarySupervisorDashboard />;
    case 1:
    default:
      return <LeaderDashboard />;
  }
};
```

### 3. Filtrar Datos en el Backend

```go
// apps/backend-go/handlers/discipleship.go

func (h *DiscipleshipHandler) GetGroups(c echo.Context) error {
    userID := getUserIDFromContext(c) // Obtener del JWT
    userRole := getUserRoleFromContext(c)
    
    query := `SELECT ... FROM discipleship_groups g WHERE 1=1`
    args := []interface{}{}
    
    // Pastor y Staff ven todo (sin filtros)
    if userRole != "pastor" && userRole != "staff" {
        // Obtener hierarchy_level del usuario
        var hierarchyLevel int
        err := db.DB.QueryRow(
            "SELECT hierarchy_level FROM discipleship_hierarchy WHERE user_id = $1",
            userID,
        ).Scan(&hierarchyLevel)
        
        if err == nil {
            // Aplicar filtros según nivel
            switch hierarchyLevel {
            case 1: // Líder - solo su grupo
                query += " AND g.leader_id = $1"
                args = append(args, userID)
            case 2: // Sup. Auxiliar - grupos que supervisa
                query += " AND g.supervisor_id = $1"
                args = append(args, userID)
            case 3: // Coordinador - su zona
                // Obtener zona del usuario
                var zoneName string
                db.DB.QueryRow(
                    "SELECT zone_name FROM discipleship_hierarchy WHERE user_id = $1",
                    userID,
                ).Scan(&zoneName)
                if zoneName != "" {
                    query += " AND g.zone_name = $1"
                    args = append(args, zoneName)
                }
            // case 4 y 5 pueden ver más, según necesidad
            }
        }
    }
    
    // Ejecutar query...
}
```

---

## 📋 Resumen de Reglas

### ✅ Reglas de Acceso:

1. **Pastor y Staff:**
   - ✅ Acceso completo al módulo de discipulado
   - ✅ Ven TODA la jerarquía sin filtros
   - ✅ Pueden asignar/modificar jerarquías
   - ✅ No dependen de `hierarchy_level`

2. **Supervisor y Server con hierarchy_level:**
   - ✅ Acceso limitado según su `hierarchy_level`
   - ✅ Ven solo los datos de su nivel y subordinados
   - ✅ Filtros automáticos en queries

3. **Supervisor y Server sin hierarchy_level:**
   - ❌ Sin acceso al módulo de discipulado
   - ❌ Necesitan que se les asigne un nivel

### ✅ Separación de Responsabilidades:

- **`users.role`** → Permisos generales del sistema
- **`discipleship_hierarchy.hierarchy_level`** → Acceso y filtros en discipulado
- **`role_permissions`** → Permisos granulares del sistema general

---

## 🎯 Beneficios de Esta Arquitectura

1. ✅ **Separación clara** entre permisos generales y de discipulado
2. ✅ **Flexibilidad** - un usuario puede tener diferentes roles en diferentes contextos
3. ✅ **Seguridad** - filtros automáticos según jerarquía
4. ✅ **Escalabilidad** - fácil agregar nuevos niveles o permisos
5. ✅ **Mantenibilidad** - lógica clara y separada

