import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import EditUserModal from '@/components/EditUserModal';
import { DynamicFilter, FilterField, FilterValues } from '@/components/DynamicFilter';
import { User } from '@/types/user.types';
import { UserService } from '@/services/user.service';

const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterValues>({});
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const navigate = useNavigate();

  const filterFields: FilterField[] = [
    {
      key: 'search',
      label: 'Búsqueda general',
      type: 'text',
      placeholder: 'Nombre, email o cédula...',
    },
    {
      key: 'role',
      label: 'Rol',
      type: 'select',
      options: [
        { value: 'pastor', label: 'Pastor' },
        { value: 'staff', label: 'Staff' },
        { value: 'supervisor', label: 'Supervisor' },
        { value: 'server', label: 'Servidor' },
      ],
    },
    { key: 'baptized', label: 'Solo bautizados', type: 'boolean' },
    { key: 'whatsapp', label: 'Con WhatsApp', type: 'boolean' },
    { key: 'created_at', label: 'Fecha de registro', type: 'dateRange' },
  ];

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersData = await UserService.getAllUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Error al cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    // Búsqueda general
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        user.first_name.toLowerCase().includes(searchLower) ||
        user.last_name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.id_number.includes(filters.search);

      if (!matchesSearch) return false;
    }

    // Filtro por rol
    if (filters.role && user.role !== filters.role) {
      return false;
    }

    // Filtro por bautizado
    if (filters.baptized && !user.baptized) {
      return false;
    }

    // Filtro por WhatsApp
    if (filters.whatsapp && !user.whatsapp) {
      return false;
    }

    // Filtro por rango de fechas
    if (filters.created_at?.from) {
      const userDate = new Date(user.created_at);
      const fromDate = new Date(filters.created_at.from);
      if (userDate < fromDate) return false;

      if (filters.created_at.to) {
        const toDate = new Date(filters.created_at.to);
        if (userDate > toDate) return false;
      }
    }

    return true;
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'pastor':
        return 'destructive';
      case 'staff':
        return 'default';
      case 'supervisor':
        return 'secondary';
      case 'server':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'pastor':
        return 'Pastor';
      case 'staff':
        return 'Staff';
      case 'supervisor':
        return 'Supervisor';
      case 'server':
        return 'Servidor';
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Gestión de Usuarios
          </h1>
          <p className="text-muted-foreground">Administra los usuarios registrados en el sistema</p>
        </div>
        <Button onClick={() => navigate('/dashboard/register-user')}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Dynamic Filters */}
      <DynamicFilter
        fields={filterFields}
        onFilterChange={setFilters}
        onClear={() => setFilters({})}
      />

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Usuarios ({filteredUsers.length})</CardTitle>
          <CardDescription>Lista de todos los usuarios registrados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No se encontraron usuarios</p>
              </div>
            ) : (
              filteredUsers.map(user => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="font-medium">
                          {user.first_name} {user.last_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>Cédula: {user.id_number}</p>
                        <p>Teléfono: {user.phone}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {getRoleDisplayName(user.role)}
                    </Badge>
                    {user.baptized && <Badge variant="outline">Bautizado</Badge>}
                    {user.whatsapp && <Badge variant="outline">WhatsApp</Badge>}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right text-sm text-muted-foreground mr-4">
                      <p>Registrado:</p>
                      <p>{new Date(user.created_at).toLocaleDateString()}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setEditingUser(user)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <EditUserModal
        user={editingUser}
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        onUserUpdated={loadUsers}
      />
    </div>
  );
};

export default UsersPage;
