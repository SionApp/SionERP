import { Loader2, MapPin, Navigation, X } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvent, ZoomControl } from 'react-leaflet';
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

const DEFAULT_CENTER: [number, number] = [11.4045, -69.6549]; // Coro, Falcón, Venezuela

// Custom red dot marker
const redDotIcon = L.divIcon({
  html: '<div class="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg"></div>',
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// ── Map click handler (inside MapContainer) ──
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvent('click', e => {
    onMapClick(e.latlng.lat, e.latlng.lng);
  });
  return null;
}

// ── Map fit helper ──
function FitToPosition({ position, zoom }: { position: [number, number]; zoom: number }) {
  const map = useMapEvent('ready', () => {
    map.setView(position, zoom, { animate: true });
  });
  return null;
}

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

  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lat = getCoordValue(value?.latitude);
  const lng = getCoordValue(value?.longitude);
  const hasCoordinates = lat !== undefined && lng !== undefined;

  const [mapPosition, setMapPosition] = useState<[number, number]>(
    hasCoordinates ? [lat!, lng!] : DEFAULT_CENTER
  );
  const [mapZoom, setMapZoom] = useState(hasCoordinates ? 15 : 12);

  // Geocodificación: buscar direcciones usando Nominatim
  const searchAddresses = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const url = `${NOMINATIM_URL}/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=ve&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'SionERP/1.0',
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
    }, 500);
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

    setMapPosition([lat, lng]);
    setMapZoom(15);

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

            setMapPosition([latitude, longitude]);
            setMapZoom(15);

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
    async (lat: number, lng: number) => {
      try {
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
      if (lat !== undefined && lng !== undefined) {
        setMapPosition([lat, lng]);
        setMapZoom(prev => (prev < 14 ? 15 : prev));
      }
    }
  }, [value, lat, lng]);

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
            <div className="h-[300px] w-full">
              <MapContainer
                center={mapPosition}
                zoom={mapZoom}
                className="h-full w-full"
                zoomControl={false}
              >
                <ZoomControl position="topright" />
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                <MapClickHandler onMapClick={handleMapClick} />
                {hasCoordinates && <Marker position={[lat!, lng!]} icon={redDotIcon} />}
              </MapContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mostrar coordenadas si hay valor */}
      {hasCoordinates && (
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <MapPin className="w-3 h-3" />
          <span>
            {lat!.toFixed(6)}, {lng!.toFixed(6)}
          </span>
        </div>
      )}
    </div>
  );
};
