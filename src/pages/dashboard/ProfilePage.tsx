import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { UserService } from '@/services/user.service';
import { profileUpdateSchema, ProfileUpdateFormData } from '@/schemas/user.schemas';

const ProfilePage = () => {
  const [loading, setLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<ProfileUpdateFormData>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      whatsapp: false
    }
  });

  const whatsapp = watch('whatsapp');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await UserService.getCurrentUser();
      reset({
        full_name: userData.full_name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        birth_date: userData.birth_date || '',
        address: userData.address || '',
        emergency_contact_name: userData.emergency_contact_name || '',
        emergency_contact_phone: userData.emergency_contact_phone || '',
        whatsapp: userData.whatsapp || false,
      });
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Error al cargar los datos del usuario');
    }
  };

  const onSubmit = async (data: ProfileUpdateFormData) => {
    try {
      setLoading(true);
      await UserService.updateProfile(data);
      toast.success('Perfil actualizado exitosamente');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Error al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mi Perfil</h1>
        <p className="text-muted-foreground">
          Actualiza tu información personal y preferencias
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información Personal</CardTitle>
          <CardDescription>
            Actualiza tu información personal básica
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
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                />
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

              <div className="space-y-2">
                <Label htmlFor="emergency_contact_name">Contacto de Emergencia</Label>
                <Input
                  id="emergency_contact_name"
                  placeholder="Nombre del contacto"
                  {...register('emergency_contact_name')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergency_contact_phone">Teléfono de Emergencia</Label>
                <Input
                  id="emergency_contact_phone"
                  placeholder="Teléfono del contacto"
                  {...register('emergency_contact_phone')}
                />
              </div>
            </div>

            <div className="pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="whatsapp"
                  checked={Boolean(whatsapp)}
                  onCheckedChange={(checked) => setValue('whatsapp', Boolean(checked))}
                />
                <Label htmlFor="whatsapp">Recibir notificaciones por WhatsApp</Label>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Actualizando...' : 'Actualizar Perfil'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;