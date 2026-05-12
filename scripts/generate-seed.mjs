/**
 * generate-seed.mjs
 * Lee el Excel de la iglesia y genera supabase/seed.sql con toda la data real.
 * Después de correr este script, `supabase db reset` carga todo solo.
 *
 * Uso: node scripts/generate-seed.mjs
 */

import * as XLSX from 'xlsx';
import { readFileSync, writeFileSync } from 'fs';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXCEL_PATH = '/Users/danzt/Downloads/DATA IGLESIA SION ACT. 14-12-25.xlsx';
const OUTPUT_PATH = path.resolve(__dirname, '../supabase/seed.sql');

// ─── Zonas (UUIDs fijos para consistencia entre resets) ───────────────────────
const ZONAS = [
  { id: 'c0000001-0000-0000-0000-000000000001', name: 'OESTE 1', color: '#3b82f6', description: 'Zona Oeste 1' },
  { id: 'c0000002-0000-0000-0000-000000000002', name: 'OESTE 2', color: '#10b981', description: 'Zona Oeste 2' },
  { id: 'c0000003-0000-0000-0000-000000000003', name: 'OESTE 3', color: '#f59e0b', description: 'Zona Oeste 3' },
  { id: 'c0000004-0000-0000-0000-000000000004', name: 'ESTE',    color: '#ef4444', description: 'Zona Este'    },
];

const zoneIdMap = Object.fromEntries(ZONAS.map(z => [z.name, z.id]));

// ─── Helpers ──────────────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE  = /^\d{4}-\d{2}-\d{2}$|^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/;

function cleanStr(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function q(val) {
  if (val === null || val === undefined) return 'NULL';
  return `'${String(val).replace(/'/g, "''")}'`;
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
  return String(val).replace(/\D/g, '') || '';
}

function normalizeBool(val) {
  const s = cleanStr(val).toLowerCase();
  return s === 'si' || s === 'sí' || s === 'yes' || s === '1' || s === 'true';
}

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
  if (!s || !DATE_RE.test(s)) return null;
  return s;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
console.log('── Leyendo Excel...');
const buf = readFileSync(EXCEL_PATH);
const wb  = XLSX.read(buf, { cellDates: true, dateNF: 'yyyy-mm-dd' });
const ws  = wb.Sheets['DATA GRAL 1'];
const rawRows = XLSX.utils.sheet_to_json(ws, { defval: '' });
console.log(`   ${rawRows.length} filas encontradas`);

const lines = [];
const push  = (...ls) => lines.push(...ls);

push(
  `-- ============================================================`,
  `-- SionERP - Seed generado automáticamente`,
  `-- Generado: ${new Date().toISOString()}`,
  `-- Fuente: ${EXCEL_PATH}`,
  `--`,
  `-- Para regenerar: node scripts/generate-seed.mjs`,
  `-- Para aplicar:   supabase db reset`,
  `-- ============================================================`,
  ``,
  `SET session_replication_role = replica;`,
  ``,
);

// ── Módulos ──────────────────────────────────────────────────────────────────
push(
  `-- ========================`,
  `-- MÓDULOS`,
  `-- ========================`,
  `INSERT INTO public.modules (key, name, description, is_installed, installed_at) VALUES`,
  `  ('base',         'Sistema Base',  'Funcionalidades principales: Usuarios, Configuración', true,  NOW()),`,
  `  ('discipleship', 'Discipulado',   'Gestión de grupos, jerarquías y reportes',             true,  NOW()),`,
  `  ('zones',        'Zonas',         'Gestión de zonas territoriales',                        true,  NOW()),`,
  `  ('events',       'Eventos',       'Eventos de la iglesia',                                 false, NULL),`,
  `  ('reports',      'Informes',      'Informes y estadísticas avanzadas',                     false, NULL)`,
  `ON CONFLICT (key) DO UPDATE SET`,
  `  is_installed = EXCLUDED.is_installed,`,
  `  installed_at = CASE WHEN EXCLUDED.is_installed THEN COALESCE(modules.installed_at, NOW()) ELSE NULL END;`,
  ``,
);

// ── Zonas ────────────────────────────────────────────────────────────────────
push(
  `-- ========================`,
  `-- ZONAS`,
  `-- ========================`,
  `INSERT INTO public.zones (id, name, description, color, created_at, updated_at) VALUES`,
  ...ZONAS.map((z, i) => {
    const comma = i < ZONAS.length - 1 ? ',' : '';
    return `  (${q(z.id)}, ${q(z.name)}, ${q(z.description)}, ${q(z.color)}, NOW(), NOW())${comma}`;
  }),
  `ON CONFLICT (id) DO NOTHING;`,
  ``,
);

// ── Miembros desde Excel ──────────────────────────────────────────────────────
// Nota: el usuario admin se crea via bootstrap.go al levantar el backend,
// leyendo SION_ADMIN_EMAIL / SION_ADMIN_PASSWORD de las env vars.
push(
  `-- ========================`,
  `-- MIEMBROS (${rawRows.length} filas en Excel)`,
  `-- ========================`,
);

const seenEmails = new Set();
const seenCedulas = new Set();
let imported = 0, skipped = 0, generated = 0;
const errors = [];

const memberRows = [];

for (let i = 0; i < rawRows.length; i++) {
  const raw    = rawRows[i];
  const rowNum = i + 1;

  const firstName = cleanStr(raw['NOMBRES']);
  const lastName  = cleanStr(raw['APELLIDOS']);

  if (!firstName || !lastName) {
    errors.push({ row: rowNum, reason: 'Sin nombre o apellido' });
    skipped++;
    continue;
  }

  const cedula        = cleanStr(raw['CEDULA']);
  const { email, generated: wasGenerated } = normalizeEmail(raw['CORREO ELECTRONICO'], cedula, rowNum);
  const phone         = normalizePhone(raw['CELULAR']);
  const address       = cleanStr(raw['DIRECCION']);
  const whatsapp      = normalizeBool(raw['WHATAPP']);
  const birthDate     = normalizeDate(raw['F. NAC.']);
  const baptized      = normalizeBool(raw['BAUT.']);
  const baptismDate   = normalizeDate(raw['FECHA']);
  const zoneName      = cleanStr(raw['ZONA']);
  const zoneId        = zoneIdMap[zoneName] ?? null;

  if (seenEmails.has(email)) {
    errors.push({ row: rowNum, reason: `Email duplicado: ${email}` });
    skipped++;
    continue;
  }
  seenEmails.add(email);

  if (cedula) {
    if (seenCedulas.has(cedula)) {
      errors.push({ row: rowNum, reason: `Cédula duplicada: ${cedula}` });
      skipped++;
      continue;
    }
    seenCedulas.add(cedula);
  }

  const id = randomUUID();
  memberRows.push([
    id, firstName, lastName, email, phone || '', address || '',
    cedula || '', birthDate, baptismDate, baptized, whatsapp,
    zoneId, zoneName || null,
  ]);

  if (wasGenerated) generated++;
  imported++;
}

// Emite los INSERTs en bloques de 50
const CHUNK = 50;
for (let start = 0; start < memberRows.length; start += CHUNK) {
  const chunk = memberRows.slice(start, start + CHUNK);
  const vals  = chunk.map(([id, fn, ln, em, ph, addr, ced, bd, bapd, bap, wa, zid, zn]) => {
    return (
      `  (${q(id)}, ${q(fn)}, ${q(ln)}, ${q(em)}, ${q(ph)}, ${q(addr)}, ` +
      `${q(ced)}, 'server', ${bd ? q(bd) : 'NULL'}, ${bapd ? q(bapd) : 'NULL'}, ` +
      `${bap}, ${wa}, ${zid ? q(zid) : 'NULL'}, ${zn ? q(zn) : 'NULL'}, ` +
      `true, NOW(), NOW())`
    );
  });

  push(
    `INSERT INTO public.users (`,
    `  id, first_name, last_name, email, phone, address,`,
    `  id_number, role, birth_date, baptism_date, baptized,`,
    `  whatsapp, zone_id, zone_name, is_active, created_at, updated_at`,
    `) VALUES`,
    vals.join(',\n'),
    `ON CONFLICT DO NOTHING;`,
    ``,
  );
}

push(`SET session_replication_role = DEFAULT;`);

// ── Escribir archivo ──────────────────────────────────────────────────────────
writeFileSync(OUTPUT_PATH, lines.join('\n'), 'utf-8');

console.log(`\n══════════════════════════════════════`);
console.log(`✅ Importados en SQL: ${imported}`);
console.log(`📧 Con email generado: ${generated}`);
console.log(`⏭️  Omitidos:          ${skipped}`);
if (errors.length > 0) {
  console.log(`\n⚠️  Filas con problemas (${errors.length}):`);
  errors.slice(0, 15).forEach(e => console.log(`   Fila ${e.row}: ${e.reason}`));
  if (errors.length > 15) console.log(`   ... y ${errors.length - 15} más`);
}
console.log(`\n📄 seed.sql generado → ${OUTPUT_PATH}`);
console.log(`\n💡 Ahora corrés: supabase db reset`);
console.log(`══════════════════════════════════════\n`);
