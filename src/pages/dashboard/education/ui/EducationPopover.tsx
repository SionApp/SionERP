import * as React from 'react';

import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/** Radix portals `PopoverContent` to `document.body` — see EducationDialog. */
const EducationPopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverContent>,
  React.ComponentPropsWithoutRef<typeof PopoverContent>
>(({ className, ...props }, ref) => (
  <PopoverContent ref={ref} className={cn('education-shell', className)} {...props} />
));
EducationPopoverContent.displayName = 'EducationPopoverContent';

export {
  Popover as EducationPopover,
  PopoverTrigger as EducationPopoverTrigger,
  PopoverAnchor as EducationPopoverAnchor,
  EducationPopoverContent,
};
