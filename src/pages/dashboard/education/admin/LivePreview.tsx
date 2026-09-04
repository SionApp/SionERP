import { Eye } from 'lucide-react';

import { cn } from '@/lib/utils';
// `../blocks/BlockRenderer` — the SAME dispatcher `student/LessonViewer.tsx`
// imports (size="full"). Tasks-v2-part2 I.5: "imports blocks/* from PR-E —
// zero copy, `size` prop only" — preview-fidelity-by-construction. Do NOT
// add a second switch/copy of BlockRenderer's per-type dispatch here; I.7's
// own test asserts this import path.
import { BlockRenderer } from '../blocks/BlockRenderer';
import { DeviceToggle } from './DeviceToggle';
import type { PreviewDevice } from './DeviceToggle';
import type { EducationBlock, EducationStep } from '@/types/education.types';

/**
 * Design (README §8, "Panel derecho — preview en vivo"): sticky card
 * hex F7F2FA/hex E7E0EC, header with device toggle, scenario frame that
 * changes shape per device (radius/border/padding/notch — the table under
 * "Escenario"). Content itself never differs by device beyond what
 * `BlockRenderer`'s own `size` prop already encodes (`preview-desktop` /
 * `preview-mobile` both currently render "compact" — same simplification
 * PR-E's block components already made; a per-device typography split
 * inside each block type is out of this PR's scope, not silently dropped).
 */
export function LivePreview({
  lessonTitle,
  moduleLabel,
  step,
  stepIndex,
  stepCount,
  lessonId,
  device,
  onDeviceChange,
}: {
  lessonTitle: string;
  moduleLabel: string | null;
  step: EducationStep | null;
  stepIndex: number;
  stepCount: number;
  lessonId: string;
  device: PreviewDevice;
  onDeviceChange: (device: PreviewDevice) => void;
}) {
  const progressPercent = stepCount > 0 ? ((stepIndex + 1) / stepCount) * 100 : 0;
  const size = device === 'desktop' ? 'preview-desktop' : 'preview-mobile';

  return (
    <div className="sticky top-4 flex flex-col overflow-hidden rounded-md3-xl border border-border bg-edu-surface">
      <div className="flex items-center justify-between gap-2 bg-card px-4 py-3">
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-foreground">
          <Eye className="h-[18px] w-[18px] text-edu-primary" aria-hidden="true" />
          Preview en vivo
        </span>
        <DeviceToggle device={device} onChange={onDeviceChange} />
      </div>

      <div className="flex max-h-[772px] justify-center overflow-y-auto bg-edu-surface-alt/40 p-5">
        <div
          className={cn(
            'overflow-hidden bg-card',
            device === 'desktop'
              ? 'w-full rounded-md3-xl border border-border'
              : 'w-[340px] rounded-[28px] border-[8px] border-edu-on-light-chip'
          )}
        >
          {device === 'mobile' && (
            <div className="flex h-[26px] items-center justify-center bg-edu-on-light-chip">
              <span className="h-[5px] w-16 rounded-full bg-white/40" />
            </div>
          )}
          <div className={device === 'desktop' ? 'px-8 py-7' : 'px-[18px] py-[18px]'}>
            <span className="text-[11px] font-normal uppercase tracking-[0.07em] text-edu-text">
              {lessonTitle ? `${moduleLabel ? `${moduleLabel} · ` : ''}${lessonTitle}` : 'Lección'}
            </span>
            <h3
              className={cn(
                'mt-1 font-normal text-foreground',
                device === 'desktop' ? 'text-2xl' : 'text-xl'
              )}
            >
              {step?.label ?? 'Sin pasos todavía'}
            </h3>

            {stepCount > 0 && (
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-edu-track">
                <div
                  className="h-full rounded-full bg-edu-primary transition-[width]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}

            <div className={cn('mt-4', device === 'mobile' && 'text-[13px]')}>
              {step && step.blocks.length > 0 ? (
                step.blocks.map((block: EducationBlock) => (
                  <BlockRenderer key={block.id} block={block} size={size} lessonId={lessonId} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Este paso todavía no tiene bloques. Usá la barra "Insertar" para empezar.
                </p>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-xs font-medium">
              <span className="text-muted-foreground/50">Anterior</span>
              <span className="rounded-full bg-edu-primary px-3.5 py-2 text-white">Siguiente</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
