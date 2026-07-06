import type { LucideIcon } from 'lucide-react';
import { Baby, CalendarDays, HeartHandshake, Music, Sparkles, Users } from 'lucide-react';
import type { EventCategory } from '@/types/event.types';

// Visual identity per event category (icon + colors), shared by web and mobile.
export const EVENT_CATEGORY_META: Record<
  EventCategory,
  { label: string; Icon: LucideIcon; chip: string; banner: string }
> = {
  service: {
    label: 'Servicio',
    Icon: CalendarDays,
    chip: 'bg-blue-500/90 text-white',
    banner: 'bg-gradient-to-br from-blue-500 to-indigo-600',
  },
  conference: {
    label: 'Conferencia',
    Icon: Sparkles,
    chip: 'bg-purple-500/90 text-white',
    banner: 'bg-gradient-to-br from-purple-500 to-fuchsia-600',
  },
  worship: {
    label: 'Adoración',
    Icon: Music,
    chip: 'bg-emerald-500/90 text-white',
    banner: 'bg-gradient-to-br from-emerald-500 to-teal-600',
  },
  youth: {
    label: 'Jóvenes',
    Icon: Users,
    chip: 'bg-orange-500/90 text-white',
    banner: 'bg-gradient-to-br from-orange-500 to-amber-600',
  },
  children: {
    label: 'Niños',
    Icon: Baby,
    chip: 'bg-pink-500/90 text-white',
    banner: 'bg-gradient-to-br from-pink-500 to-rose-600',
  },
  community: {
    label: 'Comunitario',
    Icon: HeartHandshake,
    chip: 'bg-teal-500/90 text-white',
    banner: 'bg-gradient-to-br from-teal-500 to-cyan-600',
  },
};

export function formatEventDate(iso: string): string {
  if (!iso) return '';
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}
