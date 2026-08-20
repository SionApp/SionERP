/**
 * sync-zone-geography.mjs
 * Sincroniza los 4 polígonos de zona al valor "canónico" (el que ya está
 * verificado y funcionando en local — geografía real de Coro para OESTE 1/3,
 * demo plausible para OESTE 2/ESTE), y revalida/regenera coordenadas:
 *
 *  - discipleship_groups: si el punto actual de un grupo cae FUERA de su
 *    zona (polígono nuevo), se le genera uno nuevo dentro. Si ya está
 *    adentro, no se toca.
 *  - users: mismo criterio, para cada usuario con zone_id asignado. Cubre
 *    tanto "nunca tuvo coordenadas" (local: 0/587) como "las tenía pero
 *    quedaron afuera al cambiar el polígono de su zona" (prod: 575 usuarios
 *    con coords calculadas para las franjas rectangulares viejas).
 *
 * Point-in-polygon real (ray casting), no bounding box — mismo método ya
 * verificado en hydrate-zones.mjs.
 *
 * Uso:
 *   node scripts/sync-zone-geography.mjs                              (local)
 *   SUPABASE_DB_URL='postgres://...' node scripts/sync-zone-geography.mjs  (otra DB)
 */

import pg from 'pg';
import { parse as parseConnectionString } from 'pg-connection-string';

const { Client } = pg;
const DB_URL = process.env.SUPABASE_DB_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const connectionConfig = parseConnectionString(DB_URL);
connectionConfig.ssl = process.env.SUPABASE_DB_URL ? { rejectUnauthorized: false } : false;

// Polígonos canónicos — exactamente los que ya están en local, verificados
// en pantalla (radar, marcadores, leyenda) y por point-in-polygon.
const CANONICAL_POLYGONS = {
  'OESTE 1': [
    [-69.678458311, 11.421090375],
    [-69.666823894, 11.388460751],
    [-69.64486884, 11.42422342],
    [-69.648620412, 11.426071813],
    [-69.667243324, 11.424777331],
    [-69.678458311, 11.421090375],
  ],
  'OESTE 3': [
    [-69.702115059, 11.402114234],
    [-69.700505733, 11.390776584],
    [-69.686193466, 11.395782875],
    [-69.692094326, 11.403733861],
    [-69.702115059, 11.402114234],
  ],
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
  return [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
}

async function main() {
  const client = new Client(connectionConfig);
  await client.connect();

  const { rows: zones } = await client.query(`SELECT id, name, boundaries FROM zones ORDER BY name`);

  for (const zone of zones) {
    const canonical = CANONICAL_POLYGONS[zone.name];
    if (!canonical) {
      console.log(`${zone.name}: sin polígono canónico definido, salteando.`);
      continue;
    }
    const currentJson = zone.boundaries ? JSON.stringify(zone.boundaries.coordinates[0]) : null;
    const canonicalJson = JSON.stringify(canonical);
    if (currentJson !== canonicalJson) {
      await client.query(`UPDATE zones SET boundaries = $1 WHERE id = $2`, [
        JSON.stringify({ type: 'Polygon', coordinates: [canonical] }),
        zone.id,
      ]);
      console.log(`${zone.name}: polígono sincronizado al valor canónico.`);
    } else {
      console.log(`${zone.name}: ya tenía el polígono canónico.`);
    }
  }

  // ── Grupos: revalidar contra el polígono (nuevo o existente) de su zona ──
  let groupsFixed = 0;
  for (const zone of zones) {
    const ring = CANONICAL_POLYGONS[zone.name];
    if (!ring) continue;
    const { rows: groups } = await client.query(
      `SELECT id, latitude, longitude FROM discipleship_groups WHERE zone_id = $1`,
      [zone.id]
    );
    for (const g of groups) {
      const hasCoords = g.latitude != null && g.longitude != null && Number(g.latitude) !== 0;
      const inside = hasCoords && pointInPolygon([Number(g.longitude), Number(g.latitude)], ring);
      if (!inside) {
        const [lng, lat] = randomPointInPolygon(ring);
        await client.query(`UPDATE discipleship_groups SET latitude = $1, longitude = $2 WHERE id = $3`, [
          lat,
          lng,
          g.id,
        ]);
        groupsFixed++;
      }
    }
  }
  console.log(`Grupos: ${groupsFixed} recibieron coordenadas nuevas (fuera de su zona o sin coords).`);

  // ── Personas: mismo criterio, para cada usuario con zona asignada ──
  let usersFixed = 0;
  for (const zone of zones) {
    const ring = CANONICAL_POLYGONS[zone.name];
    if (!ring) continue;
    const { rows: usersInZone } = await client.query(
      `SELECT id, latitude, longitude FROM users WHERE zone_id = $1`,
      [zone.id]
    );
    for (const u of usersInZone) {
      const hasCoords = u.latitude != null && u.longitude != null && Number(u.latitude) !== 0;
      const inside = hasCoords && pointInPolygon([Number(u.longitude), Number(u.latitude)], ring);
      if (!inside) {
        const [lng, lat] = randomPointInPolygon(ring);
        await client.query(`UPDATE users SET latitude = $1, longitude = $2 WHERE id = $3`, [lat, lng, u.id]);
        usersFixed++;
      }
    }
  }
  console.log(`Personas: ${usersFixed} recibieron coordenadas nuevas (fuera de su zona, sin coords, o sin zona antes).`);

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
