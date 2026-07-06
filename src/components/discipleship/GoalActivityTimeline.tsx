import { useEffect, useState } from 'react';
import { DiscipleshipAnalyticsService } from '@/services/discipleship-analytics.service';
import { Loader2, Plus, Trash2, TrendingUp, UserPlus, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ActivityEntry {
  id: string;
  action: string;
  table: string;
  meta: string;
  user_name: string;
  created_at: string;
}

interface GoalActivityTimelineProps {
  goalId: string;
}

function parseMeta(meta: string): Record<string, unknown> {
  try { return JSON.parse(meta); } catch { return {}; }
}

function entryLabel(entry: ActivityEntry): string {
  const m = parseMeta(entry.meta);
  switch (entry.table) {
    case 'discipleship_goals':
      if (entry.action === 'INSERT') return `Objetivo creado: "${m.title ?? ''}"`;
      if (entry.action === 'DELETE') return `Objetivo eliminado: "${m.title ?? ''}"`;
      if (entry.action === 'UPDATE') return `Objetivo actualizado`;
      break;
    case 'goal_assignments':
      return `Asignado a usuario${m.target_value ? ` (meta: ${m.target_value})` : ''}`;
    case 'goal_manual_progress':
      return `Progreso reportado: ${m.value_reported ?? 0} unidades`;
  }
  return `${entry.action} en ${entry.table}`;
}

function entryIcon(entry: ActivityEntry) {
  if (entry.action === 'DELETE') return <Trash2 className="h-3 w-3 text-destructive" />;
  if (entry.table === 'goal_assignments') return <UserPlus className="h-3 w-3 text-blue-500" />;
  if (entry.table === 'goal_manual_progress') return <TrendingUp className="h-3 w-3 text-green-500" />;
  if (entry.action === 'INSERT') return <Plus className="h-3 w-3 text-violet-500" />;
  return <Clock className="h-3 w-3 text-muted-foreground" />;
}

export function GoalActivityTimeline({ goalId }: GoalActivityTimelineProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    DiscipleshipAnalyticsService.getGoalActivity(goalId)
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [goalId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Cargando actividad...
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2">Sin actividad registrada aún.</p>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((e) => (
        <div key={e.id} className="flex items-start gap-2">
          <div className="mt-0.5 p-1 rounded-full bg-muted flex-shrink-0">
            {entryIcon(e)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium leading-tight">{entryLabel(e)}</p>
            <p className="text-[11px] text-muted-foreground">
              {e.user_name} ·{' '}
              {formatDistanceToNow(new Date(e.created_at), { addSuffix: true, locale: es })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
