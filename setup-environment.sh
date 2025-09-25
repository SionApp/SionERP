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
        
        # Supabase URL
        while true; do
            read -p "🔗 Ingresa tu Supabase URL (ej: https://tu-proyecto.supabase.co): " SUPABASE_URL
            if validate_supabase_url "$SUPABASE_URL"; then
                break
            fi
        done
        
        # Supabase Anon Key
        echo ""
        echo "🔑 Necesitamos tu Supabase Anon Key."
        echo "   Encuéntrala en: https://supabase.com/dashboard/project/settings/api"
        read -p "🔑 Supabase Anon Key: " SUPABASE_ANON_KEY
        
        # Database URL
        echo ""
        echo "🗄️  Necesitamos la URL de conexión a tu base de datos."
        echo "   Encuéntrala en: https://supabase.com/dashboard/project/settings/database"
        echo "   Formato: postgresql://postgres:[password]@db.tu-proyecto.supabase.co:5432/postgres"
        read -p "🗄️  Database URL: " SUPABASE_DB_URL
        
        # Service Role Key (opcional)
        echo ""
        if ask_yes_no "¿Quieres configurar el Service Role Key ahora? (opcional para desarrollo básico)"; then
            read -p "🔐 Service Role Key: " SUPABASE_SERVICE_ROLE_KEY
        else
            SUPABASE_SERVICE_ROLE_KEY="[service_role_key]"
        fi
        
        # JWT Secret (opcional)
        echo ""
        if ask_yes_no "¿Quieres configurar un JWT Secret personalizado? (opcional)"; then
            read -p "🔒 JWT Secret: " JWT_SECRET
        else
            JWT_SECRET="dev-jwt-secret-$(date +%s)"
        fi
        
        # Crear archivo .env
        cat > .env << EOF
# Supabase Configuration
SUPABASE_URL=$SUPABASE_URL
SUPABASE_DB_URL=$SUPABASE_DB_URL
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY

# Server Configuration
PORT=8081
ENV=development

# JWT Configuration
JWT_SECRET=$JWT_SECRET
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

cd "$ROOT_DIR"
if [ ! -f ".env" ]; then
    if [ -n "${SUPABASE_URL:-}" ]; then
        # Extraer project ID de la URL
        PROJECT_ID=$(echo "$SUPABASE_URL" | sed 's|https://||' | sed 's|\.supabase\.co||')
        
        cat > .env << EOF
VITE_SUPABASE_PROJECT_ID="$PROJECT_ID"
VITE_SUPABASE_PUBLISHABLE_KEY="$SUPABASE_ANON_KEY"
VITE_SUPABASE_URL="$SUPABASE_URL"
EOF
        echo "✅ Archivo .env del frontend creado"
    else
        echo "⚠️  Configuración del frontend saltada (no se configuró Supabase)"
    fi
else
    echo "✅ Archivo .env del frontend ya existe"
fi

# Configurar admin panel
if [ -d "$ROOT_DIR/apps/admin-panel" ]; then
    echo ""
    echo "🟦 Configurando Admin Panel..."
    
    cd "$ROOT_DIR/apps/admin-panel"
    if [ ! -f ".env" ] && [ -n "${SUPABASE_URL:-}" ]; then
        cat > .env << EOF
VITE_SUPABASE_PROJECT_ID="$PROJECT_ID"
VITE_SUPABASE_PUBLISHABLE_KEY="$SUPABASE_ANON_KEY"
VITE_SUPABASE_URL="$SUPABASE_URL"
EOF
        echo "✅ Archivo .env del admin panel creado"
    else
        echo "✅ Admin panel ya configurado"
    fi
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
echo "🎉 ¡Configuración completada exitosamente!"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Para levantar solo el sitio web:     ./start-website.sh"
echo "   2. Para levantar el admin + backend:    ./start-admin.sh"
echo "   3. Para levantar todo el entorno:       ./start-dev.sh"
echo ""
echo "🔗 URLs de desarrollo:"
echo "   🌐 Sitio Web:        http://localhost:8080"
echo "   🟦 Admin Panel:      http://localhost:3001"
echo "   🟦 Backend API:      http://localhost:8081"
echo "   🟨 Sitio Público:    http://localhost:3000"
echo ""
echo "💡 Si tienes problemas, ejecuta este script nuevamente para reconfigurar."