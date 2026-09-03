import * as React from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface EducationConfirmDialogProps {
  /** The element that opens the dialog (rendered via asChild). */
  trigger: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  /** Destructive by default — styles the confirm button as destructive. */
  destructive?: boolean;
}

/**
 * Education's own confirm-before-you-act dialog. `@/components/ui/confirm-
 * dialog`'s `ConfirmDialog` doesn't expose a className passthrough onto its
 * inner `AlertDialogContent`, so it can't be scoped — this reimplements the
 * same API directly on top of the raw `alert-dialog` primitives, forcing
 * `.education-shell` onto the portalled content (mirrors EducationDialog).
 */
export function EducationConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  destructive = true,
}: EducationConfirmDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className={cn('education-shell')}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={
              destructive
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : undefined
            }
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
