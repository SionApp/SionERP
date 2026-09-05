import { Timer, X } from 'lucide-react';

/**
 * Mobile handoff, screen 5 ("Quiz") — same compact immersive chrome as the
 * lesson viewer: `close`, title + "Pregunta N de M" subtitle, and (only
 * when the quiz has a time limit) a timer pill — "En móvil el temporizador
 * pierde la palabra 'restantes'".
 */
export function QuizImmersiveHeader({
  title,
  questionLabel,
  countdown,
  onClose,
}: {
  title: string;
  questionLabel: string;
  countdown: string | null;
  onClose: () => void;
}) {
  return (
    <header
      className="sticky top-0 z-40 flex-none border-b border-border bg-background"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Same asymmetric padding as LessonImmersiveHeader (doc: "misma
          estructura de cabecera compacta que la lección"). */}
      <div className="flex items-center gap-3 px-5 pb-3 pt-0.5">
        <button type="button" onClick={onClose} aria-label="Cerrar" className="shrink-0">
          <X className="h-6 w-6 text-muted-foreground" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{questionLabel}</p>
        </div>
        {countdown && (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-container px-3 py-1.5 text-xs font-medium text-foreground">
            <Timer className="h-4 w-4" aria-hidden="true" />
            {countdown}
          </span>
        )}
      </div>
    </header>
  );
}
