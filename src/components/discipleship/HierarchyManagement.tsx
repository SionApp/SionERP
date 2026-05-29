import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Skeleton } from '@/components/ui/skeleton';
import { useZones } from '@/hooks/useZones';
import { DiscipleshipService, type UserForHierarchy } from '@/services/discipleship.service';
import type { AssignHierarchyRequest } from '@/types/discipleship.types';
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  Loader2,
  MapPin,
  Search,
  UserCheck,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

const HIERARCHY_LEVELS = [
  { value: 1, label: 'Nivel 1 - Líder de Grupo' },
  { value: 2, label: 'Nivel 2 - Supervisor Auxiliar' },
  { value: 3, label: 'Nivel 3 - Supervisor General' },
  { value: 4, label: 'Nivel 4 - Coordinador' },
  { value: 5, label: 'Nivel 5 - Pastoral' },
];

// const ZONES = ['Zona Norte', 'Zona Sur', 'Zona Este', 'Zona Oeste', 'Zona Centro'];

// Helper para normalizar valores sql.NullString que vienen como {String, Valid}
const normalizeNullString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'String' in value && 'Valid' in value) {
    const nullString = value as { String: string; Valid: boolean };
    return nullString.Valid ? nullString.String : null;
  }
  return String(value);
};

const PAGE_SIZE = 10;

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
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

const HierarchyManagement = () => {
  const { zones } = useZones();
  const [users, setUsers] = useState<UserForHierarchy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserForHierarchy | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<AssignHierarchyRequest>({
    user_id: '',
    hierarchy_level: 1,
    supervisor_id: '',
    zone_name: '',
    territory: '',
  });

  // Cargar usuarios con su nivel de jerarquía desde el endpoint de discipulado.
  // Usa /discipleship/users en lugar de /users para no depender del rol de sistema.
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const usersData = await DiscipleshipService.getUsersForHierarchy();
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error: unknown) {
      console.error('Error loading data:', error);
      if (error instanceof Error) {
        toast.error(`Error al cargar datos: ${error.message}`);
      } else {
        toast.error('Error al cargar datos');
      }
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtrar usuarios
  const filteredUsers = (users || [])
    .filter(user => user && user.id)
    .filter(
      user =>
        (user.first_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.last_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.id_number || '').includes(searchTerm)
    );

  // Paginación
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pagedUsers = filteredUsers.slice(pageStart, pageStart + PAGE_SIZE);

  // Reset a página 1 al cambiar búsqueda
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Abrir diálogo para editar jerarquía
  const handleEditHierarchy = (user: UserForHierarchy) => {
    try {
      if (!user || !user.id) {
        toast.error('Usuario inválido');
        return;
      }

      setSelectedUser(user);
      setFormData({
        user_id: user.id,
        hierarchy_level:
          user.hierarchy_level && user.hierarchy_level >= 1 && user.hierarchy_level <= 5
            ? user.hierarchy_level
            : 1,
        supervisor_id: user.supervisor_id || '',
        zone_name: user.zone_name || '',
        territory: user.territory || '',
      });
      setIsDialogOpen(true);
    } catch (error) {
      console.error('Error opening hierarchy dialog:', error);
      toast.error('Error al abrir el formulario de jerarquía');
    }
  };

  // Guardar jerarquía
  const handleSaveHierarchy = async () => {
    if (!selectedUser || !formData.user_id) {
      toast.error('Usuario no seleccionado');
      return;
    }

    if (!formData.hierarchy_level || formData.hierarchy_level < 1 || formData.hierarchy_level > 5) {
      toast.error('Nivel de jerarquía inválido');
      return;
    }

    try {
      setIsSaving(true);

      const selectedZone = zones.find(z => z.name === formData.zone_name);

      // Preparar datos para enviar (solo enviar campos no vacíos)
      const dataToSend: AssignHierarchyRequest = {
        user_id: formData.user_id,
        hierarchy_level: formData.hierarchy_level,
        supervisor_id: formData.supervisor_id || undefined,
        zone_name: formData.zone_name || undefined,
        zone_id: selectedZone?.id || undefined,
        territory: formData.territory || undefined,
      };

      await DiscipleshipService.assignHierarchy(dataToSend);

      toast.success('Jerarquía asignada exitosamente');
      setIsDialogOpen(false);
      setSelectedUser(null);
      await loadData(); // Recargar datos
    } catch (error: unknown) {
      console.error('Error saving hierarchy:', error);
      if (error instanceof Error) {
        toast.error(`Error al guardar: ${error.message}`);
      } else {
        toast.error('Error al guardar jerarquía');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // supervisor_id apunta HACIA ARRIBA: es quien supervisa a este usuario.
  // Ejemplo: un Líder (N1) tiene como supervisor a un Supervisor Auxiliar (N2).
  // Un Supervisor Auxiliar gestiona hasta 5 Líderes porque esos Líderes
  // tienen su supervisor_id apuntando a él — no al revés.
  // → buscar nivel N+1. Excepción: Pastoral (N5) supervisa a todos los
  //   coordinadores sin importar zona (suele haber uno solo).
  const getAvailableSupervisors = (
    currentUserId: string,
    currentLevel: number,
    zoneName?: string
  ) => {
    if (!Array.isArray(users)) return [];

    const targetLevel = currentLevel + 1;
    if (targetLevel > 5) return [];

    return users
      .filter(u => {
        if (!u || !u.id || u.id === currentUserId) return false;
        if (u.hierarchy_level !== targetLevel) return false;
        // Pastoral supervisa a todos sin importar zona
        if (targetLevel === 5) return true;
        if (zoneName && normalizeNullString(u.zone_name) !== zoneName) return false;
        return true;
      })
      .map(u => ({
        id: u.id,
        name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Usuario sin nombre',
        level: u.hierarchy_level!,
      }));
  };

  const supervisorLabelForLevel = (level: number) => {
    const labels: Record<number, string> = {
      1: 'Supervisor Auxiliar (reporta a)',
      2: 'Supervisor General (reporta a)',
      3: 'Coordinador (reporta a)',
      4: 'Pastoral (reporta a)',
    };
    return labels[level] ?? 'Reporta a';
  };

  const getLevelBadge = (level: number | undefined) => {
    if (!level) return <Badge variant="outline">Sin jerarquía</Badge>;

    const configs = {
      1: { label: 'Líder', className: 'bg-emerald-500 hover:bg-emerald-600' },
      2: { label: 'Sup. Auxiliar', className: 'bg-blue-500 hover:bg-blue-600' },
      3: { label: 'Sup. General', className: 'bg-indigo-500 hover:bg-indigo-600' },
      4: { label: 'Coordinador', className: 'bg-purple-500 hover:bg-purple-600' },
      5: { label: 'Pastoral', className: 'bg-amber-500 hover:bg-amber-600 text-white' },
    } as const;

    const config = configs[level as keyof typeof configs] || {
      label: `Nivel ${level}`,
      className: '',
    };

    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Validar que tenemos datos válidos antes de renderizar
  if (!Array.isArray(users)) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <p>Error al cargar usuarios. Por favor, recarga la página.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Gestión de Jerarquías</h2>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">
            Asigna y gestiona los niveles de jerarquía en el módulo de discipulado
          </p>
        </div>
      </div>

      {/* Búsqueda */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, email o cédula..."
              value={searchTerm}
              onChange={e => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de usuarios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuarios
            <span className="text-sm font-normal text-muted-foreground">
              ({filteredUsers.length}
              {searchTerm ? ` de ${users.length}` : ''})
            </span>
          </CardTitle>
          <CardDescription>
            Lista de usuarios y sus jerarquías actuales en el módulo de discipulado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No se encontraron usuarios</p>
              </div>
            ) : (
              pagedUsers
                .filter(user => user && user.id)
                .map(user => {
                  const supervisor = user.supervisor_id
                    ? users.find(u => u && u.id === user.supervisor_id)
                    : null;

                  return (
                    <div
                      key={user.id}
                      className="group relative flex flex-col gap-4 p-4 sm:p-5 border border-border/50 rounded-2xl bg-card hover:bg-accent/5 transition-all duration-300 shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarFallback
                              className={cn(
                                'text-xs font-semibold',
                                getAvatarTone(`${user.first_name || ''}${user.last_name || ''}`)
                              )}
                            >
                              {getInitials(user.first_name || '', user.last_name || '')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <h3 className="font-bold text-base truncate">
                                {user.first_name || ''} {user.last_name || ''}
                              </h3>
                              {getLevelBadge(user.hierarchy_level ?? undefined)}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {user.email || ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl opacity-0 group-hover:opacity-100 sm:opacity-0 transition-opacity bg-accent/50"
                            onClick={() => handleEditHierarchy(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-accent/30 border border-border/30">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                              Zona
                            </p>
                            <p className="text-sm font-medium truncate">
                              {user.zone_name || 'Sin zona'}
                            </p>
                          </div>
                        </div>

                        {supervisor && (
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                              <UserCheck className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                                Supervisor
                              </p>
                              <p className="text-sm font-medium truncate">
                                {supervisor.first_name || ''} {supervisor.last_name || ''}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {!user.hierarchy_level && (
                        <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                            Pendiente de asignación
                          </p>
                        </div>
                      )}

                      <div className="sm:hidden">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full rounded-xl gap-2 font-semibold"
                          onClick={() => handleEditHierarchy(user)}
                        >
                          <Edit className="h-4 w-4" />
                          {user.hierarchy_level ? 'Editar Jerarquía' : 'Asignar Jerarquía'}
                        </Button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Mostrando{' '}
                <span className="font-medium text-foreground">
                  {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filteredUsers.length)}
                </span>{' '}
                de <span className="font-medium text-foreground">{filteredUsers.length}</span>{' '}
                usuarios
              </p>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {/* Números de página */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Mostrar primera, última, actual y adyacentes
                      return page === 1 || page === totalPages || Math.abs(page - safePage) <= 1;
                    })
                    .reduce<(number | 'ellipsis')[]>((acc, page, idx, arr) => {
                      if (idx > 0 && page - (arr[idx - 1] as number) > 1) {
                        acc.push('ellipsis');
                      }
                      acc.push(page);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === 'ellipsis' ? (
                        <span
                          key={`ellipsis-${idx}`}
                          className="px-1 text-muted-foreground text-sm"
                        >
                          …
                        </span>
                      ) : (
                        <Button
                          key={item}
                          variant={safePage === item ? 'default' : 'outline'}
                          size="icon"
                          className="h-8 w-8 text-xs"
                          onClick={() => setCurrentPage(item as number)}
                        >
                          {item}
                        </Button>
                      )
                    )}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para editar jerarquía — key fuerza remount limpio al cambiar usuario */}
      <Dialog
        key={selectedUser?.id ?? 'new'}
        open={isDialogOpen}
        onOpenChange={open => {
          setIsDialogOpen(open);
          if (!open) setSelectedUser(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedUser
                ? `Asignar Jerarquía - ${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`
                : 'Asignar Jerarquía'}
            </DialogTitle>
            <DialogDescription>
              Define el nivel de jerarquía y la estructura de supervisión para este usuario en el
              módulo de discipulado
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Nivel de Jerarquía */}
            <div>
              <Label htmlFor="hierarchy_level">Nivel de Jerarquía *</Label>
              <Select
                value={(formData.hierarchy_level || 1).toString()}
                onValueChange={value => {
                  const level = parseInt(value, 10);
                  if (!isNaN(level)) {
                    // Al cambiar nivel limpiamos el supervisor porque cambia el tipo esperado
                    setFormData(prev => ({ ...prev, hierarchy_level: level, supervisor_id: '' }));
                  }
                }}
              >
                <SelectTrigger id="hierarchy_level">
                  <SelectValue placeholder="Selecciona un nivel" />
                </SelectTrigger>
                <SelectContent>
                  {HIERARCHY_LEVELS.map(level => (
                    <SelectItem key={level.value} value={level.value.toString()}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                El nivel determina qué dashboard verá el usuario y sus permisos en discipulado
              </p>
            </div>

            {/* Zona — va ANTES del supervisor para que filtre las opciones */}
            <div>
              <Label htmlFor="zone_name">Zona</Label>
              <Select
                value={formData.zone_name || '__none__'}
                onValueChange={value =>
                  setFormData(prev => ({
                    ...prev,
                    zone_name: value === '__none__' ? '' : value,
                    supervisor_id: '', // limpiar supervisor al cambiar zona
                  }))
                }
              >
                <SelectTrigger id="zone_name">
                  <SelectValue placeholder="Selecciona una zona (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin zona</SelectItem>
                  {zones.map(zone => (
                    <SelectItem key={zone.id} value={zone.name}>
                      {zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Supervisor — filtrado por zona y nivel. Nivel 5 (Pastoral) no tiene supervisor */}
            {formData.hierarchy_level >= 1 && formData.hierarchy_level < 5 && (
              <div>
                <Label htmlFor="supervisor_id">
                  {supervisorLabelForLevel(formData.hierarchy_level || 2)}
                </Label>
                <Select
                  value={formData.supervisor_id || '__none__'}
                  onValueChange={value =>
                    setFormData(prev => ({
                      ...prev,
                      supervisor_id: value === '__none__' ? '' : value,
                    }))
                  }
                >
                  <SelectTrigger id="supervisor_id">
                    <SelectValue placeholder="Selecciona (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin asignar</SelectItem>
                    {getAvailableSupervisors(
                      formData.user_id || '',
                      formData.hierarchy_level || 2,
                      formData.zone_name || undefined
                    ).map(sup => (
                      <SelectItem key={sup.id} value={sup.id}>
                        {sup.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.zone_name && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Mostrando solo usuarios de <strong>{formData.zone_name}</strong>
                  </p>
                )}
              </div>
            )}

            {/* Territorio */}
            <div>
              <Label htmlFor="territory">Territorio</Label>
              <Input
                id="territory"
                placeholder="Descripción del territorio (opcional)"
                value={formData.territory || ''}
                onChange={e => setFormData(prev => ({ ...prev, territory: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Descripción del área geográfica o territorio asignado
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSaveHierarchy} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Jerarquía'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HierarchyManagement;
