# 🚀 Inicio Rápido - Iglesia Sion

## ⚡ Configuración en 3 pasos

### 1️⃣ Configurar el entorno (solo la primera vez)
```bash
chmod +x setup-environment.sh
./setup-environment.sh
```

Este script te ayudará a:
- ✅ Verificar todas las dependencias (Go, pnpm, Node.js)
- ✅ Instalar lo que falte automáticamente 
- ✅ Configurar todas las variables de entorno de Supabase
- ✅ Descargar dependencias de Go y frontend
- ✅ Crear todos los archivos `.env` necesarios

### 2️⃣ Elegir qué ejecutar

**Para desarrollo administrativo:**
```bash
./start-admin.sh
```
- 🟦 Backend Go (puerto 8081)
- 🟩 Dashboard Admin (puerto 3001)

**Para desarrollo web público:**
```bash
./start-website.sh
```
- 🌐 Sitio Web (puerto 8080)

**Para desarrollo completo:**
```bash
./start-dev.sh
```
- 🟦 Backend Go (puerto 8081)
- 🌐 Sitio Web (puerto 8080) 
- 🟩 Dashboard Admin (puerto 3001)
- 🟨 Sitio Público Alt (puerto 3000)

### 3️⃣ ¡Listo! 🎉

Los scripts ahora son **inteligentes** y:
- ✅ Verifican configuración antes de ejecutar
- ✅ Cargan variables de entorno automáticamente
- ✅ Preparan dependencias de Go automáticamente
- ✅ Muestran mensajes de error claros
- ✅ Te dicen exactamente qué hacer si algo falla

## 🆘 ¿Problemas?

Si algo no funciona, simplemente ejecuta de nuevo:
```bash
./setup-environment.sh
```

El script detectará qué está mal configurado y te ayudará a arreglarlo.

## 📋 URLs de desarrollo

Una vez ejecutado:
- 🟦 **Backend API:** http://localhost:8081/api/v1/health
- 🌐 **Sitio Web:** http://localhost:8080  
- 🟩 **Admin Panel:** http://localhost:3001
- 🟨 **Sitio Público:** http://localhost:3000