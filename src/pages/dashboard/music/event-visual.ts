import type { MusicEventType } from '@/types/music.types';

// Single source of truth for how a culto type looks across the whole module.
// Antes estaba duplicado en MusicPage, MusicHero, ServidorHero y EventDetail
// (4 copias que iban a divergir). Un solo lugar = cero drift.
export const EVENT_TYPE_LABEL: Record<MusicEventType, string> = {
  viernes: 'Viernes',
  domingo: 'Domingo',
  especial: 'Especial',
};

// Dot / solid fill (listas, calendario).
export const EVENT_TYPE_COLOR: Record<MusicEventType, string> = {
  viernes: 'bg-blue-500',
  domingo: 'bg-emerald-500',
  especial: 'bg-amber-500',
};

// Hero background gradient por tipo de culto.
export const EVENT_TYPE_GRADIENT: Record<MusicEventType, string> = {
  viernes: 'from-blue-500 to-indigo-600',
  domingo: 'from-emerald-500 to-teal-600',
  especial: 'from-amber-500 to-orange-600',
};
