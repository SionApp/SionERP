# Mobile-first 2/4 — Paginas Dashboard

Cambios para: UsersPage, RolesPage, ReportsPage, EventsPage, SettingsPage, ModulesManagementPage.

Patron general:
- `p-6` -> `p-3 sm:p-4 md:p-6`
- `space-y-6` -> `space-y-4 sm:space-y-6`
- `gap-6` -> `gap-3 sm:gap-4 md:gap-6`
- `gap-4` -> `gap-3 sm:gap-4`
- `grid-cols-1 md:grid-cols-4` (stats) -> `grid-cols-2 md:grid-cols-4`
- DialogContent ancho fijo -> agregar `max-w-[95vw]` y `max-h-[90vh] overflow-y-auto`
- TabsList con muchos tabs -> wrap con `overflow-x-auto -mx-3 px-3` + `inline-flex min-w-max`
- Boton principal de header -> `w-full sm:w-auto`

---

## 1. `src/pages/dashboard/UsersPage.tsx`

### 1.1 Wrapper raiz (linea ~401)

ANTES:
```tsx
<div className="space-y-6 p-6">
```

DESPUES:
```tsx
<div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
```

### 1.2 Header de pagina (linea ~403)

Ya estaba parcialmente OK. Aseguramos esta version final:

ANTES:
```tsx
<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
  <div>
    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
      Gestión de Usuarios
    </h1>
    <p className="text-muted-foreground mt-1">Administra los usuarios registrados en el sistema</p>
  </div>
  <Button onClick={() => navigate('/dashboard/register-user')} className="w-full sm:w-auto">
```

DESPUES:
```tsx
<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
  <div className="min-w-0">
    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
      Gestión de Usuarios
    </h1>
    <p className="text-sm sm:text-base text-muted-foreground mt-1">
      Administra los usuarios registrados en el sistema
    </p>
  </div>
  <Button onClick={() => navigate('/dashboard/register-user')} className="w-full sm:w-auto shrink-0">
```

### 1.3 Mobile card render — bloque "Cedula / Telefono" (linea ~372)

ANTES:
```tsx
<div className="grid grid-cols-2 gap-2 text-sm">
  <div>
    <span className="text-muted-foreground">Cédula:</span>
    <p className="font-medium">{user.id_number}</p>
  </div>
  <div>
    <span className="text-muted-foreground">Teléfono:</span>
    <p className="font-medium">{user.phone}</p>
  </div>
</div>
```

DESPUES:
```tsx
<div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
  <div className="min-w-0">
    <span className="text-muted-foreground">Cédula:</span>
    <p className="font-medium truncate">{user.id_number}</p>
  </div>
  <div className="min-w-0">
    <span className="text-muted-foreground">Teléfono:</span>
    <p className="font-medium truncate">{user.phone}</p>
  </div>
</div>
```

### 1.4 Footer del card mobile (linea ~390)

ANTES:
```tsx
<div className="flex justify-between items-center pt-2 border-t">
  <div className="text-xs text-muted-foreground">
    <span>Registrado: </span>
    <span className="font-medium">{new Date(user.created_at).toLocaleDateString()}</span>
  </div>
  <div className="flex items-center gap-1">{actions}</div>
</div>
```

DESPUES:
```tsx
<div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t">
  <div className="text-xs text-muted-foreground min-w-0">
    <span>Registrado: </span>
    <span className="font-medium">{new Date(user.created_at).toLocaleDateString()}</span>
  </div>
  <div className="flex flex-wrap items-center gap-1">{actions}</div>
</div>
```

---

## 2. `src/pages/dashboard/RolesPage.tsx`

### 2.1 Wrapper (linea 142)

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

### 2.2 Titulo del header (linea 145)

ANTES:
```tsx
<h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
  Gestión de Roles
</h1>
```

DESPUES:
```tsx
<h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
  Gestión de Roles
</h1>
```

### 2.3 Boton "Actualizar" (linea 150)

ANTES:
```tsx
<Button onClick={loadRoleStats}>
  <Shield className="h-4 w-4 mr-2" />
  Actualizar
</Button>
```

DESPUES:
```tsx
<Button onClick={loadRoleStats} className="w-full sm:w-auto">
  <Shield className="h-4 w-4 mr-2" />
  Actualizar
</Button>
```

### 2.4 Stats grid (linea 157)

ANTES:
```tsx
<div className="grid gap-4 md:grid-cols-3">
```

DESPUES:
```tsx
<div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
```

### 2.5 Header de cada role card (linea ~199)

ANTES:
```tsx
<div className="flex items-center justify-between">
  <div className="flex items-center gap-3">
```

DESPUES:
```tsx
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
  <div className="flex items-center gap-3 min-w-0">
```

Y el bloque de la derecha (linea ~207):

ANTES:
```tsx
<div className="text-right">
  <p className="text-2xl font-bold">{roleData.count}</p>
  <p className="text-sm text-muted-foreground">usuarios</p>
</div>
```

DESPUES:
```tsx
<div className="text-left sm:text-right shrink-0">
  <p className="text-2xl font-bold">{roleData.count}</p>
  <p className="text-sm text-muted-foreground">usuarios</p>
</div>
```

---

## 3. `src/pages/dashboard/ReportsPage.tsx`

### 3.1 Wrapper (linea 108)

ANTES:
```tsx
<div className="space-y-6 p-6">
```

DESPUES:
```tsx
<div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
```

### 3.2 Titulo (linea 112)

ANTES:
```tsx
<h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
  Centro de Reportes
</h1>
```

DESPUES:
```tsx
<h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
  Centro de Reportes
</h1>
```

### 3.3 TabsList (linea 138-142)

ANTES:
```tsx
<Tabs defaultValue="generator" className="space-y-6">
  <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
    <TabsTrigger value="generator">Generar Reportes</TabsTrigger>
    <TabsTrigger value="history">Historial</TabsTrigger>
  </TabsList>
```

DESPUES:
```tsx
<Tabs defaultValue="generator" className="space-y-4 sm:space-y-6">
  <TabsList className="grid w-full grid-cols-2 lg:w-[400px] h-auto">
    <TabsTrigger value="generator" className="text-xs sm:text-sm">Generar Reportes</TabsTrigger>
    <TabsTrigger value="history" className="text-xs sm:text-sm">Historial</TabsTrigger>
  </TabsList>
```

### 3.4 Cards de tipos de reporte (linea 146)

ANTES:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
```

DESPUES:
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
```

### 3.5 Configuracion del reporte — grid form (linea 184)

ANTES:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
```

DESPUES:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
```

### 3.6 CardContent del historial (linea 297)

ANTES:
```tsx
<CardContent className="p-6">
```

DESPUES:
```tsx
<CardContent className="p-3 sm:p-4 md:p-6">
```

---

## 4. `src/pages/dashboard/EventsPage.tsx`

### 4.1 Wrapper (linea 365)

ANTES:
```tsx
<div className="space-y-6 p-6">
```

DESPUES:
```tsx
<div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
```

### 4.2 Titulo (linea 369)

ANTES:
```tsx
<h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
  Gestión de Eventos
</h1>
```

DESPUES:
```tsx
<h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
  Gestión de Eventos
</h1>
```

### 4.3 Boton "Crear Evento" (linea 376)

ANTES:
```tsx
<Button onClick={() => setIsCreateDialogOpen(true)}>
  <Plus className="w-4 h-4 mr-2" />
  Crear Evento
</Button>
```

DESPUES:
```tsx
<Button onClick={() => setIsCreateDialogOpen(true)} className="w-full lg:w-auto">
  <Plus className="w-4 h-4 mr-2" />
  Crear Evento
</Button>
```

### 4.4 Filters card (linea 384)

ANTES:
```tsx
<CardContent className="p-6">
  <div className="flex flex-col md:flex-row gap-4">
    <div className="flex-1">
      ...
    </div>

    <div className="flex gap-2">
      <Select defaultValue="all">
        <SelectTrigger className="w-[180px]">
```

DESPUES:
```tsx
<CardContent className="p-3 sm:p-4 md:p-6">
  <div className="flex flex-col md:flex-row gap-3 md:gap-4">
    <div className="flex-1 min-w-0">
      ...
    </div>

    <div className="flex flex-col sm:flex-row gap-2">
      <Select defaultValue="all">
        <SelectTrigger className="w-full sm:w-[180px]">
```

Y para el segundo Select (linea 410):

ANTES:
```tsx
<SelectTrigger className="w-[150px]">
```

DESPUES:
```tsx
<SelectTrigger className="w-full sm:w-[150px]">
```

### 4.5 Events grid (linea 426)

ANTES:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
```

DESPUES:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
```

### 4.6 Quick stats (linea 433)

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

(Aplicar el mismo `p-3 sm:p-4 md:p-6 text-center` a las 4 Cards de stats: lineas 442, 449, 456.)

### 4.7 DialogContent del detalle de evento (linea 468)

ANTES:
```tsx
<DialogContent className="max-w-2xl">
```

DESPUES:
```tsx
<DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
```

### 4.8 DialogContent del modal "Crear Evento" (linea 242 aprox)

ANTES:
```tsx
<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
```

DESPUES:
```tsx
<DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
```

### 4.9 Form grids dentro del Crear Evento (linea 249)

ANTES:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
```

DESPUES:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
```

---

## 5. `src/pages/dashboard/SettingsPage.tsx`

### 5.1 Wrapper de loading (linea 127) y wrapper principal (linea 138)

ANTES:
```tsx
<div className="space-y-6 p-6">
```

DESPUES (ambos casos):
```tsx
<div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
```

### 5.2 Titulo (linea 142)

ANTES:
```tsx
<h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
  Configuración del Sistema
</h1>
```

DESPUES:
```tsx
<h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
  Configuración del Sistema
</h1>
```

### 5.3 Boton "Recargar" (linea 149)

ANTES:
```tsx
<Button variant="outline" onClick={loadAllSettings} disabled={isLoading}>
  <RotateCcw className="w-4 h-4 mr-2" />
  Recargar
</Button>
```

DESPUES:
```tsx
<Button variant="outline" onClick={loadAllSettings} disabled={isLoading} className="w-full lg:w-auto">
  <RotateCcw className="w-4 h-4 mr-2" />
  Recargar
</Button>
```

### 5.4 TabsList con scroll horizontal en mobile (lineas 155-163)

ANTES:
```tsx
<Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
  <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
    <TabsTrigger value="general">General</TabsTrigger>
    <TabsTrigger value="church">Iglesia</TabsTrigger>
    <TabsTrigger value="zones">Zonas</TabsTrigger>
    <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
    <TabsTrigger value="security">Seguridad</TabsTrigger>
    <TabsTrigger value="backup">Respaldos</TabsTrigger>
  </TabsList>
```

DESPUES:
```tsx
<Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
  <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
    <TabsList className="inline-flex w-full lg:grid lg:grid-cols-6 h-auto min-w-max lg:min-w-0 gap-1 lg:gap-0">
      <TabsTrigger value="general" className="text-xs lg:text-sm whitespace-nowrap flex-shrink-0 px-3">General</TabsTrigger>
      <TabsTrigger value="church" className="text-xs lg:text-sm whitespace-nowrap flex-shrink-0 px-3">Iglesia</TabsTrigger>
      <TabsTrigger value="zones" className="text-xs lg:text-sm whitespace-nowrap flex-shrink-0 px-3">Zonas</TabsTrigger>
      <TabsTrigger value="notifications" className="text-xs lg:text-sm whitespace-nowrap flex-shrink-0 px-3">Notificaciones</TabsTrigger>
      <TabsTrigger value="security" className="text-xs lg:text-sm whitespace-nowrap flex-shrink-0 px-3">Seguridad</TabsTrigger>
      <TabsTrigger value="backup" className="text-xs lg:text-sm whitespace-nowrap flex-shrink-0 px-3">Respaldos</TabsTrigger>
    </TabsList>
  </div>
```

### 5.5 Patron global para SettingsPage

Aplicar a TODOS los siguientes nodos del archivo:

| Patron actual | Reemplazar por |
|---------------|----------------|
| `TabsContent ... className="space-y-6"` | `TabsContent ... className="space-y-4 sm:space-y-6"` |
| `CardContent className="space-y-6"` | `CardContent className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6"` |
| `<div className="grid grid-cols-1 md:grid-cols-2 gap-6">` | `<div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">` |
| `<div className="grid grid-cols-1 md:grid-cols-2 gap-4">` | `<div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">` |

(Estas ocurrencias estan en lineas: 166, 178, 335, 347, 419, 470, 471, 561 y similares.)

### 5.6 LogoUploader / botones "Guardar" (al final de cada Card)

Cuando exista un bloque tipo:
```tsx
<div className="flex justify-end gap-3">
  <Button>Guardar</Button>
</div>
```

REEMPLAZAR por:
```tsx
<div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
  <Button className="w-full sm:w-auto">Guardar</Button>
</div>
```

---

## 6. `src/pages/dashboard/ModulesManagementPage.tsx`

### 6.1 Wrapper (linea 64)

ANTES:
```tsx
<div className="space-y-6">
  <div>
    <h2 className="text-3xl font-bold tracking-tight">Gestión de Módulos</h2>
```

DESPUES:
```tsx
<div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
  <div>
    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Gestión de Módulos</h2>
```

### 6.2 Grid de modulos (linea 72)

ANTES:
```tsx
<div className="grid gap-4">
```

DESPUES:
```tsx
<div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
```

### 6.3 Header de cada modulo (linea 76)

ANTES:
```tsx
<div className="flex items-center justify-between">
  <div className="space-y-1">
    <CardTitle>{module.name}</CardTitle>
    <CardDescription>{module.description}</CardDescription>
  </div>
  <div className="flex items-center space-x-2">
```

DESPUES:
```tsx
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
  <div className="space-y-1 min-w-0">
    <CardTitle className="text-base sm:text-lg">{module.name}</CardTitle>
    <CardDescription className="text-xs sm:text-sm">{module.description}</CardDescription>
  </div>
  <div className="flex items-center space-x-2 shrink-0">
```
