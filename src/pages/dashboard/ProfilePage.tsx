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
import { supabase } from '@/integrations/supabase/client';
import { ProfileUpdateFormData, profileUpdateSchema } from '@/schemas/user.schemas';
import { UserService } from '@/services/user.service';
import { User as UserType } from '@/types/user.types';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import {
  Bell,
  BookOpen,
  Calendar,
  Camera,
  Eye,
  EyeOff,
  Heart,
  Loader2,
  Lock,
  MapPin,
  Phone,
  Settings,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';
import { DiscipleshipService } from '@/services/discipleship.service';
import type {
  DiscipleshipHierarchy,
  DiscipleshipGroup,
  DiscipleshipReport,
} from '@/types/discipleship.types';
import { parseGoTime } from '@/lib/go-time';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

const ProfilePage = () => {
  const [loading, setLoading] = useState(false);
  const { preferences, loading: preferencesLoading, updatePreference } = usePreferences();
  const { user, refreshCurrentUser } = useAuth();
  const [geolocation, setGeolocation] = useState<GeolocationResult | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<ProfileUpdateFormData>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      whatsapp: false,
    },
  });
  const [userData, setUserData] = useState<UserType | null>(null);

  // Ministry data
  const [hierarchy, setHierarchy] = useState<DiscipleshipHierarchy | null>(null);
  const [myGroups, setMyGroups] = useState<DiscipleshipGroup[]>([]);
  const [subordinates, setSubordinates] = useState<DiscipleshipHierarchy[]>([]);
  const [myReports, setMyReports] = useState<DiscipleshipReport[]>([]);
  const [ministryLoaded, setMinistryLoaded] = useState(false);
  const [ministryLoading, setMinistryLoading] = useState(false);

  const loadMinistryData = async (userId: string) => {
    if (ministryLoaded) return;
    setMinistryLoading(true);
    const [h, g, s, r] = await Promise.allSettled([
      DiscipleshipService.getHierarchy(userId),
      DiscipleshipService.getGroups({ leader_id: userId } as never),
      DiscipleshipService.getSubordinates(userId),
      DiscipleshipService.getReports({ reporter_id: userId, limit: 5 }),
    ]);
    if (h.status === 'fulfilled') setHierarchy(h.value?.[0] ?? null);
    if (g.status === 'fulfilled')
      setMyGroups((g.value as { data: DiscipleshipGroup[] })?.data ?? []);
    if (s.status === 'fulfilled') setSubordinates(s.value ?? []);
    if (r.status === 'fulfilled') setMyReports(r.value ?? []);
    setMinistryLoaded(true);
    setMinistryLoading(false);
  };

  // Avatar upload
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userData) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no puede superar 5 MB');
      return;
    }

    setAvatarUploading(true);
    const ext = file.name.split('.').pop();
    const path = `avatars/${userData.id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('church-assets')
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error('Error al subir la imagen');
      setAvatarUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('church-assets').getPublicUrl(path);

    await UserService.updateProfile({ avatar_url: publicUrl });
    setUserData(prev => (prev ? { ...prev, avatar_url: publicUrl } : prev));
    toast.success('Foto actualizada');
    setAvatarUploading(false);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  // Password change state
  const [pwForm, setPwForm] = useState({ newPassword: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (pwForm.newPassword.length < 8) {
      setPwError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirm) {
      setPwError('Las contraseñas no coinciden');
      return;
    }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPassword });
    setPwLoading(false);
    if (error) {
      setPwError(error.message);
    } else {
      toast.success('Contraseña actualizada');
      setPwForm({ newPassword: '', confirm: '' });
    }
  };

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
      const lat = getCoordValue(userData?.latitude);
      const lng = getCoordValue(userData?.longitude);
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
    <div className="space-y-4 p-0 sm:p-3 md:p-6">
      {/* ── Profile Hero ── */}
      <div className="rounded-b-2xl sm:rounded-2xl overflow-hidden border border-border/50 shadow-sm bg-card">
        {/* Cover strip — mesh gradient, solo decorativo */}
        <div className="relative h-28 sm:h-36">
          <div
            className="absolute inset-0"
            style={{
              background: [
                'radial-gradient(ellipse at 15% 60%, hsl(var(--primary)) 0%, transparent 55%)',
                'radial-gradient(ellipse at 85% 20%, hsl(var(--accent)) 0%, transparent 55%)',
                'radial-gradient(ellipse at 55% 90%, hsl(var(--primary) / 0.7) 0%, transparent 50%)',
                'radial-gradient(ellipse at 90% 80%, hsl(var(--accent) / 0.6) 0%, transparent 40%)',
                'linear-gradient(135deg, hsl(var(--primary) / 0.9) 0%, hsl(var(--accent) / 0.8) 100%)',
              ].join(', '),
            }}
          />
          {/* Sheen overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at top left, hsl(var(--primary) / 0.2), transparent 60%)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at bottom right, hsl(var(--accent) / 0.15), transparent 55%)',
            }}
          />

          {/* Edit cover button */}
          <button
            aria-label="Cambiar portada"
            className="absolute top-3 right-3 h-7 px-3 rounded-lg bg-black/25 backdrop-blur-sm border border-white/20 flex items-center gap-1.5 text-white/75 text-xs font-medium cursor-pointer hover:bg-black/40 hover:text-white transition-all duration-200"
          >
            <Camera className="w-3 h-3" />
            <span className="hidden sm:inline">Editar portada</span>
          </button>
        </div>

        {/* Content area — zona limpia */}
        <div className="px-4 sm:px-6 pb-5">
          {/* Hidden file input */}
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />

          {/* Avatar row — solapa el cover */}
          <div className="flex items-end justify-between -mt-8 sm:-mt-10 mb-4">
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden ring-4 ring-card shadow-xl">
                <Avatar className="w-full h-full rounded-2xl">
                  <AvatarImage src={userData?.avatar_url || ''} alt="Foto de perfil" />
                  <AvatarFallback className="text-xl sm:text-2xl font-extrabold bg-gradient-to-br from-violet-500 to-blue-600 text-white w-full h-full rounded-none">
                    {avatarUploading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      initialWordName()
                    )}
                  </AvatarFallback>
                </Avatar>
              </div>
              <button
                aria-label="Cambiar foto de perfil"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute -bottom-1.5 -right-1.5 w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-primary border-2 border-card flex items-center justify-center shadow-md cursor-pointer hover:scale-110 active:scale-95 transition-transform duration-150 disabled:opacity-60"
              >
                {avatarUploading ? (
                  <Loader2 className="w-3 h-3 animate-spin text-primary-foreground" />
                ) : (
                  <Camera className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary-foreground" />
                )}
              </button>
            </div>

            {/* Status badge */}
            <div
              className={`mb-1 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${
                userData?.is_active
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50'
                  : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${userData?.is_active ? 'bg-emerald-500' : 'bg-red-500'}`}
              />
              {userData?.is_active ? 'Activo' : 'Inactivo'}
            </div>
          </div>

          {/* Nombre + rol */}
          <div className="flex items-start gap-2 flex-wrap mb-1">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground leading-tight">
              {userData?.first_name} {userData?.last_name}
            </h1>
            <span className="mt-0.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary capitalize border border-primary/20 leading-tight">
              {userData?.role}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-5">{userData?.email}</p>

          {/* Stats strip */}
          <div className="grid grid-cols-4 gap-2">
            {[
              {
                label: 'Discipulado',
                value: userData?.discipleship_level ?? '—',
              },
              {
                label: 'Miembro desde',
                value: userData?.membership_date
                  ? safeFormatDate(userData.membership_date, 'yyyy')
                  : 'N/A',
              },
              {
                label: 'Célula',
                value: userData?.cell_group || '—',
              },
              {
                label: 'ID',
                value: userData?.id_number ? `#${String(userData.id_number).slice(-4)}` : '—',
              },
            ].map(stat => (
              <div
                key={stat.label}
                className="flex flex-col items-center justify-center bg-muted/40 hover:bg-muted/70 rounded-xl py-3 px-1 border border-border/40 transition-colors duration-200 cursor-default"
              >
                <span className="text-sm font-bold text-foreground leading-tight truncate w-full text-center">
                  {String(stat.value)}
                </span>
                <span className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 font-medium uppercase tracking-wider text-center leading-tight">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="personal" className="space-y-4 px-2 sm:px-0">
        <TabsList className="grid w-full grid-cols-5 h-auto bg-muted/60 p-1 rounded-xl gap-1">
          {[
            { value: 'personal', icon: User, label: 'Personal' },
            { value: 'church', icon: Heart, label: 'Iglesia' },
            { value: 'ministry', icon: BookOpen, label: 'Ministerio' },
            { value: 'security', icon: Lock, label: 'Seguridad' },
            { value: 'preferences', icon: Settings, label: 'Prefs' },
          ].map(({ value, icon: Icon, label }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="flex flex-col items-center gap-1 py-2.5 px-1 h-auto rounded-lg transition-all duration-200
                data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="text-[10px] sm:text-[11px] leading-tight font-semibold">
                {label}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Personal Tab ── */}
        <TabsContent value="personal" className="space-y-4">
          <Card className="border-0 shadow-sm">
            {/* Section header */}
            <CardHeader className="px-4 sm:px-6 pt-5 pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Información Personal</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Mantén tu información actualizada
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="px-4 sm:px-6 py-5">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Nombre + Apellido */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="first_name"
                      className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"
                    >
                      <User className="w-3 h-3" /> Nombres
                    </Label>
                    <Input
                      id="first_name"
                      {...register('first_name')}
                      className={`h-10 ${errors.first_name ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    />
                    {errors.first_name && (
                      <p className="text-xs text-red-500">{errors.first_name.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="last_name"
                      className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"
                    >
                      <User className="w-3 h-3" /> Apellidos
                    </Label>
                    <Input
                      id="last_name"
                      {...register('last_name')}
                      className={`h-10 ${errors.last_name ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    />
                    {errors.last_name && (
                      <p className="text-xs text-red-500">{errors.last_name.message}</p>
                    )}
                  </div>
                </div>

                {/* Teléfono + Fecha */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="phone"
                      className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"
                    >
                      <Phone className="w-3 h-3" /> Teléfono
                    </Label>
                    <Input id="phone" {...register('phone')} className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="birth_date"
                      className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"
                    >
                      <Calendar className="w-3 h-3" /> Fecha de Nacimiento
                    </Label>
                    <Input
                      id="birth_date"
                      type="date"
                      {...register('birth_date')}
                      className="h-10"
                    />
                  </div>
                </div>

                {/* Dirección */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" /> Dirección
                  </Label>
                  <GeolocationInput
                    value={geolocation || undefined}
                    onChange={value => {
                      setGeolocation(value);
                      setValue('address', value?.address ?? '', { shouldValidate: true });
                    }}
                    label="Ubicación en el mapa (opcional)"
                    placeholder="Buscar dirección o seleccionar en el mapa..."
                  />
                  <p className="text-xs text-muted-foreground/70 flex items-start gap-1 mt-1">
                    <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                    Permite que tu liderazgo te ubique en el mapa de discipulado.
                  </p>
                </div>

                {/* Contacto de Emergencia */}
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 dark:border-amber-800/40 dark:bg-amber-950/20 p-4 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                        Contacto de Emergencia
                      </h4>
                      <p className="text-xs text-amber-700/70 dark:text-amber-300/60">
                        Persona a contactar en caso de emergencia
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="emergency_contact_name"
                        className="text-xs text-amber-800/80 dark:text-amber-200/80 font-medium"
                      >
                        Nombre completo
                      </Label>
                      <Input
                        id="emergency_contact_name"
                        placeholder="Nombre completo"
                        className="bg-white dark:bg-background h-10 border-amber-200 dark:border-amber-800/40 focus-visible:ring-amber-400"
                        {...register('emergency_contact_name')}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="emergency_contact_phone"
                        className="text-xs text-amber-800/80 dark:text-amber-200/80 font-medium"
                      >
                        Teléfono
                      </Label>
                      <Input
                        id="emergency_contact_phone"
                        placeholder="Número de teléfono"
                        className="bg-white dark:bg-background h-10 border-amber-200 dark:border-amber-800/40 focus-visible:ring-amber-400"
                        {...register('emergency_contact_phone')}
                      />
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white font-semibold shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all duration-200 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar Cambios'
                  )}
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
                        {safeFormatDate(userData?.baptism_date, 'MMMM yyyy') ||
                          'Sin fecha registrada'}
                      </p>
                    </div>
                    <Badge variant={userData?.baptism_date ? 'default' : 'outline'}>
                      {userData?.baptism_date ? 'Sí' : 'No'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 min-h-[80px]">
                    <div>
                      <h4 className="font-medium">Miembro Activo</h4>
                      <p className="text-sm text-muted-foreground">
                        {safeFormatDate(userData?.membership_date, 'MMMM yyyy') ||
                          'Sin fecha registrada'}
                      </p>
                    </div>
                    <Badge variant={userData?.is_active_member ? 'default' : 'outline'}>
                      {userData?.is_active_member ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 min-h-[80px]">
                    <div>
                      <h4 className="font-medium">Grupo Celular</h4>
                      <p className="text-sm text-muted-foreground">
                        {userData?.cell_group || 'Sin asignar'}
                      </p>
                    </div>
                    {userData?.cell_group && (
                      <Badge variant="secondary">{userData.cell_group}</Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 min-h-[80px]">
                    <div>
                      <h4 className="font-medium">Ministerio</h4>
                      <p className="text-sm text-muted-foreground capitalize">
                        {userData?.role || '—'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 min-h-[80px]">
                    <div>
                      <h4 className="font-medium">Primera Visita</h4>
                      <p className="text-sm text-muted-foreground">
                        {safeFormatDate(userData?.first_visit_date, 'MMMM yyyy') || '—'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 min-h-[80px]">
                    <div>
                      <h4 className="font-medium">Nivel de Discipulado</h4>
                      <p className="text-sm text-muted-foreground">
                        {userData?.discipleship_level ?? '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Ministry Tab ── */}
        <TabsContent value="ministry" className="space-y-4">
          {!ministryLoaded && !ministryLoading && userData && (
            <div className="flex justify-center py-8">
              <Button variant="outline" onClick={() => loadMinistryData(userData.id)}>
                <BookOpen className="w-4 h-4 mr-2" /> Cargar datos de ministerio
              </Button>
            </div>
          )}

          {ministryLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {ministryLoaded && (
            <div className="space-y-4">
              {/* Posición jerárquica */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="px-4 sm:px-6 pt-5 pb-4 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">
                        Posición en la Jerarquía
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Tu lugar en la estructura de discipulado
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 py-5">
                  {!hierarchy ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Sin asignación jerárquica
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Nivel', value: hierarchy.hierarchy_level ?? '—' },
                        { label: 'Zona', value: hierarchy.zone_name ?? '—' },
                        { label: 'Territorio', value: hierarchy.territory ?? '—' },
                        { label: 'Supervisor', value: hierarchy.supervisor_name ?? '—' },
                      ].map(item => (
                        <div
                          key={item.label}
                          className="flex flex-col items-center justify-center bg-muted/40 rounded-xl py-3 px-2 border border-border/40"
                        >
                          <span className="text-sm font-bold text-foreground truncate w-full text-center">
                            {String(item.value)}
                          </span>
                          <span className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Grupos a cargo */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="px-4 sm:px-6 pt-5 pb-4 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Grupos a Cargo</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {myGroups.length} grupo{myGroups.length !== 1 ? 's' : ''} como líder
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 py-5">
                  {myGroups.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Sin grupos asignados como líder
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {myGroups.map(group => (
                        <div
                          key={group.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{group.group_name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {group.active_members} miembros activos
                              {group.meeting_day && ` · ${group.meeting_day}`}
                              {group.meeting_location && ` · ${group.meeting_location}`}
                            </p>
                          </div>
                          <Badge
                            variant={
                              group.status === 'active'
                                ? 'default'
                                : group.status === 'multiplying'
                                  ? 'secondary'
                                  : 'outline'
                            }
                            className="text-[10px] shrink-0 ml-2"
                          >
                            {group.status === 'active'
                              ? 'Activo'
                              : group.status === 'multiplying'
                                ? 'Multiplicando'
                                : 'Inactivo'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Subordinados */}
              {subordinates.length > 0 && (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="px-4 sm:px-6 pt-5 pb-4 border-b">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-violet-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold">
                          Personas a Supervisar
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          {subordinates.length} bajo tu supervisión directa
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6 py-5">
                    <div className="space-y-2">
                      {subordinates.map(sub => (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {sub.user_name ?? sub.user_email ?? sub.user_id}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {sub.zone_name ?? '—'} · Nivel {sub.hierarchy_level}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[10px] shrink-0 ml-2">
                            {sub.active_groups_assigned} grupos
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Reportes recientes */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="px-4 sm:px-6 pt-5 pb-4 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Reportes Recientes</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Tus últimos 5 reportes enviados
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 py-5">
                  {myReports.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Sin reportes enviados aún
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {myReports.map(report => (
                        <div
                          key={report.id}
                          className="flex items-center justify-between gap-3 p-3 border rounded-lg"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{report.report_type}</p>
                            <p className="text-xs text-muted-foreground">
                              {parseGoTime(report.period_end)?.toLocaleDateString('es-AR', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              }) ?? report.period_end}
                            </p>
                          </div>
                          <Badge
                            variant={
                              report.status === 'submitted'
                                ? 'secondary'
                                : report.status === 'draft'
                                  ? 'outline'
                                  : 'default'
                            }
                            className="text-[10px] shrink-0"
                          >
                            {report.status === 'submitted'
                              ? 'Enviado'
                              : report.status === 'draft'
                                ? 'Borrador'
                                : 'En revisión'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          {/* Cambiar contraseña */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-4 sm:px-6 pt-5 pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Cambiar Contraseña</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Usá una contraseña segura de al menos 8 caracteres
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 py-5">
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="new_password"
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                  >
                    Nueva contraseña
                  </Label>
                  <div className="relative">
                    <Input
                      id="new_password"
                      type={showNew ? 'text' : 'password'}
                      value={pwForm.newPassword}
                      onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))}
                      placeholder="Mínimo 8 caracteres"
                      className="h-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="confirm_password"
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                  >
                    Confirmar contraseña
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm_password"
                      type={showConfirm ? 'text' : 'password'}
                      value={pwForm.confirm}
                      onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                      placeholder="Repetí la nueva contraseña"
                      className="h-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {pwError && <p className="text-sm text-red-500">{pwError}</p>}

                <Button
                  type="submit"
                  disabled={pwLoading || !pwForm.newPassword || !pwForm.confirm}
                  className="w-full h-10"
                >
                  {pwLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    'Actualizar contraseña'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Info de sesión */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="px-4 sm:px-6 pt-5 pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Sesión Actual</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Información de tu acceso más reciente
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 py-5 space-y-3">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="text-sm font-medium">Último acceso</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {user?.last_sign_in_at
                      ? new Date(user.last_sign_in_at).toLocaleString('es-AR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Sin información'}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="text-green-600 border-green-300 bg-green-50 dark:bg-green-950/20"
                >
                  Activo
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="text-sm font-medium">Email de la cuenta</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
                </div>
                <Badge variant="outline">Verificado</Badge>
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
