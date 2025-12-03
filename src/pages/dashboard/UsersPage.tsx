import DeleteUserDialog from '@/components/DeleteUserDialog';
import { DynamicFilter, FilterField, FilterValues } from '@/components/DynamicFilter';
import UserDetailSheet from '@/components/UserDetailSheet';
import { InviteUserModal } from '@/components/dashboard/InviteUserModal';
import { Column, DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserService } from '@/services/user.service';
import { Invitation } from '@/types/invitation.types';
import { User } from '@/types/user.types';
import { Calendar, Edit, Eye, Mail, Plus, SendHorizontal, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterValues>({});
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [showInviteModalUser, setShowInviteModalUser] = useState<User | null>(null);
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
      toast.error('Error al cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        user.first_name.toLowerCase().includes(searchLower) ||
        user.last_name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.id_number.includes(filters.search);

      if (!matchesSearch) return false;
    }

    if (filters.role && user.role !== filters.role) {
      return false;
    }

    if (filters.baptized && !user.baptized) {
      return false;
    }

    if (filters.whatsapp && !user.whatsapp) {
      return false;
    }

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
        return 'minister';
      case 'staff':
        return 'staff';
      case 'supervisor':
        return 'supervisor';
      case 'server':
        return 'server';
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
  const loadInvitations = async () => {
    try {
      setLoadingInvitations(true);
      const invitations = await UserService.loadInvitations();
      setInvitations(invitations || []);
    } catch (error) {
      console.error('Error loading invitations:', error);
      toast.error('Error al cargar las invitaciones');
    } finally {
      setLoadingInvitations(false);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      await UserService.resendInvitation(invitationId);
      toast.success('Invitación reenviada correctamente');
      loadInvitations();
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast.error('Error al reenviar la invitación');
    }
  };

  useEffect(() => {
    loadInvitations();
  }, []);

  const handleDetailUser = (user: User) => {
    setSelectedUserId(user.id);
  };

  const handleEditUser = (user: User) => {
    navigate(`/dashboard/register-user`, { state: { userId: user.id } });
  };

  const handleDeleteUser = (user: User) => {
    setDeletingUser(user);
  };

  const confirmDeleteUser = async () => {
    if (!deletingUser) return;

    try {
      setIsDeleting(true);
      await UserService.deleteUser(deletingUser.id);
      toast.success(
        `Usuario ${deletingUser.first_name} ${deletingUser.last_name} eliminado correctamente`
      );
      setDeletingUser(null);
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Error al eliminar el usuario');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: Column<User & { invitation_status: string }>[] = [
    {
      key: 'first_name',
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
    {
      key: 'invitation_status',
      label: 'Estado',
      render: user => {
        const invitation = invitations.find(inv => inv.email === user.email);

        if (!invitation) {
          return <Badge variant="outline">No invitado</Badge>;
        }

        const isExpired = new Date(invitation.expires_at) < new Date();

        return (
          <div className="flex items-center gap-2">
            <Badge
              variant={
                invitation.status === 'accepted'
                  ? 'default'
                  : invitation.status === 'pending' && !isExpired
                    ? 'secondary'
                    : 'destructive'
              }
            >
              {invitation.status === 'pending' && !isExpired
                ? 'Invitación pendiente'
                : invitation.status === 'accepted'
                  ? 'Aceptada'
                  : 'Expirada'}
            </Badge>

            {invitation.status === 'pending' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleResendInvitation(invitation.id)}
                className="h-6 w-6 p-0"
                title="Reenviar invitación"
              >
                <SendHorizontal className="h-3 w-3" />
              </Button>
            )}
          </div>
        );
      },
      responsive: 'md',
    },
  ];

  const userActions = (user: User) => (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleDetailUser(user)}
        title="Ver detalles"
        className="h-8 w-8 p-0"
      >
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
      {user.invitation_status !== 'accepted' && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowInviteModalUser(user)}
          title="Invitar usuario"
          className="h-8 w-8 p-0"
        >
          <Mail className="h-3 w-3" />
        </Button>
      )}
    </div>
  );

  const mobileCardRender = (user: User, actions?: React.ReactNode) => (
    <div className="p-4 border rounded-lg hover:bg-accent/50 transition-colors space-y-3">
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
        </div>
      </div>

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

      {user.whatsapp && (
        <div className="flex justify-start">
          <Badge variant="outline" className="text-xs">
            📱 WhatsApp
          </Badge>
        </div>
      )}

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
      {/* Header */}
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

      <DynamicFilter
        fields={filterFields}
        onFilterChange={setFilters}
        onClear={() => setFilters({})}
      />

      <Card>
        <CardHeader>
          <CardTitle>Usuarios ({filteredUsers.length})</CardTitle>
          <CardDescription>Lista de todos los usuarios registrados</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredUsers.map(
              user =>
                ({
                  ...user,
                  invitation_status:
                    invitations.find(inv => inv.email === user.email)?.status || 'pending',
                }) as User & { invitation_status: 'pending' | 'accepted' | 'expired' }
            )}
            columns={columns}
            actions={userActions}
            loading={loading}
            emptyMessage="No se encontraron usuarios"
            pagination={true}
            itemsPerPage={10}
            searchable={false}
            mobileCardRender={mobileCardRender}
          />
        </CardContent>
      </Card>

      <UserDetailSheet
        user={selectedUserId ? users.find(user => user.id === selectedUserId) : null} // Obtener usuario seleccionado
        isOpen={!!selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />

      <DeleteUserDialog
        user={deletingUser}
        isOpen={!!deletingUser}
        isDeleting={isDeleting}
        onClose={() => setDeletingUser(null)}
        onConfirm={confirmDeleteUser}
      />

      <InviteUserModal
        user={showInviteModalUser}
        isOpen={!!showInviteModalUser}
        onClose={() => setShowInviteModalUser(null)}
        onInviteSent={() => loadInvitations()}
      />
    </div>
  );
};

export default UsersPage;
