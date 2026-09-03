import * as React from 'react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/** Radix portals `TooltipContent` to `document.body` — see EducationDialog. */
const EducationTooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipContent>,
  React.ComponentPropsWithoutRef<typeof TooltipContent>
>(({ className, ...props }, ref) => (
  <TooltipContent ref={ref} className={cn('education-shell', className)} {...props} />
));
EducationTooltipContent.displayName = 'EducationTooltipContent';

export {
  TooltipProvider as EducationTooltipProvider,
  Tooltip as EducationTooltip,
  TooltipTrigger as EducationTooltipTrigger,
  EducationTooltipContent,
};
