import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, Plus, Edit2, Trash2, Save, Users, Building, Target } from 'lucide-react';
import { toast } from 'sonner';
import { Zone } from '@/types/discipleship.types';
import UserZoneAssignment from './UserZoneAssignment';

// Mock data for zones
const mockZones: Zone[] = [
  {
    id: 'zone-norte',
    name: 'Zona Norte',
    description:
      'Sectores del norte de la ciudad incluyendo La Paz, Maracay Norte y zonas aledañas',
    color: '#3b82f6',
    supervisor_id: '00000000-0000-0000-0000-000000000002',
    boundaries: {
      north: 10.28,
      south: 10.24,
      east: -67.58,
      west: -67.62,
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-09-20T00:00:00Z',
  },
  {
    id: 'zone-sur',
    name: 'Zona Sur',
    description: 'Sectores del sur incluyendo Las Delicias, El Limón y zonas cercanas',
    color: '#ef4444',
    supervisor_id: '00000000-0000-0000-0000-000000000003',
    boundaries: {
      north: 10.22,
      south: 10.18,
      east: -67.58,
      west: -67.62,
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-09-20T00:00:00Z',
  },
  {
    id: 'zone-este',
    name: 'Zona Este',
    description: 'Sectores del este incluyendo Las Américas, San José y zonas orientales',
    color: '#10b981',
    supervisor_id: '00000000-0000-0000-0000-000000000004',
    boundaries: {
      north: 10.26,
      south: 10.2,
      east: -67.56,
      west: -67.6,
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-09-20T00:00:00Z',
  },
  {
    id: 'zone-oeste',
    name: 'Zona Oeste',
    description: 'Sectores del oeste incluyendo La Morita, Turmero y zonas occidentales',
    color: '#f59e0b',
    supervisor_id: '00000000-0000-0000-0000-000000000005',
    boundaries: {
      north: 10.26,
      south: 10.2,
      east: -67.6,
      west: -67.64,
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-09-20T00:00:00Z',
  },
];

const ZoneManagement: React.FC = () => {
  const [zones, setZones] = useState<Zone[]>(mockZones);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    supervisor_id: '',
  });

  const handleSave = () => {
    if (editingZone) {
      // Update existing zone
      setZones(
        zones.map(z =>
          z.id === editingZone.id ? { ...z, ...formData, updated_at: new Date().toISOString() } : z
        )
      );
      toast.success('Zona actualizada exitosamente');
    } else {
      // Create new zone
      const newZone: Zone = {
        id: `zone-${Date.now()}`,
        ...formData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setZones([...zones, newZone]);
      toast.success('Nueva zona creada exitosamente');
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (zone: Zone) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name,
      description: zone.description || '',
      color: zone.color,
      supervisor_id: zone.supervisor_id || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (zoneId: string) => {
    setZones(zones.filter(z => z.id !== zoneId));
    toast.success('Zona eliminada exitosamente');
  };

  const resetForm = () => {
    setEditingZone(null);
    setFormData({
      name: '',
      description: '',
      color: '#3b82f6',
      supervisor_id: '',
    });
  };

  const supervisors = [
    { id: '00000000-0000-0000-0000-000000000002', name: 'María González' },
    { id: '00000000-0000-0000-0000-000000000003', name: 'Carlos Rodríguez' },
    { id: '00000000-0000-0000-0000-000000000004', name: 'Ana López' },
    { id: '00000000-0000-0000-0000-000000000005', name: 'Luis Fernández' },
  ];

  return (
    <div className="space-y-6">
      {/* User Assignment Section */}
      <UserZoneAssignment
        onAssignment={(userId, zoneId, role) => {
          console.log('Usuario asignado:', { userId, zoneId, role });
          // Here you would integrate with your actual data management
        }}
      />

      {/* Zone Management Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Gestión de Zonas Geográficas
              </CardTitle>
              <CardDescription>
                Administra las zonas donde operan las células de discipulado
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Zona
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{editingZone ? 'Editar Zona' : 'Nueva Zona'}</DialogTitle>
                  <DialogDescription>
                    {editingZone
                      ? 'Modifica los datos de la zona geográfica'
                      : 'Crea una nueva zona para organizar las células de discipulado'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="zone-name">Nombre de la Zona</Label>
                    <Input
                      id="zone-name"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ej: Zona Norte"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zone-description">Descripción</Label>
                    <Textarea
                      id="zone-description"
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe los sectores y límites de esta zona"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zone-supervisor">Supervisor</Label>
                    <Select
                      value={formData.supervisor_id}
                      onValueChange={value => setFormData({ ...formData, supervisor_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un supervisor" />
                      </SelectTrigger>
                      <SelectContent>
                        {supervisors.map(supervisor => (
                          <SelectItem key={supervisor.id} value={supervisor.id}>
                            {supervisor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zone-color">Color Identificativo</Label>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded border"
                        style={{ backgroundColor: formData.color }}
                      />
                      <Input
                        id="zone-color"
                        type="color"
                        value={formData.color}
                        onChange={e => setFormData({ ...formData, color: e.target.value })}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">{formData.color}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSave}>
                      <Save className="w-4 h-4 mr-2" />
                      {editingZone ? 'Actualizar' : 'Crear'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {zones.map(zone => (
              <div key={zone.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: zone.color }} />
                    <h3 className="font-semibold">{zone.name}</h3>
                    <Badge variant="secondary">
                      {supervisors.find(s => s.id === zone.supervisor_id)?.name || 'Sin supervisor'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(zone)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(zone.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {zone.description && (
                  <p className="text-sm text-muted-foreground mb-3">{zone.description}</p>
                )}

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-muted-foreground" />
                    <span>12 Células</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>156 Miembros</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-muted-foreground" />
                    <span>92% Asistencia</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ZoneManagement;
