# Proyecto Sion - Sistema de Gestión Iglesia

Sistema completo para la gestión de la Iglesia Sion que incluye sitio web público, panel administrativo y API backend en Go.

## 🏗️ Arquitectura del Proyecto

```
├── apps/
│   ├── public-site/        # 🌐 Sitio web público de la iglesia
│   ├── admin-panel/        # 👥 Panel administrativo unificado
│   └── backend-go/         # 🔧 API Backend en Go con Echo Framework
├── packages/
│   ├── shared-ui/          # 🎨 Componentes UI compartidos
│   ├── shared-types/       # 📝 Tipos TypeScript compartidos
│   └── shared-utils/       # 🛠️ Utilidades compartidas
├── supabase/               # 🗃️ Configuración y migraciones de BD
├── start-dev.sh           # 🚀 Script para levantar todo
└── start-admin.sh         # 🚀 Script para backend + admin
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

#### 🎯 Opción 1: Todo el Entorno (Recomendado)
```bash
# Dale permisos de ejecución al script
chmod +x start-dev.sh

# Ejecuta todo: Backend + Admin + Sitio Público
./start-dev.sh
```

#### 🎯 Opción 2: Solo Backend + Admin
```bash
# Dale permisos de ejecución al script
chmod +x start-admin.sh

# Ejecuta solo: Backend + Panel Admin
./start-admin.sh
```

#### 🎯 Opción 3: Manual
```bash
# Terminal 1: Backend Go
cd apps/backend-go
go run main.go

# Terminal 2: Panel Admin
cd apps/admin-panel
pnpm dev

# Terminal 3: Sitio Público
cd apps/public-site
pnpm dev
```

### 🌐 URLs de Acceso

Una vez ejecutado, tendrás acceso a:

- **🟦 Backend API**: http://localhost:8080
- **🟩 Panel Admin**: http://localhost:3001
- **🟨 Sitio Público**: http://localhost:3000

## 📱 Funcionalidades

### Panel Administrativo (`apps/admin-panel/`)
- **🔐 Autenticación**: Login y registro de administradores
- **👥 Gestión de Usuarios**: CRUD completo con roles y permisos
- **📊 Dashboard**: Estadísticas en tiempo real
- **📺 Transmisiones**: Gestión de links de YouTube Live
- **⚙️ Configuración**: Ajustes del sistema
- **📝 Auditoría**: Logs de todas las acciones

### Sitio Web Público (`apps/public-site/`)
- **🏠 Página Principal**: Información de la iglesia
- **📺 Transmisión en Vivo**: Integración con YouTube
- **📧 Newsletter**: Suscripción a boletín
- **📞 Contacto**: Formulario de contacto
- **📱 Responsive**: Totalmente adaptable

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
apps/admin-panel/src/
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
# Desarrollo individual
pnpm dev                    # Solo sitio principal
cd apps/admin-panel && pnpm dev   # Solo panel admin
cd apps/public-site && pnpm dev   # Solo sitio público
cd apps/backend-go && go run main.go  # Solo backend

# Build
pnpm build                  # Build principal
cd apps/admin-panel && pnpm build     # Build admin
cd apps/public-site && pnpm build     # Build público

# Linting
pnpm lint                   # Linter
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

### Frontend (Lovable/Vercel/Netlify)
```bash
pnpm build:admin    # Build del panel admin
pnpm build:public   # Build del sitio público
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

- **El admin panel** ahora incluye tanto login como registro
- **Todo está conectado con Go** - el frontend no maneja lógica de negocio
- **Supabase** se usa solo para autenticación y almacenamiento
- **Go + Echo** maneja toda la lógica del backend
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
lsof -ti:3001 | xargs kill -9  # Admin
lsof -ti:3000 | xargs kill -9  # Public
```

### Error: "Supabase connection"
Verifica las variables de entorno en `apps/backend-go/.env`

## 📧 Soporte

Si tienes problemas para levantar el proyecto:

1. Verifica que tengas todas las dependencias instaladas
2. Revisa que las variables de entorno estén configuradas
3. Usa los scripts `start-dev.sh` o `start-admin.sh`
4. Revisa los logs en cada terminal para identificar errores específicos

---

**¡Proyecto desarrollado con ❤️ para la Iglesia Sion!**