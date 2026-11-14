import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { buttonVariants } from '../../src/components/ui/button';

const coreRoutes = [
  '/',
  '/blog/',
  '/blog/windows-subsystem-for-linux-wsl/',
  '/tags/',
  '/about/',
  '/search/',
  '/404.html',
];

// Both Catppuccin flavours are audited: Latte accents are darkened for contrast, Mocha's are not.
for (const colorScheme of ['light', 'dark'] as const) {
  for (const route of coreRoutes) {
    test(`${route} has no serious accessibility violations in ${colorScheme} mode`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce', colorScheme });
      await page.goto(route);
      await expect(page.locator('main')).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(results.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious')).toEqual([]);
    });
  }
}

for (const [scheme, theme, hex, rgb] of [
  ['light', 'latte', '#eff1f5', 'rgb(239, 241, 245)'],
  ['dark', 'mocha', '#1e1e2e', 'rgb(30, 30, 46)'],
] as const) {
  test(`browser chrome follows a ${scheme} system scheme with Catppuccin ${theme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute('content', 'light dark');
    for (const meta of await page.locator('meta[name="theme-color"]').all()) await expect(meta).toHaveAttribute('content', hex);
    const colors = await page.evaluate(() => ({
      html: getComputedStyle(document.documentElement).backgroundColor,
      body: getComputedStyle(document.body).backgroundColor,
      scheme: getComputedStyle(document.documentElement).colorScheme,
    }));
    expect(colors).toEqual({ html: rgb, body: rgb, scheme });
  });
}

test('a stored theme overrides the system scheme and survives client-side navigation', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.addInitScript(() => localStorage.setItem('theme', 'mocha'));
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'mocha');
  await page.locator('[data-site-header]').getByRole('link', { name: 'Tags', exact: true }).click();
  await expect(page).toHaveURL(/\/tags\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(html).toHaveAttribute('data-theme', 'mocha');
  for (const meta of await page.locator('meta[name="theme-color"]').all()) await expect(meta).toHaveAttribute('content', '#1e1e2e');
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(30, 30, 46)');
});

test('the header toggle switches, persists, and carries the theme across navigation', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const html = page.locator('html');
  const toggle = page.locator('[data-site-header]').getByRole('button', { name: 'Dark theme', exact: true });
  await expect(html).toHaveAttribute('data-theme', 'latte');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(html).toHaveAttribute('data-theme', 'mocha');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(html).not.toHaveClass(/theme-switching/);
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('mocha');
  await page.locator('[data-site-header]').getByRole('link', { name: 'About', exact: true }).click();
  await expect(page).toHaveURL(/\/about\/$/);
  await expect(page.getByRole('heading', { name: 'About', level: 1 })).toBeVisible();
  await expect(html).toHaveAttribute('data-theme', 'mocha');
  const swappedToggle = page.locator('[data-site-header]').getByRole('button', { name: 'Dark theme', exact: true });
  await expect(swappedToggle).toHaveAttribute('aria-pressed', 'true');
  await swappedToggle.focus();
  await page.keyboard.press('Enter');
  await expect(html).toHaveAttribute('data-theme', 'latte');
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'latte');
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('latte');
});

test('without JavaScript the system scheme applies and the inert toggle stays hidden', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, colorScheme: 'dark' });
  const page = await context.newPage();
  await page.goto('/blog/windows-subsystem-for-linux-wsl/');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme');
  // The toggle needs a script to act, so it stays hidden rather than inert.
  await expect(page.locator('[data-theme-toggle]')).toBeHidden();
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(30, 30, 46)');
  await context.close();
});

test('without a stored theme, a live system scheme change switches the theme', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'latte');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'mocha');
});

test('code blocks follow the page flavour', async ({ page }) => {
  for (const [scheme, theme] of [['light', 'latte'], ['dark', 'mocha']] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/blog/windows-subsystem-for-linux-wsl/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const code = page.locator('.expressive-code pre').first();
    await expect(code).toBeVisible();
    const background = await code.evaluate((node) => getComputedStyle(node).backgroundColor);
    expect(background, `${theme} code background`).toBe(theme === 'latte' ? 'rgb(239, 241, 245)' : 'rgb(30, 30, 46)');
  }
});

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
  await expect(page.getByText('Systems engineer in site reliability · B.Tech', { exact: false })).toBeVisible();
  await expect(page.getByText(/Goldman|Capgemini/i)).toHaveCount(0);
  await expect(page.getByText('SRE, SLOs & SLIs, Prometheus, Alertmanager, BigQuery, Linux, and Python')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Personal Site' })).toHaveAttribute('href', 'https://nirmalkatariya.com');
  // Ruled cells with label links, not raised cards with filled buttons.
  await expect(page.locator('.home-band > .home-cell')).toHaveCount(2);
  await expect(page.getByRole('link', { name: 'Personal Site' })).toHaveClass(/home-cta/);
  // Off-site links say so: a trailing ↗ and a new-tab note for screen readers.
  for (const name of ['Personal Site', 'Retro Site', 'GitHub', 'Medium']) {
    const link = page.locator('main').getByRole('link', { name: `${name} (opens in a new tab)` });
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toContainText('↗');
  }
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
  const postCards = page.locator('[data-reveal-list] > li');
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
  // Rows slide in on load, and WebKit reports sub-pixel sizes mid-transform; measure at rest.
  await page.emulateMedia({ reducedMotion: 'reduce' });

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

  // The share script binds after load; a click that lands first does nothing, so retry until it responds.
  await expect(async () => {
    await page.locator('[data-share-button]').click();
    await expect(page.getByRole('button', { name: 'Link Copied' })).toBeVisible({ timeout: 1_000 });
  }).toPass();
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

test('the home page lists the latest writing as a numbered, ruled band', async ({ page }) => {
  await page.goto('/');
  // The hero ends in the portfolio's mauve period, hidden from the heading's accessible name.
  await expect(page.getByRole('heading', { level: 1, name: "Nirmal's Notes", exact: true })).toBeVisible();
  await expect(page.locator('#home-page-header h1 [aria-hidden="true"]')).toHaveText('.');
  const cells = page.locator('.home-band > li');
  await expect(cells).toHaveCount(3);
  await expect(cells.first().locator('.label').first()).toHaveText(/^01 \/ /);
  await expect(cells.nth(2).locator('.label').first()).toHaveText(/^03 \/ /);
  for (const cell of await cells.all()) {
    // Each "Read article" link names its post for screen readers.
    const title = (await cell.getByRole('heading', { level: 3 }).textContent())?.trim() ?? '';
    const readLink = cell.getByRole('link', { name: /^Read article/ });
    await expect(readLink).toBeVisible();
    await expect(readLink).toContainText(title);
  }
  await expect(page.getByRole('link', { name: /^View All \d+ Articles$/ })).toHaveAttribute('href', '/blog/');
});

test('the search shortcut hint shows only with a fine pointer and hover', async ({ browser }) => {
  for (const [hasTouch, visible] of [[false, true], [true, false]] as const) {
    const context = await browser.newContext({ viewport: { width: 1024, height: 800 }, hasTouch, isMobile: hasTouch });
    const page = await context.newPage();
    await page.goto('/blog/');
    const hint = page.locator('[data-site-header] .keyboard-hint');
    await expect(hint).toHaveCount(1);
    if (visible) await expect(hint).toBeVisible();
    else await expect(hint).toBeHidden();
    await context.close();
  }
});

test('the header brand is the portfolio-style "~/notes" path, and "~/" alone links home on phones', async ({ page }) => {
  await page.goto('/tags/');
  const header = page.locator('[data-site-header]');
  if ((page.viewportSize()?.width ?? 0) >= 640) {
    const brand = header.getByRole('link', { name: "Nirmal's Notes, home", exact: true });
    await expect(brand).toBeVisible();
    await expect(brand).toHaveText('~/notes');
    await expect(brand.locator('.text-primary')).toHaveText('~/');
    expect(await brand.evaluate((node) => getComputedStyle(node).fontFamily)).toContain('JetBrains Mono');
  } else {
    const home = header.getByRole('link', { name: 'Home', exact: true });
    await expect(home).toBeVisible();
    await expect(home).toHaveText('~/');
  }
});

test('the 404 page shows the shared terminal window and recovery links', async ({ page }) => {
  await page.goto('/404.html');
  await expect(page.getByRole('heading', { level: 1, name: 'Path not found.' })).toBeVisible();
  const terminal = page.locator('.terminal-window');
  await expect(terminal.locator('.terminal-title')).toHaveText('nirmal@Tiger: ~/notes');
  await expect(terminal).toContainText('cd: no such file or directory: /requested/page');
  await expect(terminal.locator('.terminal-status-end')).toHaveText('exit 1');
  const recovery = page.getByRole('navigation', { name: 'Recovery links' });
  for (const name of ['Home', 'Blog', 'Search']) await expect(recovery.getByRole('link', { name, exact: true })).toBeVisible();
});

test('outline buttons draw their hairline border', async ({ page }) => {
  // No current page shows an outline button (pagination appears past ten posts), so probe the variant's real classes.
  await page.goto('/blog/');
  const colors = await page.evaluate((className) => {
    const probe = document.createElement('a');
    probe.className = className;
    probe.textContent = 'Probe';
    const reference = document.createElement('div');
    reference.style.color = 'var(--border)';
    document.querySelector('main')!.append(probe, reference);
    const result = { button: getComputedStyle(probe).borderTopColor, border: getComputedStyle(reference).color };
    probe.remove();
    reference.remove();
    return result;
  }, buttonVariants({ variant: 'outline' }));
  expect(colors.button).not.toBe('rgba(0, 0, 0, 0)');
  expect(colors.button).toBe(colors.border);
});

test('focus rings reach 3:1 contrast against the Latte page', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/blog/');
  const link = page.locator('[data-site-header]').getByRole('link', { name: 'Tags', exact: true });
  await link.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  const shadow = await page.evaluate(() => getComputedStyle(document.activeElement!).boxShadow);
  // The ring is drawn in the full mauve tone, not a 50% tint.
  expect(shadow).toMatch(/(oklab|rgb)\([^)/,]*( [^)/,]*)*\) 0px 0px 0px 3px/);
});

test('enlarged text on phones wraps instead of overflowing', async ({ page }) => {
  for (const width of [320, 375]) {
    await page.setViewportSize({ width, height: 800 });
    for (const route of ['/', '/blog/', '/tags/', '/tags/guides-and-tutorials/', '/blog/windows-subsystem-for-linux-wsl/', '/404.html']) {
      await page.goto(route);
      // Approximates a 200% browser text size.
      await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
      const dimensions = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      }));
      expect(dimensions.documentWidth, `${route} at ${width}px with 200% text`).toBeLessThanOrEqual(dimensions.viewportWidth);
    }
  }
});

test('contents links land headings just below the header, offset once', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1024);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/blog/windows-subsystem-for-linux-wsl/');
  await page.locator('nav[data-table-of-contents]').getByRole('link', { name: 'WSL 1 vs WSL 2' }).click();
  await expect(page).toHaveURL(/#wsl-1-vs-wsl-2$/);
  await expect.poll(async () => {
    const { headerBottom, headingTop } = await page.evaluate(() => ({
      headerBottom: document.querySelector('[data-site-header]')!.getBoundingClientRect().bottom,
      headingTop: document.querySelector('#wsl-1-vs-wsl-2')!.getBoundingClientRect().top,
    }));
    return headingTop - headerBottom;
  }).toBeGreaterThanOrEqual(8);
  const gap = await page.evaluate(() => document.querySelector('#wsl-1-vs-wsl-2')!.getBoundingClientRect().top - document.querySelector('[data-site-header]')!.getBoundingClientRect().bottom);
  expect(gap).toBeLessThanOrEqual(32);
});

test('article header, notes, prose and footer share one left edge', async ({ page }) => {
  await page.goto('/blog/windows-subsystem-for-linux-wsl/');
  const edges = await page.evaluate(() =>
    ['article h1', '[data-slot="alert"]', '.article-prose', 'nav[aria-label="Article navigation"]'].map(
      (selector) => Math.round(document.querySelector(selector)!.getBoundingClientRect().left),
    ),
  );
  expect(new Set(edges).size, `left edges ${edges.join(', ')}`).toBe(1);
});

test('older and newer articles sit in a ruled two-cell band', async ({ page }) => {
  // The band slides in on load; measure it at rest.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/blog/windows-subsystem-for-linux-wsl/');
  const band = page.getByRole('navigation', { name: 'Article navigation' });
  const older = band.getByRole('link', { name: /^← Older|^Older/ });
  const newer = band.getByRole('link', { name: /^Newer/ });
  await expect(older).toBeVisible();
  await expect(newer).toBeVisible();
  expect(await band.evaluate((node) => getComputedStyle(node).borderTopWidth)).toBe('1px');
  if ((page.viewportSize()?.width ?? 0) >= 640) {
    const [olderBox, newerBox] = [await older.boundingBox(), await newer.boundingBox()];
    expect(newerBox!.x).toBeGreaterThan(olderBox!.x);
    expect(Math.abs(newerBox!.y - olderBox!.y)).toBeLessThan(2);
  }
  await expect(page.getByRole('button', { name: 'Share Article' })).toHaveClass(/home-cta/);
});

test('blog lists are one continuous ruled list with label meta', async ({ page }) => {
  // Rows slide in on load; measure them at rest.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of ['/blog/', '/tags/android/']) {
    await page.goto(route);
    const rows = page.locator('.post-list > .post-row');
    expect(await rows.count(), route).toBeGreaterThan(1);
    // Rows touch: each starts where the previous ends, so rules are never doubled.
    const [first, second] = [await rows.nth(0).boundingBox(), await rows.nth(1).boundingBox()];
    expect(Math.abs(second!.y - (first!.y + first!.height)), route).toBeLessThan(1);
    await expect(rows.first().locator('.label').first()).toHaveText(/^[A-Z][a-z]+ \d{1,2}, \d{4} · \d+ min/);
  }
});

test('label links lead with an icon for their purpose, not a generic arrow', async ({ page }) => {
  await page.goto('/');
  const rss = page.getByRole('link', { name: 'RSS Feed', exact: true });
  await expect(rss.locator('svg.lucide-rss')).toHaveCount(1);
  await expect(page.getByRole('link', { name: /^View All \d+ Articles$/ }).locator('svg.lucide-library')).toHaveCount(1);
  await expect(page.locator('.home-band').getByRole('link', { name: /^Read article/ }).first().locator('svg.lucide-book-open')).toHaveCount(1);
  // No label link falls back to a bare "→".
  for (const route of ['/', '/blog/', '/blog/windows-subsystem-for-linux-wsl/']) {
    await page.goto(route);
    expect(await page.locator('main .home-cta').evaluateAll((links) => links.filter((link) => link.textContent?.includes('→')).length), route).toBe(0);
  }
});

test('a listing\'s "Updated" date never splits across lines', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/blog/');
  const updated = page.locator('.post-row [data-updated]').first();
  await expect(updated).toBeVisible();
  // Every fragment (the text and its <time>) sits on the same line.
  const tops = await updated.evaluate((node) => [...new Set([...node.getClientRects()].map((rect) => Math.round(rect.top)))]);
  expect(tops).toHaveLength(1);
});

test('article headers use the same uppercase meta label as the listings', async ({ page }) => {
  await page.goto('/blog/features-that-are-nice-to-have-e1-mobile-madness/');
  const meta = page.locator('article header [data-post-meta]');
  await expect(meta).toHaveText(/^May 15, 2020 · \d+ min read · Updated February 11, 2022$/);
  await expect(meta).toHaveClass(/label/);
  await expect(meta.locator('svg')).toHaveCount(0);
  await page.goto('/blog/');
  await expect(page.locator('.post-row [data-post-meta]').first()).toHaveClass(/label/);
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

test('the site is set in Instrument Sans like nirmalkatariya.com', async ({ page }) => {
  await page.goto('/');
  const fonts = await page.evaluate(() => ({
    body: getComputedStyle(document.body).fontFamily,
    heading: getComputedStyle(document.querySelector('h1')!).fontFamily,
  }));
  expect(fonts.body).toContain('Instrument Sans');
  expect(fonts.heading).toContain('Instrument Sans');
  await expect.poll(() => page.evaluate(() => document.fonts.check('500 1rem "Instrument Sans Variable"'))).toBe(true);
});
