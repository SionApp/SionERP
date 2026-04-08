import { useEffect, useMemo, useRef, useState } from 'react';
import Map, { Layer, Marker, NavigationControl, Source, type MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ZonesService } from '@/services/zones.service';
import type {
  DiscipleshipGroup,
  GeoJSONMultiPolygon,
  GeoJSONPolygon,
  Zone,
  ZoneMapData,
  ZoneMapGroup,
} from '@/types/discipleship.types';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useZones } from '@/hooks/useZones';
import { DiscipleshipService } from '@/services/discipleship.service';
import { Calendar, Layers, Loader2, Map as MapIcon, MapPin, Users } from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';
import React, { useCallback } from 'react';
import MapLibreMap, { MapLayerMouseEvent, Popup } from 'react-map-gl/maplibre';
import { toast } from 'sonner';

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

interface DiscipleshipMapProps {
  selectedZoneId?: string | null;
  onZoneSelect?: (zoneId: string | null, groups: DiscipleshipGroup[]) => void;
  heightClassName?: string;
}

const DEFAULT_CENTER = { latitude: 11.4045, longitude: -69.6734 };
const DEFAULT_ZOOM = 13;

const fillLayer: Layer = {
  id: 'zones-fill',
  type: 'fill',
  paint: {
    'fill-color': ['get', 'color'],
    'fill-opacity': 0.22,
  },
};

const borderLayer: Layer = {
  id: 'zones-border',
  type: 'line',
  paint: {
    'line-color': ['get', 'color'],
    'line-width': 2,
  },
};

const selectedBorderLayer: Layer = {
  id: 'zones-selected-border',
  type: 'line',
  filter: ['==', ['get', 'zoneId'], ''],
  paint: {
    'line-color': ['get', 'color'],
    'line-width': 4,
  },
};

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

  if (isPolygon(boundaries)) {
    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: boundaries.coordinates,
      },
      properties: {
        zoneId: zone.id,
        zoneName: zone.name,
        color: zone.color || '#3b82f6',
        totalGroups: zoneData.groups.length,
      },
    };
  }
  const DEFAULT_CENTER = { latitude: 11.4045, longitude: -69.6734 };
  const DEFAULT_ZOOM = 13;

  const DiscipleshipMap: React.FC = () => {
    const [selectedZoneId, setSelectedZoneId] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [groups, setGroups] = useState<DiscipleshipGroup[]>([]);
    const [mapError, setMapError] = useState<string | null>(null);
    const [popupInfo, setPopupInfo] = useState<{
      group: DiscipleshipGroup;
      lngLat: [number, number];
    } | null>(null);
    const [selectedZonePopup, setSelectedZonePopup] = useState<{
      zone: Zone;
      lngLat: [number, number];
    } | null>(null);
    const mapRef = React.useRef<MapRef>(null);
    const [viewState, setViewState] = useState({
      longitude: DEFAULT_CENTER.longitude,
      latitude: DEFAULT_CENTER.latitude,
      zoom: DEFAULT_ZOOM,
    });

    const { zones: zonesData, loading: zonesLoading } = useZones({
      autoLoad: true,
      onlyActive: true,
    });

    // Cargar grupos desde el backend
    const loadGroups = useCallback(async () => {
      try {
        setLoading(true);
        const response = await DiscipleshipService.getGroups({ limit: 1000 });
        const groupsData = Array.isArray(response.data) ? response.data : [];
        setGroups(groupsData);
      } catch (error) {
        console.error('Error loading groups:', error);
        toast.error('Error al cargar grupos');
      } finally {
        setLoading(false);
      }
    }, []);

    // Cargar grupos al montar
    useEffect(() => {
      loadGroups();
    }, [loadGroups]);

    // Calcular centro inicial basado en zonas (solo una vez)
    const [centerCalculated, setCenterCalculated] = useState(false);

    useEffect(() => {
      if (zonesData && zonesData.length > 0 && !centerCalculated) {
        const zonesWithCenter = zonesData.filter(z => {
          const lat =
            typeof z.center_lat === 'number' && !isNaN(z.center_lat) && z.center_lat !== null;
          const lng =
            typeof z.center_lng === 'number' && !isNaN(z.center_lng) && z.center_lng !== null;
          return lat && lng && z.center_lat !== undefined && z.center_lng !== undefined;
        });

        if (zonesWithCenter.length > 0) {
          let sumLat = 0;
          let sumLng = 0;
          let validCount = 0;

          zonesWithCenter.forEach(z => {
            const lat = Number(z.center_lat);
            const lng = Number(z.center_lng);
            if (
              !isNaN(lat) &&
              !isNaN(lng) &&
              lat !== null &&
              lng !== null &&
              isFinite(lat) &&
              isFinite(lng)
            ) {
              sumLat += lat;
              sumLng += lng;
              validCount++;
            }
          });

          if (validCount > 0) {
            const avgLat = sumLat / validCount;
            const avgLng = sumLng / validCount;

            if (!isNaN(avgLat) && !isNaN(avgLng) && isFinite(avgLat) && isFinite(avgLng)) {
              setViewState(prev => ({
                ...prev,
                longitude: avgLng,
                latitude: avgLat,
              }));
              setCenterCalculated(true);
            }
          }
        }
      }
    }, [zonesData, centerCalculated]);

    // Filtrar grupos según filtros
    const filteredGroups = useMemo(() => {
      return groups.filter(group => {
        if (selectedZoneId !== 'all' && group.zone_id !== selectedZoneId) return false;
        if (selectedStatus !== 'all' && group.status !== selectedStatus) return false;

        // Solo grupos con coordenadas válidas
        const lat =
          typeof group.latitude === 'number' && !isNaN(group.latitude) && isFinite(group.latitude);
        const lng =
          typeof group.longitude === 'number' &&
          !isNaN(group.longitude) &&
          isFinite(group.longitude);
        return lat && lng && group.latitude != null && group.longitude != null;
      });
    }, [groups, selectedZoneId, selectedStatus]);

    // Crear FeatureCollection GeoJSON para todas las zonas (objeto limpio sin propiedades React)
    const zonesGeoJSON = useMemo(() => {
      if (!zonesData || zonesData.length === 0) {
        return {
          type: 'FeatureCollection' as const,
          features: [],
        };
      }

      const features = zonesData
        .filter(zone => zone.boundaries && zone.id)
        .map(zone => {
          const boundaries = zone.boundaries as GeoJSONPolygon;
          if (!boundaries.coordinates || boundaries.coordinates.length === 0) return null;

          // Crear objeto limpio sin propiedades React
          return {
            type: 'Feature',
            geometry: {
              type: boundaries.type,
              coordinates: boundaries.coordinates,
            },
            properties: {
              id: String(zone.id),
              name: String(zone.name),
              color: String(zone.color || '#3b82f6'),
              description: String(zone.description || ''),
            },
          };
        })
        .filter((f): f is NonNullable<typeof f> => f !== null);

      // Crear objeto limpio con JSON parse/stringify para remover cualquier propiedad React
      const cleanGeoJSON = JSON.parse(
        JSON.stringify({
          type: 'FeatureCollection',
          features,
        })
      );

      return cleanGeoJSON;
    }, [zonesData]);

    // Manejar errores del mapa
    const handleMapError = useCallback((event: { error?: Error; message?: string }) => {
      const errorMsg = event.error?.message || event.message || '';

      // Ignorar errores de propiedades React que no afectan la funcionalidad
      if (
        errorMsg.includes('data-component-content') ||
        errorMsg.includes('data-lov-id') ||
        errorMsg.includes('unknown property')
      ) {
        console.warn('Ignorando error de propiedad React:', errorMsg);
        return;
      }

      console.error('Map error:', event);
      setMapError(errorMsg || 'Error al cargar el mapa.');
      toast.error('Error al cargar el mapa.');
    }, []);

    // Manejar clicks en el mapa para detectar selección de zonas
    const handleMapClick = useCallback(
      (event: MapLayerMouseEvent) => {
        if (!mapRef.current) return;

        // No hacer nada si el click fue en un marcador (se maneja en el onClick del Marker)
        if ((event.originalEvent.target as HTMLElement)?.closest('.mapboxgl-marker')) {
          return;
        }

        const map = mapRef.current.getMap();
        const features = map.queryRenderedFeatures(event.point, {
          layers: ['zones-fill', 'zones-stroke'],
        });

        if (features.length > 0) {
          const feature = features[0];
          const zoneId = feature.properties?.id;

          if (zoneId) {
            const zone = zonesData?.find(z => z.id === zoneId);
            if (zone) {
              // Calcular centro del polígono o usar coordenadas del click
              const center =
                zone.center_lat && zone.center_lng
                  ? ([zone.center_lng, zone.center_lat] as [number, number])
                  : ([event.lngLat.lng, event.lngLat.lat] as [number, number]);

              setSelectedZonePopup({
                zone,
                lngLat: center,
              });
              // Cerrar popup de grupo si está abierto
              setPopupInfo(null);
            }
          }
        } else {
          // Click fuera de una zona, cerrar popup de zona pero no de grupos
          setSelectedZonePopup(null);
        }
      },
      [zonesData]
    );

    const stats = {
      totalGroups: filteredGroups.length,
      totalMembers: filteredGroups.reduce((sum, g) => sum + (g.active_members || 0), 0),
      multiplying: filteredGroups.filter(g => g.status === 'multiplying').length,
      activeZones: zonesData?.length || 0,
    };

    if (zonesLoading || loading) {
      return (
        <Card>
          <CardContent className="p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      );
    }

    if (mapError) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapIcon className="w-5 h-5" />
              Mapa de Células de Discipulado
            </CardTitle>
            <CardDescription>Visualiza la ubicación de todas las células por zona</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ <strong>Error al cargar el mapa:</strong> {mapError}
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
                Error al cargar el mapa. Por favor, verifica tu conexión a internet e intenta de
                nuevo.
              </p>
              <Button
                onClick={() => {
                  setMapError(null);
                  window.location.reload();
                }}
                variant="outline"
                className="mt-3"
              >
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    const zoneColorMap = new globalThis.Map(
      zonesData?.map(z => [z.id, z.color || '#6b7280']) || []
    );

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapIcon className="w-5 h-5" />
              Mapa de Células de Discipulado
            </CardTitle>
            <CardDescription>Visualiza la ubicación de todas las células por zona</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Filtrar por Zona</label>
                <Select value={selectedZoneId} onValueChange={setSelectedZoneId}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las Zonas</SelectItem>
                    {zonesData?.map(zone => (
                      <SelectItem key={zone.id} value={zone.id}>
                        {zone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Filtrar por Estado</label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Activas</SelectItem>
                    <SelectItem value="multiplying">Multiplicando</SelectItem>
                    <SelectItem value="inactive">Inactivas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Leyenda de colores */}
            {zonesData && zonesData.length > 0 && (
              <div className="flex flex-wrap gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
                {zonesData.map(zone => (
                  <div key={zone.id} className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: zone.color || '#3b82f6' }}
                    />
                    <span className="text-sm">{zone.name}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <MapLibreMap
              ref={mapRef}
              {...viewState}
              onMove={evt => setViewState(evt.viewState)}
              onClick={handleMapClick}
              style={{ width: '100%', height: 600 }}
              mapStyle={{
                version: 8,
                sources: {
                  osm: {
                    type: 'raster',
                    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                    tileSize: 256,
                    attribution: '© OpenStreetMap contributors',
                  },
                },
                layers: [
                  {
                    id: 'osm-layer',
                    type: 'raster',
                    source: 'osm',
                  },
                ],
              }}
              onError={handleMapError}
            >
              {/* Capa de polígonos de zonas - Un solo Source con FeatureCollection */}
              {zonesGeoJSON.features.length > 0 && (
                <Source
                  id="zones-source"
                  type="geojson"
                  data={JSON.parse(JSON.stringify(zonesGeoJSON))}
                >
                  <Layer
                    id="zones-fill"
                    type="fill"
                    paint={{
                      'fill-color': ['get', 'color'],
                      'fill-opacity': [
                        'case',
                        ['boolean', ['feature-state', 'hover'], false],
                        0.35,
                        0.2,
                      ],
                    }}
                  />
                  <Layer
                    id="zones-stroke"
                    type="line"
                    paint={{
                      'line-color': ['get', 'color'],
                      'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 3, 2],
                    }}
                  />
                </Source>
              )}

              {/* Marcadores de grupos */}
              {filteredGroups.map(group => {
                const lat = Number(group.latitude);
                const lng = Number(group.longitude);

                if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
                  return null;
                }

                const zoneColor = group.zone_id ? zoneColorMap.get(group.zone_id) : '#6b7280';
                const zone = zonesData?.find(z => z.id === group.zone_id);

                return (
                  <Marker
                    key={group.id}
                    longitude={lng}
                    latitude={lat}
                    anchor="center"
                    onClick={e => {
                      e.originalEvent.stopPropagation();
                      setPopupInfo({ group, lngLat: [lng, lat] });
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-full border-3 border-white cursor-pointer flex items-center justify-center text-white text-xs font-bold shadow-lg transition-transform hover:scale-110"
                      style={{
                        backgroundColor: zoneColor || '#6b7280',
                        borderWidth: group.status === 'multiplying' ? '3px' : '2px',
                        borderColor: group.status === 'multiplying' ? '#10b981' : 'white',
                        boxShadow:
                          group.status === 'multiplying'
                            ? '0 0 0 2px rgba(16, 185, 129, 0.3)'
                            : '0 2px 6px rgba(0,0,0,0.3)',
                        opacity: group.status === 'inactive' ? 0.6 : 1,
                      }}
                    >
                      {group.active_members || 0}
                    </div>
                  </Marker>
                );
              })}

              {/* Popup para información del grupo */}
              {popupInfo && (
                <Popup
                  longitude={popupInfo.lngLat[0]}
                  latitude={popupInfo.lngLat[1]}
                  anchor="bottom"
                  onClose={() => setPopupInfo(null)}
                  closeButton={true}
                  closeOnClick={false}
                >
                  <div className="p-3 min-w-[250px]">
                    <h3 className="font-bold text-lg mb-2">
                      {popupInfo.group.group_name || 'Sin nombre'}
                    </h3>
                    <div className="space-y-2 text-sm">
                      {zonesData?.find(z => z.id === popupInfo.group.zone_id) && (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor:
                                zoneColorMap.get(popupInfo.group.zone_id || '') || '#6b7280',
                            }}
                          />
                          <span>{zonesData.find(z => z.id === popupInfo.group.zone_id)?.name}</span>
                        </div>
                      )}
                      <div>
                        📍{' '}
                        {popupInfo.group.meeting_address ||
                          popupInfo.group.meeting_location ||
                          'Sin dirección'}
                      </div>
                      {popupInfo.group.meeting_day && popupInfo.group.meeting_time && (
                        <div>
                          📅 {popupInfo.group.meeting_day}s {popupInfo.group.meeting_time}
                        </div>
                      )}
                      <div>
                        👥 {popupInfo.group.active_members || 0}/{popupInfo.group.member_count || 0}{' '}
                        miembros
                      </div>
                      {popupInfo.group.leader_name && (
                        <div>👤 Líder: {popupInfo.group.leader_name}</div>
                      )}
                      <div className="mt-2">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            popupInfo.group.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : popupInfo.group.status === 'multiplying'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {popupInfo.group.status === 'active'
                            ? 'Activo'
                            : popupInfo.group.status === 'multiplying'
                              ? 'Multiplicando'
                              : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                  </div>
                </Popup>
              )}

              {/* Popup para información de zona */}
              {selectedZonePopup && (
                <Popup
                  longitude={selectedZonePopup.lngLat[0]}
                  latitude={selectedZonePopup.lngLat[1]}
                  anchor="bottom"
                  onClose={() => setSelectedZonePopup(null)}
                  closeButton={true}
                  closeOnClick={false}
                  maxWidth="400px"
                >
                  <div className="p-4 min-w-[300px] max-w-[400px]">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                        style={{
                          backgroundColor: selectedZonePopup.zone.color || '#3b82f6',
                        }}
                      />
                      <h3 className="font-bold text-lg">{selectedZonePopup.zone.name}</h3>
                    </div>

                    {selectedZonePopup.zone.description && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {selectedZonePopup.zone.description}
                      </p>
                    )}

                    {/* Estadísticas de la zona */}
                    <div className="grid grid-cols-2 gap-3 mb-3 p-3 bg-muted/50 rounded-lg">
                      <div>
                        <div className="text-xs text-muted-foreground">Grupos</div>
                        <div className="text-lg font-semibold">
                          {selectedZonePopup.zone.total_groups || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Miembros</div>
                        <div className="text-lg font-semibold">
                          {selectedZonePopup.zone.total_members || 0}
                        </div>
                      </div>
                      {selectedZonePopup.zone.supervisor_name && (
                        <div className="col-span-2">
                          <div className="text-xs text-muted-foreground">Supervisor</div>
                          <div className="text-sm font-medium">
                            {selectedZonePopup.zone.supervisor_name}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Grupos dentro de esta zona */}
                    {(() => {
                      const zoneGroups = filteredGroups.filter(
                        g => g.zone_id === selectedZonePopup.zone.id
                      );
                      return zoneGroups.length > 0 ? (
                        <div>
                          <div className="text-sm font-semibold mb-2">
                            Grupos ({zoneGroups.length})
                          </div>
                          <div className="max-h-48 overflow-y-auto space-y-2">
                            {zoneGroups.slice(0, 5).map(group => (
                              <div
                                key={group.id}
                                className="p-2 bg-background rounded border border-border text-sm cursor-pointer hover:bg-muted transition-colors"
                                onClick={() => {
                                  setPopupInfo({
                                    group,
                                    lngLat: [
                                      Number(group.longitude) || selectedZonePopup.lngLat[0],
                                      Number(group.latitude) || selectedZonePopup.lngLat[1],
                                    ],
                                  });
                                  setSelectedZonePopup(null);
                                }}
                              >
                                <div className="font-medium">{group.group_name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {group.active_members || 0} miembros •{' '}
                                  {group.status === 'active'
                                    ? 'Activo'
                                    : group.status === 'multiplying'
                                      ? 'Multiplicando'
                                      : 'Inactivo'}
                                </div>
                              </div>
                            ))}
                            {zoneGroups.length > 5 && (
                              <div className="text-xs text-muted-foreground text-center">
                                +{zoneGroups.length - 5} grupos más
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground text-center py-2">
                          No hay grupos en esta zona
                        </div>
                      );
                    })()}
                  </div>
                </Popup>
              )}
            </MapLibreMap>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Total Células</span>
              </div>
              <p className="text-2xl font-bold">{stats.totalGroups}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">Miembros Activos</span>
              </div>
              <p className="text-2xl font-bold">{stats.totalMembers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">Multiplicando</span>
              </div>
              <p className="text-2xl font-bold">{stats.multiplying}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium">Zonas</span>
              </div>
              <p className="text-2xl font-bold">{stats.activeZones}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  if (isMultiPolygon(boundaries)) {
    return {
      type: 'Feature',
      geometry: {
        type: 'MultiPolygon',
        coordinates: boundaries.coordinates,
      },
      properties: {
        zoneId: zone.id,
        zoneName: zone.name,
        color: zone.color || '#3b82f6',
        totalGroups: zoneData.groups.length,
      },
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
    feature.geometry.coordinates.forEach(polygon => {
      polygon.forEach(ring => getBoundsFromCoordinates(ring, bounds));
    });
  }

  if (!isFinite(bounds[0][0])) return null;
  return bounds;
}

export default function DiscipleshipMap({
  selectedZoneId,
  onZoneSelect,
  heightClassName = 'h-[620px]',
}: DiscipleshipMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [zoneData, setZoneData] = useState<ZoneMapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [internalSelectedZoneId, setInternalSelectedZoneId] = useState<string | null>(
    selectedZoneId ?? null
  );

  useEffect(() => {
    setInternalSelectedZoneId(selectedZoneId ?? null);
  }, [selectedZoneId]);

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

  const zoneFeatures = useMemo<ZoneFeatureCollection>(() => {
    const features = zoneData
      .map(normalizeZoneFeature)
      .filter((feature): feature is ZoneFeature => feature !== null);

    return {
      type: 'FeatureCollection',
      features,
    };
  }, [zoneData]);

  const selectedZone = useMemo(
    () => zoneData.find(item => item.zone.id === internalSelectedZoneId) ?? null,
    [zoneData, internalSelectedZoneId]
  );

  const visibleGroups = useMemo<ZoneMapGroup[]>(() => {
    if (!internalSelectedZoneId) {
      return zoneData
        .flatMap(item => item.groups)
        .filter(group => group.latitude && group.longitude);
    }

    return (
      zoneData
        .find(item => item.zone.id === internalSelectedZoneId)
        ?.groups.filter(group => group.latitude && group.longitude) || []
    );
  }, [zoneData, internalSelectedZoneId]);

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
    onZoneSelect?.(nextZoneId, zone?.groups ?? []);

    if (nextZoneId) {
      fitToZone(nextZoneId);
    }
  };

  const selectedBorder = useMemo<Layer>(() => {
    return {
      ...selectedBorderLayer,
      filter: ['==', ['get', 'zoneId'], internalSelectedZoneId ?? ''],
    };
  }, [internalSelectedZoneId]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
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

              <Source id="zones-source" type="geojson" data={zoneFeatures}>
                <Layer {...fillLayer} />
                <Layer {...borderLayer} />
                <Layer {...selectedBorder} />
              </Source>

              {visibleGroups.map(group => (
                <Marker
                  key={group.id}
                  longitude={group.longitude as number}
                  latitude={group.latitude as number}
                  anchor="bottom"
                >
                  <button
                    type="button"
                    className="flex h-4 w-4 rounded-full border-2 border-background bg-primary shadow-md"
                    title={group.group_name}
                  />
                </Marker>
              ))}
            </Map>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="space-y-2">
          <CardTitle>Zonas y grupos</CardTitle>
          {internalSelectedZoneId ? (
            <Badge variant="secondary">
              {selectedZone?.zone.name} · {selectedZone?.groups.length || 0} grupos
            </Badge>
          ) : (
            <Badge variant="outline">Mostrando todas las zonas</Badge>
          )}
        </CardHeader>

        <CardContent>
          <ScrollArea className="h-[560px] pr-4">
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleSelectZone(null)}
                className={cn(
                  'w-full rounded-md border border-border p-3 text-left transition-colors',
                  !internalSelectedZoneId && 'bg-accent text-accent-foreground'
                )}
              >
                <p className="font-medium">Todas las zonas</p>
                <p className="text-sm text-muted-foreground">
                  {zoneData.reduce((acc, item) => acc + item.groups.length, 0)} grupos visibles
                </p>
              </button>

              {loading && <p className="text-sm text-muted-foreground">Cargando mapa...</p>}

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
                          <p className="font-medium">{item.zone.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.groups.length} grupos · {item.zone.total_members || 0} miembros
                          </p>
                        </div>
                        <span
                          className="mt-1 h-3 w-3 rounded-full border border-border"
                          style={{ backgroundColor: item.zone.color }}
                        />
                      </div>
                    </button>

                    {isSelected && item.groups.length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-border pt-3">
                        {item.groups.map(group => (
                          <div key={group.id} className="rounded-md border border-border/60 p-2">
                            <p className="text-sm font-medium">{group.group_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {group.leader_name || 'Sin líder'} ·{' '}
                              {group.meeting_location || 'Sin ubicación'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {group.latitude && group.longitude
                                ? `${group.latitude}, ${group.longitude}`
                                : 'Sin coordenadas'}
                            </p>
                          </div>
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
