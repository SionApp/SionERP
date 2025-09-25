#!/bin/bash
set -euo pipefail

# Script para levantar Dashboard + Backend Go
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 Iniciando Dashboard + Backend Go..."

# Verificar que Go esté instalado
if ! command -v go &> /dev/null; then
    echo "❌ Go no está instalado. Por favor instala Go desde https://golang.org/dl/"
    echo "   Ejecuta ./setup-environment.sh para configurar el entorno completo"
    exit 1
fi

# Verificar que pnpm esté instalado
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm no está instalado. Por favor instala pnpm con: npm install -g pnpm"
    echo "   Ejecuta ./setup-environment.sh para configurar el entorno completo"
    exit 1
fi

# Verificar configuración del backend
if [ ! -f "$ROOT_DIR/apps/backend-go/.env" ]; then
    echo "❌ Backend no configurado. Ejecuta ./setup-environment.sh primero"
    exit 1
fi

# Instalar dependencias si no existen (en el monorepo)
if [ ! -d "$ROOT_DIR/node_modules" ]; then
    echo "📦 Instalando dependencias del frontend..."
    (cd "$ROOT_DIR" && pnpm install)
fi

# Función para limpiar procesos al salir
cleanup() {
    echo "🛑 Deteniendo todos los servicios..."
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}

# Capturar señal de interrupción
trap cleanup SIGINT SIGTERM

echo "🔧 Iniciando servicios con logs en vivo..."

# Preparar y iniciar Backend Go
if [ -d "$ROOT_DIR/apps/backend-go" ]; then
  (
    cd "$ROOT_DIR/apps/backend-go"
    echo "🟦 Preparando Backend Go..."
    
    # Cargar variables de entorno
    set -o allexport
    source .env
    set +o allexport
    
    # Validar SUPABASE_DB_URL (evitar placeholders)
    if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
      echo "❌ SUPABASE_DB_URL no está configurada en apps/backend-go/.env"
      echo "   Ejecuta ./setup-environment.sh para configurarla."
      exit 1
    fi
    if [[ "${SUPABASE_DB_URL}" == *"[password]"* || "${SUPABASE_DB_URL}" == *"["*"]"* ]]; then
      echo "❌ SUPABASE_DB_URL contiene placeholders como [password]."
      echo "   Aborta el arranque del Backend. Ejecuta ./setup-environment.sh para completar la configuración."
      exit 1
    fi
    
    # Preparar dependencias
    go env -w GOPROXY=https://proxy.golang.org,direct
    go mod tidy
    go mod download
    
    echo "🟦 Iniciando Backend Go en puerto ${PORT:-8080}..."
    go run main.go 2>&1 | sed -u 's/^/[BACKEND] /'
  ) &
else
  echo "⚠️ No se encontró $ROOT_DIR/apps/backend-go"
fi

# Iniciar Dashboard Admin
if [ -d "$ROOT_DIR/apps/admin-panel" ]; then
  (
    cd "$ROOT_DIR/apps/admin-panel"
    echo "🟩 Iniciando Dashboard Admin en puerto 3001..."
    pnpm dev 2>&1 | sed -u 's/^/[DASHBOARD] /'
  ) &
else
  echo "⚠️ No se encontró $ROOT_DIR/apps/admin-panel"
fi

printf "\n✅ Servicios ejecutándose:\n"
echo "   🟦 Backend Go:  http://localhost:${PORT:-8080}/"
echo "   🟩 Dashboard:   http://localhost:3001"
echo ""
echo "💡 Consejo: Espera unos segundos a que ambos servicios estén listos"
echo "Presiona Ctrl+C para detener todos los servicios"

# Esperar a que todos los procesos terminen
wait