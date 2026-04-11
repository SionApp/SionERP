# Análisis de Mocks Obsoletos

## Resumen

Los archivos de mocks en `src/mocks/discipleship/` son **obsoletos** y ya no deberían usarse porque:

1. ✅ **Backend Go está funcionando** - Todos los endpoints reales están implementados
2. ✅ **Servicios reales están en uso** - `DiscipleshipService` y `DiscipleshipAnalyticsService` usan el backend
3. ⚠️ **Algunos componentes todavía usan mocks** - Necesitan migración

---

## Estado Actual de Uso de Mocks

### ❌ Archivos Mock Obsoletos

- `src/mocks/discipleship/data.mock.ts` - Datos mock hardcodeados
- `src/mocks/discipleship/services.mock.ts` - Servicio mock `DiscipleshipMockService`

### 🔍 Componentes que AÚN usan Mocks

#### 1. `DiscipleshipMap.tsx`
**Uso actual:**
```typescript
import { mockGroups } from '@/mocks/discipleship/data.mock';
```
- Línea 11: Importa `mockGroups`
- Línea 73-141: Usa `mockGroups` para mostrar grupos en el mapa
- Línea 199: Usa `mockGroups.length` para estadísticas

**✅ Debería usar:**
```typescript
import { DiscipleshipService } from '@/services/discipleship.service';
// O usar el hook useDiscipleshipData
```

---

#### 2. `UserZoneAssignment.tsx`
**Uso actual:**
- Líneas 26-32: `mockZones` hardcodeados
- Líneas 49-108: `mockUsers` hardcodeados
- Línea 115: `const [users, setUsers] = useState<AssignmentUser[]>(mockUsers)`

**✅ Debería usar:**
```typescript
import { UserService } from '@/services/user.service';
import { ZonesService } from '@/services/zones.service';
import { useZones } from '@/hooks/useZones';
```

---

#### 3. `PersonalDashboard.tsx`
**Uso actual:**
- Línea 21: `import { mockNotifications } from '@/mocks/discipleship/data.mock'`
- Línea 49: `const [notifications, setNotifications] = React.useState(mockNotifications)`

**✅ Debería usar:**
- Sistema de notificaciones real desde el backend
- O crear un hook para notificaciones

---

#### 4. Tests
**Uso actual:**
- `src/__tests__/utils/permissions.test.ts` - Usa `DiscipleshipMockService`
- `src/__tests__/services/user.service.test.ts` - Usa mocks

**✅ Esto está BIEN** - Los tests DEBEN usar mocks para no depender del backend real

---

## ✅ Componentes que YA usan Backend Real

- ✅ `PastoralDashboard.tsx` → `useDiscipleshipData({ level: 5 })` → Backend Go
- ✅ `GeneralSupervisorDashboard.tsx` → `useGeneralSupervisorData()` → Backend Go
- ✅ `AuxiliarySupervisorDashboard.tsx` → `useAuxiliarySupervisorData()` → Backend Go
- ✅ `CoordinatorDashboard.tsx` → `useCoordinatorData()` → Backend Go
- ✅ `LeaderDashboard.tsx` → `useLeaderDiscipleshipData()` → Backend Go
- ✅ `GroupManagement.tsx` → `DiscipleshipService` → Backend Go
- ✅ `HierarchyManagement.tsx` → `DiscipleshipService` → Backend Go
- ✅ `ZoneManagement.tsx` → `useZones()` → Backend Go (zones reales)

---

## 🎯 Plan de Migración

### Prioridad ALTA (Funcionalidad Principal)

1. **Migrar `DiscipleshipMap.tsx`** 🔴
   - Usar `DiscipleshipService.getGroups()` en lugar de `mockGroups`
   - Cargar coordenadas reales desde grupos (si están en BD)
   - **Tiempo estimado**: 30 minutos

2. **Migrar `UserZoneAssignment.tsx`** 🔴
   - Usar `UserService.getUsers()` para usuarios reales
   - Usar `useZones()` para zonas reales
   - Conectar con backend para asignaciones
   - **Tiempo estimado**: 1 hora

### Prioridad MEDIA (Nice to have)

3. **Migrar `PersonalDashboard.tsx`** 🟡
   - Crear sistema de notificaciones real o remover
   - **Tiempo estimado**: 30 minutos

4. **Limpiar mocks obsoletos** 🟡
   - Eliminar archivos mock que no se usen
   - Mantener solo para tests
   - **Tiempo estimado**: 15 minutos

---

## 📋 Recomendación Final

### Opción 1: Eliminar Mocks Completamente (Recomendado)

1. **Migrar componentes que usan mocks** al backend real
2. **Eliminar** `src/mocks/discipleship/data.mock.ts` y `services.mock.ts`
3. **Crear mocks específicos para tests** en `src/__tests__/mocks/` si se necesitan

### Opción 2: Mantener Solo para Tests

1. **Mover mocks a carpeta de tests**: `src/__tests__/mocks/discipleship/`
2. **Migrar componentes** al backend real
3. **Usar mocks solo en tests**

---

## ✅ Ventajas de Eliminar Mocks

1. **Datos reales** - Los dashboards mostrarán información actual
2. **Menos confusión** - No hay datos de prueba mezclados
3. **Mejor testing** - Tests más enfocados en lógica, no en datos mock
4. **Código más limpio** - Menos archivos obsoletos

---

## ⚠️ Qué Mantener

**Solo mantener mocks para:**
- ✅ Tests unitarios
- ✅ Tests de integración
- ✅ Desarrollo local sin backend (opcional)

**NO mantener para:**
- ❌ Componentes de producción
- ❌ Dashboards reales
- ❌ Servicios que ya tienen backend

