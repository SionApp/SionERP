# Proyecto Sion - Sistema de Gestión Iglesia

Sistema completo para la gestión de la Iglesia Sion que incluye sitio web público, panel administrativo y API backend en Go.

## 🏗️ Arquitectura del Proyecto

```
├── apps/
│   └── backend-go/         # 🔧 API Backend en Go con Echo Framework
├── packages/
│   ├── shared-ui/          # 🎨 Componentes UI compartidos
│   ├── shared-types/       # 📝 Tipos TypeScript compartidos
│   └── shared-utils/       # 🛠️ Utilidades compartidas
├── src/                    # 🌐 Frontend React (sitio web + admin)
├── supabase/               # 🗃️ Configuración y migraciones de BD
└── scripts/                # 🚀 Scripts de desarrollo
```

## 🚀 Inicio Rápido

### Prerrequisitos

- **Node.js** 18+ y **pnpm**
- **Go** 1.21+
- **Supabase CLI** (opcional, para desarrollo avanzado)

```bash
# Instalar pnpm si no lo tienes
npm install -g pnpm

# Verificar instalaciones
node --version
pnpm --version
go version
```

### Desarrollo Local con Supabase

Para trabajar en el entorno local sin afectar producción:

1. **Prerrequisitos:**
   - Docker Desktop instalado y corriendo
   - Supabase CLI instalado (`brew install supabase/tap/supabase`)

2. **Iniciar Supabase Local:**

   ```bash
   supabase start
   ```

   Esto iniciará los servicios locales en `http://127.0.0.1:54321`.

3. **Configuración de Entorno:**
   El archivo `.env.local` ya debería estar configurado con las credenciales locales:

   ```env
   VITE_SUPABASE_URL=http://127.0.0.1:54321
   VITE_SUPABASE_ANON_KEY=sb_publishable_...
   ```

4. **Comandos Útiles:**
   - `supabase status`: Ver URLs y claves del entorno local
   - `supabase stop`: Detener los servicios
   - `supabase db reset`: Reiniciar la base de datos (borra datos locales y reaplica esquema)
   - `supabase db dump --linked > supabase/migrations/new_migration.sql`: Crear backup del esquema de producción

5. **Acceso a Datos:**
   - Studio Local: [http://127.0.0.1:54323](http://127.0.0.1:54323)
   - Mailpit (Emails): [http://127.0.0.1:54324](http://127.0.0.1:54324)

6. **🔄 Flujo Diario (Al encender la laptop):**

   ```bash
   # 1. Iniciar Docker Desktop (si no arranca solo)

   # 2. Iniciar Supabase
   supabase start

   # 3. Iniciar la App
   npm run dev
   ```

   > **Nota:** Si Supabase falla al iniciar, usa `supabase stop` y luego `supabase start`.

### Instalación

```bash
# 1. Clonar el repositorio
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# 2. Instalar dependencias
pnpm install

# 3. Configurar variables de entorno
cp apps/backend-go/.env.example apps/backend-go/.env
# Editar apps/backend-go/.env con tus valores de Supabase
```

### Ejecutar el Proyecto

#### 🎯 Opción 1: Desarrollo Completo (Recomendado)

```bash
# Terminal 1: Backend Go
cd apps/backend-go
go run .

# Terminal 2: Frontend (React)
pnpm install
pnpm dev
```

#### 🎯 Opción 2: Solo Backend

```bash
cd apps/backend-go
go run .
```

#### 🎯 Opción 3: Solo Frontend

```bash
pnpm install
pnpm dev
```

### 🌐 URLs de Acceso

Una vez ejecutado, tendrás acceso a:

- **🟦 Backend API**: http://localhost:8080
- **🌐 Frontend**: http://localhost:5173 (Vite dev server)

## 📱 Funcionalidades

### Frontend React (`src/`)

- **🔐 Autenticación**: Login y registro de usuarios
- **👥 Gestión de Usuarios**: CRUD completo con roles y permisos
- **📊 Dashboard**: Estadísticas en tiempo real
- **📺 Transmisiones**: Gestión de links de YouTube Live
- **🏠 Sitio Web Público**: Información de la iglesia
- **📧 Newsletter**: Suscripción a boletín
- **📞 Contacto**: Formulario de contacto
- **📱 Responsive**: Totalmente adaptable
- **📝 Auditoría**: Logs de todas las acciones

### Backend API (`apps/backend-go/`)

- **🔧 Go + Echo**: Framework rápido y eficiente
- **🗃️ Supabase**: Base de datos PostgreSQL
- **🔐 JWT**: Autenticación y autorización
- **📊 Endpoints**: API RESTful completa
- **⚡ Real-time**: WebSockets para actualizaciones

## 🔧 Tecnologías

### Frontend

- **React** 18 + **TypeScript**
- **Vite** (Build tool)
- **Tailwind CSS** + **shadcn/ui**
- **React Router** (Navegación)
- **React Query** (Estado servidor)
- **React Hook Form** + **Zod** (Formularios)

### Backend

- **Go** + **Echo Framework**
- **Supabase** (PostgreSQL + Auth)
- **JWT** (Autenticación)
- **CORS** (Cross-origin)

### Infraestructura

- **Supabase** (Base de datos y autenticación)
- **pnpm workspaces** (Monorepo)
- **ESLint** + **TypeScript** (Linting)

## 📊 Base de Datos

### Tablas Principales

- **users**: Usuarios del sistema con roles
- **audit_logs**: Registro de todas las acciones
- **live_streams**: Gestión de transmisiones
- **profiles**: Perfiles extendidos de usuarios

### Características

- **RLS (Row Level Security)**: Seguridad a nivel de fila
- **Real-time**: Actualizaciones en tiempo real
- **Triggers**: Auditoría automática
- **Policies**: Control de acceso granular

## 🛠️ Desarrollo

### Estructura de Directorios

```
src/
├── components/          # Componentes React
├── pages/              # Páginas principales
├── hooks/              # Custom hooks
├── contexts/           # Context providers
├── lib/                # Utilidades
└── types/              # Tipos TypeScript

apps/backend-go/
├── config/             # Configuración
├── handlers/           # Controladores HTTP
├── middleware/         # Middlewares
├── models/             # Modelos de datos
└── routes/             # Definición de rutas
```

### Scripts Útiles

```bash
# Desarrollo
pnpm dev                    # Frontend (React)
cd apps/backend-go && go run .  # Backend (Go)

# Build
pnpm build                  # Build del frontend
cd apps/backend-go && go build .  # Build del backend

# Linting
pnpm lint                   # Linter del frontend
```

## 🔐 Variables de Entorno

### Backend Go (`apps/backend-go/.env`)

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
JWT_SECRET=your_jwt_secret
PORT=8080
```

## 🚢 Despliegue

### Frontend (Vercel/Netlify)

```bash
pnpm build    # Build del frontend
```

### Backend (Railway/Heroku/Digital Ocean)

```bash
cd apps/backend-go
go build -o main .
./main
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Notas Importantes

- **Frontend unificado** - React con sitio público y panel admin en una sola aplicación
- **Backend en Go** - API REST con Echo Framework
- **Supabase** para base de datos y autenticación
- **Monorepo** con packages compartidos para UI, tipos y utilidades
- **Real-time** mediante WebSockets desde Supabase Edge Functions

## 🆘 Solución de Problemas

### Error: "pnpm not found"

```bash
npm install -g pnpm
```

### Error: "go not found"

Instala Go desde https://golang.org/dl/

### Error: "Puerto ocupado"

```bash
# Matar procesos en puertos específicos
lsof -ti:8080 | xargs kill -9  # Backend
lsof -ti:5173 | xargs kill -9  # Frontend (Vite)
```

### Error: "Supabase connection"

Verifica las variables de entorno en `apps/backend-go/.env`

## 📧 Soporte

Si tienes problemas para levantar el proyecto:

1. Verifica que tengas todas las dependencias instaladas (Go, Node.js, pnpm)
2. Revisa que las variables de entorno estén configuradas en `apps/backend-go/.env`
3. Ejecuta `pnpm install` en la raíz del proyecto
4. Para el backend: `cd apps/backend-go && go run .`
5. Para el frontend: `pnpm dev`
6. Revisa los logs en cada terminal para identificar errores específicos

---

**¡Proyecto desarrollado con ❤️ para la Iglesia Sion!**
