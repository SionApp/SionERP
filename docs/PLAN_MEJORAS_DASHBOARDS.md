# Plan de Mejoras para Dashboards de Discipulado

## 📊 Estado Actual

### ✅ LeaderDashboard (Nivel 1) - COMPLETO
- ✅ Hook específico: `useLeaderDiscipleshipData`
- ✅ Historial de reportes
- ✅ Validación de período
- ✅ Modal para crear reportes
- ✅ Estados de reporte

### ❌ AuxiliarySupervisorDashboard (Nivel 2) - FALTA
- ❌ Hook específico
- ❌ Historial de reportes
- ❌ Validación de período quincenal
- ❌ Formulario inline (debería ser modal)

### ❌ GeneralSupervisorDashboard (Nivel 3) - FALTA
- ❌ Hook específico
- ❌ Historial de reportes
- ❌ Validación de período mensual
- ❌ Formulario inline (debería ser modal)

### ❌ CoordinatorDashboard (Nivel 4) - FALTA
- ❌ Hook específico
- ❌ Historial de reportes
- ❌ Validación de período trimestral
- ❌ Formulario inline (debería ser modal)

### ✅ PastoralDashboard (Nivel 5) - OK
- ✅ Solo aprueba reportes (no crea)
- ✅ Tiene cola de aprobaciones
- ✅ No necesita cambios

---

## 🎯 Mejoras a Implementar

### 1. Crear Hooks Específicos

#### `useAuxiliarySupervisorData` (Nivel 2)
```typescript
- Cargar grupos supervisados
- Cargar reportes del supervisor
- Cargar stats del dashboard
```

#### `useGeneralSupervisorData` (Nivel 3)
```typescript
- Cargar subordinados
- Cargar reportes del supervisor
- Cargar stats del dashboard
- Cargar zoneStats
```

#### `useCoordinatorData` (Nivel 4)
```typescript
- Cargar subordinados
- Cargar reportes del coordinador
- Cargar stats del dashboard
- Cargar goals
- Cargar zoneStats
```

### 2. Agregar Historial de Reportes

Todos los dashboards (2, 3, 4) deben mostrar:
- Últimos 5 reportes enviados
- Estado de cada reporte (Badge)
- Período del reporte
- Resumen de datos principales

### 3. Validación de Período

- **Nivel 2**: Validar si ya existe reporte quincenal para el período actual
- **Nivel 3**: Validar si ya existe reporte mensual para el mes actual
- **Nivel 4**: Validar si ya existe reporte trimestral para el trimestre actual

### 4. Mejorar UX (Opcional pero Recomendado)

- Convertir formularios inline a modales
- Agregar indicador de estado del reporte
- Mejorar validaciones visuales

---

## 📋 Orden de Implementación

1. ✅ **LeaderDashboard** - Ya completado
2. **AuxiliarySupervisorDashboard** (Nivel 2) - Prioridad Alta
3. **GeneralSupervisorDashboard** (Nivel 3) - Prioridad Media
4. **CoordinatorDashboard** (Nivel 4) - Prioridad Media
5. **PastoralDashboard** - No requiere cambios

---

## 🔧 Cambios Necesarios por Dashboard

### AuxiliarySupervisorDashboard
- [ ] Crear `useAuxiliarySupervisorData` hook
- [ ] Agregar sección "Mis Reportes Recientes"
- [ ] Agregar validación de período quincenal
- [ ] Convertir formulario a modal (opcional)
- [ ] Agregar indicador de estado del reporte

### GeneralSupervisorDashboard
- [ ] Crear `useGeneralSupervisorData` hook
- [ ] Agregar sección "Mis Reportes Recientes"
- [ ] Agregar validación de período mensual
- [ ] Convertir formulario a modal (opcional)
- [ ] Agregar indicador de estado del reporte

### CoordinatorDashboard
- [ ] Crear `useCoordinatorData` hook
- [ ] Agregar sección "Mis Reportes Recientes"
- [ ] Agregar validación de período trimestral
- [ ] Convertir formulario a modal (opcional)
- [ ] Agregar indicador de estado del reporte

---

## 📝 Notas

- Los hooks deben seguir el mismo patrón que `useLeaderDiscipleshipData`
- La validación de período debe usar `date-fns` como en LeaderDashboard
- El historial debe mostrar los últimos 5 reportes con badges de estado
- Los modales son opcionales pero mejoran la UX significativamente

