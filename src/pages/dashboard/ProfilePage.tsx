import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Bell,
  Lock,
  Settings,
  Heart,
  Users,
  Edit,
  Camera,
} from 'lucide-react';
import { toast } from 'sonner';
import { UserService } from '@/services/user.service';
import { profileUpdateSchema, ProfileUpdateFormData } from '@/schemas/user.schemas';
import { User as UserType } from '@/types/user.types';

const ProfilePage = () => {
  const [loading, setLoading] = useState(false);

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
    if (!userData || !userData.full_name) return '';
    const names = userData.full_name.trim().split(' ');
    if (names.length === 1) {
      return names[0][0].toUpperCase();
    }
    return (
      (names[0][0] ? names[0][0].toUpperCase() : '') +
      (names[names.length - 1][0] ? names[names.length - 1][0].toUpperCase() : '')
    );
  };

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
      setUserData(userData);
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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Mi Perfil
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tu información personal y preferencias de la cuenta
          </p>
        </div>

        {/* Profile Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:min-w-[400px]">
          <Card className="text-center p-4">
            <div className="text-lg font-bold text-primary">Pastor</div>
            <div className="text-xs text-muted-foreground">Rol Actual</div>
          </Card>
          <Card className="text-center p-4">
            <div className="text-lg font-bold text-green-600">Activo</div>
            <div className="text-xs text-muted-foreground">Estado</div>
          </Card>
          <Card className="text-center p-4">
            <div className="text-lg font-bold text-blue-600">2 años</div>
            <div className="text-xs text-muted-foreground">Miembro</div>
          </Card>
          <Card className="text-center p-4">
            <div className="text-lg font-bold text-purple-600">100%</div>
            <div className="text-xs text-muted-foreground">Perfil</div>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="church" className="flex items-center gap-2">
            <Heart className="w-4 h-4" />
            Iglesia
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Seguridad
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Preferencias
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-6">
          {/* Profile Header Card */}
          <Card className="border-0 bg-gradient-to-r from-primary/10 to-accent/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src="" alt="Profile" />
                    <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-accent text-white">
                      {initialWordName()}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute -bottom-2 -right-2 rounded-full"
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold">{userData?.full_name}</h3>
                  <p className="text-muted-foreground">{userData?.email}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <Badge variant="default">Pastor Principal</Badge>
                    <Badge variant="outline">Miembro desde 2022</Badge>
                  </div>
                </div>
                <Button variant="outline">
                  <Edit className="w-4 h-4 mr-2" />
                  Editar Foto
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Información Personal
              </CardTitle>
              <CardDescription>Mantén tu información personal actualizada</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Nombre Completo
                    </Label>
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
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      {...register('email')}
                      className={errors.email ? 'border-red-500' : ''}
                    />
                    {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
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
                    <Input id="address" {...register('address')} />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Contacto de Emergencia
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergency_contact_name">Nombre del Contacto</Label>
                      <Input
                        id="emergency_contact_name"
                        placeholder="Nombre completo"
                        {...register('emergency_contact_name')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="emergency_contact_phone">Teléfono del Contacto</Label>
                      <Input
                        id="emergency_contact_phone"
                        placeholder="Número de teléfono"
                        {...register('emergency_contact_phone')}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={loading} className="w-full md:w-auto">
                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                </div>
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
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Bautizado</h4>
                      <p className="text-sm text-muted-foreground">15 de Mayo, 2020</p>
                    </div>
                    <Badge variant="default">Sí</Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Miembro Activo</h4>
                      <p className="text-sm text-muted-foreground">Desde Enero 2022</p>
                    </div>
                    <Badge variant="default">Activo</Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Grupo Celular</h4>
                      <p className="text-sm text-muted-foreground">Líderes Unidos</p>
                    </div>
                    <Badge variant="outline">Líder</Badge>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Ministerio</h4>
                      <p className="text-sm text-muted-foreground">Pastoral Principal</p>
                    </div>
                    <Badge variant="default">Pastor</Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Primera Visita</h4>
                      <p className="text-sm text-muted-foreground">12 de Marzo, 2020</p>
                    </div>
                    <Badge variant="outline">4 años</Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Servicios Asistidos</h4>
                      <p className="text-sm text-muted-foreground">Este mes</p>
                    </div>
                    <Badge variant="default">12/12</Badge>
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
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Notificaciones WhatsApp</h4>
                    <p className="text-sm text-muted-foreground">
                      Recibe actualizaciones importantes
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="whatsapp"
                      checked={Boolean(whatsapp)}
                      onCheckedChange={checked => setValue('whatsapp', Boolean(checked))}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Emails de Eventos</h4>
                    <p className="text-sm text-muted-foreground">
                      Información sobre eventos y servicios
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Recordatorios de Servicios</h4>
                    <p className="text-sm text-muted-foreground">
                      Notificaciones antes de los servicios
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Boletín Semanal</h4>
                    <p className="text-sm text-muted-foreground">
                      Recibe el boletín de noticias semanal
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Modo Oscuro</h4>
                    <p className="text-sm text-muted-foreground">Tema visual de la aplicación</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfilePage;
