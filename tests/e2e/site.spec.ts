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

test('SEO metadata keeps utility and thin archive pages out of search', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle("Nirmal's Notes — Linux, Software & Hardware");
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);

  await page.goto('/search/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');

  await page.goto('/tags/nokia/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');

  await page.goto('/tags/android/');
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});

test('the about page reflects the current profile and portfolio variants', async ({ page }) => {
  await page.goto('/about/');

  await expect(page.getByRole('heading', { name: 'Nirmal Katariya' })).toBeVisible();
  await expect(page.getByText('Associate System Engineer at Goldman Sachs', { exact: false })).toBeVisible();
  await expect(page.getByText('C++, FIX, and JavaScript')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Personal Site' })).toHaveAttribute('href', 'https://nirmalkatariya.com');
  await expect(page.getByRole('link', { name: 'Retro Site' })).toHaveAttribute('href', 'https://retro.nirmalkatariya.com');
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

test('page sections and repeated content share the entrance animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');

  const pageSections = page.locator('[data-page-enter] > *');
  const postCards = page.locator('[data-reveal-list] > [data-slot="card"]');
  await expect(pageSections).toHaveCount(2);
  await expect(postCards).toHaveCount(3);

  for (const element of [pageSections.first(), pageSections.last(), postCards.first(), postCards.last()]) {
    await expect.poll(() => element.evaluate((node) => getComputedStyle(node).animationName)).toBe('content-reveal');
  }

  const cardDelays = await postCards.evaluateAll((cards) => cards.map((card) => Number.parseFloat(getComputedStyle(card).animationDelay)));
  expect(cardDelays).toEqual([...cardDelays].sort((first, second) => first - second));
  expect(new Set(cardDelays).size).toBe(cardDelays.length);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect.poll(() => postCards.first().evaluate((node) => getComputedStyle(node).animationName)).toBe('none');
});

test('the mobile header keeps a stable height and follows scroll direction', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) >= 640);

  await page.goto('/');
  const header = page.locator('[data-site-header]');
  const initialHeight = await header.evaluate((element) => element.getBoundingClientRect().height);

  await page.evaluate(() => window.scrollTo(0, 300));
  await expect(header).toHaveAttribute('data-scroll-state', 'hidden');
  await expect.poll(() => header.evaluate((element) => element.getBoundingClientRect().height)).toBe(initialHeight);

  await page.evaluate(() => window.scrollBy(0, -80));
  await expect(header).toHaveAttribute('data-scroll-state', 'visible');

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(header).toHaveAttribute('data-scroll-state', 'visible');
});

test('mobile article anchors remain visible below the header', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) >= 640);

  await page.goto('/blog/windows-subsystem-for-linux-wsl/#installing-wsl');
  const positions = await page.evaluate(() => {
    const header = document.querySelector<HTMLElement>('[data-site-header]')?.getBoundingClientRect();
    const heading = document.querySelector<HTMLElement>('#installing-wsl')?.getBoundingClientRect();
    return { headerBottom: header?.bottom ?? 0, headingTop: heading?.top ?? 0 };
  });

  expect(positions.headingTop).toBeGreaterThanOrEqual(positions.headerBottom + 8);
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

test('core routes fit common phone widths and mobile landscape', async ({ page }) => {
  const viewports = [
    { width: 320, height: 800 },
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 667, height: 375 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const route of ['/', '/blog/', '/blog/windows-subsystem-for-linux-wsl/', '/tags/', '/search/']) {
      await page.goto(route);
      const dimensions = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      }));
      expect(dimensions.documentWidth, `${route} should fit ${viewport.width}×${viewport.height}`).toBeLessThanOrEqual(dimensions.viewportWidth);
    }
  }
});

test('primary mobile controls have touch-friendly targets', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) >= 640);

  await page.goto('/blog/');
  const controls = [
    page.getByRole('link', { name: 'Home', exact: true }),
    page.locator('a[href^="/tags/"]:not([href="/tags/"])').first(),
    page.getByRole('link', { name: 'Read article' }).first(),
    page.getByRole('contentinfo').getByRole('link', { name: 'RSS' }),
  ];

  for (const control of controls) {
    const box = await control.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }

  await page.goto('/blog/windows-subsystem-for-linux-wsl/');
  const summaryBox = await page.locator('details[data-table-of-contents] summary').boundingBox();
  expect(summaryBox?.height ?? 0).toBeGreaterThanOrEqual(44);
});

test('imported article images load from the local build', async ({ page }) => {
  await page.goto('/blog/windows-subsystem-for-linux-wsl/');
  const images = page.locator('.article-prose img');
  await expect(images).toHaveCount(8);

  for (const image of await images.all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(image).toHaveAttribute('srcset', /\w/);
    await expect(image).toHaveAttribute('sizes', /\w/);
  }
});

test('the table of contents uses the right responsive control', async ({ page }) => {
  await page.goto('/blog/windows-subsystem-for-linux-wsl/');
  if ((page.viewportSize()?.width ?? 0) < 1024) {
    const disclosure = page.locator('details').filter({ hasText: 'On This Page' });
    await expect(disclosure).toBeVisible();
    await disclosure.locator('summary').click();
    await expect(disclosure.getByRole('link', { name: 'Installing WSL' })).toBeVisible();
    await disclosure.getByRole('link', { name: 'Installing WSL' }).click();
    await expect(disclosure).not.toHaveAttribute('open', '');
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
  await expect(page.locator('[data-toc-current]').first()).toHaveText('Timeline');

  await page.locator('#wsl-1-vs-wsl-2').evaluate((heading) => heading.scrollIntoView({ block: 'start' }));
  await expect(tableOfContents.locator('a[href="#wsl-1-vs-wsl-2"]')).toHaveAttribute('aria-current', 'location');
  await expect(page.locator('[data-toc-current]').first()).toHaveText('WSL 1 vs WSL 2');

  await page.locator('#references').evaluate((heading) => heading.scrollIntoView({ block: 'start' }));
  await expect(tableOfContents.locator('a[href="#references"]')).toHaveAttribute('aria-current', 'location');
});

test('article pages expose complete sharing metadata', async ({ page }) => {
  await page.goto('/blog/windows-subsystem-for-linux-wsl/');

  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /viewport-fit=cover/);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/_astro\//);
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', /^\d+$/);
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute('content', /^\d+$/);
  await expect(page.locator('meta[property="og:image:type"]')).toHaveAttribute('content', /^image\//);
  await expect(page.locator('meta[name="twitter:image:alt"]')).toHaveAttribute('content', /Linux distributions available for WSL/);
  await expect(page.locator('meta[property="article:author"]')).toHaveAttribute('content', 'https://nirmalkatariya.com');
  await expect(page.locator('meta[property="article:tag"]')).toHaveCount(5);
});

test('the share control copies the article URL when native sharing is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          (window as Window & { copiedArticleUrl?: string }).copiedArticleUrl = value;
        },
      },
    });
  });
  await page.goto('/blog/windows-subsystem-for-linux-wsl/');

  await page.getByRole('button', { name: 'Share Article' }).click();
  await expect(page.getByRole('button', { name: 'Link Copied' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as Window & { copiedArticleUrl?: string }).copiedArticleUrl)).toMatch(/\/blog\/windows-subsystem-for-linux-wsl\/$/);
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
