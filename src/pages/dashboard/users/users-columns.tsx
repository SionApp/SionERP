import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { User } from '@/types/user.types';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';

const AVATAR_TONES = [
  'bg-amber-100 text-amber-700',
  'bg-orange-100 text-orange-700',
  'bg-rose-100 text-rose-700',
  'bg-pink-100 text-pink-700',
  'bg-purple-100 text-purple-700',
  'bg-violet-100 text-violet-700',
  'bg-indigo-100 text-indigo-700',
  'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700',
  'bg-teal-100 text-teal-700',
];

function getAvatarTone(name: string) {
  return AVATAR_TONES[name.length % AVATAR_TONES.length];
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

const STATUS_META: Record<string, { label: string; dotClass: string; badgeClass: string }> = {
  active: {
    label: 'Activo',
    dotClass: 'bg-green-500',
    badgeClass: 'border-green-200 bg-green-50 text-green-700',
  },
  invited: {
    label: 'Invitado',
    dotClass: 'bg-amber-400',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  inactive: {
    label: 'Inactivo',
    dotClass: 'bg-muted-foreground',
    badgeClass: 'border-border bg-muted text-muted-foreground',
  },
};

function getUserStatus(user: User): keyof typeof STATUS_META {
  if (user.last_sign_in_at) return 'active';
  if (user.invitation_status === 'pending' || user.invitation_status === 'resent') return 'invited';
  return 'inactive';
}

function StatusBadge({ user }: { user: User }) {
  const status = getUserStatus(user);
  const meta = STATUS_META[status];
  return (
    <Badge variant="outline" className={cn('gap-1.5 px-2 py-0.5 font-medium', meta.badgeClass)}>
      <span className={cn('size-1.5 rounded-full', meta.dotClass)} />
      {meta.label}
    </Badge>
  );
}

function RoleCell({ role }: { role: string }) {
  const ROLE_LABELS: Record<string, string> = {
    admin: 'Administrador',
    pastor: 'Pastor',
    staff: 'Staff',
    supervisor: 'Supervisor',
    server: 'Servidor',
    member: 'Miembro',
  };
  return <span className="text-sm">{ROLE_LABELS[role] ?? role}</span>;
}

export type UsersColumnMeta = {
  onView: (user: User) => void;
  onEdit: (user: User) => void;
  onInvite: (user: User) => void;
  onDelete: (user: User) => void;
  canEdit: boolean;
  canDelete: boolean;
};

export function buildUsersColumns(meta: UsersColumnMeta): ColumnDef<User>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            aria-label="Seleccionar todos"
            checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected()}
            onCheckedChange={v => table.toggleAllPageRowsSelected(!!v)}
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            aria-label={`Seleccionar ${row.original.first_name}`}
            checked={row.getIsSelected()}
            onCheckedChange={v => row.toggleSelected(!!v)}
          />
        </div>
      ),
      enableHiding: false,
      enableSorting: false,
      size: 48,
    },
    {
      accessorKey: 'first_name',
      header: 'Usuario',
      cell: ({ row }) => {
        const u = row.original;
        const tone = getAvatarTone(`${u.first_name}${u.last_name}`);
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className={cn('text-xs font-semibold', tone)}>
                {getInitials(u.first_name || '', u.last_name || '')}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-foreground">
                {u.first_name} {u.last_name}
              </div>
              <div className="truncate text-xs text-muted-foreground">{u.email}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'id_number',
      header: 'Cédula',
      cell: ({ row }) => (
        <div>
          <div className="text-sm">{row.original.id_number}</div>
          <div className="text-xs text-muted-foreground">{row.original.phone}</div>
        </div>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Rol',
      cell: ({ row }) => <RoleCell role={row.original.role} />,
    },
    {
      accessorKey: 'zone_name',
      header: 'Zona',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.zone_name || '—'}</span>
      ),
    },
    {
      id: 'status',
      header: 'Estado',
      cell: ({ row }) => <StatusBadge user={row.original} />,
    },
    {
      accessorKey: 'created_at',
      header: 'Registro',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.original.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Acciones</div>,
      cell: ({ row }) => {
        const u = row.original;
        const canResend =
          !u.last_sign_in_at &&
          !!u.invitation_id &&
          (u.invitation_status === 'pending' || u.invitation_status === 'resent');

        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Acciones para ${u.first_name}`}
                  className="h-8 w-8 p-0 text-muted-foreground"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => meta.onView(u)}>Ver perfil</DropdownMenuItem>
                  {meta.canEdit && (
                    <DropdownMenuItem onClick={() => meta.onEdit(u)}>
                      Editar usuario
                    </DropdownMenuItem>
                  )}
                  {canResend && (
                    <DropdownMenuItem onClick={() => meta.onInvite(u)}>
                      Reenviar invitación
                    </DropdownMenuItem>
                  )}
                  {!u.last_sign_in_at && !canResend && meta.canEdit && (
                    <DropdownMenuItem onClick={() => meta.onInvite(u)}>
                      Invitar usuario
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
                {meta.canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => meta.onDelete(u)}
                      >
                        Eliminar usuario
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      enableHiding: false,
      enableSorting: false,
      size: 64,
    },
  ];
}
