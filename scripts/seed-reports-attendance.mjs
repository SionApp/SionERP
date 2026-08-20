/**
 * seed-reports-attendance.mjs
 * Rellena discipleship_reports (16 semanas) y discipleship_attendance (10 semanas)
 * para todos los grupos activos, así las gráficas de Crecimiento, Salud del
 * Sistema e Indicadores clave del dashboard pastoral tienen data real.
 *
 * Apunta a local por default. Idempotente: usa NOT EXISTS / ON CONFLICT DO
 * NOTHING, se puede re-correr sin duplicar.
 *
 * Uso:
 *   node scripts/seed-reports-attendance.mjs                              (local)
 *   SUPABASE_DB_URL='postgres://...' node scripts/seed-reports-attendance.mjs  (otra DB)
 */

import pg from 'pg';
import { randomUUID } from 'crypto';

const { Client } = pg;
const DB_URL = process.env.SUPABASE_DB_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const REPORT_WEEKS = 16;
const ATTENDANCE_WEEKS = 10;

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const chance = p => Math.random() < p;

// Monday..Saturday of the ISO week `weeksAgo` weeks before today.
function weekBounds(weeksAgo) {
  const now = new Date();
  const dow = (now.getDay() + 6) % 7; // Mon=0..Sun=6
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - dow - weeksAgo * 7);
  const monday = new Date(thisMonday);
  const saturday = new Date(thisMonday);
  saturday.setDate(monday.getDate() + 5);
  const fmt = d => d.toISOString().slice(0, 10);
  return { monday: fmt(monday), saturday: fmt(saturday) };
}

function buildReportData(groupId) {
  return {
    group_id: groupId,
    attendance_nd: rand(8, 18),
    attendance_dm: rand(3, 10),
    attendance_friends: rand(0, 4),
    attendance_kids: rand(0, 6),
    group_discipleships: chance(0.8) ? 1 : 0,
    group_evangelism: chance(0.6) ? 1 : 0,
    leader_new_disciples_care: chance(0.7) ? 1 : 0,
    leader_mature_disciples_care: chance(0.7) ? 1 : 0,
    spiritual_journal_days: rand(2, 7),
    leader_evangelism: chance(0.6) ? 1 : 0,
    service_attendance_sunday: chance(0.9),
    service_attendance_prayer: chance(0.7),
    doctrine_attendance: chance(0.6),
    baptisms: chance(0.1) ? 1 : 0,
    is_multiplying: false,
  };
}

// Solo cuando apunta a otra DB (SUPABASE_DB_URL seteado): el pooler de
// Supabase presenta un certificado que Node rechaza con sslmode=require
// (`pg` lo trata como verify-full, no como "solo requerir TLS"). El tráfico
// sigue cifrado; se relaja únicamente la verificación de la cadena, igual
// que recomienda la propia documentación de Supabase para conexiones por
// pooler. Local (sin la env var) sigue sin SSL, sin cambios.
const sslConfig = process.env.SUPABASE_DB_URL ? { rejectUnauthorized: false } : false;

async function main() {
  const client = new Client({ connectionString: DB_URL, ssl: sslConfig });
  await client.connect();

  const { rows: groups } = await client.query(`
    SELECT id, church_id, leader_id, supervisor_id
    FROM discipleship_groups
    WHERE status = 'active'
  `);
  console.log(`Grupos activos: ${groups.length}`);

  let reportsCreated = 0;
  for (const g of groups) {
    if (!g.leader_id) continue;
    for (let w = 1; w <= REPORT_WEEKS; w++) {
      const { monday, saturday } = weekBounds(w);
      const submittedAt = `${saturday}T18:${rand(0, 59)}:00Z`;
      const { rowCount } = await client.query(
        `
        INSERT INTO discipleship_reports
          (id, reporter_id, supervisor_id, report_level, report_type,
           period_start, period_end, report_data, status, submitted_at, church_id)
        SELECT $1, $2, $3, 1, 'weekly', $4, $5, $6, 'submitted', $7, $8
        WHERE NOT EXISTS (
          SELECT 1 FROM discipleship_reports
          WHERE reporter_id = $2 AND period_start = $4
        )
        `,
        [
          randomUUID(),
          g.leader_id,
          g.supervisor_id,
          monday,
          saturday,
          JSON.stringify(buildReportData(g.id)),
          submittedAt,
          g.church_id,
        ]
      );
      reportsCreated += rowCount;
    }
  }
  console.log(`Reportes insertados: ${reportsCreated}`);

  let attendanceCreated = 0;
  for (const g of groups) {
    const { rows: members } = await client.query(
      `SELECT user_id FROM discipleship_group_members WHERE group_id = $1 AND is_active = true`,
      [g.id]
    );
    if (members.length === 0) continue;

    for (let w = 1; w <= ATTENDANCE_WEEKS; w++) {
      const { saturday } = weekBounds(w);
      // Meeting day: mid-week (Wednesday of that ISO week).
      const meetingDate = new Date(saturday);
      meetingDate.setDate(meetingDate.getDate() - 3);
      const meetingDateStr = meetingDate.toISOString().slice(0, 10);

      for (const m of members) {
        const { rowCount } = await client.query(
          `
          INSERT INTO discipleship_attendance (group_id, user_id, meeting_date, present, church_id)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (group_id, user_id, meeting_date) DO NOTHING
          `,
          [g.id, m.user_id, meetingDateStr, chance(0.82), g.church_id]
        );
        attendanceCreated += rowCount;
      }
    }
  }
  console.log(`Asistencias insertadas: ${attendanceCreated}`);

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
