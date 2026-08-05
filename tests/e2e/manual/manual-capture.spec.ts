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
import { test, expect, type Page } from '@playwright/test';

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

// Navega de forma resistente a las redirecciones internas de la SPA
// (la app a veces re-navega sola, lo que interrumpe un goto en curso).
async function gotoSafe(page: Page, url: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      // networkidle puede no llegar nunca en apps con polling: no fallar por eso
      await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
      return;
    } catch (err) {
      if (attempt === 2) throw err;
      await page.waitForTimeout(1000); // dejar que la SPA termine su redirección
    }
  }
}

test('captura todas las pantallas del manual', async ({ page }) => {
  test.skip(!EMAIL || !PASSWORD, 'Definí MANUAL_EMAIL y MANUAL_PASSWORD para capturar.');
  test.setTimeout(240_000);

  await page.setViewportSize({ width: 1440, height: 900 });

  // ── Pantalla de login (sin autenticar) ──
  await gotoSafe(page, `${BASE}/login`);
  await page.screenshot({ path: `${OUT}/login.png` });

  // ── Login (credenciales desde env, nunca hardcodeadas) ──
  await page.fill('input[type="email"], input[name="email"]', EMAIL!);
  await page.fill('input[type="password"], input[name="password"]', PASSWORD!);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 30_000 });

  // Dejar que terminen TODAS las redirecciones post-login (rol → panel correcto)
  // antes de empezar a navegar, así no chocan con el primer goto del loop.
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(2500);

  // ── Recorrer cada pantalla autenticada ──
  for (const screen of SCREENS) {
    await gotoSafe(page, `${BASE}${screen.path}`);
    await page.waitForTimeout(1500); // dejar asentar gráficos/datos
    await page.screenshot({ path: `${OUT}/${screen.slug}.png` });
    console.log(`📸 ${screen.slug}  ←  ${screen.path}`);
  }

  expect(true).toBe(true);
});
