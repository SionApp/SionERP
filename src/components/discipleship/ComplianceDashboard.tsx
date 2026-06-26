/**
 * ComplianceDashboard — panel "quién falló qué semana" para supervisores.
 *
 * Lista cada subordinado con sus últimas semanas ISO como chips de color
 * (verde a tiempo, amarillo tarde, rojo falta, gris pendiente) y un badge
 * con el conteo de faltas. Resalta a los que tienen 3+ faltas.
 * Responsive: en mobile cada persona es una fila apilada.
 */
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, MinusCircle, XCircle } from 'lucide-react';
import { DiscipleshipService, type ComplianceRow } from '@/services/discipleship.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type Status = ComplianceRow['status'];

const STATUS_META: Record<Status, { label: string; dot: string; Icon: typeof CheckCircle }> = {
  on_time: { label: 'A tiempo', dot: 'bg-emerald-500', Icon: CheckCircle },
  late: { label: 'Tarde', dot: 'bg-amber-500', Icon: Clock },
  missed: { label: 'Falta', dot: 'bg-red-500', Icon: XCircle },
  pending: { label: 'Pendiente', dot: 'bg-slate-300', Icon: MinusCircle },
};

interface PersonCompliance {
  userId: string;
  userName: string;
  missedCount: number;
  weeks: { isoWeek: string; status: Status }[];
}

export function ComplianceDashboard({ weeks = 8 }: { weeks?: number }) {
  const [rows, setRows] = useState<ComplianceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    DiscipleshipService.getSubordinatesCompliance(weeks)
      .then(data => {
        if (!cancelled) setRows(data || []);
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo cargar el cumplimiento');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [weeks]);

  // Agrupar filas por persona + ordenar semanas (más reciente a la derecha)
  const people = useMemo<PersonCompliance[]>(() => {
    const byUser = new Map<string, PersonCompliance>();
    for (const r of rows) {
      let p = byUser.get(r.user_id);
      if (!p) {
        p = { userId: r.user_id, userName: r.user_name || 'Sin nombre', missedCount: 0, weeks: [] };
        byUser.set(r.user_id, p);
      }
      p.weeks.push({ isoWeek: r.iso_week, status: r.status });
      p.missedCount = Math.max(p.missedCount, r.missed_count);
    }
    for (const p of byUser.values()) {
      p.weeks.sort((a, b) => a.isoWeek.localeCompare(b.isoWeek));
    }
    // Los de más faltas primero
    return [...byUser.values()].sort((a, b) => b.missedCount - a.missedCount);
  }, [rows]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cumplimiento de Reportes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">{error}</CardContent>
      </Card>
    );
  }

  if (people.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
          <CheckCircle className="h-8 w-8 opacity-40" />
          <p className="text-sm">No hay subordinados con seguimiento aún.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cumplimiento de Reportes</CardTitle>
        <CardDescription>Últimas {weeks} semanas. 3+ faltas escalan una alerta.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Leyenda */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {(Object.keys(STATUS_META) as Status[]).map(s => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${STATUS_META[s].dot}`} />
              {STATUS_META[s].label}
            </span>
          ))}
        </div>

        {/* Lista de personas */}
        <div className="divide-y divide-border rounded-lg border border-border">
          {people.map(p => {
            const flagged = p.missedCount >= 3;
            return (
              <div
                key={p.userId}
                className={`flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between ${
                  flagged ? 'bg-red-50/60 dark:bg-red-950/20' : ''
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {flagged && <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />}
                  <span className="truncate text-sm font-medium">{p.userName}</span>
                  {p.missedCount > 0 && (
                    <Badge variant={flagged ? 'destructive' : 'secondary'} className="shrink-0">
                      {p.missedCount} {p.missedCount === 1 ? 'falta' : 'faltas'}
                    </Badge>
                  )}
                </div>
                {/* Chips de semanas */}
                <div className="flex flex-wrap gap-1.5">
                  {p.weeks.map(w => {
                    const meta = STATUS_META[w.status];
                    return (
                      <span
                        key={w.isoWeek}
                        title={`${w.isoWeek} — ${meta.label}`}
                        className={`inline-flex h-6 items-center rounded-md px-1.5 text-[10px] font-semibold text-white ${meta.dot}`}
                      >
                        {w.isoWeek.split('-W')[1]}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
