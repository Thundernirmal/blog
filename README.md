# Nirmal's Notes

A static Astro 7 blog for practical notes about software, hardware, Linux, and developer tools. The interface follows the dark Catppuccin Mocha terminal aesthetic of `zsh-web`, with local fonts, accessible shadcn primitives, full-text Pagefind search, and no runtime backend.

The approved product and technical decisions live in [SPEC.md](./SPEC.md).

## Requirements

- Node.js 22.12 or newer
- npm 10.9 or newer

## Local development

```sh
npm install
npx playwright install chromium firefox
npm run dev
```

Astro serves the site at `http://localhost:4321`. Useful checks:

```sh
npm run check
npm run build
npm run check:external-links
npm run test:e2e
npm test
```

CI also runs WebKit. To include it locally, install Playwright’s WebKit system dependencies and run `PLAYWRIGHT_ALL_BROWSERS=1 npm test`.

The production build is written to `dist/`. Pagefind runs after Astro and adds its static search index to `dist/pagefind/`.

## Writing an article

Create `src/content/blog/<slug>/index.md`. Keep article images beside the Markdown file so Astro can optimize them at build time.

```yaml
---
title: "Article title"
description: "A concise search and social description."
slug: "article-slug"
publishedAt: "2026-08-09T00:00:00.000Z"
updatedAt: "2026-08-09T00:00:00.000Z"
draft: false
tags: ["astro", "web-development"]
---
```

Optional fields are documented and validated in `src/content.config.ts`. Drafts are excluded from lists, feeds, search, and production routes.

## Medium import

The importer reads Nirmal's Medium RSS feed, converts supported HTML to Markdown, removes tracking parameters and pixels, and downloads article images locally.

```sh
npm run import:medium
```

Existing Medium IDs are skipped, making the normal command safe to run repeatedly. Use `--force` only when intentionally regenerating imported Markdown; it overwrites editorial cleanup in matching posts.

```sh
npm run import:medium -- --force
```

Review `scripts/medium-import-report.json` after each run, then check descriptions, heading hierarchy, code fences, image alt text, and outbound links before publishing.

## Cloudflare Pages

Create a Pages project connected to this repository with:

- Framework preset: Astro
- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Node version: `22.12.0` (from `.node-version`)

No Cloudflare adapter is needed because the site is fully static. The committed `public/_headers` file supplies security and cache headers. Add `blog.nirmalkatariya.com` as the custom domain after the first successful deployment and confirm the DNS record offered by Pages.

Before production, update `SITE.githubUrl` in `src/config.ts` if the repository location differs, and verify `SITE.url` matches the final canonical domain.

## Structure

```text
src/
  components/       Layout, blog, SEO, and shadcn UI primitives
  content/blog/     Markdown articles with colocated images
  layouts/          Shared page and article layouts
  lib/              Content, dates, reading-time, and class helpers
  pages/            Static Astro routes, RSS, and robots.txt
  styles/           Catppuccin design tokens and prose styles
scripts/            Medium importer and its report
tests/e2e/          Playwright and axe accessibility tests
public/             Static icons, social image, and Pages headers
```
