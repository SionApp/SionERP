import LogoUploader from '@/components/LogoUploader';
import DiscipleshipMap from '@/components/discipleship/DiscipleshipMap';
import ZoneManagement from '@/components/discipleship/ZoneManagement';
import { MobileScreen } from '@/components/mobile/MobileScreen';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useMobileMode } from '@/hooks/useMobileMode';
import { applyBrandColors } from '@/hooks/useBrandColors';
import { SettingsService } from '@/services/settings.service';
import type { ChurchInfo, NotificationConfig, SystemSettings } from '@/types/settings.types';
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Church,
  Database,
  Loader2,
  Map,
  RotateCcw,
  Save,
  Settings,
  Shield,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const SECTIONS = [
  { key: 'general', label: 'General', icon: Settings },
  { key: 'church', label: 'Iglesia', icon: Church },
  { key: 'zones', label: 'Zonas', icon: Map },
  { key: 'notifications', label: 'Notificaciones', icon: Bell },
  { key: 'security', label: 'Seguridad', icon: Shield },
  { key: 'backup', label: 'Respaldos', icon: Database },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];

const SettingsPage = () => {
  const { user } = useAuth();
  const isMobileApp = useMobileMode();
  const [activeTab, setActiveTab] = useState<SectionKey>('general');
  const [mobileSection, setMobileSection] = useState<SectionKey | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Estados para cada sección
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [churchInfo, setChurchInfo] = useState<ChurchInfo | null>(null);
  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig | null>(null);

  // Cargar datos al montar
  useEffect(() => {
    loadAllSettings();
  }, []);

  const loadAllSettings = async () => {
    try {
      setIsLoading(true);
      const [system, church, notifications] = await Promise.all([
        SettingsService.getSystemSettings(),
        SettingsService.getChurchInfo(),
        SettingsService.getNotificationConfig(),
      ]);
      setSystemSettings(system);
      setChurchInfo(church);
      setNotificationConfig(notifications);
    } catch (error: unknown) {
      console.error('Error loading settings:', error);
      toast.error('Error al cargar configuraciones');
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers de guardado
  const handleSaveSystemSettings = async () => {
    if (!systemSettings) return;
    try {
      setIsSaving(true);
      await SettingsService.updateSystemSettings(systemSettings);
      toast.success('Configuración general guardada');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveChurchInfo = async () => {
    if (!churchInfo) return;
    try {
      setIsSaving(true);
      await SettingsService.updateChurchInfo(churchInfo);
      toast.success('Información de iglesia guardada');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotificationConfig = async () => {
    if (!notificationConfig) return;
    try {
      setIsSaving(true);
      await SettingsService.updateNotificationConfig(notificationConfig);
      toast.success('Configuración de notificaciones guardada');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  // Loader skeleton
  const SettingsSkeleton = () => (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-2/3" />
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-lg">Cargando configuraciones...</span>
        </div>
        <SettingsSkeleton />
      </div>
    );
  }

  // ===== Contenido de cada sección (compartido entre desktop y mobile) =====

  const generalContent = (
    <Card className={isMobileApp ? 'border-none shadow-none' : undefined}>
      {!isMobileApp && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuración General
          </CardTitle>
          <CardDescription>Configuraciones básicas del sistema</CardDescription>
        </CardHeader>
      )}
      <CardContent
        className={isMobileApp ? 'space-y-4 p-0' : 'space-y-3 sm:space-y-6 p-2 sm:p-3 md:p-6'}
      >
        {systemSettings && (
          <>
            <div className="rounded-lg border bg-muted/40 p-3 sm:p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Plataforma: JETRO</p>
                <p className="text-xs text-muted-foreground">
                  El nombre y logo de tu iglesia se configuran en la pestaña{' '}
                  <span className="font-medium">Iglesia</span> — JETRO se muestra siempre junto a
                  esa marca, no se reemplaza.
                </p>
              </div>
              <Badge variant="outline">v{systemSettings.site_version}</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <Label htmlFor="timezone">Zona Horaria</Label>
                <Select
                  value={systemSettings.timezone}
                  onValueChange={value =>
                    setSystemSettings({
                      ...systemSettings,
                      timezone: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/Argentina/Buenos_Aires">
                      América/Buenos_Aires (UTC-3)
                    </SelectItem>
                    <SelectItem value="America/Santiago">América/Santiago (UTC-3)</SelectItem>
                    <SelectItem value="America/Sao_Paulo">América/São Paulo (UTC-3)</SelectItem>
                    <SelectItem value="America/Santo_Domingo">
                      América/Santo_Domingo (UTC-4)
                    </SelectItem>
                    <SelectItem value="America/Caracas">América/Caracas (UTC-4)</SelectItem>
                    <SelectItem value="America/Bogota">América/Bogotá (UTC-5)</SelectItem>
                    <SelectItem value="America/Lima">América/Lima (UTC-5)</SelectItem>
                    <SelectItem value="America/Mexico_City">América/Mexico_City (UTC-6)</SelectItem>
                    <SelectItem value="Europe/Madrid">Europa/Madrid (UTC+1)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_language">Idioma por Defecto</Label>
                <Select
                  value={systemSettings.default_language}
                  onValueChange={value =>
                    setSystemSettings({
                      ...systemSettings,
                      default_language: value,
                    })
                  }
                >
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
                    <Label>Tema por Defecto</Label>
                    <p className="text-sm text-muted-foreground">Tema para nuevos usuarios</p>
                  </div>
                  <Select
                    value={systemSettings.default_theme}
                    onValueChange={(value: 'light' | 'dark' | 'auto') =>
                      setSystemSettings({
                        ...systemSettings,
                        default_theme: value,
                      })
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Claro</SelectItem>
                      <SelectItem value="dark">Oscuro</SelectItem>
                      <SelectItem value="auto">Auto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Animaciones</Label>
                    <p className="text-sm text-muted-foreground">
                      Mostrar animaciones en la interfaz
                    </p>
                  </div>
                  <Switch
                    checked={systemSettings.animations_enabled}
                    onCheckedChange={checked =>
                      setSystemSettings({
                        ...systemSettings,
                        animations_enabled: checked,
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Modo Mantenimiento</Label>
                    <p className="text-sm text-muted-foreground">
                      Desactivar acceso temporal al sistema
                    </p>
                  </div>
                  <Switch
                    checked={systemSettings.maintenance_mode}
                    onCheckedChange={checked =>
                      setSystemSettings({
                        ...systemSettings,
                        maintenance_mode: checked,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleSaveSystemSettings} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  const churchContent = (
    <Card className={isMobileApp ? 'border-none shadow-none' : undefined}>
      {!isMobileApp && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Church className="w-5 h-5" />
            Información de la Iglesia
          </CardTitle>
          <CardDescription>Datos generales de tu congregación</CardDescription>
        </CardHeader>
      )}
      <CardContent
        className={isMobileApp ? 'space-y-4 p-0' : 'space-y-3 sm:space-y-6 p-2 sm:p-3 md:p-6'}
      >
        {churchInfo && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <Label htmlFor="church_name">Nombre de la Iglesia</Label>
                <Input
                  id="church_name"
                  value={churchInfo.name}
                  onChange={e =>
                    setChurchInfo({
                      ...churchInfo,
                      name: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pastor_name">Pastor Principal</Label>
                <Input
                  id="pastor_name"
                  value={churchInfo.pastor_name || ''}
                  onChange={e =>
                    setChurchInfo({
                      ...churchInfo,
                      pastor_name: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="church_phone">Teléfono</Label>
                <Input
                  id="church_phone"
                  value={churchInfo.phone || ''}
                  onChange={e =>
                    setChurchInfo({
                      ...churchInfo,
                      phone: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="church_email">Email</Label>
                <Input
                  id="church_email"
                  type="email"
                  value={churchInfo.email || ''}
                  onChange={e =>
                    setChurchInfo({
                      ...churchInfo,
                      email: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="church_website">Sitio Web</Label>
                <Input
                  id="church_website"
                  value={churchInfo.website || ''}
                  onChange={e =>
                    setChurchInfo({
                      ...churchInfo,
                      website: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="church_address">Dirección</Label>
                <Textarea
                  id="church_address"
                  value={churchInfo.address || ''}
                  onChange={e =>
                    setChurchInfo({
                      ...churchInfo,
                      address: e.target.value,
                    })
                  }
                  rows={2}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="church_mission">Misión</Label>
                <Textarea
                  id="church_mission"
                  value={churchInfo.mission || ''}
                  onChange={e =>
                    setChurchInfo({
                      ...churchInfo,
                      mission: e.target.value,
                    })
                  }
                  rows={3}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="church_vision">Visión</Label>
                <Textarea
                  id="church_vision"
                  value={churchInfo.vision || ''}
                  onChange={e =>
                    setChurchInfo({
                      ...churchInfo,
                      vision: e.target.value,
                    })
                  }
                  rows={3}
                />
              </div>
            </div>

            <Separator />

            {/* Logo y Branding */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Logo y Branding</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {/* Logo */}
                <div className="space-y-2">
                  <Label>Logo Principal</Label>
                  <LogoUploader
                    currentUrl={churchInfo.logo_url}
                    type="logo"
                    onUploadSuccess={url =>
                      setChurchInfo({
                        ...churchInfo,
                        logo_url: url,
                      })
                    }
                    onDeleteSuccess={() =>
                      setChurchInfo({
                        ...churchInfo,
                        logo_url: null,
                      })
                    }
                  />
                </div>

                {/* Colores */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="primary_color">Color Primario</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={churchInfo.primary_color}
                        onChange={e => {
                          const next = { ...churchInfo, primary_color: e.target.value };
                          setChurchInfo(next);
                          applyBrandColors(next.primary_color, next.secondary_color);
                        }}
                        className="w-10 h-10 rounded-lg border cursor-pointer"
                      />
                      <Input
                        id="primary_color"
                        value={churchInfo.primary_color}
                        onChange={e => {
                          const next = { ...churchInfo, primary_color: e.target.value };
                          setChurchInfo(next);
                          if (/^#[0-9a-fA-F]{6}$/.test(e.target.value))
                            applyBrandColors(next.primary_color, next.secondary_color);
                        }}
                        placeholder="#1e40af"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondary_color">Color Secundario</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={churchInfo.secondary_color}
                        onChange={e => {
                          const next = { ...churchInfo, secondary_color: e.target.value };
                          setChurchInfo(next);
                          applyBrandColors(next.primary_color, next.secondary_color);
                        }}
                        className="w-10 h-10 rounded-lg border cursor-pointer"
                      />
                      <Input
                        id="secondary_color"
                        value={churchInfo.secondary_color}
                        onChange={e => {
                          const next = { ...churchInfo, secondary_color: e.target.value };
                          setChurchInfo(next);
                          if (/^#[0-9a-fA-F]{6}$/.test(e.target.value))
                            applyBrandColors(next.primary_color, next.secondary_color);
                        }}
                        placeholder="#fbbf24"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  {/* Live preview */}
                  <div className="rounded-lg border p-4 space-y-3">
                    <p className="text-xs text-muted-foreground font-medium">Vista previa</p>
                    <div className="flex flex-wrap gap-2 items-center">
                      <span
                        className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white"
                        style={{ background: churchInfo.primary_color }}
                      >
                        Botón primario
                      </span>
                      <span
                        className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium"
                        style={{
                          background: churchInfo.secondary_color,
                          color: '#1a1a1a',
                        }}
                      >
                        Botón secundario
                      </span>
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                        style={{ background: churchInfo.primary_color }}
                      >
                        Badge
                      </span>
                    </div>
                    <div
                      className="h-2 w-full rounded-full"
                      style={{
                        background: `linear-gradient(to right, ${churchInfo.primary_color}, ${churchInfo.secondary_color})`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Redes Sociales */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Redes Sociales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="social_facebook">Facebook</Label>
                  <Input
                    id="social_facebook"
                    value={churchInfo.social_facebook || ''}
                    onChange={e =>
                      setChurchInfo({
                        ...churchInfo,
                        social_facebook: e.target.value,
                      })
                    }
                    placeholder="https://facebook.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="social_instagram">Instagram</Label>
                  <Input
                    id="social_instagram"
                    value={churchInfo.social_instagram || ''}
                    onChange={e =>
                      setChurchInfo({
                        ...churchInfo,
                        social_instagram: e.target.value,
                      })
                    }
                    placeholder="https://instagram.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="social_youtube">YouTube</Label>
                  <Input
                    id="social_youtube"
                    value={churchInfo.social_youtube || ''}
                    onChange={e =>
                      setChurchInfo({
                        ...churchInfo,
                        social_youtube: e.target.value,
                      })
                    }
                    placeholder="https://youtube.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="social_twitter">Twitter/X</Label>
                  <Input
                    id="social_twitter"
                    value={churchInfo.social_twitter || ''}
                    onChange={e =>
                      setChurchInfo({
                        ...churchInfo,
                        social_twitter: e.target.value,
                      })
                    }
                    placeholder="https://twitter.com/..."
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleSaveChurchInfo} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  const zonesContent = isMobileApp ? (
    <div className="space-y-4">
      <ZoneManagement />
      <div>
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Map className="w-4 h-4" />
          Mapa de Células
        </h3>
        <DiscipleshipMap />
      </div>
    </div>
  ) : (
    <>
      <ZoneManagement />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="w-5 h-5" />
            Mapa de Células
          </CardTitle>
          <CardDescription>Visualiza la distribución geográfica de las células</CardDescription>
        </CardHeader>
        <CardContent>
          <DiscipleshipMap />
        </CardContent>
      </Card>
    </>
  );

  const notificationsContent = (
    <Card className={isMobileApp ? 'border-none shadow-none' : undefined}>
      {!isMobileApp && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Configuración de Notificaciones
          </CardTitle>
          <CardDescription>Gestiona cómo y cuándo enviar notificaciones</CardDescription>
        </CardHeader>
      )}
      <CardContent
        className={isMobileApp ? 'space-y-4 p-0' : 'space-y-3 sm:space-y-6 p-2 sm:p-3 md:p-6'}
      >
        {notificationConfig && (
          <>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Canales de Notificación</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email</Label>
                      <p className="text-sm text-muted-foreground">
                        Habilitar notificaciones por correo
                      </p>
                    </div>
                    <Switch
                      checked={notificationConfig.email_enabled}
                      onCheckedChange={checked =>
                        setNotificationConfig({
                          ...notificationConfig,
                          email_enabled: checked,
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Push</Label>
                      <p className="text-sm text-muted-foreground">
                        Notificaciones en navegador/app
                      </p>
                    </div>
                    <Switch
                      checked={notificationConfig.push_enabled}
                      onCheckedChange={checked =>
                        setNotificationConfig({
                          ...notificationConfig,
                          push_enabled: checked,
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>SMS</Label>
                      <p className="text-sm text-muted-foreground">
                        Mensajes de texto (costo adicional)
                      </p>
                    </div>
                    <Switch
                      checked={notificationConfig.sms_enabled}
                      onCheckedChange={checked =>
                        setNotificationConfig({
                          ...notificationConfig,
                          sms_enabled: checked,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-4">Tipos de Notificación</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Nuevos Registros</Label>
                      <p className="text-sm text-muted-foreground">
                        Notificar cuando se registre un nuevo usuario
                      </p>
                    </div>
                    <Switch
                      checked={notificationConfig.new_user_notifications}
                      onCheckedChange={checked =>
                        setNotificationConfig({
                          ...notificationConfig,
                          new_user_notifications: checked,
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Cambios de Roles</Label>
                      <p className="text-sm text-muted-foreground">
                        Notificar cuando se modifiquen roles
                      </p>
                    </div>
                    <Switch
                      checked={notificationConfig.role_change_notifications}
                      onCheckedChange={checked =>
                        setNotificationConfig({
                          ...notificationConfig,
                          role_change_notifications: checked,
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Recordatorios de Eventos</Label>
                      <p className="text-sm text-muted-foreground">
                        Recordatorios automáticos de eventos
                      </p>
                    </div>
                    <Switch
                      checked={notificationConfig.event_reminders}
                      onCheckedChange={checked =>
                        setNotificationConfig({
                          ...notificationConfig,
                          event_reminders: checked,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <p className="text-sm text-muted-foreground">
                Los correos del sistema se envían a través de un proveedor gestionado (Resend) — no
                requiere configuración SMTP.
              </p>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleSaveNotificationConfig} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  const securityContent = (
    <Card className={isMobileApp ? 'border-none shadow-none' : undefined}>
      {!isMobileApp && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Seguridad del Sistema
          </CardTitle>
          <CardDescription>Configuraciones de seguridad y acceso</CardDescription>
        </CardHeader>
      )}
      <CardContent
        className={isMobileApp ? 'space-y-4 p-0' : 'space-y-3 sm:space-y-6 p-2 sm:p-3 md:p-6'}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Registro de Usuarios</h4>
              <p className="text-sm text-muted-foreground">
                Permitir que nuevos usuarios se registren
              </p>
            </div>
            <Switch
              checked={systemSettings?.allow_registrations || false}
              onCheckedChange={checked =>
                systemSettings &&
                setSystemSettings({
                  ...systemSettings,
                  allow_registrations: checked,
                })
              }
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Tiempo de Sesión</h4>
              <p className="text-sm text-muted-foreground">
                Minutos de inactividad antes de cerrar sesión
              </p>
            </div>
            <Input
              type="number"
              className="w-24"
              value={systemSettings?.session_timeout_minutes || 60}
              onChange={e =>
                systemSettings &&
                setSystemSettings({
                  ...systemSettings,
                  session_timeout_minutes: parseInt(e.target.value) || 60,
                })
              }
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Máximo Usuarios por Grupo</h4>
              <p className="text-sm text-muted-foreground">
                Límite de miembros en grupos de discipulado
              </p>
            </div>
            <Input
              type="number"
              className="w-24"
              value={systemSettings?.max_users_per_group || 12}
              onChange={e =>
                systemSettings &&
                setSystemSettings({
                  ...systemSettings,
                  max_users_per_group: parseInt(e.target.value) || 12,
                })
              }
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSaveSystemSettings} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const backupContent = (
    <Card className={isMobileApp ? 'border-none shadow-none' : undefined}>
      {!isMobileApp && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Respaldos y Datos
          </CardTitle>
          <CardDescription>Gestión de respaldos del sistema</CardDescription>
        </CardHeader>
      )}
      <CardContent
        className={isMobileApp ? 'space-y-4 p-0' : 'space-y-3 sm:space-y-6 p-2 sm:p-3 md:p-6'}
      >
        <div className="rounded-lg border border-dashed p-6 text-center space-y-3">
          <Database className="w-10 h-10 mx-auto text-muted-foreground/50" />
          <div>
            <h4 className="font-medium">Respaldos en desarrollo</h4>
            <p className="text-sm text-muted-foreground mt-1">
              La exportación e importación de datos estará disponible en una próxima versión. Por
              ahora, Supabase realiza respaldos automáticos diariamente.
            </p>
          </div>
          <Badge variant="outline">Supabase Backup: Activo</Badge>
        </div>

        <div className="p-4 bg-muted rounded-lg space-y-2">
          <h4 className="font-medium text-sm">Información de respaldo</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Respaldo automático cada 24 horas vía Supabase</li>
            <li>Retención de 7 días en plan gratuito</li>
            <li>Restauración disponible desde el panel de Supabase</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );

  const sectionContent: Record<SectionKey, React.ReactNode> = {
    general: generalContent,
    church: churchContent,
    zones: zonesContent,
    notifications: notificationsContent,
    security: securityContent,
    backup: backupContent,
  };

  // ===== Layout mobile: lista de secciones con drill-down =====
  if (isMobileApp) {
    if (mobileSection) {
      const meta = SECTIONS.find(s => s.key === mobileSection)!;
      return (
        <MobileScreen title="Configuración">
          <div className="-mx-3 -mt-3">
            <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-lg border-b border-border/40 px-3 h-12 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileSection(null)}
                className="p-1.5 -ml-1 rounded-xl hover:bg-accent/60 active:bg-accent transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-semibold truncate flex-1 text-sm">{meta.label}</span>
            </div>
            <div className="px-4 pt-4">{sectionContent[mobileSection]}</div>
          </div>
        </MobileScreen>
      );
    }

    return (
      <MobileScreen title="Configuración" subtitle="Administra tu iglesia">
        <div className="px-4 pt-3 space-y-3">
          <Button
            variant="outline"
            onClick={loadAllSettings}
            disabled={isLoading}
            className="w-full"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Recargar
          </Button>
          <div className="rounded-2xl border border-border divide-y divide-border bg-card overflow-hidden">
            {SECTIONS.map(section => {
              const Icon = section.icon;
              return (
                <button
                  type="button"
                  key={section.key}
                  onClick={() => setMobileSection(section.key)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-accent/50 transition-colors"
                >
                  <div className="p-2 rounded-xl bg-muted">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span className="flex-1 text-sm font-medium">{section.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </div>
      </MobileScreen>
    );
  }

  // ===== Layout de escritorio =====
  return (
    <div className="space-y-3 sm:space-y-6 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Configuración del Sistema
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Administra y personaliza la configuración de tu iglesia
          </p>
        </div>
        <Button
          variant="outline"
          onClick={loadAllSettings}
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Recargar
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={value => setActiveTab(value as SectionKey)}
        className="space-y-3 sm:space-y-6"
      >
        {/* Los tabs envuelven en vez de scrollear o comprimirse: con grid de N
            columnas fijas el label más largo quedaba cortado entre 768 y 1280px.
            `grow` los reparte en la fila y `flex-wrap` baja el sobrante. */}
        <TabsList className="flex h-auto w-full flex-wrap gap-2 p-1.5">
          {SECTIONS.map(section => (
            <TabsTrigger
              key={section.key}
              value={section.key}
              className="min-h-11 grow px-3 text-xs sm:text-sm"
            >
              {section.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {SECTIONS.map(section => (
          <TabsContent key={section.key} value={section.key} className="space-y-3 sm:space-y-6">
            {sectionContent[section.key]}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default SettingsPage;
