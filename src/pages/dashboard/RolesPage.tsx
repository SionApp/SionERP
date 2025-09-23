import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Settings, Plus } from 'lucide-react';

const RolesPage = () => {
  const [roles] = useState([
    {
      id: 'admin',
      name: 'Administrador',
      description: 'Acceso completo al sistema',
      userCount: 2,
      permissions: ['Gestión de usuarios', 'Configuración del sistema', 'Reportes', 'Roles y permisos']
    },
    {
      id: 'moderator',
      name: 'Moderador',
      description: 'Gestión de usuarios y contenido',
      userCount: 5,
      permissions: ['Gestión de usuarios', 'Reportes básicos', 'Moderación de contenido']
    },
    {
      id: 'usuario',
      name: 'Usuario',
      description: 'Acceso básico al sistema',
      userCount: 48,
      permissions: ['Ver perfil', 'Actualizar datos personales']
    }
  ]);

  const getRoleColor = (roleId: string) => {
    switch (roleId) {
      case 'admin':
        return 'destructive';
      case 'moderator':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Roles</h1>
          <p className="text-muted-foreground">
            Administra los roles y permisos del sistema
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Rol
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roles.length}</div>
            <p className="text-xs text-muted-foreground">
              Roles configurados en el sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Asignados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {roles.reduce((total, role) => total + role.userCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total de usuarios con roles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Permisos Únicos</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">
              Permisos diferentes configurados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Roles List */}
      <div className="grid gap-4">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant={getRoleColor(role.id) as any}>
                    {role.name}
                  </Badge>
                  <div>
                    <CardTitle className="text-lg">{role.name}</CardTitle>
                    <CardDescription>{role.description}</CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{role.userCount}</p>
                  <p className="text-sm text-muted-foreground">usuarios</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Permisos:</h4>
                  <div className="flex flex-wrap gap-2">
                    {role.permissions.map((permission, index) => (
                      <Badge key={index} variant="outline">
                        {permission}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" size="sm">
                    Editar Rol
                  </Button>
                  <Button variant="outline" size="sm">
                    Ver Usuarios
                  </Button>
                  <Button variant="outline" size="sm">
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
          <CardDescription>
            Vista general de permisos por rol
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Permiso</th>
                  {roles.map((role) => (
                    <th key={role.id} className="text-center p-2">
                      <Badge variant={getRoleColor(role.id) as any}>
                        {role.name}
                      </Badge>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  'Gestión de usuarios',
                  'Configuración del sistema',
                  'Reportes',
                  'Roles y permisos',
                  'Reportes básicos',
                  'Moderación de contenido',
                  'Ver perfil',
                  'Actualizar datos personales'
                ].map((permission, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-2 font-medium">{permission}</td>
                    {roles.map((role) => (
                      <td key={role.id} className="text-center p-2">
                        {role.permissions.includes(permission) ? (
                          <div className="w-4 h-4 bg-green-500 rounded-full mx-auto"></div>
                        ) : (
                          <div className="w-4 h-4 bg-gray-300 rounded-full mx-auto"></div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RolesPage;