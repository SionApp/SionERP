import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuditLogModal } from '@/components/AuditLogModal';
import {
  DashboardService,
  TraceabilityDomain,
  TraceabilityEntry,
} from '@/services/dashboard.service';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, History } from 'lucide-react';

const PAGE_SIZE = 25;

const DOMAIN_TABS: { value: TraceabilityDomain | 'todo'; label: string }[] = [
  { value: 'todo', label: 'Todo' },
  { value: 'discipulado', label: 'Discipulado' },
  { value: 'usuarios', label: 'Usuarios' },
  { value: 'configuracion', label: 'Configuración' },
];

const TABLE_LABELS: Record<string, string> = {
  users: 'Usuario',
  user_profiles: 'Perfil de usuario',
  discipleship_alerts: 'Alerta de discipulado',
  discipleship_goals: 'Meta de discipulado',
  discipleship_groups: 'Grupo celular',
  discipleship_reports: 'Reporte de discipulado',
  cell_multiplication_tracking: 'Multiplicación de célula',
  church_info: 'Datos de la iglesia',
  system_settings: 'Configuración del sistema',
  notification_config: 'Configuración de notificaciones',
};

const actionBadge = (action: string) => {
  switch (action) {
    case 'INSERT':
      return { label: 'Creado', className: 'bg-green-500/10 text-green-600 border-green-200' };
    case 'UPDATE':
      return { label: 'Editado', className: 'bg-amber-500/10 text-amber-600 border-amber-200' };
    case 'DELETE':
      return { label: 'Eliminado', className: 'bg-red-500/10 text-red-600 border-red-200' };
    default:
      return { label: action, className: 'bg-muted text-muted-foreground' };
  }
};

const formatWhen = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('es-AR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const TrazabilidadPage = () => {
  const [domain, setDomain] = useState<TraceabilityDomain | 'todo'>('todo');
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<TraceabilityEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TraceabilityEntry | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const res = await DashboardService.getTraceability({
          domain: domain === 'todo' ? undefined : domain,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        });
        if (!cancelled) {
          setItems(res.items);
          setTotal(res.total);
        }
      } catch (err) {
        console.error('Error loading traceability:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [domain, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-xl font-bold tracking-tight">Trazabilidad</h1>
          <p className="text-sm text-muted-foreground">
            Historial completo de cambios del sistema — quién hizo qué y cuándo.
          </p>
        </div>
      </div>

      <Tabs
        value={domain}
        onValueChange={v => {
          setDomain(v as TraceabilityDomain | 'todo');
          setPage(0);
        }}
      >
        <TabsList>
          {DOMAIN_TABS.map(t => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {loading ? 'Cargando…' : `${total} evento${total !== 1 ? 's' : ''}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
              <History className="h-8 w-8 opacity-20" />
              <p className="text-sm">Sin eventos en esta categoría</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map(entry => {
                const badge = actionBadge(entry.action);
                return (
                  <button
                    key={entry.id}
                    onClick={() => setSelected(entry)}
                    className="w-full flex items-center gap-3 p-3 sm:p-4 text-left hover:bg-muted/50 transition-colors"
                  >
                    <Badge variant="outline" className={cn('shrink-0 border', badge.className)}>
                      {badge.label}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {TABLE_LABELS[entry.table_name] || entry.table_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        por {entry.user || 'Sistema'}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      {formatWhen(entry.changed_at)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage(p => Math.max(0, p - 1))}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          <span className="text-xs text-muted-foreground">
            Página {page + 1} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
          >
            Siguiente
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      <AuditLogModal isOpen={!!selected} onClose={() => setSelected(null)} auditLog={selected} />
    </div>
  );
};

export default TrazabilidadPage;
