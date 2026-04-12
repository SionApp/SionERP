

# Plan: Generar archivo .md con correcciones de zonas, grupos y responsive

## Archivos a corregir (6 archivos)

### 1. `src/components/discipleship/GroupManagement.tsx`
- Eliminar `const ZONES = [...]` (line 42)
- Importar `useZones` de `@/hooks/useZones`
- Agregar `const { zones } = useZones();` dentro del componente
- Agregar helper `getNum` para extraer valor numerico de `TypeGeolocalization`
- Lines 227-228: usar `getNum(geolocation?.latitude)` y `getNum(geolocation?.longitude)`
- Lines 640-641: mismo patron con `getNum(value.latitude)`, `getNum(value.longitude)`
- Selectores de zona (lines 544-549, 699-703): cambiar `ZONES.map` por `zones.map(z => <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>)`
- En submit: agregar `zone_id` buscando la zona por nombre
- Responsive: `grid-cols-2` a `grid-cols-1 sm:grid-cols-2`, `grid-cols-3` a `grid-cols-1 sm:grid-cols-3`

### 2. `src/components/discipleship/UserZoneAssignment.tsx`
- Eliminar `mockZones` y `mockUsers` completamente
- Importar `useZones`, `ApiService`, `ZonesService`
- Cargar zonas reales con `useZones()`
- Cargar usuarios reales con `ApiService.get('/users')` en un `useEffect`
- `handleAssignToZone`: llamar `ZonesService.assignUserToZone(zoneId, userId)`
- Responsive: user cards `flex-col sm:flex-row`

### 3. `src/components/discipleship/HierarchyManagement.tsx`
- Eliminar `const ZONES = [...]` (line 38)
- Importar `useZones` y usar `const { zones } = useZones();`
- Lines 480-484: cambiar a `zones.map(z => <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>)`

### 4. `src/components/discipleship/DiscipleshipMap.tsx`
- Lines 39, 48, 57: cambiar tipo `Layer` a `React.ComponentProps<typeof Layer>`
- Line 245: `useMemo<React.ComponentProps<typeof Layer>>`

### 5. `src/services/zones.service.ts`
- Agregar `return [];` al final de `getAvailableSupervisors()`

### 6. `src/components/ui/geolocation-input.tsx`
- Line 71: `ReturnType<typeof setTimeout>` en vez de `NodeJS.Timeout`
- Eliminar `console.log(value, 'value')` en line 69

## Entregable

Archivo `/mnt/documents/CORRECCIONES_ZONAS_GRUPOS.md` con el codigo completo de cada seccion a reemplazar, organizado por archivo.

