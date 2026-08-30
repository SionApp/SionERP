/**
 * Pares de color por categoría del handoff MD3 (#159): contenedor tonal suave
 * + icono del mismo hue. Los hex son los exactos del diseño para el tema claro;
 * en oscuro se usa el color del icono translúcido como fondo y una versión
 * aclarada como tinta, para mantener el contraste.
 *
 * Fuente de verdad compartida entre el dashboard web (DashboardHome) y la
 * pantalla mobile (screens/DashboardScreen) — antes cada uno traía su propia
 * paleta (el mobile con gradientes azul/cyan), que es justo lo que hacía que
 * las dos vistas no se vieran de la misma app.
 */
export const MD3_ICON_TONE = {
  blue: 'bg-[#DCE7FF] text-[#2A5AD0] dark:bg-[#2A5AD0]/25 dark:text-[#AFC6FF]',
  green: 'bg-[#DDECE2] text-[#2E6C4C] dark:bg-[#2E6C4C]/30 dark:text-[#A6D9BC]',
  violet: 'bg-[#E7DEF3] text-[#6E4CA6] dark:bg-[#6E4CA6]/30 dark:text-[#D6C2F0]',
  terracotta: 'bg-[#FBE0D6] text-[#B3492A] dark:bg-[#B3492A]/30 dark:text-[#F0B49B]',
} as const;

export type MD3Tone = keyof typeof MD3_ICON_TONE;

/** Tono por defecto para una acción sin categoría declarada. */
export const MD3_TONE_FALLBACK: MD3Tone = 'blue';
