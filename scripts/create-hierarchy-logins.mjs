/**
 * create-hierarchy-logins.mjs
 * Crea cuenta de Auth (login real) para cada persona con rol en
 * discipleship_hierarchy (líder de célula, supervisor auxiliar, supervisor
 * general, coordinador) que todavía no puede iniciar sesión — necesario
 * para el proceso de formación: cada líder/supervisor tiene que poder
 * entrar a JETRO y ver su propio perfil/dashboard.
 *
 * Usa los datos YA existentes en public.users (mismo id, mismo email,
 * first_name/last_name) — no inventa personas ni emails nuevos, solo les
 * da capacidad de login. Así /mi-perfil muestra sus datos reales.
 *
 * Contraseña: la misma para todas las cuentas nuevas (temporal, para
 * arrancar la formación) — ver DEFAULT_PASSWORD abajo.
 *
 * Idempotente: solo crea auth.users/auth.identities para quien no tenga
 * ya una fila (LEFT JOIN ... WHERE a.id IS NULL).
 *
 * Uso:
 *   node scripts/create-hierarchy-logins.mjs                              (local)
 *   SUPABASE_DB_URL='postgres://...' node scripts/create-hierarchy-logins.mjs  (otra DB)
 */

import pg from 'pg';
import { parse as parseConnectionString } from 'pg-connection-string';

const { Client } = pg;
const DB_URL = process.env.SUPABASE_DB_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const connectionConfig = parseConnectionString(DB_URL);
connectionConfig.ssl = process.env.SUPABASE_DB_URL ? { rejectUnauthorized: false } : false;

// Contraseña temporal compartida para el proceso de formación — comunicable
// una sola vez a todo el grupo de líderes/supervisores. Cámbiala luego desde
// cada perfil si se necesita algo más permanente.
const DEFAULT_PASSWORD = '12341234';

async function main() {
  const client = new Client(connectionConfig);
  await client.connect();

  const { rows: churchRows } = await client.query(`SELECT DISTINCT church_id FROM discipleship_hierarchy LIMIT 1`);
  const churchId = churchRows[0]?.church_id;

  const { rows: pending } = await client.query(
    `SELECT DISTINCT u.id, u.email, u.first_name, u.last_name, h.hierarchy_level
     FROM discipleship_hierarchy h
     JOIN public.users u ON h.user_id = u.id
     LEFT JOIN auth.users a ON a.id = u.id
     WHERE a.id IS NULL
     ORDER BY h.hierarchy_level`
  );

  if (pending.length === 0) {
    console.log('Todos los roles de jerarquía ya tienen cuenta de Auth. Nada que hacer.');
    await client.end();
    return;
  }
  console.log(`${pending.length} personas con rol de jerarquía sin login — creando cuentas...`);

  const byLevel = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const p of pending) {
    await client.query(
      `INSERT INTO auth.users (
         id, instance_id, aud, role, email, encrypted_password,
         email_confirmed_at, confirmation_token, recovery_token,
         email_change_token_new, email_change,
         raw_app_meta_data, raw_user_meta_data, created_at, updated_at
       ) VALUES (
         $1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2,
         crypt($3, gen_salt('bf', 10)), now(), '', '', '', '',
         jsonb_build_object('provider','email','providers',jsonb_build_array('email'),'church_id',$4::text),
         jsonb_build_object('first_name',$5::text,'last_name',$6::text,'email_verified',true),
         now(), now()
       )`,
      [p.id, p.email, DEFAULT_PASSWORD, churchId, p.first_name, p.last_name]
    );
    await client.query(
      `INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
       VALUES ($1::uuid, $1::uuid, jsonb_build_object('sub',$1::text,'email',$2::text,'email_verified',true,'phone_verified',false), 'email', now(), now())`,
      [p.id, p.email]
    );
    byLevel[p.hierarchy_level] = (byLevel[p.hierarchy_level] || 0) + 1;
  }

  console.log(
    `Cuentas creadas: ${byLevel[1] || 0} líderes, ${byLevel[2] || 0} supervisores auxiliares, ${byLevel[3] || 0} supervisores generales, ${byLevel[4] || 0} coordinador(es).`
  );
  console.log(`Contraseña para todas: ${DEFAULT_PASSWORD}`);

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
