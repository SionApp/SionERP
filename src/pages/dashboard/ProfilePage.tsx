import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePreferences } from '@/hooks/usePreferences';
import { ProfileUpdateFormData, profileUpdateSchema } from '@/schemas/user.schemas';
import { UserService } from '@/services/user.service';
import { User as UserType } from '@/types/user.types';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import {
  Bell,
  Calendar,
  Camera,
  Edit,
  Heart,
  Loader2,
  Lock,
  MapPin,
  Phone,
  Settings,
  User,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

const ProfilePage = () => {
  const [loading, setLoading] = useState(false);
  const { preferences, loading: preferencesLoading, updatePreference } = usePreferences();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ProfileUpdateFormData>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      whatsapp: false,
    },
  });
  const [userData, setUserData] = useState<UserType | null>(null);

  const whatsapp = watch('whatsapp');

  useEffect(() => {
    loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initialWordName = () => {
    if (!userData || !userData.first_name || !userData.last_name) return '';
    const names = `${userData.first_name} ${userData.last_name}`.trim().split(' ');
    if (names.length === 1) {
      return names[0][0].toUpperCase();
    }
    return (
      (names[0][0] ? names[0][0].toUpperCase() : '') +
      (names[names.length - 1][0] ? names[names.length - 1][0].toUpperCase() : '')
    );
  };

  const formatDateForInput = (dateString: string) => {
    const date = dateString ? format(parseISO(dateString), 'yyyy-MM-dd') : '';
    return date;
  };

  const loadUserData = async () => {
    try {
      const userData = await UserService.getCurrentUser();
      reset({
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        id_number: userData.id_number || '',
        email: userData.email || '',
        phone: userData.phone || '',
        marital_status: userData.marital_status || '',
        occupation: userData.occupation || '',
        education_level: userData.education_level || '',
        how_found_church: userData.how_found_church || '',
        ministry_interest: userData.ministry_interest || '',
        first_visit_date: formatDateForInput(userData.first_visit_date) || '',
        baptism_date: formatDateForInput(userData.baptism_date) || '',
        is_active_member: userData.is_active_member || false,
        membership_date: formatDateForInput(userData.membership_date) || '',
        cell_group: userData.cell_group || '',
        pastoral_notes: userData.pastoral_notes || '',
        whatsapp: userData.whatsapp || false,
        birth_date: formatDateForInput(userData.birth_date) || '',
        address: userData.address || '',
        emergency_contact_name: userData.emergency_contact_name || '',
        emergency_contact_phone: userData.emergency_contact_phone || '',
      });
      setUserData(userData);
    } catch (error) {
      toast.error('Error al cargar los datos del usuario');
    }
  };

  const onSubmit = async (data: ProfileUpdateFormData) => {
    try {
      setLoading(true);
      await UserService.updateProfile(data);
      toast.success('Perfil actualizado exitosamente');
    } catch (error) {
      toast.error('Error al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Mi Perfil
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tu información personal y preferencias de la cuenta
          </p>
        </div>

        {/* Profile Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:min-w-[400px]">
          <Card className="text-center p-4">
            <div className="text-lg font-bold text-primary">
              {userData?.role?.charAt(0).toUpperCase() + userData?.role?.slice(1)}
            </div>
            <div className="text-xs text-muted-foreground">Rol Actual</div>
          </Card>
          <Card className="text-center p-4">
            <div className="text-lg font-bold text-green-600">
              {userData?.is_active ? 'Activo' : 'Inactivo'}
            </div>
            <div className="text-xs text-muted-foreground">Estado</div>
          </Card>
          <Card className="text-center p-4">
            <div className="text-lg font-bold text-blue-600">
              {userData?.membership_date ? format(parseISO(userData.membership_date), 'yyyy') : ''}
            </div>
            <div className="text-xs text-muted-foreground">Miembro desde</div>
          </Card>
          <Card className="text-center p-4">
            <div className="text-lg font-bold text-purple-600">
              {userData?.discipleship_level || 0}
            </div>
            <div className="text-xs text-muted-foreground">Nivel de Discipulado</div>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="church" className="flex items-center gap-2">
            <Heart className="w-4 h-4" />
            Iglesia
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Seguridad
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Preferencias
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-6">
          {/* Profile Header Card */}
          <Card className="border-0 bg-gradient-to-r from-primary/10 to-accent/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src="" alt="Profile" />
                    <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-accent text-white">
                      {initialWordName()}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute -bottom-2 -right-2 rounded-full"
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold">
                    {userData?.first_name} {userData?.last_name}
                  </h3>
                  <p className="text-muted-foreground">{userData?.email}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <Badge variant="default">
                      {userData?.role?.charAt(0).toUpperCase() + userData?.role?.slice(1)}
                    </Badge>
                    <Badge variant="outline">
                      Miembro desde{' '}
                      {userData?.membership_date
                        ? format(parseISO(userData.membership_date), 'MMMM yyyy')
                        : ''}
                    </Badge>
                  </div>
                </div>
                <Button variant="outline">
                  <Edit className="w-4 h-4 mr-2" />
                  Editar Foto
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Información Personal
              </CardTitle>
              <CardDescription>Mantén tu información personal actualizada</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="first_name" className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Nombres
                    </Label>
                    <Input
                      id="first_name"
                      {...register('first_name')}
                      className={errors.first_name ? 'border-red-500' : ''}
                    />
                    {errors.first_name && (
                      <p className="text-sm text-red-500">{errors.first_name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name" className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Apellidos
                    </Label>
                    <Input
                      id="last_name"
                      {...register('last_name')}
                      className={errors.last_name ? 'border-red-500' : ''}
                    />
                    {errors.last_name && (
                      <p className="text-sm text-red-500">{errors.last_name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Teléfono
                    </Label>
                    <Input id="phone" {...register('phone')} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="birth_date" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Fecha de Nacimiento
                    </Label>
                    <Input id="birth_date" type="date" {...register('birth_date')} />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address" className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Dirección
                    </Label>
                    <Input id="address" {...register('address')} />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Contacto de Emergencia
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergency_contact_name">Nombre del Contacto</Label>
                      <Input
                        id="emergency_contact_name"
                        placeholder="Nombre completo"
                        {...register('emergency_contact_name')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="emergency_contact_phone">Teléfono del Contacto</Label>
                      <Input
                        id="emergency_contact_phone"
                        placeholder="Número de teléfono"
                        {...register('emergency_contact_phone')}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={loading} className="w-full md:w-auto">
                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="church" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                Información de la Iglesia
              </CardTitle>
              <CardDescription>Tu participación y rol en la comunidad</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 min-h-[80px]">
                    <div>
                      <h4 className="font-medium">Bautizado</h4>
                      <p className="text-sm text-muted-foreground">
                        {userData?.baptism_date
                          ? format(parseISO(userData.baptism_date), 'MMMM yyyy')
                          : ''}
                      </p>
                    </div>
                    <Badge variant="default">Sí</Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 min-h-[80px]">
                    <div>
                      <h4 className="font-medium">Miembro Activo</h4>
                      <p className="text-sm text-muted-foreground">
                        {userData?.membership_date
                          ? format(parseISO(userData.membership_date), 'MMMM yyyy')
                          : ''}
                      </p>
                    </div>
                    <Badge variant="default">Activo</Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 min-h-[80px]">
                    <div>
                      <h4 className="font-medium">Grupo Celular</h4>
                      <p className="text-sm text-muted-foreground">
                        {userData?.cell_group || 'Sin asignar'}
                      </p>
                    </div>
                    <Badge variant="outline">Líder</Badge>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 min-h-[80px]">
                    <div>
                      <h4 className="font-medium">Ministerio</h4>
                      <p className="text-sm text-muted-foreground">
                        {userData?.role?.charAt(0).toUpperCase() + userData?.role?.slice(1)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 min-h-[80px]">
                    <div>
                      <h4 className="font-medium">Primera Visita</h4>
                      <p className="text-sm text-muted-foreground">
                        {userData?.first_visit_date
                          ? format(parseISO(userData.first_visit_date), 'MMMM yyyy')
                          : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 min-h-[80px]">
                    <div>
                      <h4 className="font-medium">Nivel de Discipulado</h4>
                      <p className="text-sm text-muted-foreground">
                        {userData?.discipleship_level || 'Sin asignar'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                Seguridad de la Cuenta
              </CardTitle>
              <CardDescription>Gestiona la seguridad y acceso a tu cuenta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Contraseña</h4>
                    <p className="text-sm text-muted-foreground">
                      Última actualización: Hace 3 meses
                    </p>
                  </div>
                  <Button variant="outline">Cambiar</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Verificación en Dos Pasos</h4>
                    <p className="text-sm text-muted-foreground">
                      Protege tu cuenta con autenticación adicional
                    </p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Sesiones Activas</h4>
                    <p className="text-sm text-muted-foreground">2 dispositivos conectados</p>
                  </div>
                  <Button variant="outline">Ver Detalles</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Último Acceso</h4>
                    <p className="text-sm text-muted-foreground">Hoy a las 09:30 AM</p>
                  </div>
                  <Badge variant="outline">Activo</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Notificaciones y Preferencias
              </CardTitle>
              <CardDescription>Configura cómo y cuándo recibir notificaciones</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {preferencesLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : preferences ? (
                <div className="space-y-4">
                  {/* Tema */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Tema</h4>
                      <p className="text-sm text-muted-foreground">
                        Apariencia visual de la aplicación
                      </p>
                    </div>
                    <Select
                      value={preferences.theme}
                      onValueChange={(value: 'light' | 'dark' | 'auto') =>
                        updatePreference('theme', value)
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Claro</SelectItem>
                        <SelectItem value="dark">Oscuro</SelectItem>
                        <SelectItem value="auto">Auto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* WhatsApp */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Notificaciones WhatsApp</h4>
                      <p className="text-sm text-muted-foreground">
                        Recibe actualizaciones importantes
                      </p>
                    </div>
                    <Switch
                      checked={preferences.whatsapp_notifications}
                      onCheckedChange={checked =>
                        updatePreference('whatsapp_notifications', checked)
                      }
                    />
                  </div>

                  {/* Email */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Emails de Eventos</h4>
                      <p className="text-sm text-muted-foreground">
                        Información sobre eventos y servicios
                      </p>
                    </div>
                    <Switch
                      checked={preferences.email_notifications}
                      onCheckedChange={checked => updatePreference('email_notifications', checked)}
                    />
                  </div>

                  {/* Recordatorios */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Recordatorios de Servicios</h4>
                      <p className="text-sm text-muted-foreground">
                        Notificaciones antes de los servicios
                      </p>
                    </div>
                    <Switch
                      checked={preferences.event_reminders}
                      onCheckedChange={checked => updatePreference('event_reminders', checked)}
                    />
                  </div>

                  {/* Boletín */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Boletín Semanal</h4>
                      <p className="text-sm text-muted-foreground">
                        Recibe el boletín de noticias semanal
                      </p>
                    </div>
                    <Switch
                      checked={preferences.weekly_newsletter}
                      onCheckedChange={checked => updatePreference('weekly_newsletter', checked)}
                    />
                  </div>

                  <Separator />

                  {/* Privacidad */}
                  <h4 className="font-medium pt-2">Privacidad</h4>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Visibilidad del Perfil</h4>
                      <p className="text-sm text-muted-foreground">
                        Quién puede ver tu información
                      </p>
                    </div>
                    <Select
                      value={preferences.profile_visibility}
                      onValueChange={(value: 'public' | 'members' | 'private') =>
                        updatePreference('profile_visibility', value)
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Público</SelectItem>
                        <SelectItem value="members">Miembros</SelectItem>
                        <SelectItem value="private">Privado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Mostrar Email</h4>
                      <p className="text-sm text-muted-foreground">
                        Permitir que otros vean tu email
                      </p>
                    </div>
                    <Switch
                      checked={preferences.show_email}
                      onCheckedChange={checked => updatePreference('show_email', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Mostrar Teléfono</h4>
                      <p className="text-sm text-muted-foreground">
                        Permitir que otros vean tu teléfono
                      </p>
                    </div>
                    <Switch
                      checked={preferences.show_phone}
                      onCheckedChange={checked => updatePreference('show_phone', checked)}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No se pudieron cargar las preferencias
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfilePage;
