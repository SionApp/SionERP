import { SettingsService } from '@/services/settings.service';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

// ─── Hex → HSL conversion ────────────────────────────────────────────────────

function hexToHsl(hex: string): [number, number, number] {
  const h = hex.replace('#', '').padEnd(6, '0');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, Math.round(l * 100)];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let hue = 0;
  switch (max) {
    case r:
      hue = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      hue = ((b - r) / d + 2) / 6;
      break;
    case b:
      hue = ((r - g) / d + 4) / 6;
      break;
  }

  return [Math.round(hue * 360), Math.round(s * 100), Math.round(l * 100)];
}

function fgFor(lightness: number): string {
  return lightness > 55 ? '220 26% 14%' : '0 0% 100%';
}

// ─── CSS injection ────────────────────────────────────────────────────────────

export function applyBrandColors(primary: string, secondary: string) {
  if (!primary || !secondary) return;

  const [ph, ps, pl] = hexToHsl(primary);
  const [sh, ss, sl] = hexToHsl(secondary);
  const root = document.documentElement;

  // Primary
  root.style.setProperty('--primary', `${ph} ${ps}% ${pl}%`);
  root.style.setProperty('--primary-foreground', fgFor(pl));
  root.style.setProperty('--primary-light', `${ph} ${ps}% ${Math.min(92, pl + 52)}%`);

  // Accent (secondary)
  root.style.setProperty('--accent', `${sh} ${ss}% ${sl}%`);
  root.style.setProperty('--accent-foreground', fgFor(sl));

  // Sidebar
  root.style.setProperty('--sidebar-primary', `${ph} ${ps}% ${pl}%`);
  root.style.setProperty('--sidebar-primary-foreground', fgFor(pl));

  // Contenedores tonales MD3 (#159): el nav activo, el chip de usuario y el
  // botón del banner viven sobre primary-container. Derivarlos de la marca
  // evita el choque de tener el chrome MD3 en violeta fijo mientras los
  // botones toman el color de la iglesia.
  root.style.setProperty('--primary-container', `${ph} ${Math.max(30, ps - 15)}% 90%`);
  root.style.setProperty('--on-primary-container', `${ph} ${Math.min(100, ps + 20)}% 22%`);
  root.style.setProperty('--sidebar-accent', `${ph} ${Math.max(30, ps - 15)}% 90%`);
  root.style.setProperty('--sidebar-accent-foreground', `${ph} ${Math.min(100, ps + 20)}% 22%`);

  // Gradient + shadow
  root.style.setProperty(
    '--gradient-primary',
    `linear-gradient(135deg, hsl(${ph} ${ps}% ${pl}%), hsl(${sh} ${ss}% ${sl}%))`
  );
  // Banner de bienvenida (MD3): mismo hue de marca, subiendo luminosidad —
  // el handoff lo dibuja así (#6750A4 → #7F67BE → #9A82DB), pero anclado al
  // color de la iglesia en vez de al violeta del mockup.
  root.style.setProperty(
    '--gradient-banner',
    `linear-gradient(120deg, hsl(${ph} ${ps}% ${pl}%) 0%, hsl(${ph} ${ps}% ${Math.min(70, pl + 12)}%) 55%, hsl(${ph} ${Math.max(35, ps - 10)}% ${Math.min(80, pl + 26)}%) 100%)`
  );
  root.style.setProperty('--shadow-primary', `0 25px 50px -12px hsl(${ph} ${ps}% ${pl}% / 0.2)`);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBrandColors() {
  useEffect(() => {
    const load = async () => {
      try {
        const church = await SettingsService.getChurchInfo();
        applyBrandColors(church.primary_color, church.secondary_color);
      } catch {
        // Keep default CSS colors if load fails
      }
    };

    load();

    // Realtime: re-apply whenever church_info changes
    const channel = supabase
      .channel('brand-colors')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'church_info' },
        payload => {
          const row = payload.new as { primary_color?: string; secondary_color?: string };
          if (row.primary_color && row.secondary_color) {
            applyBrandColors(row.primary_color, row.secondary_color);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
