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
    await page.emulateMedia({ reducedMotion: 'reduce' });
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

test('navigation keeps its position between long and short routes', async ({ page }) => {
  await page.goto('/blog/');
  const blogNavigation = await page.getByRole('navigation', { name: 'Main navigation' }).boundingBox();

  await page.locator('header a[href="/tags/"]').click();
  await expect(page).toHaveURL(/\/tags\/$/);
  const navigation = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(navigation).toBeVisible();
  const tagsNavigation = await navigation.boundingBox();

  expect(await page.locator('html').evaluate((element) => getComputedStyle(element).scrollbarGutter)).toBe('stable');
  expect(tagsNavigation?.x).toBe(blogNavigation?.x);
});

test('the home header reveals its brand after the hero title scrolls away', async ({ page }) => {
  await page.goto('/');
  const brand = page.locator('[data-scroll-brand]');
  const navigation = page.getByRole('navigation', { name: 'Main navigation' });

  await expect(brand).toHaveAttribute('aria-hidden', 'true');
  await expect(navigation).toHaveAttribute('data-brand-visible', 'false');

  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight }));
  await expect(brand).not.toHaveAttribute('aria-hidden', 'true');
  await expect(navigation).toHaveAttribute('data-brand-visible', 'true');

  await page.evaluate(() => window.scrollTo({ top: 0 }));
  await expect(brand).toHaveAttribute('aria-hidden', 'true');
  await expect(navigation).toHaveAttribute('data-brand-visible', 'false');
});

test('tag links are rendered as icon buttons across the site', async ({ page }) => {
  for (const route of ['/tags/', '/blog/', '/blog/windows-subsystem-for-linux-wsl/']) {
    await page.goto(route);
    const tagLinks = page.locator('a[href^="/tags/"]:not([href="/tags/"])');
    await expect(tagLinks.first(), `${route} should display tag links`).toBeVisible();
    expect(await tagLinks.count(), `${route} should display tag links`).toBeGreaterThan(0);

    for (const tagLink of await tagLinks.all()) {
      await expect(tagLink.locator('svg'), `${route} tag links should include an icon`).toHaveCount(1);
    }
  }
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

test('the table of contents highlights the section in view', async ({ page }) => {
  await page.goto('/blog/windows-subsystem-for-linux-wsl/');
  const tableOfContents = (page.viewportSize()?.width ?? 0) < 1024
    ? page.locator('details[data-table-of-contents]')
    : page.locator('nav[data-table-of-contents]');

  await expect(tableOfContents.locator('a[href="#timeline"]')).toHaveAttribute('aria-current', 'location');

  await page.locator('#wsl-1-vs-wsl-2').evaluate((heading) => heading.scrollIntoView({ block: 'start' }));
  await expect(tableOfContents.locator('a[href="#wsl-1-vs-wsl-2"]')).toHaveAttribute('aria-current', 'location');

  await page.locator('#references').evaluate((heading) => heading.scrollIntoView({ block: 'start' }));
  await expect(tableOfContents.locator('a[href="#references"]')).toHaveAttribute('aria-current', 'location');
});

test('the desktop table of contents does not scroll horizontally', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1024);
  await page.goto('/blog/noobs-point-of-view-on-cryptocurrency/');
  const tableOfContents = page.locator('nav[data-table-of-contents]');

  await expect(tableOfContents).toBeVisible();
  const dimensions = await tableOfContents.evaluate(({ clientWidth, scrollWidth }) => ({ clientWidth, scrollWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
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
