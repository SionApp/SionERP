# Proyecto Sion - Monorepo

Este es el monorepo para el proyecto de la Iglesia Sion, que incluye el sitio web público y el panel administrativo.

## Estructura del Proyecto

```
├── apps/
│   ├── public-site/     # Sitio web público de la iglesia
│   └── admin-panel/     # Panel administrativo
├── packages/
│   ├── shared-ui/       # Componentes UI compartidos
│   ├── shared-types/    # Tipos TypeScript compartidos
│   └── shared-utils/    # Utilidades compartidas
└── supabase/           # Configuración de Supabase
```

## Scripts Disponibles

### Desarrollo

```bash
# Ejecutar solo el sitio público
npm run dev

# Ejecutar solo el panel administrativo
npm run dev:admin

# Ejecutar ambos proyectos simultáneamente
npm run dev:all
```

### Construcción

```bash
# Construir todos los proyectos
npm run build

# Construir solo el sitio público
npm run build:public

# Construir solo el panel administrativo
npm run build:admin
```

## Configuración

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno (ver `.env.example`)

3. Configurar Supabase:
   - El proyecto ya está conectado a Supabase
   - Las migraciones se ejecutan automáticamente

## Tecnologías

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Autenticación**: Supabase Auth
- **Routing**: React Router
- **State Management**: React Query + Context API

## Estructura de Datos

### Usuarios
- Información personal y de contacto
- Estado de bautismo
- Roles y permisos
- Preferencias de comunicación

### Transmisiones en Vivo
- Gestión de links de YouTube
- Programación de eventos
- Estado activo/inactivo

## Desarrollo

Cada aplicación puede desarrollarse independientemente:

- `apps/public-site`: Sitio web público con información de la iglesia
- `apps/admin-panel`: Panel administrativo para gestión de usuarios y contenido

Los packages compartidos permiten reutilizar código entre aplicaciones:

- `@sion/shared-ui`: Componentes de interfaz
- `@sion/shared-types`: Tipos TypeScript
- `@sion/shared-utils`: Funciones utilitarias

## Editar este Código

**Usando Lovable**

Visita el [Proyecto en Lovable](https://lovable.dev/projects/e3333ca8-df10-425d-82f3-f0754d3fb978) y comienza a hacer prompts.

**Usando tu IDE Preferido**

```sh
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm install
npm run dev
```
