import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { RecentActivity } from '@/services/dashboard.service';
import { Activity, AlertTriangle, ChevronRight, Network, UserPlus, Users } from 'lucide-react';
import { MobileListItem } from '../MobileListItem';
import { MobileNotificationsBell } from '../MobileNotificationsBell';
import { MobileScreen } from '../MobileScreen';
import { MobileSectionHeader } from '../MobileSectionHeader';
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

function greetingForNow(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

// ── Tarjeta de stat (flota sobre el hero) ──
const toneIcon: Record<string, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  danger: 'bg-red-500/10 text-red-500',
  default: 'bg-muted text-muted-foreground',
};

function HeroStatCard({
  label,
  value,
  icon,
  tone,
  loading,
  onClick,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  tone: keyof typeof toneIcon;
  loading: boolean;
  onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={cn(
        'flex flex-col gap-2 rounded-2xl border border-border/60 bg-card p-3.5 text-left shadow-sm',
        onClick && 'cursor-pointer transition-transform active:scale-[0.98]'
      )}
    >
      <div className={cn('flex size-9 items-center justify-center rounded-xl', toneIcon[tone])}>
        {icon}
      </div>
      {loading ? (
        <Skeleton className="h-7 w-10" />
      ) : (
        <p className="text-2xl font-bold leading-none tabular-nums">{value}</p>
      )}
      <p className="text-xs text-muted-foreground leading-tight">{label}</p>
    </Tag>
  );
}

/**
 * Pantalla mobile del dashboard (presentacional — DashboardHome es el container).
 * Hero de bienvenida con gradiente de marca + tarjetas de stats flotando,
 * acciones rápidas, actividad y módulos.
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
    <MobileScreen header={<></>}>
      {/* ── Hero de bienvenida ── */}
      <div
        className="relative overflow-hidden bg-gradient-to-br from-primary via-blue-700 to-indigo-800 px-4 pb-16 text-white"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.25rem)' }}
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-white/5 blur-3xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg font-bold text-white ring-1 ring-white/25">
              {firstName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-white/70 leading-tight">{greetingForNow()},</p>
              <h1 className="truncate text-xl font-bold leading-tight">{firstName}</h1>
              {roleLabel && (
                <span className="mt-1 inline-flex items-center rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium text-white/90">
                  {roleLabel}
                </span>
              )}
            </div>
          </div>
          <MobileNotificationsBell className="text-white hover:bg-white/15 hover:text-white" />
        </div>
      </div>

      {/* ── Stats: tarjetas flotando sobre el hero ── */}
      <div className="relative z-10 -mt-12 grid grid-cols-2 gap-3 px-4">
        <HeroStatCard
          label="Miembros"
          value={stats.totalUsers}
          icon={<Users className="size-4" />}
          tone="primary"
          loading={loading}
        />
        <HeroStatCard
          label="Grupos"
          value={stats.totalGroups}
          icon={<Network className="size-4" />}
          tone="success"
          loading={loading}
        />
        <HeroStatCard
          label="Nuevos (30d)"
          value={stats.newRegistrations}
          icon={<UserPlus className="size-4" />}
          tone="default"
          loading={loading}
        />
        <HeroStatCard
          label="Alertas"
          value={stats.alertsCount}
          icon={<AlertTriangle className="size-4" />}
          tone={stats.alertsCount > 0 ? 'danger' : 'default'}
          loading={loading}
        />
      </div>

      {/* ── Acciones rápidas: iconos redondos ── */}
      {actions.length > 0 && (
        <div className="grid grid-cols-4 gap-2 px-4 pt-6">
          {actions.map(action => (
            <button
              key={action.to}
              onClick={() => onNavigate(action.to)}
              className="group flex cursor-pointer flex-col items-center gap-1.5"
            >
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-sm transition-transform group-active:scale-95',
                  action.color
                )}
              >
                {action.icon}
              </div>
              <span className="text-center text-[11px] leading-tight text-muted-foreground">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Actividad reciente (4 items) ── */}
      <MobileSectionHeader title="Actividad reciente" />
      {loading ? (
        <div className="space-y-2 px-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : activity.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
          <Activity className="h-7 w-7 opacity-20" />
          <p className="text-xs">Sin actividad reciente</p>
        </div>
      ) : (
        <div className="mx-4 overflow-hidden rounded-2xl border border-border divide-y divide-border bg-card">
          {activity.slice(0, 4).map((item, i) => (
            <MobileListItem
              key={item.id ?? i}
              leading={<div className={cn('h-2 w-2 rounded-full', activityDot(item.type))} />}
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
          <div className="mx-4 overflow-hidden rounded-2xl border border-border divide-y divide-border bg-card">
            {modules.map(mod => (
              <MobileListItem
                key={mod.key}
                title={mod.title}
                subtitle={mod.subtitle}
                trailing={
                  mod.badge ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-500 dark:bg-red-500/10">
                      {mod.badge}
                    </span>
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
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
