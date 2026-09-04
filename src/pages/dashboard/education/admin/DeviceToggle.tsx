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
export function DeviceToggle({
  device,
  onChange,
}: {
  device: PreviewDevice;
  onChange: (device: PreviewDevice) => void;
}) {
  return (
    <div
      className="flex items-center gap-1 rounded-full bg-muted p-[3px]"
      role="tablist"
      aria-label="Vista previa"
    >
      <ToggleButton
        icon={Monitor}
        label="Escritorio"
        active={device === 'desktop'}
        onClick={() => onChange('desktop')}
      />
      <ToggleButton
        icon={Smartphone}
        label="Móvil"
        active={device === 'mobile'}
        onClick={() => onChange('mobile')}
      />
    </div>
  );
}

function ToggleButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Monitor;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-full px-3.5 py-[7px] text-xs font-medium',
        active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}
