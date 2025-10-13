import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Eye, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import EditUserModal from '@/components/EditUserModal';
import { DynamicFilter, FilterField, FilterValues } from '@/components/DynamicFilter';
import { DataTable, Column } from '@/components/ui/DataTable';
import { User } from '@/types/user.types';
import { UserService } from '@/services/user.service';

const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterValues>({});
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [detailUser, setDetailUser] = useState<User | null>(null);
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

  const handleDetailUser = (user: User) => {
    const userId = user.id;
    console.log('Redirecting to user details:', userId );
  };

  const handleEditUser = (user: User) => {
    const userId = user.id;
    console.log('Redirecting to edit user:', userId);
    navigate(`/dashboard/register-user`, { state: { userId } });
  };

  const handleDeleteUser = (user: User) => {
    console.log('User details:', user);
  }

  // Definir columnas para la tabla
  const columns: Column<User>[] = [
    {
      key: 'full_name',
      label: 'Nombre Completo',
      render: user => (
        <div>
          <div className="font-medium">
            {user.first_name} {user.last_name}
          </div>
          <div className="text-sm text-muted-foreground">{user.email}</div>
        </div>
      ),
      responsive: 'always',
      sortable: true,
      width: '250px',
    },
    {
      key: 'id_number',
      label: 'Cédula',
      render: user => (
        <div className="text-sm">
          <div>{user.id_number}</div>
          <div className="text-muted-foreground">{user.phone}</div>
        </div>
      ),
      responsive: 'lg',
      sortable: true,
      width: '150px',
    },
    {
      key: 'role',
      label: 'Rol',
      render: user => (
        <div className="space-y-1">
          <Badge variant={getRoleBadgeVariant(user.role)}>{getRoleDisplayName(user.role)}</Badge>
          <div className="flex gap-1">
            {user.baptized && (
              <Badge variant="outline" className="text-xs">
                Bautizado
              </Badge>
            )}
            {user.whatsapp && (
              <Badge variant="outline" className="text-xs">
                WhatsApp
              </Badge>
            )}
          </div>
        </div>
      ),
      responsive: 'md',
      sortable: true,
      width: '120px',
    },
    {
      key: 'address',
      label: 'Dirección',
      render: user => (
        <div className="text-sm max-w-xs truncate" title={user.address}>
          {user.address}
        </div>
      ),
      responsive: 'xl',
      width: '200px',
    },
    {
      key: 'created_at',
      label: 'Registrado',
      render: user => (
        <div className="text-sm">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(user.created_at).toLocaleDateString()}
          </div>
        </div>
      ),
      responsive: 'lg',
      sortable: true,
      width: '120px',
    },
  ];

  // Acciones para cada usuario
  const userActions = (user: User) => (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="sm" onClick={() => handleDetailUser(user)} title="Ver detalles" className="h-8 w-8 p-0">
        <Eye className="h-3 w-3" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleEditUser(user)}
        title="Editar usuario"
        className="h-8 w-8 p-0"
      >
        <Edit className="h-3 w-3" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleDeleteUser(user)}
        title="Eliminar usuario"
        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );

  // Renderizado personalizado para mobile (diseño vertical optimizado)
  const mobileCardRender = (user: User, actions?: React.ReactNode) => (
    <div className="p-4 border rounded-lg hover:bg-accent/50 transition-colors space-y-3">
      {/* Header con nombre y email */}
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-base truncate">
            {user.first_name} {user.last_name}
          </h3>
          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
        </div>
        <div className="flex flex-col gap-1 ml-2">
          <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
            {getRoleDisplayName(user.role)}
          </Badge>
          {user.baptized && (
            <Badge variant="outline" className="text-xs">
              Bautizado
            </Badge>
          )}
        </div>
      </div>

      {/* Información de contacto */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">Cédula:</span>
          <p className="font-medium">{user.id_number}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Teléfono:</span>
          <p className="font-medium">{user.phone}</p>
        </div>
      </div>

      {/* WhatsApp badge si aplica */}
      {user.whatsapp && (
        <div className="flex justify-start">
          <Badge variant="outline" className="text-xs">
            📱 WhatsApp
          </Badge>
        </div>
      )}

      {/* Footer con fecha y acciones */}
      <div className="flex justify-between items-center pt-2 border-t">
        <div className="text-xs text-muted-foreground">
          <span>Registrado: </span>
          <span className="font-medium">{new Date(user.created_at).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-1">{actions}</div>
      </div>
    </div>
  );

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

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Usuarios ({filteredUsers.length})</CardTitle>
          <CardDescription>Lista de todos los usuarios registrados</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredUsers}
            columns={columns}
            actions={userActions}
            loading={loading}
            emptyMessage="No se encontraron usuarios"
            pagination={true}
            itemsPerPage={10}
            searchable={false} // Ya tenemos filtros dinámicos
            mobileCardRender={mobileCardRender}
          />
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
