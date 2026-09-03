import * as React from 'react';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * Radix portals `DialogContent` to `document.body`, outside the
 * `.education-shell` scope that carries the green sub-brand tokens. This
 * wrapper force-applies the scope className so every dialog opened from an
 * education screen renders themed instead of falling back to the app's
 * default violet (spec: education-theming — "Radix portals stay inside the
 * education scope").
 */
const EducationDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogContent>,
  React.ComponentPropsWithoutRef<typeof DialogContent>
>(({ className, ...props }, ref) => (
  <DialogContent ref={ref} className={cn('education-shell', className)} {...props} />
));
EducationDialogContent.displayName = 'EducationDialogContent';

export {
  Dialog as EducationDialog,
  DialogClose as EducationDialogClose,
  EducationDialogContent,
  DialogDescription as EducationDialogDescription,
  DialogFooter as EducationDialogFooter,
  DialogHeader as EducationDialogHeader,
  DialogOverlay as EducationDialogOverlay,
  DialogPortal as EducationDialogPortal,
  DialogTitle as EducationDialogTitle,
  DialogTrigger as EducationDialogTrigger,
};
