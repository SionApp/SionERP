import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DiscipleshipService } from '@/services/discipleship.service';
import { UserDocumentsTab } from '@/components/UserDocumentsTab';
import {
  DiscipleshipGroup,
  DiscipleshipHierarchy,
  DiscipleshipReport,
} from '@/types/discipleship.types';
import { User as UserType } from '@/types/user.types';
import { parseGoTime } from '@/lib/go-time';
import {
  Activity,
  AlertCircle,
  Building2,
  Calendar,
  Edit,
  FileText,
  History,
  Mail,
  MapPin,
  Phone,
  User,
  UserCheck,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface UserDetailSheetProps {
  user: UserType | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (user: UserType) => void;
  /** Issue #72: valida un visitante (abre el modal de invitar/crear directo). */
  onValidateVisitor?: (user: UserType) => void;
}

const LEVEL_NAMES: Record<number, string> = {
  1: 'Líder',
  2: 'Supervisor Auxiliar',
  3: 'Supervisor General',
  4: 'Coordinador',
  5: 'Pastoral',
};

export const UserDetailSheet = ({
  user,
  isOpen,
  onClose,
  onEdit,
  onValidateVisitor,
}: UserDetailSheetProps) => {
  const navigate = useNavigate();
  const [hierarchy, setHierarchy] = useState<DiscipleshipHierarchy | null>(null);
  const [groups, setGroups] = useState<DiscipleshipGroup[]>([]);
  const [subordinates, setSubordinates] = useState<DiscipleshipHierarchy[]>([]);
  const [reports, setReports] = useState<DiscipleshipReport[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      loadUserRelations();
    }
  }, [user, isOpen]);

  const loadUserRelations = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [hierarchyRes, groupsRes, subordinatesRes, reportsRes] = await Promise.allSettled([
        DiscipleshipService.getHierarchy(user.id),
        DiscipleshipService.getGroups({ leader_id: user.id }),
        DiscipleshipService.getSubordinates(user.id),
        DiscipleshipService.getReports({ reporter_id: user.id, limit: 10 }),
      ]);

      if (hierarchyRes.status === 'fulfilled') {
        setHierarchy((hierarchyRes.value ?? [])[0] ?? null);
      }
      if (groupsRes.status === 'fulfilled') {
        setGroups(groupsRes.value?.data ?? []);
      }
      if (subordinatesRes.status === 'fulfilled') {
        setSubordinates(subordinatesRes.value ?? []);
      }
      if (reportsRes.status === 'fulfilled') {
        setReports(reportsRes.value ?? []);
      }
    } catch (error) {
      console.error('Error loading user relations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

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
    const roles: Record<string, string> = {
      pastor: 'Pastor',
      staff: 'Staff',
      supervisor: 'Supervisor',
      server: 'Servidor',
      member: 'Miembro',
    };
    return roles[role] || role;
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="space-y-4">
          {/* Header con Avatar y Info Básica */}
          <div className="flex items-start gap-3 sm:gap-4">
            <Avatar className="h-12 w-12 sm:h-16 sm:w-16 shrink-0">
              <AvatarFallback className="text-base sm:text-lg font-semibold bg-primary text-primary-foreground">
                {getInitials(user.first_name || '', user.last_name || '')}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg sm:text-2xl truncate">
                {user.first_name} {user.last_name}
              </SheetTitle>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5 mb-2">
                <Badge variant={getRoleBadgeVariant(user.role)}>
                  {getRoleDisplayName(user.role)}
                </Badge>
                {user.is_active_member ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Miembro Activo
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    Miembro Inactivo
                  </Badge>
                )}
                {user.is_visitor && (
                  <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                    Visitante
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-1 min-w-0">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3 shrink-0" />
                    <span>{user.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <Separator className="my-6" />

        {/* Tabs con toda la información */}
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="flex w-full overflow-x-auto justify-start sm:grid sm:grid-cols-5">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="discipleship">Discipulado</TabsTrigger>
            <TabsTrigger value="metrics">Métricas</TabsTrigger>
            <TabsTrigger value="reports">Reportes</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
          </TabsList>

          {/* TAB: GENERAL */}
          <TabsContent value="general" className="space-y-4 mt-4">
            {/* Información Personal */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Información Personal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <InfoRow label="Cédula" value={user.id_number} />
                <InfoRow label="Email" value={user.email} icon={<Mail className="h-4 w-4" />} />
                <InfoRow label="Teléfono" value={user.phone} icon={<Phone className="h-4 w-4" />} />
                <InfoRow label="WhatsApp" value={user.whatsapp ? 'Sí' : 'No'} />
                <InfoRow
                  label="Dirección"
                  value={user.address}
                  icon={<MapPin className="h-4 w-4" />}
                />
                <InfoRow
                  label="Fecha de Nacimiento"
                  value={
                    user.birth_date
                      ? new Date(user.birth_date).toLocaleDateString()
                      : 'No especificada'
                  }
                  icon={<Calendar className="h-4 w-4" />}
                />
                <InfoRow label="Estado Civil" value={user.marital_status || 'No especificado'} />
                <InfoRow label="Ocupación" value={user.occupation || 'No especificada'} />
                <InfoRow
                  label="Nivel Educativo"
                  value={user.education_level || 'No especificado'}
                />
              </CardContent>
            </Card>

            {/* Contacto de Emergencia */}
            {(user.emergency_contact_name || user.emergency_contact_phone) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Contacto de Emergencia
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <InfoRow label="Nombre" value={user.emergency_contact_name} />
                  <InfoRow label="Teléfono" value={user.emergency_contact_phone} />
                </CardContent>
              </Card>
            )}

            {/* Información Eclesiástica */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Información Eclesiástica
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <InfoRow
                  label="Bautizado"
                  value={user.baptized ? 'Sí' : 'No'}
                  badge={user.baptized ? { variant: 'default', text: 'Bautizado' } : undefined}
                />
                {user.baptized && user.baptism_date && (
                  <InfoRow
                    label="Fecha de Bautismo"
                    value={new Date(user.baptism_date).toLocaleDateString()}
                  />
                )}

                <InfoRow label="Miembro Activo" value={user.is_active_member ? 'Sí' : 'No'} />
                {user.membership_date && (
                  <InfoRow
                    label="Fecha de Membresía"
                    value={new Date(user.membership_date).toLocaleDateString()}
                  />
                )}
                <InfoRow
                  label="Primera Visita"
                  value={
                    user.first_visit_date
                      ? new Date(user.first_visit_date).toLocaleDateString()
                      : 'No registrada'
                  }
                />
                <InfoRow
                  label="Cómo conoció la iglesia"
                  value={user.how_found_church || 'No especificado'}
                />
                <InfoRow
                  label="Interés en Ministerio"
                  value={user.ministry_interest || 'No especificado'}
                />
                <InfoRow label="Grupo Celular" value={user.cell_group || 'Sin asignar'} />
              </CardContent>
            </Card>

            {/* Notas Pastorales (solo para pastor/staff) */}
            {user.pastoral_notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Notas Pastorales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {user.pastoral_notes}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Información del Sistema */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <InfoRow
                  label="Usuario Creado"
                  value={new Date(user.created_at).toLocaleString()}
                />
                <InfoRow
                  label="Última Actualización"
                  value={new Date(user.updated_at).toLocaleString()}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: DISCIPULADO */}
          <TabsContent value="discipleship" className="space-y-4 mt-4">
            {loading ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                Cargando información de discipulado...
              </div>
            ) : (
              <>
                {/* Posición jerárquica */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Posición Jerárquica
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <InfoRow
                      label="Nivel"
                      value={
                        hierarchy
                          ? `${LEVEL_NAMES[hierarchy.hierarchy_level] ?? `Nivel ${hierarchy.hierarchy_level}`}`
                          : 'No asignado'
                      }
                    />
                    <InfoRow
                      label="Supervisor"
                      value={hierarchy?.supervisor_name || 'Sin supervisor'}
                    />
                    <InfoRow
                      label="Zona"
                      value={hierarchy?.zone_name || user.zone_name || 'No asignada'}
                    />
                    <InfoRow
                      label="Territorio"
                      value={hierarchy?.territory || user.territory || 'No asignado'}
                    />
                    <InfoRow
                      label="Grupos asignados"
                      value={
                        hierarchy?.active_groups_assigned?.toString() ??
                        user.active_groups_count?.toString() ??
                        '0'
                      }
                    />
                  </CardContent>
                </Card>

                {/* Grupos que lidera */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Grupos que Lidera
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {groups.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No lidera ningún grupo.</p>
                    ) : (
                      <div className="space-y-3">
                        {groups.map(group => (
                          <div key={group.id} className="border rounded-md p-3 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{group.group_name}</span>
                              <Badge
                                variant={group.status === 'active' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {group.status === 'active'
                                  ? 'Activo'
                                  : group.status === 'multiplying'
                                    ? 'Multiplicando'
                                    : 'Inactivo'}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              {group.meeting_day && (
                                <p>
                                  {group.meeting_day}
                                  {group.meeting_time ? ` · ${group.meeting_time}` : ''}
                                </p>
                              )}
                              {group.meeting_location && <p>{group.meeting_location}</p>}
                              <p>
                                {group.active_members} / {group.member_count} miembros activos
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Subordinados */}
                {subordinates.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Subordinados ({subordinates.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {subordinates.map(sub => (
                          <div key={sub.id} className="flex items-center justify-between text-sm">
                            <span>{sub.user_name || sub.user_email || sub.user_id}</span>
                            <Badge variant="outline" className="text-xs">
                              {LEVEL_NAMES[sub.hierarchy_level] ?? `Nivel ${sub.hierarchy_level}`}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* TAB: MÉTRICAS */}
          <TabsContent value="metrics" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Métricas de Desempeño
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="py-4 text-center text-muted-foreground">Cargando métricas...</div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-muted/50 p-3 text-center">
                        <p className="text-2xl font-bold">{groups.length}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Grupos liderados</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-3 text-center">
                        <p className="text-2xl font-bold">{subordinates.length}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Subordinados</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-3 text-center">
                        <p className="text-2xl font-bold">{reports.length}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Reportes enviados</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-3 text-center">
                        <p className="text-2xl font-bold">
                          {hierarchy
                            ? (LEVEL_NAMES[hierarchy.hierarchy_level] ??
                              `Nivel ${hierarchy.hierarchy_level}`)
                            : '—'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">Nivel jerárquico</p>
                      </div>
                    </div>
                    {hierarchy?.zone_name && (
                      <div className="rounded-lg bg-muted/50 p-3 text-sm">
                        <span className="text-muted-foreground">Zona: </span>
                        <span className="font-medium">{hierarchy.zone_name}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: REPORTES */}
          <TabsContent value="reports" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Reportes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="py-4 text-center text-muted-foreground">Cargando reportes...</div>
                ) : reports.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Este usuario no tiene reportes registrados
                  </p>
                ) : (
                  <div className="space-y-2">
                    {reports.map(r => (
                      <div
                        key={r.id}
                        className="flex items-start justify-between gap-2 p-3 border rounded-lg text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate capitalize">{r.report_type}</p>
                          <p className="text-xs text-muted-foreground">
                            {parseGoTime(r.period_end)?.toLocaleDateString('es-AR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            }) ?? r.period_end}
                          </p>
                        </div>
                        <Badge
                          variant={r.status === 'submitted' ? 'secondary' : 'outline'}
                          className="text-[10px] shrink-0"
                        >
                          {r.status === 'submitted'
                            ? 'Enviado'
                            : r.status === 'draft'
                              ? 'Borrador'
                              : 'En revisión'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4 mt-4">
            <UserDocumentsTab userId={user.id} />
          </TabsContent>
        </Tabs>

        {/* Footer con acciones */}
        <div className="flex gap-2 pt-6 pb-2 border-t mt-6">
          <Button variant="outline" className="flex-1" onClick={() => navigate('/dashboard')}>
            <History className="h-4 w-4 mr-2" />
            Ver Auditoría
          </Button>
          {user.is_visitor && onValidateVisitor ? (
            <Button variant="default" className="flex-1" onClick={() => onValidateVisitor(user)}>
              <UserCheck className="h-4 w-4 mr-2" />
              Validar como miembro
            </Button>
          ) : (
            <Button variant="default" className="flex-1" onClick={() => onEdit?.(user)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar Usuario
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

// Componente helper para mostrar filas de información
const InfoRow = ({
  label,
  value,
  icon,
  badge,
}: {
  label: string;
  value?: string;
  icon?: React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  badge?: { variant: any; text: string };
}) => (
  <div className="flex justify-between items-center py-1">
    <div className="flex items-center gap-2 text-muted-foreground">
      {icon}
      <span className="font-medium">{label}:</span>
    </div>
    <div className="flex items-center gap-2">
      {value && <span className="text-foreground">{value}</span>}
      {badge && (
        <Badge variant={badge.variant} className="text-xs">
          {badge.text}
        </Badge>
      )}
    </div>
  </div>
);

export default UserDetailSheet;
