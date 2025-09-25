# Iglesia Sion - Monorepo

Este es un monorepo con tres proyectos separados:

## 🌐 Sitio Web Público (src/)
**Puerto: 8080**
- Sitio web de la Iglesia Evangélica Pentecostal Sion
- Páginas: Inicio, Servicios, Nosotros, En Vivo, Galería, Contacto
- Solo contenido público, sin autenticación

### Ejecutar:
```bash
./start-website.sh
```
**URL:** http://localhost:8080

---

## 📊 Dashboard Administrativo (apps/admin-panel/)
**Puerto: 3001**
- Sistema completo de administración con autenticación
- Gestión de usuarios, roles, eventos, reportes
- Conectado con Backend Go (puerto 8081)

### Ejecutar Dashboard + Backend:
```bash
./start-admin.sh
```
**URLs:**
- Dashboard: http://localhost:3001
- Backend API: http://localhost:8081

---

## 🚀 Sitio Público Alternativo (apps/public-site/)
**Puerto: 3000**
- Versión alternativa del sitio público
- Proyecto independiente para demos

### Ejecutar:
```bash
./start-public.sh
```
**URL:** http://localhost:3000

---

## 🔧 Backend Go (apps/backend-go/)
**Puerto: 8081**
- API REST en Go con Echo framework
- Base de datos PostgreSQL con Supabase
- Middleware de autenticación JWT

### Ejecutar solo Backend:
```bash
./start-backend.sh
```
**URL:** http://localhost:8081

---

## 📋 Scripts Disponibles

- `./start-website.sh` - Solo sitio web público
- `./start-admin.sh` - Dashboard + Backend (recomendado)
- `./start-backend.sh` - Solo backend Go
- `./start-public.sh` - Solo sitio público alternativo
- `./start-dev.sh` - Todos los servicios (para desarrollo completo)

## 🏗️ Arquitectura

```
Iglesia Sion/
├── src/                    # Sitio Web Público (puerto 8080)
├── apps/
│   ├── admin-panel/        # Dashboard Admin (puerto 3001)
│   ├── backend-go/         # API Go (puerto 8081)
│   └── public-site/        # Sitio Público Alt (puerto 3000)
└── scripts/                # Scripts de desarrollo
```

## 🔐 Autenticación

- **Sitio Web**: Sin autenticación
- **Dashboard**: Supabase Auth (login requerido)
- **Backend**: JWT tokens validados

## 🎯 Uso Recomendado

Para trabajar normalmente:
1. **Desarrollo web**: `./start-website.sh`
2. **Administración**: `./start-admin.sh`
3. **Desarrollo completo**: `./start-dev.sh`