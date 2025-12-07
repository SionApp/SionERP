import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { mockGroups } from '@/mocks/discipleship/data.mock';
import { Calendar, Layers, Map, MapPin, Users } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import React, { useEffect, useRef, useState } from 'react';

const mockCoordinates: Record<string, { lat: number; lng: number; address: string }> = {
  'group-001': { lat: 10.2547, lng: -67.5926, address: 'Av. Bolívar Norte #45' },
  'group-002': { lat: 10.2612, lng: -67.5889, address: 'Calle Miranda #78' },
  'group-003': { lat: 10.2489, lng: -67.5945, address: 'Urbanización Parque Residencial #23' },
  'group-004': { lat: 10.2145, lng: -67.5934, address: 'Av. Sur #156' },
  'group-005': { lat: 10.2089, lng: -67.5812, address: 'Calle Principal #89' },
};

const zoneColors: Record<string, string> = {
  'Zona Norte': '#3b82f6',
  'Zona Sur': '#ef4444',
  'Zona Este': '#10b981',
  'Zona Oeste': '#f59e0b',
};

const DiscipleshipMap: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(true);
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [markers, setMarkers] = useState<mapboxgl.Marker[]>([]);

  const initializeMap = () => {
    if (!mapContainer.current) return;

    const token =
      mapboxToken ||
      'pk.eyJ1IjoibG92YWJsZS1kZW1vIiwiYSI6ImNtNHd4djk2MDA0NHcyanM4aTlsYnZyYnIifQ.demo';
    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-67.5926, 10.2425],
      zoom: 12,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      addMarkersToMap();
    });

    setShowTokenInput(false);
  };

  const addMarkersToMap = () => {
    if (!map.current) return;

    markers.forEach(marker => marker.remove());
    setMarkers([]);

    const newMarkers: mapboxgl.Marker[] = [];

    mockGroups
      .filter(group => {
        if (selectedZone !== 'all' && group.zone_name !== selectedZone) return false;
        if (selectedStatus !== 'all' && group.status !== selectedStatus) return false;
        return true;
      })
      .forEach(group => {
        const coords = mockCoordinates[group.id];
        if (!coords) return;

        const markerElement = document.createElement('div');
        markerElement.style.cssText = `
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background-color: ${zoneColors[group.zone_name || ''] || '#6b7280'};
          border: 3px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          color: white;
        `;
        markerElement.textContent = group.active_members.toString();

        if (group.status === 'multiplying') {
          markerElement.style.border = '3px solid #10b981';
        } else if (group.status === 'inactive') {
          markerElement.style.opacity = '0.5';
        }

        const popupContent = `
          <div class="p-3 min-w-[250px]">
            <h3 class="font-bold text-lg mb-2">${group.group_name}</h3>
            <div class="space-y-2 text-sm">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full" style="background-color: ${zoneColors[group.zone_name || '']}"></div>
                <span>${group.zone_name}</span>
              </div>
              <div>📍 ${coords.address}</div>
              <div>📅 ${group.meeting_day}s ${group.meeting_time}</div>
              <div>👥 ${group.active_members}/${group.member_count} miembros</div>
              <div class="mt-2">
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  group.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : group.status === 'multiplying'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                }">
                  ${group.status === 'active' ? 'Activo' : group.status === 'multiplying' ? 'Multiplicando' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>
        `;

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent);

        const marker = new mapboxgl.Marker(markerElement)
          .setLngLat([coords.lng, coords.lat])
          .setPopup(popup)
          .addTo(map.current!);

        newMarkers.push(marker);
      });

    setMarkers(newMarkers);
  };

  useEffect(() => {
    if (map.current) {
      addMarkersToMap();
    }
  }, [selectedZone, selectedStatus]);

  if (showTokenInput) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="w-5 h-5" />
            Mapa de Células de Discipulado
          </CardTitle>
          <CardDescription>
            Visualización de todas las células organizadas por zonas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
              💡 <strong>Demo disponible:</strong> Ver mapa con datos de ejemplo
            </p>
            <Button onClick={initializeMap} variant="default">
              <Map className="w-4 h-4 mr-2" />
              Ver Mapa Demo
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Token de Mapbox (Opcional)</label>
            <Input
              type="password"
              placeholder="Tu token de Mapbox"
              value={mapboxToken}
              onChange={e => setMapboxToken(e.target.value)}
            />
          </div>

          <Button
            onClick={initializeMap}
            disabled={!mapboxToken}
            variant="outline"
            className="w-full"
          >
            Cargar con Token Personal
          </Button>
        </CardContent>
      </Card>
    );
  }

  const stats = {
    totalGroups: mockGroups.length,
    totalMembers: mockGroups.reduce((sum, g) => sum + g.active_members, 0),
    multiplying: mockGroups.filter(g => g.status === 'multiplying').length,
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="w-5 h-5" />
            Mapa de Células de Discipulado
          </CardTitle>
          <CardDescription>Visualiza la ubicación de todas las células por zona</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Filtrar por Zona</label>
              <Select value={selectedZone} onValueChange={setSelectedZone}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las Zonas</SelectItem>
                  <SelectItem value="Zona Norte">Zona Norte</SelectItem>
                  <SelectItem value="Zona Sur">Zona Sur</SelectItem>
                  <SelectItem value="Zona Este">Zona Este</SelectItem>
                  <SelectItem value="Zona Oeste">Zona Oeste</SelectItem>
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

          <div className="flex flex-wrap gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
            {Object.entries(zoneColors).map(([zone, color]) => (
              <div key={zone} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full border-2 border-white"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm">{zone}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div ref={mapContainer} className="w-full h-[600px] rounded-lg" />
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
            <p className="text-2xl font-bold">4</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DiscipleshipMap;
