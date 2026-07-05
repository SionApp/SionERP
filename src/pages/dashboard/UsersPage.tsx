import DeleteUserDialog from '@/components/DeleteUserDialog';
import UserDetailSheet from '@/components/UserDetailSheet';
import { InviteUserModal } from '@/components/dashboard/InviteUserModal';
import { ImportUsersModal } from '@/components/users/ImportUsersModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Can } from '@/components/Can';
import { MobileUsersScreen } from '@/components/mobile/screens/UsersScreen';
import { useMobileMode } from '@/hooks/useMobileMode';
import { usePermissions } from '@/hooks/usePermissions';
import { ROLE_LEVELS } from '@/lib/permissions';
import { UserService } from '@/services/user.service';
import { User } from '@/types/user.types';
import { buildUsersColumns } from './users/users-columns';
import { UsersTable } from './users/users-table';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type PaginationState,
  type RowSelectionState,
} from '@tanstack/react-table';
import { Plus, Search, Upload } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const ROLE_OPTIONS = [
  { value: 'all', label: 'Todos los roles' },
  { value: 'pastor', label: 'Pastor' },
  { value: 'staff', label: 'Staff' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'server', label: 'Servidor' },
  { value: 'member', label: 'Miembro' },
];

const UsersPage = () => {
  const navigate = useNavigate();
  const isMobileApp = useMobileMode();
  const { canManageUsers, canManageRoles, isLoading: isLoadingPermissions } = usePermissions();

  // Data state
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Modals
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showInviteModalUser, setShowInviteModalUser] = useState<User | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  // Table state
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pagination] = useState<PaginationState>({ pageIndex: 0, pageSize: limit });

  // Debounce search
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mobile: paginación acumulativa ("Cargar más")
  const [mobilePage, setMobilePage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadUsers = useCallback(
    async (p: number, lim: number, q: string, role: string, append = false) => {
      try {
        if (append) setLoadingMore(true);
        else setLoading(true);
        const res = await UserService.getUsers({
          page: p,
          limit: lim,
          search: q || undefined,
          role: role !== 'all' ? role : undefined,
        });
        setUsers(prev => (append ? [...prev, ...res.users] : res.users));
        setTotal(res.total);
      } catch {
        toast.error('Error al cargar los usuarios');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  const handleLoadMore = async () => {
    const next = mobilePage + 1;
    setMobilePage(next);
    await loadUsers(next, limit, search, roleFilter, true);
  };

  useEffect(() => {
    loadUsers(page, limit, search, roleFilter);
  }, [page, limit, roleFilter, loadUsers]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      setMobilePage(1);
      loadUsers(1, limit, value, roleFilter);
    }, 400);
  };

  const handleRoleChange = (value: string) => {
    setRoleFilter(value);
    setPage(1);
    setMobilePage(1);
  };

  const columns = useMemo(
    () =>
      buildUsersColumns({
        onView: u => setSelectedUserId(u.id),
        onEdit: u => navigate('/dashboard/register-user', { state: { userId: u.id } }),
        onInvite: u => setShowInviteModalUser(u),
        onDelete: u => setDeletingUser(u),
        canEdit: canManageUsers,
        canDelete: canManageRoles,
      }),
    [canManageUsers, canManageRoles, navigate]
  );

  const table = useReactTable({
    data: users,
    columns,
    state: { rowSelection, pagination },
    getRowId: row => row.id,
    manualPagination: true,
    pageCount: Math.ceil(total / limit),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const selectedCount = Object.keys(rowSelection).length;

  const confirmDeleteUser = async () => {
    if (!deletingUser) return;
    try {
      setIsDeleting(true);
      await UserService.deleteUser(deletingUser.id);
      toast.success(`Usuario ${deletingUser.first_name} ${deletingUser.last_name} eliminado`);
      setDeletingUser(null);
      loadUsers(page, limit, search, roleFilter);
    } catch {
      toast.error('Error al eliminar el usuario');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Modales compartidos entre web y mobile (viven fuera del branch) ──
  const sharedModals = (
    <>
      <UserDetailSheet
        user={selectedUserId ? (users.find(u => u.id === selectedUserId) ?? null) : null}
        isOpen={!!selectedUserId}
        onClose={() => setSelectedUserId(null)}
        onEdit={u => navigate('/dashboard/register-user', { state: { userId: u.id } })}
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
        onInviteSent={() => loadUsers(page, limit, search, roleFilter)}
      />

      <ImportUsersModal
        open={importOpen}
        onOpenChange={setImportOpen}
        onComplete={() => {
          setImportOpen(false);
          loadUsers(page, limit, search, roleFilter);
        }}
      />
    </>
  );

  // ── Modo mobile exclusivo ──
  if (isMobileApp) {
    return (
      <>
        <MobileUsersScreen
          users={users}
          total={total}
          loading={loading || isLoadingPermissions}
          loadingMore={loadingMore}
          search={search}
          onSearchChange={handleSearchChange}
          roleFilter={roleFilter}
          onRoleChange={handleRoleChange}
          roleOptions={ROLE_OPTIONS.map(o => ({
            value: o.value,
            label: o.value === 'all' ? 'Todos' : o.label,
          }))}
          canCreate={canManageUsers}
          onCreate={() => navigate('/dashboard/register-user')}
          onImport={() => setImportOpen(true)}
          onSelectUser={u => setSelectedUserId(u.id)}
          hasMore={users.length < total}
          onLoadMore={handleLoadMore}
        />
        {sharedModals}
      </>
    );
  }

  return (
    <div className="space-y-4 p-2 sm:p-4 md:p-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Gestión de Usuarios
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Administrá los usuarios registrados en el sistema
        </p>
      </div>

      <Card>
        {/* Card header: title + search + actions */}
        <CardHeader className="border-b px-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-xl leading-none">Usuarios</CardTitle>
              <CardDescription className="mt-1">
                {total} usuario{total !== 1 ? 's' : ''} en total
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="h-8 w-full pl-8 sm:w-56"
                  placeholder="Buscar usuarios..."
                  value={search}
                  onChange={e => handleSearchChange(e.target.value)}
                />
              </div>
              <Can I={ROLE_LEVELS.staff}>
                <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Importar</span>
                </Button>
                <Button size="sm" onClick={() => navigate('/dashboard/register-user')}>
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Nuevo Usuario</span>
                </Button>
              </Can>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-3 px-0 py-0">
          {/* Filter bar */}
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Select value={roleFilter} onValueChange={handleRoleChange}>
                <SelectTrigger className="h-8 w-auto gap-1 text-sm">
                  <span className="text-muted-foreground">Rol:</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectGroup>
                    {ROLE_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <span className="text-sm text-muted-foreground tabular-nums">
              {selectedCount > 0
                ? `${selectedCount} seleccionado${selectedCount !== 1 ? 's' : ''}`
                : ''}
            </span>
          </div>

          {/* Table */}
          {!isLoadingPermissions && (
            <UsersTable
              table={table}
              loading={loading}
              serverPage={page}
              serverTotal={total}
              serverLimit={limit}
              onPageChange={setPage}
              onLimitChange={lim => {
                setLimit(lim);
                setPage(1);
              }}
            />
          )}
        </CardContent>
      </Card>

      {sharedModals}
    </div>
  );
};

export default UsersPage;
