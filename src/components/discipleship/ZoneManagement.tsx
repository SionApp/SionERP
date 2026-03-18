import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAvailableSupervisors, useZones } from '@/hooks/useZones';
import { CreateZoneRequest, UpdateZoneRequest, Zone } from '@/types/discipleship.types';
import {
  AlertCircle,
  Building,
  Edit2,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Save,
  Target,
  Trash2,
  Users,
} from 'lucide-react';
import React, { useState } from 'react';
import UserZoneAssignment from './UserZoneAssignment';

// Helper para normalizar valores sql.NullString que vienen como {String, Valid}
const normalizeNullString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'String' in value && 'Valid' in value) {
    const nullString = value as { String: string; Valid: boolean };
    return nullString.Valid ? nullString.String : null;
  }
  return String(value);
};

const ZoneManagement: React.FC = () => {
  const { zones, zoneStats, loading, error, refetch, createZone, updateZone, deleteZone } =
    useZones();

  const { supervisors, loading: loadingSupervisors } = useAvailableSupervisors();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [zoneToDelete, setZoneToDelete] = useState<Zone | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    supervisor_id: '',
  });

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    setSaving(true);

    try {
      if (editingZone) {
        const updateData: UpdateZoneRequest = {
          name: formData.name,
          description: formData.description || undefined,
          color: formData.color,
          supervisor_id: formData.supervisor_id || undefined,
        };
        await updateZone(editingZone.id, updateData);
      } else {
        const createData: CreateZoneRequest = {
          name: formData.name,
          description: formData.description || undefined,
          color: formData.color,
          supervisor_id: formData.supervisor_id || undefined,
        };
        await createZone(createData);
      }

      setIsDialogOpen(false);
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (zone: Zone) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name,
      description: normalizeNullString(zone.description) || '',
      color: zone.color,
      supervisor_id: normalizeNullString(zone.supervisor_id) || '',
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (zone: Zone) => {
    setZoneToDelete(zone);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (zoneToDelete) {
      await deleteZone(zoneToDelete.id);
      setIsDeleteDialogOpen(false);
      setZoneToDelete(null);
    }
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

  const getZoneStatsById = (zoneId: string) => {
    return zoneStats.find(s => s.zone_id === zoneId);
  };

  const getSupervisorName = (supervisorId?: string | null | unknown) => {
    const normalizedId = normalizeNullString(supervisorId);
    if (!normalizedId) return 'Sin supervisor';
    const supervisor = supervisors.find(s => s.id === normalizedId);
    return supervisor?.full_name || supervisor?.first_name && supervisor?.last_name 
      ? `${supervisor.first_name} ${supervisor.last_name}`.trim()
      : supervisor?.email || 'Sin supervisor';
  };

  if (loading && zones.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center text-center">
              <AlertCircle className="w-12 h-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error al cargar zonas</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={refetch}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <UserZoneAssignment />

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
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
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
                        : 'Crea una nueva zona para organizar las células'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="zone-name">Nombre de la Zona *</Label>
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
                        placeholder="Describe los sectores de esta zona"
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="zone-supervisor">Supervisor</Label>
                      <Select
                        value={formData.supervisor_id}
                        onValueChange={value => setFormData({ ...formData, supervisor_id: value })}
                        disabled={loadingSupervisors}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un supervisor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Sin supervisor</SelectItem>
                          {Array.isArray(supervisors) && supervisors.map(supervisor => (
                            <SelectItem key={supervisor.id} value={supervisor.id}>
                              {supervisor.full_name || `${supervisor.first_name || ''} ${supervisor.last_name || ''}`.trim() || supervisor.email}
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
                      <Button onClick={handleSave} disabled={saving || !formData.name.trim()}>
                        {saving ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        {editingZone ? 'Actualizar' : 'Crear'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {zones.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="mb-2">No hay zonas configuradas</p>
              <p className="text-sm">Crea la primera zona para comenzar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {zones.map(zone => {
                const stats = getZoneStatsById(zone.id);

                return (
                  <div key={zone.id} className="border rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: zone.color }}
                        />
                        <h3 className="font-semibold">{zone.name}</h3>
                        <Badge variant="secondary">{getSupervisorName(zone.supervisor_id)}</Badge>
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(zone)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteClick(zone)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {normalizeNullString(zone.description) && (
                      <p className="text-sm text-muted-foreground mb-3">{normalizeNullString(zone.description)}</p>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center gap-2 bg-accent/20 rounded-md p-2">
                        <Building className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{stats?.total_groups ?? zone.total_groups ?? 0} Células</span>
                      </div>
                      <div className="flex items-center gap-2 bg-accent/20 rounded-md p-2">
                        <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{stats?.total_members ?? zone.total_members ?? 0} Miembros</span>
                      </div>
                      <div className="flex items-center gap-2 bg-accent/20 rounded-md p-2 col-span-2 sm:col-span-1">
                        <Target className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">
                          {(stats?.avg_attendance ?? zone.avg_attendance ?? 0).toFixed(0)}%
                          Asistencia
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar zona?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la zona "{zoneToDelete?.name}". Los grupos y usuarios quedarán
              sin zona asignada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ZoneManagement;
