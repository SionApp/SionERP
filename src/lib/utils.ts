import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "hace 5 min" / "hace 3 h" / "hace 2 d" — para listas cortas (widgets, previews). */
export function formatTimeAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
}

const AVATAR_COLORS = [
  'bg-red-500/15 text-red-600',
  'bg-orange-500/15 text-orange-600',
  'bg-amber-500/15 text-amber-600',
  'bg-emerald-500/15 text-emerald-600',
  'bg-teal-500/15 text-teal-600',
  'bg-cyan-500/15 text-cyan-600',
  'bg-blue-500/15 text-blue-600',
  'bg-indigo-500/15 text-indigo-600',
  'bg-violet-500/15 text-violet-600',
  'bg-pink-500/15 text-pink-600',
];

/** Color determinístico por seed (nombre/id) — mismo usuario, mismo color en toda la app. */
export function getAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export const normalizeNullString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'String' in value && 'Valid' in value) {
    const nullString = value as { String: string; Valid: boolean };
    return nullString.Valid ? nullString.String : null;
  }
  return String(value);
};
