#!/bin/bash
set -euo pipefail

# Script para levantar solo el Dashboard Principal
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🟩 Iniciando Dashboard Principal..."

# Verificar que pnpm esté instalado
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm no está instalado. Por favor instala pnpm con: npm install -g pnpm"
    exit 1
fi

# Instalar dependencias si no existen
if [ ! -d "$ROOT_DIR/node_modules" ]; then
    echo "📦 Instalando dependencias..."
    pnpm install
fi

# Función para limpiar procesos al salir
cleanup() {
    echo "🛑 Deteniendo Dashboard Principal..."
    kill $! 2>/dev/null || true
    exit 0
}

# Capturar señal de interrupción
trap cleanup SIGINT SIGTERM

echo "🚀 Iniciando Dashboard Principal en puerto 8080..."

# Iniciar Dashboard Principal
cd "$ROOT_DIR"
pnpm dev &

printf "\n✅ Dashboard Principal ejecutándose:\n"
echo "   🟩 Dashboard: http://localhost:8080"
echo ""
echo "Presiona Ctrl+C para detener el servicio"

# Esperar a que el proceso termine
wait