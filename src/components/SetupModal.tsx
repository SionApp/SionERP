import { useEffect, useState } from 'react';
import { ApiService } from '@/services/api.service';
import { useSystem } from '@/contexts/SystemContext';
import { getModuleMeta } from '@/lib/modules-meta';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';

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
  const [pendingDisable, setPendingDisable] = useState<string | null>(null);
  const { refreshModules } = useSystem();

  useEffect(() => {
    if (isOpen) {
      fetchModules();
      setPendingDisable(null);
    }
  }, [isOpen]);

  const fetchModules = async () => {
    setLoading(true);
    try {
      const data = await ApiService.get<{ modules: Module[] }>('/setup/status');
      setModules(data.modules.filter(m => m.key !== 'base'));
    } catch {
      toast.error('Error al cargar módulos');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (module: Module) => {
    if (module.is_installed) {
      setPendingDisable(module.key === pendingDisable ? null : module.key);
    } else {
      doToggle(module.key, true);
    }
  };

  const doToggle = async (moduleKey: string, newStatus: boolean) => {
    setUpdating(moduleKey);
    setPendingDisable(null);
    try {
      await ApiService.put(`/modules/${moduleKey}`, { is_installed: newStatus });
      toast.success(`Módulo ${newStatus ? 'habilitado' : 'deshabilitado'} exitosamente`);
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

  const activeCount = modules.filter(m => m.is_installed).length;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-md rounded-2xl border border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl flex flex-col max-h-[85vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/30 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-md">
                <ShieldCheck className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-sm font-semibold leading-tight">Gestión de Módulos</h2>
                <p className="text-xs text-muted-foreground">
                  {activeCount}/{modules.length} activos
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar panel"
              className="p-1.5 rounded-lg hover:bg-accent/60 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
            ) : modules.length === 0 ? (
              <p className="text-center text-muted-foreground py-10 text-sm">
                No hay módulos disponibles.
              </p>
            ) : (
              <div className="space-y-2">
                {modules.map(module => {
                  const meta = getModuleMeta(module.key);
                  const Icon = meta.icon;
                  const isUpdating = updating === module.key;
                  const awaitingConfirm = pendingDisable === module.key;

                  return (
                    <div key={module.key} className="rounded-xl overflow-hidden border border-border/30">
                      {/* Module row */}
                      <div
                        className={`flex items-center justify-between gap-3 p-3.5 transition-colors ${
                          awaitingConfirm ? 'bg-destructive/5' : 'bg-accent/20 hover:bg-accent/35'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center flex-shrink-0`}
                          >
                            <Icon className={`w-4 h-4 ${meta.text}`} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-sm font-medium leading-tight">{module.name}</p>
                              {module.is_installed ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                              ) : (
                                <XCircle className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate leading-snug">
                              {module.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isUpdating && (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                          )}
                          <button
                            onClick={() => handleToggle(module)}
                            disabled={isUpdating}
                            aria-label={`${module.is_installed ? 'Deshabilitar' : 'Habilitar'} ${module.name}`}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                              module.is_installed ? 'bg-primary' : 'bg-input'
                            }`}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                                module.is_installed ? 'translate-x-4' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Confirm disable inline */}
                      {awaitingConfirm && (
                        <div className="px-3.5 py-2.5 bg-destructive/5 border-t border-destructive/20 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-xs text-destructive">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>¿Deshabilitar? Se ocultará para todos los usuarios.</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => setPendingDisable(null)}
                              className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => doToggle(module.key, false)}
                              className="text-xs font-semibold text-destructive hover:text-destructive/80 transition-colors cursor-pointer"
                            >
                              Sí, deshabilitar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-border/30 flex items-center justify-between flex-shrink-0">
            <p className="text-[11px] text-muted-foreground">
              <strong className="text-foreground">Base</strong> siempre está activo.
            </p>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <kbd className="bg-muted border border-border px-1.5 py-0.5 rounded font-mono">Esc</kbd>
              <span>para cerrar</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
