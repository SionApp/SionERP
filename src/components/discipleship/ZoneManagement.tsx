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
import { ZoneEditor } from '@/components/zones/ZoneEditor';
import { useAvailableSupervisors, useZones } from '@/hooks/useZones';
import {
  CreateZoneRequest,
  UpdateZoneRequest,
  Zone,
  ZoneBoundaries,
  ZoneGeometry,
} from '@/types/discipleship.types';
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
  const [isMapEditorOpen, setIsMapEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    color: string;
    supervisor_id: string;
    boundaries: ZoneGeometry | ZoneBoundaries | null;
  }>({
    name: '',
    description: '',
    color: '#3b82f6',
    supervisor_id: '',
    boundaries: null,
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
          boundaries: (formData.boundaries as ZoneGeometry) || undefined,
        };
        await updateZone(editingZone.id, updateData);
      } else {
        const createData: CreateZoneRequest = {
          name: formData.name,
          description: formData.description || undefined,
          color: formData.color,
          supervisor_id: formData.supervisor_id || undefined,
          boundaries: (formData.boundaries as ZoneGeometry) || undefined,
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
      boundaries: zone.boundaries || null,
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
      boundaries: null,
    });
  };

  const getZoneStatsById = (zoneId: string) => {
    return zoneStats.find(s => s.zone_id === zoneId);
  };

  const getSupervisorName = (supervisorId?: string | null | unknown) => {
    const normalizedId = normalizeNullString(supervisorId);
    if (!normalizedId) return 'Sin supervisor';
    const supervisor = supervisors.find(s => s.id === normalizedId);
    return supervisor?.full_name || (supervisor?.first_name && supervisor?.last_name)
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                <MapPin className="w-5 h-5 flex-shrink-0 text-blue-500" />
                <span>Gestión de Zonas Geográficas</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Administra las zonas donde operan las células de discipulado
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={refetch}
                disabled={loading}
                className="flex-1 md:flex-none"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm} size="sm" className="flex-1 md:flex-none">
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
                        value={formData.supervisor_id || 'none'}
                        onValueChange={value =>
                          setFormData({ ...formData, supervisor_id: value === 'none' ? '' : value })
                        }
                        disabled={loadingSupervisors}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un supervisor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin supervisor</SelectItem>
                          {Array.isArray(supervisors) &&
                            supervisors.map(supervisor => (
                              <SelectItem key={supervisor.id} value={supervisor.id}>
                                {supervisor.full_name ||
                                  `${supervisor.first_name || ''} ${supervisor.last_name || ''}`.trim() ||
                                  supervisor.email}
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

                    <div className="space-y-2">
                      <Label>Área de la Zona</Label>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => setIsMapEditorOpen(true)}
                      >
                        <MapPin className="w-4 h-4 mr-2" />
                        {formData.boundaries
                          ? 'Editar polígono en el mapa'
                          : 'Definir área en el mapa (Opcional)'}
                      </Button>
                      {formData.boundaries && (
                        <p className="text-xs text-green-600 mt-1">
                          Polígono definido correctamente.
                        </p>
                      )}
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
                  <div
                    key={zone.id}
                    className="p-4 border rounded-xl hover:bg-accent/50 transition-all space-y-4 shadow-sm"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
                          style={{ backgroundColor: zone.color }}
                        />
                        <div className="min-w-0">
                          <h3 className="font-bold text-base sm:text-lg truncate">{zone.name}</h3>
                          <Badge
                            variant="secondary"
                            className="mt-1 font-normal text-[10px] sm:text-xs"
                          >
                            {getSupervisorName(zone.supervisor_id)}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(zone)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteClick(zone)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {normalizeNullString(zone.description) && (
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                        {normalizeNullString(zone.description)}
                      </p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="flex items-center gap-3 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100/50 dark:border-blue-800/30 rounded-xl p-3">
                        <Building className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                            Células
                          </p>
                          <p className="text-base font-bold text-blue-700 dark:text-blue-300">
                            {stats?.total_groups ?? zone.total_groups ?? 0}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-100/50 dark:border-emerald-800/30 rounded-xl p-3">
                        <Users className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            Miembros
                          </p>
                          <p className="text-base font-bold text-emerald-700 dark:text-emerald-300">
                            {stats?.total_members ?? zone.total_members ?? 0}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-amber-50/50 dark:bg-amber-900/20 border border-amber-100/50 dark:border-amber-800/30 rounded-xl p-3">
                        <Target className="w-5 h-5 text-amber-500 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                            Asistencia
                          </p>
                          <p className="text-base font-bold text-amber-700 dark:text-amber-300">
                            {(stats?.avg_attendance ?? zone.avg_attendance ?? 0).toFixed(0)}%
                          </p>
                        </div>
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

      <Dialog open={isMapEditorOpen} onOpenChange={setIsMapEditorOpen}>
        <DialogContent className="sm:max-w-[700px] p-0 w-full">
          <div className="p-4 bg-muted/40 border-b">
            <DialogTitle>Dibujar área de la zona</DialogTitle>
          </div>
          <div className="p-4">
            <ZoneEditor
              initialBoundaries={formData.boundaries as GeoJSON.Polygon | null}
              existingZones={zones}
              editingZoneId={editingZone?.id}
              onSave={boundaries => {
                setFormData(prev => ({ ...prev, boundaries }));
                setIsMapEditorOpen(false);
              }}
              onCancel={() => setIsMapEditorOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ZoneManagement;
