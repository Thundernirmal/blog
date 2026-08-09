import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const coreRoutes = [
  '/',
  '/blog/',
  '/blog/windows-subsystem-for-linux-wsl/',
  '/tags/',
  '/about/',
  '/search/',
  '/404.html',
];

for (const route of coreRoutes) {
  test(`${route} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('main')).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious')).toEqual([]);
  });
}

test('navigation exposes the current section', async ({ page }) => {
  await page.goto('/blog/');
  await expect(page.getByRole('link', { name: 'Blog', exact: true })).toHaveAttribute('aria-current', 'page');
});

test('internal links use Astro client-side routing', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    (window as Window & { clientRouterMarker?: boolean }).clientRouterMarker = true;
  });

  await page.getByRole('link', { name: 'Blog', exact: true }).click();
  await expect(page).toHaveURL(/\/blog\/$/);
  await expect(page.getByRole('link', { name: 'Blog', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect.poll(() => page.evaluate(() => (window as Window & { clientRouterMarker?: boolean }).clientRouterMarker)).toBe(true);

  await page.getByRole('link', { name: 'Read article' }).first().click();
  await expect(page).toHaveURL(/\/blog\/[^/]+\/$/);
  await expect(page.locator('article h1')).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as Window & { clientRouterMarker?: boolean }).clientRouterMarker)).toBe(true);
});

test('the search index returns imported articles', async ({ page }) => {
  await page.goto('/search/');
  const search = page.locator('pagefind-input input');
  await search.fill('WSL');
  await expect(page).toHaveURL(/\?q=WSL$/);
  await expect(page.locator('pagefind-results')).toContainText('Windows Subsystem for Linux');
  await expect(page.locator('pagefind-results')).toContainText('June 2, 2020');
  await expect(page.locator('pagefind-results')).toContainText(/Tags: windows.*android.*windows-10.*ubuntu.*wsl/);
  await page.reload();
  await expect(page.locator('pagefind-results')).toContainText('Windows Subsystem for Linux');
});

test('the search shortcut navigates and hands off focus', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Control+K');
  await expect(page).toHaveURL(/\/search\/$/);
  await expect(page.locator('pagefind-input input')).toBeFocused();

  await page.getByRole('link', { name: 'Blog', exact: true }).click();
  await page.keyboard.press('Control+K');
  await expect(page).toHaveURL(/\/search\/$/);
  await expect(page.locator('pagefind-input input')).toBeFocused();
});

test('the skip link moves focus to the main content', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
});

test('core routes do not overflow the viewport', async ({ page }) => {
  for (const route of coreRoutes) {
    await page.goto(route);
    const dimensions = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.documentWidth, `${route} should fit the viewport`).toBeLessThanOrEqual(dimensions.viewportWidth);
  }
});

test('imported article images load from the local build', async ({ page }) => {
  await page.goto('/blog/windows-subsystem-for-linux-wsl/');
  const images = page.locator('.article-prose img');
  await expect(images).toHaveCount(8);

  for (const image of await images.all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
});

test('the table of contents uses the right responsive control', async ({ page }) => {
  await page.goto('/blog/windows-subsystem-for-linux-wsl/');
  if ((page.viewportSize()?.width ?? 0) < 1024) {
    const disclosure = page.locator('details').filter({ hasText: 'On This Page' });
    await expect(disclosure).toBeVisible();
    await disclosure.locator('summary').click();
    await expect(disclosure.getByRole('link', { name: 'Installing WSL' })).toBeVisible();
  } else {
    await expect(page.getByRole('navigation', { name: 'On this page' })).toBeVisible();
  }
});

test('core routes have no browser console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  for (const route of coreRoutes) await page.goto(route);
  expect(errors).toEqual([]);
});
