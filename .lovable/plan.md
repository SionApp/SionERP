# Plan: Ajustes mobile-first del frontend (dashboard)

## Alcance y reglas

- **Solo mobile**: cada cambio es agregar/ajustar clases responsivas. Lo que ya existe para desktop (`md:`, `lg:`) se conserva intacto. Cuando hoy hay clases fijas (ej. `p-6`), se reemplazan por `p-3 sm:p-4 md:p-6` para que no afecten desktop.
- **No se toca el sitio público** (`Index`, `Header`, `Hero`, `Services`, `About`, `Contact`, `Footer`, `Gallery`, `Login`, `Register`).
- **No se toca el módulo Discipulado** (`src/components/discipleship/*` ni `src/pages/dashboard/discipleship/*`), ya ajustado en iteraciones previas.
- **No se tocan los primitivos** `src/components/ui/*` (shadcn).
- Breakpoint objetivo principal: **≤414px** (iPhone SE/12). Se usan los breakpoints de Tailwind por defecto (`sm:640`, `md:768`, `lg:1024`).

## Patrones aplicados

```text
- Padding fijo p-6  ->  p-3 sm:p-4 md:p-6
- space-y-6         ->  space-y-4 sm:space-y-6
- gap-6             ->  gap-3 sm:gap-4 md:gap-6
- grid-cols-4 fijo  ->  grid-cols-2 sm:grid-cols-2 md:grid-cols-4
- flex justify-between (header de página) -> flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3
- Botones de acción full-width en mobile (w-full sm:w-auto)
- TabsList con muchos tabs -> overflow-x-auto + min-w-max
- DialogContent ancho fijo -> max-w-[95vw] sm:max-w-... + max-h-[90vh] overflow-y-auto
- Texto largo: truncate + text-xs sm:text-sm
- Header fijo con padding lateral grande (px-6) -> px-3 sm:px-6
- Cards con CardContent p-6 -> p-3 sm:p-4 md:p-6
- Stats cards mobile: grid-cols-2 (siempre 2 en mobile, 4 en desktop)
```

## Entregables (4 archivos .md)

Todos en `/mnt/documents/`:

1. **MOBILE_01_LAYOUT_SIDEBAR.md** — Layout y navegación
2. **MOBILE_02_DASHBOARD_PAGES.md** — Páginas dashboard (Users, Roles, Reports, Events, Settings, Modules)
3. **MOBILE_03_PROFILE_REGISTER.md** — ProfilePage, RegisterUserPage, RoleManagementPage
4. **MOBILE_04_DASHBOARD_HOME_MODALS.md** — DashboardHome (ya parcialmente OK), PersonalDashboard, InviteUserModal

## Detalle por archivo

### Archivo 1 — `MOBILE_01_LAYOUT_SIDEBAR.md`

**`src/layouts/DashboardLayout.tsx`**
- Header `px-6` -> `px-3 sm:px-6`
- Logo+texto: en mobile solo el icono "S" + título corto (`text-sm`); ocultar el subtítulo siempre en mobile (ya lo hace).
- Sección de usuario `hidden md:flex`: agregar avatar compacto visible en mobile (solo iniciales, sin texto).
- `gap-3` del header -> `gap-2 sm:gap-3`.
- `<main className="flex-1 overflow-hidden">` -> `flex-1 overflow-x-hidden min-w-0` (evita scroll horizontal global).

**`src/components/AppSidebar.tsx`**
- Cerrar el sidebar al navegar ya está. Verificar que `collapsible="icon"` no aparezca en mobile (en mobile usar offcanvas implícito vía `useSidebar`).
- En mobile el `SidebarContent` debe tener mejor padding táctil: `py-3` mínimo en items, ya está con `py-2.5` (OK).

### Archivo 2 — `MOBILE_02_DASHBOARD_PAGES.md`

**`src/pages/dashboard/UsersPage.tsx`** (474 lneas)
- Wrapper `p-6` -> `p-3 sm:p-4 md:p-6`
- Header de página (título + botón Nuevo): `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`
- Botón principal: `w-full sm:w-auto`
- Filtros / barra de búsqueda: stack vertical en mobile.
- Tabla de usuarios: envolver en `<div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">` para scroll horizontal sin romper layout, o convertir a card-list en mobile (`<div className="hidden sm:block">tabla</div><div className="sm:hidden space-y-2">cards</div>`). Se documentan ambas opciones; se aplica scroll horizontal por defecto.

**`src/pages/dashboard/RolesPage.tsx`**
- `space-y-6 p-6` -> `space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6`
- `flex justify-between items-center` -> `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`
- `grid gap-4 md:grid-cols-3` ya OK, pero asegurar `grid-cols-1` explícito.

**`src/pages/dashboard/ReportsPage.tsx`**
- Wrapper `p-6` -> `p-3 sm:p-4 md:p-6`
- `TabsList grid w-full grid-cols-2 lg:w-[400px]` -> OK.
- `grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4`: en mobile a 2 cols (`grid-cols-2 md:grid-cols-2 lg:grid-cols-4`) para stats compactas.
- `CardContent p-6` -> `p-3 sm:p-4 md:p-6`.
- SelectTrigger `w-full sm:w-[180px]` ya OK.
- Lista de historial: cada item con `flex flex-col sm:flex-row` + `gap-2`.

**`src/pages/dashboard/EventsPage.tsx`**
- Wrapper `space-y-6 p-6` -> compacto en mobile.
- `grid-cols-1 md:grid-cols-4 gap-4` (stats): -> `grid-cols-2 md:grid-cols-4`.
- `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6` (cards eventos): añadir `gap-3 sm:gap-4 md:gap-6`.
- `DialogContent max-w-2xl`: -> `max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto`.
- Botones de acción en cards: `flex flex-wrap gap-2` (no `flex` plano).
- Filtros (`flex items-center gap-2`): -> `flex flex-col sm:flex-row gap-2`.

**`src/pages/dashboard/SettingsPage.tsx`** (1078 lneas — el más crítico)
- Wrapper `space-y-6 p-6` -> `space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6`.
- `TabsList grid w-full grid-cols-2 lg:grid-cols-6`: -> envolver en `overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0` con `TabsList inline-flex w-full md:grid md:grid-cols-6 min-w-max md:min-w-0 gap-1`.
- Cada tab: agregar `whitespace-nowrap text-xs md:text-sm flex-shrink-0`.
- Todos los `grid grid-cols-1 md:grid-cols-2 gap-6` -> `gap-4 sm:gap-6` (gap reducido en mobile).
- `CardContent space-y-6` -> `space-y-4 sm:space-y-6`.
- LogoUploader: ajustar a `flex flex-col sm:flex-row` con preview centrado en mobile.
- Botones de guardar al final: sticky bottom en mobile (`sticky bottom-0 bg-background/95 backdrop-blur p-3 -mx-3 sm:static sm:bg-transparent sm:p-0 sm:mx-0`).

**`src/pages/dashboard/ModulesManagementPage.tsx`**
- Wrapper `space-y-6` ya OK pero sin padding. Agregar `p-3 sm:p-4 md:p-6`.
- Grid de módulos: forzar `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4`.
- Card de cada módulo: padding compacto, botón toggle full-width en mobile.

### Archivo 3 — `MOBILE_03_PROFILE_REGISTER.md`

**`src/pages/dashboard/ProfilePage.tsx`** (637 lneas)
- Wrapper `space-y-6 p-6` -> compacto.
- Header de perfil (avatar + stats):
  - `flex flex-col lg:flex-row` ya OK.
  - Stats `grid grid-cols-2 lg:grid-cols-4 gap-4 lg:min-w-[400px]` -> OK; reducir `gap-3 sm:gap-4`.
- `TabsList grid w-full grid-cols-4`: en mobile cabe ajustadamente; cambiar a `grid grid-cols-2 sm:grid-cols-4 h-auto gap-1` para wrap en 2 filas en mobile, o `overflow-x-auto`.
- `CardContent p-6` -> compacto.
- Avatar grande `flex items-center gap-6`: `flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6` con avatar centrado.
- Formularios `grid grid-cols-1 md:grid-cols-2 gap-6` -> `gap-4 md:gap-6`.

**`src/pages/dashboard/RegisterUserPage.tsx`** (527 lneas)
- Wrapper `space-y-6 p-6` -> compacto.
- Header `flex justify-between items-center` -> stack en mobile.
- Form `space-y-6` -> `space-y-4 sm:space-y-6`.
- Todos los `grid gap-4 md:grid-cols-2` ya están bien (1 col en mobile).
- Botones submit/cancelar al final: `flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3` con `w-full sm:w-auto`.

**`src/pages/dashboard/RoleManagementPage.tsx`** (548 lneas)
- Wrapper `space-y-6 p-6` -> compacto.
- `grid grid-cols-1 md:grid-cols-4 gap-4` (stats) -> `grid-cols-2 md:grid-cols-4`.
- `grid grid-cols-2 md:grid-cols-4 gap-3 pl-4` (permisos): OK, pero reducir `pl-4` a `pl-2 sm:pl-4`.
- `grid grid-cols-4 gap-2` (matriz de permisos): scroll horizontal o reducir a `grid-cols-2 sm:grid-cols-4`.
- `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6` (cards roles): `gap-3 sm:gap-4 lg:gap-6`.
- DialogContent (ancho default): forzar `max-w-[95vw]`.
- `CardContent p-6` -> compacto.

### Archivo 4 — `MOBILE_04_DASHBOARD_HOME_MODALS.md`

**`src/pages/dashboard/DashboardHome.tsx`** (ya bastante mobile-first; ajustes finos)
- Hero header: el `<p>` "Sistema de Gestión Sion" puede romper en mobile con nombres largos. Asegurar `truncate` en ambos elementos.
- Bloque "Último acceso" `hidden lg:flex`: OK.
- En mobile añadir un mini-resumen (último acceso) bajo el título: `<p className="text-xs text-white/70 lg:hidden mt-1">Último acceso: ...</p>`.

**`src/components/dashboard/PersonalDashboard.tsx`** (264 lneas)
- Wrapper `space-y-6 p-6` -> `space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6`.
- `grid grid-cols-1 lg:grid-cols-3 gap-6` -> `gap-4 lg:gap-6`.
- Sub-grids `grid-cols-1 md:grid-cols-2 gap-4` -> añadir `gap-3 md:gap-4`.

**`src/components/dashboard/InviteUserModal.tsx`** (210 lneas)
- `DialogContent max-w-2xl` -> `max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto`.
- `grid gap-4 md:grid-cols-2` ya OK.
- Footer del modal: botones full-width en mobile.

## Notas operativas

- Cada `.md` listará el archivo, la línea o bloque a reemplazar, el código actual y el código nuevo (estilo diff legible). Todos los cambios son sólo de `className`.
- No se cambian imports, lógica, hooks ni tipos.
- No se generan archivos nuevos en el repo. Sólo los `.md` en `/mnt/documents/`.
- Después de aplicar, verificar en preview a 360px, 390px y 414px.
