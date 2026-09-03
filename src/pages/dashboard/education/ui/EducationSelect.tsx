import * as React from 'react';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

/** Radix portals `SelectContent` to `document.body` — see EducationDialog. */
const EducationSelectContent = React.forwardRef<
  React.ElementRef<typeof SelectContent>,
  React.ComponentPropsWithoutRef<typeof SelectContent>
>(({ className, ...props }, ref) => (
  <SelectContent ref={ref} className={cn('education-shell', className)} {...props} />
));
EducationSelectContent.displayName = 'EducationSelectContent';

export {
  Select as EducationSelect,
  SelectGroup as EducationSelectGroup,
  SelectValue as EducationSelectValue,
  SelectTrigger as EducationSelectTrigger,
  EducationSelectContent,
  SelectLabel as EducationSelectLabel,
  SelectItem as EducationSelectItem,
  SelectSeparator as EducationSelectSeparator,
  SelectScrollUpButton as EducationSelectScrollUpButton,
  SelectScrollDownButton as EducationSelectScrollDownButton,
};
