import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DataTable, Column } from '@/components/ui/DataTable';
import { UserPlus, Search, MapPin, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useZones } from '@/hooks/useZones';
import { useDiscipleshipLevels } from '@/hooks/useDiscipleshipLevels';
import { ApiService } from '@/services/api.service';
import { ZonesService } from '@/services/zones.service';
import { normalizeNullString } from '@/lib/utils';
import { getDiscipleshipLevelConfig } from '@/lib/discipleship';

interface AssignmentUser {
  id: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone: string;
  role: string;
  is_active: boolean;
  zone_name?: string;
  zone_id?: string;
  discipleship_level?: number;
  created_at: string;
  updated_at: string;
}

interface UserZoneAssignmentProps {
  onAssignment?: (userId: string, zoneId: string, role?: string) => void;
}

const UserZoneAssignment: React.FC<UserZoneAssignmentProps> = ({ onAssignment }) => {
  const { zones, loading: zonesLoading } = useZones();
  const { levels: discipleshipLevels, loading: levelsLoading } = useDiscipleshipLevels({
    autoLoad: true,
  });
  const [users, setUsers] = useState<AssignmentUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedZone, setSelectedZone] = useState('all');
  const [selectedRole, setSelectedRole] = useState<string>('keep');
  const [selectedUser, setSelectedUser] = useState<AssignmentUser | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [assignZoneId, setAssignZoneId] = useState<string | undefined>(undefined);
  const [assigning, setAssigning] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const response = await ApiService.get<{ users: AssignmentUser[] } | AssignmentUser[]>(
        '/users'
      );

      let userList: AssignmentUser[] = [];
      if (Array.isArray(response)) {
        userList = response as AssignmentUser[];
      } else if (response && typeof response === 'object' && 'users' in response) {
        userList = (response.users as AssignmentUser[]) || [];
      }

      const normalizedUsers = userList.map(user => ({
        ...user,
        id: String(normalizeNullString(user.id) || ''),
        full_name:
          user.full_name ||
          `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
          'Sin nombre',
        email: normalizeNullString(user.email) || 'Sin email',
        phone: normalizeNullString(user.phone) || 'Sin teléfono',
        role: normalizeNullString(user.role) || 'member',
        zone_name: normalizeNullString(user.zone_name) || undefined,
        zone_id: normalizeNullString(user.zone_id) || undefined,
      }));

      setUsers(normalizedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Error al cargar los usuarios');
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    let result = users;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        user =>
          user.full_name.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term) ||
          (user.phone || '').includes(term)
      );
    }

    if (selectedZone !== 'all') {
      if (selectedZone === 'sin-zona') {
        result = result.filter(user => !user.zone_name && !user.zone_id);
      } else {
        result = result.filter(user => user.zone_name === selectedZone);
      }
    }

    return result;
  }, [users, searchTerm, selectedZone]);

  const handleAssignToZone = async (user: AssignmentUser, zoneId: string) => {
    if (!assignZoneId) return;

    const levelId = selectedRole === 'keep' ? undefined : selectedRole;
    const level = levelId ? discipleshipLevels.find(l => l.id === levelId) : undefined;
    const levelIndex = level ? level.order_index : undefined;

    try {
      setAssigning(true);
      await ZonesService.assignUserToZone(zoneId, user.id, levelIndex);
      const zone = zones.find(z => z.id === zoneId);
      toast.success(`${user.full_name} asignado a ${zone?.name || 'la zona'}`);
      onAssignment?.(user.id, zoneId, levelId);
      setIsDialogOpen(false);
      setSelectedUser(null);
      setAssignZoneId(undefined);
      setSelectedRole('keep');

      await loadUsers();
    } catch (error) {
      console.error('Error asignando usuario a zona:', error);
      toast.error(error instanceof Error ? error.message : 'Error al asignar el usuario a la zona');
    } finally {
      setAssigning(false);
    }
  };

  const openAssignDialog = (user: AssignmentUser) => {
    setSelectedUser(user);
    setAssignZoneId(user.zone_id || undefined);
    setSelectedRole('keep');
    setIsDialogOpen(true);
  };

  const getRoleBadge = (discipleshipLevel?: number) => {
    const config = getDiscipleshipLevelConfig(discipleshipLevel);
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getZoneBadge = (zoneId?: string, zoneName?: string) => {
    const zone = zones.find(z => z.id === zoneId || z.name === zoneName);
    if (!zone) return null;

    return (
      <Badge
        variant="outline"
        className="flex items-center gap-1"
        style={{ borderColor: zone.color, color: zone.color }}
      >
        <MapPin className="w-3 h-3" />
        {zone.name}
      </Badge>
    );
  };

  const columns: Column<AssignmentUser>[] = [
    {
      key: 'full_name',
      label: 'Usuario',
      render: user => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.full_name}`} />
            <AvatarFallback>
              {user.full_name
                .split(' ')
                .map(n => n[0])
                .join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{user.full_name}</div>
            <div className="text-xs text-muted-foreground">{user.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Rol',
      render: user => getRoleBadge(user.discipleship_level),
    },
    {
      key: 'zone_name',
      label: 'Zona',
      render: user => {
        if (user.zone_id || user.zone_name) {
          return getZoneBadge(user.zone_id, user.zone_name);
        }
        return <Badge variant="secondary">Sin zona</Badge>;
      },
    },
    {
      key: 'phone',
      label: 'Teléfono',
    },
    {
      key: 'id',
      label: 'Acciones',
      render: user => (
        <Button
          variant={user.zone_id || user.zone_name ? 'outline' : 'default'}
          size="sm"
          onClick={() => openAssignDialog(user)}
        >
          <MapPin className="w-4 h-4 mr-1" />
          {user.zone_id || user.zone_name ? 'Reasignar' : 'Asignar'}
        </Button>
      ),
      className: 'text-right',
    },
  ];

  const mobileCardRender = (user: AssignmentUser) => (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.full_name}`} />
            <AvatarFallback>
              {user.full_name
                .split(' ')
                .map(n => n[0])
                .join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{user.full_name}</div>
            <div className="text-xs text-muted-foreground">{user.email}</div>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {getRoleBadge(user.discipleship_level)}
        {user.zone_id || user.zone_name ? (
          getZoneBadge(user.zone_id, user.zone_name)
        ) : (
          <Badge variant="secondary">Sin zona</Badge>
        )}
      </div>
      <div className="flex justify-end">
        <Button
          variant={user.zone_id || user.zone_name ? 'outline' : 'default'}
          size="sm"
          onClick={() => openAssignDialog(user)}
        >
          <MapPin className="w-4 h-4 mr-1" />
          {user.zone_id || user.zone_name ? 'Reasignar' : 'Asignar'}
        </Button>
      </div>
    </div>
  );

  if (loadingUsers || zonesLoading || levelsLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Asignación de Usuarios a Zonas
        </CardTitle>
        <CardDescription>Busca usuarios y asígnalos a zonas de discipulado</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Label htmlFor="search">Buscar Usuario</Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                id="search"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, email o teléfono..."
                className="pl-10"
              />
            </div>
          </div>
          <div className="md:w-48">
            <Label htmlFor="zone-filter">Filtrar por Zona</Label>
            <Select value={selectedZone} onValueChange={setSelectedZone}>
              <SelectTrigger>
                <SelectValue placeholder="Todas las zonas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las zonas</SelectItem>
                <SelectItem value="sin-zona">Sin zona asignada</SelectItem>
                {zones.map(zone => (
                  <SelectItem key={zone.id} value={zone.name}>
                    {zone.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DataTable
          data={filteredUsers}
          columns={columns}
          loading={loadingUsers}
          pagination
          itemsPerPage={10}
          emptyMessage="No se encontraron usuarios con los criterios de búsqueda"
          mobileCardRender={mobileCardRender}
        />

        <Dialog
          open={isDialogOpen}
          onOpenChange={open => {
            setIsDialogOpen(open);
            if (!open) {
              setSelectedUser(null);
              setAssignZoneId(undefined);
              setSelectedRole('keep');
            }
          }}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {selectedUser ? `Asignar ${selectedUser.full_name} a Zona` : 'Asignar a Zona'}
              </DialogTitle>
              <DialogDescription>
                Selecciona una zona y opcionalmente actualiza el rol
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="assign-zone">Zona</Label>
                <Select
                  value={assignZoneId || ''}
                  onValueChange={value => setAssignZoneId(value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una zona" />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.map(zone => (
                      <SelectItem key={zone.id} value={zone.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: zone.color }}
                          />
                          {zone.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assign-role">Nivel de Discipulado (opcional)</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Mantener nivel actual" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keep">Mantener nivel actual</SelectItem>
                    {discipleshipLevels.map(level => (
                      <SelectItem key={level.id} value={level.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: level.color }}
                          />
                          {level.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setSelectedUser(null);
                    setAssignZoneId(undefined);
                    setSelectedRole('keep');
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() =>
                    selectedUser && assignZoneId && handleAssignToZone(selectedUser, assignZoneId)
                  }
                  disabled={!assignZoneId || assigning}
                >
                  {assigning ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Asignar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default UserZoneAssignment;
