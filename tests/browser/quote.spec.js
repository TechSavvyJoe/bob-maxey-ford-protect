import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const VIN = '1FTEW1EG0FFB40359';
const year = String(new Date().getFullYear() - 2);
test.beforeEach(async ({ page }) => {
  // Never send a lead, including when a future build has its backend enabled.
  await page.route('**/*', (route) => ['GET', 'HEAD'].includes(route.request().method())
    ? route.continue()
    : route.fulfill({ status: 503, json: { accepted: false, message: 'Test delivery blocked.' } }));
});
async function start(page) {
  await page.goto('./');
  await page.getByRole('button', { name: 'Check my vehicle', exact: true }).first().click();
  await expect(page.getByRole('dialog', { name: 'Build your Ford Protect coverage request' })).toBeVisible();
  await expect(page.locator('.studio-header .brand__dealer')).toBeVisible();
  await expect(page.locator('.studio-header .brand__protect')).toBeVisible();
}
async function vehicle(page, situation = 'I already own it') {
  await page.getByRole('radio', { name: new RegExp(situation) }).click();
  if (situation !== 'I already own it') await page.getByRole('radio', { name: /^Finance/ }).click();
  await page.getByLabel('Year *', { exact: true }).selectOption(year);
  await page.getByLabel('Model *', { exact: true }).selectOption('F-150 4WD');
  await page.getByLabel('Current mileage *').fill('25000');
  await page.getByLabel('State registered *').selectOption('Michigan');
  await page.getByLabel('ZIP code *').fill('48081');
  await page.getByRole('button', { name: 'I don’t know the date' }).click();
  await page.getByRole('button', { name: 'Continue to coverage', exact: true }).click();
}
async function espOptions(page) {
  await page.getByRole('radio', { name: /^Extended Service Plan/ }).click();
  await page.getByRole('radio', { name: /^From the original warranty start/ }).click();
  await page.getByRole('radio', { name: /^PremiumCARE / }).click();
  await page.getByRole('button', { name: 'Choose term & mileage', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Continue to options', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Use recommended term and mileage' }).click();
  await page.getByRole('button', { name: 'Continue to options', exact: true }).click();
}
async function noExtras(page) {
  await page.getByRole('radio', { name: /^\$100 / }).click();
  await page.getByRole('button', { name: 'No added plan benefits', exact: true }).click();
  await page.getByRole('button', { name: 'Continue with no additional products', exact: true }).click();
  await page.getByRole('radio', { name: /^Help me compare the available choices/ }).click();
  await page.getByRole('button', { name: 'Continue to contact details', exact: true }).click();
}

for (const width of [320, 390, 820, 1366]) {
  test(`quote ${width}px: explicit required choices, keyboard-safe fields, review and proposal`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 844 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await start(page);
    await expect(page.getByRole('radio', { name: 'Personal', exact: true })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('radio', { name: 'No', exact: true })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('radio', { name: 'Gas', exact: true })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('button', { name: 'Continue to coverage', exact: true })).toBeDisabled();
    if (width <= 820) {
      expect(await page.locator('.quote-studio input, .quote-studio select').evaluateAll((fields) => fields.every((field) => parseFloat(getComputedStyle(field).fontSize) >= 16))).toBe(true);
    }
    await vehicle(page);
    await espOptions(page);
    const forward = page.getByRole('button', { name: 'Continue to contact details', exact: true });
    await expect(forward).toBeDisabled();
    await page.getByRole('radio', { name: /^\$100 / }).click();
    await expect(forward).toBeDisabled();
    await noExtras(page);
    await page.getByLabel('First name *', { exact: true }).fill('Quality');
    await page.getByLabel('Last name *', { exact: true }).fill('Assurance');
    await page.getByLabel('Email *', { exact: true }).fill('quality@example.com');
    await page.getByLabel('Mobile phone *', { exact: true }).fill('2025550143');
    await page.getByLabel('Preferred Bob Maxey location').selectOption({ label: 'Bob Maxey Ford of Howell' });
    await page.getByRole('radio', { name: 'Email', exact: true }).click();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Review request', exact: true }).click();
    await expect(page.locator('.studio-main')).toContainText('quality@example.com');
    await page.getByRole('button', { name: 'Preview draft proposal', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Personalized Ford Protect proposal preview' })).toBeVisible();
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.locator('.proposal-preview__page')).toContainText('PremiumCARE');
    await page.getByRole('button', { name: 'Close preview', exact: true }).click();
    // No backend configured: do not send a real lead and never display success.
    await page.getByRole('button', { name: 'Submit for specialist review', exact: true }).click();
    await expect(page.getByText(/We could not send your request yet|Request was not delivered/, { exact: true })).toBeVisible();
    await expect(page.getByText('Request delivered to Bob Maxey', { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect(errors).toEqual([]);
  });
}

for (const width of [320, 390, 620, 820, 1366]) {
  test(`product browsing ${width}px: all categories and cards fit without sideways scrolling`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await start(page);
    await vehicle(page);
    await espOptions(page);
    const categories = page.getByRole('tablist', { name: 'Product categories' });
    const tabs = categories.getByRole('tab');
    const panel = page.locator('#product-category-panel');
    for (let index = 0; index < await tabs.count(); index += 1) {
      await tabs.nth(index).click();
      await expect(panel.locator('.quote-product-card').first()).toBeVisible();
      for (const container of [categories, panel]) {
        const layout = await container.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          return {
            overflow: element.scrollWidth - element.clientWidth,
            childrenFit: [...element.children].every((child) => {
              const rect = child.getBoundingClientRect();
              return rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1;
            }),
          };
        });
        expect(layout, `Category ${await tabs.nth(index).innerText()} at ${width}px`).toEqual({ overflow: 0, childrenFit: true });
      }
    }
    await page.getByRole('tab', { name: 'All', exact: true }).click();
    const cards = panel.locator('.quote-product-card');
    expect(await cards.count()).toBeGreaterThan(3);
    // The last product is reachable vertically, with its action wholly on-screen.
    const lastAction = cards.last().getByRole('button').first();
    await lastAction.scrollIntoViewIfNeeded();
    await expect(lastAction).toBeInViewport();
    expect(await panel.evaluate((element) => element.scrollLeft)).toBe(0);
    expect(await categories.evaluate((element) => element.scrollLeft)).toBe(0);
  });
}

for (const situation of ['Buying a new vehicle', 'Buying a used vehicle', 'I already own it']) {
  test(`products-only: ${situation} keeps timing and explicit configuration`, async ({ page }) => {
    await start(page);
    await vehicle(page, situation);
    await page.getByRole('radio', { name: /^Ford Protect products only/ }).click();
    await page.getByRole('button', { name: 'Review product path', exact: true }).click();
    await page.getByRole('button', { name: 'Continue to options', exact: true }).click();
    await page.getByRole('tab', { name: 'All', exact: true }).click();
    const tire = page.locator('[data-product-id="tirecare-plus"]');
    if (situation === 'I already own it') await expect(tire).toContainText('See why it is unavailable');
    else await expect(tire).toContainText('View details & choose');
    await page.locator('[data-product-id="premium-maintenance"]').getByRole('button', { name: /View details & choose/ }).click();
    await expect(page.getByRole('button', { name: 'Add Premium Maintenance Plan', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: /Confirm these product options/ }).click();
    await page.getByRole('button', { name: 'Add Premium Maintenance Plan', exact: true }).click();
    await page.getByRole('radio', { name: /^Help me compare the available choices/ }).click();
    await expect(page.getByRole('button', { name: 'Continue to contact details', exact: true })).toBeEnabled();
  });
}

test('VIN facts decode without warranty invention; manual changes remove stale provenance', async ({ page }) => {
  await page.route('https://vpic.nhtsa.dot.gov/api/vehicles/**', (route) => route.fulfill({ json: { Results: [{ VIN, ErrorCode: '0', ModelYear: '2015', Make: 'FORD', Model: 'F-150', FuelTypePrimary: 'Gasoline', DriveType: '4WD', DisplacementL: '3.5', EngineCylinders: '6' }] } }));
  await start(page);
  await page.getByLabel('VIN', { exact: true }).fill(VIN);
  await page.getByRole('button', { name: 'Decode VIN', exact: true }).click();
  await expect(page.getByText('NHTSA vehicle facts found')).toBeVisible();
  await expect(page.getByLabel('Year *', { exact: true })).toHaveValue('2015');
  await expect(page.locator('[name="inServiceDate"]')).toHaveValue('');
  await page.getByLabel('Current mileage *').fill('50000');
  await page.locator('[name="inServiceDate"]').fill('2015-06-01');
  await page.getByLabel('Year *', { exact: true }).selectOption(year);
  await expect(page.locator('.vin-decoded-summary')).toHaveCount(0);
  await expect(page.getByLabel('Current mileage *')).toHaveValue('');
  await expect(page.locator('[name="inServiceDate"]')).toHaveValue('');
  await expect(page.getByText('Vehicle details were edited.', { exact: false })).toBeVisible();
  await page.getByLabel('Current mileage *').fill('20000');
  await page.locator('[name="inServiceDate"]').fill(`${year}-02-01`);
  await page.getByLabel('VIN', { exact: true }).fill(`${VIN}0`);
  await expect(page.getByLabel('Current mileage *')).toHaveValue('');
  await expect(page.locator('[name="inServiceDate"]')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Decode VIN', exact: true })).toBeDisabled();
  await expect(page.getByText('Enter a valid 17-character VIN', { exact: false })).toBeVisible();
});

test('failed quote download offers recovery instead of a blank application', async ({ page }) => {
  await page.route('**/QuoteStudio-*.js', (route) => route.abort());
  await page.goto('./');
  await page.getByRole('button', { name: 'Check my vehicle', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'This view could not be loaded.' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to the site' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('h1')).toContainText('Protect');
});
