/**
 * hydrate-zones.mjs
 * Completa cada zona hasta TARGET_GROUPS grupos (líder nivel 1 + grupo +
 * ~9 miembros + coordenadas dentro del polígono real de la zona).
 *
 * Genérico y respetuoso de lo que ya exista en la DB destino:
 *  - Si una zona no tiene polígono, le asigna uno de GENERATED_POLYGONS
 *    (fallback demo — no se usa si la zona ya tiene boundaries reales).
 *  - Si ya tiene polígono, lo usa tal cual — nunca lo pisa.
 *  - Cuenta grupos REALES existentes (discipleship_groups), no filas de
 *    discipleship_hierarchy — una zona puede tener grupos con leader_id
 *    válido sin fila de jerarquía correspondiente (visto en prod).
 *  - Los candidatos a nuevo líder excluyen: cualquiera que YA sea leader_id
 *    de un grupo de esa zona, y cualquiera que YA tenga fila en
 *    discipleship_hierarchy (evita duplicar o pisar supervisores).
 *  - Grupos con coordenadas faltantes (latitude NULL o 0) se backfillean
 *    dentro del polígono real de su zona, sin tocar el resto del grupo.
 *
 * Patrón replicado (verificado contra OESTE1 antes de escribir esto):
 *  - discipleship_hierarchy nivel 1: supervisor_id = el supervisor auxiliar
 *    (nivel 2) YA existente de esa zona, territory=NULL.
 *  - discipleship_groups: group_name = "Grupo de <NOMBRE>", supervisor_id
 *    NULL, meeting_location NULL, member_count=active_members=9, status='active'.
 *  - discipleship_group_members: role_in_group='member', del pool general
 *    de la iglesia, únicos dentro del grupo (UNIQUE(group_id,user_id)).
 *
 * Apunta a local por default. Idempotente: se puede re-correr sin duplicar
 * — cada corrida solo agrega lo que falte para llegar a TARGET_GROUPS.
 *
 * Uso:
 *   node scripts/hydrate-zones.mjs                              (local)
 *   SUPABASE_DB_URL='postgres://...' node scripts/hydrate-zones.mjs  (otra DB)
 */

import pg from 'pg';
import { parse as parseConnectionString } from 'pg-connection-string';
import { randomUUID } from 'crypto';

const { Client } = pg;
const DB_URL = process.env.SUPABASE_DB_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

// Config de conexión: si DB_URL trae `sslmode=require` (o similar), `pg` lo
// parsea a su propio objeto ssl y ese gana sobre un `ssl:` explícito pasado
// junto a `connectionString` — probado empíricamente, no alcanza con pasar
// ambos. Por eso se parsea la connection string a mano y se pisa `ssl`
// DESPUÉS del parse, así siempre gana lo que decidimos acá. El pooler de
// Supabase presenta un certificado que Node rechaza en modo estricto
// (verify-full); el tráfico sigue cifrado, solo se relaja la verificación
// de la cadena — mismo approach que recomienda Supabase para conexiones por
// pooler. Local (sin SUPABASE_DB_URL) sigue sin SSL, sin cambios.
const connectionConfig = parseConnectionString(DB_URL);
connectionConfig.ssl = process.env.SUPABASE_DB_URL ? { rejectUnauthorized: false } : false;

const TARGET_GROUPS = 29;

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Muestra `n` elementos ÚNICOS de `arr` (Fisher-Yates parcial).
function shuffledSample(arr, n) {
  const copy = [...arr];
  const result = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = rand(0, copy.length - 1);
    result.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return result;
}

// ─── Polígonos fallback (solo si la zona destino no tiene uno) ────────────
// Geografía demo plausible en Coro, sin solape con OESTE1/OESTE3 reales
// (verificado por bounding box con >500m de margen en cada caso).
const GENERATED_POLYGONS = {
  'OESTE 2': [
    [-69.7, 11.383],
    [-69.696, 11.358],
    [-69.668, 11.352],
    [-69.653, 11.366],
    [-69.661, 11.383],
    [-69.7, 11.383],
  ],
  ESTE: [
    [-69.638, 11.428],
    [-69.601, 11.422],
    [-69.596, 11.394],
    [-69.624, 11.384],
    [-69.639, 11.399],
    [-69.638, 11.428],
  ],
};

// ─── Point-in-polygon (ray casting) + muestreo por rechazo ────────────────

function pointInPolygon([lng, lat], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function randomPointInPolygon(ring) {
  const lngs = ring.map(p => p[0]);
  const lats = ring.map(p => p[1]);
  const minLng = Math.min(...lngs),
    maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats),
    maxLat = Math.max(...lats);
  for (let attempt = 0; attempt < 500; attempt++) {
    const candidate = [
      minLng + Math.random() * (maxLng - minLng),
      minLat + Math.random() * (maxLat - minLat),
    ];
    if (pointInPolygon(candidate, ring)) return candidate;
  }
  // Fallback (no debería pasar con estos polígonos): centroide del bbox.
  return [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
}

// ─── Main ───────────────────────────────────────────────────────────────

async function main() {
  const client = new Client(connectionConfig);
  await client.connect();

  const { rows: zones } = await client.query(`SELECT id, name, church_id, boundaries FROM zones ORDER BY name`);

  for (const zone of zones) {
    const zoneName = zone.name;

    // ── 1) Asegurar polígono ──
    let ring;
    if (zone.boundaries) {
      ring = zone.boundaries.coordinates[0];
      console.log(`${zoneName}: usa su polígono real existente.`);
    } else if (GENERATED_POLYGONS[zoneName]) {
      ring = GENERATED_POLYGONS[zoneName];
      await client.query(`UPDATE zones SET boundaries = $1 WHERE id = $2`, [
        JSON.stringify({ type: 'Polygon', coordinates: [ring] }),
        zone.id,
      ]);
      console.log(`${zoneName}: no tenía polígono, se asignó uno demo (fallback).`);
    } else {
      console.log(`${zoneName}: sin polígono y sin fallback definido — no se pueden generar coordenadas. Salteando.`);
      continue;
    }

    // ── 2) Backfill de coords en grupos existentes sin coordenadas ──
    const { rows: groupsNoCoords } = await client.query(
      `SELECT id FROM discipleship_groups WHERE zone_id = $1 AND (latitude IS NULL OR latitude = 0)`,
      [zone.id]
    );
    for (const g of groupsNoCoords) {
      const [lng, lat] = randomPointInPolygon(ring);
      await client.query(`UPDATE discipleship_groups SET latitude = $1, longitude = $2 WHERE id = $3`, [
        lat,
        lng,
        g.id,
      ]);
    }
    if (groupsNoCoords.length > 0) {
      console.log(`${zoneName}: ${groupsNoCoords.length} grupos existentes recibieron coordenadas.`);
    }

    // ── 3) Completar hasta TARGET_GROUPS grupos ──
    const { rows: countRows } = await client.query(
      `SELECT COUNT(*) FROM discipleship_groups WHERE zone_id = $1`,
      [zone.id]
    );
    const existingGroups = Number(countRows[0].count);
    const need = TARGET_GROUPS - existingGroups;
    if (need <= 0) {
      console.log(`${zoneName}: ya tiene ${existingGroups} grupos (>= ${TARGET_GROUPS}), nada que completar.`);
      continue;
    }
    console.log(`${zoneName}: ${existingGroups} grupos existentes, faltan ${need} para llegar a ${TARGET_GROUPS}.`);

    // Supervisor auxiliar (nivel 2) ya existente de esta zona.
    const { rows: auxRows } = await client.query(
      `SELECT user_id FROM discipleship_hierarchy WHERE zone_name = $1 AND hierarchy_level = 2 LIMIT 1`,
      [zoneName]
    );
    if (auxRows.length === 0) {
      console.log(`${zoneName}: no tiene supervisor auxiliar (nivel 2), no puedo asignar líderes nuevos. Salteando.`);
      continue;
    }
    const auxSupervisorId = auxRows[0].user_id;

    // Candidatos: pertenecen a la zona, role='server', NO son ya leader_id
    // de un grupo de esta zona, y NO tienen fila previa en hierarchy
    // (cubre tanto duplicar líderes existentes como pisar supervisores).
    const { rows: candidates } = await client.query(
      `SELECT id, first_name, last_name FROM users u
       WHERE u.zone_id = $1 AND u.role = 'server'
       AND u.id NOT IN (SELECT leader_id FROM discipleship_groups WHERE zone_id = $1)
       AND u.id NOT IN (SELECT user_id FROM discipleship_hierarchy)
       ORDER BY random() LIMIT $2`,
      [zone.id, need]
    );
    console.log(`${zoneName}: ${candidates.length} candidatos a líder disponibles (de ${need} necesarios).`);

    // Pool general de miembros (igual que OESTE1: de cualquier parte de la iglesia).
    const { rows: memberPool } = await client.query(
      `SELECT id FROM users WHERE role IN ('member', 'server')`
    );

    for (const leader of candidates) {
      const hierarchyId = randomUUID();
      await client.query(
        `INSERT INTO discipleship_hierarchy
           (id, user_id, hierarchy_level, supervisor_id, zone_name, territory,
            active_groups_assigned, zone_id, church_id)
         VALUES ($1, $2, 1, $3, $4, NULL, 0, $5, $6)`,
        [hierarchyId, leader.id, auxSupervisorId, zoneName, zone.id, zone.church_id]
      );

      const [lng, lat] = randomPointInPolygon(ring);
      const groupId = randomUUID();
      await client.query(
        `INSERT INTO discipleship_groups
           (id, group_name, leader_id, supervisor_id, meeting_location, meeting_day,
            meeting_time, member_count, active_members, status, zone_name,
            zone_id, latitude, longitude, meeting_address, church_id)
         VALUES ($1, $2, $3, NULL, NULL, NULL, NULL, 9, 9, 'active', $4, $5, $6, $7, NULL, $8)`,
        [
          groupId,
          `Grupo de ${leader.first_name} ${leader.last_name}`,
          leader.id,
          zoneName,
          zone.id,
          lat,
          lng,
          zone.church_id,
        ]
      );

      // 9 miembros ÚNICOS para este grupo (hay UNIQUE(group_id,user_id)) —
      // pueden repetirse entre grupos distintos, no dentro del mismo.
      const groupMembers = shuffledSample(memberPool, 9);
      for (const member of groupMembers) {
        await client.query(
          `INSERT INTO discipleship_group_members
             (id, group_id, user_id, role_in_group, is_active, church_id)
           VALUES ($1, $2, $3, 'member', true, $4)`,
          [randomUUID(), groupId, member.id, zone.church_id]
        );
      }
    }
    console.log(`${zoneName}: ${candidates.length} grupos nuevos creados con líder + 9 miembros c/u.`);
  }

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
