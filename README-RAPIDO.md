# 🚀 Inicio Rápido - Iglesia Sion

## ⚡ Configuración en 2 pasos

### 1️⃣ Instalar dependencias
```bash
# Instalar dependencias del frontend
pnpm install

# Configurar variables de entorno del backend
cp apps/backend-go/.env.example apps/backend-go/.env
# Editar apps/backend-go/.env con tus valores de Supabase
```

### 2️⃣ Ejecutar el proyecto

**Para desarrollo completo (recomendado):**
```bash
# Terminal 1: Backend
cd apps/backend-go
go run .

# Terminal 2: Frontend
pnpm dev
```

**Solo backend:**
```bash
cd apps/backend-go
go run .
```

**Solo frontend:**
```bash
pnpm dev
```

### 3️⃣ ¡Listo! 🎉

El proyecto ahora es **más simple**:
- ✅ Un solo frontend React (sitio + admin)
- ✅ Un backend Go
- ✅ Sin scripts complejos
- ✅ Configuración directa

## 🆘 ¿Problemas?

Si algo no funciona:

1. **Verifica dependencias:**
   ```bash
   go version    # Debe ser 1.21+
   node --version # Debe ser 18+
   pnpm --version
   ```

2. **Reinstala dependencias:**
   ```bash
   pnpm install
   cd apps/backend-go && go mod tidy
   ```

3. **Verifica variables de entorno:**
   - Archivo `apps/backend-go/.env` debe existir
   - Debe tener las variables de Supabase configuradas

## 📋 URLs de desarrollo

Una vez ejecutado:
- 🟦 **Backend API:** http://localhost:8080
- 🌐 **Frontend:** http://localhost:5173