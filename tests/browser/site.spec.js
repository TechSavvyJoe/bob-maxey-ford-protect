import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { publicRouteEntries } from '../../src/routes.js';

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  for (const route of publicRouteEntries) {
    test(`${viewport.width}px ${route.path}: route, accessibility, images and reflow`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`.${route.path}`);
      await expect(page.locator('#main-content')).toBeVisible();
      await expect(page.getByRole('main')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveCount(1);
      await page.evaluate(() => document.fonts.ready);
      // Load all native-lazy media before checking dimensions.
      await page.locator('img').evaluateAll((images) => images.forEach((image) => { image.loading = 'eager'; }));
      await expect.poll(() => page.locator('img').evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0))).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
}

test('unknown routes explain recovery; archived pages never expose certified products', async ({ page }) => {
  await page.goto('./products/missing');
  await expect(page.getByRole('heading', { name: 'We couldn’t find that page.' })).toBeVisible();
  await page.getByRole('button', { name: 'Browse plans & products' }).click();
  await expect(page).toHaveTitle(/Plans and products/);
  await page.goto('./products/fba-upgrade');
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.locator('#main-content')).not.toContainText('Blue Certified');
});

test('product topics reset when browser history changes product', async ({ page }) => {
  await page.goto('./products/premium');
  await page.getByRole('tab').last().click();
  await page.goto('./products/extra');
  await expect(page.getByRole('tab').first()).toHaveAttribute('aria-selected', 'true');
  await page.goBack();
  await expect(page.locator('h1')).toContainText('PremiumCARE');
});
