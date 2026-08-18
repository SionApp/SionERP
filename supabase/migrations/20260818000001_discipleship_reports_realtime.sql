-- Realtime para el "mapa en vivo" del discipulado.
--
-- El mapa (DiscipleshipMap) se suscribe a los cambios de discipleship_reports
-- para refrescar al instante (titileo de reportes pendientes, contador EN VIVO)
-- en vez de pollear cada 30s. La data del mapa la sigue sirviendo el backend Go
-- (getMapData, con su aislamiento por TenantTx) — Realtime solo actúa como
-- "ping: algo cambió, refrescá".
--
-- Aislamiento multi-tenant: la policy existente `tenant_isolation` usa
-- current_setting('app.current_church_id'), que SOLO setea el backend (TenantTx)
-- y NO aplica a una conexión Realtime directa del cliente. Por eso se agrega una
-- policy basada en el JWT (app_metadata.church_id) para que la suscripción quede
-- scopeada por iglesia. Se limita además a roles staff+ (los únicos que ven el
-- mapa y que legítimamente ya ven todos los reportes de su iglesia por la app),
-- así no se amplía el acceso directo de un miembro común.

-- 1) Agregar la tabla a la publicación de Realtime (idempotente).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'discipleship_reports'
  ) then
    alter publication supabase_realtime add table discipleship_reports;
  end if;
end $$;

-- 2) Policy SELECT scopeada por iglesia (JWT) + rol, para Realtime.
drop policy if exists "reports_realtime_church_staff" on discipleship_reports;
create policy "reports_realtime_church_staff"
on discipleship_reports
for select
to authenticated
using (
  church_id = (auth.jwt() -> 'app_metadata' ->> 'church_id')::uuid
  and (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'pastor', 'staff')
);
