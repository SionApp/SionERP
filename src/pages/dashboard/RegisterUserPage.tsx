import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { toast } from 'sonner';
import { UserPlus, Save } from 'lucide-react';
import { registerUserSchema, RegisterUserFormData } from '@/schemas/user.schemas';
import { UserService } from '@/services/user.service';
import { User } from '@/types/user.types';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';

const RegisterUserPage = () => {
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const {
    canManageRoles,
    isLoading: isLoadingPermissions,
  } = usePermissions();

  const userId = location.state?.userId;

  const formatDateForInput = (dateString: string) => {
    const date = dateString ? format(parseISO(dateString), 'yyyy-MM-dd') : '';
    return date;
  };

  const loadUserForEdit = useCallback(
    async (id: string) => {
      try {
        setLoading(true);
        const user = await UserService.getUserById(id);
        setEditingUser(user);

        reset({
          email: user.email,
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          id_number: user.id_number || '',
          phone: user.phone || '',
          address: user.address || '',
          role: user.role,
          birth_date: formatDateForInput(user.birth_date) || '',
          baptized: user.baptized || false,
          whatsapp: user.whatsapp || false,
          marital_status: user.marital_status || '',
          occupation: user.occupation || '',
          education_level: user.education_level || '',
          how_found_church: user.how_found_church || '',
          ministry_interest: user.ministry_interest || '',
          first_visit_date: formatDateForInput(user.first_visit_date) || '',
          cell_group: user.cell_group || '',
          baptism_date: formatDateForInput(user.baptism_date) || '',
          membership_date: formatDateForInput(user.membership_date) || '',
          pastoral_notes: user.pastoral_notes || '',
          is_active_member: user.is_active_member || false,
          emergency_contact_name: user.emergency_contact_name || '',
          emergency_contact_phone: user.emergency_contact_phone || '',
        });
      } catch (error) {
        toast.error('Error al cargar los datos del usuario');
        navigate('/dashboard/users');
      } finally {
        setLoading(false);
      }
    },
    [navigate, setLoading, setEditingUser]
  );

  // useEffect para cargar datos del usuario si estamos editando
  useEffect(() => {
    if (userId) {
      setIsEditMode(true);
      loadUserForEdit(userId);
    } else {
      setIsEditMode(false);
    }
  }, [userId, loadUserForEdit, setIsEditMode]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<RegisterUserFormData>({
    resolver: zodResolver(registerUserSchema),
    defaultValues: {
      baptized: false,
      whatsapp: false,
      is_active_member: false,
      role: 'server' as const,
    },
  });

  const baptized = watch('baptized');
  const isActiveMember = watch('is_active_member');

  // Handler para mostrar errores de validación
  const onError = (errors: Record<string, { message?: string }>) => {
    console.log('Errores de validación:', errors);

    // Obtener el primer error para mostrarlo
    const firstErrorField = Object.keys(errors)[0];
    const firstError = errors[firstErrorField];

    // Mostrar toast con el error
    if (firstError?.message) {
      toast.error(`Error de validación: ${firstError.message}`);
    } else {
      toast.error('Por favor, completa todos los campos requeridos');
    }

    // Mostrar todos los errores en consola
    Object.entries(errors).forEach(([, error]: [string, { message?: string }]) => {
      toast.error(`Error de validación: ${error.message}`);
    });
  };

  const onSubmit = async (data: RegisterUserFormData) => {
    try {
      setLoading(true);
      if (isEditMode && editingUser) {
        // Modo edición
        const updateData = {
          id: editingUser.id,
          ...data,
        };

        await UserService.updateUser(updateData);
        toast.success('Usuario actualizado exitosamente');
        navigate('/dashboard/users');
      } else {
        // Modo creación
        await UserService.createUser(data);
        toast.success('Usuario creado exitosamente');
        reset();
      }
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error(isEditMode ? 'Error al actualizar el usuario' : 'Error al crear el usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {isEditMode ? 'Editar Usuario' : 'Registro de Usuarios'}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode
              ? 'Modifica los datos del usuario seleccionado'
              : 'Registra un nuevo usuario en el sistema'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isEditMode ? <Save className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            {isEditMode ? 'Datos del Usuario' : 'Datos del Usuario'}
          </CardTitle>
          <CardDescription>
            {isEditMode
              ? 'Modifica los campos que desees cambiar del usuario'
              : 'Completa todos los campos requeridos para registrar un nuevo usuario'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">
            {/* Información Personal */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Información Personal</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nombres">Nombres *</Label>
                  <Input
                    id="nombres"
                    {...register('first_name')}
                    placeholder="Ingresa los nombres"
                  />
                  {errors.first_name && (
                    <p className="text-sm text-destructive">{errors.first_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apellidos">Apellidos *</Label>
                  <Input
                    id="apellidos"
                    {...register('last_name')}
                    placeholder="Ingresa los apellidos"
                  />
                  {errors.last_name && (
                    <p className="text-sm text-destructive">{errors.last_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cedula">Cédula *</Label>
                  <Input id="cedula" {...register('id_number')} placeholder="Número de cédula" />
                  {errors.id_number && (
                    <p className="text-sm text-destructive">{errors.id_number.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono *</Label>
                  <Input id="telefono" {...register('phone')} placeholder="Número de teléfono" />
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Contacto */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Información de Contacto</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="correo">Correo Electrónico *</Label>
                  <Input
                    id="correo"
                    type="email"
                    {...register('email')}
                    placeholder="correo@ejemplo.com"
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Dirección *</Label>
                <Input id="address" {...register('address')} placeholder="Dirección completa" />
                {errors.address && (
                  <p className="text-sm text-destructive">{errors.address.message}</p>
                )}
              </div>
            </div>

            {/* Extended Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Información Adicional</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
                  <Input id="birth_date" type="date" {...register('birth_date')} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marital_status">Estado Civil</Label>
                  <Select
                    value={watch('marital_status')}
                    onValueChange={value => setValue('marital_status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona estado civil" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="soltero">Soltero(a)</SelectItem>
                      <SelectItem value="casado">Casado(a)</SelectItem>
                      <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                      <SelectItem value="viudo">Viudo(a)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="occupation">Ocupación</Label>
                  <Input
                    id="occupation"
                    {...register('occupation')}
                    placeholder="Profesión o trabajo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="education_level">Nivel Educativo</Label>
                  <Select
                    value={watch('education_level')}
                    onValueChange={value => setValue('education_level', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona nivel educativo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primaria">Primaria</SelectItem>
                      <SelectItem value="secundaria">Secundaria</SelectItem>
                      <SelectItem value="tecnico">Técnico</SelectItem>
                      <SelectItem value="universitario">Universitario</SelectItem>
                      <SelectItem value="postgrado">Postgrado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="how_found_church">¿Cómo conoció la iglesia?</Label>
                  <Input
                    id="how_found_church"
                    {...register('how_found_church')}
                    placeholder="Invitación, redes sociales, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ministry_interest">Ministerio de Interés</Label>
                  <Input
                    id="ministry_interest"
                    {...register('ministry_interest')}
                    placeholder="Alabanza, niños, jóvenes, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="first_visit_date">Fecha de Primera Visita</Label>
                  <Input id="first_visit_date" type="date" {...register('first_visit_date')} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cell_group">Grupo o Celula</Label>
                  <Input
                    id="cell_group"
                    {...register('cell_group')}
                    placeholder="Nombre del grupo celular"
                  />
                </div>
              </div>
            </div>

            {/* Church Membership */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Membresía de la Iglesia</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {baptized && (
                  <div className="space-y-2">
                    <Label htmlFor="baptism_date">Fecha de Bautizo</Label>
                    <Input id="baptism_date" type="date" {...register('baptism_date')} />
                  </div>
                )}

                {isActiveMember && (
                  <div className="space-y-2">
                    <Label htmlFor="membership_date">Fecha de Membresía</Label>
                    <Input id="membership_date" type="date" {...register('membership_date')} />
                  </div>
                )}
              </div>
            </div>

            {/* Role and Configuration - Solo visible para staff y pastor */}
            {!isLoadingPermissions && canManageRoles && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Rol y Configuración</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="role">Rol *</Label>
                    <Select
                      value={watch('role')}
                      onValueChange={value =>
                        setValue('role', value as 'pastor' | 'staff' | 'supervisor' | 'server')
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="server">Servidor</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="pastor">Pastor</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.role && (
                      <p className="text-sm text-destructive">{errors.role.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pastoral_notes">Notas Pastorales (Solo Admin)</Label>
                  <textarea
                    id="pastoral_notes"
                    {...register('pastoral_notes')}
                    className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Notas adicionales sobre el miembro"
                  />
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Configuraciones</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="baptized"
                    checked={baptized}
                    onCheckedChange={checked => setValue('baptized', checked as boolean)}
                  />
                  <Label htmlFor="baptized">Usuario bautizado</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_active_member"
                    checked={isActiveMember}
                    onCheckedChange={checked => setValue('is_active_member', checked as boolean)}
                  />
                  <Label htmlFor="is_active_member">Miembro activo</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="whatsapp"
                    onCheckedChange={checked => setValue('whatsapp', checked as boolean)}
                  />
                  <Label htmlFor="whatsapp">Recibir notificaciones por WhatsApp</Label>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              {isEditMode && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard/users')}
                  className="flex-1"
                  disabled={loading}
                >
                  Cancelar
                </Button>
              )}
              <Button type="submit" disabled={loading} className={isEditMode ? 'flex-1' : 'w-full'}>
                {loading
                  ? isEditMode
                    ? 'Actualizando...'
                    : 'Registrando...'
                  : isEditMode
                    ? 'Actualizar Usuario'
                    : 'Registrar Usuario'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterUserPage;
