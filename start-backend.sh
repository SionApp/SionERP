#!/bin/bash
set -euo pipefail

# Script para levantar solo el Backend Go
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🟦 Iniciando Backend Go..."

# Verificar que Go esté instalado
if ! command -v go &> /dev/null; then
    echo "❌ Go no está instalado. Por favor instala Go desde https://golang.org/dl/"
    exit 1
fi

# Verificar que existe el directorio del backend
if [ ! -d "$ROOT_DIR/apps/backend-go" ]; then
    echo "❌ No se encontró el directorio $ROOT_DIR/apps/backend-go"
    exit 1
fi

# Función para limpiar procesos al salir
cleanup() {
    echo "🛑 Deteniendo Backend Go..."
    kill $! 2>/dev/null || true
    exit 0
}

# Capturar señal de interrupción
trap cleanup SIGINT SIGTERM

echo "🚀 Iniciando Backend Go en puerto 8081..."

# Iniciar Backend Go
cd "$ROOT_DIR/apps/backend-go"
PORT=8081 GO_ENV=development go run main.go &

printf "\n✅ Backend Go ejecutándose:\n"
echo "   🟦 Backend: http://localhost:8081"
echo ""
echo "Presiona Ctrl+C para detener el servicio"

# Esperar a que el proceso termine
wait