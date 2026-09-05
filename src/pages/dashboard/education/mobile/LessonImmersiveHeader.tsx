import { Bookmark, BookmarkCheck, Type, X } from 'lucide-react';

/**
 * Mobile handoff, screen 4 ("Cabecera compacta") — `close` (not
 * `arrow_back`: "es un modal, no un nivel de jerarquía"), title + step
 * count, text-size + bookmark actions. Used with `<MobileScreen back
 * header={...}>` — the `back` prop is what hides the app's global bottom
 * nav for this immersive screen; this component only replaces the visual
 * chrome (MobileScreen's own header always renders a ChevronLeft, never
 * swappable for `close` without a full override).
 */
export function LessonImmersiveHeader({
  title,
  stepLabel,
  isBookmarked,
  onClose,
  onToggleBookmark,
  onCycleFontSize,
}: {
  title: string;
  stepLabel: string;
  isBookmarked: boolean;
  onClose: () => void;
  onToggleBookmark: () => void;
  onCycleFontSize: () => void;
}) {
  return (
    <header
      className="sticky top-0 z-40 flex-none border-b border-border bg-background"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center gap-3 px-5 py-2">
        <button type="button" onClick={onClose} aria-label="Cerrar" className="shrink-0">
          <X className="h-6 w-6 text-muted-foreground" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{stepLabel}</p>
        </div>
        <button
          type="button"
          onClick={onCycleFontSize}
          aria-label="Tamaño de texto"
          className="shrink-0"
        >
          <Type className="h-[22px] w-[22px] text-muted-foreground" />
        </button>
        <button
          type="button"
          onClick={onToggleBookmark}
          aria-pressed={isBookmarked}
          aria-label={isBookmarked ? 'Quitar de guardados' : 'Guardar lección'}
          className="shrink-0"
        >
          {isBookmarked ? (
            <BookmarkCheck className="h-[22px] w-[22px] text-edu-primary" />
          ) : (
            <Bookmark className="h-[22px] w-[22px] text-muted-foreground" />
          )}
        </button>
      </div>
    </header>
  );
}
