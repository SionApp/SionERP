#!/bin/bash
set -euo pipefail

# Script de configuración inicial del entorno de desarrollo
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 Configuración inicial del entorno de desarrollo - Iglesia Sion"
echo "=================================================================="

# Función para preguntar si/no
ask_yes_no() {
    local prompt="$1"
    while true; do
        read -p "$prompt (y/n): " yn
        case $yn in
            [Yy]* ) return 0;;
            [Nn]* ) return 1;;
            * ) echo "Por favor responde y o n.";;
        esac
    done
}

# Función para validar URL de Supabase
validate_supabase_url() {
    local url="$1"
    if [[ $url =~ ^https://[a-zA-Z0-9-]+\.supabase\.co$ ]]; then
        return 0
    else
        echo "❌ URL no válida. Debe ser: https://tu-proyecto.supabase.co"
        return 1
    fi
}

# Verificar dependencias del sistema
echo "🔍 Verificando dependencias del sistema..."

# Verificar pnpm
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm no está instalado."
    if ask_yes_no "¿Quieres instalarlo automáticamente?"; then
        npm install -g pnpm
        echo "✅ pnpm instalado correctamente"
    else
        echo "❌ pnpm es requerido. Instálalo con: npm install -g pnpm"
        exit 1
    fi
else
    echo "✅ pnpm encontrado: $(pnpm --version)"
fi

# Verificar Go
if ! command -v go &> /dev/null; then
    echo "❌ Go no está instalado."
    echo "   Descárgalo desde: https://golang.org/dl/"
    exit 1
else
    echo "✅ Go encontrado: $(go version)"
fi

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado."
    exit 1
else
    echo "✅ Node.js encontrado: $(node --version)"
fi

echo ""
echo "📦 Configurando dependencias..."

# Instalar dependencias del monorepo
if [ ! -d "$ROOT_DIR/node_modules" ]; then
    echo "📥 Instalando dependencias del frontend..."
    cd "$ROOT_DIR"
    pnpm install
    echo "✅ Dependencias del frontend instaladas"
else
    echo "✅ Dependencias del frontend ya instaladas"
fi

# Configurar Go backend
echo ""
echo "🟦 Configurando Backend Go..."

if [ -d "$ROOT_DIR/apps/backend-go" ]; then
    cd "$ROOT_DIR/apps/backend-go"
    
    # Configurar Go proxy y verificar módulos
    go env -w GOPROXY=https://proxy.golang.org,direct
    echo "🔄 Descargando dependencias de Go..."
    go mod tidy
    go mod download
    echo "✅ Dependencias de Go configuradas"
    
    # Configurar variables de entorno del backend
    if [ ! -f ".env" ]; then
        echo ""
        echo "🔧 Configurando variables de entorno del backend..."
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        
        # Supabase URL
        echo ""
        echo "📍 SUPABASE URL"
        echo "   Puedes encontrarla en: https://supabase.com/dashboard/project/settings/api"
        while true; do
            read -p "🔗 Ingresa tu Supabase URL (ej: https://abcd1234.supabase.co): " SUPABASE_URL
            if validate_supabase_url "$SUPABASE_URL"; then
                break
            fi
        done
        
        # Supabase Anon Key
        echo ""
        echo "🔑 SUPABASE ANON KEY (Clave Pública)"
        echo "   Puedes encontrarla en: https://supabase.com/dashboard/project/settings/api"
        echo "   Ejemplo: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        while true; do
            read -p "🔑 Supabase Anon Key: " SUPABASE_ANON_KEY
            if [ -n "$SUPABASE_ANON_KEY" ] && [ ${#SUPABASE_ANON_KEY} -gt 100 ]; then
                break
            else
                echo "❌ La Anon Key parece incorrecta (debe ser más larga). Inténtalo de nuevo."
            fi
        done
        
        # Database URL
        echo ""
        echo "🗄️  DATABASE CONNECTION URL"
        echo "   Puedes encontrarla en: https://supabase.com/dashboard/project/settings/database"
        echo "   En la sección 'Connection string' selecciona 'URI'"
        echo "   Formato: postgresql://postgres:[password]@db.abcd1234.supabase.co:5432/postgres"
        echo "   ⚠️  IMPORTANTE: Reemplaza [password] con tu contraseña real de la base de datos"
        while true; do
            read -p "🗄️  Database URL: " SUPABASE_DB_URL
            if [[ $SUPABASE_DB_URL =~ ^postgresql://postgres:.+@db\..+\.supabase\.co:5432/postgres$ ]]; then
                break
            else
                echo "❌ URL no válida. Debe seguir el formato: postgresql://postgres:password@db.proyecto.supabase.co:5432/postgres"
                echo "   Asegúrate de reemplazar [password] con tu contraseña real"
            fi
        done
        
        # Service Role Key (opcional pero recomendado)
        echo ""
        echo "🔐 SERVICE ROLE KEY (Recomendado para funciones avanzadas)"
        echo "   Puedes encontrarla en: https://supabase.com/dashboard/project/settings/api"
        echo "   Esta clave se usa para operaciones administrativas del backend"
        if ask_yes_no "¿Quieres configurar el Service Role Key ahora?"; then
            while true; do
                read -p "🔐 Service Role Key: " SUPABASE_SERVICE_ROLE_KEY
                if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ] && [ ${#SUPABASE_SERVICE_ROLE_KEY} -gt 100 ]; then
                    break
                else
                    echo "❌ La Service Role Key parece incorrecta. Inténtalo de nuevo o presiona Ctrl+C para omitir."
                fi
            done
        else
            SUPABASE_SERVICE_ROLE_KEY="[service_role_key]"
            echo "⚠️  Service Role Key omitida. Algunas funciones avanzadas pueden no funcionar."
        fi
        
        # Puerto del backend
        echo ""
        echo "🚪 PUERTO DEL BACKEND"
        echo "   Puerto donde se ejecutará el servidor Go (por defecto: 8081)"
        read -p "🚪 Puerto del backend [8081]: " BACKEND_PORT
        BACKEND_PORT=${BACKEND_PORT:-8081}
        
        # Entorno de desarrollo
        echo ""
        echo "🔧 ENTORNO DE DESARROLLO"
        echo "   Configuración del entorno (development/production)"
        read -p "🔧 Entorno [development]: " GO_ENV
        GO_ENV=${GO_ENV:-development}
        
        # JWT Secret
        echo ""
        echo "🔒 JWT SECRET (Clave para tokens)"
        echo "   Se usa para firmar y verificar tokens JWT"
        if ask_yes_no "¿Quieres configurar un JWT Secret personalizado?"; then
            while true; do
                read -p "🔒 JWT Secret (mínimo 32 caracteres): " JWT_SECRET
                if [ ${#JWT_SECRET} -ge 32 ]; then
                    break
                else
                    echo "❌ El JWT Secret debe tener al menos 32 caracteres para ser seguro"
                fi
            done
        else
            JWT_SECRET="dev-jwt-secret-$(date +%s)-$(openssl rand -hex 16 2>/dev/null || echo "fallback$(date +%s)")"
            echo "✅ JWT Secret generado automáticamente"
        fi
        
        # Crear archivo .env del backend
        echo ""
        echo "💾 Creando archivo .env del backend..."
        cat > .env << EOF
# ==========================================
# Configuración del Backend Go - Iglesia Sion
# ==========================================

# Supabase Configuration
SUPABASE_URL=$SUPABASE_URL
SUPABASE_DB_URL=$SUPABASE_DB_URL
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY

# Server Configuration
PORT=$BACKEND_PORT
ENV=$GO_ENV

# JWT Configuration (para autenticación)
JWT_SECRET=$JWT_SECRET

# ==========================================
# Generado automáticamente por setup-environment.sh
# Fecha: $(date)
# ==========================================
EOF
        
        echo "✅ Archivo .env del backend creado"
    else
        echo "✅ Archivo .env del backend ya existe"
    fi
else
    echo "⚠️  Directorio backend-go no encontrado, saltando configuración del backend"
fi

# Configurar variables de entorno del frontend
echo ""
echo "🟩 Configurando variables de entorno del frontend..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$ROOT_DIR"
if [ ! -f ".env" ]; then
    if [ -n "${SUPABASE_URL:-}" ]; then
        # Extraer project ID de la URL
        PROJECT_ID=$(echo "$SUPABASE_URL" | sed 's|https://||' | sed 's|\.supabase\.co||')
        
        echo "📝 Configurando variables del sitio web principal..."
        echo "   - Project ID: $PROJECT_ID"
        echo "   - Supabase URL: $SUPABASE_URL"
        
        cat > .env << EOF
# ==========================================
# Configuración del Sitio Web Principal - Iglesia Sion  
# ==========================================

# Supabase Configuration para Frontend
VITE_SUPABASE_PROJECT_ID="$PROJECT_ID"
VITE_SUPABASE_PUBLISHABLE_KEY="$SUPABASE_ANON_KEY"
VITE_SUPABASE_URL="$SUPABASE_URL"

# ==========================================
# Generado automáticamente por setup-environment.sh
# Fecha: $(date)
# ==========================================
EOF
        echo "✅ Archivo .env del sitio web principal creado"
    else
        echo "⚠️  Configuración del frontend saltada (no se configuró Supabase)"
    fi
else
    echo "✅ Archivo .env del sitio web principal ya existe"
fi

# Configurar admin panel
if [ -d "$ROOT_DIR/apps/admin-panel" ]; then
    echo ""
    echo "🟦 Configurando Admin Panel..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    cd "$ROOT_DIR/apps/admin-panel"
    if [ ! -f ".env" ] && [ -n "${SUPABASE_URL:-}" ]; then
        echo "📝 Configurando variables del dashboard administrativo..."
        echo "   - Project ID: $PROJECT_ID"
        echo "   - Puerto de ejecución: 3001"
        
        cat > .env << EOF
# ==========================================
# Configuración del Dashboard Admin - Iglesia Sion
# ==========================================

# Supabase Configuration para Admin Panel
VITE_SUPABASE_PROJECT_ID="$PROJECT_ID"
VITE_SUPABASE_PUBLISHABLE_KEY="$SUPABASE_ANON_KEY"
VITE_SUPABASE_URL="$SUPABASE_URL"

# Admin Panel Configuration
VITE_ADMIN_PORT=3001

# ==========================================
# Generado automáticamente por setup-environment.sh
# Fecha: $(date)
# ==========================================
EOF
        echo "✅ Archivo .env del dashboard admin creado"
    else
        echo "✅ Dashboard admin ya configurado"
    fi
else
    echo "⚠️  Directorio admin-panel no encontrado, saltando configuración"
fi

# Configurar sitio público alternativo si existe
if [ -d "$ROOT_DIR/apps/public-site" ]; then
    echo ""
    echo "🟨 Configurando Sitio Público Alternativo..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    cd "$ROOT_DIR/apps/public-site"
    if [ ! -f ".env" ] && [ -n "${SUPABASE_URL:-}" ]; then
        echo "📝 Configurando variables del sitio público..."
        echo "   - Project ID: $PROJECT_ID"
        echo "   - Puerto de ejecución: 3000"
        
        cat > .env << EOF
# ==========================================
# Configuración del Sitio Público - Iglesia Sion
# ==========================================

# Supabase Configuration para Public Site  
VITE_SUPABASE_PROJECT_ID="$PROJECT_ID"
VITE_SUPABASE_PUBLISHABLE_KEY="$SUPABASE_ANON_KEY"
VITE_SUPABASE_URL="$SUPABASE_URL"

# Public Site Configuration
VITE_PUBLIC_PORT=3000

# ==========================================
# Generado automáticamente por setup-environment.sh
# Fecha: $(date)
# ==========================================
EOF
        echo "✅ Archivo .env del sitio público creado"
    else
        echo "✅ Sitio público ya configurado"
    fi
else
    echo "⚠️  Directorio public-site no encontrado, saltando configuración"
fi

# Verificar configuración
echo ""
echo "🔍 Verificando configuración..."

# Test Go backend build
if [ -d "$ROOT_DIR/apps/backend-go" ]; then
    cd "$ROOT_DIR/apps/backend-go"
    if go build -o /tmp/backend-test main.go; then
        rm -f /tmp/backend-test
        echo "✅ Backend Go se compila correctamente"
    else
        echo "❌ Error al compilar el backend Go"
        exit 1
    fi
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "🎉 ¡CONFIGURACIÓN COMPLETADA EXITOSAMENTE!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📋 PRÓXIMOS PASOS:"
echo ""
echo "   1️⃣  Para desarrollo web público:"
echo "       ./start-website.sh"
echo "       → Sitio Web: http://localhost:8080"
echo ""
echo "   2️⃣  Para administración completa:"
echo "       ./start-admin.sh"
echo "       → Backend API: http://localhost:${BACKEND_PORT:-8081}/api/v1/health"  
echo "       → Dashboard: http://localhost:3001"
echo ""
echo "   3️⃣  Para desarrollo completo:"
echo "       ./start-dev.sh"
echo "       → Todos los servicios en paralelo"
echo ""
echo "🔗 URLS DE DESARROLLO:"
echo "   🌐 Sitio Web Principal:  http://localhost:8080"
echo "   🟦 Dashboard Admin:      http://localhost:3001"  
echo "   🟦 Backend API:          http://localhost:${BACKEND_PORT:-8081}"
echo "   🟨 Sitio Público Alt:    http://localhost:3000"
echo ""
echo "📁 ARCHIVOS CREADOS:"
echo "   ✅ $ROOT_DIR/.env (Sitio Web)"
if [ -f "$ROOT_DIR/apps/backend-go/.env" ]; then
    echo "   ✅ apps/backend-go/.env (Backend)"
fi
if [ -f "$ROOT_DIR/apps/admin-panel/.env" ]; then
    echo "   ✅ apps/admin-panel/.env (Dashboard)"
fi
if [ -f "$ROOT_DIR/apps/public-site/.env" ]; then
    echo "   ✅ apps/public-site/.env (Sitio Público)"
fi
echo ""
echo "🔧 CONFIGURACIÓN SUPABASE:"
echo "   Project ID: ${PROJECT_ID:-No configurado}"
echo "   URL: ${SUPABASE_URL:-No configurada}"
echo "   Backend Puerto: ${BACKEND_PORT:-8081}"
echo ""
echo "💡 CONSEJOS:"
echo "   • Si tienes problemas, ejecuta este script nuevamente"
echo "   • Los archivos .env no se sobrescribirán si ya existen"  
echo "   • Puedes editar manualmente los .env si necesitas cambios"
echo "   • Usa Ctrl+C para detener cualquier servicio"
echo ""
echo "🚀 ¡Listo para comenzar el desarrollo!"