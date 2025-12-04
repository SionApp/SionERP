# Generación Automática de Tipos TypeScript

## 📋 Scripts Disponibles

### Generar tipos desde base de datos local

```bash
npm run types:generate
```

Genera los tipos desde tu base de datos local de Supabase (requiere que `supabase start` esté corriendo).

### Generar tipos desde proyecto remoto

```bash
npm run types:generate:linked
```

Genera los tipos desde tu proyecto remoto vinculado en Supabase (requiere `supabase link`).

## 🔄 Flujo de Trabajo Recomendado

### Después de crear una migración:

1. **Aplicar la migración:**

   ```bash
   supabase db reset  # Reinicia y aplica todas las migraciones
   # O
   supabase migration up  # Aplica solo las nuevas migraciones
   ```

2. **Regenerar los tipos:**

   ```bash
   npm run types:generate
   ```

3. **Verificar que todo funciona:**
   ```bash
   npm run lint
   ```

### Workflow completo:

```bash
# 1. Crear nueva migración
supabase migration new nombre_de_migracion

# 2. Editar el archivo SQL en supabase/migrations/

# 3. Aplicar la migración
supabase db reset

# 4. Regenerar tipos automáticamente
npm run types:generate

# 5. Verificar que no hay errores
npm run lint
```

## ⚠️ Importante

- **NO edites manualmente** `src/integrations/supabase/types.ts`
- Este archivo se sobrescribe cada vez que ejecutas `npm run types:generate`
- Si necesitas tipos personalizados, créalos en archivos separados (ej: `src/types/settings.types.ts`)

## 🔍 Verificación

Para verificar que los tipos están actualizados:

```bash
# Ver qué tablas están en los tipos generados
grep -E "^      [a-z_]+: \{" src/integrations/supabase/types.ts
```

## 📝 Notas

- Los tipos se generan directamente desde el esquema de PostgreSQL
- Incluye automáticamente: tablas, vistas, funciones, enums, y relaciones
- Compatible con PostgREST v13.0.4+
- Se mantiene sincronizado con tu base de datos real
