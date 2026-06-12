import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { RecentActivity } from '@/services/dashboard.service';
import { Activity, ChevronRight } from 'lucide-react';
import { MobileListItem } from '../MobileListItem';
import { MobileNotificationsBell } from '../MobileNotificationsBell';
import { MobileScreen } from '../MobileScreen';
import { MobileSectionHeader } from '../MobileSectionHeader';
import { MobileStatTile } from '../MobileStatTile';
import { Skeleton } from '@/components/ui/skeleton';

interface QuickActionItem {
  label: string;
  icon: ReactNode;
  to: string;
  color: string;
}

interface ModuleLink {
  key: string;
  title: string;
  subtitle: string;
  to: string;
  badge?: string;
}

interface MobileDashboardScreenProps {
  firstName: string;
  roleLabel?: string;
  stats: {
    totalUsers: number;
    newRegistrations: number;
    totalGroups: number;
    alertsCount: number;
  };
  actions: QuickActionItem[];
  modules: ModuleLink[];
  activity: RecentActivity[];
  loading: boolean;
  onNavigate: (to: string) => void;
  onActivityClick: (activity: RecentActivity) => void;
}

const activityDot = (type: string) => {
  switch (type) {
    case 'success':
      return 'bg-green-500';
    case 'warning':
      return 'bg-orange-500';
    case 'error':
    case 'danger':
      return 'bg-red-500';
    default:
      return 'bg-blue-500';
  }
};

/**
 * Pantalla mobile del dashboard (presentacional — DashboardHome es el container).
 * De-clutter vs web: chips compactos, acciones como iconos, listas en vez de cards.
 */
export function MobileDashboardScreen({
  firstName,
  roleLabel,
  stats,
  actions,
  modules,
  activity,
  loading,
  onNavigate,
  onActivityClick,
}: MobileDashboardScreenProps) {
  return (
    <MobileScreen
      title={`Hola, ${firstName}`}
      subtitle={roleLabel}
      action={<MobileNotificationsBell />}
    >
      {/* ── Stats: chips compactos con MobileStatTile ── */}
      <div className="flex gap-2 px-4 pt-4 overflow-x-auto snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <MobileStatTile label="Miembros" value={stats.totalUsers} loading={loading} />
        <MobileStatTile label="Grupos" value={stats.totalGroups} loading={loading} />
        <MobileStatTile label="Nuevos (30d)" value={stats.newRegistrations} loading={loading} />
        <MobileStatTile
          label="Alertas"
          value={stats.alertsCount}
          alert={stats.alertsCount > 0}
          loading={loading}
        />
      </div>

      {/* ── Acciones rápidas: iconos redondos ── */}
      {actions.length > 0 && (
        <div className="grid grid-cols-4 gap-2 px-4 pt-5">
          {actions.map(action => (
            <button
              key={action.to}
              onClick={() => onNavigate(action.to)}
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

      {/* ── Actividad reciente (4 items) ── */}
      <MobileSectionHeader title="Actividad reciente" />
      {loading ? (
        <div className="px-4 space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : activity.length === 0 ? (
        <div className="flex flex-col items-center py-8 gap-2 text-muted-foreground">
          <Activity className="h-7 w-7 opacity-20" />
          <p className="text-xs">Sin actividad reciente</p>
        </div>
      ) : (
        <div className="mx-4 rounded-2xl border border-border divide-y divide-border bg-card overflow-hidden">
          {activity.slice(0, 4).map((item, i) => (
            <MobileListItem
              key={item.id ?? i}
              leading={<div className={cn('w-2 h-2 rounded-full', activityDot(item.type))} />}
              title={item.action}
              subtitle={`por ${item.user}`}
              trailing={<span className="text-[11px] text-muted-foreground">{item.time}</span>}
              onClick={() => onActivityClick(item)}
            />
          ))}
        </div>
      )}

      {/* ── Módulos ── */}
      {modules.length > 0 && (
        <>
          <MobileSectionHeader title="Módulos" />
          <div className="mx-4 rounded-2xl border border-border divide-y divide-border bg-card overflow-hidden">
            {modules.map(mod => (
              <MobileListItem
                key={mod.key}
                title={mod.title}
                subtitle={mod.subtitle}
                trailing={
                  mod.badge ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-500 dark:bg-red-500/10">
                      {mod.badge}
                    </span>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                  )
                }
                onClick={() => onNavigate(mod.to)}
              />
            ))}
          </div>
        </>
      )}
    </MobileScreen>
  );
}
