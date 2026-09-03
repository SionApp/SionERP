import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Brain, HelpCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { EducationService } from '@/services/education.service';
import type { BlockSize, EducationQuestionBlock } from './block.types';

/**
 * Design (README §4, "Pregunta de reflexión"): white background, border 2px
 * hex CFEEDC (`edu-container`), `border-radius:22px` (`md3-lg`),
 * `padding:24px 26px`. Label `psychology_alt` + "PARA REFLEXIONAR" 12px 500
 * `edu-text` `letter-spacing:.07em`; enunciado 18px/1.5 500; field
 * hex FAFAFB / hex E7E0EC — the app's existing `bg-muted`/`border-border`
 * pair, reused rather than inventing new `edu-*` tokens for a near-exact
 * match (education-theming: no raw hex outside the theme file). Copy is
 * "instructores del curso" per education-copy-and-omissions — never the
 * discipleship-leader term (Education has no dependency on Discipulado).
 *
 * Orphaned reflection (spec: "the author deletes the question block after
 * a student answered ... renders as 'pregunta eliminada', never crashes"):
 * `block.types.ts`'s `narrowEducationBlock` deliberately accepts a blank
 * `prompt` for this exact case (a stale/version-skewed read of a
 * defensive-fallback shape) — this component is the consumer of that
 * leniency, degrading to a static notice instead of rendering the
 * interactive form against an empty question.
 */
export function ReflectionBlock({
  block,
  size,
  lessonId,
}: {
  block: EducationQuestionBlock;
  size: BlockSize;
  lessonId: string;
}) {
  const compact = size !== 'full';
  const qc = useQueryClient();
  const [draft, setDraft] = useState('');

  const isOrphaned = block.data.prompt.trim() === '';

  const { data: saved } = useQuery({
    queryKey: ['education-reflection', lessonId, block.id],
    queryFn: () => EducationService.getReflection(lessonId, block.id),
    enabled: !isOrphaned,
  });

  useEffect(() => {
    if (saved !== undefined && saved !== null) setDraft(saved);
  }, [saved]);

  const mutation = useMutation({
    mutationFn: (answer: string) => EducationService.upsertReflection(lessonId, block.id, answer),
    onSuccess: () => {
      toast.success('Respuesta guardada');
      qc.invalidateQueries({ queryKey: ['education-reflection', lessonId, block.id] });
    },
    onError: () => toast.error('No se pudo guardar tu respuesta'),
  });

  if (isOrphaned) {
    return (
      <div
        className={cn(
          'flex items-center gap-2.5 rounded-md3-lg border-2 border-dashed border-edu-outline bg-edu-surface-alt text-muted-foreground',
          compact ? 'mt-4 px-4 py-3.5 text-xs' : 'mt-6 px-[26px] py-5 text-sm'
        )}
      >
        <HelpCircle
          className={compact ? 'h-4 w-4 shrink-0' : 'h-5 w-5 shrink-0'}
          aria-hidden="true"
        />
        <span>Pregunta eliminada</span>
      </div>
    );
  }

  const isDirty = draft.trim() !== '' && draft !== (saved ?? '');

  return (
    <div
      className={cn(
        'rounded-md3-lg border-2 border-edu-container bg-card',
        compact ? 'mt-4 px-4 py-4' : 'mt-6 px-[26px] py-6'
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 font-medium uppercase tracking-[0.07em] text-edu-text',
          compact ? 'text-[10px]' : 'text-xs'
        )}
      >
        <Brain className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden="true" />
        Para reflexionar
      </div>
      <p
        className={cn(
          'mt-2.5 font-medium leading-[1.5] text-foreground',
          compact ? 'text-sm' : 'text-[1.125em]'
        )}
      >
        {block.data.prompt}
      </p>
      <Textarea
        value={draft}
        onChange={e => setDraft(e.target.value)}
        placeholder="Escribe tu respuesta… (solo tú y los instructores del curso la verán)"
        className={cn(
          'mt-3.5 resize-none rounded-md3-sm border-border bg-muted',
          compact ? 'min-h-[80px] text-sm' : 'min-h-[130px] text-base'
        )}
      />
      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={!isDirty || mutation.isPending}
          onClick={() => mutation.mutate(draft.trim())}
        >
          Guardar respuesta
        </Button>
      </div>
    </div>
  );
}
