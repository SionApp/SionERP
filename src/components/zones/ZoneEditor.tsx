import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Search, Trash2 } from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import Map, { MapRef, NavigationControl, Source, Layer } from 'react-map-gl/maplibre';
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawRenderMode,
  TerraDrawSelectMode,
} from 'terra-draw';
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter';

interface ZoneEditorProps {
  initialBoundaries?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  existingZones?: { id: string; name: string; boundaries?: unknown | null; color: string }[];
  editingZoneId?: string;
  onSave: (boundaries: GeoJSON.Polygon) => void;
  onCancel: () => void;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

export function ZoneEditor({
  initialBoundaries,
  existingZones,
  editingZoneId,
  onSave,
  onCancel,
}: ZoneEditorProps) {
  const mapRef = useRef<MapRef>(null);
  const drawRef = useRef<TerraDraw | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasPolygon, setHasPolygon] = useState(!!initialBoundaries);

  const backgroundFeatures = useMemo(() => {
    if (!existingZones) return { type: 'FeatureCollection', features: [] };

    const features = existingZones
      .filter(z => z.id !== editingZoneId && z.boundaries)
      .map(z => {
        let bounds = z.boundaries;
        if (typeof bounds === 'string') {
          try {
            bounds = JSON.parse(bounds);
          } catch {
            return null;
          }
        }
        if (
          typeof bounds === 'object' &&
          bounds !== null &&
          'type' in bounds &&
          (bounds.type === 'Polygon' || bounds.type === 'MultiPolygon')
        ) {
          return {
            type: 'Feature',
            geometry: bounds as GeoJSON.Polygon | GeoJSON.MultiPolygon,
            properties: { color: z.color || '#888888', name: z.name },
          };
        }
        return null;
      })
      .filter(Boolean);

    return { type: 'FeatureCollection', features };
  }, [existingZones, editingZoneId]);

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
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 15, duration: 1500 });
    setSuggestions([]);
    setSearchQuery(result.display_name);
  };

  // Inicializar TerraDraw cuando el mapa carga
  const handleMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map || drawRef.current) return;

    const draw = new TerraDraw({
      adapter: new TerraDrawMapLibreGLAdapter({ map }),
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
      setHasPolygon(true);
    }

    draw.on('finish', () => setHasPolygon(true));

    drawRef.current = draw;
  }, [initialBoundaries]);

  const handleClear = () => {
    const draw = drawRef.current;
    if (!draw) return;
    const snapshot = draw.getSnapshot();
    snapshot.forEach(f => draw.removeFeatures([f.id as string]));
    draw.setMode('polygon');
    setHasPolygon(false);
  };

  const handleSave = () => {
    const draw = drawRef.current;
    if (!draw) return;
    const snapshot = draw.getSnapshot();
    const polygon = snapshot.find(f => f.geometry.type === 'Polygon');
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
              onChange={e => setSearchQuery(e.target.value)}
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
          <ul className="absolute z-50 top-full mt-1 w-full bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
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
        <Map
          ref={mapRef}
          onLoad={handleMapLoad}
          initialViewState={{ latitude: 11.4045, longitude: -69.6734, zoom: 13 }}
          mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
          style={{ width: '100%', height: '100%' }}
        >
          <NavigationControl position="top-right" />
          <Source
            id="background-zones"
            type="geojson"
            data={backgroundFeatures as GeoJSON.FeatureCollection}
          >
            <Layer
              id="zones-fill"
              type="fill"
              paint={{ 'fill-color': ['get', 'color'], 'fill-opacity': 0.35 }}
            />
            <Layer
              id="zones-border"
              type="line"
              paint={{ 'line-color': ['get', 'color'], 'line-width': 2 }}
            />
          </Source>
        </Map>
      </div>

      <p className="text-xs text-muted-foreground">
        Haz clic en el mapa para dibujar los vértices del polígono. Cierra el polígono haciendo clic
        en el primer punto.
      </p>
    </div>
  );
}
