import { useState } from 'react';
import type { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { GeolocationInput, type GeolocationResult } from '@/components/ui/geolocation-input';
import type { RegisterUserFormData } from '@/schemas/user.schemas';
import type { UserRole } from '@/types/user.types';
import { MobileScreen } from '../MobileScreen';
import { MobileSegment } from '../MobileSegment';

export interface MobileRegisterScreenProps {
  isEditMode: boolean;
  loading: boolean;
  canManageUsers: boolean;
  canManageRoles: boolean;
  register: UseFormRegister<RegisterUserFormData>;
  errors: FieldErrors<RegisterUserFormData>;
  watch: UseFormWatch<RegisterUserFormData>;
  setValue: UseFormSetValue<RegisterUserFormData>;
  onFormSubmit: React.FormEventHandler<HTMLFormElement>;
  geolocation: GeolocationResult | null;
  onGeolocationChange: (v: GeolocationResult | null) => void;
  onCancel: () => void;
}

// Compact labeled field wrapper — mobile-first spacing and error display.
function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
      <span className="text-sm font-medium">{label}</span>
      <Checkbox checked={checked} onCheckedChange={c => onChange(c === true)} />
    </label>
  );
}

export function MobileRegisterScreen({
  isEditMode,
  loading,
  canManageUsers,
  canManageRoles,
  register,
  errors,
  watch,
  setValue,
  onFormSubmit,
  geolocation,
  onGeolocationChange,
  onCancel,
}: MobileRegisterScreenProps) {
  const [section, setSection] = useState('personal');
  const baptized = watch('baptized');
  const isActiveMember = watch('is_active_member');

  const segments = [
    { value: 'personal', label: 'Personal' },
    { value: 'contacto', label: 'Contacto' },
    { value: 'iglesia', label: 'Iglesia' },
    ...(canManageUsers ? [{ value: 'acceso', label: 'Acceso' }] : []),
  ];

  return (
    <MobileScreen
      title={isEditMode ? 'Editar usuario' : 'Registrar'}
      subtitle={isEditMode ? 'Modificá los datos' : 'Nuevo usuario'}
      back="/dashboard/users"
    >
      <form onSubmit={onFormSubmit} className="flex flex-col">
        <div className="sticky top-14 z-20 -mb-1 bg-background/90 px-4 py-2 backdrop-blur">
          <MobileSegment options={segments} value={section} onChange={setSection} scrollable />
        </div>

        <div className="space-y-4 px-4 py-4">
          {section === 'personal' && (
            <>
              <Field label="Nombre *" htmlFor="m-first" error={errors.first_name?.message}>
                <Input id="m-first" {...register('first_name')} placeholder="Nombres" />
              </Field>
              <Field label="Apellido *" htmlFor="m-last" error={errors.last_name?.message}>
                <Input id="m-last" {...register('last_name')} placeholder="Apellidos" />
              </Field>
              <Field label="Cédula *" htmlFor="m-ced" error={errors.id_number?.message}>
                <Input id="m-ced" {...register('id_number')} placeholder="Número de cédula" />
              </Field>
              <Field label="Teléfono *" htmlFor="m-phone" error={errors.phone?.message}>
                <Input id="m-phone" {...register('phone')} placeholder="Número de teléfono" />
              </Field>
              <Field label="Fecha de nacimiento" htmlFor="m-birth">
                <Input id="m-birth" type="date" {...register('birth_date')} />
              </Field>
              <Field label="Estado civil">
                <Select
                  value={watch('marital_status')}
                  onValueChange={v => setValue('marital_status', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccioná" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="soltero">Soltero(a)</SelectItem>
                    <SelectItem value="casado">Casado(a)</SelectItem>
                    <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                    <SelectItem value="viudo">Viudo(a)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Ocupación" htmlFor="m-occ">
                <Input id="m-occ" {...register('occupation')} placeholder="Profesión o trabajo" />
              </Field>
              <Field label="Nivel educativo">
                <Select
                  value={watch('education_level')}
                  onValueChange={v => setValue('education_level', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccioná" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primaria">Primaria</SelectItem>
                    <SelectItem value="secundaria">Secundaria</SelectItem>
                    <SelectItem value="tecnico">Técnico</SelectItem>
                    <SelectItem value="universitario">Universitario</SelectItem>
                    <SelectItem value="postgrado">Postgrado</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </>
          )}

          {section === 'contacto' && (
            <>
              <Field label="Correo electrónico *" htmlFor="m-email" error={errors.email?.message}>
                <Input
                  id="m-email"
                  type="email"
                  {...register('email')}
                  placeholder="correo@ejemplo.com"
                />
              </Field>
              <Field label="Dirección y ubicación">
                <GeolocationInput
                  value={geolocation}
                  onChange={onGeolocationChange}
                  label=""
                  compact
                  placeholder="Buscar dirección o tocar el mapa…"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Buscá una dirección o tocá el mapa. Permite ubicar a la persona en el mapa de
                  zonas.
                </p>
              </Field>
            </>
          )}

          {section === 'iglesia' && (
            <>
              <Field label="¿Cómo conoció la iglesia?" htmlFor="m-how">
                <Input
                  id="m-how"
                  {...register('how_found_church')}
                  placeholder="Invitación, redes…"
                />
              </Field>
              <Field label="Ministerio de interés" htmlFor="m-min">
                <Input
                  id="m-min"
                  {...register('ministry_interest')}
                  placeholder="Alabanza, niños, jóvenes…"
                />
              </Field>
              <Field label="Fecha de primera visita" htmlFor="m-fv">
                <Input id="m-fv" type="date" {...register('first_visit_date')} />
              </Field>
              <Field label="Grupo o célula" htmlFor="m-cell">
                <Input id="m-cell" {...register('cell_group')} placeholder="Nombre del grupo" />
              </Field>

              <div className="space-y-2 pt-1">
                <ToggleRow
                  label="Usuario bautizado"
                  checked={baptized}
                  onChange={v => setValue('baptized', v)}
                />
                {baptized && (
                  <Field label="Fecha de bautizo" htmlFor="m-bd">
                    <Input id="m-bd" type="date" {...register('baptism_date')} />
                  </Field>
                )}
                <ToggleRow
                  label="Miembro activo"
                  checked={isActiveMember}
                  onChange={v => setValue('is_active_member', v)}
                />
                {isActiveMember && (
                  <Field label="Fecha de membresía" htmlFor="m-md">
                    <Input id="m-md" type="date" {...register('membership_date')} />
                  </Field>
                )}
                <ToggleRow
                  label="Notificaciones por WhatsApp"
                  checked={watch('whatsapp') === true}
                  onChange={v => setValue('whatsapp', v)}
                />
              </div>
            </>
          )}

          {section === 'acceso' && canManageUsers && (
            <>
              <Field label="Rol *" error={errors.role?.message}>
                <Select value={watch('role')} onValueChange={v => setValue('role', v as UserRole)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccioná un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Miembro</SelectItem>
                    <SelectItem value="server">Servidor</SelectItem>
                    {canManageRoles && (
                      <>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="staff">Personal Administrativo</SelectItem>
                        <SelectItem value="pastor">Pastor</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Notas pastorales" htmlFor="m-notes">
                <textarea
                  id="m-notes"
                  {...register('pastoral_notes')}
                  className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Notas adicionales sobre el miembro"
                />
              </Field>
            </>
          )}
        </div>

        {/* Sticky submit bar above the bottom nav */}
        <div className="sticky bottom-0 z-20 flex gap-2 border-t border-border/40 bg-background/95 px-4 py-3 backdrop-blur">
          {isEditMode && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold active:bg-muted disabled:opacity-50"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 active:opacity-90 disabled:opacity-50"
          >
            {loading
              ? isEditMode
                ? 'Actualizando…'
                : 'Registrando…'
              : isEditMode
                ? 'Actualizar usuario'
                : 'Registrar usuario'}
          </button>
        </div>
      </form>
    </MobileScreen>
  );
}
