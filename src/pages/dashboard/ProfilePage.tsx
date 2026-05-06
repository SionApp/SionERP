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
import {
  GeolocationInput,
  TypeGeolocalization,
  GeolocationResult,
} from '@/components/ui/geolocation-input';
import { useAuth } from '@/contexts/AuthContext';
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
  const { refreshCurrentUser } = useAuth();
  const [geolocation, setGeolocation] = useState<GeolocationResult | null>(null);
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

  const formatDateForInput = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    const parsed = parseISO(dateString);
    if (isNaN(parsed.getTime())) return '';
    return format(parsed, 'yyyy-MM-dd');
  };

  const safeFormatDate = (dateString: string | null | undefined, fmt: string) => {
    if (!dateString) return '';
    const parsed = parseISO(dateString);
    if (isNaN(parsed.getTime())) return '';
    return format(parsed, fmt);
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

      // Populate geolocation state if user has coordinates
      const lat = getCoordValue((userData as any)?.latitude);
      const lng = getCoordValue((userData as any)?.longitude);
      if (lat !== undefined && lng !== undefined && userData.address) {
        setGeolocation({
          address: userData.address,
          latitude: lat,
          longitude: lng,
        });
      }

      setUserData(userData);
    } catch (error) {
      toast.error('Error al cargar los datos del usuario');
    }
  };

  const getCoordValue = (coord?: TypeGeolocalization | number): number | undefined => {
    if (typeof coord === 'number') return coord;
    if (coord && typeof coord === 'object' && coord.Valid) return coord.Float64;
    return undefined;
  };

  const onSubmit = async (data: ProfileUpdateFormData) => {
    try {
      setLoading(true);
      const payload: Record<string, unknown> = { ...data };

      // Include latitude and longitude from geolocation state
      if (geolocation) {
        payload.latitude = geolocation.latitude;
        payload.longitude = geolocation.longitude;
      }

      await UserService.updateProfile(payload);

      // If user hasn't completed onboarding, mark it now
      if (userData && !userData.onboarding_completed) {
        try {
          await UserService.completeOnboarding({
            first_name: data.first_name,
            last_name: data.last_name,
            phone: data.phone,
            address: data.address,
            id_number: data.id_number,
          });
          // Refresh user data so onboarding_completed is updated
          await refreshCurrentUser();
        } catch (err) {
          console.error('Error completing onboarding:', err);
          // Don't fail the profile save if onboarding fails
        }
      }

      toast.success('Perfil actualizado exitosamente');
    } catch (error) {
      toast.error('Error al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 p-0 sm:p-3 md:p-6">
      {/* ── Profile Hero ── */}
      <div className="relative overflow-hidden rounded-b-2xl sm:rounded-2xl bg-gradient-to-br from-primary/90 via-blue-600/80 to-purple-600/80 px-4 pt-5 pb-4 sm:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.12),_transparent_60%)] pointer-events-none" />
        <div className="relative flex items-center gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            <Avatar className="w-18 h-18 sm:w-24 sm:h-24 ring-2 ring-white/30 shadow-xl" style={{ width: 72, height: 72 }}>
              <AvatarImage src="" alt="Profile" />
              <AvatarFallback className="text-2xl font-bold bg-white/20 text-white">
                {initialWordName()}
              </AvatarFallback>
            </Avatar>
            <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-md active:scale-95 transition-transform">
              <Camera className="w-3.5 h-3.5 text-white" />
            </button>
          </div>

          {/* Name + role */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white drop-shadow truncate">
              {userData?.first_name} {userData?.last_name}
            </h1>
            <p className="text-white/70 text-xs truncate mt-0.5">{userData?.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-[11px] font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full capitalize">
                {userData?.role}
              </span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${userData?.is_active ? 'bg-green-400/30 text-green-100' : 'bg-red-400/30 text-red-100'}`}>
                {userData?.is_active ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          {[
            { label: 'Rol', value: userData?.role ? userData.role.charAt(0).toUpperCase() + userData.role.slice(1) : '—' },
            { label: 'Estado', value: userData?.is_active ? 'Activo' : 'Inactivo' },
            { label: 'Desde', value: userData?.membership_date ? safeFormatDate(userData.membership_date, 'yyyy') : '—' },
            { label: 'Discip.', value: userData?.discipleship_level ?? 0 },
          ].map(stat => (
            <div key={stat.label} className="text-center bg-white/10 backdrop-blur-sm rounded-xl py-2 px-1">
              <div className="text-sm font-bold text-white leading-tight">{stat.value}</div>
              <div className="text-[10px] text-white/60 mt-0.5 leading-tight">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <Tabs defaultValue="personal" className="space-y-3 sm:space-y-4 px-2 sm:px-0">
        <TabsList className="grid w-full grid-cols-4 h-auto p-1">
          {[
            { value: 'personal', icon: User, label: 'Personal' },
            { value: 'church', icon: Heart, label: 'Iglesia' },
            { value: 'security', icon: Lock, label: 'Seguridad' },
            { value: 'preferences', icon: Settings, label: 'Preferencias' },
          ].map(({ value, icon: Icon, label }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="group flex flex-col items-center gap-1 py-2 px-1 h-auto"
            >
              <Icon className="w-4 h-4 shrink-0" />
              {/* Mobile: solo visible en el tab activo. sm+: siempre visible */}
              <span className="text-[11px] leading-tight w-full text-center truncate invisible group-data-[state=active]:visible sm:visible">
                {label}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="personal" className="space-y-3 sm:space-y-4">
          {/* Personal Information */}
          <Card>
            <CardHeader className="p-3 sm:p-4 pb-0 sm:pb-0">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <User className="w-4 h-4 text-primary" />
                Información Personal
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Mantén tu información actualizada</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-3">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <GeolocationInput
                      value={geolocation || undefined}
                      onChange={(value) => {
                        setGeolocation(value);
                        if (value) {
                          setValue('address', value.address, { shouldValidate: true });
                          setValue('latitude', getCoordValue(value.latitude), { shouldValidate: true });
                          setValue('longitude', getCoordValue(value.longitude), { shouldValidate: true });
                        } else {
                          setValue('address', '', { shouldValidate: true });
                          setValue('latitude', undefined);
                          setValue('longitude', undefined);
                        }
                      }}
                      label="Ubicación en el mapa (opcional)"
                      placeholder="Buscar dirección o seleccionar en el mapa..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Busca una dirección o haz clic en el mapa para seleccionar tu ubicación.
                      Esto permite verte en el mapa de discipulado.
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4" />
                    Contacto de Emergencia
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="emergency_contact_name" className="text-xs sm:text-sm">Nombre del Contacto</Label>
                      <Input
                        id="emergency_contact_name"
                        placeholder="Nombre completo"
                        {...register('emergency_contact_name')}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="emergency_contact_phone" className="text-xs sm:text-sm">Teléfono del Contacto</Label>
                      <Input
                        id="emergency_contact_phone"
                        placeholder="Número de teléfono"
                        {...register('emergency_contact_phone')}
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</>
                  ) : 'Guardar Cambios'}
                </Button>
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
                        {safeFormatDate(userData?.baptism_date, 'MMMM yyyy')}
                      </p>
                    </div>
                    <Badge variant="default">Sí</Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 min-h-[80px]">
                    <div>
                      <h4 className="font-medium">Miembro Activo</h4>
                      <p className="text-sm text-muted-foreground">
                        {safeFormatDate(userData?.membership_date, 'MMMM yyyy')}
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
                        {safeFormatDate(userData?.first_visit_date, 'MMMM yyyy')}
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
