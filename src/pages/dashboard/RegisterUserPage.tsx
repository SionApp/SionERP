import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
import { registerUserSchema, RegisterUserFormData } from '@/schemas/user.schemas';
import { UserService } from '@/services/user.service';

const RegisterUserPage = () => {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<RegisterUserFormData>({
    resolver: zodResolver(registerUserSchema),
    defaultValues: {
      bautizado: false,
      whatsapp: false,
      is_active_member: false,
      role: 'server' as const
    }
  });

  const bautizado = watch('bautizado');
  const isActiveMember = watch('is_active_member');

  const onSubmit = async (data: RegisterUserFormData) => {
    try {
      setLoading(true);
      await UserService.createUser(data);
      toast.success('Usuario creado exitosamente');
      reset();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Error al crear el usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Registro de Usuarios
          </h1>
          <p className="text-muted-foreground">
          Registra un nuevo usuario en el sistema
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Datos del Usuario
          </CardTitle>
          <CardDescription>
            Completa todos los campos requeridos para registrar un nuevo usuario
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Información Personal */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Información Personal</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nombres">Nombres *</Label>
                  <Input
                    id="nombres"
                    {...register('nombres')}
                    placeholder="Ingresa los nombres"
                  />
                  {errors.nombres && (
                    <p className="text-sm text-destructive">{errors.nombres.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apellidos">Apellidos *</Label>
                  <Input
                    id="apellidos"
                    {...register('apellidos')}
                    placeholder="Ingresa los apellidos"
                  />
                  {errors.apellidos && (
                    <p className="text-sm text-destructive">{errors.apellidos.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cedula">Cédula *</Label>
                  <Input
                    id="cedula"
                    {...register('cedula')}
                    placeholder="Número de cédula"
                  />
                  {errors.cedula && (
                    <p className="text-sm text-destructive">{errors.cedula.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono *</Label>
                  <Input
                    id="telefono"
                    {...register('telefono')}
                    placeholder="Número de teléfono"
                  />
                  {errors.telefono && (
                    <p className="text-sm text-destructive">{errors.telefono.message}</p>
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
                    {...register('correo')}
                    placeholder="correo@ejemplo.com"
                  />
                  {errors.correo && (
                    <p className="text-sm text-destructive">{errors.correo.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña *</Label>
                  <Input
                    id="password"
                    type="password"
                    {...register('password')}
                    placeholder="Contraseña del usuario"
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección *</Label>
                <Input
                  id="direccion"
                  {...register('direccion')}
                  placeholder="Dirección completa"
                />
                {errors.direccion && (
                  <p className="text-sm text-destructive">{errors.direccion.message}</p>
                )}
              </div>
            </div>

            {/* Extended Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Información Adicional</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    {...register('birth_date')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marital_status">Estado Civil</Label>
                  <Select onValueChange={(value) => setValue('marital_status', value)}>
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
                  <Select onValueChange={(value) => setValue('education_level', value)}>
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
                  <Input
                    id="first_visit_date"
                    type="date"
                    {...register('first_visit_date')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cell_group">Grupo Celular</Label>
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
                {bautizado && (
                  <div className="space-y-2">
                    <Label htmlFor="fecha_bautizo">Fecha de Bautizo</Label>
                    <Input
                      id="fecha_bautizo"
                      type="date"
                      {...register('fecha_bautizo')}
                    />
                  </div>
                )}
                
                {isActiveMember && (
                  <div className="space-y-2">
                    <Label htmlFor="membership_date">Fecha de Membresía</Label>
                    <Input
                      id="membership_date"
                      type="date"
                      {...register('membership_date')}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Role and Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Rol y Configuración</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="role">Rol *</Label>
                  <Select onValueChange={(value) => setValue('role', value as 'pastor' | 'staff' | 'supervisor' | 'server')}>
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
            </div>

            {/* Notes for Admin */}
            <div className="space-y-2">
              <Label htmlFor="pastoral_notes">Notas Pastorales (Solo Admin)</Label>
              <textarea
                id="pastoral_notes"
                {...register('pastoral_notes')}
                className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Notas adicionales sobre el miembro"
              />
            </div>

            {/* Options */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Configuraciones</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="bautizado"
                    checked={bautizado}
                    onCheckedChange={(checked) => setValue('bautizado', checked as boolean)}
                  />
                  <Label htmlFor="bautizado">Usuario bautizado</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_active_member"
                    checked={isActiveMember}
                    onCheckedChange={(checked) => setValue('is_active_member', checked as boolean)}
                  />
                  <Label htmlFor="is_active_member">Miembro activo</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="whatsapp"
                    onCheckedChange={(checked) => setValue('whatsapp', checked as boolean)}
                  />
                  <Label htmlFor="whatsapp">Recibir notificaciones por WhatsApp</Label>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Registrando...' : 'Registrar Usuario'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterUserPage;