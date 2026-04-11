import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User as UserType } from '@/types/user.types';
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
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface UserDetailSheetProps {
  user: UserType | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (user: UserType) => void;
}

export const UserDetailSheet = ({ user, isOpen, onClose, onEdit }: UserDetailSheetProps) => {
  const [discipleshipData, setDiscipleshipData] = useState<any>(null);
  const [metricsData, setMetricsData] = useState<any>(null);
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
      // Aquí cargarías todas las relaciones del usuario
      // - Grupos de discipulado donde es líder
      // - Jerarquía de discipulado
      // - Métricas
      // - Reportes
      // - Alertas
      // TODO: Implementar servicios para cargar esta data
      // const hierarchy = await DiscipleshipService.getUserHierarchy(user.id);
      // const groups = await DiscipleshipService.getUserGroups(user.id);
      // const metrics = await DiscipleshipService.getUserMetrics(user.id);
      // etc...
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
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg font-semibold bg-primary text-primary-foreground">
                {getInitials(user.first_name || '', user.last_name || '')}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <SheetTitle className="text-2xl">
                  {user.first_name} {user.last_name}
                </SheetTitle>
                <Badge variant={getRoleBadgeVariant(user.role)}>
                  {getRoleDisplayName(user.role)}
                </Badge>
                {user.is_active ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Activo
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    Inactivo
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  <span>{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="discipleship">Discipulado</TabsTrigger>
            <TabsTrigger value="metrics">Métricas</TabsTrigger>
            <TabsTrigger value="reports">Reportes</TabsTrigger>
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
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Información de Discipulado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <InfoRow
                  label="Nivel de Discipulado"
                  value={user.discipleship_level?.toString() || 'No asignado'}
                />
                <InfoRow label="Zona" value={user.zone_name || 'No asignada'} />
                <InfoRow label="Territorio" value={user.territory || 'No asignado'} />
                <InfoRow
                  label="Grupos Activos"
                  value={user.active_groups_count?.toString() || '0'}
                />

                {loading && (
                  <div className="py-4 text-center text-muted-foreground">
                    Cargando información de discipulado...
                  </div>
                )}

                {/* TODO: Aquí cargarías y mostrarías:
                    - Grupos que lidera
                    - Supervisor asignado
                    - Subordinados (si es supervisor)
                    - Jerarquía completa
                */}
              </CardContent>
            </Card>
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
                  <div className="text-sm text-muted-foreground">
                    {/* TODO: Aquí mostrarías:
                        - Asistencia promedio de sus grupos
                        - Tendencias de crecimiento
                        - Temperatura espiritual
                        - Charts con recharts
                    */}
                    No hay métricas disponibles para este usuario.
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
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {/* TODO: Aquí mostrarías:
                        - Lista de reportes enviados
                        - Estado de reportes pendientes
                        - Botón para ver historial completo
                    */}
                    No hay reportes disponibles para este usuario.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer con acciones */}
        <div className="flex gap-2 pt-6 pb-2 border-t mt-6">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              /* TODO: Ver auditoría */
            }}
          >
            <History className="h-4 w-4 mr-2" />
            Ver Auditoría
          </Button>
          <Button variant="default" className="flex-1" onClick={() => onEdit?.(user)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar Usuario
          </Button>
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
