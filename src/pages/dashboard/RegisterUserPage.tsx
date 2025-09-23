import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';

const userSchema = z.object({
  nombres: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  apellidos: z.string().min(2, 'Los apellidos deben tener al menos 2 caracteres'),
  cedula: z.string().min(8, 'La cédula debe tener al menos 8 caracteres'),
  correo: z.string().email('Correo electrónico inválido'),
  telefono: z.string().min(10, 'El teléfono debe tener al menos 10 dígitos'),
  direccion: z.string().min(5, 'La dirección debe tener al menos 5 caracteres'),
  role: z.enum(['pastor', 'staff', 'supervisor', 'server'] as const),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  bautizado: z.boolean().default(false),
  whatsapp: z.boolean().default(false),
  fecha_bautizo: z.string().optional(),
});

type UserForm = z.infer<typeof userSchema>;

const RegisterUserPage = () => {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      bautizado: false,
      whatsapp: false,
      role: 'server' as const
    }
  });

  const bautizado = watch('bautizado');

  const onSubmit = async (data: UserForm) => {
    try {
      setLoading(true);

      // Crear hash de la contraseña (esto debería hacerse en el backend)
      const passwordHash = btoa(data.password); // Temporal, usar bcrypt en producción

      const userData = {
        nombres: data.nombres,
        apellidos: data.apellidos,
        cedula: data.cedula,
        correo: data.correo,
        telefono: data.telefono,
        direccion: data.direccion,
        role: data.role,
        password_hash: passwordHash,
        bautizado: data.bautizado,
        whatsapp: data.whatsapp,
        fecha_bautizo: data.bautizado && data.fecha_bautizo ? new Date(data.fecha_bautizo).toISOString() : null,
      };

      const { error } = await supabase
        .from('users')
        .insert([userData]);

      if (error) {
        console.error('Error creating user:', error);
        toast.error('Error al crear el usuario: ' + error.message);
        return;
      }

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Registro de Usuario</h1>
        <p className="text-muted-foreground">
          Registra un nuevo usuario en el sistema
        </p>
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

            {/* Contacto */}
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

            {/* Rol y Configuración */}
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
            </div>

            {/* Opciones */}
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
                  id="whatsapp"
                  onCheckedChange={(checked) => setValue('whatsapp', checked as boolean)}
                />
                <Label htmlFor="whatsapp">Recibir notificaciones por WhatsApp</Label>
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