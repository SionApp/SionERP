import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Settings, Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RoleData {
  role: string;
  count: number;
  description: string;
  permissions: string[];
}

const RolesPage = () => {
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);

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
        'Gestionar livestreams',
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
        'Gestionar livestreams',
      ],
    },
    supervisor: {
      name: 'Supervisor',
      description: 'Supervisión de grupos celulares y servidores',
      permissions: [
        'Ver y editar datos de servidores asignados',
        'Ver su propio perfil y datos',
        'Actualizar información de su grupo celular',
        'Ver livestreams públicos',
        'Gestionar actividades de su grupo',
      ],
    },
    server: {
      name: 'Servidor',
      description: 'Miembro servidor - Acceso básico',
      permissions: [
        'Ver y editar solo su propio perfil',
        'Actualizar datos personales',
        'Ver livestreams públicos',
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

      // Obtener estadísticas de roles
      const { data: roleStats, error: roleError } = await supabase
        .from('users')
        .select('role')
        .eq('is_active', true);

      if (roleError) throw roleError;

      // Contar usuarios por rol
      const roleCounts: Record<string, number> = {};
      roleStats?.forEach(user => {
        roleCounts[user.role] = (roleCounts[user.role] || 0) + 1;
      });

      // Crear array de roles con conteos
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

  const getRoleName = (roleId: string) => {
    return roleDefinitions[roleId as keyof typeof roleDefinitions]?.name || roleId;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-6 p-2 sm:p-3 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Gestión de Roles
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">Administra los roles y permisos del sistema</p>
        </div>
        <Button onClick={loadRoleStats} className="w-full sm:w-auto">
          <Shield className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roles.length}</div>
            <p className="text-xs text-muted-foreground">Roles configurados en el sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Asignados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">Total de usuarios con roles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Permisos Únicos</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {roles.reduce((total, role) => total + role.permissions.length, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Permisos diferentes configurados</p>
          </CardContent>
        </Card>
      </div>

      {/* Roles List */}
      <div className="grid gap-4">
        {roles.map(roleData => (
          <Card key={roleData.role}>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Badge variant={getRoleColor(roleData.role)}>{getRoleName(roleData.role)}</Badge>
                  <div>
                    <CardTitle className="text-base sm:text-lg">{getRoleName(roleData.role)}</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">{roleData.description}</CardDescription>
                  </div>
                </div>
                <div className="text-left sm:text-right shrink-0">
                  <p className="text-2xl font-bold">{roleData.count}</p>
                  <p className="text-sm text-muted-foreground">usuarios</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Permisos:</h4>
                  <div className="flex flex-wrap gap-2">
                    {roleData.permissions.map((permission, index) => (
                      <Badge key={index} variant="outline">
                        {permission}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.info('Funcionalidad en desarrollo')}
                  >
                    Ver Usuarios con este Rol
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.info('Funcionalidad en desarrollo')}
                  >
                    Gestionar Permisos
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Permission Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Matriz de Permisos</CardTitle>
          <CardDescription>Vista general de permisos por rol</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Permiso</th>
                  {roles.map(roleData => (
                    <th key={roleData.role} className="text-center p-2">
                      <Badge variant={getRoleColor(roleData.role)}>
                        {getRoleName(roleData.role)}
                      </Badge>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from(new Set(roles.flatMap(role => role.permissions))).map(
                  (permission, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2 font-medium">{permission}</td>
                      {roles.map(roleData => (
                        <td key={roleData.role} className="text-center p-2">
                          {roleData.permissions.includes(permission) ? (
                            <div className="w-4 h-4 bg-green-500 rounded-full mx-auto"></div>
                          ) : (
                            <div className="w-4 h-4 bg-gray-300 rounded-full mx-auto"></div>
                          )}
                        </td>
                      ))}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RolesPage;
