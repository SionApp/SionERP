import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Can } from '@/components/Can';
import { Shield, Users, Settings, Loader2, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ROLE_LEVELS } from '@/lib/permissions';
import { useRolePermissions, MANAGED_MODULES, type RoleKey } from '@/hooks/useRolePermissions';

interface RoleData {
  role: string;
  count: number;
  description: string;
  permissions: string[];
}

interface RoleUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  is_active: boolean;
}

const MODULE_LABELS: Record<string, string> = {
  discipleship: 'Discipulado',
  reports: 'Reportes',
  zones: 'Zonas',
  events: 'Eventos',
};

const RolesPage = () => {
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);

  // Sheet: ver usuarios por rol
  const [roleUsersOpen, setRoleUsersOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [roleUsers, setRoleUsers] = useState<RoleUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Sheet: gestionar permisos de módulos
  const [permsOpen, setPermsOpen] = useState(false);
  const [permsRole, setPermsRole] = useState<RoleKey>('staff');
  const { matrix, loading: loadingMatrix, saving, toggle } = useRolePermissions();

  const roleDefinitions = {
    pastor: {
      name: 'Pastor',
      description: 'Acceso completo al sistema - Líder espiritual',
      permissions: [
        'Ver y gestionar todos los usuarios',
        'Eliminar usuarios (excepto otros pastores)',
        'Crear y registrar nuevos usuarios',
        'Ver audit logs del sistema',
        'Generar y ver todos los reportes',
        'Gestionar permisos de usuarios',
        'Configurar roles del sistema',
        'Ver y modificar datos de cualquier usuario',
        'Acceso a configuraciones del sistema',
      ],
    },
    staff: {
      name: 'Personal',
      description: 'Administración limitada - Equipo pastoral',
      permissions: [
        'Ver y gestionar usuarios no-pastor',
        'Crear usuarios con rol server/supervisor',
        'Ver audit logs del sistema',
        'Generar y ver reportes básicos',
        'Gestionar permisos de usuarios subordinados',
        'Ver datos de usuarios subordinados',
      ],
    },
    supervisor: {
      name: 'Supervisor',
      description: 'Supervisión de grupos celulares y servidores',
      permissions: [
        'Ver y editar datos de servidores asignados',
        'Ver su propio perfil y datos',
        'Actualizar información de su grupo celular',
        'Gestionar actividades de su grupo',
      ],
    },
    server: {
      name: 'Servidor',
      description: 'Miembro servidor - Acceso básico',
      permissions: [
        'Ver y editar solo su propio perfil',
        'Actualizar datos personales',
        'Participar en actividades asignadas',
      ],
    },
  };

  useEffect(() => {
    loadRoleStats();
  }, []);

  const loadRoleStats = async () => {
    try {
      setLoading(true);
      const { data: roleStats, error: roleError } = await supabase
        .from('users')
        .select('role')
        .eq('is_active', true);

      if (roleError) throw roleError;

      const roleCounts: Record<string, number> = {};
      roleStats?.forEach(user => {
        roleCounts[user.role] = (roleCounts[user.role] || 0) + 1;
      });

      const rolesData: RoleData[] = Object.entries(roleDefinitions).map(([roleKey, roleDef]) => ({
        role: roleKey,
        count: roleCounts[roleKey] || 0,
        description: roleDef.description,
        permissions: roleDef.permissions,
      }));

      setRoles(rolesData);
      setTotalUsers(roleStats?.length || 0);
    } catch (error: unknown) {
      console.error('Error loading role stats:', error);
      toast.error('Error al cargar estadísticas de roles');
    } finally {
      setLoading(false);
    }
  };

  const handleViewUsersWithRole = async (role: string) => {
    setSelectedRole(role);
    setRoleUsersOpen(true);
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, phone, is_active')
        .eq('role', role as 'pastor' | 'staff' | 'supervisor' | 'server')
        .order('first_name');
      if (error) throw error;
      setRoleUsers((data as RoleUser[]) ?? []);
    } catch {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleOpenPerms = (role: string) => {
    setPermsRole(role as RoleKey);
    setPermsOpen(true);
  };

  const getRoleColor = (roleId: string) => {
    switch (roleId) {
      case 'pastor':
        return 'destructive';
      case 'staff':
        return 'secondary';
      case 'supervisor':
        return 'default';
      case 'server':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getRoleName = (roleId: string) =>
    roleDefinitions[roleId as keyof typeof roleDefinitions]?.name || roleId;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-6 p-3 sm:p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Gestión de Roles
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Administra los roles y permisos del sistema
          </p>
        </div>
        <Button onClick={loadRoleStats} className="w-full sm:w-auto">
          <Shield className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-xl sm:text-2xl font-bold">{roles.length}</div>
            <p className="text-xs text-muted-foreground">Roles configurados en el sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-sm font-medium">Usuarios Asignados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-xl sm:text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">Total de usuarios con roles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-sm font-medium">Permisos Únicos</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-xl sm:text-2xl font-bold">
              {roles.reduce((total, role) => total + role.permissions.length, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Permisos diferentes configurados</p>
          </CardContent>
        </Card>
      </div>

      {/* Roles List */}
      <div className="grid gap-3 sm:gap-4">
        {roles.map(roleData => (
          <Card key={roleData.role}>
            <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <Badge variant={getRoleColor(roleData.role)} className="shrink-0">
                    {getRoleName(roleData.role)}
                  </Badge>
                  <div className="min-w-0">
                    <CardTitle className="text-base sm:text-lg">
                      {getRoleName(roleData.role)}
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm truncate">
                      {roleData.description}
                    </CardDescription>
                  </div>
                </div>
                <div className="text-left sm:text-right shrink-0">
                  <p className="text-xl sm:text-2xl font-bold">{roleData.count}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">usuarios</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Permisos:</h4>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {roleData.permissions.map((permission, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {permission}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-3 sm:pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs sm:text-sm"
                    onClick={() => handleViewUsersWithRole(roleData.role)}
                  >
                    Ver Usuarios con este Rol
                  </Button>
                  <Can I={ROLE_LEVELS.admin}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs sm:text-sm"
                      onClick={() => handleOpenPerms(roleData.role)}
                      disabled={roleData.role === 'pastor'}
                    >
                      <Settings className="h-3.5 w-3.5 mr-1.5" />
                      {roleData.role === 'pastor' ? 'Acceso total' : 'Gestionar Módulos'}
                    </Button>
                  </Can>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Matriz de acceso a módulos (live) */}
      <Card>
        <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg">Acceso a Módulos por Rol</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Vista en tiempo real del acceso a cada módulo según el rol
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          {loadingMatrix ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando matriz...
            </div>
          ) : (
            <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
              <table className="w-full border-collapse min-w-[400px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 text-xs sm:text-sm font-medium">Módulo</th>
                    {roles.map(r => (
                      <th key={r.role} className="text-center p-2">
                        <Badge variant={getRoleColor(r.role)} className="text-xs">
                          {getRoleName(r.role)}
                        </Badge>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MANAGED_MODULES.map(mod => (
                    <tr key={mod} className="border-b">
                      <td className="p-2 text-xs sm:text-sm font-medium">{MODULE_LABELS[mod]}</td>
                      {roles.map(r => {
                        const enabled =
                          r.role === 'pastor' ? true : (matrix[r.role as RoleKey]?.[mod] ?? false);
                        return (
                          <td key={r.role} className="text-center p-2">
                            <div
                              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full mx-auto ${
                                enabled ? 'bg-green-500' : 'bg-muted'
                              }`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sheet: gestionar módulos de un rol */}
      <Sheet open={permsOpen} onOpenChange={setPermsOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Módulos — {getRoleName(permsRole)}
            </SheetTitle>
            <SheetDescription>
              Activá o desactivá el acceso a cada módulo para este rol. Los cambios se aplican de
              forma inmediata.
            </SheetDescription>
          </SheetHeader>

          {loadingMatrix ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {MANAGED_MODULES.map(mod => {
                const isPastor = permsRole === 'pastor';
                const enabled = isPastor ? true : (matrix[permsRole]?.[mod] ?? false);
                return (
                  <div
                    key={mod}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{MODULE_LABELS[mod]}</p>
                      <p className="text-xs text-muted-foreground capitalize">{mod}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {saving && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      )}
                      {isPastor ? (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Switch
                          checked={enabled}
                          onCheckedChange={() => toggle(permsRole, mod)}
                          disabled={saving}
                        />
                      )}
                    </div>
                  </div>
                );
              })}

              {permsRole === 'pastor' && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  El Pastor siempre tiene acceso completo a todos los módulos.
                </p>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Sheet: usuarios con este rol */}
      <Sheet open={roleUsersOpen} onOpenChange={setRoleUsersOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="capitalize">
              {selectedRole ? getRoleName(selectedRole) : ''} — Usuarios
            </SheetTitle>
            <SheetDescription>
              {roleUsers.length} usuario{roleUsers.length !== 1 ? 's' : ''} con este rol
            </SheetDescription>
          </SheetHeader>

          {loadingUsers ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : roleUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-12 text-sm">
              No hay usuarios con este rol
            </p>
          ) : (
            <div className="space-y-2">
              {roleUsers.map(u => (
                <div key={u.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {u.first_name?.[0]}
                      {u.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {u.first_name} {u.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    {u.phone && <p className="text-xs text-muted-foreground">{u.phone}</p>}
                  </div>
                  <Badge
                    variant={u.is_active ? 'default' : 'outline'}
                    className="text-[10px] shrink-0"
                  >
                    {u.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default RolesPage;
