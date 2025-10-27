import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  Church,
  Mail,
  Bell,
  Shield,
  Database,
  Palette,
  Globe,
  Upload,
  Save,
  RotateCcw,
  Users,
  MessageSquare,
  Calendar,
  Download,
  Eye,
  EyeOff,
  MapPin,
  Map,
} from 'lucide-react';
import ZoneManagement from '@/components/discipleship/ZoneManagement';
import DiscipleshipMap from '@/components/discipleship/DiscipleshipMap';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const SettingsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async (section: string) => {
    setIsLoading(true);
    // Simular guardado
    setTimeout(() => {
      setIsLoading(false);
      toast.success(`Configuración de ${section} guardada exitosamente`);
    }, 1500);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Configuración del Sistema
          </h1>
          <p className="text-muted-foreground mt-1">
            Administra y personaliza la configuración de tu iglesia
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-7">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="church">Iglesia</TabsTrigger>
          <TabsTrigger value="zones">Zonas</TabsTrigger>
          <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
          <TabsTrigger value="security">Seguridad</TabsTrigger>
          <TabsTrigger value="integrations">Integraciones</TabsTrigger>
          <TabsTrigger value="backup">Respaldos</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configuración General
              </CardTitle>
              <CardDescription>Configuraciones básicas del sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="system-name">Nombre del Sistema</Label>
                  <Input
                    id="system-name"
                    defaultValue="Sistema Sion"
                    placeholder="Nombre del sistema"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="system-version">Versión</Label>
                  <Input
                    id="system-version"
                    defaultValue="1.0.0"
                    placeholder="Versión del sistema"
                    disabled
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Zona Horaria</Label>
                  <Select defaultValue="america/caracas">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="america/caracas">America/Caracas (UTC-4)</SelectItem>
                      <SelectItem value="america/bogota">America/Bogotá (UTC-5)</SelectItem>
                      <SelectItem value="america/lima">America/Lima (UTC-5)</SelectItem>
                      <SelectItem value="america/mexico_city">
                        America/Mexico_City (UTC-6)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Idioma</Label>
                  <Select defaultValue="es">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="pt">Português</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Preferencias de Interfaz</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Modo Oscuro por Defecto</Label>
                      <p className="text-sm text-muted-foreground">
                        Activar modo oscuro para nuevos usuarios
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Animaciones</Label>
                      <p className="text-sm text-muted-foreground">
                        Mostrar animaciones en la interfaz
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Sidebar Contraído</Label>
                      <p className="text-sm text-muted-foreground">
                        Iniciar con el sidebar contraído
                      </p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => handleSave('general')} disabled={isLoading}>
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Church Settings */}
        <TabsContent value="church" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Church className="w-5 h-5" />
                Información de la Iglesia
              </CardTitle>
              <CardDescription>Datos generales de tu congregación</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="church-name">Nombre de la Iglesia</Label>
                  <Input
                    id="church-name"
                    defaultValue="Iglesia Sion"
                    placeholder="Nombre completo de la iglesia"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pastor-name">Pastor Principal</Label>
                  <Input
                    id="pastor-name"
                    defaultValue="Pastor Juan Pérez"
                    placeholder="Nombre del pastor"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    defaultValue="+58 412-1234567"
                    placeholder="Teléfono de contacto"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    defaultValue="contacto@iglesiasion.org"
                    placeholder="Email de contacto"
                    type="email"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Textarea
                    id="address"
                    defaultValue="Av. Principal #123, Sector Centro, Ciudad, Estado"
                    placeholder="Dirección completa de la iglesia"
                    rows={3}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="mission">Misión</Label>
                  <Textarea
                    id="mission"
                    defaultValue="Proclamar el evangelio de Jesucristo y formar discípulos que transformen vidas y comunidades."
                    placeholder="Declaración de misión de la iglesia"
                    rows={3}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="vision">Visión</Label>
                  <Textarea
                    id="vision"
                    defaultValue="Ser una iglesia que impacte positivamente nuestra ciudad y las naciones con el amor de Cristo."
                    placeholder="Declaración de visión de la iglesia"
                    rows={3}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Logo y Branding</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Logo Principal</Label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                        <Church className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <Button variant="outline">
                        <Upload className="w-4 h-4 mr-2" />
                        Subir Logo
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primary-color">Color Primario</Label>
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-primary border"></div>
                        <Input id="primary-color" defaultValue="#1e40af" placeholder="#000000" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="secondary-color">Color Secundario</Label>
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-accent border"></div>
                        <Input id="secondary-color" defaultValue="#fbbf24" placeholder="#000000" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => handleSave('iglesia')} disabled={isLoading}>
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Zones Settings - Only for Pastor and Staff */}
        {(user?.role === 'pastor' || user?.role === 'staff') && (
          <TabsContent value="zones" className="space-y-6">
            <div className="space-y-6">
              <ZoneManagement />
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Map className="w-5 h-5" />
                    Mapa de Células
                  </CardTitle>
                  <CardDescription>
                    Visualiza la distribución geográfica de las células de discipulado
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DiscipleshipMap />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Configuración de Notificaciones
              </CardTitle>
              <CardDescription>Gestiona cómo y cuándo enviar notificaciones</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Notificaciones por Email</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Nuevos Registros</Label>
                        <p className="text-sm text-muted-foreground">
                          Notificar cuando se registre un nuevo usuario
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Cambios de Roles</Label>
                        <p className="text-sm text-muted-foreground">
                          Notificar cuando se modifiquen roles de usuario
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Reportes Semanales</Label>
                        <p className="text-sm text-muted-foreground">
                          Enviar resumen semanal automático
                        </p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Notificaciones Push</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Eventos Próximos</Label>
                        <p className="text-sm text-muted-foreground">
                          Recordatorios de eventos y servicios
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Mensajes Importantes</Label>
                        <p className="text-sm text-muted-foreground">
                          Anuncios y comunicados urgentes
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Configuración SMTP</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtp-host">Servidor SMTP</Label>
                      <Input id="smtp-host" placeholder="smtp.gmail.com" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="smtp-port">Puerto</Label>
                      <Input id="smtp-port" placeholder="587" type="number" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="smtp-user">Usuario</Label>
                      <Input id="smtp-user" placeholder="tu-email@gmail.com" type="email" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="smtp-password">Contraseña</Label>
                      <div className="relative">
                        <Input
                          id="smtp-password"
                          placeholder="Tu contraseña"
                          type={showPassword ? 'text' : 'password'}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => handleSave('notificaciones')} disabled={isLoading}>
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Configuración de Seguridad
              </CardTitle>
              <CardDescription>Gestiona la seguridad y acceso al sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Políticas de Contraseña</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Longitud Mínima</Label>
                        <p className="text-sm text-muted-foreground">
                          Mínimo 8 caracteres requeridos
                        </p>
                      </div>
                      <Input className="w-20" defaultValue="8" type="number" min="6" max="20" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Requerir Mayúsculas</Label>
                        <p className="text-sm text-muted-foreground">
                          Al menos una letra mayúscula
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Requerir Números</Label>
                        <p className="text-sm text-muted-foreground">Al menos un número</p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Requerir Caracteres Especiales</Label>
                        <p className="text-sm text-muted-foreground">
                          Al menos un carácter especial (!@#$%^&*)
                        </p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Sesiones y Acceso</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Tiempo de Sesión (minutos)</Label>
                        <p className="text-sm text-muted-foreground">
                          Tiempo antes de cerrar sesión automáticamente
                        </p>
                      </div>
                      <Input className="w-20" defaultValue="60" type="number" min="15" max="480" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Máximo de Intentos de Login</Label>
                        <p className="text-sm text-muted-foreground">
                          Intentos antes de bloquear cuenta temporalmente
                        </p>
                      </div>
                      <Input className="w-20" defaultValue="5" type="number" min="3" max="10" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Bloqueo Temporal (minutos)</Label>
                        <p className="text-sm text-muted-foreground">
                          Tiempo de bloqueo después de intentos fallidos
                        </p>
                      </div>
                      <Input className="w-20" defaultValue="15" type="number" min="5" max="60" />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Auditoría y Logs</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Registrar Accesos</Label>
                        <p className="text-sm text-muted-foreground">
                          Guardar registro de inicios de sesión
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Registrar Cambios de Datos</Label>
                        <p className="text-sm text-muted-foreground">
                          Mantener historial de modificaciones
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Retención de Logs (días)</Label>
                        <p className="text-sm text-muted-foreground">
                          Tiempo para conservar registros de auditoría
                        </p>
                      </div>
                      <Input className="w-20" defaultValue="90" type="number" min="30" max="365" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => handleSave('seguridad')} disabled={isLoading}>
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Settings */}
        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Integraciones Externas
              </CardTitle>
              <CardDescription>Conecta con servicios externos y APIs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6">
                {/* WhatsApp Integration */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-50 dark:bg-green-950/20 rounded-lg flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">WhatsApp Business</h3>
                        <p className="text-sm text-muted-foreground">
                          Envío de mensajes automáticos
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">Desconectado</Badge>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="whatsapp-token">Token de API</Label>
                      <Input
                        id="whatsapp-token"
                        placeholder="Ingresa tu token de WhatsApp Business"
                        type="password"
                      />
                    </div>
                    <Button variant="outline" size="sm">
                      Conectar WhatsApp
                    </Button>
                  </div>
                </div>

                {/* Google Calendar Integration */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/20 rounded-lg flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Google Calendar</h3>
                        <p className="text-sm text-muted-foreground">Sincronización de eventos</p>
                      </div>
                    </div>
                    <Badge variant="default">Conectado</Badge>
                  </div>
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      Conectado como: iglesiasion@gmail.com
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Reconfigurar
                      </Button>
                      <Button variant="outline" size="sm">
                        Desconectar
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Mailchimp Integration */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg flex items-center justify-center">
                        <Mail className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Mailchimp</h3>
                        <p className="text-sm text-muted-foreground">Marketing por email</p>
                      </div>
                    </div>
                    <Badge variant="outline">Desconectado</Badge>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="mailchimp-key">API Key</Label>
                      <Input
                        id="mailchimp-key"
                        placeholder="Ingresa tu API Key de Mailchimp"
                        type="password"
                      />
                    </div>
                    <Button variant="outline" size="sm">
                      Conectar Mailchimp
                    </Button>
                  </div>
                </div>

                {/* YouTube Integration */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-50 dark:bg-red-950/20 rounded-lg flex items-center justify-center">
                        <Globe className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">YouTube</h3>
                        <p className="text-sm text-muted-foreground">Transmisiones en vivo</p>
                      </div>
                    </div>
                    <Badge variant="default">Conectado</Badge>
                  </div>
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">Canal: Iglesia Sion Oficial</div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Reconfigurar
                      </Button>
                      <Button variant="outline" size="sm">
                        Desconectar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => handleSave('integraciones')} disabled={isLoading}>
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup Settings */}
        <TabsContent value="backup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Respaldos y Restauración
              </CardTitle>
              <CardDescription>
                Gestiona respaldos automáticos y restauración de datos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Respaldos Automáticos</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Activar Respaldos Automáticos</Label>
                        <p className="text-sm text-muted-foreground">
                          Crear respaldos programados de la base de datos
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Frecuencia</Label>
                        <p className="text-sm text-muted-foreground">
                          Cada cuánto crear respaldos automáticos
                        </p>
                      </div>
                      <Select defaultValue="daily">
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Cada Hora</SelectItem>
                          <SelectItem value="daily">Diario</SelectItem>
                          <SelectItem value="weekly">Semanal</SelectItem>
                          <SelectItem value="monthly">Mensual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Retener Respaldos (días)</Label>
                        <p className="text-sm text-muted-foreground">
                          Tiempo para conservar respaldos antiguos
                        </p>
                      </div>
                      <Input className="w-20" defaultValue="30" type="number" min="7" max="365" />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Respaldo Manual</h3>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Crear Respaldo Completo</p>
                      <p className="text-sm text-muted-foreground">
                        Incluye todos los datos, usuarios y configuraciones
                      </p>
                    </div>
                    <Button>
                      <Database className="w-4 h-4 mr-2" />
                      Crear Respaldo
                    </Button>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Historial de Respaldos</h3>
                  <div className="space-y-3">
                    {[
                      {
                        date: '2024-03-31 02:00:00',
                        size: '45.2 MB',
                        type: 'Automático',
                        status: 'Exitoso',
                      },
                      {
                        date: '2024-03-30 02:00:00',
                        size: '44.8 MB',
                        type: 'Automático',
                        status: 'Exitoso',
                      },
                      {
                        date: '2024-03-29 14:30:00',
                        size: '44.5 MB',
                        type: 'Manual',
                        status: 'Exitoso',
                      },
                      {
                        date: '2024-03-29 02:00:00',
                        size: '44.3 MB',
                        type: 'Automático',
                        status: 'Exitoso',
                      },
                    ].map((backup, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="space-y-1">
                          <p className="font-medium">{backup.date}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Tamaño: {backup.size}</span>
                            <span>Tipo: {backup.type}</span>
                            <Badge
                              variant={backup.status === 'Exitoso' ? 'default' : 'destructive'}
                              className="text-xs"
                            >
                              {backup.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-1" />
                            Descargar
                          </Button>
                          <Button variant="outline" size="sm">
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Restaurar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => handleSave('respaldos')} disabled={isLoading}>
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
