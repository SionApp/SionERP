# 🔐 Análisis: Roles del Sistema vs Jerarquía de Discipulado

## ⚠️ Problema Identificado

El sistema actualmente **mezcla dos sistemas de roles diferentes**, lo cual puede causar confusión:

### 1. **Roles del Sistema General** (`users.role`)

**Tabla:** `users.role` (enum: `user_role`)
**Valores:** `'pastor'`, `'staff'`, `'supervisor'`, `'server'`
**Propósito:** Permisos generales del sistema (CRUD de usuarios, reportes, etc.)
**Relación:** Se conecta con `role_permissions` para permisos granulares

### 2. **Jerarquía de Discipulado** (`discipleship_hierarchy.hierarchy_level`)

**Tabla:** `discipleship_hierarchy`
**Valores:** `1` (Líder), `2` (Sup. Auxiliar), `3` (Sup. General), `4` (Coordinador), `5` (Pastor)
**Propósito:** Nivel jerárquico específico del ministerio de discipulado
**Relación:** Define quién supervisa a quién en el discipulado

### 3. **Campo Duplicado** (`users.discipleship_level`)

**Tabla:** `users.discipleship_level` (INTEGER)
**Propósito:** Parece ser una copia de `hierarchy_level` en la tabla users
**Problema:** Puede desincronizarse con `discipleship_hierarchy`

---

## 🔍 Cómo Funciona Actualmente

### En `DiscipleshipPage.tsx` (Frontend):

```typescript
const getDiscipleshipLevel = () => {
  if (!user || !user.role) return 1;

  switch (user?.role) {
    case 'pastor':
      return 5; // ❌ Asume que pastor = nivel 5
    case 'staff':
      return 4; // ❌ Asume que staff = nivel 4
    default:
      // Intenta usar hierarchy_level de discipleship_hierarchy
      return (user as unknown as DiscipleshipHierarchy).hierarchy_level || 1;
  }
};
```

**Problemas:**

1. ❌ Asume que `role = 'pastor'` siempre significa `hierarchy_level = 5`
2. ❌ Asume que `role = 'staff'` siempre significa `hierarchy_level = 4`
3. ❌ No consulta la tabla `discipleship_hierarchy` directamente
4. ❌ Depende de que `getUserById()` traiga `hierarchy_level` (que puede no estar)

---

## 📊 Estructura de Datos

### Tabla `users`:

```sql
users (
  id UUID,
  role user_role,              -- 'pastor', 'staff', 'supervisor', 'server'
  discipleship_level INTEGER,  -- ⚠️ Campo duplicado (puede estar desincronizado)
  ...
)
```

### Tabla `discipleship_hierarchy`:

```sql
discipleship_hierarchy (
  id UUID,
  user_id UUID REFERENCES users(id),
  hierarchy_level INTEGER,     -- 1-5 (fuente de verdad para discipulado)
  supervisor_id UUID,
  zone_name TEXT,
  territory TEXT,
  ...
)
```

### Tabla `role_permissions`:

```sql
role_permissions (
  id UUID,
  role user_role,              -- 'pastor', 'staff', etc.
  permission_id UUID,
  ...
)
```

---

## 🎯 Escenarios Problemáticos

### Escenario 1: Pastor sin jerarquía de discipulado

- Usuario tiene `role = 'pastor'`
- NO tiene registro en `discipleship_hierarchy`
- **Resultado:** Se asigna nivel 5 automáticamente ✅ (funciona, pero es asumido)

### Escenario 2: Staff que es Coordinador

- Usuario tiene `role = 'staff'`
- Tiene `hierarchy_level = 3` en `discipleship_hierarchy`
- **Resultado:** Se asigna nivel 4 (incorrecto) ❌
- **Debería ser:** Nivel 3 (Coordinador)

### Escenario 3: Server que es Supervisor

- Usuario tiene `role = 'server'`
- Tiene `hierarchy_level = 2` en `discipleship_hierarchy`
- **Resultado:** Se asigna nivel 2 ✅ (funciona porque cae en el `default`)

### Escenario 4: Usuario sin jerarquía

- Usuario tiene `role = 'server'`
- NO tiene registro en `discipleship_hierarchy`
- **Resultado:** Se asigna nivel 1 (Líder) por defecto ⚠️
- **Problema:** Puede no ser correcto si el usuario no es líder

---

## ✅ Solución Recomendada

### Opción 1: Usar SOLO `discipleship_hierarchy` (Recomendado)

**Ventajas:**

- ✅ Una sola fuente de verdad
- ✅ Más flexible (un pastor puede no estar en discipulado)
- ✅ Permite que cualquier usuario tenga cualquier nivel

**Implementación:**

```typescript
const getDiscipleshipLevel = async (userId: string) => {
  // Consultar directamente la tabla discipleship_hierarchy
  const hierarchy = await DiscipleshipService.getHierarchy(userId);

  if (hierarchy && hierarchy.length > 0) {
    return hierarchy[0].hierarchy_level;
  }

  // Si no tiene jerarquía asignada, retornar null o nivel por defecto
  return null; // O 1 si quieres que todos tengan acceso mínimo
};
```

### Opción 2: Mapeo Explícito con Fallback

**Ventajas:**

- ✅ Mantiene compatibilidad con roles del sistema
- ✅ Permite fallback si no hay jerarquía

**Implementación:**

```typescript
const getDiscipleshipLevel = async (userId: string) => {
  // 1. Intentar obtener de discipleship_hierarchy (fuente de verdad)
  const hierarchy = await DiscipleshipService.getHierarchy(userId);
  if (hierarchy && hierarchy.length > 0) {
    return hierarchy[0].hierarchy_level;
  }

  // 2. Fallback a mapeo de roles (solo si no hay jerarquía)
  const user = await UserService.getUserById(userId);
  switch (user.role) {
    case 'pastor':
      return 5; // Asumir nivel pastoral
    case 'staff':
      return 4; // Asumir nivel supervisor general
    default:
      return 1; // Nivel mínimo (líder)
  }
};
```

### Opción 3: Sincronizar `users.discipleship_level`

**Ventajas:**

- ✅ Acceso rápido sin JOIN
- ✅ Mantiene ambos campos sincronizados

**Implementación:**

- Actualizar `users.discipleship_level` cada vez que se modifica `discipleship_hierarchy`
- Ya se hace parcialmente en `AssignHierarchy` (línea 477-484 de discipleship.go)

---

## 🔧 Cambios Necesarios

### 1. Modificar `DiscipleshipPage.tsx`:

```typescript
const [hierarchyLevel, setHierarchyLevel] = useState<number | null>(null);

useEffect(() => {
  const loadHierarchy = async () => {
    if (!user?.id) return;

    try {
      const hierarchy = await DiscipleshipService.getHierarchy(user.id);
      if (hierarchy && hierarchy.length > 0) {
        setHierarchyLevel(hierarchy[0].hierarchy_level);
      } else {
        // Fallback a mapeo de roles
        const level = user.role === 'pastor' ? 5 : user.role === 'staff' ? 4 : 1;
        setHierarchyLevel(level);
      }
    } catch (error) {
      console.error('Error loading hierarchy:', error);
      setHierarchyLevel(1); // Nivel por defecto
    }
  };

  loadHierarchy();
}, [user]);
```

### 2. Asegurar que `getUserById` incluya `discipleship_level`:

Verificar que el backend devuelva `discipleship_level` en la respuesta de `/users/:id`

### 3. Sincronizar campos:

Asegurar que cuando se actualiza `discipleship_hierarchy`, también se actualice `users.discipleship_level`

---

## 📝 Recomendación Final

**Usar `discipleship_hierarchy` como fuente de verdad principal**, con fallback a roles del sistema solo si no existe jerarquía asignada.

**Razones:**

1. ✅ La jerarquía de discipulado es independiente de los roles del sistema
2. ✅ Un usuario puede tener `role = 'server'` pero ser `hierarchy_level = 3` (coordinador)
3. ✅ Un usuario puede tener `role = 'pastor'` pero no participar en discipulado
4. ✅ Permite mayor flexibilidad y casos de uso reales
