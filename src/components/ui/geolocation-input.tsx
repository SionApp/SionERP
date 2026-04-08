import { Loader2, MapPin, Navigation, X } from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import MapLibreMap, { MapMouseEvent, Marker } from 'react-map-gl/maplibre';
import { Button } from './button';
import { Card, CardContent } from './card';
import { Input } from './input';
import { Label } from './label';

export interface TypeGeolocalization {
  Valid: boolean;
  Float64: number;
}

export interface GeolocationResult {
  address: string;
  latitude?: TypeGeolocalization | number;
  longitude?: TypeGeolocalization | number;
}

interface GeolocationInputProps {
  value?: GeolocationResult;
  onChange: (value: GeolocationResult | null) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

// Usar Nominatim (OpenStreetMap) para geocodificación - Gratuito y sin token
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

interface NominatimFeature {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

const DEFAULT_CENTER = { longitude: -69.6549, latitude: 11.4045 }; // Coro, Falcón, Venezuela

export const GeolocationInput: React.FC<GeolocationInputProps> = ({
  value,
  onChange,
  label = 'Ubicación',
  placeholder = 'Buscar dirección...',
  required = false,
  disabled = false,
}) => {
  const getCoordValue = (coord?: TypeGeolocalization | number): number | undefined => {
    if (typeof coord === 'number') return coord;
    if (coord && typeof coord === 'object' && coord.Valid) return coord.Float64;
    return undefined;
  };

  const [address, setAddress] = useState(value?.address || '');
  const [suggestions, setSuggestions] = useState<NominatimFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  console.log(value, 'value');
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const lat = getCoordValue(value?.latitude);
  const lng = getCoordValue(value?.longitude);
  const hasCoordinates = lat !== undefined && lng !== undefined;

  const [viewState, setViewState] = useState({
    longitude: lng ?? DEFAULT_CENTER.longitude,
    latitude: lat ?? DEFAULT_CENTER.latitude,
    zoom: hasCoordinates ? 15 : 12,
  });

  // Geocodificación: buscar direcciones usando Nominatim
  const searchAddresses = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      // Nominatim requiere un User-Agent
      const url = `${NOMINATIM_URL}/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=ve&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'SionERP/1.0', // Nominatim requiere User-Agent
        },
      });

      if (!response.ok) {
        throw new Error('Error en la búsqueda');
      }

      const data: NominatimFeature[] = await response.json();
      setSuggestions(data || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error searching addresses:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce para búsqueda
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value;
    setAddress(newAddress);
    setLocationError(null);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      searchAddresses(newAddress);
    }, 500); // Nominatim tiene rate limiting, usar 500ms
  };

  // Seleccionar una sugerencia
  const selectSuggestion = (feature: NominatimFeature) => {
    const lat = parseFloat(feature.lat);
    const lng = parseFloat(feature.lon);
    const address = feature.display_name;

    setAddress(address);
    setSuggestions([]);
    setShowSuggestions(false);

    onChange({
      address,
      latitude: lat,
      longitude: lng,
    });

    // Actualizar vista del mapa
    setViewState({
      longitude: lng,
      latitude: lat,
      zoom: 15,
    });

    if (!showMap) {
      setShowMap(true);
    }
  };

  // Detectar ubicación actual (GPS)
  const detectCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('La geolocalización no está disponible en tu navegador');
      return;
    }

    setLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async position => {
        const { latitude, longitude } = position.coords;

        try {
          // Geocodificación reversa usando Nominatim
          const url = `${NOMINATIM_URL}/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'SionERP/1.0',
            },
          });

          if (!response.ok) {
            throw new Error('Error en geocodificación reversa');
          }

          const data = await response.json();

          if (data && data.display_name) {
            const address = data.display_name;
            setAddress(address);

            onChange({
              address,
              latitude,
              longitude,
            });

            // Actualizar vista del mapa
            setViewState({
              longitude,
              latitude,
              zoom: 15,
            });

            if (!showMap) {
              setShowMap(true);
            }
          }
        } catch (error) {
          console.error('Error in reverse geocoding:', error);
          setLocationError('Error al obtener la dirección');
        } finally {
          setLoading(false);
        }
      },
      error => {
        setLocationError(
          'Error al obtener tu ubicación. Verifica los permisos de geolocalización.'
        );
        setLoading(false);
      }
    );
  };

  // Manejar click en el mapa para seleccionar ubicación
  const handleMapClick = useCallback(
    async (event: MapMouseEvent) => {
      const { lng, lat } = event.lngLat;

      try {
        // Geocodificación reversa usando Nominatim
        const url = `${NOMINATIM_URL}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'SionERP/1.0',
          },
        });

        if (!response.ok) {
          throw new Error('Error en geocodificación reversa');
        }

        const data = await response.json();

        if (data && data.display_name) {
          const address = data.display_name;
          setAddress(address);

          onChange({
            address,
            latitude: lat,
            longitude: lng,
          });
        }
      } catch (error) {
        console.error('Error in reverse geocoding:', error);
      }
    },
    [onChange]
  );

  // Cerrar sugerencias al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sincronizar con value externo
  useEffect(() => {
    if (value) {
      setAddress(value.address);
      setViewState(prev => ({
        ...prev,
        longitude: lng,
        latitude: lat,
        zoom: prev.zoom < 14 ? 15 : prev.zoom,
      }));
    }
  }, [value]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="geolocation-input">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={detectCurrentLocation}
            disabled={disabled || loading}
          >
            <Navigation className="w-4 h-4 mr-1" />
            Mi ubicación
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowMap(!showMap)}
            disabled={disabled}
          >
            <MapPin className="w-4 h-4 mr-1" />
            {showMap ? 'Ocultar mapa' : 'Mostrar mapa'}
          </Button>
        </div>
      </div>

      <div className="relative" ref={suggestionsRef}>
        <Input
          id="geolocation-input"
          value={address}
          onChange={handleAddressChange}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Sugerencias */}
        {showSuggestions && suggestions.length > 0 && (
          <Card className="absolute z-50 w-full mt-1 max-h-60 overflow-auto">
            <CardContent className="p-0">
              {suggestions.map((feature, index) => (
                <button
                  key={feature.place_id || index}
                  type="button"
                  className="w-full text-left px-4 py-2 hover:bg-muted transition-colors border-b last:border-0"
                  onClick={() => selectSuggestion(feature)}
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">
                        {feature.address?.road || feature.display_name.split(',')[0]}
                      </p>
                      <p className="text-xs text-muted-foreground">{feature.display_name}</p>
                    </div>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {locationError && (
        <p className="text-sm text-destructive flex items-center gap-1">
          <X className="w-4 h-4" />
          {locationError}
        </p>
      )}

      {/* Mapa interactivo */}
      {showMap && (
        <Card>
          <CardContent className="p-0">
            <MapLibreMap
              {...viewState}
              onMove={evt => setViewState(evt.viewState)}
              onClick={handleMapClick}
              style={{ width: '100%', height: 300 }}
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
            >
              {hasCoordinates && (
                <Marker longitude={lng} latitude={lat}>
                  <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg" />
                </Marker>
              )}
            </MapLibreMap>
          </CardContent>
        </Card>
      )}

      {/* Mostrar coordenadas si hay valor */}
      {hasCoordinates && (
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <MapPin className="w-3 h-3" />
          <span>
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </span>
        </div>
      )}
    </div>
  );
};
