import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface MobileStatTileProps {
  label: string;
  value: string | number;
  /** Muestra skeleton mientras carga */
  loading?: boolean;
  /** Atajo visual: borde rojo + valor rojo (equivale a tone="danger") */
  alert?: boolean;
  /** Icono opcional arriba del valor */
  icon?: ReactNode;
  /** Navegación opcional */
  onClick?: () => void;
  /** Color tone del tile (default: basado en alert) */
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  /** Texto secundario debajo del label */
  sub?: string;
}

const toneBorder: Record<string, string> = {
  default: 'border-border',
  primary: 'border-primary/30',
  success: 'border-emerald-500/40',
  warning: 'border-orange-400/40',
  danger: 'border-red-500/40',
};

const toneValue: Record<string, string> = {
  default: 'text-foreground',
  primary: 'text-primary',
  success: 'text-emerald-600',
  warning: 'text-orange-500',
  danger: 'text-red-500',
};

const toneIconBg: Record<string, string> = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-emerald-50 text-emerald-600',
  warning: 'bg-orange-50 text-orange-500',
  danger: 'bg-red-50 text-red-500',
};

/**
 * MobileStatTile — tarjeta compacta de métrica (KPI) para dashboards mobile.
 *
 * Uso básico (tipo chip):
 *   <MobileStatTile label="Grupos" value={12} />
 *
 * Con icono y navegación (tipo daas StatTile):
 *   <MobileStatTile label="Ingresos" value="$1,234" icon={<DollarSign />} tone="primary" />
 */
export function MobileStatTile({
  label,
  value,
  loading = false,
  alert,
  icon,
  onClick,
  tone: explicitTone,
  sub,
}: MobileStatTileProps) {
  const tone = explicitTone ?? (alert ? 'danger' : 'default');
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      onClick={onClick}
      className={cn(
        'snap-start shrink-0 min-w-[96px] rounded-2xl border bg-card px-4 py-3',
        toneBorder[tone],
        onClick && 'cursor-pointer active:scale-[0.97] transition-transform'
      )}
    >
      {/* Icon bubble opcional */}
      {icon && (
        <div
          className={cn(
            'flex size-8 items-center justify-center rounded-xl mb-2',
            toneIconBg[tone]
          )}
        >
          {icon}
        </div>
      )}

      {/* Valor con skeleton */}
      {loading ? (
        <Skeleton className="h-6 w-10 mb-1" />
      ) : (
        <p className={cn('text-xl font-bold leading-none tabular-nums', toneValue[tone])}>
          {value}
        </p>
      )}

      {/* Label */}
      <p className="text-[11px] text-muted-foreground mt-1.5 whitespace-nowrap leading-tight">
        {label}
      </p>

      {/* Sub opcional */}
      {sub && <p className="text-[11px] text-muted-foreground/70 mt-0.5 leading-tight">{sub}</p>}
    </Tag>
  );
}
