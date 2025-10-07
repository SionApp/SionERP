# Scripts de Backup y Datos Fake

Este directorio contiene scripts para hacer backup de los datos reales de usuarios y reemplazarlos con datos fake para desarrollo.

## ⚠️ IMPORTANTE

**ESTOS SCRIPTS ELIMINARÁN PERMANENTEMENTE TODOS LOS DATOS REALES DE USUARIOS**

Asegúrate de:
1. ✅ Hacer backup antes de ejecutar
2. ✅ Estar en un entorno de desarrollo
3. ✅ Tener acceso a la base de datos
4. ✅ Confirmar que quieres proceder

## 📁 Archivos

### Scripts SQL
- `backup-users-data.sql` - Script SQL para crear tabla de backup
- `generate-fake-users.sql` - Script SQL para generar datos fake

### Scripts de Ejecución
- `backup-and-replace-users.sh` - Script Bash completo (recomendado)
- `backup-with-supabase.js` - Script Node.js usando cliente Supabase

## 🚀 Uso Recomendado (Bash)

### Prerrequisitos
```bash
# Instalar PostgreSQL client si no lo tienes
# macOS:
brew install postgresql

# Ubuntu/Debian:
sudo apt-get install postgresql-client
```

### Ejecución
```bash
# Desde la raíz del proyecto
./scripts/backup-and-replace-users.sh
```

El script:
1. 📊 Crea backup de datos reales
2. 💾 Exporta a CSV con timestamp
3. ⚠️ Pide confirmación
4. 🗑️ Elimina datos reales
5. 🎭 Genera datos fake
6. 📈 Muestra resumen

## 🚀 Uso Alternativo (Node.js)

### Prerrequisitos
```bash
# Instalar dependencias si no están
npm install @supabase/supabase-js
```

### Ejecución
```bash
# Desde la raíz del proyecto
node scripts/backup-with-supabase.js
```

## 📊 Datos Fake Generados

Los datos fake incluyen:

### Roles y Cantidades
- **Pastores**: 2 usuarios (principal + juventud)
- **Staff**: 2 usuarios (admin + secretaria)
- **Supervisores**: 2 usuarios (zona norte + sur)
- **Líderes de Célula**: 3 usuarios (grupos Esperanza, Fe, Amor)
- **Miembros**: 10 usuarios activos
- **Inactivos**: 2 usuarios para pruebas

### Características de los Datos Fake
- ✅ Emails únicos con dominio `@iglesiasion.com`
- ✅ Cédulas secuenciales (12345678-12345697)
- ✅ Teléfonos secuenciales (555-0001 a 555-0020)
- ✅ Roles jerárquicos apropiados
- ✅ Zonas geográficas (Centro, Norte, Sur)
- ✅ Grupos de célula asignados
- ✅ Fechas de bautismo realistas
- ✅ Información personal variada

## 📁 Estructura de Backup

Los backups se guardan en `./data/` con formato:
```
users-backup-YYYYMMDD_HHMMSS.csv
users-backup-YYYYMMDD_HHMMSS.json (solo con Node.js)
```

## 🔄 Restaurar Datos Reales

Si necesitas restaurar los datos reales:

### Desde CSV
```sql
-- Conectar a la base de datos
-- Limpiar tabla
TRUNCATE TABLE users RESTART IDENTITY CASCADE;

-- Importar desde CSV
\COPY users FROM '/ruta/al/backup.csv' WITH CSV HEADER;
```

### Desde JSON (Node.js)
```javascript
const fs = require('fs');
const backupData = JSON.parse(fs.readFileSync('./data/backup.json', 'utf8'));

// Insertar usuarios uno por uno
for (const user of backupData) {
  await supabase.from('users').insert(user);
}
```

## 🛡️ Seguridad

- Los scripts NO suben datos reales a Git
- Los backups se guardan localmente
- Se requiere confirmación explícita
- Se puede restaurar desde backup

## 🐛 Troubleshooting

### Error de conexión a BD
```bash
# Verificar variables de entorno
cat apps/backend-go/.env
```

### Error de permisos
```bash
# Hacer script ejecutable
chmod +x scripts/backup-and-replace-users.sh
```

### Error de PostgreSQL
```bash
# Verificar que psql esté instalado
which psql
psql --version
```

## 📞 Soporte

Si tienes problemas:
1. Verificar que `.env` esté configurado
2. Verificar conexión a Supabase
3. Revisar permisos de archivos
4. Consultar logs de error
