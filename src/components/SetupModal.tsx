import { useEffect, useState } from 'react';
import { ApiService } from '@/services/api.service';
import { useSystem } from '@/contexts/SystemContext';
import { toast } from 'sonner';
import { Loader2, X, Package, ShieldCheck } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface Module {
  key: string;
  name: string;
  description: string;
  is_installed: boolean;
  installed_at: string | null;
}

interface SetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SetupModal({ isOpen, onClose }: SetupModalProps) {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const { refreshModules } = useSystem();

  useEffect(() => {
    if (isOpen) {
      fetchModules();
    }
  }, [isOpen]);

  const fetchModules = async () => {
    setLoading(true);
    try {
      const data = await ApiService.get<{ modules: Module[] }>('/setup/status');
      setModules(data.modules.filter(m => m.key !== 'base'));
    } catch (error) {
      toast.error('Error al cargar módulos');
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
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al actualizar módulo';
      toast.error(msg);
    } finally {
      setUpdating(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-lg rounded-2xl border border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border/30">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-md">
                <ShieldCheck className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Gestión de Módulos</h2>
                <p className="text-xs text-muted-foreground">Panel de configuración del sistema</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-accent/60 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
            ) : modules.length === 0 ? (
              <p className="text-center text-muted-foreground py-10 text-sm">
                No hay módulos disponibles.
              </p>
            ) : (
              <div className="space-y-3">
                {modules.map(module => (
                  <div
                    key={module.key}
                    className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border/30 bg-accent/20 hover:bg-accent/40 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-tight">{module.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                          {module.description}
                        </p>
                        {module.is_installed && module.installed_at && (
                          <p className="text-[11px] text-muted-foreground/70 mt-1">
                            Instalado: {new Date(module.installed_at).toLocaleDateString('es-ES')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0 flex items-center gap-2">
                      {updating === module.key && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      )}
                      <Switch
                        checked={module.is_installed}
                        onCheckedChange={() => toggleModule(module.key, module.is_installed)}
                        disabled={updating === module.key}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-border/30 flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">
              El módulo <strong>Base</strong> siempre está activo.
            </p>
            <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground border border-border/50">
              Esc para cerrar
            </kbd>
          </div>
        </div>
      </div>
    </>
  );
}
