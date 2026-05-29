import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { DiscipleshipGroup } from '@/types/discipleship.types';
import { ColumnDef } from '@tanstack/react-table';
import { Calendar, MapPin, MoreHorizontal, Users } from 'lucide-react';

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

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatMeetingTime(time: string | null): string {
  if (!time) return '';
  try {
    if (time.includes('T')) {
      const date = new Date(time);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
      }
    }
    return time;
  } catch {
    return time;
  }
}

const STATUS_META: Record<string, { label: string; dotClass: string; badgeClass: string }> = {
  active: {
    label: 'Activo',
    dotClass: 'bg-green-500',
    badgeClass: 'border-green-200 bg-green-50 text-green-700',
  },
  multiplying: {
    label: 'Multiplicando',
    dotClass: 'bg-blue-500',
    badgeClass: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  inactive: {
    label: 'Inactivo',
    dotClass: 'bg-muted-foreground',
    badgeClass: 'border-border bg-muted text-muted-foreground',
  },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.inactive;
  return (
    <Badge variant="outline" className={cn('gap-1.5 px-2 py-0.5 font-medium', meta.badgeClass)}>
      <span className={cn('size-1.5 rounded-full', meta.dotClass)} />
      {meta.label}
    </Badge>
  );
}

export type GroupsColumnMeta = {
  onManageMembers: (group: DiscipleshipGroup) => void;
  onEdit: (group: DiscipleshipGroup) => void;
  onDelete: (group: DiscipleshipGroup) => void;
  canEdit: boolean;
  canDelete: boolean;
};

export function buildGroupsColumns(meta: GroupsColumnMeta): ColumnDef<DiscipleshipGroup>[] {
  return [
    {
      accessorKey: 'group_name',
      header: 'Grupo',
      cell: ({ row }) => {
        const g = row.original;
        const tone = getAvatarTone(g.group_name);
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className={cn('text-xs font-semibold', tone)}>
                {getInitials(g.group_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-foreground">{g.group_name}</div>
              <div className="truncate text-xs text-muted-foreground">
                {g.leader_name || 'Sin líder asignado'}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'zone_name',
      header: 'Zona',
      cell: ({ row }) => {
        const zone = row.original.zone_name;
        return (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span>{zone || '—'}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'meeting_day',
      header: 'Reunión',
      cell: ({ row }) => {
        const { meeting_day, meeting_time } = row.original;
        const time = formatMeetingTime(meeting_time);
        return (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-3 w-3 shrink-0" />
            <span>
              {meeting_day || '—'}
              {time && ` ${time}`}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'active_members',
      header: 'Miembros',
      cell: ({ row }) => {
        const { active_members, member_count } = row.original;
        return (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-3 w-3 shrink-0" />
            <span className="tabular-nums">
              {active_members ?? 0}/{member_count ?? 0}
            </span>
          </div>
        );
      },
    },
    {
      id: 'status',
      header: 'Estado',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Acciones</div>,
      cell: ({ row }) => {
        const g = row.original;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Acciones para ${g.group_name}`}
                  className="h-8 w-8 p-0 text-muted-foreground"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => meta.onManageMembers(g)}>
                    Ver miembros
                  </DropdownMenuItem>
                  {meta.canEdit && (
                    <DropdownMenuItem onClick={() => meta.onEdit(g)}>Editar grupo</DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
                {meta.canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => meta.onDelete(g)}
                      >
                        Eliminar grupo
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
