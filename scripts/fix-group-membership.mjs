/**
 * fix-group-membership.mjs
 * Reconstruye la membresía de TODOS los grupos de discipulado, iglesia
 * completa, zona por zona:
 *  - Cada célula toma miembros SOLO de su propia zona.
 *  - Nadie se repite en más de un grupo, en TODA la iglesia.
 *  - El tamaño de cada grupo sale de la población real disponible (~4 por
 *    grupo con la data actual), no de un número fijo inventado.
 *
 * Por qué existe: hydrate-zones.mjs (versión anterior) armaba grupos con un
 * pool de TODA la iglesia sin evitar repetidos entre grupos — verificado:
 * 1041 filas de membresía pero solo 557 personas únicas, alguna en hasta 6
 * grupos. Este script corrige eso de raíz, para las 4 zonas.
 *
 * Borra también discipleship_attendance de TODOS los grupos (la asistencia
 * queda ligada a la lista de miembros vieja) — correr
 * seed-reports-attendance.mjs después para regenerarla contra los rosters
 * nuevos. Los reportes (discipleship_reports) NO se tocan: están ligados al
 * líder (reporter_id), no a miembros individuales, siguen siendo válidos.
 *
 * Uso:
 *   node scripts/fix-group-membership.mjs                              (local)
 *   SUPABASE_DB_URL='postgres://...' node scripts/fix-group-membership.mjs  (otra DB)
 */

import pg from 'pg';
import { parse as parseConnectionString } from 'pg-connection-string';
import { randomUUID } from 'crypto';

const { Client } = pg;
const DB_URL = process.env.SUPABASE_DB_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const connectionConfig = parseConnectionString(DB_URL);
connectionConfig.ssl = process.env.SUPABASE_DB_URL ? { rejectUnauthorized: false } : false;

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = rand(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function main() {
  const client = new Client(connectionConfig);
  await client.connect();

  const { rows: zones } = await client.query(`SELECT id, name FROM zones ORDER BY name`);

  let totalGroupsTouched = 0;
  let totalMembersAssigned = 0;

  for (const zone of zones) {
    const { rows: groups } = await client.query(
      `SELECT id FROM discipleship_groups WHERE zone_id = $1 ORDER BY group_name`,
      [zone.id]
    );
    if (groups.length === 0) {
      console.log(`${zone.name}: sin grupos, salteando.`);
      continue;
    }
    const groupIds = groups.map(g => g.id);

    // Pool disponible: gente de ESTA zona, role='server', sin ser ya
    // líder/supervisor de discipulado.
    const { rows: pool } = await client.query(
      `SELECT id FROM users u
       WHERE u.zone_id = $1 AND u.role = 'server'
       AND u.id NOT IN (SELECT user_id FROM discipleship_hierarchy)`,
      [zone.id]
    );

    // Borrar asistencia + membresía actual de TODOS los grupos de la zona
    // (el roster va a cambiar completo).
    await client.query(`DELETE FROM discipleship_attendance WHERE group_id = ANY($1::uuid[])`, [groupIds]);
    await client.query(`DELETE FROM discipleship_group_members WHERE group_id = ANY($1::uuid[])`, [groupIds]);

    // Repartir el pool entre los grupos de la zona, parejo, sin repetir a nadie.
    const shuffledPool = shuffle(pool.map(r => r.id));
    const perGroup = Array(groupIds.length).fill(0);
    for (let i = 0; i < shuffledPool.length; i++) {
      perGroup[i % groupIds.length]++;
    }

    let cursor = 0;
    for (let i = 0; i < groupIds.length; i++) {
      const groupId = groupIds[i];
      const count = perGroup[i];
      const assigned = shuffledPool.slice(cursor, cursor + count);
      cursor += count;

      for (const userId of assigned) {
        await client.query(
          `INSERT INTO discipleship_group_members
             (id, group_id, user_id, role_in_group, is_active, church_id)
           SELECT $1, $2, $3, 'member', true, church_id FROM discipleship_groups WHERE id = $2`,
          [randomUUID(), groupId, userId]
        );
      }
      await client.query(
        `UPDATE discipleship_groups SET member_count = $1, active_members = $1 WHERE id = $2`,
        [count, groupId]
      );
    }

    totalGroupsTouched += groupIds.length;
    totalMembersAssigned += shuffledPool.length;
    console.log(
      `${zone.name}: pool ${pool.length}, repartido entre ${groupIds.length} grupos (${Math.min(...perGroup)}-${Math.max(...perGroup)} c/u).`
    );
  }

  console.log(`\nTotal: ${totalGroupsTouched} grupos reconstruidos, ${totalMembersAssigned} asignaciones de miembros (sin repetidos).`);
  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
