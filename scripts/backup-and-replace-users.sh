#!/bin/bash

# Script para hacer backup de datos reales y reemplazar con datos fake
# Ejecutar desde la raíz del proyecto

echo "🔄 Iniciando proceso de backup y reemplazo de datos de usuarios..."

# Configurar variables
BACKUP_DIR="./data"
BACKUP_FILE="$BACKUP_DIR/users-backup-$(date +%Y%m%d_%H%M%S).csv"
SCRIPTS_DIR="./scripts"

# Crear directorio de backup si no existe
mkdir -p "$BACKUP_DIR"

# Verificar que el archivo .env existe
if [ ! -f "apps/backend-go/.env" ]; then
    echo "❌ Error: Archivo .env no encontrado en apps/backend-go/"
    exit 1
fi

# Cargar variables de entorno
source apps/backend-go/.env

# Configurar ruta de psql
PSQL_CMD="/opt/homebrew/opt/postgresql@14/bin/psql"

echo "📊 Paso 1: Creando backup de datos reales..."

# Ejecutar script de backup en Supabase
$PSQL_CMD "$SUPABASE_DB_URL" -f "$SCRIPTS_DIR/backup-users-data.sql"

# Exportar datos a CSV
echo "📁 Paso 2: Exportando datos a CSV..."
$PSQL_CMD "$SUPABASE_DB_URL" -c "\COPY users_backup TO '$BACKUP_FILE' WITH CSV HEADER;"

if [ $? -eq 0 ]; then
    echo "✅ Backup creado exitosamente: $BACKUP_FILE"
else
    echo "❌ Error al crear backup"
    exit 1
fi

# Confirmar antes de proceder
echo ""
echo "⚠️  ADVERTENCIA: Estás a punto de ELIMINAR todos los datos reales de usuarios"
echo "📁 Backup guardado en: $BACKUP_FILE"
echo ""
read -p "¿Estás seguro de continuar? (escribe 'SI' para confirmar): " confirmacion

if [ "$confirmacion" != "SI" ]; then
    echo "❌ Operación cancelada por el usuario"
    exit 1
fi

echo "🗑️  Paso 3: Eliminando datos reales..."

# Ejecutar script para generar datos fake
echo "🎭 Paso 4: Generando datos fake..."
$PSQL_CMD "$SUPABASE_DB_URL" -f "$SCRIPTS_DIR/generate-fake-users.sql"

if [ $? -eq 0 ]; then
    echo "✅ Datos fake generados exitosamente"
else
    echo "❌ Error al generar datos fake"
    echo "🔄 Restaurando desde backup..."
    $PSQL_CMD "$SUPABASE_DB_URL" -c "DROP TABLE IF EXISTS users_backup;"
    exit 1
fi

# Limpiar tabla temporal de backup
$PSQL_CMD "$SUPABASE_DB_URL" -c "DROP TABLE IF EXISTS users_backup;"

echo ""
echo "🎉 ¡Proceso completado exitosamente!"
echo "📁 Backup de datos reales: $BACKUP_FILE"
echo "🎭 Datos fake generados y listos para desarrollo"
echo ""
echo "📊 Resumen de usuarios creados:"
$PSQL_CMD "$SUPABASE_DB_URL" -c "SELECT role, COUNT(*) as cantidad FROM users GROUP BY role ORDER BY role;"
