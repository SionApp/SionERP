import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Save, Settings as SettingsIcon, Bell, Shield, Database } from "lucide-react";

const Settings = () => {
  const [settings, setSettings] = useState({
    // Church Information
    churchName: "Iglesia Sion",
    churchAddress: "Santo Domingo, República Dominicana",
    churchPhone: "+1 809-555-0100",
    churchEmail: "info@iglesiasion.com",
    churchWebsite: "https://iglesiasion.com",
    
    // Notifications
    emailNotifications: true,
    pushNotifications: false,
    auditAlerts: true,
    
    // System Settings
    allowRegistration: true,
    requireApproval: false,
    sessionTimeout: 24,
    
    // Backup Settings
    autoBackup: true,
    backupFrequency: "daily",
  });

  const handleSave = () => {
    // TODO: Implement settings save
    console.log("Saving settings:", settings);
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
            <SettingsIcon className="h-8 w-8" />
            Configuración del Sistema
          </h1>
          <p className="text-muted-foreground">
            Administra la configuración general del sistema y la iglesia
          </p>
        </div>

        <div className="space-y-6">
          {/* Church Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Información de la Iglesia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="churchName">Nombre de la Iglesia</Label>
                  <Input
                    id="churchName"
                    value={settings.churchName}
                    onChange={(e) => updateSetting("churchName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="churchPhone">Teléfono</Label>
                  <Input
                    id="churchPhone"
                    value={settings.churchPhone}
                    onChange={(e) => updateSetting("churchPhone", e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="churchAddress">Dirección</Label>
                <Textarea
                  id="churchAddress"
                  value={settings.churchAddress}
                  onChange={(e) => updateSetting("churchAddress", e.target.value)}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="churchEmail">Email</Label>
                  <Input
                    id="churchEmail"
                    type="email"
                    value={settings.churchEmail}
                    onChange={(e) => updateSetting("churchEmail", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="churchWebsite">Sitio Web</Label>
                  <Input
                    id="churchWebsite"
                    value={settings.churchWebsite}
                    onChange={(e) => updateSetting("churchWebsite", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificaciones por Email</Label>
                  <p className="text-sm text-muted-foreground">
                    Recibir alertas importantes por correo electrónico
                  </p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => updateSetting("emailNotifications", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificaciones Push</Label>
                  <p className="text-sm text-muted-foreground">
                    Recibir notificaciones push en el navegador
                  </p>
                </div>
                <Switch
                  checked={settings.pushNotifications}
                  onCheckedChange={(checked) => updateSetting("pushNotifications", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Alertas de Auditoría</Label>
                  <p className="text-sm text-muted-foreground">
                    Alertas sobre actividades importantes del sistema
                  </p>
                </div>
                <Switch
                  checked={settings.auditAlerts}
                  onCheckedChange={(checked) => updateSetting("auditAlerts", checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Configuración de Seguridad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Permitir Registro de Nuevos Usuarios</Label>
                  <p className="text-sm text-muted-foreground">
                    Los usuarios pueden registrarse automáticamente
                  </p>
                </div>
                <Switch
                  checked={settings.allowRegistration}
                  onCheckedChange={(checked) => updateSetting("allowRegistration", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Requerir Aprobación Manual</Label>
                  <p className="text-sm text-muted-foreground">
                    Los nuevos usuarios necesitan aprobación antes de acceder
                  </p>
                </div>
                <Switch
                  checked={settings.requireApproval}
                  onCheckedChange={(checked) => updateSetting("requireApproval", checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Timeout de Sesión (horas)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  min="1"
                  max="168"
                  value={settings.sessionTimeout}
                  onChange={(e) => updateSetting("sessionTimeout", parseInt(e.target.value))}
                  className="max-w-32"
                />
              </div>
            </CardContent>
          </Card>

          {/* System Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Configuración del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Respaldo Automático</Label>
                  <p className="text-sm text-muted-foreground">
                    Crear respaldos automáticos de la base de datos
                  </p>
                </div>
                <Switch
                  checked={settings.autoBackup}
                  onCheckedChange={(checked) => updateSetting("autoBackup", checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="backupFrequency">Frecuencia de Respaldo</Label>
                <select
                  id="backupFrequency"
                  value={settings.backupFrequency}
                  onChange={(e) => updateSetting("backupFrequency", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="hourly">Cada hora</option>
                  <option value="daily">Diario</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensual</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Guardar Configuración
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;