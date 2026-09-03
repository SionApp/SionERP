import * as React from 'react';

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/** Radix portals both Content parts to `document.body` — see EducationDialog. */
const EducationDropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuContent ref={ref} className={cn('education-shell', className)} {...props} />
));
EducationDropdownMenuContent.displayName = 'EducationDropdownMenuContent';

const EducationDropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuSubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuSubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuSubContent ref={ref} className={cn('education-shell', className)} {...props} />
));
EducationDropdownMenuSubContent.displayName = 'EducationDropdownMenuSubContent';

export {
  DropdownMenu as EducationDropdownMenu,
  DropdownMenuTrigger as EducationDropdownMenuTrigger,
  EducationDropdownMenuContent,
  DropdownMenuItem as EducationDropdownMenuItem,
  DropdownMenuCheckboxItem as EducationDropdownMenuCheckboxItem,
  DropdownMenuRadioItem as EducationDropdownMenuRadioItem,
  DropdownMenuLabel as EducationDropdownMenuLabel,
  DropdownMenuSeparator as EducationDropdownMenuSeparator,
  DropdownMenuShortcut as EducationDropdownMenuShortcut,
  DropdownMenuGroup as EducationDropdownMenuGroup,
  DropdownMenuPortal as EducationDropdownMenuPortal,
  DropdownMenuSub as EducationDropdownMenuSub,
  EducationDropdownMenuSubContent,
  DropdownMenuSubTrigger as EducationDropdownMenuSubTrigger,
  DropdownMenuRadioGroup as EducationDropdownMenuRadioGroup,
};
