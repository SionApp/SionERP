/**
 * Captura de pantallas para el Manual de Usuario (Notion).
 *
 * Loguea UNA vez con credenciales que vos pasás por variable de entorno
 * (nunca quedan en el código) y recorre cada pantalla del admin guardando
 * un screenshot en docs/screenshots/<slug>.png.
 *
 * Uso:
 *   1. Levantá la app:            pnpm dev            (corre en http://localhost:8080)
 *   2. Exportá tus credenciales:  export MANUAL_EMAIL=tu@correo MANUAL_PASSWORD=tuclave
 *   3. Corré la captura:          pnpm exec playwright test tests/e2e/manual/manual-capture.spec.ts
 *
 * Variables opcionales:
 *   MANUAL_BASE_URL   URL de la app (default http://localhost:8080)
 *
 * Después: `node docs/screenshots/upload.mjs` para subirlas y obtener las URLs.
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.MANUAL_BASE_URL ?? 'http://localhost:8080';
const EMAIL = process.env.MANUAL_EMAIL;
const PASSWORD = process.env.MANUAL_PASSWORD;
const OUT = 'docs/screenshots';

// Pantallas a capturar. Agregá/quitá según la fase del manual.
const SCREENS: { slug: string; path: string }[] = [
  { slug: 'dashboard', path: '/dashboard' },
  { slug: 'discipulado', path: '/dashboard/discipleship' },
  { slug: 'discipulado-objetivos', path: '/dashboard/discipleship/goals' },
  { slug: 'usuarios', path: '/dashboard/users' },
  { slug: 'zonas', path: '/dashboard/zones' },
  { slug: 'eventos', path: '/dashboard/events' },
  { slug: 'musica', path: '/dashboard/music' },
  { slug: 'reportes', path: '/dashboard/reports' },
  { slug: 'configuracion', path: '/dashboard/settings' },
  { slug: 'modulos', path: '/dashboard/modules' },
  { slug: 'roles', path: '/dashboard/roles' },
  { slug: 'perfil', path: '/dashboard/profile' },
];

test('captura todas las pantallas del manual', async ({ page }) => {
  test.skip(!EMAIL || !PASSWORD, 'Definí MANUAL_EMAIL y MANUAL_PASSWORD para capturar.');
  test.setTimeout(180_000);

  await page.setViewportSize({ width: 1440, height: 900 });

  // ── Pantalla de login (sin autenticar) ──
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${OUT}/login.png` });

  // ── Login (credenciales desde env, nunca hardcodeadas) ──
  await page.fill('input[type="email"], input[name="email"]', EMAIL!);
  await page.fill('input[type="password"], input[name="password"]', PASSWORD!);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 30_000 });
  await page.waitForLoadState('networkidle');

  // ── Recorrer cada pantalla autenticada ──
  for (const screen of SCREENS) {
    await page.goto(`${BASE}${screen.path}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1200); // dejar asentar gráficos/datos
    await page.screenshot({ path: `${OUT}/${screen.slug}.png` });
    console.log(`📸 ${screen.slug}  ←  ${screen.path}`);
  }

  expect(true).toBe(true);
});
