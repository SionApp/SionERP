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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Save,
  MapPin,
  Clock,
  Calendar,
  User,
  Target,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { DiscipleshipGroup } from '@/types/discipleship.types';
import { mockGroups } from '@/mocks/discipleship/data.mock';

// Mock supervisors and leaders data
const mockSupervisors = [
  { id: '00000000-0000-0000-0000-000000000008', name: 'Patricia Jiménez', zone: 'Zona Norte' },
  { id: '00000000-0000-0000-0000-000000000009', name: 'Ricardo Morales', zone: 'Zona Norte' },
  { id: '00000000-0000-0000-0000-000000000012', name: 'Carmen Torres', zone: 'Zona Sur' },
  { id: '00000000-0000-0000-0000-000000000013', name: 'Miguel Santos', zone: 'Zona Este' },
  { id: '00000000-0000-0000-0000-000000000014', name: 'Elena Vargas', zone: 'Zona Oeste' },
];

const mockLeaders = [
  { id: 'leader-001', name: 'Roberto Silva', zone: 'Zona Norte', available: true },
  { id: 'leader-002', name: 'Carmen Torres', zone: 'Zona Norte', available: false },
  { id: 'leader-003', name: 'Miguel Herrera', zone: 'Zona Norte', available: true },
  { id: 'leader-004', name: 'Ana Ruiz', zone: 'Zona Sur', available: true },
  { id: 'leader-005', name: 'Pedro Moreno', zone: 'Zona Sur', available: false },
  { id: 'leader-006', name: 'Laura Jiménez', zone: 'Zona Este', available: true },
  { id: 'leader-007', name: 'José García', zone: 'Zona Oeste', available: true },
];

const zones = ['Zona Norte', 'Zona Sur', 'Zona Este', 'Zona Oeste'];
const meetingDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const statusOptions = [
  { value: 'active', label: 'Activo', color: 'bg-green-100 text-green-800' },
  { value: 'multiplying', label: 'Multiplicando', color: 'bg-blue-100 text-blue-800' },
  { value: 'inactive', label: 'Inactivo', color: 'bg-gray-100 text-gray-800' },
  { value: 'planned', label: 'Planificado', color: 'bg-yellow-100 text-yellow-800' },
];

const GroupManagement: React.FC = () => {
  const [groups, setGroups] = useState<DiscipleshipGroup[]>(mockGroups);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<DiscipleshipGroup | null>(null);
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const [formData, setFormData] = useState({
    group_name: '',
    leader_id: '',
    supervisor_id: '',
    meeting_location: '',
    meeting_address: '',
    meeting_day: '',
    meeting_time: '',
    zone_name: '',
    status: 'planned' as 'active' | 'inactive' | 'multiplying' | 'planned',
    member_count: 0,
    active_members: 0,
  });

  const resetForm = () => {
    setFormData({
      group_name: '',
      leader_id: '',
      supervisor_id: '',
      meeting_location: '',
      meeting_address: '',
      meeting_day: '',
      meeting_time: '',
      zone_name: '',
      status: 'planned' as 'active' | 'inactive' | 'multiplying' | 'planned',
      member_count: 0,
      active_members: 0,
    });
    setEditingGroup(null);
  };

  const handleSave = () => {
    if (editingGroup) {
      // Update existing group
      setGroups(
        groups.map(g =>
          g.id === editingGroup.id ? { ...g, ...formData, updated_at: new Date().toISOString() } : g
        )
      );
      toast.success('Grupo actualizado exitosamente');
    } else {
      // Create new group
      const newGroup: DiscipleshipGroup = {
        id: `group-${Date.now()}`,
        ...formData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setGroups([...groups, newGroup]);
      toast.success('Nuevo grupo creado exitosamente');
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (group: DiscipleshipGroup) => {
    setEditingGroup(group);
    setFormData({
      group_name: group.group_name,
      leader_id: group.leader_id || '',
      supervisor_id: group.supervisor_id || '',
      meeting_location: group.meeting_location || '',
      meeting_address: group.meeting_address || '',
      meeting_day: group.meeting_day || '',
      meeting_time: group.meeting_time || '',
      zone_name: group.zone_name || '',
      status: group.status || 'planned',
      member_count: group.member_count || 0,
      active_members: group.active_members || 0,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (groupId: string) => {
    setGroups(groups.filter(g => g.id !== groupId));
    toast.success('Grupo eliminado exitosamente');
  };

  const filteredGroups = groups.filter(group => {
    if (selectedZone !== 'all' && group.zone_name !== selectedZone) return false;
    if (selectedStatus !== 'all' && group.status !== selectedStatus) return false;
    return true;
  });

  const getLeaderName = (leaderId: string) => {
    return mockLeaders.find(l => l.id === leaderId)?.name || 'Sin asignar';
  };

  const getSupervisorName = (supervisorId: string) => {
    return mockSupervisors.find(s => s.id === supervisorId)?.name || 'Sin asignar';
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = statusOptions.find(s => s.value === status);
    return (
      <Badge className={statusConfig?.color || 'bg-gray-100 text-gray-800'}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

  const availableLeaders = mockLeaders.filter(
    leader => leader.available && (formData.zone_name === '' || leader.zone === formData.zone_name)
  );

  const availableSupervisors = mockSupervisors.filter(
    supervisor => formData.zone_name === '' || supervisor.zone === formData.zone_name
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Gestión de Grupos Familiares
              </CardTitle>
              <CardDescription>
                Administra todas las células de discipulado, asigna líderes y supervisores
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Grupo
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingGroup ? 'Editar Grupo Familiar' : 'Nuevo Grupo Familiar'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingGroup
                      ? 'Modifica los datos del grupo de discipulado'
                      : 'Crea un nuevo grupo familiar y asigna todo el personal necesario'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm">Información Básica</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="group-name">Nombre del Grupo</Label>
                        <Input
                          id="group-name"
                          value={formData.group_name}
                          onChange={e => setFormData({ ...formData, group_name: e.target.value })}
                          placeholder="Ej: Célula Esperanza"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zone">Zona</Label>
                        <Select
                          value={formData.zone_name}
                          onValueChange={value =>
                            setFormData({
                              ...formData,
                              zone_name: value,
                              leader_id: '',
                              supervisor_id: '',
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una zona" />
                          </SelectTrigger>
                          <SelectContent>
                            {zones.map(zone => (
                              <SelectItem key={zone} value={zone}>
                                {zone}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">Estado del Grupo</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map(status => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  {/* Personnel Assignment */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm">Asignación de Personal</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="supervisor">Supervisor Auxiliar</Label>
                        <Select
                          value={formData.supervisor_id}
                          onValueChange={value =>
                            setFormData({ ...formData, supervisor_id: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona supervisor" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableSupervisors.map(supervisor => (
                              <SelectItem key={supervisor.id} value={supervisor.id}>
                                {supervisor.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="leader">Líder del Grupo</Label>
                        <Select
                          value={formData.leader_id}
                          onValueChange={value => setFormData({ ...formData, leader_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona líder" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableLeaders.map(leader => (
                              <SelectItem key={leader.id} value={leader.id}>
                                {leader.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {formData.zone_name && availableLeaders.length === 0 && (
                      <p className="text-sm text-orange-600">
                        ⚠️ No hay líderes disponibles en esta zona
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Meeting Information */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm">Información de Reuniones</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="meeting-day">Día de Reunión</Label>
                        <Select
                          value={formData.meeting_day}
                          onValueChange={value => setFormData({ ...formData, meeting_day: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona día" />
                          </SelectTrigger>
                          <SelectContent>
                            {meetingDays.map(day => (
                              <SelectItem key={day} value={day}>
                                {day}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="meeting-time">Hora de Reunión</Label>
                        <Input
                          id="meeting-time"
                          type="time"
                          value={formData.meeting_time}
                          onChange={e => setFormData({ ...formData, meeting_time: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="meeting-location">Lugar de Reunión</Label>
                      <Input
                        id="meeting-location"
                        value={formData.meeting_location}
                        onChange={e =>
                          setFormData({ ...formData, meeting_location: e.target.value })
                        }
                        placeholder="Ej: Casa de María, Centro Comunitario"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="meeting-address">Dirección Completa</Label>
                      <Textarea
                        id="meeting-address"
                        value={formData.meeting_address}
                        onChange={e =>
                          setFormData({ ...formData, meeting_address: e.target.value })
                        }
                        placeholder="Dirección completa para ubicación en mapa"
                        rows={2}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Members Information */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm">Información de Miembros</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="total-members">Total de Miembros</Label>
                        <Input
                          id="total-members"
                          type="number"
                          min="0"
                          value={formData.member_count}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              member_count: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="active-members">Miembros Activos</Label>
                        <Input
                          id="active-members"
                          type="number"
                          min="0"
                          max={formData.member_count}
                          value={formData.active_members}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              active_members: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSave}>
                      <Save className="w-4 h-4 mr-2" />
                      {editingGroup ? 'Actualizar' : 'Crear Grupo'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="space-y-2">
              <Label>Filtrar por Zona</Label>
              <Select value={selectedZone} onValueChange={setSelectedZone}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las Zonas</SelectItem>
                  {zones.map(zone => (
                    <SelectItem key={zone} value={zone}>
                      {zone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Filtrar por Estado</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Estados</SelectItem>
                  {statusOptions.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Groups Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Zona</TableHead>
                  <TableHead>Líder</TableHead>
                  <TableHead>Supervisor</TableHead>
                  <TableHead>Reunión</TableHead>
                  <TableHead>Miembros</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.map(group => (
                  <TableRow key={group.id}>
                    <TableCell>
                      <div>
                        <div className="font-semibold">{group.group_name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {group.meeting_location || 'Sin ubicación'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{group.zone_name}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        {getLeaderName(group.leader_id || '')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-muted-foreground" />
                        {getSupervisorName(group.supervisor_id || '')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {group.meeting_day || 'No definido'}
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {group.meeting_time || 'No definida'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">
                          {group.active_members}/{group.member_count}
                        </div>
                        <div className="text-muted-foreground">activos/total</div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(group.status || 'planned')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(group)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(group.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredGroups.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No se encontraron grupos con los filtros seleccionados</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Total Grupos</span>
            </div>
            <p className="text-2xl font-bold">{groups.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">Activos</span>
            </div>
            <p className="text-2xl font-bold">{groups.filter(g => g.status === 'active').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">Multiplicando</span>
            </div>
            <p className="text-2xl font-bold">
              {groups.filter(g => g.status === 'multiplying').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium">Necesitan Atención</span>
            </div>
            <p className="text-2xl font-bold">
              {groups.filter(g => g.status === 'inactive').length}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GroupManagement;
