import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Column, DataTable } from '@/components/ui/DataTable';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { ApiService } from '@/services/api.service';
import { DiscipleshipService } from '@/services/discipleship.service';
import type { CreateGroupRequest, DiscipleshipGroup } from '@/types/discipleship.types';
import { GeolocationInput, type GeolocationResult } from '@/components/ui/geolocation-input';
import { Calendar, Edit, Loader2, MapPin, Plus, Search, Trash2, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const ZONES = ['Zona Norte', 'Zona Sur', 'Zona Este', 'Zona Oeste', 'Zona Centro'];

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

const GroupManagement = () => {
  const [groups, setGroups] = useState<DiscipleshipGroup[]>([]);
  const [allGroups, setAllGroups] = useState<DiscipleshipGroup[]>([]); // Todos los grupos sin filtrar
  const [leaders, setLeaders] = useState<User[]>([]);
  const [supervisors, setSupervisors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<DiscipleshipGroup | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterZone, setFilterZone] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isFiltering, setIsFiltering] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateGroupRequest>({
    group_name: '',
    leader_id: '',
    supervisor_id: '',
    zone_name: '',
    meeting_day: '',
    meeting_time: '',
    meeting_location: '',
    meeting_address: '',
  });
  const [geolocation, setGeolocation] = useState<GeolocationResult | null>(null);

  // Cargar usuarios (solo una vez)
  const loadUsers = useCallback(async () => {
    try {
      const { users } = await ApiService.get<{ users: User[] }>('/users');
      const allUsers = (users || []).map(user => ({
        ...user,
        id: String(normalizeNullString(user.id) || ''),
        first_name: String(normalizeNullString(user.first_name) || ''),
        last_name: String(normalizeNullString(user.last_name) || ''),
        email: String(normalizeNullString(user.email) || ''),
        role: String(normalizeNullString(user.role) || ''),
      }));

      setLeaders(allUsers.filter(u => u.role !== 'pastor'));
      setSupervisors(
        allUsers.filter((u: User) => ['pastor', 'staff', 'supervisor'].includes(u.role))
      );
    } catch (error: unknown) {
      console.error('Error loading users:', error);
    }
  }, []);

  // Cargar grupos iniciales (solo una vez)
  const loadInitialGroups = useCallback(async () => {
    try {
      setLoading(true);
      const groupsResponse = await DiscipleshipService.getGroups({});

      const normalizedGroups = (groupsResponse.data || []).map(group => ({
        ...group,
        supervisor_id: normalizeNullString(group.supervisor_id),
        zone_name: normalizeNullString(group.zone_name),
        meeting_day: normalizeNullString(group.meeting_day),
        meeting_time: normalizeNullString(group.meeting_time),
        meeting_location: normalizeNullString(group.meeting_location),
      }));

      setAllGroups(normalizedGroups);
      setGroups(normalizedGroups);
    } catch (error: unknown) {
      console.error('Error loading groups:', error);
      toast.error('Error al cargar los grupos');
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar datos iniciales (solo una vez al montar)
  useEffect(() => {
    loadInitialGroups();
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtrar grupos localmente (sin recargar)
  useEffect(() => {
    setIsFiltering(true);
    const delayFilter = setTimeout(() => {
      let filtered = [...allGroups];

      // Filtro por zona
      if (filterZone !== 'all') {
        filtered = filtered.filter(group => normalizeNullString(group.zone_name) === filterZone);
      }

      // Filtro por estado
      if (filterStatus !== 'all') {
        filtered = filtered.filter(group => group.status === filterStatus);
      }

      // Filtro por búsqueda
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        filtered = filtered.filter(
          group =>
            group.group_name.toLowerCase().includes(searchLower) ||
            (group.leader_name && group.leader_name.toLowerCase().includes(searchLower))
        );
      }

      setGroups(filtered);
      setIsFiltering(false);
    }, 300);

    return () => {
      clearTimeout(delayFilter);
      setIsFiltering(false);
    };
  }, [searchTerm, filterZone, filterStatus, allGroups]);

  const handleOpenDialog = useCallback((group?: DiscipleshipGroup) => {
    if (group) {
      setEditingGroup(group);
      setFormData({
        group_name: String(group.group_name || ''),
        leader_id: String(normalizeNullString(group.leader_id) || ''),
        supervisor_id: String(normalizeNullString(group.supervisor_id) || ''),
        zone_name: String(normalizeNullString(group.zone_name) || ''),
        meeting_day: String(normalizeNullString(group.meeting_day) || ''),
        meeting_time: String(normalizeNullString(group.meeting_time) || ''),
        meeting_location: String(normalizeNullString(group.meeting_location) || ''),
        meeting_address: String(normalizeNullString(group.meeting_address) || ''),
        latitude: group.latitude || undefined,
        longitude: group.longitude || undefined,
      });
      // Cargar geolocalización si existe
      if (group.latitude && group.longitude) {
        setGeolocation({
          address: String(normalizeNullString(group.meeting_address) || normalizeNullString(group.meeting_location) || ''),
          latitude: group.latitude,
          longitude: group.longitude,
        });
      } else {
        setGeolocation(null);
      }
    } else {
      setEditingGroup(null);
      setFormData({
        group_name: '',
        leader_id: '',
        supervisor_id: '',
        zone_name: '',
        meeting_day: '',
        meeting_time: '',
        meeting_location: '',
        meeting_address: '',
      });
      setGeolocation(null);
    }
    setIsDialogOpen(true);
  }, []);

  const handleSubmit = async () => {
    if (!formData.group_name || !formData.leader_id) {
      toast.error('Nombre del grupo y líder son requeridos');
      return;
    }

    try {
      setSaving(true);

      // Preparar datos con geolocalización
      const submitData: CreateGroupRequest = {
        ...formData,
        meeting_address: geolocation?.address || formData.meeting_address || '',
        latitude: geolocation?.latitude,
        longitude: geolocation?.longitude,
        meeting_location: geolocation?.address || formData.meeting_location || '',
      };

      if (editingGroup) {
        await DiscipleshipService.updateGroup(editingGroup.id, submitData);
        toast.success('Grupo actualizado exitosamente');
      } else {
        await DiscipleshipService.createGroup(submitData);
        toast.success('Grupo creado exitosamente');
      }

      setIsDialogOpen(false);
      loadInitialGroups();
    } catch (error: unknown) {
      console.error('Error saving group:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar el grupo');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = useCallback(
    async (groupId: string) => {
      if (!confirm('¿Estás seguro de que deseas eliminar este grupo?')) {
        return;
      }

      try {
        await DiscipleshipService.deleteGroup(groupId);
        toast.success('Grupo eliminado exitosamente');
        loadInitialGroups();
      } catch (error: unknown) {
        console.error('Error deleting group:', error);
        toast.error(error instanceof Error ? error.message : 'Error al eliminar el grupo');
      }
    },
    [loadInitialGroups]
  );

  const getStatusBadge = useCallback((status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Activo</Badge>;
      case 'multiplying':
        return <Badge className="bg-blue-500">Multiplicando</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactivo</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }, []);

  // Definir columnas para DataTable
  const columns: Column<DiscipleshipGroup>[] = [
    {
      key: 'group_name',
      label: 'Grupo',
      render: group => <div className="font-medium whitespace-nowrap">{group.group_name}</div>,
      responsive: 'always',
      sortable: true,
    },
    {
      key: 'leader_name',
      label: 'Líder',
      render: group => (
        <div className="whitespace-nowrap">{group.leader_name || 'Sin asignar'}</div>
      ),
      responsive: 'always',
      sortable: true,
    },
    {
      key: 'zone_name',
      label: 'Zona',
      render: group => (
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <span className="whitespace-nowrap">
            {normalizeNullString(group.zone_name) || 'Sin zona'}
          </span>
        </div>
      ),
      responsive: 'md',
      sortable: true,
    },
    {
      key: 'meeting_day',
      label: 'Reunión',
      render: group => {
        const day = normalizeNullString(group.meeting_day);
        const time = normalizeNullString(group.meeting_time);

        // Formatear tiempo si es un timestamp ISO
        let formattedTime = '';
        if (time) {
          try {
            // Si es un timestamp ISO, extraer solo la hora
            if (time.includes('T')) {
              const date = new Date(time);
              if (!isNaN(date.getTime())) {
                formattedTime = date.toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                });
              } else {
                formattedTime = time;
              }
            } else {
              formattedTime = time;
            }
          } catch {
            formattedTime = time;
          }
        }

        return (
          <div className="flex items-center gap-1 text-sm">
            <Calendar className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <span className="whitespace-nowrap">
              {day || 'No definido'}
              {formattedTime && ` ${formattedTime}`}
            </span>
          </div>
        );
      },
      responsive: 'lg',
      sortable: true,
    },
    {
      key: 'active_members',
      label: 'Miembros',
      render: group => (
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <span className="whitespace-nowrap">
            {group.active_members || 0}/{group.member_count || 0}
          </span>
        </div>
      ),
      responsive: 'md',
      sortable: true,
    },
    {
      key: 'status',
      label: 'Estado',
      render: group => getStatusBadge(group.status),
      responsive: 'sm',
      sortable: true,
    },
  ];

  // Acciones para cada grupo
  const groupActions = (group: DiscipleshipGroup) => (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(group)}>
        <Edit className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleDelete(group.id)}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );

  // Render para móvil
  const mobileCardRender = (group: DiscipleshipGroup, actions?: React.ReactNode) => (
    <div className="p-4 border rounded-lg hover:bg-accent/50 transition-colors space-y-3">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-base truncate">{group.group_name}</h3>
          <p className="text-sm text-muted-foreground">
            Líder: {group.leader_name || 'Sin asignar'}
          </p>
        </div>
        <div className="flex flex-col gap-1 ml-2">{getStatusBadge(group.status)}</div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">Zona:</span>
          <p className="font-medium flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {normalizeNullString(group.zone_name) || 'Sin zona'}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">Miembros:</span>
          <p className="font-medium flex items-center gap-1">
            <Users className="w-3 h-3" />
            {group.active_members || 0}/{group.member_count || 0}
          </p>
        </div>
      </div>

      {normalizeNullString(group.meeting_day) &&
        (() => {
          const time = normalizeNullString(group.meeting_time);
          let formattedTime = '';
          if (time) {
            try {
              if (time.includes('T')) {
                const date = new Date(time);
                if (!isNaN(date.getTime())) {
                  formattedTime = date.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  });
                } else {
                  formattedTime = time;
                }
              } else {
                formattedTime = time;
              }
            } catch {
              formattedTime = time;
            }
          }
          return (
            <div className="text-sm">
              <span className="text-muted-foreground">Reunión: </span>
              <span className="font-medium flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {normalizeNullString(group.meeting_day)}
                {formattedTime && ` - ${formattedTime}`}
              </span>
            </div>
          );
        })()}

      {normalizeNullString(group.meeting_location) && (
        <div className="text-sm">
          <span className="text-muted-foreground">Ubicación: </span>
          <span className="font-medium flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {normalizeNullString(group.meeting_location)}
          </span>
        </div>
      )}

      <div className="flex justify-end items-center pt-2 border-t">{actions}</div>
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Gestión de Grupos de Discipulado
            </CardTitle>
            <CardDescription>Administra los grupos, asigna líderes y supervisores</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Grupo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingGroup ? 'Editar Grupo' : 'Crear Nuevo Grupo'}</DialogTitle>
                <DialogDescription>
                  {editingGroup
                    ? 'Modifica la información del grupo de discipulado'
                    : 'Completa la información para crear un nuevo grupo'}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="group_name">Nombre del Grupo *</Label>
                    <Input
                      id="group_name"
                      value={formData.group_name}
                      onChange={e => setFormData({ ...formData, group_name: e.target.value })}
                      placeholder="Ej: Célula Esperanza"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zone_name">Zona</Label>
                    <Select
                      value={String(normalizeNullString(formData.zone_name) || '')}
                      onValueChange={value => setFormData({ ...formData, zone_name: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar zona" />
                      </SelectTrigger>
                      <SelectContent>
                        {ZONES.map(zone => (
                          <SelectItem key={zone} value={zone}>
                            {zone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="leader_id">Líder *</Label>
                    <Select
                      value={String(normalizeNullString(formData.leader_id) || '')}
                      onValueChange={value => setFormData({ ...formData, leader_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar líder" />
                      </SelectTrigger>
                      <SelectContent>
                        {leaders.map(leader => (
                          <SelectItem key={String(leader.id)} value={String(leader.id)}>
                            {String(leader.first_name || '')} {String(leader.last_name || '')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="supervisor_id">Supervisor</Label>
                    <Select
                      value={formData.supervisor_id || 'none'}
                      onValueChange={value =>
                        setFormData({ ...formData, supervisor_id: value === 'none' ? '' : value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar supervisor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin supervisor</SelectItem>
                        {supervisors.map(sup => (
                          <SelectItem key={String(sup.id)} value={String(sup.id)}>
                            {String(sup.first_name || '')} {String(sup.last_name || '')} (
                            {String(sup.role || '')})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="meeting_day">Día de Reunión</Label>
                    <Select
                      value={String(normalizeNullString(formData.meeting_day) || '')}
                      onValueChange={value => setFormData({ ...formData, meeting_day: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar día" />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map(day => (
                          <SelectItem key={day} value={day}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="meeting_time">Hora</Label>
                    <Input
                      id="meeting_time"
                      type="time"
                      value={String(normalizeNullString(formData.meeting_time) || '')}
                      onChange={e => setFormData({ ...formData, meeting_time: e.target.value })}
                    />
                  </div>

                </div>

                <div className="space-y-2">
                  <GeolocationInput
                    value={geolocation || undefined}
                    onChange={(value) => {
                      setGeolocation(value);
                      if (value) {
                        setFormData({
                          ...formData,
                          meeting_address: value.address,
                          latitude: value.latitude,
                          longitude: value.longitude,
                          meeting_location: value.address,
                        });
                      } else {
                        setFormData({
                          ...formData,
                          meeting_address: '',
                          latitude: undefined,
                          longitude: undefined,
                        });
                      }
                    }}
                    label="Ubicación de Reunión"
                    placeholder="Buscar dirección o seleccionar en el mapa..."
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : editingGroup ? (
                    'Actualizar'
                  ) : (
                    'Crear Grupo'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por nombre o líder..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterZone} onValueChange={setFilterZone}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Filtrar por zona" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las zonas</SelectItem>
              {ZONES.map(zone => (
                <SelectItem key={zone} value={zone}>
                  {zone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="multiplying">Multiplicando</SelectItem>
              <SelectItem value="inactive">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabla de grupos */}
        <DataTable
          data={groups}
          columns={columns}
          actions={groupActions}
          loading={loading}
          emptyMessage="No se encontraron grupos"
          pagination={true}
          itemsPerPage={10}
          searchable={false}
          mobileCardRender={mobileCardRender}
        />
      </CardContent>
    </Card>
  );
};

export default GroupManagement;
