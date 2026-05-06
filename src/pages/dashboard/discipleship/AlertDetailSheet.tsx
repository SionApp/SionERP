import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { extractString, formatRelativeDate } from '@/lib/go-time';
import type { DiscipleshipAlert } from '@/types/discipleship.types';
import { Calendar, CheckCircle, ExternalLink, MapPin, Users, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ─── Metadata ───────────────────────────────────────────────────────────────

const ALERT_TYPE_LABELS: Record<string, string> = {
  no_reports: 'Sin Reportes',
  low_attendance: 'Asistencia Baja',
  spiritual_decline: 'Declive Espiritual',
  no_growth: 'Sin Crecimiento',
  consistency_milestone: 'Hito de Consistencia',
  evangelism_champion: 'Campeón de Evangelismo',
  solid_group: 'Grupo Sólido',
  multiplication_ready: 'Listo para Multiplicar',
  needs_attention: 'Requiere Atención',
  custom: 'Personalizada',
};

const ALERT_TYPE_ICONS: Record<string, string> = {
  no_reports: '📋',
  low_attendance: '📉',
  spiritual_decline: '⬇️',
  no_growth: '🔄',
  consistency_milestone: '🏆',
  evangelism_champion: '⭐',
  solid_group: '💪',
  multiplication_ready: '🔥',
  needs_attention: '⚠️',
  custom: '📌',
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface AlertDetailSheetProps {
  alert: DiscipleshipAlert | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolve: (alertId: string) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AlertDetailSheet({ alert, open, onOpenChange, onResolve }: AlertDetailSheetProps) {
  const navigate = useNavigate();

  if (!alert) return null;

  const isCelebration = alert.priority >= 5;
  const priorityLabel = isCelebration
    ? 'Celebración'
    : alert.priority >= 3
      ? 'Alta'
      : alert.priority === 2
        ? 'Media'
        : 'Baja';
  const priorityVariant = isCelebration
    ? 'outline'
    : alert.priority >= 3
      ? 'destructive'
      : alert.priority === 2
        ? 'default'
        : 'secondary';

  const typeLabel = ALERT_TYPE_LABELS[alert.alert_type] ?? alert.alert_type;
  const typeIcon = ALERT_TYPE_ICONS[alert.alert_type] ?? '⚠️';

  const groupName = extractString(alert.group_name ?? null);
  const zoneName = extractString(alert.zone_name);
  const createdLabel = formatRelativeDate(alert.created_at);

  const handleResolve = () => {
    onResolve(alert.id);
    onOpenChange(false);
  };

  const handleGoToGroup = () => {
    navigate(`/dashboard/discipleship?group=${alert.related_group_id}`);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-h-[85vh] overflow-y-auto p-0 focus:outline-none"
      >
        {/* Drag handle visual */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <SheetHeader className="px-5 pt-3 pb-4 border-b text-left">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5 select-none">{typeIcon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <Badge variant={priorityVariant} className="text-xs">
                  Prioridad {priorityLabel}
                </Badge>
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  {typeLabel}
                </Badge>
              </div>
              <SheetTitle className="text-base leading-snug pr-6">{alert.title}</SheetTitle>
            </div>
          </div>
          {/* SheetDescription necesario para accesibilidad */}
          <SheetDescription className="sr-only">
            Detalle de la alerta: {alert.title}
          </SheetDescription>
        </SheetHeader>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Mensaje completo */}
          <p className="text-sm text-foreground/90 leading-relaxed">{alert.message}</p>

          {/* Metadata card */}
          <div className="rounded-xl bg-muted/60 px-4 py-3 space-y-2.5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>{createdLabel}</span>
            </div>

            {groupName && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4 shrink-0" />
                <span>
                  Grupo:{' '}
                  <span className="font-medium text-foreground">{groupName}</span>
                </span>
              </div>
            )}

            {zoneName && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>
                  Zona:{' '}
                  <span className="font-medium text-foreground">{zoneName}</span>
                </span>
              </div>
            )}

            {alert.action_required && (
              <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400 font-medium">
                <Zap className="h-4 w-4 shrink-0" />
                <span>Requiere acción pastoral</span>
              </div>
            )}
          </div>

          {/* Acción contextual — solo si hay grupo relacionado */}
          {alert.related_group_id && (
            <Button variant="outline" className="w-full" onClick={handleGoToGroup}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver grupo afectado
            </Button>
          )}
        </div>

        {/* Footer */}
        <SheetFooter className="px-5 pb-8 pt-3 border-t flex-row gap-3">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button className="flex-1" onClick={handleResolve}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Resolver
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
