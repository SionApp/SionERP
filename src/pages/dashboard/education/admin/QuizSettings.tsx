import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';

export interface QuizSettingsValue {
  passScore: number;
  /** `null` = "sin límite" — same nullable-numeric-field convention as
   * `CourseFormDialog`'s `hours` (string in local state, empty = clear). */
  timeLimitMinutes: number | null;
  shuffleOptions: boolean;
  allowRetry: boolean;
  showResult: boolean;
}

function SettingsRow({
  label,
  description,
  control,
}: {
  label: string;
  description: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 px-5 py-4 last:border-b-0">
      <div className="min-w-0">
        <p className="text-[13px] font-normal text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

/**
 * "Ajustes del quiz" card (README §9, tasks-v2-part2 J.1) — 5 controls: 3
 * MD3 switches (`show_result`/`shuffle_options`/`allow_retry`) + 2 numeric
 * pills (`pass_score` 0-100, `time_limit_minutes` nullable). Validation
 * mirrors `UpsertQuiz`'s own checks (`education_quiz_admin.go`) — pass_score
 * clamped 0-100, time limit rejects <= 0 (empty = "sin límite", never 0).
 */
export function QuizSettings({
  value,
  onChange,
  canEdit,
}: {
  value: QuizSettingsValue;
  onChange: (next: QuizSettingsValue) => void;
  canEdit: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-md3-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-3.5">
        <p className="text-sm font-medium text-foreground">Ajustes del quiz</p>
      </div>

      <SettingsRow
        label="Mostrar resultado al terminar"
        description="El alumno ve su puntaje al enviar"
        control={
          <Switch
            checked={value.showResult}
            disabled={!canEdit}
            onCheckedChange={checked => onChange({ ...value, showResult: checked })}
            aria-label="Mostrar resultado al terminar"
          />
        }
      />
      <SettingsRow
        label="Orden aleatorio de opciones"
        description="Evita que se copien entre alumnos"
        control={
          <Switch
            checked={value.shuffleOptions}
            disabled={!canEdit}
            onCheckedChange={checked => onChange({ ...value, shuffleOptions: checked })}
            aria-label="Orden aleatorio de opciones"
          />
        }
      />
      <SettingsRow
        label="Permitir reintentos"
        description="Un intento extra si no aprueba"
        control={
          <Switch
            checked={value.allowRetry}
            disabled={!canEdit}
            onCheckedChange={checked => onChange({ ...value, allowRetry: checked })}
            aria-label="Permitir reintentos"
          />
        }
      />
      <SettingsRow
        label="Puntaje mínimo"
        description="Para desbloquear la siguiente lección"
        control={
          <div className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5">
            <Input
              type="number"
              min={0}
              max={100}
              value={value.passScore}
              disabled={!canEdit}
              onChange={e => {
                const n = Number(e.target.value);
                if (Number.isNaN(n)) return;
                onChange({ ...value, passScore: Math.min(100, Math.max(0, n)) });
              }}
              className="h-6 w-12 border-0 p-0 text-right text-sm shadow-none focus-visible:ring-0"
              aria-label="Puntaje mínimo"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        }
      />
      <SettingsRow
        label="Tiempo límite"
        description="En blanco = sin límite"
        control={
          <div className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5">
            <Input
              type="number"
              min={1}
              placeholder="Sin límite"
              value={value.timeLimitMinutes ?? ''}
              disabled={!canEdit}
              onChange={e => {
                const raw = e.target.value;
                if (raw.trim() === '') {
                  onChange({ ...value, timeLimitMinutes: null });
                  return;
                }
                const n = Number(raw);
                if (Number.isNaN(n) || n <= 0) return;
                onChange({ ...value, timeLimitMinutes: n });
              }}
              className="h-6 w-14 border-0 p-0 text-right text-sm shadow-none focus-visible:ring-0"
              aria-label="Tiempo límite en minutos"
            />
            <span className="text-sm text-muted-foreground">min</span>
          </div>
        }
      />
    </div>
  );
}
