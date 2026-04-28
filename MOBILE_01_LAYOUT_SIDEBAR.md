# Mobile-first 1/4 — Layout y Sidebar

Cambios solo en `className`. No tocar el sitio publico ni el modulo de discipulado.
Breakpoint principal objetivo: ≤414px.

---

## 1. `src/layouts/DashboardLayout.tsx`

### 1.1 Header padding lateral (linea 63)

ANTES:
```tsx
<header className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between bg-[var(--glass-background)] backdrop-blur-lg border-b border-border/30 px-6 shadow-[var(--shadow-glass)]">
```

DESPUES:
```tsx
<header className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between bg-[var(--glass-background)] backdrop-blur-lg border-b border-border/30 px-3 sm:px-6 shadow-[var(--shadow-glass)] gap-2">
```

### 1.2 Bloque izquierdo del header (linea 64)

ANTES:
```tsx
<div className="flex items-center gap-4">
  <SidebarTrigger className="p-2 rounded-lg hover:bg-accent/50 transition-colors" />
  <div className="flex items-center gap-3">
    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
      <span className="text-primary-foreground font-bold text-sm">S</span>
    </div>
    <div>
      <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
        Sistema Sion
      </h1>
      <p className="hidden sm:block text-xs text-muted-foreground">Panel de Administración</p>
    </div>
  </div>
</div>
```

DESPUES:
```tsx
<div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
  <SidebarTrigger className="p-2 rounded-lg hover:bg-accent/50 transition-colors shrink-0" />
  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shrink-0">
      <span className="text-primary-foreground font-bold text-sm">S</span>
    </div>
    <div className="min-w-0">
      <h1 className="text-sm sm:text-lg font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent truncate">
        Sistema Sion
      </h1>
      <p className="hidden sm:block text-xs text-muted-foreground truncate">Panel de Administración</p>
    </div>
  </div>
</div>
```

### 1.3 Bloque derecho del header (linea 79)

ANTES:
```tsx
<div className="flex items-center gap-3">
```

DESPUES:
```tsx
<div className="flex items-center gap-1 sm:gap-3 shrink-0">
```

### 1.4 Main: evitar scroll horizontal (linea 118)

ANTES:
```tsx
<main className="flex-1 overflow-hidden">
  <Outlet />
</main>
```

DESPUES:
```tsx
<main className="flex-1 overflow-x-hidden min-w-0">
  <Outlet />
</main>
```

---

## 2. `src/components/AppSidebar.tsx`

El sidebar usa `collapsible="icon"` que en mobile se transforma a offcanvas via shadcn. No requiere cambios estructurales. Solo afinamos area tactil del header del sidebar.

### 2.1 Header interno del sidebar (linea 76)

ANTES:
```tsx
<div className="p-4 border-b border-border/30">
```

DESPUES:
```tsx
<div className="p-3 sm:p-4 border-b border-border/30">
```

### 2.2 Padding del SidebarGroup (linea 90)

ANTES:
```tsx
<SidebarGroup className="px-2 py-4">
```

DESPUES:
```tsx
<SidebarGroup className="px-2 py-3 sm:py-4">
```

---

## Notas

- `SidebarProvider` ya gestiona el comportamiento offcanvas en mobile (`< md`), por lo que no se necesita logica extra.
- El `SidebarTrigger` queda visible siempre dentro del header global.
- Ningun cambio rompe desktop: solo se agregan variantes `sm:`/`md:` que reactivan los valores originales.
