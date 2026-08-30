import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Map as MapIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ZonesService } from '@/services/zones.service';
import type { ZoneMapData } from '@/types/discipleship.types';

/**
 * ZonesOverviewMap — panel de zonas y células del Inicio (handoff MD3, #159).
 *
 * NO reemplaza al mapa geográfico real (DiscipleshipMap/Leaflet), que sigue
 * viviendo en /discipulado: son dos vistas distintas a propósito. Ésta es la
 * lectura "de un vistazo" que pide el home — densidad y salud por zona, sin
 * cargar Leaflet en la pantalla de entrada.
 *
 * Los puntos NO son decorativos ni aleatorios: se proyectan las coordenadas
 * reales de cada grupo (bounding box → porcentaje del área), así la
 * distribución que se ve es la geográfica de verdad, en el lenguaje visual
 * abstracto del mock.
 */

interface Dot {
  id: string;
  x: number;
  y: number;
  color: string;
  label: string;
}

interface ZoneLegend {
  id: string;
  name: string;
  color: string;
  groups: number;
  members: number;
}

const PADDING = 8; // % de margen para que ningún punto quede pegado al borde

export function ZonesOverviewMap() {
  const navigate = useNavigate();
  const [data, setData] = useState<ZoneMapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'grupos' | 'personas'>('grupos');

  useEffect(() => {
    let cancelled = false;
    ZonesService.getMapData({ is_active: true })
      .then(res => {
        if (!cancelled) setData(res.zones || []);
      })
      .catch(() => {
        if (!cancelled) setData([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { dots, zones, totalGroups, totalMembers } = useMemo(() => {
    const legend: ZoneLegend[] = [];
    const raw: { id: string; lat: number; lng: number; color: string; label: string }[] = [];
    let groupCount = 0;
    let memberCount = 0;

    for (const z of data) {
      const color = z.zone.color || '#6750A4';
      const groups = z.groups || [];
      const members = groups.reduce((sum, g) => sum + (g.member_count ?? 0), 0);
      groupCount += groups.length;
      memberCount += members;
      legend.push({
        id: z.zone.id,
        name: z.zone.name,
        color,
        groups: groups.length,
        members,
      });
      for (const g of groups) {
        if (typeof g.latitude === 'number' && typeof g.longitude === 'number') {
          raw.push({ id: g.id, lat: g.latitude, lng: g.longitude, color, label: g.group_name });
        }
      }
    }

    // Proyección lineal del bounding box real a % del área. Si todos los grupos
    // comparten coordenada (o hay uno solo), el span queda en 0 → se centra.
    const lats = raw.map(r => r.lat);
    const lngs = raw.map(r => r.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const spanLat = maxLat - minLat;
    const spanLng = maxLng - minLng;
    const span = 100 - PADDING * 2;

    const projected: Dot[] = raw.map(r => ({
      id: r.id,
      color: r.color,
      label: r.label,
      x: spanLng ? PADDING + ((r.lng - minLng) / spanLng) * span : 50,
      // El eje Y se invierte: más latitud = más al norte = más arriba.
      y: spanLat ? PADDING + ((maxLat - r.lat) / spanLat) * span : 50,
    }));

    return {
      dots: projected,
      zones: legend,
      totalGroups: groupCount,
      totalMembers: memberCount,
    };
  }, [data]);

  if (loading) {
    return <Skeleton className="h-[420px] w-full rounded-md3-xl" />;
  }

  return (
    <section className="overflow-hidden rounded-md3-xl border border-outline-variant bg-surface-white">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="flex items-center gap-2.5">
          <MapIcon className="h-6 w-6 text-primary" />
          <h2 className="text-[18px] font-medium text-foreground">Mapa de zonas y células</h2>
        </div>

        <div className="flex items-center gap-3.5">
          {/* Toggle segmentado MD3 */}
          <div className="flex overflow-hidden rounded-full border border-outline">
            {(['grupos', 'personas'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium capitalize transition-colors',
                  mode === m
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10'
                )}
              >
                {mode === m && <Check className="h-4 w-4" />}
                {m}
              </button>
            ))}
          </div>

          {/* Badge EN VIVO */}
          <span className="flex items-center gap-1.5 text-[13px] font-medium text-md-success">
            <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e] motion-safe:animate-live-pulse" />
            EN VIVO · {mode === 'grupos' ? totalGroups : totalMembers} activos
          </span>
        </div>
      </header>

      {/* Área del mapa */}
      <div
        className="relative h-[300px] bg-map-bg"
        style={{
          backgroundImage:
            'radial-gradient(160px 130px at 20% 34%, rgba(239,68,68,.12), transparent 70%), radial-gradient(180px 150px at 52% 42%, rgba(59,130,246,.12), transparent 70%), radial-gradient(200px 170px at 82% 58%, rgba(34,197,94,.12), transparent 70%)',
        }}
      >
        {/* Rejilla sutil */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(0,0,0,.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,.05) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />

        {/* Puntos de célula, en su posición geográfica real proyectada */}
        {dots.map(d => (
          <span
            key={d.id}
            title={d.label}
            className="absolute h-[11px] w-[11px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_1px_3px_rgba(0,0,0,.3)]"
            style={{ left: `${d.x}%`, top: `${d.y}%`, backgroundColor: d.color }}
          />
        ))}

        {/* Overlay de resumen */}
        <div className="absolute left-4 top-4 rounded-[14px] bg-white/[.92] px-3.5 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,.12)] dark:bg-black/70">
          <p className="text-xs font-medium text-[#1D1B20] dark:text-white">
            {totalGroups} grupos · {totalMembers} miembros
          </p>
          <p className="text-[11px] text-[#79747E] dark:text-white/60">
            {zones.length} zonas · radar activo
          </p>
        </div>

        {dots.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Sin grupos con ubicación cargada todavía
          </p>
        )}
      </div>

      {/* Leyenda de zonas */}
      {zones.length > 0 && (
        <div className="flex flex-wrap gap-2.5 border-t border-outline-variant p-4 sm:px-5">
          {zones.map(z => (
            <button
              key={z.id}
              type="button"
              onClick={() => navigate('/dashboard/zones', { state: { presetSearch: z.name } })}
              className="flex items-center gap-2 rounded-full border border-outline-variant px-3.5 py-2 transition-colors hover:bg-surface-container"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: z.color }}
              />
              <span className="text-xs font-semibold text-foreground">{z.name}</span>
              <span className="text-[11px] text-outline">
                {mode === 'grupos' ? `${z.groups} grupos` : `${z.members} miembros`}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export default ZonesOverviewMap;
