import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Save, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap, ZoomControl } from 'react-leaflet';
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
  TerraDrawRenderMode,
} from 'terra-draw';
import { TerraDrawLeafletAdapter } from 'terra-draw-leaflet-adapter';

interface ZoneEditorProps {
  initialBoundaries?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  onSave: (boundaries: GeoJSON.Polygon) => void;
  onCancel: () => void;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

// ── Map helper to access Leaflet map instance for TerraDraw ──
function TerraDrawInit({
  initialBoundaries,
  drawRef,
  onHasPolygon,
}: {
  initialBoundaries?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  drawRef: React.MutableRefObject<TerraDraw | null>;
  onHasPolygon: (has: boolean) => void;
}) {
  const map = useMap();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current || !map) return;

    // Leaflet inside Dialog: container might have 0 dimensions on first render.
    // invalidateSize() forces Leaflet to recalculate its size.
    map.invalidateSize();

    // Wait for the container to have real dimensions before initializing TerraDraw
    const container = map.getContainer();
    if (!container || container.offsetWidth === 0 || container.offsetHeight === 0) {
      // Try again after a short delay (Dialog animation)
      const retryTimeout = setTimeout(() => {
        map.invalidateSize();
        initTerraDraw();
      }, 300);
      return () => clearTimeout(retryTimeout);
    }

    initTerraDraw();

    function initTerraDraw() {
      if (initializedRef.current) return;
      initializedRef.current = true;

      let draw: TerraDraw | null = null;

      try {
        draw = new TerraDraw({
          adapter: new TerraDrawLeafletAdapter({
            lib: L,
            map,
          }),
          modes: [
            new TerraDrawPolygonMode(),
            new TerraDrawSelectMode({
              flags: {
                polygon: {
                  feature: {
                    draggable: true,
                    coordinates: { midpoints: true, draggable: true, deletable: true },
                  },
                },
              },
            }),
            new TerraDrawRenderMode({
              modeName: 'render',
              styles: {
                polygonFillColor: '#3b82f6',
                polygonFillOpacity: 0.4,
                polygonOutlineColor: '#2563eb',
                polygonOutlineWidth: 2,
              },
            }),
          ],
        });

        draw.start();
        draw.setMode('polygon');

        // Si hay boundaries iniciales, cargarlas
        if (initialBoundaries && initialBoundaries.type === 'Polygon') {
          draw.addFeatures([
            {
              type: 'Feature' as const,
              geometry: initialBoundaries,
              properties: { mode: 'render' },
            },
          ]);
          draw.setMode('select');
          onHasPolygon(true);
        }

        draw.on('finish', () => onHasPolygon(true));

        drawRef.current = draw;
      } catch (err) {
        console.error('TerraDraw init error:', err);
      }
    }

    return () => {
      if (drawRef.current) {
        drawRef.current.stop();
        drawRef.current = null;
      }
    };
  }, [map]); // Only depends on map instance — stable after mount

  return null;
}

// ── Map search fly-to helper ──
function MapFlyTo({ position, zoom, onDone }: { position: [number, number]; zoom: number; onDone: () => void }) {
  const map = useMap();

  useEffect(() => {
    // Ensure map has correct dimensions (important inside Dialog)
    map.invalidateSize();
    map.flyTo(position, zoom, { duration: 1.5 });
    const timer = setTimeout(onDone, 1600);
    return () => clearTimeout(timer);
  }, [map, position, zoom, onDone]);

  return null;
}

export function ZoneEditor({
  initialBoundaries,
  onSave,
  onCancel,
}: Omit<ZoneEditorProps, 'existingZones' | 'editingZoneId'>) {
  const drawRef = useRef<TerraDraw | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasPolygon, setHasPolygon] = useState(!!initialBoundaries);
  const [flyTo, setFlyTo] = useState<{ position: [number, number]; zoom: number } | null>(null);

  // Stable callback to clear flyTo state after animation completes
  const handleFlyToDone = useCallback(() => {
    setFlyTo(null);
  }, []);

  // Stable callback to avoid re-rendering TerraDrawInit
  const handleHasPolygon = useCallback((has: boolean) => {
    setHasPolygon(has);
  }, []);

  // Geocoding con Nominatim (gratis, OpenStreetMap)
  const searchAddress = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
      );
      const data: NominatimResult[] = await res.json();
      setSuggestions(data);
    } catch (e) {
      console.error('Geocoding error:', e);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce de búsqueda
  useEffect(() => {
    const timer = setTimeout(() => searchAddress(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery, searchAddress]);

  const handleSelectAddress = (result: NominatimResult) => {
    const lng = parseFloat(result.lon);
    const lat = parseFloat(result.lat);
    setFlyTo({ position: [lat, lng], zoom: 15 });
    setSuggestions([]);
    setSearchQuery(result.display_name);
  };

  const handleClear = () => {
    const draw = drawRef.current;
    if (!draw) return;
    const snapshot = draw.getSnapshot();
    snapshot.forEach((f) => draw.removeFeatures([f.id as string]));
    draw.setMode('polygon');
    setHasPolygon(false);
  };

  const handleSave = () => {
    const draw = drawRef.current;
    if (!draw) return;
    const snapshot = draw.getSnapshot();
    const polygon = snapshot.find((f) => f.geometry.type === 'Polygon');
    if (polygon) {
      onSave(polygon.geometry as GeoJSON.Polygon);
    }
  };

  return (
    <div className="flex flex-col gap-4 h-[500px]">
      {/* Buscador de direcciones */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar dirección para centrar el mapa..."
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon" onClick={handleClear} title="Limpiar polígono">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button onClick={handleSave} disabled={!hasPolygon} title="Guardar zona">
            <Save className="h-4 w-4 mr-2" /> Guardar
          </Button>
        </div>

        {suggestions.length > 0 && (
          <ul className="absolute z-[9999] top-full mt-1 w-full bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
            {suggestions.map((s, i) => (
              <li
                key={i}
                className="px-3 py-2 text-sm cursor-pointer hover:bg-accent truncate"
                onClick={() => handleSelectAddress(s)}
              >
                {s.display_name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Mapa con dibujo */}
      <div className="flex-1 rounded-md overflow-hidden border">
        <MapContainer
          center={[11.4045, -69.6734]}
          zoom={13}
          className="h-full w-full"
          zoomControl={false}
        >
          <ZoomControl position="topright" />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          <TerraDrawInit
            initialBoundaries={initialBoundaries}
            drawRef={drawRef}
            onHasPolygon={handleHasPolygon}
          />
          {flyTo && <MapFlyTo position={flyTo.position} zoom={flyTo.zoom} onDone={handleFlyToDone} />}
        </MapContainer>
      </div>

      <p className="text-xs text-muted-foreground">
        Haz clic en el mapa para dibujar los vértices del polígono. Cierra el polígono haciendo clic
        en el primer punto.
      </p>
    </div>
  );
}
