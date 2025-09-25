import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  Map, 
  MapPin, 
  Users, 
  Calendar,
  Clock,
  Filter,
  Layers,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { mockGroups } from '@/mocks/discipleship/data.mock';
import { DiscipleshipGroup } from '@/types/discipleship.types';

// Extended mock data with coordinates
const groupsWithCoordinates: (DiscipleshipGroup & { latitude: number; longitude: number })[] = [
  {
    ...mockGroups[0],
    latitude: 10.2547,
    longitude: -67.5926,
    meeting_address: 'Av. Bolívar Norte #45, Sector La Paz'
  },
  {
    ...mockGroups[1],
    latitude: 10.2612,
    longitude: -67.5889,
    meeting_address: 'Calle Miranda #78, Centro Norte'
  },
  {
    ...mockGroups[2],
    latitude: 10.2489,
    longitude: -67.5945,
    meeting_address: 'Urbanización Parque Residencial #23'
  },
  {
    ...mockGroups[3],
    latitude: 10.2145,
    longitude: -67.5934,
    meeting_address: 'Av. Sur #156, Las Delicias'
  },
  {
    ...mockGroups[4],
    latitude: 10.2089,
    longitude: -67.5812,
    meeting_address: 'Calle Principal #89, El Limón'
  }
];

const zoneColors = {
  'Zona Norte': '#3b82f6',
  'Zona Sur': '#ef4444',
  'Zona Este': '#10b981',
  'Zona Oeste': '#f59e0b'
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
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-67.5926, 10.2425], // Centered on Maracay, Venezuela
      zoom: 12,
      pitch: 0
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    // Wait for map to load then add markers
    map.current.on('load', () => {
      addMarkersToMap();
    });

    setShowTokenInput(false);
  };

  const addMarkersToMap = () => {
    if (!map.current) return;

    // Clear existing markers
    markers.forEach(marker => marker.remove());
    setMarkers([]);

    const newMarkers: mapboxgl.Marker[] = [];

    groupsWithCoordinates
      .filter(group => {
        if (selectedZone !== 'all' && group.zone_name !== selectedZone) return false;
        if (selectedStatus !== 'all' && group.status !== selectedStatus) return false;
        return true;
      })
      .forEach(group => {
        // Create marker element
        const markerElement = document.createElement('div');
        markerElement.className = 'custom-marker';
        markerElement.style.width = '30px';
        markerElement.style.height = '30px';
        markerElement.style.borderRadius = '50%';
        markerElement.style.backgroundColor = zoneColors[group.zone_name as keyof typeof zoneColors] || '#6b7280';
        markerElement.style.border = '3px solid white';
        markerElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        markerElement.style.cursor = 'pointer';
        markerElement.style.display = 'flex';
        markerElement.style.alignItems = 'center';
        markerElement.style.justifyContent = 'center';
        markerElement.style.fontSize = '12px';
        markerElement.style.fontWeight = 'bold';
        markerElement.style.color = 'white';
        markerElement.textContent = group.active_members.toString();

        // Status ring
        if (group.status === 'multiplying') {
          markerElement.style.border = '3px solid #10b981';
          markerElement.style.animation = 'pulse 2s infinite';
        } else if (group.status === 'inactive') {
          markerElement.style.opacity = '0.5';
        }

        // Create popup content
        const popupContent = `
          <div class="p-3 min-w-[250px]">
            <h3 class="font-bold text-lg mb-2">${group.group_name}</h3>
            <div class="space-y-2 text-sm">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full" style="background-color: ${zoneColors[group.zone_name as keyof typeof zoneColors]}"></div>
                <span>${group.zone_name}</span>
              </div>
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <span>${group.meeting_address}</span>
              </div>
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                <span>${group.meeting_day}s ${group.meeting_time}</span>
              </div>
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/>
                </svg>
                <span>${group.active_members}/${group.member_count} miembros</span>
              </div>
              <div class="mt-2">
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  group.status === 'active' ? 'bg-green-100 text-green-800' :
                  group.status === 'multiplying' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }">
                  ${group.status === 'active' ? 'Activo' : group.status === 'multiplying' ? 'Multiplicando' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>
        `;

        // Create popup
        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: true,
          closeOnClick: false
        }).setHTML(popupContent);

        // Create marker
        const marker = new mapboxgl.Marker(markerElement)
          .setLngLat([group.longitude, group.latitude])
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

  // Add CSS for pulse animation
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
        100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (showTokenInput) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="w-5 h-5" />
            Mapa de Células de Discipulado
          </CardTitle>
          <CardDescription>
            Para utilizar el mapa, necesitas un token de Mapbox
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Token de Mapbox</label>
            <Input
              type="password"
              placeholder="Ingresa tu token público de Mapbox"
              value={mapboxToken}
              onChange={(e) => setMapboxToken(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Obtén tu token público en{' '}
              <a 
                href="https://mapbox.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                mapbox.com
              </a>
            </p>
          </div>
          <Button onClick={initializeMap} disabled={!mapboxToken}>
            <Map className="w-4 h-4 mr-2" />
            Cargar Mapa
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="w-5 h-5" />
            Mapa de Células de Discipulado
          </CardTitle>
          <CardDescription>
            Visualiza la ubicación geográfica de todas las células organizadas por zonas
          </CardDescription>
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
                  <SelectItem value="all">Todos los Estados</SelectItem>
                  <SelectItem value="active">Activas</SelectItem>
                  <SelectItem value="multiplying">Multiplicando</SelectItem>
                  <SelectItem value="inactive">Inactivas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#3b82f6] border-2 border-white"></div>
              <span className="text-sm">Zona Norte</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#ef4444] border-2 border-white"></div>
              <span className="text-sm">Zona Sur</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#10b981] border-2 border-white"></div>
              <span className="text-sm">Zona Este</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#f59e0b] border-2 border-white"></div>
              <span className="text-sm">Zona Oeste</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#10b981] border-2 border-[#10b981] animate-pulse"></div>
              <span className="text-sm">Multiplicando</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <Card>
        <CardContent className="p-0">
          <div ref={mapContainer} className="w-full h-[600px] rounded-lg" />
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Total Células</span>
            </div>
            <p className="text-2xl font-bold">{groupsWithCoordinates.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">Miembros Activos</span>
            </div>
            <p className="text-2xl font-bold">
              {groupsWithCoordinates.reduce((sum, group) => sum + group.active_members, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">Multiplicando</span>
            </div>
            <p className="text-2xl font-bold">
              {groupsWithCoordinates.filter(g => g.status === 'multiplying').length}
            </p>
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