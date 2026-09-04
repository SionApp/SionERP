import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, ClipboardCheck, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { EducationService } from '@/services/education.service';
import { useReviewQueue } from '../hooks/use-education-queries';
import { KpiCard } from './AdminCourseList';
import type { QuizReviewQueueItem } from '@/types/education.types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * One pending short-answer response awaiting a grade. `awardedPoints`
 * starts clamped to the question's own max (`item.points`) — the common
 * case is "this answer is fully correct" — and stays editable up to that
 * ceiling either way, mirroring `ReviewAnswer`'s own server-side clamp
 * (education_quiz_review.go: `awarded_points > maxPoints` → 400).
 */
function ReviewRow({ item }: { item: QuizReviewQueueItem }) {
  const qc = useQueryClient();
  const [awardedPoints, setAwardedPoints] = useState(String(item.points));

  const gradeMutation = useMutation({
    mutationFn: (isCorrect: boolean) => {
      const raw = Number(awardedPoints);
      const clamped = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), item.points) : 0;
      return EducationService.reviewAnswer(item.answerId, {
        isCorrect,
        awardedPoints: isCorrect ? clamped || item.points : 0,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['education-review-queue'] });
      toast.success('Respuesta calificada');
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : 'No se pudo calificar la respuesta'),
  });

  return (
    <div className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{item.studentName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {item.lessonTitle} · {formatDate(item.submittedAt)}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-edu-orange-container px-2.5 py-0.5 text-[11px] font-semibold text-on-edu-orange-container">
          {item.points} {item.points === 1 ? 'punto' : 'puntos'}
        </span>
      </div>
      <div className="rounded-md3-sm bg-edu-surface p-3">
        <p className="text-xs font-medium text-muted-foreground">{item.prompt}</p>
        <p className="mt-1 text-sm text-foreground">{item.textAnswer}</p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor={`points-${item.answerId}`} className="text-xs">
            Puntos otorgados
          </Label>
          <Input
            id={`points-${item.answerId}`}
            type="number"
            min={0}
            max={item.points}
            value={awardedPoints}
            onChange={e => setAwardedPoints(e.target.value)}
            className="w-24"
            disabled={gradeMutation.isPending}
          />
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-destructive hover:text-destructive"
            disabled={gradeMutation.isPending}
            onClick={() => gradeMutation.mutate(false)}
          >
            <X className="h-4 w-4" />
            Incorrecta
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            disabled={gradeMutation.isPending}
            onClick={() => gradeMutation.mutate(true)}
          >
            <Check className="h-4 w-4" />
            Correcta
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Manual-review queue for short-answer quiz responses (PR-K, K.4). Replaces
 * PR-C's placeholder body, same route (`admin/revisiones`). Consumes the
 * ALREADY-LIVE PR-F endpoints directly — `GET /education/reviews`
 * (`useReviewQueue`, reused from `AdminCourseList`'s "Por revisar" KPI
 * source) and `PUT /education/reviews/answers/:answerId`
 * (`EducationService.reviewAnswer`, new in this slice). No new backend
 * route. Reflections are structurally excluded already — `GetReviewQueue`
 * only ever touches `education_quiz_answers` (see K.5's negative-control
 * integration test).
 */
export default function ReviewQueue() {
  const { data: items = [], isLoading, isError, refetch } = useReviewQueue();

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Por revisar"
          value={items.length}
          foot="Respuestas cortas pendientes"
          icon={ClipboardCheck}
          containerClass="bg-edu-orange-container"
          onClass="text-on-edu-orange-container"
        />
      </div>

      <div className="overflow-hidden rounded-md3-lg border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border p-[18px]">
          <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-[15px] font-medium text-foreground">
            {items.length} {items.length === 1 ? 'respuesta pendiente' : 'respuestas pendientes'}
          </h3>
        </div>

        {isError ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm font-medium text-destructive">
              No se pudo cargar la cola de revisión.
            </p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        ) : isLoading ? (
          <div className="space-y-2 p-[18px]">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-edu-container text-on-edu-container">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Sin pendientes</p>
              <p className="max-w-xs text-sm text-muted-foreground">
                Todas las respuestas cortas ya fueron calificadas.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map(item => (
              <ReviewRow key={item.answerId} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
