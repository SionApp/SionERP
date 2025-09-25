#!/bin/bash
set -euo pipefail

# Script para levantar solo el Backend Go
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🟦 Iniciando Backend Go..."

# Verificar que Go esté instalado
if ! command -v go &> /dev/null; then
    echo "❌ Go no está instalado. Por favor instala Go desde https://golang.org/dl/"
    echo "   Ejecuta ./setup-environment.sh para configurar el entorno completo"
    exit 1
fi

# Verificar que existe el directorio del backend
if [ ! -d "$ROOT_DIR/apps/backend-go" ]; then
    echo "❌ No se encontró el directorio $ROOT_DIR/apps/backend-go"
    exit 1
fi

# Ir al directorio del backend
cd "$ROOT_DIR/apps/backend-go"

# Verificar si existe .env
if [ ! -f ".env" ]; then
    echo "❌ No se encontró el archivo .env en apps/backend-go/"
    echo "   Ejecuta ./setup-environment.sh para configurar el entorno"
    exit 1
fi

# Cargar variables de entorno
echo "🔧 Cargando variables de entorno..."
set -o allexport
source .env
set +o allexport

# Verificar variables críticas
if [ -z "${SUPABASE_DB_URL:-}" ]; then
    echo "❌ SUPABASE_DB_URL no está configurada en .env"
    echo "   Ejecuta ./setup-environment.sh para configurar correctamente"
    exit 1
fi

# Configurar proxy y descargar dependencias
echo "📦 Preparando dependencias de Go..."
go env -w GOPROXY=https://proxy.golang.org,direct
go mod tidy
go mod download

echo "✅ Backend configurado correctamente"

# Función para limpiar procesos al salir
cleanup() {
    echo "🛑 Deteniendo Backend Go..."
    kill $! 2>/dev/null || true
    exit 0
}

# Capturar señal de interrupción
trap cleanup SIGINT SIGTERM

echo "🚀 Iniciando Backend Go en puerto ${PORT:-8081}..."

# Iniciar Backend Go (las variables ya están cargadas del .env)
go run main.go &

printf "\n✅ Backend Go ejecutándose:\n"
echo "   🟦 Backend: http://localhost:8081"
echo ""
echo "Presiona Ctrl+C para detener el servicio"

# Esperar a que el proceso termine
wait