import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { parseGoTime } from '@/lib/go-time';
import type { DiscipleshipReport } from '@/types/discipleship.types';
import { ArrowLeft, Calendar, CheckCircle, Loader2, User, XCircle } from 'lucide-react';
import { useState } from 'react';

// ─── Labels ──────────────────────────────────────────────────────────────────

const REPORT_TYPE_LABELS: Record<string, string> = {
  weekly_leader: 'Reporte Semanal',
  biweekly_auxiliary: 'Reporte Quincenal',
  monthly_general: 'Reporte Mensual',
  quarterly_coordinator: 'Reporte Trimestral',
  annual_pastoral: 'Reporte Anual',
};

/**
 * Labels para campos conocidos de report_data.
 * Campos no mapeados se muestran con su clave original.
 */
const FIELD_LABELS: Record<string, string> = {
  // Asistencia
  attendance: 'Asistencia',
  total_attendance: 'Asistencia total',
  average_attendance: 'Asistencia promedio',
  adult_attendance: 'Adultos',
  youth_attendance: 'Jóvenes',
  children_attendance: 'Niños',
  // Personas
  visitors: 'Visitantes',
  new_members: 'Nuevos miembros',
  conversions: 'Conversiones',
  baptisms: 'Bautismos',
  // Actividades
  prayer_meetings: 'Reuniones de oración',
  bible_studies: 'Estudios bíblicos',
  home_visits: 'Visitas domiciliarias',
  evangelism_outreach: 'Evangelismo',
  cell_meetings: 'Reuniones de célula',
  // Finanzas
  offering: 'Ofrenda',
  tithe: 'Diezmos',
  // Notas
  notes: 'Notas del líder',
  prayer_requests: 'Pedidos de oración',
  challenges: 'Desafíos',
  highlights: 'Destacados',
  testimonies: 'Testimonios',
  next_steps: 'Próximos pasos',
  observations: 'Observaciones',
};

/** Campos que se muestran PRIMERO (métricas clave). */
const PRIORITY_FIELDS = [
  'attendance',
  'total_attendance',
  'visitors',
  'conversions',
  'baptisms',
  'new_members',
  'offering',
  'tithe',
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface ReportDetailSheetProps {
  report: DiscipleshipReport | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (reportId: string) => Promise<void>;
  onReject: (reportId: string, feedback: string) => Promise<void>;
}

type SheetView = 'detail' | 'reject';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(value: unknown, fallback = '—'): string {
  const d = parseGoTime(value);
  if (!d || isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'number') return value.toLocaleString('es-AR');
  if (typeof value === 'string') return value || '—';
  if (Array.isArray(value)) return value.join(', ') || '—';
  return String(value);
}

/** Ordena entradas poniendo los campos prioritarios primero. */
function sortedEntries(data: Record<string, unknown>): [string, unknown][] {
  const entries = Object.entries(data);
  const priority = entries.filter(([k]) => PRIORITY_FIELDS.includes(k));
  const rest = entries.filter(([k]) => !PRIORITY_FIELDS.includes(k));
  return [...priority, ...rest];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ReportDetailSheet({
  report,
  open,
  onOpenChange,
  onApprove,
  onReject,
}: ReportDetailSheetProps) {
  const [view, setView] = useState<SheetView>('detail');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!report) return null;

  const typeLabel = REPORT_TYPE_LABELS[report.report_type] ?? report.report_type;
  const periodStart = formatDate(report.period_start);
  const periodEnd = formatDate(report.period_end);
  const submittedLabel = formatDate(report.submitted_at, 'No enviado');
  const dataEntries = sortedEntries(report.report_data ?? {});

  const handleClose = () => {
    onOpenChange(false);
    // Resetear estado al cerrar
    setTimeout(() => {
      setView('detail');
      setFeedback('');
    }, 300);
  };

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      await onApprove(report.id);
      handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!feedback.trim()) return;
    setSubmitting(true);
    try {
      await onReject(report.id, feedback.trim());
      handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-h-[90vh] overflow-y-auto p-0 focus:outline-none"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* ── Vista: DETALLE ── */}
        {view === 'detail' && (
          <>
            <SheetHeader className="px-5 pt-3 pb-4 border-b text-left">
              <div className="flex items-start gap-3 pr-6">
                <span className="text-2xl mt-0.5 select-none">📊</span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    <Badge variant="secondary" className="text-xs">
                      {typeLabel}
                    </Badge>
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      Pendiente
                    </Badge>
                  </div>
                  <SheetTitle className="text-base leading-snug">
                    {report.reporter_name ?? 'Sin nombre'}
                  </SheetTitle>
                </div>
              </div>
              <SheetDescription className="sr-only">
                Detalle del reporte de {report.reporter_name}
              </SheetDescription>
            </SheetHeader>

            <div className="px-5 py-4 space-y-4">
              {/* Período y fecha */}
              <div className="rounded-xl bg-muted/60 px-4 py-3 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>
                    Período:{' '}
                    <span className="font-medium text-foreground">
                      {periodStart} → {periodEnd}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4 shrink-0" />
                  <span>
                    Enviado:{' '}
                    <span className="font-medium text-foreground">{submittedLabel}</span>
                  </span>
                </div>
              </div>

              {/* Contenido del reporte */}
              {dataEntries.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Contenido del reporte
                  </p>
                  <div className="divide-y rounded-xl border overflow-hidden">
                    {dataEntries.map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-start justify-between gap-3 px-3 py-2.5 bg-background"
                      >
                        <span className="text-sm text-muted-foreground shrink-0">
                          {FIELD_LABELS[key] ?? key}
                        </span>
                        <span className="text-sm font-medium text-right break-words max-w-[55%]">
                          {formatFieldValue(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sin datos de contenido
                </p>
              )}
            </div>

            <SheetFooter className="px-5 pb-8 pt-3 border-t flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                onClick={() => setView('reject')}
                disabled={submitting}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Rechazar
              </Button>
              <Button className="flex-1" onClick={handleApprove} disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Aprobar
              </Button>
            </SheetFooter>
          </>
        )}

        {/* ── Vista: RECHAZO ── */}
        {view === 'reject' && (
          <>
            <SheetHeader className="px-5 pt-3 pb-4 border-b text-left">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setView('detail')}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  aria-label="Volver"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <SheetTitle className="text-base">Rechazar reporte</SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground">
                    {report.reporter_name} · {typeLabel}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="px-5 py-5 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="reject-feedback" className="text-sm font-medium">
                  Motivo del rechazo{' '}
                  <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="reject-feedback"
                  placeholder="Explicá al líder qué debe corregir o completar en el reporte..."
                  rows={5}
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  className="resize-none"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Este mensaje le llegará al líder para que corrija el reporte.
                </p>
              </div>
            </div>

            <SheetFooter className="px-5 pb-8 pt-3 border-t flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setView('detail')}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleReject}
                disabled={!feedback.trim() || submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Enviar rechazo
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
