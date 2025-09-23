import { useState, useEffect } from 'react';
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
import { User, Settings } from 'lucide-react';

const profileSchema = z.object({
  // Basic info
  nombres: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  apellidos: z.string().min(2, 'Los apellidos deben tener al menos 2 caracteres'),
  telefono: z.string().min(10, 'El teléfono debe tener al menos 10 dígitos'),
  direccion: z.string().min(5, 'La dirección debe tener al menos 5 caracteres'),
  
  // Extended fields
  birth_date: z.string().optional(),
  marital_status: z.string().optional(),
  occupation: z.string().optional(),
  education_level: z.string().optional(),
  how_found_church: z.string().optional(),
  ministry_interest: z.string().optional(),
  first_visit_date: z.string().optional(),
  
  // Church membership
  cell_group: z.string().optional(),
  
  // Preferences
  whatsapp: z.boolean().default(false),
});

type ProfileForm = z.infer<typeof profileSchema>;

const ProfilePage = () => {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  });

  const whatsapp = watch('whatsapp');

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast.error('No hay usuario autenticado');
          return;
        }

        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error loading user data:', error);
          toast.error('Error al cargar los datos del usuario');
          return;
        }

        if (userData) {
          setUserRole(userData.role);
          
          // Populate form with user data
          reset({
            nombres: userData.nombres || '',
            apellidos: userData.apellidos || '',
            telefono: userData.telefono || '',
            direccion: userData.direccion || '',
            birth_date: userData.birth_date || '',
            marital_status: userData.marital_status || '',
            occupation: userData.occupation || '',
            education_level: userData.education_level || '',
            how_found_church: userData.how_found_church || '',
            ministry_interest: userData.ministry_interest || '',
            first_visit_date: userData.first_visit_date || '',
            cell_group: userData.cell_group || '',
            whatsapp: userData.whatsapp || false,
          });
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        toast.error('Error al cargar los datos del usuario');
      } finally {
        setInitialLoading(false);
      }
    };

    loadUserData();
  }, [reset]);

  const onSubmit = async (data: ProfileForm) => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('No hay usuario autenticado');
        return;
      }

      const updateData = {
        nombres: data.nombres,
        apellidos: data.apellidos,
        telefono: data.telefono,
        direccion: data.direccion,
        birth_date: data.birth_date || null,
        marital_status: data.marital_status || null,
        occupation: data.occupation || null,
        education_level: data.education_level || null,
        how_found_church: data.how_found_church || null,
        ministry_interest: data.ministry_interest || null,
        first_visit_date: data.first_visit_date || null,
        cell_group: data.cell_group || null,
        whatsapp: data.whatsapp,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);

      if (error) {
        console.error('Error updating user:', error);
        toast.error('Error al actualizar el perfil: ' + error.message);
        return;
      }

      toast.success('Perfil actualizado exitosamente');
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Error al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Cargando perfil...</p>
        </div>
      </div>
    );
  }

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
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Información Personal
          </CardTitle>
          <CardDescription>
            Actualiza tus datos personales y de contacto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Información Básica</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nombres">Nombres *</Label>
                  <Input
                    id="nombres"
                    {...register('nombres')}
                    placeholder="Tus nombres"
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
                    placeholder="Tus apellidos"
                  />
                  {errors.apellidos && (
                    <p className="text-sm text-destructive">{errors.apellidos.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono *</Label>
                  <Input
                    id="telefono"
                    {...register('telefono')}
                    placeholder="Tu número de teléfono"
                  />
                  {errors.telefono && (
                    <p className="text-sm text-destructive">{errors.telefono.message}</p>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección *</Label>
                <Input
                  id="direccion"
                  {...register('direccion')}
                  placeholder="Tu dirección completa"
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
                  <Label htmlFor="marital_status">Estado Civil</Label>
                  <Select onValueChange={(value) => setValue('marital_status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tu estado civil" />
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
                    placeholder="Tu profesión o trabajo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="education_level">Nivel Educativo</Label>
                  <Select onValueChange={(value) => setValue('education_level', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tu nivel educativo" />
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
                  <Label htmlFor="how_found_church">¿Cómo conociste la iglesia?</Label>
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
                    placeholder="Nombre de tu grupo celular"
                  />
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Preferencias
              </h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="whatsapp"
                    checked={whatsapp}
                    onCheckedChange={(checked) => setValue('whatsapp', checked as boolean)}
                  />
                  <Label htmlFor="whatsapp">Recibir notificaciones por WhatsApp</Label>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Actualizando...' : 'Actualizar Perfil'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;