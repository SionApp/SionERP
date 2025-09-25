#!/bin/bash
set -euo pipefail

# Script para levantar Dashboard + Backend Go
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 Iniciando Dashboard + Backend Go..."

# Verificar que Go esté instalado
if ! command -v go &> /dev/null; then
    echo "❌ Go no está instalado. Por favor instala Go desde https://golang.org/dl/"
    exit 1
fi

# Verificar que pnpm esté instalado
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm no está instalado. Por favor instala pnpm con: npm install -g pnpm"
    exit 1
fi

# Instalar dependencias si no existen (en el monorepo)
if [ ! -d "$ROOT_DIR/node_modules" ]; then
    echo "📦 Instalando dependencias..."
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

# Iniciar Backend Go
if [ -d "$ROOT_DIR/apps/backend-go" ]; then
  (
    cd "$ROOT_DIR/apps/backend-go"
    echo "🟦 Iniciando Backend Go en puerto 8081..."
    PORT=8081 GO_ENV=development go run main.go 2>&1 | sed -u 's/^/[BACKEND] /'
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
echo "   🟦 Backend Go:  http://localhost:8081"
echo "   🟩 Dashboard:   http://localhost:3001"
echo ""
echo "Presiona Ctrl+C para detener todos los servicios"

# Esperar a que todos los procesos terminen
wait