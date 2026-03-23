import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiService } from '@/services/api.service';
import { useSystem } from '@/contexts/SystemContext';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Module {
  key: string;
  name: string;
  description: string;
  is_installed: boolean;
}

interface SetupStatus {
  is_initialized: boolean;
  has_admin: boolean;
  modules: Module[];
}

export default function SetupPage() {
  const navigate = useNavigate();
  const { refreshModules } = useSystem();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasAdmin, setHasAdmin] = useState(false);

  const [adminData, setAdminData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    try {
      const data: SetupStatus = await ApiService.get<SetupStatus>('/setup/status');

      setIsInitialized(data.is_initialized);
      setHasAdmin(data.has_admin);

      if (!data.is_initialized || !data.has_admin) {
        setStep(1);
      } else {
        // System already initialized — redirect to dashboard
        navigate('/dashboard', { replace: true });
      }

      setModules(data.modules.filter(m => m.key !== 'base'));

      const installedModules = data.modules
        .filter(m => m.is_installed && m.key !== 'base')
        .map(m => m.key);
      setSelectedModules(installedModules);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      toast.error('Error al verificar estado del sistema: ' + msg);
    }
  };


  const handleModuleToggle = (moduleKey: string) => {
    setSelectedModules(prev =>
      prev.includes(moduleKey) ? prev.filter(k => k !== moduleKey) : [...prev, moduleKey]
    );
  };

  const handleSubmit = async () => {
    // Only validate and show step 1 if system is NOT initialized OR if no admin exists
    const shouldShowAdminForm = !isInitialized || !hasAdmin;
    if (step === 1 && shouldShowAdminForm) {
      // Validate admin data
      if (
        !adminData.first_name ||
        !adminData.last_name ||
        !adminData.email ||
        !adminData.password
      ) {
        toast.error('Por favor completa todos los campos');
        return;
      }

      if (adminData.password !== adminData.confirmPassword) {
        toast.error('Las contraseñas no coinciden');
        return;
      }

      if (adminData.password.length < 6) {
        toast.error('La contraseña debe tener al menos 6 caracteres');
        return;
      }

      setStep(2);
      return;
    }

    // Step 2: Perform setup or update modules
    setLoading(true);
    let keepLoadingUntilRedirect = false;
    try {
      interface SetupRequestBody {
        selected_modules: string[];
        admin_user?: {
          first_name: string;
          last_name: string;
          email: string;
          password_hash: string;
          role: string;
        };
      }
      const requestBody: SetupRequestBody = {
        selected_modules: selectedModules,
      };

      // Only include admin_user if system is NOT initialized OR if no admin exists
      if (!isInitialized || !hasAdmin) {
        requestBody.admin_user = {
          first_name: adminData.first_name,
          last_name: adminData.last_name,
          email: adminData.email,
          password_hash: adminData.password, // Backend will hash it
          role: 'admin',
        };
      }

      await ApiService.post('/setup', requestBody);

      const successMessage = isInitialized
        ? '¡Módulos actualizados exitosamente!'
        : '¡Sistema configurado exitosamente!';

      toast.success(successMessage);

      // Refresh installed modules so sidebar updates immediately
      try {
        await refreshModules();
      } catch {
        // ignore
      }

      if (isInitialized) {
        // If already initialized (module management), redirect to dashboard
        keepLoadingUntilRedirect = true;
        setTimeout(() => navigate('/dashboard', { replace: true }), 800);
      } else {
        // If initial setup, redirect to login
        keepLoadingUntilRedirect = true;
        setTimeout(() => navigate('/login', { replace: true }), 800);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al configurar el sistema';
      toast.error(msg);
    } finally {
      // Keep the loader visible until we redirect after success
      if (!keepLoadingUntilRedirect) setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Configuración Inicial del Sistema</CardTitle>
          <CardDescription>
            {step === 1 ? 'Paso 1: Crear Usuario Administrador' : 'Paso 2: Seleccionar Módulos'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Nombre</Label>
                  <Input
                    id="first_name"
                    value={adminData.first_name}
                    onChange={e => setAdminData({ ...adminData, first_name: e.target.value })}
                    placeholder="Juan"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Apellido</Label>
                  <Input
                    id="last_name"
                    value={adminData.last_name}
                    onChange={e => setAdminData({ ...adminData, last_name: e.target.value })}
                    placeholder="Pérez"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={adminData.email}
                  onChange={e => setAdminData({ ...adminData, email: e.target.value })}
                  placeholder="admin@iglesia.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={adminData.password}
                  onChange={e => setAdminData({ ...adminData, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={adminData.confirmPassword}
                  onChange={e => setAdminData({ ...adminData, confirmPassword: e.target.value })}
                  placeholder="Repite la contraseña"
                />
              </div>

              <Button onClick={handleSubmit} className="w-full">
                Siguiente
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Selecciona los módulos que deseas instalar. El módulo base (Usuarios y
                Configuración) se instalará automáticamente.
              </p>

              <div className="space-y-3">
                {modules.map(module => (
                  <div
                    key={module.key}
                    className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-accent"
                  >
                    <Checkbox
                      id={module.key}
                      checked={selectedModules.includes(module.key)}
                      onCheckedChange={() => handleModuleToggle(module.key)}
                    />
                    <div className="flex-1">
                      <Label htmlFor={module.key} className="font-medium cursor-pointer">
                        {module.name}
                      </Label>
                      <p className="text-sm text-muted-foreground">{module.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Atrás
                </Button>
                <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                  {loading ? 'Instalando...' : 'Completar Instalación'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
