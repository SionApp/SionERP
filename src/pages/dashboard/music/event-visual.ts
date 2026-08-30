import type { CSSProperties } from 'react';

import type { MusicEventType } from '@/types/music.types';

// Single source of truth for how a culto type looks across the whole module.
// Antes estaba duplicado en MusicPage, MusicHero, ServidorHero y EventDetail
// (4 copias que iban a divergir). Un solo lugar = cero drift.
export const EVENT_TYPE_LABEL: Record<MusicEventType, string> = {
  viernes: 'Viernes',
  domingo: 'Domingo',
  especial: 'Especial',
};

// Dot / solid fill (listas, calendario). Alineado a la paleta "latón sobre
// tinta": el domingo (el culto central) se lleva el dorado de la marca, el
// viernes el periwinkle frío y el especial el rosa de función especial.
export const EVENT_TYPE_COLOR: Record<MusicEventType, string> = {
  viernes: 'bg-indigo-400',
  // El culto central lleva el color de la app (violeta MD3), no el dorado:
  // ese mostaza desentonaba contra el resto del sistema.
  domingo: 'bg-primary',
  especial: 'bg-rose-400',
};

// Referencia a la variable de tono definida en music-theme.css (`.music-shell`
// para lienzo claro, `.dark .music-shell` para oscuro), no un triplete HSL
// fijo: así el color del culto sigue el toggle claro/oscuro del sistema en
// vez de quedar calibrado para un solo modo.
export const EVENT_TYPE_TONE: Record<MusicEventType, string> = {
  viernes: 'var(--music-tone-viernes)',
  domingo: 'var(--music-tone-domingo)',
  especial: 'var(--music-tone-especial)',
};

/**
 * Inyecta el tono del culto como CSS var. Lo leen `.music-stage`, `.music-spine`
 * y `.music-tag-tone` en music-theme.css, así el color viaja por herencia y no
 * hay que pasarlo por props a cada hijo.
 */
export function toneStyle(tone: string): CSSProperties {
  return { '--music-tone': tone } as CSSProperties;
}
