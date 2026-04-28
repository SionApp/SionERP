# Mobile-first 4/4 — DashboardHome, PersonalDashboard y Modales

---

## 1. `src/pages/dashboard/DashboardHome.tsx`

Esta pagina ya esta bastante adaptada para mobile. Solo retoques.

### 1.1 Hero header (linea 192)

ANTES:
```tsx
<div className="relative overflow-hidden rounded-b-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-lg bg-gradient-to-r from-primary/90 via-blue-600/80 to-purple-600/80 border border-primary/20 backdrop-blur-md">
```

(OK, no se cambia.)

### 1.2 Texto del hero (linea 196-201)

ANTES:
```tsx
<div className="relative z-10 flex items-center justify-between">
  <div className="min-w-0">
    <h1 className="text-xl md:text-4xl font-extrabold text-white drop-shadow-md truncate">
      Bienvenido, {user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Admin'}
    </h1>
    <p className="text-white/80 text-sm md:text-lg font-medium mt-1 truncate">
      Sistema de Gestión Sion
    </p>
  </div>
```

DESPUES:
```tsx
<div className="relative z-10 flex items-center justify-between gap-3">
  <div className="min-w-0 flex-1">
    <h1 className="text-lg sm:text-xl md:text-4xl font-extrabold text-white drop-shadow-md truncate">
      Bienvenido, {user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Admin'}
    </h1>
    <p className="text-white/80 text-xs sm:text-sm md:text-lg font-medium mt-1 truncate">
      Sistema de Gestión Sion
    </p>
    <p className="text-[10px] text-white/60 mt-1 lg:hidden truncate">
      Último acceso: {lastLogin}
    </p>
  </div>
```

### 1.3 StatsCard interno — paddings ya correctos

`StatsCard` ya usa `p-4` y `text-2xl md:text-3xl`. Lo dejamos.

Si quieres mas compacto en mobile (≤414px), ajustar internamente en `StatsCard`:

ANTES:
```tsx
<div className="text-2xl md:text-3xl font-bold">{value}</div>
```

DESPUES:
```tsx
<div className="text-xl sm:text-2xl md:text-3xl font-bold">{value}</div>
```

---

## 2. `src/components/dashboard/PersonalDashboard.tsx`

### 2.1 Wrapper (linea 81)

ANTES:
```tsx
<div className="space-y-6 p-6">
  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
    <div>
      <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
        {title}
      </h1>
```

DESPUES:
```tsx
<div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
    <div className="min-w-0">
      <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
        {title}
      </h1>
```

### 2.2 Grid principal (linea 92)

ANTES:
```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2 space-y-6">
```

DESPUES:
```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
  <div className="lg:col-span-2 space-y-4 lg:space-y-6">
```

### 2.3 CardContent del bloque info (linea 102)

ANTES:
```tsx
<CardContent className="space-y-6">
```

DESPUES:
```tsx
<CardContent className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
```

### 2.4 Profile section header (linea 104)

ANTES:
```tsx
<div className="flex items-center gap-4">
  <Avatar className="w-16 h-16">
    ...
  </Avatar>
  <div className="flex-1">
    <h3 className="text-xl font-semibold">
      {(user as any)?.full_name || user?.email}
    </h3>
    <div className="flex items-center gap-2 mt-1">
      <Badge className={`${roleInfo.color} text-white`}>...</Badge>
    </div>
    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
      <span className="flex items-center gap-1">
        <Mail className="w-4 h-4" />
        {user?.email}
      </span>
      <span className="flex items-center gap-1">
        <Phone className="w-4 h-4" />
        {user?.phone}
      </span>
    </div>
  </div>
</div>
```

DESPUES:
```tsx
<div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3 sm:gap-4">
  <Avatar className="w-16 h-16 shrink-0">
    ...
  </Avatar>
  <div className="flex-1 min-w-0">
    <h3 className="text-lg sm:text-xl font-semibold truncate">
      {(user as any)?.full_name || user?.email}
    </h3>
    <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mt-1">
      <Badge className={`${roleInfo.color} text-white`}>...</Badge>
    </div>
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-2 text-xs sm:text-sm text-muted-foreground">
      <span className="flex items-center gap-1 min-w-0">
        <Mail className="w-4 h-4 shrink-0" />
        <span className="truncate">{user?.email}</span>
      </span>
      <span className="flex items-center gap-1 min-w-0">
        <Phone className="w-4 h-4 shrink-0" />
        <span className="truncate">{user?.phone}</span>
      </span>
    </div>
  </div>
</div>
```

### 2.5 Sub-grids (lineas 139, 165, 188)

Para todos los `<div className="grid grid-cols-1 md:grid-cols-2 gap-4">` y `<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">`:

DESPUES:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
```

(Y el de texto sm: `<div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 text-sm">`.)

---

## 3. `src/components/dashboard/InviteUserModal.tsx`

### 3.1 DialogContent (linea 126)

ANTES:
```tsx
<DialogContent className="max-w-2xl">
```

DESPUES:
```tsx
<DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
```

### 3.2 Form grid (linea 138-139)

ANTES:
```tsx
<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
  <div className="grid gap-4 md:grid-cols-2">
```

DESPUES:
```tsx
<form onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
  <div className="grid gap-3 md:gap-4 md:grid-cols-2">
```

### 3.3 Footer del modal (linea 198)

ANTES:
```tsx
<div className="flex justify-end gap-3 pt-4">
  <Button type="button" variant="outline" onClick={onClose}>
    Cancelar
  </Button>
  <Button type="submit" disabled={loading || disabled}>
    {loading ? 'Enviando...' : 'Enviar Invitación'}
  </Button>
</div>
```

DESPUES:
```tsx
<div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4">
  <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
    Cancelar
  </Button>
  <Button type="submit" disabled={loading || disabled} className="w-full sm:w-auto">
    {loading ? 'Enviando...' : 'Enviar Invitación'}
  </Button>
</div>
```

---

## Verificacion despues de aplicar todos los cambios

1. Probar en preview a 360px, 390px y 414px (DevTools / iPhone SE / iPhone 12).
2. Verificar:
   - No aparece scroll horizontal en ninguna pagina.
   - Headers de pagina apilan en mobile (titulo arriba, boton abajo full-width).
   - Tabs largos hacen scroll horizontal sin romper.
   - Cards de stats van en 2 columnas en mobile, no 1 ni 4.
   - Modales no se cortan: ocupan max-w-[95vw].
   - Texto de titulo grande (`text-3xl`) baja a `text-2xl` en mobile.
   - Forms con dos columnas se apilan a 1 columna en mobile.
   - Botones de "Guardar/Cancelar" full-width y con cancelar arriba (mas accesible al pulgar).

3. Verificar desktop (≥1024px) sigue identico.

## Resumen de archivos modificados (solo className)

```text
src/layouts/DashboardLayout.tsx
src/components/AppSidebar.tsx
src/pages/dashboard/UsersPage.tsx
src/pages/dashboard/RolesPage.tsx
src/pages/dashboard/ReportsPage.tsx
src/pages/dashboard/EventsPage.tsx
src/pages/dashboard/SettingsPage.tsx
src/pages/dashboard/ModulesManagementPage.tsx
src/pages/dashboard/ProfilePage.tsx
src/pages/dashboard/RegisterUserPage.tsx
src/pages/dashboard/RoleManagementPage.tsx
src/pages/dashboard/DashboardHome.tsx
src/components/dashboard/PersonalDashboard.tsx
src/components/dashboard/InviteUserModal.tsx
```

NO se modificaron:
- src/components/discipleship/* (ya ajustado previamente)
- src/pages/dashboard/discipleship/* (ya ajustado previamente)
- src/components/ui/* (primitivos shadcn)
- Sitio publico: Index, Header, Hero, Services, About, Contact, Footer, Gallery, Login, Register
