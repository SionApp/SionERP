import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSystem } from '@/contexts/SystemContext';
import { ApiService } from '@/services/api.service';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Module {
  key: string;
  name: string;
  description: string;
  is_installed: boolean;
  installed_at: string | null;
}

export default function ModulesManagementPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const { refreshModules } = useSystem();

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const data = await ApiService.get<{ modules: Module[] }>('/setup/status');
      setModules(data.modules.filter(m => m.key !== 'base'));
    } catch (error) {
      toast.error('Error al cargar módulos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = async (moduleKey: string, currentStatus: boolean) => {
    setUpdating(moduleKey);
    try {
      await ApiService.put(`/modules/${moduleKey}`, { is_installed: !currentStatus });

      toast.success(`Módulo ${!currentStatus ? 'habilitado' : 'deshabilitado'} exitosamente`);
      await fetchModules();
      await refreshModules();
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar módulo');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-6 p-2 sm:p-3 md:p-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Gestión de Módulos</h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Habilita o deshabilita módulos del sistema según tus necesidades.
        </p>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
        {modules.map(module => (
          <Card key={module.key}>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <CardTitle className="text-base sm:text-lg">{module.name}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">{module.description}</CardDescription>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <Switch
                    id={`module-${module.key}`}
                    checked={module.is_installed}
                    onCheckedChange={() => toggleModule(module.key, module.is_installed)}
                    disabled={updating === module.key}
                  />
                  <Label htmlFor={`module-${module.key}`} className="cursor-pointer">
                    {module.is_installed ? 'Habilitado' : 'Deshabilitado'}
                  </Label>
                  {updating === module.key && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                </div>
              </div>
            </CardHeader>
            {module.is_installed && module.installed_at && (
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Instalado el: {new Date(module.installed_at).toLocaleString('es-ES')}
                </p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm">Nota Importante</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            El módulo <strong>Base</strong> (Usuarios y Configuración) siempre está habilitado y no
            puede ser desactivado.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
