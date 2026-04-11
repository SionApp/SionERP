import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ZonesService } from '@/services/zones.service';
import type {
  DiscipleshipGroup,
  GeoJSONMultiPolygon,
  GeoJSONPolygon,
  ZoneMapData,
  ZoneMapGroup,
} from '@/types/discipleship.types';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import Map, { Layer, Marker, NavigationControl, Source, type MapRef } from 'react-map-gl/maplibre';

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
    <>
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

                {visibleGroups.map(group => {
                  const lat = Number(group.latitude);
                  const lng = Number(group.longitude);
                  if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
                    return null;
                  }
                  return (
                    <Marker key={group.id} longitude={lng} latitude={lat} anchor="bottom">
                      <button
                        type="button"
                        className="flex h-4 w-4 rounded-full border-2 border-background bg-primary shadow-md"
                        title={group.group_name}
                      />
                    </Marker>
                  );
                })}
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
    </>
  );
}
