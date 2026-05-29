import { Can } from '@/components/Can';
import { ROLE_LEVELS } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { PaginatedTable } from '@/components/ui/paginated-table';
import { DiscipleshipService } from '@/services/discipleship.service';
import type { CreateGroupRequest, DiscipleshipGroup } from '@/types/discipleship.types';
import { useZones } from '@/hooks/useZones';
import { usePermissions } from '@/hooks/usePermissions';
import {
  GeolocationInput,
  type GeolocationResult,
  type TypeGeolocalization,
} from '@/components/ui/geolocation-input';
import { buildGroupsColumns } from '@/pages/dashboard/groups/groups-columns';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type PaginationState,
} from '@tanstack/react-table';
import { ChevronLeft, Loader2, Plus, Search, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { GroupMembers } from './GroupMembers';

const getNumericCoord = (val: number | TypeGeolocalization | undefined): number | undefined => {
  if (val === undefined || val === null) return undefined;
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && 'Float64' in val) return val.Float64;
  return undefined;
};

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

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
  const { zones } = useZones();
  const { hasAccess, isLoading: isLoadingPermissions } = usePermissions();

  const canEditGroup = hasAccess(ROLE_LEVELS.supervisor);
  const canDeleteGroup = hasAccess(ROLE_LEVELS.staff);

  const [groups, setGroups] = useState<DiscipleshipGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [leaders, setLeaders] = useState<User[]>([]);
  const [supervisors, setSupervisors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<DiscipleshipGroup | null>(null);
  const [selectedGroupForMembers, setSelectedGroupForMembers] = useState<DiscipleshipGroup | null>(
    null
  );

  // Filters
  const [search, setSearch] = useState('');
  const [filterZone, setFilterZone] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    status: 'active',
  });
  const [geolocation, setGeolocation] = useState<GeolocationResult | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      const usersData = await DiscipleshipService.getUsersForHierarchy();
      const allUsers = (usersData || []).map(user => ({
        id: String(normalizeNullString(user.id) || ''),
        first_name: String(normalizeNullString(user.first_name) || ''),
        last_name: String(normalizeNullString(user.last_name) || ''),
        email: String(normalizeNullString(user.email) || ''),
        role: String(normalizeNullString(user.role) || ''),
      }));
      setLeaders(allUsers.filter(u => u.role !== 'pastor'));
      setSupervisors(allUsers.filter(u => ['pastor', 'staff', 'supervisor'].includes(u.role)));
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }, []);

  const loadGroups = useCallback(
    async (p: number, lim: number, q: string, zone: string, status: string) => {
      try {
        setLoading(true);
        const res = await DiscipleshipService.getGroups({
          page: p,
          limit: lim,
          search: q || undefined,
          zone_id: zone !== 'all' ? zone : undefined,
          status: status !== 'all' ? status : undefined,
        });

        const normalized = (res.data || []).map(g => ({
          ...g,
          supervisor_id: normalizeNullString(g.supervisor_id),
          zone_name: normalizeNullString(g.zone_name),
          meeting_day: normalizeNullString(g.meeting_day),
          meeting_time: normalizeNullString(g.meeting_time),
          meeting_location: normalizeNullString(g.meeting_location),
        }));

        setGroups(normalized);
        setTotal(res.total ?? 0);
      } catch {
        toast.error('Error al cargar los grupos');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadGroups(page, limit, search, filterZone, filterStatus);
  }, [page, limit, filterZone, filterStatus, loadGroups]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      loadGroups(1, limit, value, filterZone, filterStatus);
    }, 400);
  };

  const handleFilterChange = (type: 'zone' | 'status', value: string) => {
    if (type === 'zone') setFilterZone(value);
    else setFilterStatus(value);
    setPage(1);
  };

  const handleOpenDialog = useCallback((group?: DiscipleshipGroup) => {
    if (group) {
      setEditingGroup(group);
      setFormData({
        group_name: String(group.group_name || ''),
        leader_id: String(normalizeNullString(group.leader_id) || ''),
        supervisor_id: String(normalizeNullString(group.supervisor_id) || ''),
        zone_name: String(normalizeNullString(group.zone_name) || ''),
        zone_id: String(normalizeNullString(group.zone_id) || ''),
        meeting_day: String(normalizeNullString(group.meeting_day) || ''),
        meeting_time: String(normalizeNullString(group.meeting_time) || ''),
        meeting_location: String(normalizeNullString(group.meeting_location) || ''),
        meeting_address: String(normalizeNullString(group.meeting_address) || ''),
        status: group.status || 'active',
        latitude: group.latitude || undefined,
        longitude: group.longitude || undefined,
      });
      if (group.latitude && group.longitude) {
        setGeolocation({
          address: String(
            normalizeNullString(group.meeting_address) ||
              normalizeNullString(group.meeting_location) ||
              ''
          ),
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
        status: 'active',
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
      const matchedZone = zones.find(
        z => z.name === formData.zone_name || z.id === formData.zone_name
      );
      const submitData: CreateGroupRequest = {
        ...formData,
        zone_id: matchedZone?.id || undefined,
        zone_name: matchedZone?.name || formData.zone_name || '',
        meeting_address: geolocation?.address || formData.meeting_address || '',
        latitude: getNumericCoord(geolocation?.latitude) || formData.latitude,
        longitude: getNumericCoord(geolocation?.longitude) || formData.longitude,
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
      loadGroups(page, limit, search, filterZone, filterStatus);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar el grupo');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = useCallback(
    async (group: DiscipleshipGroup) => {
      if (!confirm(`¿Eliminár el grupo "${group.group_name}"?`)) return;
      try {
        await DiscipleshipService.deleteGroup(group.id);
        toast.success('Grupo eliminado exitosamente');
        loadGroups(page, limit, search, filterZone, filterStatus);
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'Error al eliminar el grupo');
      }
    },
    [loadGroups, page, limit, search, filterZone, filterStatus]
  );

  const columns = useMemo(
    () =>
      buildGroupsColumns({
        onManageMembers: g => setSelectedGroupForMembers(g),
        onEdit: g => handleOpenDialog(g),
        onDelete: handleDelete,
        canEdit: canEditGroup,
        canDelete: canDeleteGroup,
      }),
    [handleOpenDialog, handleDelete, canEditGroup, canDeleteGroup]
  );

  const [pagination] = useState<PaginationState>({ pageIndex: 0, pageSize: limit });

  const table = useReactTable({
    data: groups,
    columns,
    state: { pagination },
    manualPagination: true,
    pageCount: Math.ceil(total / limit),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (selectedGroupForMembers) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedGroupForMembers(null)}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Volver a grupos
            </Button>
          </div>
          <GroupMembers
            groupId={selectedGroupForMembers.id}
            groupName={selectedGroupForMembers.group_name}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b px-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl leading-none">
              <Users className="w-5 h-5" />
              Gestión de Grupos
            </CardTitle>
            <CardDescription className="mt-1">
              {total} grupo{total !== 1 ? 's' : ''} en total
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="h-8 w-full pl-8 sm:w-56"
                placeholder="Buscar grupos..."
                value={search}
                onChange={e => handleSearchChange(e.target.value)}
              />
            </div>
            <Can I={ROLE_LEVELS.supervisor}>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">Nuevo Grupo</span>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            {zones.map(z => (
                              <SelectItem key={z.id} value={z.name}>
                                {z.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            setFormData({
                              ...formData,
                              supervisor_id: value === 'none' ? '' : value,
                            })
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

                      <div className="space-y-2">
                        <Label htmlFor="status">Estado</Label>
                        <Select
                          value={formData.status || 'active'}
                          onValueChange={value => setFormData({ ...formData, status: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Activo</SelectItem>
                            <SelectItem value="inactive">Inactivo</SelectItem>
                            <SelectItem value="multiplying">Multiplicando</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                        onChange={value => {
                          setGeolocation(value);
                          if (value) {
                            setFormData({
                              ...formData,
                              meeting_address: value.address,
                              latitude: getNumericCoord(value.latitude),
                              longitude: getNumericCoord(value.longitude),
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
            </Can>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 px-0 py-0">
        {/* Filter bar */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Select value={filterZone} onValueChange={v => handleFilterChange('zone', v)}>
            <SelectTrigger className="h-8 w-auto gap-1 text-sm">
              <span className="text-muted-foreground">Zona:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="all">Todas</SelectItem>
              {zones.map(zone => (
                <SelectItem key={zone.id} value={zone.id}>
                  {zone.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={v => handleFilterChange('status', v)}>
            <SelectTrigger className="h-8 w-auto gap-1 text-sm">
              <span className="text-muted-foreground">Estado:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="multiplying">Multiplicando</SelectItem>
              <SelectItem value="inactive">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!isLoadingPermissions && (
          <PaginatedTable
            table={table}
            loading={loading}
            emptyMessage="No se encontraron grupos"
            serverPage={page}
            serverTotal={total}
            serverLimit={limit}
            onPageChange={setPage}
            onLimitChange={lim => {
              setLimit(lim);
              setPage(1);
            }}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default GroupManagement;
