import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { GeolocationInput } from '@/components/ui/geolocation-input';
import type { GeolocationResult } from '@/components/ui/geolocation-input';
import type { ProfileUpdateFormData } from '@/schemas/user.schemas';
import type { User as UserType } from '@/types/user.types';
import type {
  DiscipleshipHierarchy,
  DiscipleshipGroup,
  DiscipleshipReport,
} from '@/types/discipleship.types';
import { parseGoTime } from '@/lib/go-time';
import type { UseFormRegister, UseFormHandleSubmit, FieldErrors } from 'react-hook-form';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import {
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
import { useState } from 'react';
import { MobileListItem } from '../MobileListItem';
import { MobileScreen } from '../MobileScreen';
import { MobileSegment } from '../MobileSegment';
import { MobileSectionHeader } from '../MobileSectionHeader';
import { cn } from '@/lib/utils';

interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  whatsapp_notifications: boolean;
  email_notifications: boolean;
  event_reminders: boolean;
  weekly_newsletter: boolean;
  profile_visibility: 'public' | 'members' | 'private';
  show_email: boolean;
  show_phone: boolean;
}

export interface MobileProfileScreenProps {
  userData: UserType | null;
  authUser: SupabaseUser | null;
  saving: boolean;
  avatarUploading: boolean;
  avatarInputRef: React.RefObject<HTMLInputElement>;
  onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  initialWordName: () => string;
  safeFormatDate: (d: string | null | undefined, fmt: string) => string;
  register: UseFormRegister<ProfileUpdateFormData>;
  errors: FieldErrors<ProfileUpdateFormData>;
  handleSubmit: UseFormHandleSubmit<ProfileUpdateFormData>;
  onSubmit: (data: ProfileUpdateFormData) => Promise<void>;
  geolocation: GeolocationResult | null;
  onGeolocationChange: (v: GeolocationResult | null) => void;
  setFormValue: (field: keyof ProfileUpdateFormData, value: string | boolean) => void;
  hierarchy: DiscipleshipHierarchy | null;
  myGroups: DiscipleshipGroup[];
  subordinates: DiscipleshipHierarchy[];
  myReports: DiscipleshipReport[];
  ministryLoading: boolean;
  ministryLoaded: boolean;
  onLoadMinistry: () => void;
  pwForm: { newPassword: string; confirm: string };
  onPwChange: (field: 'newPassword' | 'confirm', value: string) => void;
  pwLoading: boolean;
  pwError: string;
  showNew: boolean;
  showConfirm: boolean;
  setShowNew: (v: boolean) => void;
  setShowConfirm: (v: boolean) => void;
  onPasswordSubmit: (e: React.FormEvent) => void;
  preferences: UserPreferences | null;
  preferencesLoading: boolean;
  onUpdatePreference: (key: string, value: unknown) => void;
}

const TABS = [
  { value: 'personal', label: 'Personal' },
  { value: 'iglesia', label: 'Iglesia' },
  { value: 'ministerio', label: 'Ministerio' },
  { value: 'seguridad', label: 'Seguridad' },
  { value: 'prefs', label: 'Prefs' },
];

const COVER_GRADIENT = [
  'radial-gradient(ellipse at 15% 60%, hsl(var(--primary)) 0%, transparent 55%)',
  'radial-gradient(ellipse at 85% 20%, hsl(var(--accent)) 0%, transparent 55%)',
  'radial-gradient(ellipse at 55% 90%, hsl(var(--primary) / 0.7) 0%, transparent 50%)',
  'linear-gradient(135deg, hsl(var(--primary) / 0.9) 0%, hsl(var(--accent) / 0.8) 100%)',
].join(', ');

/** Pantalla mobile de Perfil (presentacional — ProfilePage es el container). */
export function MobileProfileScreen({
  userData,
  authUser,
  saving,
  avatarUploading,
  avatarInputRef,
  onAvatarUpload,
  initialWordName,
  safeFormatDate,
  register,
  errors,
  handleSubmit,
  onSubmit,
  geolocation,
  onGeolocationChange,
  setFormValue,
  hierarchy,
  myGroups,
  subordinates,
  myReports,
  ministryLoading,
  ministryLoaded,
  onLoadMinistry,
  pwForm,
  onPwChange,
  pwLoading,
  pwError,
  showNew,
  showConfirm,
  setShowNew,
  setShowConfirm,
  onPasswordSubmit,
  preferences,
  preferencesLoading,
  onUpdatePreference,
}: MobileProfileScreenProps) {
  const [tab, setTab] = useState('personal');

  const stats = [
    { label: 'Discipulado', value: String(userData?.discipleship_level ?? '—') },
    {
      label: 'Miembro',
      value: userData?.membership_date ? safeFormatDate(userData.membership_date, 'yyyy') : 'N/A',
    },
    { label: 'Célula', value: userData?.cell_group || '—' },
    {
      label: 'ID',
      value: userData?.id_number ? `#${String(userData.id_number).slice(-4)}` : '—',
    },
  ];

  return (
    <MobileScreen title="Mi Perfil">
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onAvatarUpload}
      />

      {/* ── Hero cover ── */}
      <div className="relative">
        <div className="h-28 relative" style={{ background: COVER_GRADIENT }}>
          <button
            aria-label="Cambiar portada"
            className="absolute top-3 right-3 h-7 px-3 rounded-lg bg-black/25 backdrop-blur-sm border border-white/20 flex items-center gap-1.5 text-white/75 text-xs font-medium cursor-pointer active:bg-black/40 transition-all"
          >
            <Camera className="w-3 h-3" />
          </button>
        </div>

        <div className="px-4 pb-4">
          <div className="flex items-end justify-between -mt-8 mb-3">
            {/* Avatar */}
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl overflow-hidden ring-4 ring-card shadow-xl">
                <Avatar className="w-full h-full rounded-2xl">
                  <AvatarImage src={userData?.avatar_url || ''} alt="Foto de perfil" />
                  <AvatarFallback className="text-xl font-extrabold bg-gradient-to-br from-violet-500 to-blue-600 text-white w-full h-full rounded-none">
                    {avatarUploading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      initialWordName()
                    )}
                  </AvatarFallback>
                </Avatar>
              </div>
              <button
                aria-label="Cambiar foto"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-xl bg-primary border-2 border-card flex items-center justify-center shadow-md cursor-pointer active:scale-95 transition-transform disabled:opacity-60"
              >
                {avatarUploading ? (
                  <Loader2 className="w-3 h-3 animate-spin text-primary-foreground" />
                ) : (
                  <Camera className="w-3 h-3 text-primary-foreground" />
                )}
              </button>
            </div>

            {/* Status badge */}
            <div
              className={cn(
                'mb-1 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border',
                userData?.is_active_member
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50'
                  : 'bg-muted text-muted-foreground border-border'
              )}
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full shrink-0',
                  userData?.is_active_member ? 'bg-emerald-500' : 'bg-muted-foreground'
                )}
              />
              {userData?.is_active_member ? 'Miembro activo' : 'Inactivo'}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <h2 className="text-lg font-extrabold tracking-tight leading-tight text-foreground">
              {userData?.first_name} {userData?.last_name}
            </h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize border border-primary/20">
              {userData?.role}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{userData?.email}</p>
        </div>
      </div>

      {/* ── Stats chips ── */}
      <div className="flex gap-2 px-4 pb-4 overflow-x-auto snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {stats.map(stat => (
          <div
            key={stat.label}
            className="snap-start shrink-0 min-w-[84px] rounded-2xl border border-border bg-card px-3 py-2.5"
          >
            <p className="text-base font-bold leading-none truncate">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground mt-1 whitespace-nowrap uppercase tracking-wide">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* ── Sticky tab segment ── */}
      <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-lg border-b border-border/30 px-4 py-2">
        <MobileSegment scrollable options={TABS} value={tab} onChange={setTab} />
      </div>

      {/* ── Tab: Personal ── */}
      {tab === 'personal' && (
        <form onSubmit={handleSubmit(onSubmit)} className="px-4 pt-4 pb-8 space-y-4">
          <MobileSectionHeader title="Datos personales" />

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <User className="w-3 h-3" /> Nombres
              </Label>
              <Input
                {...register('first_name')}
                className={cn('h-10', errors.first_name && 'border-red-500')}
              />
              {errors.first_name && (
                <p className="text-xs text-red-500">{errors.first_name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <User className="w-3 h-3" /> Apellidos
              </Label>
              <Input
                {...register('last_name')}
                className={cn('h-10', errors.last_name && 'border-red-500')}
              />
              {errors.last_name && (
                <p className="text-xs text-red-500">{errors.last_name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Phone className="w-3 h-3" /> Teléfono
              </Label>
              <Input {...register('phone')} className="h-10" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> Fecha de nacimiento
              </Label>
              <Input type="date" {...register('birth_date')} className="h-10" />
            </div>
          </div>

          <MobileSectionHeader title="Dirección" />
          <div className="space-y-1.5">
            <GeolocationInput
              value={geolocation || undefined}
              onChange={value => {
                onGeolocationChange(value);
                setFormValue('address', value?.address ?? '');
              }}
              label="Ubicación en el mapa (opcional)"
              placeholder="Buscar dirección o seleccionar en el mapa..."
            />
            <p className="text-xs text-muted-foreground/70 flex items-start gap-1">
              <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
              Permite que tu liderazgo te ubique en el mapa de discipulado.
            </p>
          </div>

          <MobileSectionHeader title="Contacto de emergencia" />
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 dark:border-amber-800/40 dark:bg-amber-950/20 p-4 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-amber-800/80 dark:text-amber-200/80 font-medium">
                Nombre completo
              </Label>
              <Input
                placeholder="Nombre completo"
                className="bg-white dark:bg-background h-10 border-amber-200 dark:border-amber-800/40"
                {...register('emergency_contact_name')}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-amber-800/80 dark:text-amber-200/80 font-medium">
                Teléfono
              </Label>
              <Input
                placeholder="Número de teléfono"
                className="bg-white dark:bg-background h-10 border-amber-200 dark:border-amber-800/40"
                {...register('emergency_contact_phone')}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-semibold text-sm shadow-lg shadow-violet-500/20 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      )}

      {/* ── Tab: Iglesia ── */}
      {tab === 'iglesia' && (
        <div className="pb-8">
          <MobileSectionHeader title="Participación" />
          <div className="mx-4 rounded-2xl border border-border divide-y divide-border bg-card overflow-hidden">
            <MobileListItem
              leading={<Heart className="w-4 h-4 text-primary" />}
              title="Bautizado"
              subtitle={
                safeFormatDate(userData?.baptism_date, 'MMMM yyyy') || 'Sin fecha registrada'
              }
              trailing={
                <span
                  className={cn(
                    'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                    userData?.baptism_date
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {userData?.baptism_date ? 'Sí' : 'No'}
                </span>
              }
            />
            <MobileListItem
              leading={<Users className="w-4 h-4 text-emerald-600" />}
              title="Miembro activo"
              subtitle={
                safeFormatDate(userData?.membership_date, 'MMMM yyyy') || 'Sin fecha registrada'
              }
              trailing={
                <span
                  className={cn(
                    'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                    userData?.is_active_member
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {userData?.is_active_member ? 'Activo' : 'Inactivo'}
                </span>
              }
            />
            <MobileListItem
              leading={<BookOpen className="w-4 h-4 text-blue-600" />}
              title="Grupo celular"
              subtitle={userData?.cell_group || 'Sin asignar'}
              trailing={
                userData?.cell_group ? (
                  <span className="text-xs font-medium text-muted-foreground">
                    {userData.cell_group}
                  </span>
                ) : undefined
              }
            />
          </div>

          <MobileSectionHeader title="Ministerio" />
          <div className="mx-4 rounded-2xl border border-border divide-y divide-border bg-card overflow-hidden">
            <MobileListItem
              leading={<Settings className="w-4 h-4 text-muted-foreground" />}
              title="Rol"
              subtitle={userData?.role ?? '—'}
            />
            <MobileListItem
              leading={<Calendar className="w-4 h-4 text-muted-foreground" />}
              title="Primera visita"
              subtitle={safeFormatDate(userData?.first_visit_date, 'MMMM yyyy') || '—'}
            />
            <MobileListItem
              leading={<Users className="w-4 h-4 text-violet-600" />}
              title="Nivel de discipulado"
              subtitle={String(userData?.discipleship_level ?? '—')}
            />
          </div>
        </div>
      )}

      {/* ── Tab: Ministerio ── */}
      {tab === 'ministerio' && (
        <div className="pb-8">
          {!ministryLoaded && !ministryLoading && (
            <div className="flex justify-center py-10">
              <button
                onClick={onLoadMinistry}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card text-sm font-medium cursor-pointer active:bg-accent transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                Cargar datos de ministerio
              </button>
            </div>
          )}

          {ministryLoading && (
            <div className="flex items-center justify-center py-14">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {ministryLoaded && (
            <>
              <MobileSectionHeader title="Posición en jerarquía" />
              {!hierarchy ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Sin asignación jerárquica
                </p>
              ) : (
                <div className="mx-4 rounded-2xl border border-border divide-y divide-border bg-card overflow-hidden">
                  {[
                    { label: 'Nivel', value: String(hierarchy.hierarchy_level ?? '—') },
                    { label: 'Zona', value: hierarchy.zone_name ?? '—' },
                    { label: 'Territorio', value: hierarchy.territory ?? '—' },
                    { label: 'Supervisor', value: hierarchy.supervisor_name ?? '—' },
                  ].map(item => (
                    <MobileListItem key={item.label} title={item.label} subtitle={item.value} />
                  ))}
                </div>
              )}

              <MobileSectionHeader title={`Grupos a cargo (${myGroups.length})`} />
              {myGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Sin grupos como líder
                </p>
              ) : (
                <div className="mx-4 rounded-2xl border border-border divide-y divide-border bg-card overflow-hidden">
                  {myGroups.map(group => (
                    <MobileListItem
                      key={group.id}
                      title={group.group_name}
                      subtitle={`${group.active_members} miembros${group.meeting_day ? ` · ${group.meeting_day}` : ''}`}
                      trailing={
                        <span
                          className={cn(
                            'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                            group.status === 'active'
                              ? 'bg-primary/10 text-primary'
                              : group.status === 'multiplying'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {group.status === 'active'
                            ? 'Activo'
                            : group.status === 'multiplying'
                              ? 'Multiplicando'
                              : 'Inactivo'}
                        </span>
                      }
                    />
                  ))}
                </div>
              )}

              {subordinates.length > 0 && (
                <>
                  <MobileSectionHeader title={`A supervisar (${subordinates.length})`} />
                  <div className="mx-4 rounded-2xl border border-border divide-y divide-border bg-card overflow-hidden">
                    {subordinates.map(sub => (
                      <MobileListItem
                        key={sub.id}
                        title={sub.user_name ?? sub.user_email ?? sub.user_id}
                        subtitle={`${sub.zone_name ?? '—'} · Nivel ${sub.hierarchy_level}`}
                        trailing={
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {sub.active_groups_assigned} grupos
                          </span>
                        }
                      />
                    ))}
                  </div>
                </>
              )}

              <MobileSectionHeader title="Reportes recientes" />
              {myReports.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Sin reportes enviados aún
                </p>
              ) : (
                <div className="mx-4 rounded-2xl border border-border divide-y divide-border bg-card overflow-hidden">
                  {myReports.map(report => (
                    <MobileListItem
                      key={report.id}
                      title={report.report_type}
                      subtitle={
                        parseGoTime(report.period_end)?.toLocaleDateString('es-AR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        }) ?? report.period_end
                      }
                      trailing={
                        <span
                          className={cn(
                            'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                            report.status === 'submitted'
                              ? 'bg-blue-500/10 text-blue-600'
                              : report.status === 'draft'
                                ? 'bg-muted text-muted-foreground'
                                : 'bg-primary/10 text-primary'
                          )}
                        >
                          {report.status === 'submitted'
                            ? 'Enviado'
                            : report.status === 'draft'
                              ? 'Borrador'
                              : 'En revisión'}
                        </span>
                      }
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Tab: Seguridad ── */}
      {tab === 'seguridad' && (
        <div className="px-4 pt-4 pb-8 space-y-6">
          <div className="space-y-4">
            <MobileSectionHeader title="Cambiar contraseña" />

            <form onSubmit={onPasswordSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Nueva contraseña
                </Label>
                <div className="relative">
                  <Input
                    type={showNew ? 'text' : 'password'}
                    value={pwForm.newPassword}
                    onChange={e => onPwChange('newPassword', e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground cursor-pointer"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Confirmar contraseña
                </Label>
                <div className="relative">
                  <Input
                    type={showConfirm ? 'text' : 'password'}
                    value={pwForm.confirm}
                    onChange={e => onPwChange('confirm', e.target.value)}
                    placeholder="Repetí la nueva contraseña"
                    className="h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground cursor-pointer"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {pwError && <p className="text-sm text-red-500">{pwError}</p>}

              <button
                type="submit"
                disabled={pwLoading || !pwForm.newPassword || !pwForm.confirm}
                className="w-full h-10 rounded-xl border border-border bg-card text-sm font-medium active:bg-accent transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {pwLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {pwLoading ? 'Actualizando...' : 'Actualizar contraseña'}
              </button>
            </form>
          </div>

          <div>
            <MobileSectionHeader title="Sesión actual" />
            <div className="mx-4 rounded-2xl border border-border divide-y divide-border bg-card overflow-hidden">
              <MobileListItem
                leading={<ShieldCheck className="w-4 h-4 text-emerald-600" />}
                title="Último acceso"
                subtitle={
                  authUser?.last_sign_in_at
                    ? new Date(authUser.last_sign_in_at).toLocaleString('es-AR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Sin información'
                }
                trailing={
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                    Activo
                  </span>
                }
              />
              <MobileListItem
                leading={<Lock className="w-4 h-4 text-muted-foreground" />}
                title="Email de la cuenta"
                subtitle={authUser?.email ?? '—'}
                trailing={
                  <span className="text-[10px] font-medium text-muted-foreground">Verificado</span>
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Preferencias ── */}
      {tab === 'prefs' && (
        <div className="pb-8">
          {preferencesLoading ? (
            <div className="flex items-center justify-center py-14">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !preferences ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              No se pudieron cargar las preferencias
            </p>
          ) : (
            <>
              <MobileSectionHeader title="Apariencia" />
              <div className="mx-4 rounded-2xl border border-border divide-y divide-border bg-card overflow-hidden">
                <MobileListItem
                  leading={<Settings className="w-4 h-4 text-muted-foreground" />}
                  title="Tema"
                  subtitle="Apariencia visual de la app"
                  trailing={
                    <Select
                      value={preferences.theme}
                      onValueChange={v => onUpdatePreference('theme', v)}
                    >
                      <SelectTrigger className="h-8 w-24 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Claro</SelectItem>
                        <SelectItem value="dark">Oscuro</SelectItem>
                        <SelectItem value="auto">Auto</SelectItem>
                      </SelectContent>
                    </Select>
                  }
                />
              </div>

              <MobileSectionHeader title="Notificaciones" />
              <div className="mx-4 rounded-2xl border border-border divide-y divide-border bg-card overflow-hidden">
                {(
                  [
                    {
                      key: 'whatsapp_notifications',
                      label: 'WhatsApp',
                      sub: 'Actualizaciones importantes',
                    },
                    {
                      key: 'email_notifications',
                      label: 'Emails de eventos',
                      sub: 'Información de servicios',
                    },
                    {
                      key: 'event_reminders',
                      label: 'Recordatorios',
                      sub: 'Antes de los servicios',
                    },
                    {
                      key: 'weekly_newsletter',
                      label: 'Boletín semanal',
                      sub: 'Noticias de la semana',
                    },
                  ] as const
                ).map(item => (
                  <MobileListItem
                    key={item.key}
                    title={item.label}
                    subtitle={item.sub}
                    trailing={
                      <Switch
                        checked={!!preferences[item.key]}
                        onCheckedChange={v => onUpdatePreference(item.key, v)}
                      />
                    }
                  />
                ))}
              </div>

              <MobileSectionHeader title="Privacidad" />
              <div className="mx-4 rounded-2xl border border-border divide-y divide-border bg-card overflow-hidden">
                <MobileListItem
                  title="Visibilidad del perfil"
                  subtitle="Quién puede ver tu información"
                  trailing={
                    <Select
                      value={preferences.profile_visibility}
                      onValueChange={v => onUpdatePreference('profile_visibility', v)}
                    >
                      <SelectTrigger className="h-8 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Público</SelectItem>
                        <SelectItem value="members">Miembros</SelectItem>
                        <SelectItem value="private">Privado</SelectItem>
                      </SelectContent>
                    </Select>
                  }
                />
                {(
                  [
                    { key: 'show_email', label: 'Mostrar email', sub: 'Otros ven tu email' },
                    { key: 'show_phone', label: 'Mostrar teléfono', sub: 'Otros ven tu teléfono' },
                  ] as const
                ).map(item => (
                  <MobileListItem
                    key={item.key}
                    title={item.label}
                    subtitle={item.sub}
                    trailing={
                      <Switch
                        checked={!!preferences[item.key]}
                        onCheckedChange={v => onUpdatePreference(item.key, v)}
                      />
                    }
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </MobileScreen>
  );
}
