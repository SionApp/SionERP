/**
 * generate-seed.mjs
 * Lee el Excel de la iglesia y genera supabase/seed.sql con toda la data real.
 * Después de correr este script, `supabase db reset` carga todo solo.
 *
 * Uso: node scripts/generate-seed.mjs
 *
 * Genera:
 *  - Módulos (base, discipleship, zones activados)
 *  - 4 Zonas reales (UUIDs fijos)
 *  - 553 miembros desde Excel (DATA GRAL 1)
 *  - Líderes: si no está en miembros → crea usuario placeholder
 *  - Grupos: "Grupo de [nombre líder]", asignado a la zona predominante
 *  - discipleship_hierarchy nivel 1 para cada líder
 *  - discipleship_group_members para cada miembro según columna LIDER
 *  - Jerarquía completa desde DATOS SUPERVISORES (coordinadores 4, generales 3, auxiliares 2, líderes 1)
 *  - Cableado supervisor_id: generales → coordinador de zona, auxiliares → general (si es único en la zona)
 */

import * as XLSX from 'xlsx';
import { readFileSync, writeFileSync } from 'fs';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const EXCEL_PATH = path.resolve(__dirname, '../data/DATA IGLESIA SION ACT. 14-12-25 (1).xlsx');
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

const cleanStr = val => (val === null || val === undefined) ? '' : String(val).trim();

/** Escapa un valor para SQL (NULL si es null/undefined, 'string' con comillas escapadas) */
const q = val => (val === null || val === undefined) ? 'NULL' : `'${String(val).replace(/'/g, "''")}'`;

/** Normaliza un nombre: uppercase + sin tildes + espacios simples */
function normalizeName(name) {
  return cleanStr(name)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');
}

function normalizeEmail(raw, cedula, rowIdx) {
  const e = cleanStr(raw).toLowerCase().replace(/\s+/g, '');
  if (e && EMAIL_RE.test(e)) return { email: e, generated: false };
  const ced = cleanStr(cedula).replace(/\D/g, '');
  const placeholder = ced ? `${ced}@sionerp.local` : `import.${rowIdx}@sionerp.local`;
  return { email: placeholder, generated: true };
}

const normalizePhone = val => val ? String(val).replace(/\D/g, '') : '';

function normalizeBool(val) {
  const s = cleanStr(val).toLowerCase();
  return s === 'si' || s === 'sí' || s === 'yes' || s === '1' || s === 'true';
}

function normalizeDate(val) {
  if (!val) return null;
  if (val instanceof Date) {
    const y = val.getFullYear();
    if (y < 1900 || y > 2100) return null;
    return `${y}-${String(val.getMonth() + 1).padStart(2, '0')}-${String(val.getDate()).padStart(2, '0')}`;
  }
  const s = cleanStr(val);
  return s && DATE_RE.test(s) ? s : null;
}

/** Devuelve la zona con más ocurrencias en un objeto {zoneName: count} */
function topZone(zoneCounts) {
  let top = null, max = 0;
  for (const [name, count] of Object.entries(zoneCounts)) {
    if (count > max) { max = count; top = name; }
  }
  return top;
}

/** Genera un slug para email desde el nombre raw del líder */
function leaderEmailSlug(rawName) {
  return rawName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '.');
}

// ─── Leer Excel ───────────────────────────────────────────────────────────────
console.log('── Leyendo Excel...');
const buf     = readFileSync(EXCEL_PATH);
const wb      = XLSX.read(buf, { cellDates: true, dateNF: 'yyyy-mm-dd' });
const ws      = wb.Sheets['DATA GRAL 1'];
const rawRows = XLSX.utils.sheet_to_json(ws, { defval: '' });
console.log(`   ${rawRows.length} filas encontradas`);

// Detectar nombre real de la columna LIDER (con o sin tilde)
const sampleKeys = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];
const LIDER_COL  = sampleKeys.find(k => normalizeName(k) === 'LIDER') || 'LIDER';
console.log(`   Columna líder detectada: "${LIDER_COL}"`);

// ─── Acumulador de SQL ────────────────────────────────────────────────────────
const lines = [];
const push  = (...ls) => lines.push(...ls);

// ── Header ────────────────────────────────────────────────────────────────────
push(
  `-- ============================================================`,
  `-- SionERP - Seed generado automáticamente`,
  `-- Generado: ${new Date().toISOString()}`,
  `-- Fuente:   ${EXCEL_PATH}`,
  `--`,
  `-- Para regenerar: node scripts/generate-seed.mjs`,
  `-- Para aplicar:   supabase db reset`,
  `-- ============================================================`,
  ``,
  `SET session_replication_role = replica;`,
  ``,
);

// ── Módulos ───────────────────────────────────────────────────────────────────
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

// ── Zonas ─────────────────────────────────────────────────────────────────────
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

// ── PASO 1: Procesar miembros del Excel ───────────────────────────────────────
const seenEmails  = new Set();
const seenCedulas = new Set();
let imported = 0, skipped = 0, generated = 0;
const importErrors = [];

/** memberRows: [id, firstName, lastName, email, phone, address, cedula, birthDate, baptismDate, baptized, whatsapp, zoneId, zoneName] */
const memberRows = [];

/** Lookup por nombre normalizado → { id, firstName, lastName } */
const memberByNormName = new Map();

for (let i = 0; i < rawRows.length; i++) {
  const raw    = rawRows[i];
  const rowNum = i + 1;

  const firstName = cleanStr(raw['NOMBRES']);
  const lastName  = cleanStr(raw['APELLIDOS']);

  if (!firstName || !lastName) {
    importErrors.push({ row: rowNum, reason: 'Sin nombre o apellido' });
    skipped++;
    continue;
  }

  const cedula      = cleanStr(raw['CEDULA']);
  const { email, generated: wasGenerated } = normalizeEmail(raw['CORREO ELECTRONICO'], cedula, rowNum);
  const phone       = normalizePhone(raw['CELULAR']);
  const address     = cleanStr(raw['DIRECCION']);
  const whatsapp    = normalizeBool(raw['WHATAPP']);
  const birthDate   = normalizeDate(raw['F. NAC.']);
  const baptized    = normalizeBool(raw['BAUT.']);
  const baptismDate = normalizeDate(raw['FECHA']);
  const zoneName    = cleanStr(raw['ZONA']);
  const zoneId      = zoneIdMap[zoneName] ?? null;

  // Email duplicado → no descartamos a la persona: placeholder único
  let finalEmail = email;
  if (seenEmails.has(finalEmail)) {
    const ced = cleanStr(cedula).replace(/\D/g, '');
    finalEmail = ced && !seenEmails.has(`${ced}@sionerp.local`)
      ? `${ced}@sionerp.local`
      : `import.${rowNum}@sionerp.local`;
    importErrors.push({ row: rowNum, reason: `Email duplicado: ${email} → ${finalEmail}` });
    generated++;
  }
  seenEmails.add(finalEmail);

  if (cedula && seenCedulas.has(cedula)) {
    importErrors.push({ row: rowNum, reason: `Cédula duplicada: ${cedula}` });
    skipped++;
    continue;
  }
  if (cedula) seenCedulas.add(cedula);

  const id = randomUUID();
  const row = [id, firstName, lastName, finalEmail, phone || '', address || '',
               cedula || '', birthDate, baptismDate, baptized, whatsapp, zoneId, zoneName || null];
  memberRows.push(row);

  // Registro en lookup por nombre normalizado
  const normFull = normalizeName(`${firstName} ${lastName}`);
  if (!memberByNormName.has(normFull)) {
    memberByNormName.set(normFull, { id, firstName, lastName });
  }

  if (wasGenerated) generated++;
  imported++;
}

// ── SQL: miembros ─────────────────────────────────────────────────────────────
push(
  `-- ========================`,
  `-- MIEMBROS (${rawRows.length} filas en Excel → ${imported} importados)`,
  `-- Admin se crea via bootstrap.go al levantar el backend`,
  `-- ========================`,
);

const CHUNK = 50;
for (let start = 0; start < memberRows.length; start += CHUNK) {
  const chunk = memberRows.slice(start, start + CHUNK);
  const vals  = chunk.map(([id, fn, ln, em, ph, addr, ced, bd, bapd, bap, wa, zid, zn]) =>
    `  (${q(id)}, ${q(fn)}, ${q(ln)}, ${q(em)}, ${q(ph)}, ${q(addr)}, ` +
    `${q(ced)}, 'server', ${bd ? q(bd) : 'NULL'}, ${bapd ? q(bapd) : 'NULL'}, ` +
    `${bap}, ${wa}, ${zid ? q(zid) : 'NULL'}, ${zn ? q(zn) : 'NULL'}, true, true, NOW(), NOW())`
  );
  push(
    `INSERT INTO public.users (`,
    `  id, first_name, last_name, email, phone, address,`,
    `  id_number, role, birth_date, baptism_date, baptized,`,
    `  whatsapp, zone_id, zone_name, is_active, is_active_member, created_at, updated_at`,
    `) VALUES`,
    vals.join(',\n'),
    `ON CONFLICT DO NOTHING;`,
    ``,
  );
}

// ── PASO 2: Procesar líderes y grupos ────────────────────────────────────────
//
// leaderMap: normName → {
//   id, firstName, lastName, rawName, isNew,
//   zoneCounts: { zoneName: count }
// }
const leaderMap = new Map();

for (const raw of rawRows) {
  const liderRaw = cleanStr(raw[LIDER_COL]);
  if (!liderRaw) continue;

  const normName = normalizeName(liderRaw);
  if (!leaderMap.has(normName)) {
    const existing = memberByNormName.get(normName);
    if (existing) {
      // El líder ya fue importado como miembro
      leaderMap.set(normName, {
        id: existing.id,
        firstName: existing.firstName,
        lastName: existing.lastName,
        rawName: liderRaw,
        isNew: false,
        zoneCounts: {},
      });
    } else {
      // Líder nuevo: crear usuario placeholder
      const parts     = normName.split(' ');
      const firstName = parts[0];
      const lastName  = parts.slice(1).join(' ') || '(Apellido pendiente)';
      leaderMap.set(normName, {
        id: randomUUID(),
        firstName,
        lastName,
        rawName: liderRaw,
        isNew: true,
        zoneCounts: {},
      });
    }
  }

  // Acumular zona del miembro para determinar la zona predominante del grupo
  const leader   = leaderMap.get(normName);
  const zoneName = cleanStr(raw['ZONA']);
  if (zoneName) {
    leader.zoneCounts[zoneName] = (leader.zoneCounts[zoneName] || 0) + 1;
  }
}

// Asociar cada miembro (por nombre) al normName de su líder
const memberNormToLeaderNorm = new Map();
for (const raw of rawRows) {
  const fn       = cleanStr(raw['NOMBRES']);
  const ln       = cleanStr(raw['APELLIDOS']);
  const liderRaw = cleanStr(raw[LIDER_COL]);
  if (!fn || !ln || !liderRaw) continue;
  memberNormToLeaderNorm.set(normalizeName(`${fn} ${ln}`), normalizeName(liderRaw));
}

// ── SQL: usuarios líderes nuevos (placeholder) ────────────────────────────────
const newLeaders = [...leaderMap.values()].filter(l => l.isNew);
const existingLeaders = [...leaderMap.values()].filter(l => !l.isNew);

push(
  `-- ========================`,
  `-- LÍDERES (${leaderMap.size} únicos: ${existingLeaders.length} ya importados, ${newLeaders.length} nuevos con placeholder)`,
  `-- ========================`,
);

if (newLeaders.length > 0) {
  for (let start = 0; start < newLeaders.length; start += CHUNK) {
    const chunk = newLeaders.slice(start, start + CHUNK);
    const vals  = chunk.map(l => {
      const email   = `lider.${leaderEmailSlug(l.rawName)}@sionerp.local`;
      const idNumber = `LIDER-${l.id}`; // UUID único por líder → no conflicto en users_cedula_key
      return (
        `  (${q(l.id)}, ${q(l.firstName)}, ${q(l.lastName)}, ${q(email)}, ` +
        `'', '', ${q(idNumber)}, 'server', true, true, NOW(), NOW())`
      );
    });
    push(
      `INSERT INTO public.users (id, first_name, last_name, email, phone, address, id_number, role, is_active, is_active_member, created_at, updated_at) VALUES`,
      vals.join(',\n'),
      `ON CONFLICT DO NOTHING;`,
      ``,
    );
  }
}

// ── SQL: grupos ───────────────────────────────────────────────────────────────
push(
  `-- ========================`,
  `-- GRUPOS DE DISCIPULADO (${leaderMap.size} grupos)`,
  `-- ========================`,
);

// groupId fijo por líder normName para referenciar desde group_members
const leaderNormToGroupId = new Map();
const groupInsertRows = [];

for (const [normName, leader] of leaderMap.entries()) {
  const groupId    = randomUUID();
  leaderNormToGroupId.set(normName, groupId);
  const groupName  = `Grupo de ${leader.rawName}`;
  const zoneName   = topZone(leader.zoneCounts);
  const zoneId     = zoneName ? (zoneIdMap[zoneName] ?? null) : null;
  const memberCount = Object.values(leader.zoneCounts).reduce((a, b) => a + b, 0);
  groupInsertRows.push({ id: groupId, groupName, leaderId: leader.id, zoneId, zoneName, memberCount });
}

for (let start = 0; start < groupInsertRows.length; start += CHUNK) {
  const chunk = groupInsertRows.slice(start, start + CHUNK);
  const vals  = chunk.map(g =>
    `  (${q(g.id)}, ${q(g.groupName)}, ${q(g.leaderId)}, ` +
    `${g.zoneId ? q(g.zoneId) : 'NULL'}, ${g.zoneName ? q(g.zoneName) : 'NULL'}, ` +
    `${g.memberCount}, ${g.memberCount}, 'active', NOW(), NOW())`
  );
  push(
    `INSERT INTO public.discipleship_groups (id, group_name, leader_id, zone_id, zone_name, member_count, active_members, status, created_at, updated_at) VALUES`,
    vals.join(',\n'),
    `ON CONFLICT DO NOTHING;`,
    ``,
  );
}

// ── SQL: discipleship_hierarchy (líderes, nivel 1) ────────────────────────────
push(
  `-- ========================`,
  `-- JERARQUÍA DE DISCIPULADO (líderes nivel 1)`,
  `-- ========================`,
);

const hierarchyRows = [...leaderMap.entries()].map(([, leader]) => {
  const zoneName = topZone(leader.zoneCounts);
  return { userId: leader.id, zoneId: zoneName ? (zoneIdMap[zoneName] ?? null) : null, zoneName };
});

for (let start = 0; start < hierarchyRows.length; start += CHUNK) {
  const chunk = hierarchyRows.slice(start, start + CHUNK);
  const vals  = chunk.map(h =>
    `  (${q(h.userId)}, 1, ${h.zoneId ? q(h.zoneId) : 'NULL'}, ` +
    `${h.zoneName ? q(h.zoneName) : 'NULL'}, 1, NOW(), NOW())`
  );
  push(
    `INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, active_groups_assigned, created_at, updated_at) VALUES`,
    vals.join(',\n'),
    `ON CONFLICT (user_id) DO NOTHING;`,
    ``,
  );
}

// ── SQL: discipleship_group_members ───────────────────────────────────────────
push(
  `-- ========================`,
  `-- MIEMBROS POR GRUPO`,
  `-- ========================`,
);

const gmRows = [];
for (const [id, fn, ln] of memberRows) {
  const normFull   = normalizeName(`${fn} ${ln}`);
  const leaderNorm = memberNormToLeaderNorm.get(normFull);
  if (!leaderNorm) continue;
  const groupId = leaderNormToGroupId.get(leaderNorm);
  if (!groupId) continue;
  gmRows.push({ groupId, memberId: id });
}

for (let start = 0; start < gmRows.length; start += CHUNK) {
  const chunk = gmRows.slice(start, start + CHUNK);
  const vals  = chunk.map(gm =>
    `  (${q(gm.groupId)}, ${q(gm.memberId)}, 'member', true, NOW(), NOW(), NOW())`
  );
  push(
    `INSERT INTO public.discipleship_group_members (group_id, user_id, role_in_group, is_active, joined_at, created_at, updated_at) VALUES`,
    vals.join(',\n'),
    `ON CONFLICT (group_id, user_id) DO NOTHING;`,
    ``,
  );
}

// ── PASO 3: Jerarquía de supervisores (sheet DATOS SUPERVISORES) ──────────────
//
// El sheet es tipo "pizarra": secciones por zona → rol → filas de personas.
// Headers con typos reales: "SUPERSORES", "COORINADORES".
// Coordinadores van hardcodeados (en el Excel son texto inline sin cédula).

const ROLE_LEVEL = { lider: 1, supervisor_auxiliar: 2, supervisor_general: 3, coordinador: 4 };

const COORDINADORES = [
  { cedula: '9507199',  firstName: 'María del Valle', lastName: 'Ollarves',         email: 'coordinadora.ollarves@sionerp.local', phone: '04121603266', address: '', zone: 'OESTE 1' },
  { cedula: '7356713',  firstName: 'Alilia Josefina', lastName: 'Sánchez de Gómez', email: 'alilia@gmail.com',                    phone: '04126815571', address: 'Calle Ralcocer, Casco Histórico, Coro, Parroquia San Gabriel, Municipio Miranda, Estado Falcón, Venezuela', zone: 'OESTE 2' },
  { cedula: '16709124', firstName: 'Ruthdy Esther',   lastName: 'Lameda Gómez',     email: 'coordinadora.lameda@sionerp.local',   phone: '04120601377', address: '', zone: 'OESTE 3' },
  { cedula: '19617387', firstName: 'Elvis Rafael',    lastName: 'Laguna Medina',    email: 'coordinador.laguna@sionerp.local',    phone: '04246327629', address: '', zone: 'ESTE' },
];

/** Fecha de la pizarra: Date | 'DD/MM/YYYY' | 'D/M/YY' → 'YYYY-MM-DD' o null */
function supDate(val) {
  if (!val) return null;
  if (val instanceof Date) return normalizeDate(val);
  const s = cleanStr(val).split(' ')[0];
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return s;
  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = Number(y) > 26 ? `19${y}` : `20${y}`;
    const day = Number(d), mon = Number(mo);
    if (mon > 12 || day > 31) return null;
    if (Number(y) < 1900 || Number(y) > 2026) return null;
    return `${y}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  return null;
}

const wsSup = wb.Sheets['DATOS SUPERVISORES'];
const supervisors = new Map(); // cedula → persona (nivel más alto gana)

if (wsSup) {
  const supRows = XLSX.utils.sheet_to_json(wsSup, { header: 1, defval: '' });
  let zone = null, role = null;

  for (const row of supRows) {
    const first = cleanStr(row[0]);
    const u = normalizeName(first);

    if (u.startsWith('ZONA ')) { zone = u.replace('ZONA ', '').trim(); continue; }
    if (u.includes('COORDINADOR') || u.includes('COORINADOR')) { role = 'coordinador'; continue; }
    if ((u.includes('SUPERVISOR') || u.includes('SUPERSOR')) && u.includes('GENERAL')) { role = 'supervisor_general'; continue; }
    if (u.includes('AUXILIAR')) { role = 'supervisor_auxiliar'; continue; }
    if (u === 'LIDERES') { role = 'lider'; continue; }
    if (u === 'CEDULA' || !first) continue;
    if (role === 'coordinador') continue; // inline, van hardcodeados

    const cedula = first.replace(/\D/g, '');
    const nombres = cleanStr(row[1]);
    if (!cedula || !nombres || !zone || !role) continue;

    const lvl = ROLE_LEVEL[role];
    const prev = supervisors.get(cedula);
    if (prev && ROLE_LEVEL[prev.role] >= lvl) continue; // nivel más alto gana

    supervisors.set(cedula, {
      cedula, role, zone,
      nombres,
      apellidos: cleanStr(row[2]),
      direccion: cleanStr(row[3]),
      correo: cleanStr(row[4]).toLowerCase(),
      fechaNac: supDate(row[6]),
      telefono: normalizePhone(row[7]),
      bautizada: normalizeBool(row[8]),
      fechaBaut: supDate(row[9]),
    });
  }
}

push(
  `-- ========================`,
  `-- JERARQUÍA DE SUPERVISORES (${COORDINADORES.length} coordinadores + ${supervisors.size} del sheet DATOS SUPERVISORES)`,
  `-- ========================`,
);

/** Emite INSERT-si-no-existe + UPDATE + upsert de jerarquía para una persona */
function emitHierarchyPerson({ cedula, firstName, lastName, email, phone, address, birthDate, baptized, baptismDate, level, zone }) {
  const zoneId = zoneIdMap[zone];
  if (!zoneId) return;
  const safeEmail = (email && EMAIL_RE.test(email)) ? email : `${cedula}@sionerp.local`;
  const emailSql = `CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = ${q(safeEmail)}) THEN ${q(`${cedula}@sionerp.local`)} ELSE ${q(safeEmail)} END`;
  const birthSql = birthDate ? q(birthDate) : 'NULL';
  const bautSql  = baptismDate ? q(baptismDate) : 'NULL';

  push(
    `-- ${firstName} ${lastName} | nivel ${level} | ${zone}`,
    `INSERT INTO public.users (id_number, first_name, last_name, phone, address, email, role, baptized, baptism_date, birth_date, discipleship_level, zone_id, zone_name, is_active, is_active_member, created_at, updated_at)`,
    `SELECT ${q(cedula)}, ${q(firstName)}, ${q(lastName)}, ${q(phone || '')}, ${q(address || '')}, ${emailSql}, 'server', ${baptized}, ${bautSql}, ${birthSql}, ${level}, ${q(zoneId)}, ${q(zone)}, true, true, NOW(), NOW()`,
    `WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE regexp_replace(id_number, '\\D', '', 'g') = ${q(cedula)});`,
    `UPDATE public.users SET`,
    `  discipleship_level = ${level}, zone_name = ${q(zone)}, zone_id = ${q(zoneId)},`,
    `  phone   = CASE WHEN phone = '' THEN ${q(phone || '')} ELSE phone END,`,
    `  address = CASE WHEN address = '' THEN ${q(address || '')} ELSE address END,`,
    `  birth_date   = COALESCE(birth_date, ${birthSql}),`,
    `  baptism_date = COALESCE(baptism_date, ${bautSql}),`,
    `  baptized = baptized OR ${baptized}, updated_at = NOW()`,
    `WHERE regexp_replace(id_number, '\\D', '', 'g') = ${q(cedula)};`,
    `INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, created_at, updated_at)`,
    `SELECT id, ${level}, ${q(zoneId)}, ${q(zone)}, NOW(), NOW() FROM public.users WHERE regexp_replace(id_number, '\\D', '', 'g') = ${q(cedula)}`,
    `ON CONFLICT (user_id) DO UPDATE SET hierarchy_level = ${level}, zone_id = ${q(zoneId)}, zone_name = ${q(zone)}, updated_at = NOW();`,
    ``,
  );
}

for (const c of COORDINADORES) {
  emitHierarchyPerson({
    cedula: c.cedula, firstName: c.firstName, lastName: c.lastName,
    email: c.email, phone: c.phone, address: c.address,
    birthDate: null, baptized: false, baptismDate: null,
    level: 4, zone: c.zone,
  });
}

for (const p of supervisors.values()) {
  emitHierarchyPerson({
    cedula: p.cedula, firstName: p.nombres, lastName: p.apellidos,
    email: p.correo, phone: p.telefono, address: p.direccion,
    birthDate: p.fechaNac, baptized: p.bautizada, baptismDate: p.fechaBaut,
    level: ROLE_LEVEL[p.role], zone: p.zone,
  });
}

// ── Cableado supervisor_id ────────────────────────────────────────────────────
push(
  `-- ========================`,
  `-- CABLEADO DE SUPERVISIÓN`,
  `-- generales → coordinador de su zona; auxiliares → general (solo si es único en la zona)`,
  `-- ========================`,
);

for (const c of COORDINADORES) {
  const zoneId = zoneIdMap[c.zone];
  push(
    `UPDATE public.discipleship_hierarchy h SET supervisor_id = (SELECT id FROM public.users WHERE regexp_replace(id_number,'\\D','','g') = ${q(c.cedula)})`,
    `WHERE h.hierarchy_level = 3 AND h.zone_id = ${q(zoneId)} AND h.supervisor_id IS NULL;`,
  );
}

// Auxiliares → general, solo en zonas con exactamente 1 supervisor general
const generalsByZone = {};
for (const p of supervisors.values()) {
  if (p.role === 'supervisor_general') (generalsByZone[p.zone] ??= []).push(p);
}
for (const [zoneName, gens] of Object.entries(generalsByZone)) {
  if (gens.length !== 1) continue;
  const zoneId = zoneIdMap[zoneName];
  push(
    `UPDATE public.discipleship_hierarchy h SET supervisor_id = (SELECT id FROM public.users WHERE regexp_replace(id_number,'\\D','','g') = ${q(gens[0].cedula)})`,
    `WHERE h.hierarchy_level = 2 AND h.zone_id = ${q(zoneId)} AND h.supervisor_id IS NULL;`,
  );
}
push(``);

// ── Footer ────────────────────────────────────────────────────────────────────
push(`SET session_replication_role = DEFAULT;`);

// ── Escribir archivo ──────────────────────────────────────────────────────────
writeFileSync(OUTPUT_PATH, lines.join('\n'), 'utf-8');

// ── Resumen ───────────────────────────────────────────────────────────────────
const withLider = gmRows.length;
const sinLider  = imported - withLider;

console.log(`\n══════════════════════════════════════`);
console.log(`✅ Miembros importados: ${imported} / ${rawRows.length}`);
console.log(`   📧 Con email generado: ${generated}`);
console.log(`   ⏭️  Omitidos: ${skipped}`);
console.log(`\n👥 Líderes únicos:  ${leaderMap.size}`);
console.log(`   ✓ Ya en miembros: ${existingLeaders.length}`);
console.log(`   ✨ Nuevos (placeholder): ${newLeaders.length}`);
console.log(`\n📦 Grupos creados: ${groupInsertRows.length}`);
console.log(`\n🏛️  Jerarquía: ${COORDINADORES.length} coordinadores + ${supervisors.size} supervisores/líderes del sheet`);
console.log(`\n🔗 Miembros asignados a grupo: ${withLider}`);
if (sinLider > 0) console.log(`   ⚠️  Sin grupo (sin LIDER en Excel): ${sinLider}`);
if (importErrors.length > 0) {
  console.log(`\n⚠️  Problemas de importación (${importErrors.length}):`);
  importErrors.slice(0, 15).forEach(e => console.log(`   Fila ${e.row}: ${e.reason}`));
  if (importErrors.length > 15) console.log(`   ... y ${importErrors.length - 15} más`);
}
console.log(`\n📄 seed.sql generado → ${OUTPUT_PATH}`);
console.log(`💡 Ahora corrés: supabase db reset`);
console.log(`══════════════════════════════════════\n`);
