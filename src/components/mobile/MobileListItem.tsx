import { ChevronRight } from 'lucide-react';
import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface MobileListItemProps {
  /** Icono o avatar a la izquierda */
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  /** Contenido a la derecha (badge, valor). Si hay onClick y no hay trailing, muestra chevron. */
  trailing?: ReactNode;
  onClick?: () => void;
  /** Navegación (usa react-router internamente) */
  to?: string;
  /** Barra de severidad a la izquierda: primary, success, warning, danger */
  accent?: 'none' | 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

const accentBar: Record<string, string> = {
  none: '',
  primary: 'bg-primary',
  success: 'bg-emerald-500',
  warning: 'bg-orange-400',
  danger: 'bg-red-500',
};

/**
 * Fila de lista mobile (equivalente a MobileListItem de daas).
 * Usar dentro de un contenedor inset:
 * `mx-4 rounded-2xl border border-border divide-y divide-border bg-card overflow-hidden`.
 *
 * accent="danger" → barra roja a la izquierda (severidad).
 */
export function MobileListItem({
  leading,
  title,
  subtitle,
  trailing,
  onClick,
  to,
  accent = 'none',
  className,
}: MobileListItemProps) {
  const navigate = useNavigate();

  const handleClick = onClick ?? (to ? () => navigate(to) : undefined);
  const interactive = handleClick !== undefined;
  const Tag = interactive ? 'button' : 'div';

  return (
    <Tag
      onClick={handleClick}
      className={cn(
        'w-full flex items-stretch gap-0 min-h-[56px] text-left bg-card',
        interactive && 'cursor-pointer active:bg-accent/60 transition-colors',
        className
      )}
    >
      {/* Accent severity bar */}
      {accent !== 'none' && (
        <div className={cn('my-2 w-1 shrink-0 rounded-r', accentBar[accent])} />
      )}

      <div className="flex flex-1 items-center gap-3 px-4 py-3 min-w-0">
        {leading && <div className="shrink-0">{leading}</div>}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight truncate">{title}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground leading-snug truncate">{subtitle}</p>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-1.5">
          {trailing}
          {interactive && !trailing && (
            <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
          )}
        </div>
      </div>
    </Tag>
  );
}
