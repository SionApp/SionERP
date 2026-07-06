# Capturas del Manual de Usuario

Pipeline para generar las capturas que se embeben en el Manual de Usuario (Notion).

## Flujo (3 pasos)

```bash
# 1. Levantá la app (corre en http://localhost:8080)
pnpm dev

# 2. En otra terminal: tus credenciales + captura
export MANUAL_EMAIL=tu@correo
export MANUAL_PASSWORD=tuclave
pnpm exec playwright test tests/e2e/manual/manual-capture.spec.ts

# 3. Subí las capturas al bucket público y obtené las URLs
export SUPABASE_URL=https://rpacdeyavjodixeymzpb.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
node docs/screenshots/upload.mjs
```

El paso 3 escribe `docs/screenshots/urls.json` con las URLs públicas. Pasámelas (o el archivo) y las incrusto en Notion.

## Notas

- Las credenciales y la service-role key se leen de variables de entorno: **nunca quedan en el repo**.
- Las imágenes (`*.png`) y `urls.json` están en `.gitignore` — viven en el bucket `manual-screenshots`, no en git.
- El bucket es **público**: cualquiera con la URL ve la imagen. Para las capturas, conviene usar una **cuenta de demo con datos de ejemplo**, no datos reales de miembros.
- Para agregar pantallas, editá el array `SCREENS` en `tests/e2e/manual/manual-capture.spec.ts`.
