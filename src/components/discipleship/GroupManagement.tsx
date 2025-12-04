import { Badge } from '@/components/ui/badge';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ApiService } from '@/services/api.service';
import { DiscipleshipService } from '@/services/discipleship.service';
import type { CreateGroupRequest, DiscipleshipGroup } from '@/types/discipleship.types';
import { Calendar, Edit, Loader2, MapPin, Plus, Search, Trash2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
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

const GroupManagement = () => {
  const [groups, setGroups] = useState<DiscipleshipGroup[]>([]);
  const [leaders, setLeaders] = useState<User[]>([]);
  const [supervisors, setSupervisors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<DiscipleshipGroup | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterZone, setFilterZone] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState<CreateGroupRequest>({
    group_name: '',
    leader_id: '',
    supervisor_id: '',
    zone_name: '',
    meeting_day: '',
    meeting_time: '',
    meeting_location: '',
  });

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Cargar grupos
      const groupsResponse = await DiscipleshipService.getGroups({
        zone_name: filterZone !== 'all' ? filterZone : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        search: searchTerm || undefined,
      });
      setGroups(groupsResponse.data || []);

      // Car{gar usuarios para líderes y supervisores
      const { users } = await ApiService.get<{ users: User[] }>('/users');
      console.log('users', users);
      const allUsers = users || [];

      // Filtrar líderes potenciales (todos los usuarios activos)
      setLeaders(allUsers.filter(u => u.role !== 'pastor'));

      // Filtrar supervisores (staff y supervisors)
      setSupervisors(
        allUsers.filter((u: User) => ['pastor', 'staff', 'supervisor'].includes(u.role))
      );
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  // Aplicar filtros
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(delaySearch);
  }, [searchTerm, filterZone, filterStatus]);

  const handleOpenDialog = (group?: DiscipleshipGroup) => {
    if (group) {
      setEditingGroup(group);
      setFormData({
        group_name: group.group_name,
        leader_id: group.leader_id,
        supervisor_id: group.supervisor_id || '',
        zone_name: group.zone_name || '',
        meeting_day: group.meeting_day || '',
        meeting_time: group.meeting_time || '',
        meeting_location: group.meeting_location || '',
      });
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
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.group_name || !formData.leader_id) {
      toast.error('Nombre del grupo y líder son requeridos');
      return;
    }

    try {
      setSaving(true);

      if (editingGroup) {
        await DiscipleshipService.updateGroup(editingGroup.id, formData);
        toast.success('Grupo actualizado exitosamente');
      } else {
        await DiscipleshipService.createGroup(formData);
        toast.success('Grupo creado exitosamente');
      }

      setIsDialogOpen(false);
      loadData();
    } catch (error: any) {
      console.error('Error saving group:', error);
      toast.error(error.message || 'Error al guardar el grupo');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (groupId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este grupo?')) {
      return;
    }

    try {
      await DiscipleshipService.deleteGroup(groupId);
      toast.success('Grupo eliminado exitosamente');
      loadData();
    } catch (error: any) {
      console.error('Error deleting group:', error);
      toast.error(error.message || 'Error al eliminar el grupo');
    }
  };

  const getStatusBadge = (status: string) => {
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
  };

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
                      value={formData.zone_name}
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
                      value={formData.leader_id}
                      onValueChange={value => setFormData({ ...formData, leader_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar líder" />
                      </SelectTrigger>
                      <SelectContent>
                        {leaders.map(leader => (
                          <SelectItem key={leader.id} value={leader.id}>
                            {leader.first_name} {leader.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="supervisor_id">Supervisor</Label>
                    <Select
                      value={formData.supervisor_id}
                      onValueChange={value => setFormData({ ...formData, supervisor_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar supervisor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Sin supervisor</SelectItem>
                        {supervisors.map(sup => (
                          <SelectItem key={sup.id} value={sup.id}>
                            {sup.first_name} {sup.last_name} ({sup.role})
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
                      value={formData.meeting_day}
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
                      value={formData.meeting_time}
                      onChange={e => setFormData({ ...formData, meeting_time: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="meeting_location">Ubicación</Label>
                    <Input
                      id="meeting_location"
                      value={formData.meeting_location}
                      onChange={e => setFormData({ ...formData, meeting_location: e.target.value })}
                      placeholder="Dirección o lugar"
                    />
                  </div>
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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grupo</TableHead>
                <TableHead>Líder</TableHead>
                <TableHead>Zona</TableHead>
                <TableHead>Reunión</TableHead>
                <TableHead>Miembros</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No se encontraron grupos
                  </TableCell>
                </TableRow>
              ) : (
                groups.map(group => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">{group.group_name}</TableCell>
                    <TableCell>{group.leader_name || 'Sin asignar'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        {group.zone_name || 'Sin zona'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        {group.meeting_day || 'No definido'} {group.meeting_time || ''}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        {group.active_members || 0}/{group.member_count || 0}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(group.status)}</TableCell>
                    <TableCell className="text-right">
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Contador */}
        <div className="mt-4 text-sm text-muted-foreground">Mostrando {groups.length} grupos</div>
      </CardContent>
    </Card>
  );
};

export default GroupManagement;
