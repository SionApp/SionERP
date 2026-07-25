/**
 * generate-fake-seed.mjs
 * Genera supabase/seed.sql 100% sintético — mismo shape que la data real
 * (módulos, 4 zonas, miembros, grupos, jerarquía de discipulado) pero sin
 * una sola fila copiada de la congregación real. Para desarrollar en local
 * sin tocar PII real.
 *
 * Uso: node scripts/generate-fake-seed.mjs
 */

import { writeFileSync } from 'fs';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.resolve(__dirname, '../supabase/seed.sql');

const MEMBER_COUNT = 575; // mismo orden de magnitud que la data real

const ZONAS = [
  { id: 'c0000001-0000-0000-0000-000000000001', name: 'OESTE 1', color: '#3b82f6', description: 'Zona Oeste 1' },
  { id: 'c0000002-0000-0000-0000-000000000002', name: 'OESTE 2', color: '#10b981', description: 'Zona Oeste 2' },
  { id: 'c0000003-0000-0000-0000-000000000003', name: 'OESTE 3', color: '#f59e0b', description: 'Zona Oeste 3' },
  { id: 'c0000004-0000-0000-0000-000000000004', name: 'ESTE', color: '#ef4444', description: 'Zona Este' },
];

const FIRST_NAMES = [
  'MARIA', 'JOSE', 'CARLOS', 'ANA', 'LUIS', 'CARMEN', 'JUAN', 'ROSA',
  'PEDRO', 'MERCEDES', 'MIGUEL', 'ELENA', 'FRANCISCO', 'PATRICIA', 'JORGE',
  'GABRIELA', 'RICARDO', 'DANIELA', 'ANDRES', 'VALENTINA', 'RAFAEL',
  'ISABEL', 'ANTONIO', 'LAURA', 'FERNANDO', 'PAOLA', 'DIEGO', 'CAMILA',
  'ALEJANDRO', 'SOFIA', 'MANUEL', 'VICTORIA', 'EDUARDO', 'ADRIANA',
  'ROBERTO', 'YOLANDA', 'SERGIO', 'BEATRIZ', 'HECTOR', 'NATALIA',
];
const LAST_NAMES = [
  'GONZALEZ', 'RODRIGUEZ', 'PEREZ', 'MARTINEZ', 'SANCHEZ', 'RAMIREZ',
  'TORRES', 'FLORES', 'RIVERA', 'GOMEZ', 'DIAZ', 'REYES', 'MORALES',
  'CASTILLO', 'JIMENEZ', 'ORTIZ', 'VARGAS', 'ROMERO', 'SUAREZ', 'MEDINA',
  'HERRERA', 'CASTRO', 'VASQUEZ', 'ROJAS', 'MENDOZA', 'MORENO', 'DELGADO',
  'GUERRERO', 'AGUILAR', 'CAMPOS', 'NAVARRO', 'MARIN', 'SILVA', 'PENA',
  'CORREA', 'PACHECO', 'GUZMAN', 'CARDENAS', 'ACOSTA', 'FUENTES',
];
const STREET_NAMES = [
  'BOLIVAR', 'SUCRE', 'MIRANDA', 'URDANETA', 'PAEZ', 'FALCON', 'ZAMORA',
  'RIBAS', 'PLAZA', 'GIRARDOT', 'MARA', 'BUCHIVACOA', 'INDEPENDENCIA',
  'LIBERTAD', 'PALMASOLA',
];
const PHONE_PREFIXES = ['412', '414', '416', '424', '426'];

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const digits = n => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');
const randDate = (fromYear, toYear) => {
  const y = fromYear + Math.floor(Math.random() * (toYear - fromYear));
  const m = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
  const d = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
const q = v => (v === null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const b = v => (v ? 'true' : 'false');

const usedCedulas = new Set();
function fakeCedula() {
  let c;
  do { c = digits(Math.random() < 0.5 ? 7 : 8); } while (usedCedulas.has(c));
  usedCedulas.add(c);
  return c;
}

function fakeMember(zone) {
  const first = pick(FIRST_NAMES);
  const last = pick(LAST_NAMES);
  const cedula = fakeCedula();
  const baptized = Math.random() < 0.7;
  return {
    id: randomUUID(),
    first_name: first,
    last_name: last,
    email: `${cedula}@sionerp.local`,
    phone: `${pick(PHONE_PREFIXES)}${digits(7)}`,
    address: `CALLE ${pick(STREET_NAMES)} N ${digits(2)} CON ${pick(STREET_NAMES)}`,
    id_number: cedula,
    role: 'server',
    birth_date: Math.random() < 0.9 ? randDate(1950, 2015) : null,
    baptism_date: baptized ? randDate(1980, 2025) : null,
    baptized,
    whatsapp: Math.random() < 0.8,
    zone_id: zone.id,
    zone_name: zone.name,
    is_active: true,
    is_active_member: true,
  };
}

let sql = `-- ============================================================
-- SionERP - Seed FAKE para desarrollo local
-- Generado: ${new Date().toISOString()}
-- 100% sintético — no contiene ninguna fila de la congregación real.
-- Para regenerar: node scripts/generate-fake-seed.mjs
-- Para aplicar:   supabase db reset
-- ============================================================

SET session_replication_role = replica;

ALTER TABLE IF EXISTS public.modules                ALTER COLUMN church_id SET DEFAULT '00000000-0000-0000-0000-00000000515e';
ALTER TABLE IF EXISTS public.zones                  ALTER COLUMN church_id SET DEFAULT '00000000-0000-0000-0000-00000000515e';
ALTER TABLE IF EXISTS public.users                  ALTER COLUMN church_id SET DEFAULT '00000000-0000-0000-0000-00000000515e';
ALTER TABLE IF EXISTS public.discipleship_levels    ALTER COLUMN church_id SET DEFAULT '00000000-0000-0000-0000-00000000515e';
ALTER TABLE IF EXISTS public.discipleship_hierarchy ALTER COLUMN church_id SET DEFAULT '00000000-0000-0000-0000-00000000515e';
ALTER TABLE IF EXISTS public.discipleship_groups    ALTER COLUMN church_id SET DEFAULT '00000000-0000-0000-0000-00000000515e';
ALTER TABLE IF EXISTS public.discipleship_group_members ALTER COLUMN church_id SET DEFAULT '00000000-0000-0000-0000-00000000515e';
ALTER TABLE IF EXISTS public.discipleship_attendance ALTER COLUMN church_id SET DEFAULT '00000000-0000-0000-0000-00000000515e';

-- ========================
-- MODULOS
-- ========================
INSERT INTO public.modules (key, name, description, is_installed, installed_at) VALUES
  ('base',         'Sistema Base',  'Funcionalidades principales: Usuarios, Configuración', true,  NOW()),
  ('discipleship', 'Discipulado',   'Gestión de grupos, jerarquías y reportes',             true,  NOW()),
  ('zones',        'Zonas',         'Gestión de zonas territoriales',                        true,  NOW()),
  ('events',       'Eventos',       'Eventos de la iglesia',                                 false, NULL),
  ('reports',      'Informes',      'Informes y estadísticas avanzadas',                     false, NULL)
ON CONFLICT (church_id, key) DO UPDATE SET
  is_installed = EXCLUDED.is_installed,
  installed_at = CASE WHEN EXCLUDED.is_installed THEN COALESCE(modules.installed_at, NOW()) ELSE NULL END;

-- ========================
-- ZONAS
-- ========================
INSERT INTO public.zones (id, name, description, color, created_at, updated_at) VALUES
${ZONAS.map(z => `  ('${z.id}', '${z.name}', '${z.description}', '${z.color}', NOW(), NOW())`).join(',\n')}
ON CONFLICT (id) DO NOTHING;

-- ========================
-- MIEMBROS (${MEMBER_COUNT} filas fake)
-- Admin se crea via bootstrap.go al levantar el backend
-- ========================
INSERT INTO public.users (
  id, first_name, last_name, email, phone, address,
  id_number, role, birth_date, baptism_date, baptized,
  whatsapp, zone_id, zone_name, is_active, is_active_member, created_at, updated_at
) VALUES
`;

const members = Array.from({ length: MEMBER_COUNT }, (_, i) => fakeMember(ZONAS[i % ZONAS.length]));
sql += members
  .map(m => `  ('${m.id}', ${q(m.first_name)}, ${q(m.last_name)}, ${q(m.email)}, ${q(m.phone)}, ${q(m.address)}, ${q(m.id_number)}, ${q(m.role)}, ${q(m.birth_date)}, ${q(m.baptism_date)}, ${b(m.baptized)}, ${b(m.whatsapp)}, ${q(m.zone_id)}, ${q(m.zone_name)}, ${b(m.is_active)}, ${b(m.is_active_member)}, NOW(), NOW())`)
  .join(',\n');
sql += '\nON CONFLICT (id) DO NOTHING;\n\n';

// ── Grupos: ~1 cada 10 miembros, primer miembro del grupo = líder ──────────
const GROUP_SIZE = 10;
const groups = [];
for (let i = 0; i < members.length; i += GROUP_SIZE) {
  const groupMembers = members.slice(i, i + GROUP_SIZE);
  const leader = groupMembers[0];
  groups.push({
    id: randomUUID(),
    name: `Grupo de ${leader.first_name} ${leader.last_name}`,
    leaderId: leader.id,
    zone: ZONAS.find(z => z.id === leader.zone_id),
    members: groupMembers.slice(1), // el líder no se lista como member del grupo
  });
}

sql += `-- ========================
-- GRUPOS DE DISCIPULADO (${groups.length})
-- ========================
INSERT INTO public.discipleship_groups (id, group_name, leader_id, zone_id, zone_name, member_count, active_members, status, created_at, updated_at) VALUES
`;
sql += groups
  .map(g => `  ('${g.id}', ${q(g.name)}, '${g.leaderId}', '${g.zone.id}', '${g.zone.name}', ${g.members.length}, ${g.members.length}, 'active', NOW(), NOW())`)
  .join(',\n');
sql += '\nON CONFLICT (id) DO NOTHING;\n\n';

sql += `-- ========================
-- MIEMBROS POR GRUPO
-- ========================
INSERT INTO public.discipleship_group_members (group_id, user_id, role_in_group, is_active, joined_at, created_at, updated_at) VALUES
`;
const groupMemberRows = groups.flatMap(g =>
  g.members.map(m => `  ('${g.id}', '${m.id}', 'member', true, NOW(), NOW(), NOW())`)
);
sql += groupMemberRows.join(',\n');
sql += '\nON CONFLICT (group_id, user_id) DO NOTHING;\n\n';

// ── Jerarquía: líder(1) → supervisor auxiliar(2) → coordinador(3) por zona → coordinador general(4) ──
const coordinadorGeneral = { id: randomUUID(), first_name: 'PASTORAL', last_name: 'GENERAL' };
const zoneSupervisors = ZONAS.map(z => ({
  auxiliar: { id: randomUUID(), first_name: 'SUPERVISOR', last_name: `AUX ${z.name}`, zone: z },
  coordinador: { id: randomUUID(), first_name: 'COORDINADOR', last_name: z.name, zone: z },
}));

sql += `-- ========================
-- USUARIOS DE SUPERVISIÓN (placeholders, sin PII real)
-- ========================
INSERT INTO public.users (id, first_name, last_name, email, phone, address, id_number, role, is_active, is_active_member, created_at, updated_at) VALUES
`;
const supervisionUsers = [
  coordinadorGeneral,
  ...zoneSupervisors.flatMap(s => [s.auxiliar, s.coordinador]),
];
sql += supervisionUsers
  .map(u => `  ('${u.id}', ${q(u.first_name)}, ${q(u.last_name)}, ${q(`sup.${u.id}@sionerp.local`)}, '', '', ${q(`SUP-${u.id}`)}, 'staff', true, true, NOW(), NOW())`)
  .join(',\n');
sql += '\nON CONFLICT (id) DO NOTHING;\n\n';

sql += `-- ========================
-- JERARQUIA DE DISCIPULADO
-- ========================
INSERT INTO public.discipleship_hierarchy (user_id, hierarchy_level, zone_id, zone_name, supervisor_id, active_groups_assigned, created_at, updated_at) VALUES
`;
const hierarchyRows = [];
hierarchyRows.push(`  ('${coordinadorGeneral.id}', 4, NULL, NULL, NULL, 0, NOW(), NOW())`);
zoneSupervisors.forEach(s => {
  const z = s.coordinador.zone;
  hierarchyRows.push(`  ('${s.coordinador.id}', 3, '${z.id}', '${z.name}', '${coordinadorGeneral.id}', 0, NOW(), NOW())`);
  hierarchyRows.push(`  ('${s.auxiliar.id}', 2, '${z.id}', '${z.name}', '${s.coordinador.id}', 0, NOW(), NOW())`);
});
groups.forEach(g => {
  const sup = zoneSupervisors.find(s => s.auxiliar.zone.id === g.zone.id).auxiliar;
  hierarchyRows.push(`  ('${g.leaderId}', 1, '${g.zone.id}', '${g.zone.name}', '${sup.id}', 1, NOW(), NOW())`);
});
sql += hierarchyRows.join(',\n');
sql += '\nON CONFLICT (church_id, user_id) DO UPDATE SET hierarchy_level = EXCLUDED.hierarchy_level, supervisor_id = EXCLUDED.supervisor_id, updated_at = NOW();\n';

writeFileSync(OUTPUT_PATH, sql);
console.log(`✅ supabase/seed.sql regenerado: ${members.length} miembros fake, ${groups.length} grupos, ${supervisionUsers.length} usuarios de supervisión.`);
