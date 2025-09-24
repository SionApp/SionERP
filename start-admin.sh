#!/bin/bash

# Script para levantar solo el backend y el panel admin
echo "🚀 Iniciando Backend + Panel Admin..."

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

# Instalar dependencias si no existen
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    pnpm install
fi

# Función para limpiar procesos al salir
cleanup() {
    echo "🛑 Deteniendo todos los servicios..."
    kill $(jobs -p) 2>/dev/null
    exit 0
}

# Capturar señal de interrupción
trap cleanup SIGINT SIGTERM

echo "🔧 Iniciando servicios..."

# Iniciar Backend Go
echo "🟦 Iniciando Backend Go en puerto 8080..."
cd apps/backend-go && go run main.go &
BACKEND_PID=$!

# Esperar un momento para que el backend se inicie
sleep 2

# Iniciar Admin Panel
echo "🟩 Iniciando Panel Admin en puerto 3001..."
cd ../admin-panel && pnpm dev &
ADMIN_PID=$!

# Volver al directorio raíz
cd ../..

echo ""
echo "✅ Servicios ejecutándose:"
echo "   🟦 Backend Go:  http://localhost:8080"
echo "   🟩 Panel Admin: http://localhost:3001"
echo ""
echo "Presiona Ctrl+C para detener todos los servicios"

# Esperar a que todos los procesos terminen
wait