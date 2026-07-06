import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Activity, ChevronRight, MapPin, Plus, TrendingUp } from 'lucide-react';
import { ReactNode } from 'react';
import { MobileListItem } from '../MobileListItem';
import { MobileSectionHeader } from '../MobileSectionHeader';
import { MobileStatTile } from '../MobileStatTile';

interface DiscipleshipActivity {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  color: string;
}

interface MobileDiscipleshipOverviewProps {
  firstName: string;
  stats: {
    totalGroups: number;
    totalMembers: number;
    multiplications: number;
    alertsCount: number;
  };
  statsLoading: boolean;
  activities: DiscipleshipActivity[];
  activityLoading: boolean;
  canManageGroups: boolean;
  onGoToTab: (tab: string) => void;
}

function formatTimestamp(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  if (diffHours < 1) return 'min';
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

interface QuickAction {
  label: string;
  icon: ReactNode;
  tab: string;
  color: string;
  hidden?: boolean;
}

/**
 * Resumen mobile de Discipulado.
 * Mismo lenguaje que el Dashboard de Inicio: stat chips, acciones con icono, listas full-width.
 */
export function MobileDiscipleshipOverview({
  stats,
  statsLoading,
  activities,
  activityLoading,
  canManageGroups,
  onGoToTab,
}: MobileDiscipleshipOverviewProps) {
  const actions: QuickAction[] = [
    {
      label: 'Nuevo grupo',
      icon: <Plus className="w-5 h-5" />,
      tab: 'manage',
      color: 'from-emerald-500 to-green-500',
      hidden: !canManageGroups,
    },
    {
      label: 'Dashboard',
      icon: <TrendingUp className="w-5 h-5" />,
      tab: 'dashboard',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      label: 'Mapa',
      icon: <MapPin className="w-5 h-5" />,
      tab: 'map',
      color: 'from-violet-500 to-purple-500',
      hidden: !canManageGroups,
    },
  ].filter(a => !a.hidden);

  const moduleLinks = [
    ...(canManageGroups
      ? [
          {
            key: 'manage',
            title: 'Gestión de grupos',
            subtitle: `${stats.totalGroups} grupo${stats.totalGroups !== 1 ? 's' : ''}`,
            tab: 'manage',
          },
        ]
      : []),
    {
      key: 'hierarchy',
      title: 'Jerarquías',
      subtitle: 'Estructura de discipulado',
      tab: 'hierarchy',
    },
    { key: 'zones', title: 'Zonas', subtitle: 'Mapa de zonas', tab: 'zones' },
  ];

  return (
    <div className="pb-4">
      {/* ── Stats: chips compactos horizontales ── */}
      <div className="flex gap-2 px-4 pt-4 overflow-x-auto snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <MobileStatTile label="Grupos" value={stats.totalGroups} loading={statsLoading} />
        <MobileStatTile label="Miembros" value={stats.totalMembers} loading={statsLoading} />
        <MobileStatTile
          label="Multiplicaciones"
          value={stats.multiplications}
          loading={statsLoading}
        />
        <MobileStatTile
          label="Alertas"
          value={stats.alertsCount}
          alert={stats.alertsCount > 0}
          loading={statsLoading}
        />
      </div>

      {/* ── Acciones rápidas: iconos redondos ── */}
      {actions.length > 0 && (
        <div className="grid grid-cols-3 gap-2 px-4 pt-5">
          {actions.map(action => (
            <button
              key={action.tab}
              onClick={() => onGoToTab(action.tab)}
              className="flex flex-col items-center gap-1.5 cursor-pointer group"
            >
              <div
                className={cn(
                  'w-12 h-12 rounded-2xl bg-gradient-to-br text-white flex items-center justify-center shadow-sm group-active:scale-95 transition-transform',
                  action.color
                )}
              >
                {action.icon}
              </div>
              <span className="text-[11px] text-muted-foreground leading-tight text-center">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Actividad reciente ── */}
      <MobileSectionHeader title="Actividad reciente" />
      {activityLoading ? (
        <div className="px-4 space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center py-8 gap-2 text-muted-foreground">
          <Activity className="h-7 w-7 opacity-20" />
          <p className="text-xs">Sin actividad reciente</p>
        </div>
      ) : (
        <div className="mx-4 rounded-2xl border border-border divide-y divide-border bg-card overflow-hidden">
          {activities.slice(0, 5).map(activity => (
            <MobileListItem
              key={activity.id}
              leading={
                <div className={cn('w-2 h-2 rounded-full', activity.color || 'bg-blue-500')} />
              }
              title={activity.title}
              subtitle={activity.description}
              trailing={
                <span className="text-[11px] text-muted-foreground">
                  {formatTimestamp(activity.timestamp)}
                </span>
              }
            />
          ))}
        </div>
      )}

      {/* ── Módulos ── */}
      <MobileSectionHeader title="Módulos" />
      <div className="mx-4 rounded-2xl border border-border divide-y divide-border bg-card overflow-hidden">
        {moduleLinks.map(mod => (
          <MobileListItem
            key={mod.key}
            title={mod.title}
            subtitle={mod.subtitle}
            trailing={<ChevronRight className="w-4 h-4 text-muted-foreground/50" />}
            onClick={() => onGoToTab(mod.tab)}
          />
        ))}
      </div>
    </div>
  );
}
