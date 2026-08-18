import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { getAvatarColor } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { User } from '@/types/user.types';
import { Loader2, Plus, Search, Upload } from 'lucide-react';
import { MobileListItem } from '../MobileListItem';
import { MobileScreen } from '../MobileScreen';
import { MobileSegment } from '../MobileSegment';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  pastor: 'Pastor',
  staff: 'Staff',
  supervisor: 'Supervisor',
  server: 'Servidor',
  member: 'Miembro',
};

const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-red-500/10 text-red-500',
  pastor: 'bg-violet-500/10 text-violet-500',
  staff: 'bg-blue-500/10 text-blue-500',
  supervisor: 'bg-emerald-500/10 text-emerald-600',
  server: 'bg-amber-500/10 text-amber-600',
  member: 'bg-gray-500/10 text-gray-500',
};

interface MobileUsersScreenProps {
  users: User[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  roleFilter: string;
  onRoleChange: (value: string) => void;
  roleOptions: { value: string; label: string }[];
  canCreate: boolean;
  onCreate: () => void;
  onImport: () => void;
  onSelectUser: (user: User) => void;
  hasMore: boolean;
  onLoadMore: () => void;
}

/** Pantalla mobile de Miembros (presentacional — UsersPage es el container). */
export function MobileUsersScreen({
  users,
  total,
  loading,
  loadingMore,
  search,
  onSearchChange,
  roleFilter,
  onRoleChange,
  roleOptions,
  canCreate,
  onCreate,
  onImport,
  onSelectUser,
  hasMore,
  onLoadMore,
}: MobileUsersScreenProps) {
  return (
    <MobileScreen
      title="Miembros"
      subtitle={loading ? '—' : `${total} usuario${total !== 1 ? 's' : ''}`}
      action={
        canCreate ? (
          <div className="flex items-center gap-1">
            <button
              onClick={onImport}
              aria-label="Importar usuarios"
              className="p-2 rounded-xl hover:bg-accent/60 active:bg-accent text-muted-foreground transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" />
            </button>
            <button
              onClick={onCreate}
              aria-label="Nuevo usuario"
              className="p-2 rounded-xl bg-primary text-primary-foreground active:scale-95 transition-transform cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        ) : undefined
      }
    >
      {/* ── Búsqueda + filtro de rol ── */}
      <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-lg px-4 pt-3 pb-2 space-y-2 border-b border-border/30">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="h-9 pl-9 rounded-xl"
            placeholder="Buscar por nombre, email o cédula..."
            value={search}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>
        <MobileSegment
          scrollable
          options={roleOptions}
          value={roleFilter}
          onChange={onRoleChange}
        />
      </div>

      {/* ── Lista ── */}
      {loading ? (
        <div className="px-4 pt-3 space-y-2">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          No se encontraron usuarios
        </p>
      ) : (
        <>
          <div className="mx-4 mt-2 rounded-2xl border border-border divide-y divide-border bg-card overflow-hidden">
            {users.map(user => (
              <MobileListItem
                key={user.id}
                leading={
                  <Avatar className="w-9 h-9">
                    <AvatarFallback
                      className={`${getAvatarColor(`${user.first_name ?? ''} ${user.last_name ?? ''}`)} text-xs font-semibold`}
                    >
                      {(user.first_name?.[0] ?? '') + (user.last_name?.[0] ?? '')}
                    </AvatarFallback>
                  </Avatar>
                }
                title={`${user.first_name} ${user.last_name}`}
                subtitle={user.email}
                trailing={
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ROLE_BADGE[user.role] ?? ROLE_BADGE.member}`}
                  >
                    {ROLE_LABELS[user.role] ?? user.role}
                  </span>
                }
                onClick={() => onSelectUser(user)}
              />
            ))}
          </div>

          {hasMore && (
            <div className="px-4 py-4">
              <button
                onClick={onLoadMore}
                disabled={loadingMore}
                className="w-full py-2.5 rounded-xl border border-border bg-card text-sm font-medium text-muted-foreground active:bg-accent transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Cargar más ({users.length} de {total})
              </button>
            </div>
          )}
        </>
      )}
    </MobileScreen>
  );
}
