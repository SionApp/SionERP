import * as React from 'react';

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

/** Radix portals `SheetContent` to `document.body` — see EducationDialog. */
const EducationSheetContent = React.forwardRef<
  React.ElementRef<typeof SheetContent>,
  React.ComponentPropsWithoutRef<typeof SheetContent>
>(({ className, ...props }, ref) => (
  <SheetContent ref={ref} className={cn('education-shell', className)} {...props} />
));
EducationSheetContent.displayName = 'EducationSheetContent';

export {
  Sheet as EducationSheet,
  SheetTrigger as EducationSheetTrigger,
  SheetClose as EducationSheetClose,
  EducationSheetContent,
  SheetHeader as EducationSheetHeader,
  SheetFooter as EducationSheetFooter,
  SheetTitle as EducationSheetTitle,
  SheetDescription as EducationSheetDescription,
  SheetOverlay as EducationSheetOverlay,
  SheetPortal as EducationSheetPortal,
};
