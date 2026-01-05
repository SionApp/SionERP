# Correcciones Pendientes para feature/zonas_DB

## Archivos que necesitan corrección completa:

### 1. handlers/discipleship.go (1538 líneas)
- ✅ Modelos actualizados para incluir ZoneID
- ❌ TODOS los métodos necesitan:
  - Validación de DB
  - Cambiar de zone_name a zone_id con JOIN
  - Actualizar filtros para usar zone_id

### 2. handlers/discipleship_alerts.go
- ✅ Modelos actualizados
- ❌ Necesita:
  - Validación de DB
  - Cambiar consultas para usar zone_id

### 3. handlers/dashboard.go
- ❌ Necesita validación de DB

### 4. Migración SQL
- ⚠️ Necesita mejorarse para manejar casos edge

## Estrategia de corrección:

Dado el gran volumen de cambios, es mejor hacer correcciones críticas primero y luego el resto.

**ORDEN RECOMENDADO:**
1. Validaciones DB en todos (previene panics) - URGENTE
2. GetGroups (más usado) - URGENTE  
3. CreateGroup y UpdateGroup - URGENTE
4. GetZoneStats y GetAnalytics - IMPORTANTE
5. Resto de métodos - Seguir después

¿Procedemos con esta estrategia?

