import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { ApiService } from '@/services/api.service';
import { ZonesService } from '@/services/zones.service';
import type {
  DiscipleshipGroup,
  GeoJSONMultiPolygon,
  GeoJSONPolygon,
  ZoneMapData,
  ZoneMapGroup,
} from '@/types/discipleship.types';
import { Calendar, Layers, MapPin, Search, User as UserIcon, Users } from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import Map, {
  Layer,
  Marker,
  NavigationControl,
  Popup,
  Source,
  type MapRef,
} from 'react-map-gl/maplibre';

// ── Tipos internos ──────────────────────────────────────────

type LayerProps = React.ComponentProps<typeof Layer>;

type FeatureProperties = {
  zoneId: string;
  zoneName: string;
  color: string;
  totalGroups: number;
};

type ZoneFeature = GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon, FeatureProperties>;
type ZoneFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  FeatureProperties
>;

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
}

// ── Constantes ──────────────────────────────────────────────

const DEFAULT_CENTER = { latitude: 11.4045, longitude: -69.6734 };
const DEFAULT_ZOOM = 13;

const fillLayer: LayerProps = {
  id: 'zones-fill',
  type: 'fill',
  paint: {
    'fill-color': ['get', 'color'],
    'fill-opacity': 0.22,
  },
};

const borderLayer: LayerProps = {
  id: 'zones-border',
  type: 'line',
  paint: {
    'line-color': ['get', 'color'],
    'line-width': 2,
  },
};

const selectedBorderLayer: LayerProps = {
  id: 'zones-selected-border',
  type: 'line',
  filter: ['==', ['get', 'zoneId'], ''],
  paint: {
    'line-color': ['get', 'color'],
    'line-width': 4,
  },
};

// ── SVG Markers ─────────────────────────────────────────────

function HouseIcon({ color = '#3b82f6', size = 28 }: { color?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 10.5L12 3L21 10.5V20C21 20.55 20.55 21 20 21H4C3.45 21 3 20.55 3 20V10.5Z"
        fill={color}
        fillOpacity="0.85"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 21V13H15V21"
        fill="white"
        fillOpacity="0.9"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PersonIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
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
  );
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

function getBoundsFromCoordinates(
  coords: number[][],
  bounds: [[number, number], [number, number]]
) {
  coords.forEach(([lng, lat]) => {
    bounds[0][0] = Math.min(bounds[0][0], lng);
    bounds[0][1] = Math.min(bounds[0][1], lat);
    bounds[1][0] = Math.max(bounds[1][0], lng);
    bounds[1][1] = Math.max(bounds[1][1], lat);
  });
}

function getFeatureBounds(feature: ZoneFeature): [[number, number], [number, number]] | null {
  const bounds: [[number, number], [number, number]] = [
    [Infinity, Infinity],
    [-Infinity, -Infinity],
  ];
  if (feature.geometry.type === 'Polygon') {
    feature.geometry.coordinates.forEach(ring => getBoundsFromCoordinates(ring, bounds));
  }
  if (feature.geometry.type === 'MultiPolygon') {
    feature.geometry.coordinates.forEach(polygon =>
      polygon.forEach(ring => getBoundsFromCoordinates(ring, bounds))
    );
  }
  if (!isFinite(bounds[0][0])) return null;
  return bounds;
}

// ── Componente principal ────────────────────────────────────

export default function DiscipleshipMap({
  selectedZoneId,
  onZoneSelect,
  heightClassName = 'h-[620px]',
}: DiscipleshipMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [zoneData, setZoneData] = useState<ZoneMapData[]>([]);
  const [mapUsers, setMapUsers] = useState<MapUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [internalSelectedZoneId, setInternalSelectedZoneId] = useState<string | null>(
    selectedZoneId ?? null
  );

  // Toggles
  const [showGroups, setShowGroups] = useState(true);
  const [showPeople, setShowPeople] = useState(false);

  // Popups
  const [selectedGroup, setSelectedGroup] = useState<ZoneMapGroup | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<MapUser | null>(null);

  useEffect(() => {
    setInternalSelectedZoneId(selectedZoneId ?? null);
  }, [selectedZoneId]);

  // Cargar zonas + grupos
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await ZonesService.getMapData({ is_active: true });
        setZoneData(response.zones || []);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  // Cargar usuarios con coordenadas
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await ApiService.get<{ users: MapUser[] } | MapUser[]>('/users');
        const rawUsers = Array.isArray(response)
          ? response
          : (response as { users?: MapUser[] })?.users || [];
        const usersWithCoords: MapUser[] = (rawUsers as MapUser[])
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

  const zoneFeatures = useMemo<ZoneFeatureCollection>(() => {
    const features = zoneData.map(normalizeZoneFeature).filter((f): f is ZoneFeature => f !== null);
    return { type: 'FeatureCollection', features };
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
        isFinite(lng)
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

  // Obtener color de zona para un grupo
  const getGroupZoneColor = (group: ZoneMapGroup): string => {
    for (const zd of zoneData) {
      if (zd.groups.some(g => g.id === group.id)) {
        return zd.zone.color || '#3b82f6';
      }
    }
    return '#3b82f6';
  };

  const fitToZone = (zoneId: string) => {
    const feature = zoneFeatures.features.find(item => item.properties.zoneId === zoneId);
    if (!feature || !mapRef.current) return;
    const bounds = getFeatureBounds(feature);
    if (!bounds) return;
    mapRef.current.fitBounds(bounds, { padding: 40, duration: 800 });
  };

  const handleSelectZone = (zone: ZoneMapData | null) => {
    const nextZoneId = zone?.zone.id ?? null;
    setInternalSelectedZoneId(nextZoneId);
    setSelectedGroup(null);
    setSelectedPerson(null);
    onZoneSelect?.(nextZoneId, zone?.groups ?? []);
    if (nextZoneId) fitToZone(nextZoneId);
  };

  const selectedBorder = useMemo<LayerProps>(() => {
    return {
      ...selectedBorderLayer,
      filter: ['==', ['get', 'zoneId'], internalSelectedZoneId ?? ''],
    };
  }, [internalSelectedZoneId]);

  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* ── Mapa ── */}
      <Card className="overflow-hidden border-border bg-card shadow-xl rounded-2xl relative group border-none lg:border-solid">
        <CardContent className="p-0 relative">
          <div className={cn('w-full transition-all duration-500', heightClassName)}>
            <Map
              ref={mapRef}
              initialViewState={{
                longitude: DEFAULT_CENTER.longitude,
                latitude: DEFAULT_CENTER.latitude,
                zoom: DEFAULT_ZOOM,
              }}
              mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
            >
              <NavigationControl position="top-right" />

              {/* Floating Toolbar Top Left */}
              <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                <div className="bg-background/80 backdrop-blur-md rounded-xl border border-border/50 p-2.5 shadow-lg flex items-center gap-4 transition-all hover:bg-background/90">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-blue-500/10 rounded-lg">
                      <HouseIcon color="#3b82f6" size={16} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Grupos
                    </span>
                  </div>
                  <div className="h-4 w-[1px] bg-border" />
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-indigo-500/10 rounded-lg">
                      <PersonIcon size={16} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Personas
                    </span>
                  </div>
                </div>
              </div>

              {/* Zonas poligonales */}
              <Source id="zones-source" type="geojson" data={zoneFeatures}>
                <Layer {...fillLayer} />
                <Layer {...borderLayer} />
                <Layer {...selectedBorder} />
              </Source>

              {/* Marcadores de Grupos (casitas) */}
              {showGroups &&
                visibleGroups.map(group => {
                  const lat = Number(group.latitude);
                  const lng = Number(group.longitude);
                  if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) return null;
                  const zoneColor = getGroupZoneColor(group);
                  return (
                    <Marker
                      key={`group-${group.id}`}
                      longitude={lng}
                      latitude={lat}
                      anchor="bottom"
                      onClick={e => {
                        e.originalEvent.stopPropagation();
                        setSelectedPerson(null);
                        setSelectedGroup(group);
                      }}
                    >
                      <button
                        type="button"
                        title={group.group_name}
                        className="cursor-pointer hover:scale-110 transition-transform drop-shadow-md"
                      >
                        <HouseIcon color={zoneColor} size={28} />
                      </button>
                    </Marker>
                  );
                })}

              {/* Marcadores de Personas */}
              {showPeople &&
                visiblePeople.map(person => (
                  <Marker
                    key={`person-${person.id}`}
                    longitude={person.longitude}
                    latitude={person.latitude}
                    anchor="bottom"
                    onClick={e => {
                      e.originalEvent.stopPropagation();
                      setSelectedGroup(null);
                      setSelectedPerson(person);
                    }}
                  >
                    <button
                      type="button"
                      title={`${person.first_name} ${person.last_name}`}
                      className="cursor-pointer hover:scale-110 transition-transform drop-shadow-sm"
                    >
                      <PersonIcon size={18} />
                    </button>
                  </Marker>
                ))}

              {/* Popup de Grupo */}
              {selectedGroup && selectedGroup.latitude && selectedGroup.longitude && (
                <Popup
                  longitude={Number(selectedGroup.longitude)}
                  latitude={Number(selectedGroup.latitude)}
                  anchor="top"
                  onClose={() => setSelectedGroup(null)}
                  closeOnClick={false}
                  className="z-50"
                >
                  <div className="p-3 min-w-[220px] bg-background rounded-xl shadow-2xl border border-border overflow-hidden">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/50">
                      <div className="p-1.5 bg-blue-500/10 rounded-lg">
                        <HouseIcon color="#3b82f6" size={18} />
                      </div>
                      <p className="font-bold text-sm tracking-tight truncate">
                        {selectedGroup.group_name}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">Líder:</span>{' '}
                          {selectedGroup.leader_name || 'Sin asignar'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">Miembros:</span>{' '}
                          {selectedGroup.active_members || 0}/{selectedGroup.member_count || 0}
                        </p>
                      </div>
                      {selectedGroup.meeting_location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            <span className="font-semibold text-foreground">Ubicación:</span>{' '}
                            {selectedGroup.meeting_location}
                          </p>
                        </div>
                      )}
                      {selectedGroup.meeting_day && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">Reunión:</span>{' '}
                            {selectedGroup.meeting_day}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              )}

              {/* Popup de Persona */}
              {selectedPerson && (
                <Popup
                  longitude={selectedPerson.longitude}
                  latitude={selectedPerson.latitude}
                  anchor="top"
                  onClose={() => setSelectedPerson(null)}
                  closeOnClick={false}
                  className="z-50"
                >
                  <div className="p-3 min-w-[180px] bg-background rounded-xl shadow-2xl border border-border">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/50">
                      <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                        <PersonIcon size={16} />
                      </div>
                      <p className="font-bold text-sm tracking-tight truncate">
                        {selectedPerson.first_name} {selectedPerson.last_name}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      {selectedPerson.email && (
                        <p className="text-xs text-muted-foreground truncate">
                          {selectedPerson.email}
                        </p>
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
            </Map>
          </div>
        </CardContent>
      </Card>

      {/* ── Sidebar ── */}
      <Card className="border-border bg-card shadow-xl rounded-2xl flex flex-col overflow-hidden border-none lg:border-solid">
        <CardHeader className="space-y-4 pb-4 bg-muted/30 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-500" />
              <CardTitle className="text-xl font-bold tracking-tight">Capas</CardTitle>
            </div>
            {internalSelectedZoneId ? (
              <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800 hover:bg-blue-500/20 transition-colors">
                {selectedZone?.zone.name}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Global
              </Badge>
            )}
          </div>

          {/* Toggles de capas - Rediseñados */}
          <div className="grid grid-cols-2 gap-2">
            <div
              className={cn(
                'flex items-center justify-between p-2 rounded-xl border transition-all',
                showGroups
                  ? 'bg-blue-500/5 border-blue-200 dark:border-blue-800 shadow-sm'
                  : 'bg-muted/50 border-transparent'
              )}
            >
              <Label htmlFor="show-groups" className="cursor-pointer flex items-center gap-2">
                <HouseIcon color={showGroups ? '#3b82f6' : '#94a3b8'} size={14} />
                <span className="text-xs font-medium">Grupos</span>
              </Label>
              <Switch
                id="show-groups"
                checked={showGroups}
                onCheckedChange={setShowGroups}
                className="scale-75"
              />
            </div>
            <div
              className={cn(
                'flex items-center justify-between p-2 rounded-xl border transition-all',
                showPeople
                  ? 'bg-indigo-500/5 border-indigo-200 dark:border-indigo-800 shadow-sm'
                  : 'bg-muted/50 border-transparent'
              )}
            >
              <Label htmlFor="show-people" className="cursor-pointer flex items-center gap-2">
                <PersonIcon size={14} />
                <span className="text-xs font-medium">Personas</span>
              </Label>
              <Switch
                id="show-people"
                checked={showPeople}
                onCheckedChange={setShowPeople}
                className="scale-75"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <ScrollArea className="h-[460px] pr-4">
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
                      {zoneData.reduce((acc, item) => acc + item.groups.length, 0)} grupos totales
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
                              <HouseIcon color={isSelected ? '#3b82f6' : '#94a3b8'} size={12} />
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
                                mapRef.current?.flyTo({
                                  center: [Number(group.longitude), Number(group.latitude)],
                                  zoom: 17,
                                  duration: 1000,
                                });
                              }
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-1.5 bg-background rounded-lg shadow-sm border border-border/50 group-hover/cell:border-blue-500/30 transition-colors">
                                <HouseIcon color={item.zone.color} size={14} />
                              </div>
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
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
