/**
 * seed-iglesia.mjs
 * Carga inicial de datos: crea las 4 zonas e importa los 580 miembros
 * con su zona asignada según el Excel de la iglesia.
 *
 * Uso: node scripts/seed-iglesia.mjs
 */

import pg from 'pg';
import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { randomUUID } from 'crypto';

const { Client } = pg;

const DB_URL   = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const EXCEL_PATH = '/Users/danzt/Downloads/DATA IGLESIA SION ACT. 14-12-25.xlsx';

// ─── Admin a crear ────────────────────────────────────────────────────────────
const ADMIN_EMAIL    = process.env.SION_ADMIN_EMAIL    || 'pastor@sionerp.local';
const ADMIN_PASSWORD = process.env.SION_ADMIN_PASSWORD || 'SionERP2025!';
const ADMIN_ROLE     = process.env.SION_ADMIN_ROLE     || 'pastor';
const ADMIN_UUID     = process.env.SION_ADMIN_UUID     || 'b0000001-0000-0000-0000-000000000001';

// ─── Zonas a crear ────────────────────────────────────────────────────────────

const ZONAS = [
  { name: 'OESTE 1', color: '#3b82f6', description: 'Zona Oeste 1' },
  { name: 'OESTE 2', color: '#10b981', description: 'Zona Oeste 2' },
  { name: 'OESTE 3', color: '#f59e0b', description: 'Zona Oeste 3' },
  { name: 'ESTE',    color: '#ef4444', description: 'Zona Este'    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanStr(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function normalizeEmail(raw, cedula, rowIdx) {
  const e = cleanStr(raw).toLowerCase().replace(/\s+/g, '');
  if (e && EMAIL_RE.test(e)) return { email: e, generated: false };
  const ced = cleanStr(cedula).replace(/\D/g, '');
  const placeholder = ced ? `${ced}@sionerp.local` : `import.${rowIdx}@sionerp.local`;
  return { email: placeholder, generated: true };
}

function normalizePhone(val) {
  if (!val) return '';
  const s = String(val).replace(/\D/g, '');
  return s || '';
}

function normalizeBool(val) {
  const s = cleanStr(val).toLowerCase();
  return s === 'si' || s === 'sí' || s === 'yes' || s === '1' || s === 'true';
}

// Matches YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY
const DATE_RE = /^\d{4}-\d{2}-\d{2}$|^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/;

function normalizeDate(val) {
  if (!val) return null;
  if (val instanceof Date) {
    const y = val.getFullYear();
    if (y < 1900 || y > 2100) return null;
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = cleanStr(val);
  if (!s) return null;
  // Only pass through strings that look like a real date
  if (DATE_RE.test(s)) return s;
  return null; // "NO REC.", "ENERO, 2011", "NOV.2014", etc. → null
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  console.log('✅ Conectado a la base de datos\n');

  try {
    // ── 1. Crear zonas ───────────────────────────────────────────────────────
    console.log('── Creando zonas...');
    const zoneIdMap = {}; // name → uuid

    for (const zona of ZONAS) {
      // Verificar si ya existe
      const existing = await client.query(
        'SELECT id FROM zones WHERE LOWER(name) = LOWER($1)',
        [zona.name]
      );
      if (existing.rows.length > 0) {
        zoneIdMap[zona.name] = existing.rows[0].id;
        console.log(`  → "${zona.name}" ya existe (${existing.rows[0].id})`);
      } else {
        const id = randomUUID();
        await client.query(
          `INSERT INTO zones (id, name, description, color, created_at, updated_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW())`,
          [id, zona.name, zona.description, zona.color]
        );
        zoneIdMap[zona.name] = id;
        console.log(`  ✓ "${zona.name}" creada (${id})`);
      }
    }
    console.log();

    // ── 2. Leer Excel ────────────────────────────────────────────────────────
    console.log('── Leyendo Excel...');
    const buf = readFileSync(EXCEL_PATH);
    const wb = XLSX.read(buf, { cellDates: true, dateNF: 'yyyy-mm-dd' });
    const ws = wb.Sheets['DATA GRAL 1'];
    const rawRows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    console.log(`   ${rawRows.length} filas encontradas\n`);

    // ── 3. Importar usuarios ─────────────────────────────────────────────────
    console.log('── Importando usuarios...');
    let imported = 0;
    let skipped = 0;
    let generated = 0;
    const errors = [];

    // Emails ya vistos en este batch (dedup)
    const seenEmails = new Set();

    // Emails ya en la DB
    const existingRes = await client.query('SELECT LOWER(email) as email FROM users');
    const existingEmails = new Set(existingRes.rows.map(r => r.email));

    for (let i = 0; i < rawRows.length; i++) {
      const raw = rawRows[i];
      const rowNum = i + 1;

      const firstName = cleanStr(raw['NOMBRES']);
      const lastName  = cleanStr(raw['APELLIDOS']);

      if (!firstName || !lastName) {
        errors.push({ row: rowNum, reason: 'Sin nombre o apellido' });
        skipped++;
        continue;
      }

      const cedula   = cleanStr(raw['CEDULA']);
      const { email, generated: wasGenerated } = normalizeEmail(raw['CORREO ELECTRONICO'], cedula, rowNum);
      const phone    = normalizePhone(raw['CELULAR']);
      const address  = cleanStr(raw['DIRECCION']);
      const whatsapp = normalizeBool(raw['WHATAPP']);
      const birthDate = normalizeDate(raw['F. NAC.']);
      const baptized  = normalizeBool(raw['BAUT.']);
      const baptismDate = normalizeDate(raw['FECHA']);
      const zoneName  = cleanStr(raw['ZONA']);
      const zoneId    = zoneIdMap[zoneName] ?? null;

      // Dedup en batch
      if (seenEmails.has(email)) {
        errors.push({ row: rowNum, reason: `Email duplicado en el archivo: ${email}` });
        skipped++;
        continue;
      }
      seenEmails.add(email);

      // Dedup en DB
      if (existingEmails.has(email)) {
        errors.push({ row: rowNum, reason: `Email ya registrado: ${email}` });
        skipped++;
        continue;
      }

      try {
        const id = randomUUID();
        await client.query(
          `INSERT INTO users (
            id, first_name, last_name, email, phone, address,
            id_number, role, birth_date, baptism_date, baptized,
            whatsapp, zone_id, zone_name, is_active, created_at, updated_at
          ) VALUES (
            $1,$2,$3,$4,$5,$6,
            $7,$8,$9,$10,$11,
            $12,$13,$14,true,NOW(),NOW()
          )`,
          [
            id, firstName, lastName, email, phone, address,
            cedula || '', 'server', birthDate, baptismDate, baptized,
            whatsapp, zoneId, zoneName || null
          ]
        );

        if (wasGenerated) generated++;
        imported++;
        existingEmails.add(email); // evitar dupes si hay más adelante
      } catch (err) {
        errors.push({ row: rowNum, reason: err.message.split('\n')[0] });
        skipped++;
      }
    }

    // ── 4. Resumen ───────────────────────────────────────────────────────────
    console.log('\n══════════════════════════════════════');
    console.log(`✅ Importados:  ${imported}`);
    console.log(`📧 Con email generado (@sionerp.local): ${generated}`);
    console.log(`⏭️  Omitidos:   ${skipped}`);
    if (errors.length > 0) {
      console.log(`\n⚠️  Filas con problemas (${errors.length}):`);
      errors.slice(0, 20).forEach(e => console.log(`   Fila ${e.row}: ${e.reason}`));
      if (errors.length > 20) console.log(`   ... y ${errors.length - 20} más`);
    }
    console.log('══════════════════════════════════════\n');

    // ── 5. Crear usuario admin ───────────────────────────────────────────────
    console.log('── Creando usuario admin...');
    try {
      // Verificar si ya existe en auth.users
      const authExists = await client.query(
        "SELECT id FROM auth.users WHERE email = $1",
        [ADMIN_EMAIL]
      );

      if (authExists.rows.length > 0) {
        console.log(`  → Auth user ya existe: ${ADMIN_EMAIL} (${authExists.rows[0].id})\n`);
      } else {
        // Insertar en auth.users con bcrypt (pgcrypto disponible en Supabase local)
        await client.query(`
          INSERT INTO auth.users (
            instance_id, id, aud, role, email,
            encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at,
            confirmation_token, email_change, email_change_token_new, recovery_token
          ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            $1, 'authenticated', 'authenticated', $2,
            crypt($3, gen_salt('bf', 10)), NOW(),
            '{"provider":"email","providers":["email"]}',
            jsonb_build_object('role', $4::text),
            NOW(), NOW(),
            '', '', '', ''
          )
        `, [ADMIN_UUID, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_ROLE]);
        console.log(`  ✓ Auth user creado: ${ADMIN_EMAIL} (${ADMIN_UUID})`);
      }

      // Upsert en public.users
      await client.query(`
        INSERT INTO public.users (
          id, id_number, first_name, last_name, email,
          phone, address, role, is_active, is_super_admin,
          created_at, updated_at
        ) VALUES (
          $1, 'ADMIN-SEED', 'Pastor', 'Admin', $2,
          '+00-000-000-0000', 'Platform', $3, true, true,
          NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          role           = $3,
          is_super_admin = true,
          is_active      = true,
          updated_at     = NOW()
      `, [ADMIN_UUID, ADMIN_EMAIL, ADMIN_ROLE]);
      console.log(`  ✓ public.users upserted para admin\n`);

    } catch (adminErr) {
      console.warn(`  ⚠️  Admin creation error: ${adminErr.message.split('\n')[0]}`);
      console.warn('     El backend (bootstrap.go) lo creará al iniciar.\n');
    }

    // Verificar distribución por zona
    console.log('── Distribución por zona:');
    const dist = await client.query(`
      SELECT z.name, COUNT(u.id) as total
      FROM zones z
      LEFT JOIN users u ON u.zone_id = z.id
      WHERE z.name IN ('OESTE 1','OESTE 2','OESTE 3','ESTE')
      GROUP BY z.name ORDER BY z.name
    `);
    dist.rows.forEach(r => console.log(`   ${r.name}: ${r.total} miembros`));

  } finally {
    await client.end();
    console.log('\n✅ Conexión cerrada.');
  }
}

main().catch(err => {
  console.error('❌ Error fatal:', err.message);
  process.exit(1);
});
