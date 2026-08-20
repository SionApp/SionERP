/**
 * hydrate-zones.mjs
 * Lleva OESTE 2, OESTE 3 y ESTE a la misma completitud que OESTE 1:
 * polígono real (OESTE 2/ESTE, generados — OESTE 3 ya lo tiene), 29 líderes
 * de nivel 1 con su grupo, ~9 miembros por grupo, y coordenadas dentro del
 * polígono de la zona (point-in-polygon real, no bounding box).
 *
 * Replica el patrón EXACTO ya presente en OESTE 1 (verificado por consulta
 * directa antes de escribir esto):
 *  - discipleship_hierarchy nivel 1: user_id = líder, supervisor_id = el
 *    supervisor auxiliar (nivel 2) YA existente de esa zona, territory=NULL.
 *  - discipleship_groups: group_name = "Grupo de <NOMBRE>", supervisor_id
 *    NULL (así está en OESTE1, no es un bug mío), meeting_location NULL,
 *    member_count=active_members=9, status='active'.
 *  - discipleship_group_members: role_in_group='member', miembros tomados
 *    del pool general de la iglesia (no solo de la zona), pueden repetirse
 *    entre grupos — igual que OESTE1.
 *  - Los 29 líderes SÍ pertenecen a la zona (users.zone_id) y tienen role='server'.
 *
 * Apunta a local por default. Idempotente: si una zona ya tiene boundaries,
 * no lo pisa; si ya tiene líderes (hierarchy nivel 1), no duplica — seguro
 * de re-correr o correr contra una DB que ya tiene parte del trabajo.
 *
 * Uso:
 *   node scripts/hydrate-zones.mjs                              (local)
 *   SUPABASE_DB_URL='postgres://...' node scripts/hydrate-zones.mjs  (otra DB)
 */

import pg from 'pg';
import { randomUUID } from 'crypto';

const { Client } = pg;
const DB_URL = process.env.SUPABASE_DB_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

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

// ─── Polígonos generados (demo, geografía plausible) ──────────────────────
// Verificados por bounding box contra OESTE1 y OESTE3 reales, con >500m de
// margen en cada caso — no se solapan. Editables después desde el mapa.
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
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  // ── 1) OESTE 3: ya tiene 29 grupos/líderes/miembros, solo faltan coords ──
  const { rows: oeste3Groups } = await client.query(
    `SELECT g.id, z.boundaries
     FROM discipleship_groups g JOIN zones z ON g.zone_id = z.id
     WHERE z.name = 'OESTE 3' AND (g.latitude IS NULL OR g.latitude = 0)`
  );
  console.log(`OESTE 3: ${oeste3Groups.length} grupos sin coordenadas`);
  for (const g of oeste3Groups) {
    const ring = g.boundaries.coordinates[0];
    const [lng, lat] = randomPointInPolygon(ring);
    await client.query(
      `UPDATE discipleship_groups SET latitude = $1, longitude = $2 WHERE id = $3`,
      [lat, lng, g.id]
    );
  }
  console.log(`OESTE 3: coordenadas asignadas.`);

  // ── 2) OESTE 2 y ESTE: build completo ──────────────────────────────────
  for (const [zoneName, ring] of Object.entries(GENERATED_POLYGONS)) {
    const { rows: zoneRows } = await client.query(
      `SELECT id, church_id, boundaries FROM zones WHERE name = $1`,
      [zoneName]
    );
    if (zoneRows.length === 0) {
      console.log(`${zoneName}: no existe la zona, salteando.`);
      continue;
    }
    const zone = zoneRows[0];

    if (!zone.boundaries) {
      await client.query(`UPDATE zones SET boundaries = $1 WHERE id = $2`, [
        JSON.stringify({ type: 'Polygon', coordinates: [ring] }),
        zone.id,
      ]);
      console.log(`${zoneName}: polígono asignado.`);
    } else {
      console.log(`${zoneName}: ya tenía polígono, no se pisa.`);
    }

    // ¿Cuántos líderes nivel 1 faltan? (idempotente: continúa donde quedó,
    // no saltea la zona entera si ya tiene algunos).
    const TARGET_LEADERS = 29;
    const { rows: existingLeaders } = await client.query(
      `SELECT COUNT(*) FROM discipleship_hierarchy WHERE zone_name = $1 AND hierarchy_level = 1`,
      [zoneName]
    );
    const need = TARGET_LEADERS - Number(existingLeaders[0].count);
    if (need <= 0) {
      console.log(`${zoneName}: ya tiene ${existingLeaders[0].count} líderes nivel 1, nada que hacer.`);
      continue;
    }
    console.log(`${zoneName}: ${existingLeaders[0].count} líderes existentes, faltan ${need}.`);

    // Supervisor auxiliar (nivel 2) ya existente de esta zona.
    const { rows: auxRows } = await client.query(
      `SELECT user_id FROM discipleship_hierarchy WHERE zone_name = $1 AND hierarchy_level = 2 LIMIT 1`,
      [zoneName]
    );
    if (auxRows.length === 0) {
      console.log(`${zoneName}: no tiene supervisor auxiliar (nivel 2), no puedo asignar líderes. Salteando.`);
      continue;
    }
    const auxSupervisorId = auxRows[0].user_id;

    // Candidatos: pertenecen a la zona, role='server', sin fila previa en hierarchy
    // (esto además excluye automáticamente a los líderes ya creados en un run anterior).
    const { rows: candidates } = await client.query(
      `SELECT id, first_name, last_name FROM users u
       WHERE u.zone_id = $1 AND u.role = 'server'
       AND u.id NOT IN (SELECT user_id FROM discipleship_hierarchy)
       ORDER BY random() LIMIT $2`,
      [zone.id, need]
    );
    console.log(`${zoneName}: ${candidates.length} candidatos a líder disponibles.`);

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
    console.log(`${zoneName}: ${candidates.length} grupos creados con líder + 9 miembros c/u.`);
  }

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
