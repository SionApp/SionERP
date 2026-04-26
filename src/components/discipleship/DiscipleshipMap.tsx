import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ZonesService } from '@/services/zones.service';
import { ApiService } from '@/services/api.service';
import type {
  DiscipleshipGroup,
  GeoJSONMultiPolygon,
  GeoJSONPolygon,
  ZoneMapData,
  ZoneMapGroup,
} from '@/types/discipleship.types';
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
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px]">
      {/* ── Mapa ── */}
      <Card className="overflow-hidden border-border bg-card">
        <CardContent className="p-0">
          <div className={cn('w-full', heightClassName)}>
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

              {/* Leyenda */}
              <div className="absolute top-2 left-2 bg-background/95 backdrop-blur-sm rounded-lg border border-border p-2 shadow-sm z-10">
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <HouseIcon color="#3b82f6" size={14} />
                    <span>Grupos</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <PersonIcon size={14} />
                    <span>Personas</span>
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
                  <div className="p-1 min-w-[180px]">
                    <p className="font-semibold text-sm">{selectedGroup.group_name}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      <strong>Líder:</strong> {selectedGroup.leader_name || 'Sin asignar'}
                    </p>
                    <p className="text-xs text-gray-600">
                      <strong>Miembros:</strong> {selectedGroup.active_members || 0}/
                      {selectedGroup.member_count || 0}
                    </p>
                    {selectedGroup.meeting_location && (
                      <p className="text-xs text-gray-600">
                        <strong>Ubicación:</strong> {selectedGroup.meeting_location}
                      </p>
                    )}
                    {selectedGroup.meeting_day && (
                      <p className="text-xs text-gray-600">
                        <strong>Reunión:</strong> {selectedGroup.meeting_day}
                      </p>
                    )}
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
                  <div className="p-1 min-w-[160px]">
                    <p className="font-semibold text-sm">
                      {selectedPerson.first_name} {selectedPerson.last_name}
                    </p>
                    {selectedPerson.email && (
                      <p className="text-xs text-gray-600">{selectedPerson.email}</p>
                    )}
                    {selectedPerson.zone_name && (
                      <p className="text-xs text-gray-600">
                        <strong>Zona:</strong> {selectedPerson.zone_name}
                      </p>
                    )}
                  </div>
                </Popup>
              )}
            </Map>
          </div>
        </CardContent>
      </Card>

      {/* ── Sidebar ── */}
      <Card className="border-border bg-card">
        <CardHeader className="space-y-2 pb-3">
          <CardTitle className="text-lg">Zonas y grupos</CardTitle>
          {internalSelectedZoneId ? (
            <Badge variant="secondary">
              {selectedZone?.zone.name} · {selectedZone?.groups.length || 0} grupos
            </Badge>
          ) : (
            <Badge variant="outline">Mostrando todas las zonas</Badge>
          )}

          {/* Toggles de capas */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <Label htmlFor="show-groups" className="text-sm flex items-center gap-2">
                <HouseIcon color="#3b82f6" size={16} />
                Grupos
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{visibleGroups.length}</span>
                <Switch id="show-groups" checked={showGroups} onCheckedChange={setShowGroups} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="show-people" className="text-sm flex items-center gap-2">
                <PersonIcon size={16} />
                Personas
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{visiblePeople.length}</span>
                <Switch id="show-people" checked={showPeople} onCheckedChange={setShowPeople} />
              </div>
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
                  'w-full rounded-md border border-border p-3 text-left transition-colors',
                  !internalSelectedZoneId && 'bg-accent text-accent-foreground'
                )}
              >
                <p className="font-medium text-sm">Todas las zonas</p>
                <p className="text-xs text-muted-foreground">
                  {zoneData.reduce((acc, item) => acc + item.groups.length, 0)} grupos
                </p>
              </button>

              {loading && <p className="text-sm text-muted-foreground">Cargando mapa...</p>}

              {/* Lista de zonas */}
              {zoneData.map(item => {
                const isSelected = item.zone.id === internalSelectedZoneId;
                return (
                  <div
                    key={item.zone.id}
                    className={cn(
                      'rounded-md border border-border p-3 transition-colors',
                      isSelected && 'bg-accent text-accent-foreground'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectZone(item)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-sm">{item.zone.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.groups.length} grupos · {item.zone.total_members || 0} miembros
                          </p>
                        </div>
                        <span
                          className="mt-1 h-3 w-3 rounded-full border border-border flex-shrink-0"
                          style={{ backgroundColor: item.zone.color }}
                        />
                      </div>
                    </button>

                    {/* Grupos expandidos cuando la zona está seleccionada */}
                    {isSelected && item.groups.length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-border pt-3">
                        {item.groups.map(group => (
                          <button
                            type="button"
                            key={group.id}
                            className="w-full text-left rounded-md border border-border/60 p-2 hover:bg-accent/50 transition-colors"
                            onClick={() => {
                              if (group.latitude && group.longitude) {
                                setSelectedGroup(group);
                                mapRef.current?.flyTo({
                                  center: [Number(group.longitude), Number(group.latitude)],
                                  zoom: 16,
                                  duration: 800,
                                });
                              }
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <HouseIcon color={item.zone.color} size={16} />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{group.group_name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {group.leader_name || 'Sin líder'} ·{' '}
                                  {group.meeting_location || 'Sin ubicación'}
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
