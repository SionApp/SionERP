import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useZones } from '@/hooks/useZones';
import { Zone } from '@/types/discipleship.types';
import { MapPin, Users, Building2, X } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon issue in bundlers
const DEFAULT_ICON = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DEFAULT_ICON;

// ── Map fit helper ──
function FitBounds({ zones }: { zones: Zone[] }) {
  const map = useMap();

  useEffect(() => {
    const validZones = zones.filter(z => z.center_lat && z.center_lng);
    if (validZones.length === 0) return;

    const bounds = L.latLngBounds(
      validZones.map(z => [z.center_lat as number, z.center_lng as number])
    );
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [map, zones]);

  return null;
}

// ── Zone marker with colored circle ──
function ZoneMarker({ zone }: { zone: Zone }) {
  if (!zone.center_lat || !zone.center_lng) return null;

  const hasPolygon = zone.boundaries && typeof zone.boundaries === 'object' && 'coordinates' in zone.boundaries;

  return (
    <>
      {/* Polygon boundaries if available */}
      {hasPolygon && (
        <Polygon
          positions={(zone.boundaries as { coordinates: number[][][] }).coordinates[0].map(
            ([lng, lat]) => [lat, lng] as [number, number]
          )}
          pathOptions={{
            color: zone.color || '#3b82f6',
            fillColor: zone.color || '#3b82f6',
            fillOpacity: 0.15,
            weight: 2,
          }}
        />
      )}

      {/* Center marker */}
      <Marker
        position={[zone.center_lat, zone.center_lng]}
        eventHandlers={{
          mouseover: (e) => {
            (e.target as L.Marker).openPopup();
          },
        }}
      >
        <Popup maxWidth={300} className="zone-popup">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: zone.color || '#3b82f6' }}
              />
              <h3 className="font-bold text-sm">{zone.name}</h3>
            </div>
            {zone.description && (
              <p className="text-xs text-muted-foreground">{zone.description}</p>
            )}
            {zone.supervisor_name && (
              <div className="flex items-center gap-1 text-xs">
                <Users className="h-3 w-3" />
                <span>Supervisor: {zone.supervisor_name}</span>
              </div>
            )}
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {zone.total_groups ?? 0} grupos
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {zone.total_members ?? 0} miembros
              </span>
            </div>
          </div>
        </Popup>
      </Marker>
    </>
  );
}

// ── Zone sidebar item ──
function ZoneListItem({
  zone,
  isSelected,
  onClick,
}: {
  zone: Zone;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200 border ${
        isSelected
          ? 'bg-primary/10 border-primary/30'
          : 'hover:bg-accent/50 border-transparent'
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: zone.color || '#3b82f6' }}
        />
        <span className="font-medium text-sm truncate">{zone.name}</span>
      </div>
      <div className="flex gap-3 mt-1 text-xs text-muted-foreground ml-5">
        <span>{zone.total_groups ?? 0} grupos</span>
        <span>{zone.total_members ?? 0} miembros</span>
      </div>
      {zone.supervisor_name && (
        <div className="text-xs text-muted-foreground ml-5 truncate">
          {zone.supervisor_name}
        </div>
      )}
    </button>
  );
}

// ── Main component ──
export default function ZoneMapView() {
  const { zones, loading, error } = useZones({ onlyActive: true });
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);

  const selectedZone = useMemo(
    () => zones.find(z => z.id === selectedZoneId) ?? null,
    [zones, selectedZoneId]
  );

  const handleZoneSelect = useCallback((zoneId: string) => {
    setSelectedZoneId(prev => prev === zoneId ? null : zoneId);
  }, []);

  if (loading) {
    return (
      <Card className="border-0 bg-[var(--glass-background)] backdrop-blur-lg shadow-[var(--shadow-glass)]">
        <CardHeader>
          <CardTitle>Cargando zonas...</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-64 w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="p-6 text-center">
          <p className="text-destructive">Error al cargar el mapa: {error}</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate default center from first zone with coords
  const defaultCenter: [number, number] = zones.find(z => z.center_lat && z.center_lng)
    ? [zones.find(z => z.center_lat && z.center_lng)!.center_lat!, zones.find(z => z.center_lat && z.center_lng)!.center_lng!]
    : [-34.6037, -58.3816]; // Fallback: Buenos Aires

  const validZones = zones.filter(z => z.center_lat && z.center_lng);

  return (
    <Card className="border-0 bg-[var(--glass-background)] backdrop-blur-lg shadow-[var(--shadow-glass)] overflow-hidden">
      <div className="flex h-[600px]">
        {/* Sidebar */}
        {showSidebar && (
          <div className="w-72 border-r border-border/30 flex flex-col shrink-0 bg-background/50">
            <div className="p-3 border-b border-border/30 flex items-center justify-between">
              <h3 className="font-semibold text-sm">Zonas ({validZones.length})</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setShowSidebar(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {validZones.map(zone => (
                <ZoneListItem
                  key={zone.id}
                  zone={zone}
                  isSelected={selectedZoneId === zone.id}
                  onClick={() => handleZoneSelect(zone.id)}
                />
              ))}
              {validZones.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No hay zonas con coordenadas configuradas
                </p>
              )}
            </div>
          </div>
        )}

        {/* Map */}
        <div className="flex-1 relative">
          {!showSidebar && (
            <Button
              variant="outline"
              size="sm"
              className="absolute top-3 left-3 z-[1000] bg-background/90 backdrop-blur-sm"
              onClick={() => setShowSidebar(true)}
            >
              <MapPin className="h-3 w-3 mr-1" />
              Zonas
            </Button>
          )}

          <MapContainer
            center={defaultCenter}
            zoom={12}
            className="h-full w-full"
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            <FitBounds zones={validZones} />
            {validZones.map(zone => (
              <ZoneMarker key={zone.id} zone={zone} />
            ))}
          </MapContainer>
        </div>
      </div>
    </Card>
  );
}
