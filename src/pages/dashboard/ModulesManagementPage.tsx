import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { MobileScreen } from '@/components/mobile/MobileScreen';
import { useMobileMode } from '@/hooks/useMobileMode';
import { useSystem } from '@/contexts/SystemContext';
import { getModuleMeta } from '@/lib/modules-meta';
import { ApiService } from '@/services/api.service';
import { CheckCircle2, Loader2, Shield, XCircle } from 'lucide-react';
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
  const isMobileApp = useMobileMode();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [confirmDisable, setConfirmDisable] = useState<Module | null>(null);
  const { refreshModules } = useSystem();

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
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
      setConfirmDisable(module);
    } else {
      doToggle(module.key, true);
    }
  };

  const doToggle = async (moduleKey: string, newStatus: boolean) => {
    setUpdating(moduleKey);
    try {
      await ApiService.put(`/modules/${moduleKey}`, { is_installed: newStatus });
      toast.success(`Módulo ${newStatus ? 'habilitado' : 'deshabilitado'} exitosamente`);
      await fetchModules();
      await refreshModules();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error al actualizar módulo');
    } finally {
      setUpdating(null);
    }
  };

  const activeCount = modules.filter(m => m.is_installed).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const moduleGrid = (
    <>
      {/* ── Module grid ── */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {modules.map(module => {
          const meta = getModuleMeta(module.key);
          const Icon = meta.icon;
          const isUpdating = updating === module.key;

          return (
            <Card
              key={module.key}
              className={`relative overflow-hidden transition-all duration-300 ${
                module.is_installed ? 'border-border shadow-sm' : 'border-border/40 bg-muted/20'
              }`}
            >
              {/* Color accent top bar */}
              <div
                className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${meta.gradient}`}
              />

              <CardHeader className="px-4 sm:px-5 pt-5 pb-3">
                <div className="flex items-start justify-between gap-3">
                  {/* Icon + name block */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-xl ${meta.bg} flex items-center justify-center flex-shrink-0 border border-white/10`}
                    >
                      <Icon className={`w-5 h-5 ${meta.text}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <h3 className="text-sm font-semibold leading-tight">{module.name}</h3>
                        {module.is_installed ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/50">
                            <XCircle className="w-2.5 h-2.5" />
                            Inactivo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-snug">
                        {module.description}
                      </p>
                    </div>
                  </div>

                  {/* Toggle */}
                  <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
                    {isUpdating && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                    )}
                    <Switch
                      checked={module.is_installed}
                      onCheckedChange={() => handleToggle(module)}
                      disabled={isUpdating}
                      aria-label={`${module.is_installed ? 'Deshabilitar' : 'Habilitar'} ${module.name}`}
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="px-4 sm:px-5 pb-4 pt-0">
                {/* Features */}
                {meta.features.length > 0 && (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mb-3">
                    {meta.features.map(feature => (
                      <li
                        key={feature}
                        className="flex items-center gap-2 text-xs text-muted-foreground"
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 bg-gradient-to-br ${meta.gradient}`}
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Installed date */}
                {module.is_installed && module.installed_at && (
                  <p className="text-[11px] text-muted-foreground/60 border-t border-border/30 pt-2.5 mt-1">
                    Habilitado el{' '}
                    {new Date(module.installed_at).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Base module note ── */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/40 border border-border/40">
        <div className="w-8 h-8 rounded-lg bg-slate-500/10 flex items-center justify-center flex-shrink-0">
          <Shield className="w-4 h-4 text-slate-500" />
        </div>
        <p className="text-xs text-muted-foreground">
          El módulo <strong className="text-foreground">Base</strong> — Usuarios, Roles y
          Configuración — siempre está activo y no puede deshabilitarse.
        </p>
      </div>
    </>
  );

  const confirmDialog = (
    <AlertDialog open={!!confirmDisable} onOpenChange={open => !open && setConfirmDisable(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Deshabilitar {confirmDisable?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Al deshabilitarlo, sus rutas y funcionalidades dejarán de estar accesibles para todos
            los usuarios. Podés volver a habilitarlo en cualquier momento sin perder datos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmDisable(null)}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              if (confirmDisable) doToggle(confirmDisable.key, false);
              setConfirmDisable(null);
            }}
          >
            Sí, deshabilitar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (isMobileApp) {
    return (
      <>
        <MobileScreen
          title="Gestión de Módulos"
          subtitle={`${activeCount}/${modules.length} activos`}
        >
          <div className="px-4 pt-3 space-y-4">{moduleGrid}</div>
        </MobileScreen>
        {confirmDialog}
      </>
    );
  }

  return (
    <>
      <div className="space-y-6 p-3 sm:p-4 md:p-6 max-w-5xl">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Gestión de Módulos</h2>
              <Badge variant="secondary" className="text-xs font-semibold tabular-nums">
                {activeCount}/{modules.length} activos
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Habilita o deshabilita módulos según las necesidades del ministerio.
            </p>
          </div>

          {/* Shortcut hint */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 border border-border/50 px-3 py-2 rounded-lg self-start whitespace-nowrap">
            <kbd className="font-mono bg-background border border-border px-1.5 py-0.5 rounded text-[10px]">
              Ctrl
            </kbd>
            <span>+</span>
            <kbd className="font-mono bg-background border border-border px-1.5 py-0.5 rounded text-[10px]">
              ⇧
            </kbd>
            <span>+</span>
            <kbd className="font-mono bg-background border border-border px-1.5 py-0.5 rounded text-[10px]">
              S
            </kbd>
            <span className="ml-1">Panel rápido</span>
          </div>
        </div>

        {moduleGrid}
      </div>
      {confirmDialog}
    </>
  );
}
