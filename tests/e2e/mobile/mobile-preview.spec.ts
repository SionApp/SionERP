import { test, expect } from '@playwright/test';

test.describe('Mobile preview — verificación visual de componentes', () => {

  test('renderiza todos los componentes mobile con data mockeada',
    { tag: ['@mobile', '@preview', '@MOBILE-E2E-001'] },
    async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });

      await page.goto('/mobile-preview');
      await page.waitForLoadState('networkidle');

      // Tomar screenshot completo antes de cualquier aserción
      await page.screenshot({ path: 'tests/e2e/mobile/__screenshots__/preview-full.png', fullPage: true });

      // ============================================================
      // VERIFICACIONES ESTRUCTURALES (puedo leer el DOM)
      // ============================================================

      // ── MobileScreen light variant ──
      const lightHeader = page.getByText('Dashboard — Light variant');
      await expect(lightHeader).toBeVisible();

      // ── MobileStatTile: variantes (usar exact:true para evitar ambigüedad) ──
      await expect(page.getByText('Default', { exact: true })).toBeVisible();
      await expect(page.getByText('Alert', { exact: true })).toBeVisible();
      await expect(page.getByText('Con icono', { exact: true })).toBeVisible();

      // Verificar que los StatTile estén dentro del scroll horizontal snap
      const statTileRow = page.locator('.snap-x');
      await expect(statTileRow.first()).toBeVisible();

      // ── MobileListItem: accent bars ──
      await expect(page.getByText('Accent primary', { exact: true })).toBeVisible();
      await expect(page.getByText('Accent danger', { exact: true })).toBeVisible();

      // ── MobileSectionHeader con link ──
      await expect(page.getByText('SectionHeader con link')).toBeVisible();

      // ── Dashboard screen ──
      await expect(page.getByText('Miembros').first()).toBeVisible();
      await expect(page.getByText('Grupos').first()).toBeVisible();

      // ── Discipleship overview ──
      await expect(page.getByText('Discipulado — Overview')).toBeVisible();
      await expect(page.getByText('Multiplicaciones').first()).toBeVisible();

      // ── Activity feed ──
      await expect(page.getByText('Actividad reciente').first()).toBeVisible();

      // ── Empty states ──
      await expect(page.getByText('Sin actividad reciente')).toBeVisible();

      // ── Loading states ──
      await expect(page.getByText('Loading states')).toBeVisible();

      // ── Verificar que los botones de acciones rápidas existen ──
      await expect(page.getByText('Miembros', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Zonas', { exact: true }).first()).toBeVisible();
    }
  );

  test('verifica estructura DOM de los primitives',
    { tag: ['@mobile', '@preview', '@MOBILE-E2E-002'] },
    async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });

      await page.goto('/mobile-preview');
      await page.waitForLoadState('networkidle');

      // ── MobileScreen brand variant ──
      // Verificar que existe un header con bg-primary (no podemos ver el color,
      // pero podemos verificar que el texto "Brand variant" esté cerca del header)
      const brandSection = page.getByText('Brand variant');
      await expect(brandSection).toBeVisible();
      await page.screenshot({ path: 'tests/e2e/mobile/__screenshots__/preview-brand.png', fullPage: true });

      // ── MobileScreen light variant ──
      // Verificar que los headers light tienen la estructura correcta
      const lightTitles = page.getByText('Dashboard — Light variant');
      await expect(lightTitles).toBeVisible();

      // ── Verificar que todos los títulos de sección existen ──
      const sectionTitles = [
        'MobileStatTile — Variantes',
        'MobileListItem — Acents',
        'SectionHeader con link',
      ];
      for (const title of sectionTitles) {
        await expect(page.getByText(title)).toBeVisible();
      }
    }
  );

  test('verifica empty states y loading',
    { tag: ['@mobile', '@preview', '@MOBILE-E2E-003'] },
    async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });

      await page.goto('/mobile-preview');
      await page.waitForLoadState('networkidle');

      // Scroll a la sección de loading states
      await page.getByText('Loading states').scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await page.screenshot({ path: 'tests/e2e/mobile/__screenshots__/preview-loading.png', fullPage: true });

      // ── Empty state: "Sin actividad reciente" ──
      await expect(page.getByText('Sin actividad reciente')).toBeVisible();

      // ── Skeleton loaders: los StatTile con loading=true muestran Skeleton ──
      // Buscar el texto "StatTiles cargando"
      await expect(page.getByText('StatTiles cargando')).toBeVisible();
    }
  );

  test('verifica navegación en módulos y acciones',
    { tag: ['@mobile', '@preview', '@MOBILE-E2E-004'] },
    async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });

      await page.goto('/mobile-preview');
      await page.waitForLoadState('networkidle');

      // La sección "Módulos" debería tener items clickeables
      const modulesHeader = page.getByText('Módulos').first();
      await expect(modulesHeader).toBeVisible();

      // Verificar estructura de los list items de módulos
      const moduleItems = page.locator('.divide-y button');
      const moduleCount = await moduleItems.count();
      console.log(`📍 Items de módulos clickeables encontrados: ${moduleCount}`);
      expect(moduleCount).toBeGreaterThan(0);

      await page.screenshot({ path: 'tests/e2e/mobile/__screenshots__/preview-modules.png', fullPage: true });
    }
  );
});
