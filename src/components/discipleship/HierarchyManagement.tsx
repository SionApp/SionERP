import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { DiscipleshipService } from '@/services/discipleship.service';
import { UserService } from '@/services/user.service';
import type { AssignHierarchyRequest, DiscipleshipHierarchy } from '@/types/discipleship.types';
import { useZones } from '@/hooks/useZones';
import { User } from '@/types/user.types';
import { Edit, Loader2, Search, Users } from 'lucide-react';
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

interface UserWithHierarchy extends User {
  hierarchy?: DiscipleshipHierarchy;
}

const HierarchyManagement = () => {
  const { zones } = useZones();
  const [users, setUsers] = useState<UserWithHierarchy[]>([]);
  const [hierarchies, setHierarchies] = useState<DiscipleshipHierarchy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithHierarchy | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<AssignHierarchyRequest>({
    user_id: '',
    hierarchy_level: 1,
    supervisor_id: '',
    zone_name: '',
    territory: '',
  });

  // Cargar usuarios y jerarquías
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [usersData, hierarchiesData] = await Promise.all([
        UserService.getAllUsers(),
        DiscipleshipService.getHierarchy().catch(err => {
          console.warn('Error loading hierarchy, continuing with empty array:', err);
          return [] as DiscipleshipHierarchy[];
        }),
      ]);

      // Validar que hierarchiesData sea un array
      const validHierarchies = Array.isArray(hierarchiesData) ? hierarchiesData : [];

      // Normalizar jerarquías (manejar valores null del backend)
      const normalizedHierarchies = validHierarchies.map(h => ({
        ...h,
        supervisor_id: normalizeNullString(h.supervisor_id),
        zone_name: normalizeNullString(h.zone_name),
        territory: normalizeNullString(h.territory),
      }));

      // Crear un mapa de jerarquías por user_id
      const hierarchyMap = new Map<string, DiscipleshipHierarchy>();
      normalizedHierarchies.forEach(h => {
        if (h && h.user_id) {
          hierarchyMap.set(h.user_id, h);
        }
      });

      // Combinar usuarios con sus jerarquías
      const usersWithHierarchy = (usersData || []).map(user => ({
        ...user,
        hierarchy: hierarchyMap.get(user.id),
      }));

      setUsers(usersWithHierarchy);
      setHierarchies(normalizedHierarchies);
    } catch (error: unknown) {
      console.error('Error loading data:', error);
      if (error instanceof Error) {
        toast.error(`Error al cargar datos: ${error.message}`);
      } else {
        toast.error('Error al cargar datos');
      }
      // Asegurar que siempre tengamos un array vacío
      setUsers([]);
      setHierarchies([]);
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

  // Abrir diálogo para editar jerarquía
  const handleEditHierarchy = (user: UserWithHierarchy) => {
    try {
      if (!user || !user.id) {
        toast.error('Usuario inválido');
        return;
      }

      const hierarchy = user.hierarchy;
      const hierarchyLevel = hierarchy?.hierarchy_level;
      const supervisorId = hierarchy?.supervisor_id;
      const zoneName = hierarchy?.zone_name;
      const territory = hierarchy?.territory;

      setSelectedUser(user);
      setFormData({
        user_id: user.id,
        hierarchy_level:
          hierarchyLevel && hierarchyLevel >= 1 && hierarchyLevel <= 5 ? hierarchyLevel : 1,
        supervisor_id: supervisorId || '',
        zone_name: zoneName || '',
        territory: territory || '',
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

  // Obtener usuarios que pueden ser supervisores (nivel 2, 3, 4, 5)
  const getAvailableSupervisors = (currentUserId: string, currentLevel: number) => {
    if (!Array.isArray(hierarchies) || !Array.isArray(users)) {
      return [];
    }

    return hierarchies
      .filter(
        h =>
          h &&
          h.user_id &&
          h.user_id !== currentUserId &&
          h.hierarchy_level < currentLevel &&
          h.hierarchy_level >= 2
      )
      .map(h => {
        const user = users.find(u => u && u.id === h.user_id);
        return {
          id: h.user_id,
          name: user
            ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Usuario sin nombre'
            : 'Usuario desconocido',
          level: h.hierarchy_level,
        };
      });
  };

  const getLevelBadge = (level: number | undefined) => {
    if (!level) return <Badge variant="outline">Sin jerarquía</Badge>;

    const colors = {
      1: 'default',
      2: 'secondary',
      3: 'default',
      4: 'secondary',
      5: 'default',
    } as const;

    const labels = {
      1: 'Líder',
      2: 'Sup. Auxiliar',
      3: 'Sup. General',
      4: 'Coordinador',
      5: 'Pastoral',
    };

    return (
      <Badge variant={colors[level as keyof typeof colors] || 'outline'}>
        {labels[level as keyof typeof labels] || `Nivel ${level}`}
      </Badge>
    );
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Jerarquías</h2>
          <p className="text-sm text-muted-foreground">
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
              onChange={e => setSearchTerm(e.target.value)}
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
            Usuarios ({filteredUsers.length})
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
              filteredUsers
                .filter(user => user && user.id)
                .map(user => {
                  const hierarchy = user.hierarchy;
                  const supervisor =
                    hierarchy?.supervisor_id && hierarchy.supervisor_id !== null
                      ? users.find(u => u && u.id === hierarchy.supervisor_id)
                      : null;

                  return (
                    <div
                      key={user.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-medium">
                              {user.first_name || ''} {user.last_name || ''}
                            </p>
                            <p className="text-sm text-muted-foreground">{user.email || ''}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getLevelBadge(hierarchy?.hierarchy_level)}
                            {hierarchy?.zone_name && (
                              <Badge variant="outline">{hierarchy.zone_name}</Badge>
                            )}
                          </div>
                        </div>
                        {supervisor && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Supervisor: {supervisor.first_name || ''} {supervisor.last_name || ''}
                          </p>
                        )}
                        {!hierarchy && (
                          <p className="text-xs text-amber-600 mt-1">
                            Sin jerarquía asignada - No tiene acceso al módulo de discipulado
                          </p>
                        )}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleEditHierarchy(user)}>
                        <Edit className="h-4 w-4 mr-2" />
                        {hierarchy ? 'Editar' : 'Asignar'}
                      </Button>
                    </div>
                  );
                })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog para editar jerarquía */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                    setFormData(prev => ({ ...prev, hierarchy_level: level }));
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

            {/* Supervisor */}
            {formData.hierarchy_level > 1 && (
              <div>
                <Label htmlFor="supervisor_id">Supervisor</Label>
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
                    <SelectValue placeholder="Selecciona un supervisor (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin supervisor</SelectItem>
                    {getAvailableSupervisors(
                      formData.user_id || '',
                      formData.hierarchy_level || 1
                    ).map(supervisor => (
                      <SelectItem key={supervisor.id} value={supervisor.id}>
                        {supervisor.name} (Nivel {supervisor.level})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Usuario que supervisará a este usuario en la jerarquía
                </p>
              </div>
            )}

            {/* Zona */}
            <div>
              <Label htmlFor="zone_name">Zona</Label>
              <Select
                value={formData.zone_name || '__none__'}
                onValueChange={value =>
                  setFormData(prev => ({ ...prev, zone_name: value === '__none__' ? '' : value }))
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
