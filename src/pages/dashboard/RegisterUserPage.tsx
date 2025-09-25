import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { UserService } from '@/services/user.service';
import { registerUserSchema, RegisterUserFormData } from '@/schemas/user.schemas';
import { UserRole } from '@/types/user.types';

const roles: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Administrador' },
  { value: 'pastor', label: 'Pastor' },
  { value: 'staff', label: 'Staff' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'server', label: 'Servidor' },
  { value: 'member', label: 'Miembro' }
];

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
      role: 'member'
    }
  });

  const bautizado = watch('bautizado');
  const whatsapp = watch('whatsapp');
  const isActiveMember = watch('is_active_member');

  const onSubmit = async (data: RegisterUserFormData) => {
    try {
      setLoading(true);
      // Ensure required fields are present
      const userData = {
        email: data.email || '',
        password: data.password || '',
        full_name: data.full_name || '',
        role: data.role || 'member',
        ...data
      };
      await UserService.createUser(userData);
      toast.success('Usuario creado exitosamente');
      reset();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Error al crear usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Registrar Usuario</h1>
        <p className="text-muted-foreground">
          Crea un nuevo usuario en el sistema
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Usuario</CardTitle>
          <CardDescription>
            Completa la información básica del nuevo usuario
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nombre Completo</Label>
                <Input
                  id="full_name"
                  {...register('full_name')}
                  className={errors.full_name ? 'border-red-500' : ''}
                />
                {errors.full_name && (
                  <p className="text-sm text-red-500">{errors.full_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  {...register('password')}
                  className={errors.password ? 'border-red-500' : ''}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <Select onValueChange={(value: UserRole) => setValue('role', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-sm text-red-500">{errors.role.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
                <Input
                  id="birth_date"
                  type="date"
                  {...register('birth_date')}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  {...register('address')}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="bautizado"
                    checked={Boolean(bautizado)}
                    onCheckedChange={(checked) => setValue('bautizado', Boolean(checked))}
                  />
                  <Label htmlFor="bautizado">Bautizado</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_active_member"
                    checked={Boolean(isActiveMember)}
                    onCheckedChange={(checked) => setValue('is_active_member', Boolean(checked))}
                  />
                  <Label htmlFor="is_active_member">Miembro activo</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="whatsapp"
                    checked={Boolean(whatsapp)}
                    onCheckedChange={(checked) => setValue('whatsapp', Boolean(checked))}
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