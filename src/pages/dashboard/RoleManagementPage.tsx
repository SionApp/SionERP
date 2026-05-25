import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_DISPLAY_NAMES, ROLE_LEVELS, invalidatePermissionsCache } from '@/lib/permissions';
import { ApiService } from '@/services/api.service';
import { UserService } from '@/services/user.service';
import { User, UserRole } from '@/types/user.types';
import {
  Award,
  Check,
  ChevronDown,
  ChevronUp,
  Crown,
  Loader2,
  Search,
  Shield,
  Star,
  UserCheck,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

// ── Static role definitions (match backend behavior) ──────────────────────────

interface RoleDef {
  id: UserRole;
  icon: React.ElementType;
  gradient: string;
  bg: string;
  text: string;
  border: string;
  description: string;
  permissions: {
    category: string;
    actions: { label: string; allowed: boolean }[];
  }[];
}

const ROLE_DEFS: RoleDef[] = [
  {
    id: 'admin',
    icon: Shield,
    gradient: 'from-slate-600 to-slate-800',
    bg: 'bg-slate-500/10',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-500/20',
    description: 'Acceso total al sistema. Gestiona módulos, roles, configuración y usuarios.',
    permissions: [
      { category: 'Usuarios', actions: [{ label: 'Crear', allowed: true }, { label: 'Ver', allowed: true }, { label: 'Editar', allowed: true }, { label: 'Eliminar', allowed: true }] },
      { category: 'Roles', actions: [{ label: 'Asignar', allowed: true }, { label: 'Ver', allowed: true }] },
      { category: 'Módulos', actions: [{ label: 'Gestionar', allowed: true }, { label: 'Ver', allowed: true }] },
      { category: 'Reportes', actions: [{ label: 'Generar', allowed: true }, { label: 'Ver', allowed: true }] },
      { category: 'Configuración', actions: [{ label: 'Editar', allowed: true }, { label: 'Ver', allowed: true }] },
    ],
  },
  {
    id: 'pastor',
    icon: Crown,
    gradient: 'from-red-500 to-rose-600',
    bg: 'bg-red-500/10',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-500/20',
    description: 'Líder espiritual. Acceso administrativo completo excepto gestión de módulos del sistema.',
    permissions: [
      { category: 'Usuarios', actions: [{ label: 'Crear', allowed: true }, { label: 'Ver', allowed: true }, { label: 'Editar', allowed: true }, { label: 'Eliminar', allowed: true }] },
      { category: 'Roles', actions: [{ label: 'Asignar', allowed: true }, { label: 'Ver', allowed: true }] },
      { category: 'Módulos', actions: [{ label: 'Gestionar', allowed: true }, { label: 'Ver', allowed: true }] },
      { category: 'Reportes', actions: [{ label: 'Generar', allowed: true }, { label: 'Ver', allowed: true }] },
      { category: 'Configuración', actions: [{ label: 'Editar', allowed: true }, { label: 'Ver', allowed: true }] },
    ],
  },
  {
    id: 'staff',
    icon: Award,
    gradient: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/20',
    description: 'Equipo pastoral. Gestión de usuarios y acceso a reportes. Sin acceso a configuración.',
    permissions: [
      { category: 'Usuarios', actions: [{ label: 'Crear', allowed: true }, { label: 'Ver', allowed: true }, { label: 'Editar', allowed: true }, { label: 'Eliminar', allowed: false }] },
      { category: 'Roles', actions: [{ label: 'Asignar', allowed: false }, { label: 'Ver', allowed: true }] },
      { category: 'Módulos', actions: [{ label: 'Gestionar', allowed: false }, { label: 'Ver', allowed: true }] },
      { category: 'Reportes', actions: [{ label: 'Generar', allowed: true }, { label: 'Ver', allowed: true }] },
      { category: 'Configuración', actions: [{ label: 'Editar', allowed: false }, { label: 'Ver', allowed: true }] },
    ],
  },
  {
    id: 'supervisor',
    icon: Star,
    gradient: 'from-purple-500 to-violet-600',
    bg: 'bg-purple-500/10',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-500/20',
    description: 'Supervisión de grupos celulares. Acceso a reportes de sus subordinados.',
    permissions: [
      { category: 'Usuarios', actions: [{ label: 'Crear', allowed: false }, { label: 'Ver', allowed: true }, { label: 'Editar', allowed: true }, { label: 'Eliminar', allowed: false }] },
      { category: 'Roles', actions: [{ label: 'Asignar', allowed: false }, { label: 'Ver', allowed: true }] },
      { category: 'Módulos', actions: [{ label: 'Gestionar', allowed: false }, { label: 'Ver', allowed: false }] },
      { category: 'Reportes', actions: [{ label: 'Generar', allowed: false }, { label: 'Ver', allowed: true }] },
      { category: 'Configuración', actions: [{ label: 'Editar', allowed: false }, { label: 'Ver', allowed: false }] },
    ],
  },
  {
    id: 'server',
    icon: UserCheck,
    gradient: 'from-emerald-500 to-green-600',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/20',
    description: 'Miembro servidor. Acceso básico: perfil propio, módulos asignados.',
    permissions: [
      { category: 'Usuarios', actions: [{ label: 'Crear', allowed: false }, { label: 'Ver', allowed: false }, { label: 'Editar', allowed: false }, { label: 'Eliminar', allowed: false }] },
      { category: 'Roles', actions: [{ label: 'Asignar', allowed: false }, { label: 'Ver', allowed: false }] },
      { category: 'Módulos', actions: [{ label: 'Gestionar', allowed: false }, { label: 'Ver', allowed: false }] },
      { category: 'Reportes', actions: [{ label: 'Generar', allowed: false }, { label: 'Ver', allowed: false }] },
      { category: 'Configuración', actions: [{ label: 'Editar', allowed: false }, { label: 'Ver', allowed: false }] },
    ],
  },
  {
    id: 'member',
    icon: Users,
    gradient: 'from-orange-400 to-amber-500',
    bg: 'bg-orange-400/10',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-400/20',
    description: 'Miembro general. Solo puede ver y editar su propio perfil.',
    permissions: [
      { category: 'Usuarios', actions: [{ label: 'Crear', allowed: false }, { label: 'Ver', allowed: false }, { label: 'Editar', allowed: false }, { label: 'Eliminar', allowed: false }] },
      { category: 'Roles', actions: [{ label: 'Asignar', allowed: false }, { label: 'Ver', allowed: false }] },
      { category: 'Módulos', actions: [{ label: 'Gestionar', allowed: false }, { label: 'Ver', allowed: false }] },
      { category: 'Reportes', actions: [{ label: 'Generar', allowed: false }, { label: 'Ver', allowed: false }] },
      { category: 'Configuración', actions: [{ label: 'Editar', allowed: false }, { label: 'Ver', allowed: false }] },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function initials(u: User) {
  const f = u.first_name?.[0] ?? '';
  const l = u.last_name?.[0] ?? '';
  return (f + l).toUpperCase() || u.email[0].toUpperCase();
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function RoleManagementPage() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRole, setExpandedRole] = useState<UserRole | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignRole, setAssignRole] = useState<UserRole | ''>('');
  const [assignSearch, setAssignSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmChange, setConfirmChange] = useState<{ user: User; newRole: UserRole } | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await UserService.getUsers();
      setUsers(data);
    } catch {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  // Group users by role
  const usersByRole = useMemo(() => {
    const map: Partial<Record<UserRole, User[]>> = {};
    for (const u of users) {
      if (!map[u.role]) map[u.role] = [];
      map[u.role]!.push(u);
    }
    return map;
  }, [users]);

  // Users available to assign (filtered by search)
  const filteredForAssign = useMemo(() => {
    const q = assignSearch.toLowerCase();
    return users.filter(u =>
      !q ||
      u.first_name?.toLowerCase().includes(q) ||
      u.last_name?.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  }, [users, assignSearch]);

  const doRoleChange = async (userId: string, newRole: UserRole) => {
    setSaving(true);
    try {
      await ApiService.put(`/users/${userId}`, { role: newRole });
      invalidatePermissionsCache();
      toast.success(`Rol actualizado a ${ROLE_DISPLAY_NAMES[newRole]}`);
      await loadUsers();
      setAssignOpen(false);
      setAssignUserId('');
      setAssignRole('');
      setAssignSearch('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar rol';
      toast.error(msg);
    } finally {
      setSaving(false);
      setConfirmChange(null);
    }
  };

  const handleAssignSubmit = () => {
    if (!assignUserId || !assignRole) return;
    const user = users.find(u => u.id === assignUserId);
    if (!user) return;
    if (user.role === assignRole) {
      toast.info('El usuario ya tiene ese rol');
      return;
    }
    setConfirmChange({ user, newRole: assignRole });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 p-3 sm:p-4 md:p-6 max-w-5xl">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Gestión de Roles</h1>
              <Badge variant="secondary" className="tabular-nums">
                {users.length} usuarios
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Administrá los roles del sistema y asignalos a los miembros.
            </p>
          </div>
          <Button onClick={() => setAssignOpen(true)} className="w-full sm:w-auto">
            <UserCog className="w-4 h-4 mr-2" />
            Asignar Rol
          </Button>
        </div>

        {/* ── Stats strip ── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
            <p className="text-2xl font-bold">{ROLE_DEFS.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Roles del sistema</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
            <p className="text-2xl font-bold">{users.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Usuarios activos</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
            <p className="text-2xl font-bold text-primary">
              {usersByRole['admin']?.length ?? 0 + (usersByRole['pastor']?.length ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Con acceso admin</p>
          </div>
        </div>

        {/* ── Role cards ── */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {ROLE_DEFS.map(def => {
            const Icon = def.icon;
            const roleUsers = usersByRole[def.id] ?? [];
            const isExpanded = expandedRole === def.id;
            const level = ROLE_LEVELS[def.id];

            return (
              <div
                key={def.id}
                className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm"
              >
                {/* Color accent */}
                <div className={`h-0.5 bg-gradient-to-r ${def.gradient}`} />

                <div className="p-4 sm:p-5">
                  {/* Role header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${def.bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${def.text}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm leading-tight">
                            {ROLE_DISPLAY_NAMES[def.id]}
                          </h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${def.bg} ${def.text} ${def.border}`}>
                            Nivel {level}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                          {def.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xl font-bold leading-tight">{roleUsers.length}</p>
                      <p className="text-xs text-muted-foreground">usuarios</p>
                    </div>
                  </div>

                  {/* Permissions mini-matrix */}
                  <div className="grid grid-cols-1 gap-1.5 mb-3">
                    {def.permissions.map(cat => (
                      <div key={cat.category} className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-24 flex-shrink-0 uppercase tracking-wide font-medium">
                          {cat.category}
                        </span>
                        <div className="flex items-center gap-1 flex-wrap">
                          {cat.actions.map(action => (
                            <span
                              key={action.label}
                              className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                action.allowed
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-muted text-muted-foreground/50 line-through'
                              }`}
                            >
                              {action.allowed ? (
                                <Check className="w-2.5 h-2.5" />
                              ) : (
                                <X className="w-2.5 h-2.5" />
                              )}
                              {action.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Toggle users button */}
                  <button
                    onClick={() => setExpandedRole(isExpanded ? null : def.id)}
                    disabled={roleUsers.length === 0}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium border transition-colors duration-200 ${
                      roleUsers.length === 0
                        ? 'border-border/30 text-muted-foreground/40 cursor-default'
                        : 'border-border/50 hover:bg-muted/40 cursor-pointer'
                    }`}
                  >
                    <span>
                      {roleUsers.length === 0
                        ? 'Sin usuarios asignados'
                        : `Ver ${roleUsers.length} usuario${roleUsers.length !== 1 ? 's' : ''}`}
                    </span>
                    {roleUsers.length > 0 && (
                      isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Expanded users list */}
                {isExpanded && roleUsers.length > 0 && (
                  <div className="border-t border-border/30 bg-muted/20 px-4 sm:px-5 py-3 space-y-2 max-h-56 overflow-y-auto">
                    {roleUsers.map(u => (
                      <div key={u.id} className="flex items-center gap-3">
                        <Avatar className="w-7 h-7 flex-shrink-0">
                          <AvatarFallback className={`text-[10px] font-bold ${def.bg} ${def.text}`}>
                            {initials(u)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">
                            {u.first_name} {u.last_name}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                        </div>
                        {/* Don't allow changing own role */}
                        {u.id !== currentUser?.id && (
                          <button
                            onClick={() => {
                              setAssignUserId(u.id);
                              setAssignRole('');
                              setAssignOpen(true);
                            }}
                            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 cursor-pointer px-2 py-1 rounded-lg hover:bg-muted"
                          >
                            Cambiar
                          </button>
                        )}
                        {u.id === currentUser?.id && (
                          <span className="text-[10px] text-muted-foreground/50 flex-shrink-0 px-2">Vos</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Assign Role Dialog ── */}
      <Dialog
        open={assignOpen}
        onOpenChange={open => {
          setAssignOpen(open);
          if (!open) {
            setAssignUserId('');
            setAssignRole('');
            setAssignSearch('');
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-primary" />
              Asignar Rol
            </DialogTitle>
            <DialogDescription>
              Cambiá el rol de un usuario. El cambio aplica de inmediato.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* User selector */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Usuario
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o email..."
                  value={assignSearch}
                  onChange={e => setAssignSearch(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>

              <div className="rounded-xl border border-border/50 max-h-48 overflow-y-auto">
                {filteredForAssign.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">Sin resultados</p>
                ) : (
                  filteredForAssign.map(u => {
                    const def = ROLE_DEFS.find(d => d.id === u.role);
                    const isSelected = assignUserId === u.id;
                    const isSelf = u.id === currentUser?.id;
                    return (
                      <button
                        key={u.id}
                        disabled={isSelf}
                        onClick={() => setAssignUserId(u.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-primary/10 border-l-2 border-primary'
                            : 'hover:bg-muted/40'
                        } ${isSelf ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <Avatar className="w-7 h-7 flex-shrink-0">
                          <AvatarFallback className={`text-[10px] font-bold ${def?.bg ?? ''} ${def?.text ?? ''}`}>
                            {initials(u)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">
                            {u.first_name} {u.last_name}
                            {isSelf && <span className="text-muted-foreground ml-1">(vos)</span>}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${def?.bg ?? 'bg-muted'} ${def?.text ?? 'text-muted-foreground'} flex-shrink-0`}>
                          {ROLE_DISPLAY_NAMES[u.role]}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Role selector */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Nuevo Rol
              </Label>
              <Select
                value={assignRole}
                onValueChange={v => setAssignRole(v as UserRole)}
                disabled={!assignUserId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná un rol..." />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_DEFS.map(def => {
                    const currentUserRole = users.find(u => u.id === assignUserId)?.role;
                    return (
                      <SelectItem
                        key={def.id}
                        value={def.id}
                        disabled={def.id === currentUserRole}
                      >
                        <div className="flex items-center gap-2">
                          <def.icon className={`w-3.5 h-3.5 ${def.text}`} />
                          <span>{ROLE_DISPLAY_NAMES[def.id]}</span>
                          {def.id === currentUserRole && (
                            <span className="text-muted-foreground text-xs">(actual)</span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Footer buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setAssignOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                disabled={!assignUserId || !assignRole || saving}
                onClick={handleAssignSubmit}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Guardar cambio
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirm role change ── */}
      <AlertDialog open={!!confirmChange} onOpenChange={open => !open && setConfirmChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar cambio de rol?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a cambiar el rol de{' '}
              <strong>
                {confirmChange?.user.first_name} {confirmChange?.user.last_name}
              </strong>{' '}
              de <strong>{ROLE_DISPLAY_NAMES[confirmChange?.user.role ?? 'member']}</strong> a{' '}
              <strong>{ROLE_DISPLAY_NAMES[confirmChange?.newRole ?? 'member']}</strong>. El
              cambio aplica de inmediato y afecta su acceso al sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmChange(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmChange) doRoleChange(confirmChange.user.id, confirmChange.newRole);
              }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
