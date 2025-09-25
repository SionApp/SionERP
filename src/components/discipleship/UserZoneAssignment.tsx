import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  UserPlus,
  Search,
  MapPin,
  Users,
  Crown,
  Shield,
  Check,
  X
} from "lucide-react";
import { toast } from "sonner";

// Mock zones
const mockZones = [
  { id: 'zone-norte', name: 'Zona Norte', color: '#3b82f6' },
  { id: 'zone-sur', name: 'Zona Sur', color: '#ef4444' },
  { id: 'zone-este', name: 'Zona Este', color: '#10b981' },
  { id: 'zone-oeste', name: 'Zona Oeste', color: '#f59e0b' }
];

// Extended User type for assignment purposes
interface AssignmentUser {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: 'admin' | 'pastor' | 'staff' | 'supervisor' | 'server' | 'member';
  is_active: boolean;
  zone_name?: string;
  discipleship_level?: number;
  created_at: string;
  updated_at: string;
}

// Mock users data
const mockUsers: AssignmentUser[] = [
  {
    id: '1',
    full_name: 'Ana García',
    email: 'ana.garcia@email.com',
    phone: '+58 414-1234567',
    role: 'member',
    is_active: true,
    discipleship_level: 1,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-09-20T00:00:00Z'
  },
  {
    id: '2',
    full_name: 'Carlos Pérez',
    email: 'carlos.perez@email.com',
    phone: '+58 412-2345678',
    role: 'server',
    is_active: true,
    zone_name: 'Zona Norte',
    discipleship_level: 2,
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-09-20T00:00:00Z'
  },
  {
    id: '3',
    full_name: 'María López',
    email: 'maria.lopez@email.com',
    phone: '+58 416-3456789',
    role: 'supervisor',
    is_active: true,
    zone_name: 'Zona Sur',
    discipleship_level: 3,
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-09-20T00:00:00Z'
  },
  {
    id: '4',
    full_name: 'Luis Rodríguez',
    email: 'luis.rodriguez@email.com',
    phone: '+58 424-4567890',
    role: 'member',
    is_active: true,
    discipleship_level: 1,
    created_at: '2024-03-10T00:00:00Z',
    updated_at: '2024-09-20T00:00:00Z'
  },
  {
    id: '5',
    full_name: 'Sandra Fernández',
    email: 'sandra.fernandez@email.com',
    phone: '+58 426-5678901',
    role: 'server',
    is_active: true,
    zone_name: 'Zona Este',
    discipleship_level: 2,
    created_at: '2024-04-05T00:00:00Z',
    updated_at: '2024-09-20T00:00:00Z'
  }
];

interface UserZoneAssignmentProps {
  onAssignment?: (userId: string, zoneId: string, role?: string) => void;
}

const UserZoneAssignment: React.FC<UserZoneAssignmentProps> = ({ onAssignment }) => {
  const [users, setUsers] = useState<AssignmentUser[]>(mockUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AssignmentUser | null>(null);

  const filteredUsers = users.filter(user => 
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone.includes(searchTerm)
  );

  const handleAssignToZone = (user: AssignmentUser, zoneId: string, newRole?: string) => {
    setUsers(users.map(u => 
      u.id === user.id 
        ? { 
            ...u, 
            zone_name: mockZones.find(z => z.id === zoneId)?.name || '',
            role: (newRole as any) || u.role,
            discipleship_level: newRole === 'supervisor' ? 3 : 
                               newRole === 'server' ? 2 : 
                               u.discipleship_level,
            updated_at: new Date().toISOString()
          }
        : u
    ));
    
    toast.success(`${user.full_name} asignado a ${mockZones.find(z => z.id === zoneId)?.name}`);
    onAssignment?.(user.id, zoneId, newRole);
    setIsDialogOpen(false);
  };

  const handleRemoveFromZone = (user: AssignmentUser) => {
    setUsers(users.map(u => 
      u.id === user.id 
        ? { ...u, zone_name: undefined, updated_at: new Date().toISOString() }
        : u
    ));
    
    toast.success(`${user.full_name} removido de la zona`);
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      pastor: { label: 'Pastor', icon: Crown, variant: 'default' as const },
      staff: { label: 'Staff', icon: Shield, variant: 'secondary' as const },
      supervisor: { label: 'Supervisor', icon: Shield, variant: 'outline' as const },
      server: { label: 'Servidor', icon: Users, variant: 'outline' as const },
      member: { label: 'Miembro', icon: Users, variant: 'secondary' as const }
    };
    
    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.member;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getZoneBadge = (zoneName?: string) => {
    if (!zoneName) return null;
    
    const zone = mockZones.find(z => z.name === zoneName);
    if (!zone) return null;
    
    return (
      <Badge 
        variant="outline" 
        className="flex items-center gap-1"
        style={{ borderColor: zone.color, color: zone.color }}
      >
        <MapPin className="w-3 h-3" />
        {zoneName}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Asignación de Usuarios a Zonas
        </CardTitle>
        <CardDescription>
          Busca usuarios y asígnalos a zonas de discipulado
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Label htmlFor="search">Buscar Usuario</Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
                <SelectItem value="">Todas las zonas</SelectItem>
                <SelectItem value="sin-zona">Sin zona asignada</SelectItem>
                {mockZones.map(zone => (
                  <SelectItem key={zone.id} value={zone.name}>
                    {zone.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Users List */}
        <div className="space-y-4">
          {filteredUsers
            .filter(user => {
              if (!selectedZone) return true;
              if (selectedZone === 'sin-zona') return !user.zone_name;
              return user.zone_name === selectedZone;
            })
            .map(user => (
            <div key={user.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.full_name}`} />
                    <AvatarFallback>
                      {user.full_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold">{user.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-sm text-muted-foreground">{user.phone}</p>
                    
                    <div className="flex items-center gap-2 mt-2">
                      {getRoleBadge(user.role)}
                      {user.zone_name && getZoneBadge(user.zone_name)}
                      {!user.zone_name && (
                        <Badge variant="secondary">Sin zona asignada</Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {user.zone_name ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveFromZone(user)}
                    >
                      <X className="w-4 h-4" />
                      Remover
                    </Button>
                  ) : null}
                  
                  <Dialog open={isDialogOpen && selectedUser?.id === user.id} 
                          onOpenChange={(open) => {
                            setIsDialogOpen(open);
                            if (open) setSelectedUser(user);
                            else setSelectedUser(null);
                          }}>
                    <DialogTrigger asChild>
                      <Button
                        variant={user.zone_name ? "outline" : "default"}
                        size="sm"
                        onClick={() => setSelectedUser(user)}
                      >
                        <MapPin className="w-4 h-4 mr-2" />
                        {user.zone_name ? 'Reasignar' : 'Asignar'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>
                          Asignar {user.full_name} a Zona
                        </DialogTitle>
                        <DialogDescription>
                          Selecciona una zona y opcionalmente actualiza el rol
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="assign-zone">Zona</Label>
                          <Select onValueChange={setSelectedZone}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona una zona" />
                            </SelectTrigger>
                            <SelectContent>
                              {mockZones.map(zone => (
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
                          <Label htmlFor="assign-role">Rol (opcional)</Label>
                          <Select value={selectedRole} onValueChange={setSelectedRole}>
                            <SelectTrigger>
                              <SelectValue placeholder="Mantener rol actual" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Mantener rol actual</SelectItem>
                              <SelectItem value="supervisor">Supervisor</SelectItem>
                              <SelectItem value="server">Servidor</SelectItem>
                              <SelectItem value="member">Miembro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="flex justify-end gap-2 pt-4">
                          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancelar
                          </Button>
                          <Button 
                            onClick={() => handleAssignToZone(user, selectedZone, selectedRole || undefined)}
                            disabled={!selectedZone}
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Asignar
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          ))}
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No se encontraron usuarios con los criterios de búsqueda</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserZoneAssignment;