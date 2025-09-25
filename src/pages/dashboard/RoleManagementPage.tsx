import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Shield, 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Settings,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  UserPlus,
  UserMinus,
  Crown,
  Award,
  Star,
  AlertTriangle,
  Check,
  X
} from "lucide-react";
import { toast } from "sonner";

const RoleManagementPage = () => {
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [isAssignRoleOpen, setIsAssignRoleOpen] = useState(false);

  const systemRoles = [
    {
      id: 'pastor',
      name: 'Pastor',
      description: 'Acceso completo al sistema, puede gestionar todos los aspectos de la iglesia',
      users: 2,
      color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      icon: Crown,
      isSystem: true,
      permissions: {
        users: { create: true, read: true, update: true, delete: true },
        roles: { create: true, read: true, update: true, delete: true },
        reports: { create: true, read: true, update: true, delete: true },
        events: { create: true, read: true, update: true, delete: true },
        settings: { create: true, read: true, update: true, delete: true }
      }
    },
    {
      id: 'staff',
      name: 'Staff',
      description: 'Personal de la iglesia con acceso administrativo limitado',
      users: 5,
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      icon: Award,
      isSystem: true,
      permissions: {
        users: { create: true, read: true, update: true, delete: false },
        roles: { create: false, read: true, update: false, delete: false },
        reports: { create: true, read: true, update: true, delete: false },
        events: { create: true, read: true, update: true, delete: true },
        settings: { create: false, read: true, update: false, delete: false }
      }
    },
    {
      id: 'supervisor',
      name: 'Supervisor',
      description: 'Líderes de área con permisos de supervisión',
      users: 8,
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      icon: Star,
      isSystem: true,
      permissions: {
        users: { create: false, read: true, update: true, delete: false },
        roles: { create: false, read: true, update: false, delete: false },
        reports: { create: false, read: true, update: false, delete: false },
        events: { create: true, read: true, update: true, delete: false },
        settings: { create: false, read: true, update: false, delete: false }
      }
    },
    {
      id: 'server',
      name: 'Servidor',
      description: 'Miembros activos con acceso básico al sistema',
      users: 45,
      color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      icon: Users,
      isSystem: true,
      permissions: {
        users: { create: false, read: true, update: false, delete: false },
        roles: { create: false, read: false, update: false, delete: false },
        reports: { create: false, read: false, update: false, delete: false },
        events: { create: false, read: true, update: false, delete: false },
        settings: { create: false, read: false, update: false, delete: false }
      }
    }
  ];

  const customRoles = [
    {
      id: 'music_director',
      name: 'Director Musical',
      description: 'Responsable del ministerio de música y adoración',
      users: 3,
      color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      icon: Settings,
      isSystem: false,
      isActive: true,
      permissions: {
        users: { create: false, read: true, update: false, delete: false },
        roles: { create: false, read: false, update: false, delete: false },
        reports: { create: false, read: true, update: false, delete: false },
        events: { create: true, read: true, update: true, delete: false },
        settings: { create: false, read: false, update: false, delete: false }
      }
    },
    {
      id: 'youth_leader',
      name: 'Líder de Jóvenes',
      description: 'Coordinador de actividades juveniles',
      users: 2,
      color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-400',
      icon: Settings,
      isSystem: false,
      isActive: true,
      permissions: {
        users: { create: false, read: true, update: false, delete: false },
        roles: { create: false, read: false, update: false, delete: false },
        reports: { create: false, read: true, update: false, delete: false },
        events: { create: true, read: true, update: true, delete: false },
        settings: { create: false, read: false, update: false, delete: false }
      }
    }
  ];

  const allRoles = [...systemRoles, ...customRoles];

  const availablePermissions = [
    { id: 'users.create', name: 'Crear Usuarios', category: 'Usuarios' },
    { id: 'users.read', name: 'Ver Usuarios', category: 'Usuarios' },
    { id: 'users.update', name: 'Editar Usuarios', category: 'Usuarios' },
    { id: 'users.delete', name: 'Eliminar Usuarios', category: 'Usuarios' },
    { id: 'roles.create', name: 'Crear Roles', category: 'Roles' },
    { id: 'roles.read', name: 'Ver Roles', category: 'Roles' },
    { id: 'roles.update', name: 'Editar Roles', category: 'Roles' },
    { id: 'roles.delete', name: 'Eliminar Roles', category: 'Roles' },
    { id: 'reports.create', name: 'Crear Reportes', category: 'Reportes' },
    { id: 'reports.read', name: 'Ver Reportes', category: 'Reportes' },
    { id: 'reports.update', name: 'Editar Reportes', category: 'Reportes' },
    { id: 'reports.delete', name: 'Eliminar Reportes', category: 'Reportes' },
    { id: 'events.create', name: 'Crear Eventos', category: 'Eventos' },
    { id: 'events.read', name: 'Ver Eventos', category: 'Eventos' },
    { id: 'events.update', name: 'Editar Eventos', category: 'Eventos' },
    { id: 'events.delete', name: 'Eliminar Eventos', category: 'Eventos' },
    { id: 'settings.create', name: 'Crear Configuraciones', category: 'Configuración' },
    { id: 'settings.read', name: 'Ver Configuraciones', category: 'Configuración' },
    { id: 'settings.update', name: 'Editar Configuraciones', category: 'Configuración' },
    { id: 'settings.delete', name: 'Eliminar Configuraciones', category: 'Configuración' }
  ];

  const RoleCard = ({ role, isCustom = false }: { role: any, isCustom?: boolean }) => {
    const Icon = role.icon;
    const totalPermissions = Object.values(role.permissions).reduce((acc: number, perms: any) => 
      acc + Object.values(perms).filter(Boolean).length, 0
    ) as number;

    return (
      <Card className="group hover:shadow-lg transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl ${role.color.split(' ')[0]}-50 dark:${role.color.split(' ')[2].replace('dark:', '')}950/20 flex items-center justify-center`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  {role.name}
                  {role.isSystem && (
                    <Badge variant="outline" className="text-xs">
                      Sistema
                    </Badge>
                  )}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {role.description}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Usuarios asignados:</span>
              <span className="font-semibold">{role.users}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Permisos activos:</span>
              <span className="font-semibold">{totalPermissions}</span>
            </div>

            {!role.isActive && isCustom && (
              <Badge variant="secondary" className="w-full justify-center">
                Inactivo
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 mt-4 pt-4 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => setSelectedRole(role)}
            >
              <Eye className="w-4 h-4 mr-1" />
              Ver Detalles
            </Button>
            
            {!role.isSystem && (
              <>
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const CreateRoleDialog = () => (
    <Dialog open={isCreateRoleOpen} onOpenChange={setIsCreateRoleOpen}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Rol</DialogTitle>
          <DialogDescription>
            Define un nuevo rol personalizado con permisos específicos
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">Nombre del Rol *</Label>
              <Input 
                id="role-name" 
                placeholder="Ej: Coordinador de Eventos"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-color">Color</Label>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500 border"></div>
                <Input 
                  id="role-color" 
                  defaultValue="#3b82f6"
                  placeholder="#3b82f6"
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="role-description">Descripción</Label>
              <Textarea 
                id="role-description" 
                placeholder="Describe las responsabilidades de este rol..."
                rows={3}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Rol Activo</Label>
                <p className="text-sm text-muted-foreground">
                  Los usuarios pueden ser asignados a este rol
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Permisos</h3>
            
            {['Usuarios', 'Roles', 'Reportes', 'Eventos', 'Configuración'].map((category) => (
              <div key={category} className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  {category}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pl-4 border-l-2 border-muted">
                  {availablePermissions
                    .filter(perm => perm.category === category)
                    .map((permission) => (
                      <div key={permission.id} className="flex items-center space-x-2">
                        <Checkbox id={permission.id} />
                        <Label 
                          htmlFor={permission.id} 
                          className="text-sm font-normal cursor-pointer"
                        >
                          {permission.name}
                        </Label>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsCreateRoleOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              setIsCreateRoleOpen(false);
              toast.success("Rol creado exitosamente");
            }}>
              Crear Rol
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Gestión de Roles
          </h1>
          <p className="text-muted-foreground mt-1">
            Administra roles y permisos del sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsAssignRoleOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Asignar Rol
          </Button>
          <Button onClick={() => setIsCreateRoleOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Crear Rol
          </Button>
        </div>
      </div>

      <Tabs defaultValue="system" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="system">Roles del Sistema</TabsTrigger>
          <TabsTrigger value="custom">Roles Personalizados</TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Roles del Sistema
              </CardTitle>
              <CardDescription>
                Roles predefinidos con permisos establecidos por el sistema
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {systemRoles.map((role) => (
              <RoleCard key={role.id} role={role} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="custom" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Roles Personalizados
              </CardTitle>
              <CardDescription>
                Roles creados específicamente para tu organización
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Buscar roles personalizados..." 
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Activos</SelectItem>
                    <SelectItem value="inactive">Inactivos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {customRoles.map((role) => (
              <RoleCard key={role.id} role={role} isCustom />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Role Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-primary">6</div>
            <div className="text-sm text-muted-foreground">Total de roles</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-green-600">65</div>
            <div className="text-sm text-muted-foreground">Usuarios asignados</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-orange-600">2</div>
            <div className="text-sm text-muted-foreground">Roles personalizados</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-purple-600">20</div>
            <div className="text-sm text-muted-foreground">Permisos únicos</div>
          </CardContent>
        </Card>
      </div>

      <CreateRoleDialog />

      {/* Role Detail Modal */}
      {selectedRole && (
        <Dialog open={!!selectedRole} onOpenChange={() => setSelectedRole(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <selectedRole.icon className="w-6 h-6" />
                {selectedRole.name}
                {selectedRole.isSystem && (
                  <Badge variant="outline">Sistema</Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                {selectedRole.description}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Usuarios Asignados</Label>
                  <div className="text-2xl font-bold">{selectedRole.users}</div>
                </div>
                <div className="space-y-2">
                  <Label>Permisos Activos</Label>
                  <div className="text-2xl font-bold">
                    {Object.values(selectedRole.permissions).reduce((acc: number, perms: any) => 
                      acc + Object.values(perms).filter(Boolean).length, 0
                    ) as number}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Permisos Detallados</h3>
                
                {Object.entries(selectedRole.permissions).map(([module, perms]: [string, any]) => (
                    <div key={module} className="space-y-2">
                      <h4 className="font-medium capitalize">{module}</h4>
                      <div className="grid grid-cols-4 gap-2">
                        {Object.entries(perms).map(([action, allowed]: [string, any]) => (
                          <div key={action} className="flex items-center gap-2 text-sm">
                            {allowed ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <X className="w-4 h-4 text-red-600" />
                            )}
                            <span className={allowed ? 'text-green-600' : 'text-red-600'}>
                              {action.charAt(0).toUpperCase() + action.slice(1)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                ))}
              </div>

              {!selectedRole.isSystem && (
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline">
                    <Edit className="w-4 h-4 mr-2" />
                    Editar Rol
                  </Button>
                  <Button variant="outline">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Asignar Usuarios
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default RoleManagementPage;