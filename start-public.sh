#!/bin/bash
set -euo pipefail

# Script para levantar solo el Sitio Público
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🟡 Iniciando Sitio Público..."

# Verificar que pnpm esté instalado
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm no está instalado. Por favor instala pnpm con: npm install -g pnpm"
    exit 1
fi

# Verificar que existe el directorio del sitio público
if [ ! -d "$ROOT_DIR/apps/public-site" ]; then
    echo "❌ No se encontró el directorio $ROOT_DIR/apps/public-site"
    exit 1
fi

# Instalar dependencias si no existen
if [ ! -d "$ROOT_DIR/node_modules" ]; then
    echo "📦 Instalando dependencias..."
    (cd "$ROOT_DIR" && pnpm install)
fi

# Función para limpiar procesos al salir
cleanup() {
    echo "🛑 Deteniendo Sitio Público..."
    kill $! 2>/dev/null || true
    exit 0
}

# Capturar señal de interrupción
trap cleanup SIGINT SIGTERM

echo "🚀 Iniciando Sitio Público en puerto 3000..."

# Iniciar Sitio Público
cd "$ROOT_DIR/apps/public-site"
pnpm dev &

printf "\n✅ Sitio Público ejecutándose:\n"
echo "   🟡 Sitio Público: http://localhost:3000"
echo ""
echo "Presiona Ctrl+C para detener el servicio"

# Esperar a que el proceso termine
wait