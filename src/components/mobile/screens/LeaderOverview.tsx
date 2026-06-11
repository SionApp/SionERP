import { Skeleton } from '@/components/ui/skeleton';
import { DiscipleshipService } from '@/services/discipleship.service';
import type { DiscipleshipGroup } from '@/types/discipleship.types';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Activity, BarChart3, ChevronRight, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MobileListItem } from '../MobileListItem';
import { MobileSectionHeader } from '../MobileSectionHeader';
import { MobileStatTile } from '../MobileStatTile';

interface MobileLeaderOverviewProps {
  onGoToDashboard: () => void;
}

const reportStatusLabel: Record<string, string> = {
  submitted: 'Enviado',
  approved: 'Aprobado',
  draft: 'Borrador',
  revision_required: 'Requiere revisión',
};

/**
 * MobileLeaderOverview — resumen mobile para líderes (nivel 1).
 * Mismo lenguaje que el Dashboard de Inicio: stat chips, acción como fila, listas full-width.
 */
export function MobileLeaderOverview({ onGoToDashboard }: MobileLeaderOverviewProps) {
  const { user } = useAuth();
  const [group, setGroup] = useState<DiscipleshipGroup | null>(null);
  const [lastReport, setLastReport] = useState<{ status: string } | null>(null);
  const [memberCount, setMemberCount] = useState<{ total: number; active: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      try {
        setLoading(true);
        const [groupsRes, reportsRes] = await Promise.allSettled([
          DiscipleshipService.getGroups({ leader_id: user.id, limit: 1 }),
          DiscipleshipService.getReports({ reporter_id: user.id, limit: 1 }),
        ]);

        if (groupsRes.status === 'fulfilled') {
          const list = Array.isArray(groupsRes.value)
            ? groupsRes.value
            : (groupsRes.value?.data ?? []);
          const g = list[0] ?? null;
          setGroup(g);
          if (g) {
            setMemberCount({ total: g.member_count || 0, active: g.active_members || 0 });
          }
        }
        if (reportsRes.status === 'fulfilled') {
          const list = Array.isArray(reportsRes.value)
            ? reportsRes.value
            : (reportsRes.value ?? []);
          setLastReport(list[0] ?? null);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  // ── No hay grupo asignado ──
  if (!loading && !group) {
    return (
      <div className="flex flex-col items-center py-12 gap-3 text-muted-foreground px-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Users className="w-7 h-7 text-muted-foreground/50" />
        </div>
        <h3 className="text-base font-semibold text-foreground">Sin célula asignada</h3>
        <p className="text-sm text-center max-w-xs">
          No tienes una célula asignada aún. Contacta a tu supervisor para que te asigne un grupo.
        </p>
      </div>
    );
  }

  const reportText = lastReport
    ? (reportStatusLabel[lastReport.status] ?? lastReport.status)
    : 'Sin reporte';

  return (
    <div className="pb-4">
      {/* ── Stats de la célula: chips horizontales ── */}
      <div className="flex gap-2 px-4 pt-4 overflow-x-auto snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <MobileStatTile label="Miembros" value={memberCount?.total ?? 0} loading={loading} />
        <MobileStatTile
          label="Activos"
          value={memberCount?.active ?? 0}
          tone="success"
          loading={loading}
        />
        <MobileStatTile label="Día" value={group?.meeting_day || '—'} loading={loading} />
        <MobileStatTile label="Último reporte" value={reportText} loading={loading} />
      </div>

      {/* ── Acción: ver mi célula ── */}
      <div className="px-4 pt-5">
        <MobileSectionHeader title="Mi célula" className="px-0 pt-0" />
        <div className="mx-4 rounded-2xl border border-border divide-y divide-border bg-card overflow-hidden">
          <MobileListItem
            leading={
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white shadow-sm shrink-0">
                <BarChart3 className="w-4 h-4" />
              </div>
            }
            title={group?.name || 'Mi célula'}
            subtitle="Estadísticas detalladas"
            trailing={<ChevronRight className="w-4 h-4 text-muted-foreground/50" />}
            onClick={onGoToDashboard}
          />
        </div>
      </div>

      {/* ── Actividad ── */}
      <MobileSectionHeader title="Actividad reciente" />
      {loading ? (
        <div className="px-4 space-y-2">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-8 gap-2 text-muted-foreground">
          <Activity className="h-7 w-7 opacity-20" />
          <p className="text-xs">Actividad de tu célula aparecerá aquí</p>
        </div>
      )}
    </div>
  );
}
