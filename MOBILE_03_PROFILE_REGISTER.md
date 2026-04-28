# Mobile-first 3/4 — Profile, RegisterUser y RoleManagement

---

## 1. `src/pages/dashboard/ProfilePage.tsx`

### 1.1 Wrapper (linea 128)

ANTES:
```tsx
<div className="space-y-6 p-6">
  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
    <div>
      <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
        Mi Perfil
      </h1>
```

DESPUES:
```tsx
<div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 sm:gap-6">
    <div className="min-w-0">
      <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
        Mi Perfil
      </h1>
```

### 1.2 Quick Stats (linea 141)

ANTES:
```tsx
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:min-w-[400px]">
  <Card className="text-center p-4">
```

DESPUES:
```tsx
<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:min-w-[400px]">
  <Card className="text-center p-3 sm:p-4">
```

(Aplicar `p-3 sm:p-4` a las 4 Cards de stats: lineas 142, 148, 154, 160.)

Y a los textos grandes:
```tsx
<div className="text-base sm:text-lg font-bold text-primary">
```
(reemplazar `text-lg` por `text-base sm:text-lg` en los 4 stats.)

### 1.3 TabsList (linea 169-187)

ANTES:
```tsx
<Tabs defaultValue="personal" className="space-y-6">
  <TabsList className="grid w-full grid-cols-4">
    <TabsTrigger value="personal" className="flex items-center gap-2">
      <User className="w-4 h-4" />
      Personal
    </TabsTrigger>
    ...
  </TabsList>
```

DESPUES (tabs en 2 filas en mobile, 4 cols en sm+):
```tsx
<Tabs defaultValue="personal" className="space-y-4 sm:space-y-6">
  <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto gap-1 sm:gap-0">
    <TabsTrigger value="personal" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
      <User className="w-4 h-4" />
      Personal
    </TabsTrigger>
    <TabsTrigger value="church" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
      <Heart className="w-4 h-4" />
      Iglesia
    </TabsTrigger>
    <TabsTrigger value="security" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
      <Lock className="w-4 h-4" />
      Seguridad
    </TabsTrigger>
    <TabsTrigger value="preferences" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
      <Settings className="w-4 h-4" />
      Preferencias
    </TabsTrigger>
  </TabsList>
```

### 1.4 TabsContent personal (linea 189) y demas (337, 419, 470)

Cambiar todos los `className="space-y-6"` de `TabsContent` por:
```tsx
className="space-y-4 sm:space-y-6"
```

### 1.5 Profile Header Card (linea 192-231)

ANTES:
```tsx
<Card className="border-0 bg-gradient-to-r from-primary/10 to-accent/10">
  <CardContent className="p-6">
    <div className="flex items-center gap-6">
      <div className="relative">
        <Avatar className="w-24 h-24">
          ...
        </Avatar>
        ...
      </div>
      <div className="flex-1">
        <h3 className="text-2xl font-bold">
          {userData?.first_name} {userData?.last_name}
        </h3>
        <p className="text-muted-foreground">{userData?.email}</p>
        <div className="flex items-center gap-4 mt-2">
          <Badge variant="default">...</Badge>
          <Badge variant="outline">...</Badge>
        </div>
      </div>
      <Button variant="outline">
        <Edit className="w-4 h-4 mr-2" />
        Editar Foto
      </Button>
    </div>
  </CardContent>
</Card>
```

DESPUES:
```tsx
<Card className="border-0 bg-gradient-to-r from-primary/10 to-accent/10">
  <CardContent className="p-3 sm:p-4 md:p-6">
    <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-6">
      <div className="relative shrink-0">
        <Avatar className="w-20 h-20 sm:w-24 sm:h-24">
          ...
        </Avatar>
        ...
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-xl sm:text-2xl font-bold truncate">
          {userData?.first_name} {userData?.last_name}
        </h3>
        <p className="text-sm sm:text-base text-muted-foreground truncate">{userData?.email}</p>
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-4 mt-2">
          <Badge variant="default">...</Badge>
          <Badge variant="outline">...</Badge>
        </div>
      </div>
      <Button variant="outline" className="w-full sm:w-auto">
        <Edit className="w-4 h-4 mr-2" />
        Editar Foto
      </Button>
    </div>
  </CardContent>
</Card>
```

### 1.6 Patron global ProfilePage

| Patron actual | Reemplazar por |
|---|---|
| `<CardContent className="p-6">` | `<CardContent className="p-3 sm:p-4 md:p-6">` |
| `<CardContent className="space-y-6">` | `<CardContent className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">` |
| `<div className="grid grid-cols-1 md:grid-cols-2 gap-6">` | `<div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">` |
| `<div className="grid grid-cols-1 md:grid-cols-2 gap-4">` | `<div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">` |
| `className="space-y-6">` (en form) | `className="space-y-4 sm:space-y-6">` |

(Lineas afectadas: 245, 244, 192, 305, 306, 346, 347, 428, 470, 479, 480.)

### 1.7 Botones "Guardar" / footer de forms

Cuando el form termine con un boton solo, envolverlo:
```tsx
<div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4">
  <Button type="submit" className="w-full sm:w-auto">Guardar</Button>
</div>
```

---

## 2. `src/pages/dashboard/RegisterUserPage.tsx`

### 2.1 Wrapper (linea 203)

ANTES:
```tsx
<div className="space-y-6 p-6">
  <div className="flex justify-between items-center">
```

DESPUES:
```tsx
<div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
```

### 2.2 Titulo (linea 206)

ANTES:
```tsx
<h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
  {isEditMode ? 'Editar Usuario' : 'Registro de Usuarios'}
</h1>
```

DESPUES:
```tsx
<h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
  {isEditMode ? 'Editar Usuario' : 'Registro de Usuarios'}
</h1>
```

### 2.3 Form `space-y-6` (linea 230)

ANTES:
```tsx
<form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">
```

DESPUES:
```tsx
<form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-4 sm:space-y-6">
```

### 2.4 Grids `gap-4 md:grid-cols-2` (lineas 234, 280, 320, 410, 450)

Para todos los `<div className="grid gap-4 md:grid-cols-2">`:

DESPUES:
```tsx
<div className="grid gap-3 md:gap-4 md:grid-cols-2">
```

### 2.5 CardContent del formulario (linea 229)

ANTES:
```tsx
<CardContent>
  <form ... >
```

DESPUES:
```tsx
<CardContent className="p-3 sm:p-4 md:p-6">
  <form ... >
```

### 2.6 Botones submit/cancelar al final del form

Localizar el bloque final que contenga los botones (Submit y Cancelar). Asegurar que esten dentro de:

```tsx
<div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4">
  <Button type="button" variant="outline" onClick={...} className="w-full sm:w-auto">
    Cancelar
  </Button>
  <Button type="submit" className="w-full sm:w-auto">
    {isEditMode ? 'Guardar Cambios' : 'Registrar Usuario'}
  </Button>
</div>
```

---

## 3. `src/pages/dashboard/RoleManagementPage.tsx`

### 3.1 Wrapper (linea 352)

ANTES:
```tsx
<div className="space-y-6 p-6">
  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
    <div>
      <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
        Gestión de Roles
      </h1>
```

DESPUES:
```tsx
<div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
    <div className="min-w-0">
      <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
        Gestión de Roles
      </h1>
```

### 3.2 Botones de header (linea 361)

ANTES:
```tsx
<div className="flex gap-2">
  <Button variant="outline" onClick={() => setIsAssignRoleOpen(true)}>
    <UserPlus className="w-4 h-4 mr-2" />
    Asignar Rol
  </Button>
  <Button onClick={() => setIsCreateRoleOpen(true)}>
    <Plus className="w-4 h-4 mr-2" />
    Crear Rol
  </Button>
</div>
```

DESPUES:
```tsx
<div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
  <Button variant="outline" onClick={() => setIsAssignRoleOpen(true)} className="w-full sm:w-auto">
    <UserPlus className="w-4 h-4 mr-2" />
    Asignar Rol
  </Button>
  <Button onClick={() => setIsCreateRoleOpen(true)} className="w-full sm:w-auto">
    <Plus className="w-4 h-4 mr-2" />
    Crear Rol
  </Button>
</div>
```

### 3.3 TabsList (linea 374)

ANTES:
```tsx
<TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
  <TabsTrigger value="system">Roles del Sistema</TabsTrigger>
  <TabsTrigger value="custom">Roles Personalizados</TabsTrigger>
</TabsList>
```

DESPUES:
```tsx
<TabsList className="grid w-full grid-cols-2 lg:w-[400px] h-auto">
  <TabsTrigger value="system" className="text-xs sm:text-sm whitespace-nowrap">Roles del Sistema</TabsTrigger>
  <TabsTrigger value="custom" className="text-xs sm:text-sm whitespace-nowrap">Roles Personalizados</TabsTrigger>
</TabsList>
```

### 3.4 Search bar de roles personalizados (linea 409)

ANTES:
```tsx
<div className="flex items-center gap-4">
  <div className="flex-1">
    ...
  </div>
  <Select defaultValue="all">
    <SelectTrigger className="w-[150px]">
```

DESPUES:
```tsx
<div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
  <div className="flex-1 min-w-0">
    ...
  </div>
  <Select defaultValue="all">
    <SelectTrigger className="w-full sm:w-[150px]">
```

### 3.5 Grid de role cards (linea 392 y 430)

ANTES:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
```

DESPUES (ambas ocurrencias):
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
```

### 3.6 Statistics grid (linea 439)

ANTES:
```tsx
<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  <Card>
    <CardContent className="p-6 text-center">
```

DESPUES:
```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
  <Card>
    <CardContent className="p-3 sm:p-4 md:p-6 text-center">
```

(Aplicar `p-3 sm:p-4 md:p-6 text-center` a las 4 Cards: lineas 441, 448, 455, 462.)

Y reducir el numero gigante:
```tsx
<div className="text-xl sm:text-2xl font-bold text-primary">6</div>
```
(reemplazar `text-2xl` por `text-xl sm:text-2xl` en los 4 stats.)

### 3.7 Permisos pl-4 (linea 314)

ANTES:
```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-3 pl-4 border-l-2 border-muted">
```

DESPUES:
```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 pl-2 sm:pl-4 border-l-2 border-muted">
```

### 3.8 Matriz de permisos `grid grid-cols-4 gap-2` (linea 510)

ANTES:
```tsx
<div className="grid grid-cols-4 gap-2">
```

DESPUES:
```tsx
<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
```

### 3.9 DialogContent (linea ~340 — `<DialogContent>` sin className)

Si el modal de Crear Rol abre sin clase (`<DialogContent>` plano), aplicar:
```tsx
<DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
```

### 3.10 CardContent que contiene la search (linea 408)

ANTES:
```tsx
<CardContent>
```

DESPUES:
```tsx
<CardContent className="p-3 sm:p-4 md:p-6">
```
