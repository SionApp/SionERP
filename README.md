# SionERP

Sistema de gestión para iglesias cristianas, con foco en **discipulado** (células),
**zonas geográficas** y la **jerarquía de liderazgo** ministerial. Incluye módulos de
músicos, eventos y reportes de trazabilidad.

> Pensado para el día a día de un pastor o administrador de iglesia — no es un ERP corporativo.

- **Web (producción):** https://sion-erp.vercel.app
- **API (producción):** https://sionerp.onrender.com
- **App Android:** ver [Releases](https://github.com/SionApp/SionERP/releases)

---

## Stack

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 18 · TypeScript · Vite 5 · Tailwind CSS 3 · shadcn/ui · TanStack Query · React Hook Form · Zod |
| **Backend** | Go 1.24 · Echo v4 · JWT |
| **Base de datos** | Supabase (PostgreSQL) |
| **Mobile** | Capacitor 8 (Android / iOS) · PWA |
| **Mapas** | Leaflet · Terra Draw |
| **Testing** | Vitest + Testing Library (front) · `go test` (back) |
| **Monorepo** | pnpm workspace (frontend en la raíz, backend en `apps/backend-go/`) |

---

## Estructura

```
SionERP/
├── src/                      # Frontend React
│   ├── pages/dashboard/      # Dashboards por módulo y por nivel jerárquico
│   ├── components/           # UI (incl. components/mobile para pantallas mobile)
│   ├── services/             # Llamadas a la API (api.service, discipleship.service, …)
│   ├── hooks/                # Hooks (useMobileMode, useAuth, data hooks por rol…)
│   └── integrations/supabase # Cliente Supabase
├── apps/backend-go/          # API REST en Go
│   ├── main.go               # Entrada
│   ├── routes/               # Definición de rutas
│   ├── handlers/             # Controladores HTTP
│   ├── middleware/           # Auth (JWT) + permisos por rol/módulo
│   └── config/               # DB, Supabase, email
├── supabase/migrations/      # Migraciones SQL
├── android/ · ios/           # Proyectos nativos Capacitor
└── docs/                     # Documentación técnica
```

---

## Requisitos

- **Node 22+** y **pnpm**
- **Go 1.24+** (para el backend)
- **Supabase CLI** (para la base de datos local)
- **Docker** (lo usa Supabase local)
- Para compilar Android: **JDK 21** (Temurin recomendado) + Android SDK

---

## Puesta en marcha (local)

```bash
# 1. Dependencias
pnpm install

# 2. Base de datos local (Supabase)
supabase start
supabase db reset            # aplica migraciones + seed

# 3. Variables de entorno
cp .env.example .env.local   # completar (ver abajo)

# 4. Backend (en otra terminal)
cd apps/backend-go
go run .                     # levanta en :8181

# 5. Frontend
pnpm dev                     # http://localhost:8080
```

### Variables de entorno

**Frontend** (`.env.local`):

| Variable | Descripción |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave pública (anon) de Supabase |
| `VITE_API_URL` | URL del backend Go (ej. `http://localhost:8181`) |

**Backend** (`apps/backend-go`, vía entorno):

| Variable | Descripción |
|----------|-------------|
| `SUPABASE_DB_URL` | Connection string de Postgres (en local agrega `sslmode=disable` automáticamente) |
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave `service_role` (privada) |
| `JWT_SECRET` | Secreto JWT del proyecto Supabase |
| `FRONTEND_URL` | Origen permitido para CORS |
| `PORT` | Puerto (lo inyecta el host en producción) |

---

## Scripts

```bash
pnpm dev                 # dev server (Vite)
pnpm build               # build de producción → dist/
pnpm test                # tests (Vitest, watch)
pnpm test:run            # tests una vez
pnpm lint                # ESLint
pnpm format              # Prettier
pnpm types:generate      # regenerar tipos TS desde Supabase local
```

---

## Mobile (Capacitor)

El proyecto sigue una filosofía **mobile-dedicado**, no responsive: las pantallas mobile
son componentes propios (`src/components/mobile/`), no adaptaciones del layout web.

El hook `useMobileMode()` decide qué render mostrar:
- **Producción:** `true` solo dentro de la app nativa (Capacitor).
- **Desarrollo:** agregá `?m=1` a la URL para previsualizar el modo mobile en el navegador
  (`?m=0` lo desactiva).

### Compilar el APK (Android)

```bash
# 1. Build web apuntando a producción
VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... VITE_API_URL=... pnpm build

# 2. Sincronizar al proyecto nativo
pnpm exec cap sync android

# 3. Compilar (JDK 21 / Android SDK)
cd android
JAVA_HOME=<jdk-21> ANDROID_HOME=<sdk> ./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

La firma de release lee `android/keystore.properties` (gitignored). Copiá
`android/keystore.properties.example` y completá tus credenciales. Sin ese archivo, el
build de release queda sin firmar.

---

## Deploy

Push a `develop` deploya **ambos** entornos automáticamente:

| Pieza | Plataforma | Trigger |
|-------|-----------|---------|
| Frontend | Vercel | push a `develop` (SPA via `vercel.json`) |
| Backend | Render | push a `develop` (start command `./app`) |
| Base de datos | Supabase Cloud | migraciones aplicadas manualmente |

```bash
git add . && git commit -m "feat: ..."
git push origin develop   # → Render + Vercel redeploy
```

---

## Convenciones

- **Commits:** Conventional Commits (validados con commitlint).
- **Formato:** Prettier (comillas simples, punto y coma, ancho 100).
- **Mobile-first:** toda UI debe funcionar primero en mobile.
- **Idioma:** la app y el equipo trabajan en español (rioplatense).

---

## Documentación

- [`docs/INDICE_TECNICO.md`](docs/INDICE_TECNICO.md) — documento técnico completo
- [`docs/FLUJO_DISCIPULADO.md`](docs/FLUJO_DISCIPULADO.md) — flujo de datos del módulo de discipulado
- [`MANUAL_USUARIO.md`](MANUAL_USUARIO.md) — manual de usuario
- [`CLAUDE.md`](CLAUDE.md) — contexto para agentes AI
