#!/usr/bin/env node

/**
 * Script para hacer backup de usuarios usando el cliente de Supabase
 * Ejecutar con: node scripts/backup-with-supabase.js
 */

const fs = require('fs');
const path = require('path');

// Configurar Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bhtrlwkmcchobwpjkait.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY no está configurada');
  process.exit(1);
}

// Importar cliente de Supabase
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function backupUsers() {
  try {
    console.log('📊 Obteniendo datos de usuarios...');
    
    // Obtener todos los usuarios
    const { data: users, error } = await supabase
      .from('users')
      .select('*');

    if (error) {
      throw error;
    }

    console.log(`📁 Encontrados ${users.length} usuarios`);

    // Crear directorio de backup
    const backupDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Generar nombre de archivo con timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `users-backup-${timestamp}.json`);
    const csvFile = path.join(backupDir, `users-backup-${timestamp}.csv`);

    // Guardar como JSON
    fs.writeFileSync(backupFile, JSON.stringify(users, null, 2));
    console.log(`✅ Backup JSON creado: ${backupFile}`);

    // Convertir a CSV
    if (users.length > 0) {
      const headers = Object.keys(users[0]);
      const csvContent = [
        headers.join(','),
        ...users.map(user => 
          headers.map(header => {
            const value = user[header];
            // Escapar comillas y comas
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value || '';
          }).join(',')
        )
      ].join('\n');

      fs.writeFileSync(csvFile, csvContent);
      console.log(`✅ Backup CSV creado: ${csvFile}`);
    }

    return { users, backupFile, csvFile };

  } catch (error) {
    console.error('❌ Error al hacer backup:', error.message);
    throw error;
  }
}

async function generateFakeUsers() {
  try {
    console.log('🎭 Generando datos fake...');

    // Primero eliminar todos los usuarios existentes
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Esto elimina todos

    if (deleteError) {
      throw deleteError;
    }

    console.log('🗑️  Datos reales eliminados');

    // Datos fake de usuarios
    const fakeUsers = [
      {
        email: 'pastor.principal@iglesiasion.com',
        first_name: 'Carlos',
        last_name: 'Mendoza',
        id_number: '12345678',
        phone: '555-0001',
        address: 'Av. Principal 123',
        role: 'pastor',
        birth_date: '1980-05-15',
        baptized: true,
        baptism_date: '1995-03-20',
        zone_name: 'Centro',
        is_active: true,
        marital_status: 'married',
        occupation: 'Pastor Principal',
        education_level: 'Master en Teología',
        how_found_church: 'Nació en la iglesia',
        ministry_interest: 'Predicación y Liderazgo',
        first_visit_date: '1980-01-01',
        is_active_member: true,
        membership_date: '1980-01-01',
        cell_group: 'Grupo Principal',
        pastoral_notes: 'Líder espiritual de la iglesia',
        whatsapp: true,
        territory: 'Centro',
        discipleship_level: 1
      },
      {
        email: 'pastor.juventud@iglesiasion.com',
        first_name: 'Ana',
        last_name: 'Rodríguez',
        id_number: '12345679',
        phone: '555-0002',
        address: 'Calle Juventud 456',
        role: 'pastor',
        birth_date: '1985-08-22',
        baptized: true,
        baptism_date: '1998-07-15',
        zone_name: 'Norte',
        is_active: true,
        marital_status: 'single',
        occupation: 'Pastor de Juventud',
        education_level: 'Licenciatura en Ministerio',
        how_found_church: 'Invitado por amigo',
        ministry_interest: 'Ministerio Juvenil',
        first_visit_date: '1998-05-10',
        is_active_member: true,
        membership_date: '1998-05-10',
        cell_group: 'Juventud Activa',
        pastoral_notes: 'Especialista en ministerio juvenil',
        whatsapp: true,
        territory: 'Norte',
        discipleship_level: 2
      },
      {
        email: 'admin@iglesiasion.com',
        first_name: 'Laura',
        last_name: 'García',
        id_number: '12345681',
        phone: '555-0004',
        address: 'Oficina Central 321',
        role: 'staff',
        birth_date: '1990-03-10',
        baptized: true,
        baptism_date: '2005-06-12',
        zone_name: 'Centro',
        is_active: true,
        marital_status: 'single',
        occupation: 'Administradora',
        education_level: 'Licenciatura en Administración',
        how_found_church: 'Familia miembro',
        ministry_interest: 'Administración y Finanzas',
        first_visit_date: '2005-03-01',
        is_active_member: true,
        membership_date: '2005-03-01',
        cell_group: 'Staff Central',
        pastoral_notes: 'Manejo administrativo de la iglesia',
        whatsapp: true,
        territory: 'Centro',
        discipleship_level: 3
      },
      // Agregar más usuarios fake aquí...
      {
        email: 'miembro1@iglesiasion.com',
        first_name: 'Alejandra',
        last_name: 'Ruiz',
        id_number: '12345688',
        phone: '555-0011',
        address: 'Calle Miembros 852',
        role: 'member',
        birth_date: '1995-08-05',
        baptized: true,
        baptism_date: '2015-12-24',
        zone_name: 'Centro',
        is_active: true,
        marital_status: 'single',
        occupation: 'Estudiante Universitaria',
        education_level: 'Universitario',
        how_found_church: 'Redes sociales',
        ministry_interest: 'Música y Adoración',
        first_visit_date: '2015-10-15',
        is_active_member: true,
        membership_date: '2015-10-15',
        cell_group: 'Esperanza',
        pastoral_notes: 'Miembro activo en ministerio de música',
        whatsapp: true,
        territory: 'Centro',
        discipleship_level: 5
      }
    ];

    // Insertar usuarios fake
    const { error: insertError } = await supabase
      .from('users')
      .insert(fakeUsers);

    if (insertError) {
      throw insertError;
    }

    console.log(`✅ ${fakeUsers.length} usuarios fake creados exitosamente`);

    // Mostrar resumen
    const { data: summary } = await supabase
      .from('users')
      .select('role')
      .not('role', 'is', null);

    const roleCount = summary.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});

    console.log('\n📊 Resumen de usuarios creados:');
    Object.entries(roleCount).forEach(([role, count]) => {
      console.log(`  ${role}: ${count} usuarios`);
    });

  } catch (error) {
    console.error('❌ Error al generar datos fake:', error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('🔄 Iniciando proceso de backup y reemplazo de datos de usuarios...\n');

    // Paso 1: Hacer backup
    const { users, backupFile, csvFile } = await backupUsers();

    // Confirmación antes de proceder
    console.log(`\n⚠️  ADVERTENCIA: Estás a punto de ELIMINAR ${users.length} usuarios reales`);
    console.log(`📁 Backup guardado en: ${backupFile}`);
    console.log(`📁 CSV guardado en: ${csvFile}`);
    
    // En un entorno interactivo, aquí pedirías confirmación
    console.log('\n🎭 Procediendo a generar datos fake...');

    // Paso 2: Generar datos fake
    await generateFakeUsers();

    console.log('\n🎉 ¡Proceso completado exitosamente!');
    console.log('🎭 Datos fake generados y listos para desarrollo');

  } catch (error) {
    console.error('\n❌ Error en el proceso:', error.message);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { backupUsers, generateFakeUsers };
