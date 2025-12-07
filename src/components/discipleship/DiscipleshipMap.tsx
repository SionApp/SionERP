import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useZones } from '@/hooks/useZones';
import { DiscipleshipService } from '@/services/discipleship.service';
import type { DiscipleshipGroup, GeoJSONPolygon, Zone } from '@/types/discipleship.types';
import { Calendar, Layers, Loader2, Map as MapIcon, MapPin, Users } from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import MapLibreMap, {
  Layer,
  MapLayerMouseEvent,
  MapRef,
  Marker,
  Popup,
  Source,
} from 'react-map-gl/maplibre';
import { toast } from 'sonner';

const DEFAULT_CENTER: { longitude: number; latitude: number } = {
  longitude: -67.5926,
  latitude: 10.2425,
}; // Maracay
const DEFAULT_ZOOM = 12;

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
        typeof group.longitude === 'number' && !isNaN(group.longitude) && isFinite(group.longitude);
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

  const zoneColorMap = new globalThis.Map(zonesData?.map(z => [z.id, z.color || '#6b7280']) || []);

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

export default DiscipleshipMap;
