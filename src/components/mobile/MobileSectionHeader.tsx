import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface MobileSectionHeaderProps {
  title: string;
  /** Acción custom a la derecha (reemplaza "Ver todo" si se pasa) */
  action?: ReactNode;
  /** Ruta opcional para link "Ver todo" (como daas SectionHeader) */
  to?: string;
  /** Texto del link (default: "Ver todo") */
  actionLabel?: string;
  className?: string;
}

/**
 * MobileSectionHeader — label de sección con link opcional "Ver todo".
 * Sigue el mismo patrón que daas SectionHeader: título en bold + link a la derecha.
 */
export function MobileSectionHeader({
  title,
  action,
  to,
  actionLabel,
  className,
}: MobileSectionHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className={cn('flex items-center justify-between px-4 pb-2 pt-5', className)}>
      <h2 className="text-base font-bold tracking-tight text-foreground">{title}</h2>
      {action ??
        (to && (
          <button
            type="button"
            onClick={() => navigate(to)}
            className="flex items-center gap-0.5 text-xs font-semibold text-primary cursor-pointer"
          >
            {actionLabel ?? 'Ver todo'}
            <ChevronRight className="size-3.5" />
          </button>
        ))}
    </div>
  );
}
