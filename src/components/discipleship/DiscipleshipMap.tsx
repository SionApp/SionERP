import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useMobileMode } from '@/hooks/useMobileMode';
import { DiscipleshipService } from '@/services/discipleship.service';
import { ZonesService } from '@/services/zones.service';
import type {
  DiscipleshipGroup,
  GeoJSONMultiPolygon,
  GeoJSONPolygon,
  ZoneMapData,
  ZoneMapGroup,
} from '@/types/discipleship.types';
import { Layers, MapPin, Search, User as UserIcon, Users } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  useMap,
  useMapEvent,
  ZoomControl,
} from 'react-leaflet';

// ── Tipos internos ──────────────────────────────────────────

interface FeatureProperties {
  zoneId: string;
  zoneName: string;
  color: string;
  totalGroups: number;
}

interface ZoneFeature {
  type: 'Feature';
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  properties: FeatureProperties;
}

interface MapUser {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  zone_name?: string;
  latitude: number;
  longitude: number;
}

interface DiscipleshipMapProps {
  selectedZoneId?: string | null;
  onZoneSelect?: (zoneId: string | null, groups: DiscipleshipGroup[]) => void;
  heightClassName?: string;
  /** Título de la vista (breadcrumb queda a cargo de la página, no del widget). Sin título: solo controles. */
  title?: string;
}

// ── Constantes ──────────────────────────────────────────────

const DEFAULT_CENTER: [number, number] = [11.4045, -69.6734];
const DEFAULT_ZOOM = 13;

// Tiles estándar de OpenStreetMap: calles, etiquetas y manzanas/edificios
// visibles — el look "mapa real" (tipo Google Maps), no el estilo minimalista
// de CARTO que se usaba antes. Sin API key, gratis, mismo para ambos temas
// (igual que Google Maps, que no tiene un modo oscuro propio del mapa base).
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Cada cuánto se refresca el mapa para detectar reportes nuevos (ripple) y
// actualizar el contador EN VIVO / la línea de tiempo. No hay push real
// (Supabase Realtime) todavía — polling es el fallback explícito que
// contempla el propio diseño.
const LIVE_POLL_MS = 30_000;
// Cuánto dura el "ripple" visual de un grupo que acaba de reportar.
const PULSE_DURATION_MS = 10_000;

// ── Actividad de reporte (estado real, no inventado) ─────────
// El diseño original pedía un semáforo de "creció / sin cambios / sin
// reportar" basado en delta de miembros — dato que hoy no existe (no hay
// snapshots históricos de member_count). Se reutiliza el mismo semáforo de
// 3 colores pero con un significado que SÍ es 100% real: recencia del
// último reporte (`last_report_date`, MAX(submitted_at) real del backend).
// Es, además, la señal más útil para un pastor haciendo seguimiento.
type ActivityStatus = 'recent' | 'aging' | 'silent';

const ACTIVITY_COLORS: Record<ActivityStatus, string> = {
  recent: '#22c55e',
  aging: '#f59e0b',
  silent: '#ef4444',
};

const ACTIVITY_LABELS: Record<ActivityStatus, string> = {
  recent: 'REPORTÓ ESTA SEMANA',
  aging: 'REPORTÓ ESTE MES',
  silent: 'SIN REPORTAR',
};

/**
 * Postgres devuelve el timestamptz como "YYYY-MM-DD HH:MM:SS.ffffff+00", que
 * new Date() NO parsea: el offset viene en 2 dígitos (`+00`, no `+00:00`) y la
 * fracción trae microsegundos. Ambos dan Invalid Date. Normalizamos:
 *  - espacio → 'T'
 *  - microsegundos → milisegundos (.755019 → .755)
 *  - offset de 2 dígitos → ±HH:MM (+00 → +00:00)
 */
function parseBackendTimestamp(raw: string | undefined): Date | null {
  if (!raw) return null;
  const s = raw
    .replace(' ', 'T')
    .replace(/(\.\d{3})\d+/, '$1')
    .replace(/([+-]\d{2})$/, '$1:00');
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function getActivityStatus(lastReportDate: string | undefined): ActivityStatus {
  const d = parseBackendTimestamp(lastReportDate);
  if (!d) return 'silent';
  const daysAgo = (Date.now() - d.getTime()) / 86_400_000;
  if (daysAgo <= 7) return 'recent';
  if (daysAgo <= 30) return 'aging';
  return 'silent';
}

function formatRelativeTime(date: Date | null): string {
  if (!date) return 'Sin reportes aún';
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return 'ahora mismo';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

/** Diámetro del marcador de grupo: escala con miembros, con piso y techo. */
function groupMarkerSize(members: number): number {
  return Math.min(30, Math.max(14, 12 + members * 0.9));
}

// ── SVG Markers (as HTML strings for divIcon) ──────────────

// Marcador de grupo: círculo de color = estado de reporte, diámetro = miembros.
// Reemplaza el pin-casita anterior — así lo pide el rediseño "mapa en vivo".
function groupCircleHtml(
  color: string,
  size: number,
  isSelected: boolean,
  pulsing: boolean
): string {
  const ring = isSelected
    ? `<div style="position:absolute;inset:-5px;border-radius:999px;border:2px solid #fff;opacity:.9;"></div>`
    : '';
  const ripple = pulsing
    ? `<div class="jetro-group-pulse" style="border-color:${color}"></div>
       <div class="jetro-group-pulse jetro-group-pulse-delay" style="border-color:${color}"></div>`
    : '';
  return `<div class="jetro-group-marker" style="position:relative;width:${size}px;height:${size}px;">
    ${ripple}
    ${ring}
    <div style="width:100%;height:100%;border-radius:999px;background:${color};border:2.5px solid #fff;box-shadow:0 2px 6px rgba(15,23,42,.4);"></div>
  </div>`;
}

function createGroupIcon(
  color: string,
  size: number,
  isSelected: boolean,
  pulsing: boolean
): L.DivIcon {
  const boxSize = size + 10; // margen para el ring/ripple sin recortar
  return L.divIcon({
    html: groupCircleHtml(color, size, isSelected, pulsing),
    className: '',
    iconSize: [boxSize, boxSize],
    iconAnchor: [boxSize / 2, boxSize / 2],
    popupAnchor: [0, -boxSize / 2],
  });
}

// Badge circular para personas (más chico, sin punta — marca aproximada).
function personIconHtml(size: number): string {
  return `<div style="width:${size}px;height:${size}px;filter:drop-shadow(0 1px 1.5px rgba(15,23,42,.4));">
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="#6366f1" stroke="#ffffff" stroke-width="2"/>
      <circle cx="12" cy="9.6" r="3" fill="#ffffff"/>
      <path d="M6.5 17.8c0-3 2.6-5 5.5-5s5.5 2 5.5 5" fill="#ffffff"/>
    </svg>
  </div>`;
}

function createPersonIcon(size: number): L.DivIcon {
  return L.divIcon({
    html: personIconHtml(size),
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2], // centro
    popupAnchor: [0, -size / 2],
  });
}

// Etiqueta de zona: nombre + puntito de color, centrada en el área de la zona.
// pointer-events:none para que nunca tape un click a un pin de abajo.
function createZoneLabelIcon(name: string, color: string, isSelected: boolean): L.DivIcon {
  return L.divIcon({
    html: `<div style="pointer-events:none;display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px;background:rgba(255,255,255,0.92);box-shadow:0 1px 3px rgba(15,23,42,.18);font:700 10px/1 system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#1e293b;white-space:nowrap;opacity:${isSelected ? '1' : '0.85'};transform:scale(${isSelected ? '1.08' : '1'});transition:opacity .2s,transform .2s;">
      <span style="width:6px;height:6px;border-radius:999px;background:${color};flex-shrink:0;"></span>${name}
    </div>`,
    className: '',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

// ── Helpers ──────────────────────────────────────────────────

function isPolygon(boundaries: unknown): boundaries is GeoJSONPolygon {
  return (
    !!boundaries &&
    typeof boundaries === 'object' &&
    (boundaries as GeoJSONPolygon).type === 'Polygon'
  );
}

function isMultiPolygon(boundaries: unknown): boundaries is GeoJSONMultiPolygon {
  return (
    !!boundaries &&
    typeof boundaries === 'object' &&
    (boundaries as GeoJSONMultiPolygon).type === 'MultiPolygon'
  );
}

function normalizeZoneFeature(zoneData: ZoneMapData): ZoneFeature | null {
  const { zone } = zoneData;
  const boundaries = zone.boundaries;

  const props: FeatureProperties = {
    zoneId: zone.id,
    zoneName: zone.name,
    color: zone.color || '#3b82f6',
    totalGroups: zoneData.groups.length,
  };

  if (isPolygon(boundaries)) {
    return {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: boundaries.coordinates },
      properties: props,
    };
  }
  if (isMultiPolygon(boundaries)) {
    return {
      type: 'Feature',
      geometry: { type: 'MultiPolygon', coordinates: boundaries.coordinates },
      properties: props,
    };
  }
  return null;
}

/** Convert GeoJSON [lng, lat] to Leaflet [lat, lng] */
function geojsonToLatLng(coords: [number, number]): [number, number] {
  return [coords[1], coords[0]];
}

/** Extract all Leaflet-ready polygon position arrays from a zone feature */
function getZonePolyPositions(
  feature: ZoneFeature,
  selectedZoneId: string | null
): {
  positions: [number, number][];
  isMulti: boolean;
  isSelected: boolean;
  color: string;
}[] {
  const isSelected = feature.properties.zoneId === selectedZoneId;
  const color = feature.properties.color;

  if (feature.geometry.type === 'Polygon') {
    return feature.geometry.coordinates.map(ring => ({
      positions: ring.map(geojsonToLatLng),
      isMulti: false,
      isSelected,
      color,
    }));
  }

  // MultiPolygon: each polygon is its own array of rings
  return feature.geometry.coordinates.flatMap(polygon =>
    polygon.map(ring => ({
      positions: ring.map(geojsonToLatLng),
      isMulti: true,
      isSelected,
      color,
    }))
  );
}

/** Calculate bounding box from a zone feature for fitBounds */
function getFeatureLatLngBounds(feature: ZoneFeature): L.LatLngBounds | null {
  const allPoints: [number, number][] = [];

  const extract = (coords: number[]) => {
    allPoints.push([coords[1], coords[0]]);
  };

  if (feature.geometry.type === 'Polygon') {
    feature.geometry.coordinates.forEach(ring => ring.forEach(extract));
  } else {
    feature.geometry.coordinates.forEach(polygon => polygon.forEach(ring => ring.forEach(extract)));
  }

  if (allPoints.length === 0) return null;
  return L.latLngBounds(allPoints);
}

// ── Map helper components ───────────────────────────────────

function FitToBounds({ bounds, trigger }: { bounds: L.LatLngBounds | null; trigger: unknown }) {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [40, 40], duration: 800 });
    }
  }, [map, bounds, trigger]);

  return null;
}

function FlyTo({
  position,
  zoom,
  trigger,
}: {
  position: [number, number];
  zoom: number;
  trigger: unknown;
}) {
  const map = useMap();

  useEffect(() => {
    map.flyTo(position, zoom, { duration: 1 });
  }, [map, position, zoom, trigger]);

  return null;
}

function PopupCloseHandler({ onClose }: { onClose: () => void }) {
  useMapEvent('popupclose', onClose);
  return null;
}

// ── Componente principal ────────────────────────────────────

export default function DiscipleshipMap({
  selectedZoneId,
  onZoneSelect,
  heightClassName = 'h-[440px] lg:h-[580px]',
  title,
}: DiscipleshipMapProps) {
  const isMobileApp = useMobileMode();
  const mapRef = useRef<L.Map | null>(null);
  const [zoneData, setZoneData] = useState<ZoneMapData[]>([]);
  const [mapUsers, setMapUsers] = useState<MapUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [internalSelectedZoneId, setInternalSelectedZoneId] = useState<string | null>(
    selectedZoneId ?? null
  );

  // Toggles
  const [showGroups, setShowGroups] = useState(true);
  const [showPeople, setShowPeople] = useState(false);

  // Mobile: hoja inferior con la lista de zonas (reemplaza al sidebar de escritorio)
  const [mobileListOpen, setMobileListOpen] = useState(false);

  // Popups
  const [selectedGroup, setSelectedGroup] = useState<ZoneMapGroup | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<MapUser | null>(null);

  // Tiempo real (polling, ver comentario en LIVE_POLL_MS)
  const [pulsingGroupIds, setPulsingGroupIds] = useState<Set<string>>(new Set());
  const [activityBuckets, setActivityBuckets] = useState<number[]>(new Array(24).fill(0));
  const lastReportByGroup = useRef<Map<string, string>>(new Map());
  const pulseTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Map navigation state
  const [fitToBounds, setFitToBounds] = useState<{ bounds: L.LatLngBounds; key: string } | null>(
    null
  );
  const [flyTo, setFlyTo] = useState<{
    position: [number, number];
    zoom: number;
    key: string;
  } | null>(null);

  useEffect(() => {
    setInternalSelectedZoneId(selectedZoneId ?? null);
  }, [selectedZoneId]);

  // Cargar zonas + grupos, con polling para detectar reportes nuevos (ripple)
  // y refrescar el contador EN VIVO sin resetear el viewport del usuario.
  useEffect(() => {
    let cancelled = false;

    const load = async (isFirstLoad: boolean) => {
      try {
        if (isFirstLoad) setLoading(true);
        const response = await ZonesService.getMapData({ is_active: true });
        if (cancelled) return;
        const zones = response.zones || [];
        setZoneData(zones);

        // Diff contra el poll anterior: si last_report_date cambió, ese grupo
        // "acaba de reportar" — dispara el ripple ~10s. No dispara en la
        // primera carga (no hay "anterior" con qué comparar todavía).
        if (!isFirstLoad) {
          const newlyReported: string[] = [];
          for (const zd of zones) {
            for (const g of zd.groups) {
              const prev = lastReportByGroup.current.get(g.id);
              if (g.last_report_date && prev !== undefined && prev !== g.last_report_date) {
                newlyReported.push(g.id);
              }
            }
          }
          if (newlyReported.length > 0) {
            setPulsingGroupIds(prevSet => {
              const next = new Set(prevSet);
              newlyReported.forEach(id => next.add(id));
              return next;
            });
            newlyReported.forEach(id => {
              const existing = pulseTimeouts.current.get(id);
              if (existing) clearTimeout(existing);
              pulseTimeouts.current.set(
                id,
                setTimeout(() => {
                  setPulsingGroupIds(prevSet => {
                    const next = new Set(prevSet);
                    next.delete(id);
                    return next;
                  });
                  pulseTimeouts.current.delete(id);
                }, PULSE_DURATION_MS)
              );
            });
          }
        }
        lastReportByGroup.current = new Map(
          zones.flatMap(zd => zd.groups.map(g => [g.id, g.last_report_date || '']))
        );
      } finally {
        if (isFirstLoad) setLoading(false);
      }
    };

    void load(true);
    const interval = setInterval(() => void load(false), LIVE_POLL_MS);
    // Copia local del ref para el cleanup (regla react-hooks/exhaustive-deps:
    // el .current puede cambiar antes de que corra la limpieza).
    const timeouts = pulseTimeouts.current;
    return () => {
      cancelled = true;
      clearInterval(interval);
      timeouts.forEach(t => clearTimeout(t));
      timeouts.clear();
    };
  }, []);

  // Línea de tiempo (24h reales) — mismo ciclo de refresco que el mapa.
  useEffect(() => {
    let cancelled = false;
    const loadTimeline = async () => {
      try {
        const buckets = await DiscipleshipService.getActivityTimeline();
        if (!cancelled) setActivityBuckets(buckets);
      } catch (err) {
        console.error('Error loading activity timeline:', err);
      }
    };
    void loadTimeline();
    const interval = setInterval(loadTimeline, LIVE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Cargar usuarios con coordenadas (usa endpoint de discipulado, no requiere staff+)
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersData = await DiscipleshipService.getUsersForHierarchy();
        const rawUsers = usersData || [];
        const usersWithCoords: MapUser[] = rawUsers
          .filter(u => {
            const lat = Number(u.latitude);
            const lng = Number(u.longitude);
            return (
              u.latitude != null &&
              u.longitude != null &&
              isFinite(lat) &&
              isFinite(lng) &&
              lat !== 0 &&
              lng !== 0
            );
          })
          .map(u => ({
            id: String(u.id),
            first_name: String(u.first_name || ''),
            last_name: String(u.last_name || ''),
            email: u.email ? String(u.email) : undefined,
            zone_name: u.zone_name ? String(u.zone_name) : undefined,
            latitude: Number(u.latitude),
            longitude: Number(u.longitude),
          }));
        setMapUsers(usersWithCoords);
      } catch (err) {
        console.error('Error loading map users:', err);
      }
    };
    void loadUsers();
  }, []);

  const zoneFeatures = useMemo<ZoneFeature[]>(() => {
    return zoneData.map(normalizeZoneFeature).filter((f): f is ZoneFeature => f !== null);
  }, [zoneData]);

  const selectedZone = useMemo(
    () => zoneData.find(item => item.zone.id === internalSelectedZoneId) ?? null,
    [zoneData, internalSelectedZoneId]
  );

  // Grupos visibles (con coordenadas validas)
  const visibleGroups = useMemo<ZoneMapGroup[]>(() => {
    const hasValidCoords = (group: ZoneMapGroup) => {
      const lat = Number(group.latitude);
      const lng = Number(group.longitude);
      return (
        group.latitude != null &&
        group.longitude != null &&
        !isNaN(lat) &&
        !isNaN(lng) &&
        isFinite(lat) &&
        isFinite(lng) &&
        // Excluir el punto nulo (0,0): grupos sin ubicación real que el backend
        // devuelve como 0 — antes renderizaban pines fantasma en medio del océano.
        lat !== 0 &&
        lng !== 0
      );
    };
    if (!internalSelectedZoneId) {
      return zoneData.flatMap(item => item.groups).filter(hasValidCoords);
    }
    return (
      zoneData
        .find(item => item.zone.id === internalSelectedZoneId)
        ?.groups.filter(hasValidCoords) || []
    );
  }, [zoneData, internalSelectedZoneId]);

  // Personas visibles (filtradas por zona si hay seleccion)
  const visiblePeople = useMemo<MapUser[]>(() => {
    if (!internalSelectedZoneId) return mapUsers;
    const zoneName = zoneData.find(z => z.zone.id === internalSelectedZoneId)?.zone.name;
    if (!zoneName) return mapUsers;
    return mapUsers.filter(u => u.zone_name === zoneName);
  }, [mapUsers, internalSelectedZoneId, zoneData]);

  const totalGroups = useMemo(
    () => zoneData.reduce((acc, item) => acc + item.groups.length, 0),
    [zoneData]
  );
  const totalMembers = useMemo(
    () => zoneData.reduce((acc, item) => acc + (item.zone.total_members || 0), 0),
    [zoneData]
  );
  // "activos" del pill EN VIVO: miembros activos reales, sumados de todos los
  // grupos cargados (no solo los visibles) — así el contador no salta al filtrar por zona.
  const liveActiveCount = useMemo(
    () =>
      zoneData.reduce(
        (acc, item) => acc + item.groups.reduce((a, g) => a + (g.active_members || 0), 0),
        0
      ),
    [zoneData]
  );

  const fitToZone = useCallback(
    (zoneId: string) => {
      const feature = zoneFeatures.find(item => item.properties.zoneId === zoneId);
      if (!feature) return;
      const bounds = getFeatureLatLngBounds(feature);
      if (!bounds) return;
      setFitToBounds({ bounds, key: zoneId });
    },
    [zoneFeatures]
  );

  const flyToGroup = useCallback((lat: number, lng: number) => {
    setFlyTo({ position: [lat, lng], zoom: 17, key: `${lat}-${lng}` });
  }, []);

  const handleSelectZone = useCallback(
    (zone: ZoneMapData | null) => {
      const nextZoneId = zone?.zone.id ?? null;
      setInternalSelectedZoneId(nextZoneId);
      setSelectedGroup(null);
      setSelectedPerson(null);
      onZoneSelect?.(nextZoneId, zone?.groups ?? []);
      if (nextZoneId) fitToZone(nextZoneId);
      if (isMobileApp) setMobileListOpen(false);
    },
    [onZoneSelect, fitToZone, isMobileApp]
  );

  // Pre-compute all polygon data for rendering
  const allZonePolygons = useMemo(() => {
    return zoneFeatures.flatMap(feature => getZonePolyPositions(feature, internalSelectedZoneId));
  }, [zoneFeatures, internalSelectedZoneId]);

  // Etiqueta con el nombre de cada zona, centrada en su bounding box
  const zoneLabels = useMemo(() => {
    return zoneFeatures
      .map(feature => {
        const bounds = getFeatureLatLngBounds(feature);
        if (!bounds) return null;
        const center = bounds.getCenter();
        return {
          zoneId: feature.properties.zoneId,
          name: feature.properties.zoneName,
          color: feature.properties.color,
          center: [center.lat, center.lng] as [number, number],
          isSelected: feature.properties.zoneId === internalSelectedZoneId,
        };
      })
      .filter((l): l is NonNullable<typeof l> => l !== null);
  }, [zoneFeatures, internalSelectedZoneId]);

  // ── Capas del mapa (compartidas entre el layout de escritorio y el mobile) ──
  const mapLayers = (
    <>
      <ZoomControl position="topright" />
      <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} />

      {/* Zona polygons (fill + border) */}
      {allZonePolygons.map((poly, idx) => (
        <Polygon
          key={`zone-poly-${idx}`}
          positions={poly.positions}
          pathOptions={{
            color: poly.color,
            fillColor: poly.color,
            fillOpacity: poly.isSelected ? 0.3 : 0.14,
            weight: poly.isSelected ? 3 : 1.5,
            dashArray: poly.isSelected ? undefined : '5 5',
            lineCap: 'round',
          }}
        />
      ))}

      {/* Etiquetas de nombre de zona, centradas en su área */}
      {zoneLabels.map(label => (
        <Marker
          key={`zone-label-${label.zoneId}`}
          position={label.center}
          icon={createZoneLabelIcon(label.name, label.color, label.isSelected)}
          interactive={false}
          zIndexOffset={-1000}
        />
      ))}

      {/* FitToBounds helper */}
      {fitToBounds && <FitToBounds bounds={fitToBounds.bounds} trigger={fitToBounds.key} />}
      {flyTo && <FlyTo position={flyTo.position} zoom={flyTo.zoom} trigger={flyTo.key} />}
      <PopupCloseHandler
        onClose={() => {
          setSelectedGroup(null);
          setSelectedPerson(null);
        }}
      />

      {/* Marcadores de Grupos (círculos: color = estado de reporte, tamaño = miembros) */}
      {showGroups &&
        visibleGroups.map(group => {
          const lat = Number(group.latitude);
          const lng = Number(group.longitude);
          if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) return null;
          const status = getActivityStatus(group.last_report_date);
          const isSelected = selectedGroup?.id === group.id;
          const isPulsing = pulsingGroupIds.has(group.id);
          return (
            <Marker
              key={`group-${group.id}`}
              position={[lat, lng]}
              icon={createGroupIcon(
                ACTIVITY_COLORS[status],
                groupMarkerSize(group.active_members || group.member_count || 0),
                isSelected,
                isPulsing
              )}
              zIndexOffset={isSelected ? 1000 : 0}
              eventHandlers={{
                click: () => {
                  setSelectedPerson(null);
                  setSelectedGroup(group);
                },
              }}
            />
          );
        })}

      {/* Marcadores de Personas */}
      {showPeople &&
        visiblePeople.map(person => (
          <Marker
            key={`person-${person.id}`}
            position={[person.latitude, person.longitude]}
            icon={createPersonIcon(15)}
            eventHandlers={{
              click: () => {
                setSelectedGroup(null);
                setSelectedPerson(person);
              },
            }}
          />
        ))}

      {/* Popup de Grupo */}
      {selectedGroup && selectedGroup.latitude && selectedGroup.longitude && (
        <Popup
          position={[Number(selectedGroup.latitude), Number(selectedGroup.longitude)]}
          closeOnClick={false}
          autoClose={false}
          maxWidth={240}
        >
          {(() => {
            const status = getActivityStatus(selectedGroup.last_report_date);
            const reportDate = parseBackendTimestamp(selectedGroup.last_report_date);
            return (
              <div className="w-[220px] bg-background rounded-2xl shadow-2xl border border-border overflow-hidden">
                <div className="flex items-center gap-2 px-3.5 py-3 border-b border-border/50">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: ACTIVITY_COLORS[status] }}
                  />
                  <p className="font-bold text-xs tracking-tight truncate">
                    {selectedGroup.group_name}
                  </p>
                </div>
                <div className="px-3.5 py-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                      <UserIcon className="w-3 h-3" /> Líder
                    </span>
                    <span className="font-semibold text-foreground truncate max-w-[130px]">
                      {selectedGroup.leader_name || 'Sin asignar'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                      <Users className="w-3 h-3" /> Miembros
                    </span>
                    <span className="font-semibold text-foreground">
                      {selectedGroup.active_members || 0}/{selectedGroup.member_count || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground font-medium">Último reporte</span>
                    <span className="font-semibold text-foreground">
                      {formatRelativeTime(reportDate)}
                    </span>
                  </div>
                  <Badge
                    className="mt-1 w-fit text-[9.5px] font-bold tracking-wide border-0"
                    style={{
                      backgroundColor: `${ACTIVITY_COLORS[status]}1f`,
                      color: ACTIVITY_COLORS[status],
                    }}
                  >
                    {ACTIVITY_LABELS[status]}
                  </Badge>
                </div>
              </div>
            );
          })()}
        </Popup>
      )}

      {/* Popup de Persona */}
      {selectedPerson && (
        <Popup
          position={[selectedPerson.latitude, selectedPerson.longitude]}
          closeOnClick={false}
          autoClose={false}
          maxWidth={260}
        >
          <div className="p-3 min-w-[180px] bg-background rounded-xl shadow-2xl border border-border">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/50">
              <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="7" r="4" fill="#6366f1" stroke="#4f46e5" strokeWidth="1.5" />
                  <path
                    d="M5.5 21C5.5 17.41 8.41 14.5 12 14.5C15.59 14.5 18.5 17.41 18.5 21"
                    fill="#6366f1"
                    fillOpacity="0.6"
                    stroke="#4f46e5"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <p className="font-bold text-sm tracking-tight truncate">
                {selectedPerson.first_name} {selectedPerson.last_name}
              </p>
            </div>
            <div className="space-y-1.5">
              {selectedPerson.email && (
                <p className="text-xs text-muted-foreground truncate">{selectedPerson.email}</p>
              )}
              {selectedPerson.zone_name && (
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="w-3 h-3 text-muted-foreground" />
                  <p className="text-[10px] font-medium text-muted-foreground">
                    {selectedPerson.zone_name}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Popup>
      )}
    </>
  );

  // ── Lista de zonas (compartida: Drawer de mobile / chips de escritorio) ──
  const zoneListBody = (
    <div className="space-y-3">
      {/* Botón "Todas las zonas" */}
      <button
        type="button"
        onClick={() => handleSelectZone(null)}
        className={cn(
          'w-full rounded-2xl border p-4 text-left transition-all duration-300 relative overflow-hidden group/all',
          !internalSelectedZoneId
            ? 'bg-blue-600 text-white border-blue-500 shadow-lg'
            : 'bg-card border-border hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
        )}
      >
        {!internalSelectedZoneId && (
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full blur-2xl" />
        )}
        <div className="flex items-center justify-between relative z-10">
          <div>
            <p className="font-bold text-sm tracking-tight">Todas las zonas</p>
            <p
              className={cn(
                'text-xs mt-0.5 font-medium',
                !internalSelectedZoneId ? 'text-blue-100' : 'text-muted-foreground'
              )}
            >
              {totalGroups} grupos totales
            </p>
          </div>
          <div
            className={cn(
              'p-2 rounded-xl transition-colors',
              !internalSelectedZoneId ? 'bg-white/20' : 'bg-muted'
            )}
          >
            <Search className="w-4 h-4" />
          </div>
        </div>
      </button>

      {loading && (
        <div className="space-y-2 p-4">
          <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
          <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
        </div>
      )}

      {/* Lista de zonas */}
      {zoneData.map(item => {
        const isSelected = item.zone.id === internalSelectedZoneId;
        return (
          <div
            key={item.zone.id}
            className={cn(
              'rounded-2xl border transition-all duration-300 group/item overflow-hidden',
              isSelected
                ? 'bg-blue-500/5 border-blue-200 dark:border-blue-900 shadow-md ring-1 ring-blue-500/20'
                : 'border-border/50 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-muted/30 hover:shadow-sm'
            )}
          >
            <button
              type="button"
              onClick={() => handleSelectZone(item)}
              className="w-full text-left p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-sm tracking-tight group-hover/item:text-blue-600 transition-colors">
                    {item.zone.name}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {item.groups.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {item.zone.total_members || 0}
                      </span>
                    </div>
                  </div>
                </div>
                <div
                  className="h-4 w-4 rounded-full border-2 border-white dark:border-gray-800 shadow-sm flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: item.zone.color }}
                />
              </div>
            </button>

            {/* Grupos expandidos cuando la zona está seleccionada */}
            {isSelected && item.groups.length > 0 && (
              <div className="px-3 pb-3 space-y-2">
                <div className="border-t border-blue-200/50 dark:border-blue-800/50 pt-3 flex items-center gap-2 mb-1 px-1">
                  <div className="h-1 w-1 rounded-full bg-blue-500" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600/70">
                    Células en zona
                  </span>
                </div>
                {item.groups.map(group => (
                  <button
                    type="button"
                    key={group.id}
                    className="w-full text-left rounded-xl border border-blue-200/30 dark:border-blue-800/30 p-2.5 hover:bg-blue-500/10 hover:border-blue-500/30 transition-all group/cell"
                    onClick={() => {
                      if (group.latitude && group.longitude) {
                        setSelectedGroup(group);
                        flyToGroup(Number(group.latitude), Number(group.longitude));
                        if (isMobileApp) setMobileListOpen(false);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            ACTIVITY_COLORS[getActivityStatus(group.last_report_date)],
                        }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate group-hover/cell:text-blue-600 transition-colors">
                          {group.group_name}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate font-medium">
                          {group.leader_name || 'Sin líder'}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ── Layout mobile: mapa a pantalla completa + toggles flotantes + hoja inferior ──
  // (rediseño "mapa en vivo" aplica a escritorio; mobile queda como hoy, entrega aparte)
  if (isMobileApp) {
    return (
      <div className="relative w-full h-[calc(100dvh-172px)] rounded-2xl overflow-hidden border border-border">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          className="w-full h-full"
          zoomControl={false}
          ref={map => {
            mapRef.current = map;
          }}
        >
          {mapLayers}
        </MapContainer>

        {/* Toggles flotantes, interactivos (reemplazan la leyenda estática) */}
        <div className="absolute top-3 left-3 right-3 z-[1000] flex gap-2">
          <button
            type="button"
            onClick={() => setShowGroups(v => !v)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur-md border transition-colors',
              showGroups
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-background/90 text-muted-foreground border-border/50'
            )}
          >
            <MapPin className="w-3.5 h-3.5" />
            Grupos
          </button>
          <button
            type="button"
            onClick={() => setShowPeople(v => !v)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur-md border transition-colors',
              showPeople
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-background/90 text-muted-foreground border-border/50'
            )}
          >
            <Users className="w-3.5 h-3.5" />
            Personas
          </button>
        </div>

        {/* Botón flotante: abre la hoja inferior con la lista/filtro de zonas */}
        <button
          type="button"
          onClick={() => setMobileListOpen(true)}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 rounded-full bg-background/95 backdrop-blur-md border border-border shadow-xl px-4 py-2.5 text-xs font-bold"
        >
          <Layers className="w-4 h-4 text-blue-500" />
          {selectedZone ? selectedZone.zone.name : `Zonas · ${totalGroups} grupos`}
        </button>

        <Drawer open={mobileListOpen} onOpenChange={setMobileListOpen}>
          <DrawerContent className="max-h-[75vh]">
            <DrawerHeader>
              <DrawerTitle>Zonas</DrawerTitle>
              <DrawerDescription>Filtrá el mapa por zona o entrá a un grupo</DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-4">{zoneListBody}</div>
          </DrawerContent>
        </Drawer>
      </div>
    );
  }

  // ── Layout de escritorio: "mapa en tiempo real" — un solo Card a ancho completo ──
  return (
    <Card className="jetro-live-map overflow-hidden border-border bg-card shadow-xl rounded-2xl">
      {/* Header: título + controles */}
      <div className="flex items-center justify-between gap-3 flex-wrap px-4 sm:px-5 pt-4 pb-3">
        {title ? (
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">{title}</h2>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-2">
          {/* Segmented Grupos / Personas — multi-toggle, no exclusivo */}
          <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setShowGroups(v => !v)}
              className={cn(
                'rounded-full px-3 py-1 text-[11px] font-bold transition-colors',
                showGroups
                  ? 'bg-blue-600 text-white'
                  : 'text-muted-foreground hover:bg-blue-600/[.06]'
              )}
            >
              Grupos
            </button>
            <button
              type="button"
              onClick={() => setShowPeople(v => !v)}
              className={cn(
                'rounded-full px-3 py-1 text-[11px] font-bold transition-colors',
                showPeople
                  ? 'bg-blue-600 text-white'
                  : 'text-muted-foreground hover:bg-blue-600/[.06]'
              )}
            >
              Personas
            </button>
          </div>

          {/* Pill EN VIVO */}
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
            <span
              className="w-2 h-2 rounded-full bg-green-500"
              style={{ animation: 'jetro-live-dot 1.4s ease-in-out infinite' }}
            />
            <span className="text-[11px] font-bold text-green-700 dark:text-green-400">
              EN VIVO
            </span>
            <span className="w-px h-3 bg-border" />
            <span className="text-xs font-bold text-foreground">{liveActiveCount}</span>
            <span className="text-[11px] font-medium text-muted-foreground">activos</span>
          </div>
        </div>
      </div>

      {/* Mapa */}
      <CardContent className="p-0 relative">
        <div className={cn('w-full relative', heightClassName)}>
          {loading && zoneData.length === 0 && (
            <Skeleton className="absolute inset-0 z-[900] rounded-none" />
          )}

          <MapContainer
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            className="w-full h-full relative z-[500]"
            zoomControl={false}
            ref={map => {
              mapRef.current = map;
            }}
          >
            {mapLayers}
          </MapContainer>

          {/* Overlay de radar: decorativo, "sistema escuchando" — no representa datos puntuales.
              Va por ENCIMA del mapa (z-[600]) con pointer-events-none: el barrido cónico
              semitransparente tiñe las tiles (mix-blend multiply en claro) sin bloquear los
              clicks de los marcadores. La animación se apaga sola vía prefers-reduced-motion. */}
          <div
            className="pointer-events-none absolute inset-0 z-[600] flex items-center justify-center overflow-hidden"
            aria-hidden="true"
          >
            <div className="relative w-[620px] h-[620px] max-w-none">
              <div className="absolute inset-[140px] rounded-full border border-dashed border-green-500/20 dark:border-green-400/20" />
              <div className="absolute inset-0 rounded-full border border-dashed border-green-500/30 dark:border-green-400/25" />
              <div className="jetro-radar-sweep absolute inset-0 rounded-full" />
            </div>
          </div>

          {/* Chip de resumen (overlay top-left) */}
          <div className="absolute top-4 left-4 z-[1000] rounded-xl border border-black/5 dark:border-white/10 bg-white/[.93] dark:bg-white/[.07] backdrop-blur-md px-3.5 py-2.5 shadow-sm dark:shadow-none">
            <p className="text-[11px] font-bold text-foreground">
              {totalGroups} grupos · {totalMembers} miembros
            </p>
            <p className="text-[10px] font-medium text-muted-foreground">
              {zoneData.length} zona{zoneData.length !== 1 ? 's' : ''} · radar activo
            </p>
          </div>
        </div>
      </CardContent>

      {/* Línea de tiempo (24h reales) */}
      <div className="px-4 sm:px-5 pt-3.5 pb-1.5 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-foreground">Actividad · últimas 24 h</span>
          <span className="text-[10px] font-medium text-muted-foreground hidden sm:inline">
            reportes reales enviados por hora
          </span>
        </div>
        <div className="flex items-end gap-[3px] h-[46px] mt-4 relative">
          {activityBuckets.map((count, i) => {
            const max = Math.max(1, ...activityBuckets);
            const heightPct = Math.max(6, (count / max) * 100);
            const isRecent = i >= 20; // últimas 4 horas
            const isNow = i === 23;
            return (
              <div key={i} className="flex-1 relative h-full flex items-end">
                {isNow && (
                  <>
                    <div className="absolute -top-1.5 bottom-0 right-0 w-[2px] bg-foreground dark:bg-green-400" />
                    <span className="absolute -top-4 right-0 translate-x-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-bold bg-foreground text-background dark:bg-green-400 dark:text-green-950">
                      AHORA
                    </span>
                  </>
                )}
                <div
                  className={cn(
                    'w-full rounded-sm transition-[height] duration-500',
                    isRecent ? 'bg-blue-500 dark:bg-green-400' : 'bg-slate-300 dark:bg-slate-500/35'
                  )}
                  style={{ height: `${heightPct}%` }}
                  title={`${count} reporte${count !== 1 ? 's' : ''}`}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-1.5">
          {['00:00', '06:00', '12:00', '18:00', '24:00'].map(label => (
            <span
              key={label}
              className="font-mono text-[9.5px] font-medium text-muted-foreground/70"
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Leyenda inferior: chips de zona + escalas — scrollea horizontal si no entra */}
      <div className="px-4 sm:px-5 pt-3 pb-4 flex items-center gap-3.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => handleSelectZone(null)}
          className={cn(
            'shrink-0 flex items-center gap-2 rounded-[10px] border px-3 py-1.5 transition-colors',
            !internalSelectedZoneId
              ? 'border-blue-500 bg-blue-500/[.08]'
              : 'border-border bg-muted/40 hover:bg-muted'
          )}
        >
          <span className="text-[10.5px] font-bold text-foreground">Todas las zonas</span>
        </button>
        {loading && zoneData.length === 0
          ? [1, 2, 3].map(i => (
              <div
                key={i}
                className="shrink-0 h-[30px] w-28 rounded-[10px] bg-muted animate-pulse"
              />
            ))
          : zoneData.map(item => {
              const isSelected = item.zone.id === internalSelectedZoneId;
              return (
                <button
                  key={item.zone.id}
                  type="button"
                  onClick={() => handleSelectZone(item)}
                  className={cn(
                    'shrink-0 flex items-center gap-2 rounded-[10px] border px-3 py-1.5 transition-colors',
                    isSelected ? 'bg-muted/40' : 'border-border bg-muted/40 hover:bg-muted'
                  )}
                  style={
                    isSelected
                      ? { borderColor: item.zone.color, background: `${item.zone.color}14` }
                      : undefined
                  }
                >
                  <span
                    className="w-[9px] h-[9px] rounded-full shrink-0"
                    style={{ backgroundColor: item.zone.color }}
                  />
                  <span className="flex flex-col items-start leading-tight">
                    <span className="text-[10.5px] font-bold text-foreground">
                      {item.zone.name}
                    </span>
                    <span className="text-[9.5px] font-medium text-muted-foreground">
                      {item.groups.length} grupos · {item.zone.total_members || 0} miembros
                    </span>
                  </span>
                </button>
              );
            })}

        <span className="shrink-0 w-px h-[30px] bg-border" />

        <div className="shrink-0 flex items-center gap-3">
          <span className="text-[9.5px] font-bold tracking-wide text-muted-foreground">
            REPORTES
          </span>
          {(['recent', 'aging', 'silent'] as ActivityStatus[]).map(status => (
            <div key={status} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: ACTIVITY_COLORS[status] }}
              />
              <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                {status === 'recent' && 'esta semana'}
                {status === 'aging' && 'este mes'}
                {status === 'silent' && 'sin reportar'}
              </span>
            </div>
          ))}
        </div>

        <span className="shrink-0 w-px h-[30px] bg-border" />

        <div className="shrink-0 flex items-center gap-2.5">
          <span className="text-[9.5px] font-bold tracking-wide text-muted-foreground">TAMAÑO</span>
          {[10, 16, 24].map(size => (
            <span
              key={size}
              className="rounded-full bg-slate-300 dark:bg-slate-500"
              style={{ width: size, height: size }}
            />
          ))}
          <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
            = miembros del grupo
          </span>
        </div>
      </div>
    </Card>
  );
}
