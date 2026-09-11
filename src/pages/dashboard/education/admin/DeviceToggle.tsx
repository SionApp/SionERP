import { Monitor, Smartphone } from 'lucide-react';

import { cn } from '@/lib/utils';

export type PreviewDevice = 'desktop' | 'mobile';

/**
 * Design (README §8, "Panel derecho — preview en vivo"): container
 * hex F1ECF4 `border-radius:9999px padding:3px` with two pills — `desktop_windows`
 * "Escritorio" / `smartphone` "Móvil". Active pill: white background, dark
 * text. Hex F1ECF4 has no existing `edu-*` token (it's the app's own neutral
 * `--muted`, not a green-family tone) — reused directly rather than adding a
 * 13th token for one exact-match neutral gray.
 */
/**
 * `compact` (mobile handoff, screen 9 "VER COMO" switch): same container,
 * reordered Móvil-first per the doc's own literal listing ("Móvil (smartphone)
 * y Escritorio (desktop_windows)") and smaller scale — icon 15px, text 11px,
 * padding 7px uniform (vs the desktop 16px icon / 12px text / 3.5×7px pad).
 */
export function DeviceToggle({
  device,
  onChange,
  compact = false,
}: {
  device: PreviewDevice;
  onChange: (device: PreviewDevice) => void;
  compact?: boolean;
}) {
  const buttons = compact
    ? ([
        { icon: Smartphone, label: 'Móvil', value: 'mobile' },
        { icon: Monitor, label: 'Escritorio', value: 'desktop' },
      ] as const)
    : ([
        { icon: Monitor, label: 'Escritorio', value: 'desktop' },
        { icon: Smartphone, label: 'Móvil', value: 'mobile' },
      ] as const);

  return (
    <div
      className="flex items-center gap-1 rounded-full bg-muted p-[3px]"
      role="tablist"
      aria-label="Vista previa"
    >
      {buttons.map(b => (
        <ToggleButton
          key={b.value}
          icon={b.icon}
          label={b.label}
          active={device === b.value}
          compact={compact}
          onClick={() => onChange(b.value)}
        />
      ))}
    </div>
  );
}

function ToggleButton({
  icon: Icon,
  label,
  active,
  compact,
  onClick,
}: {
  icon: typeof Monitor;
  label: string;
  active: boolean;
  compact: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-full font-medium',
        compact ? 'px-[7px] py-[7px] text-[11px]' : 'px-3.5 py-[7px] text-xs',
        active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
      )}
    >
      <Icon className={compact ? 'h-[15px] w-[15px]' : 'h-4 w-4'} aria-hidden="true" />
      {label}
    </button>
  );
}
