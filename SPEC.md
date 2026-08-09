# Nirmal's Notes — Astro 7 Blog Specification

**Status:** Approved; implementation complete, deployment pending  
**Date:** 2026-08-09  
**Implementation gate:** Approved by the user on 2026-08-09. The site implementation, Medium migration, and Cloudflare Pages configuration are authorized by this specification.

## 1. Executive Summary

Build a fast, static personal blog with Astro 7 and deploy it to Cloudflare Pages. The site will feel like a sibling of the local `zsh-web` project: Catppuccin Mocha, the same typography, semantic color tokens, Base Nova shadcn components, compact navigation, terminal-inspired details, rounded bordered surfaces, and restrained motion.

The blog will not be a clone of a generic theme. It will use patterns validated in AstroPaper, Astro Cactus, and Tone—type-safe content, accessible long-form reading, search, table of contents, RSS, sitemap, pagination, and SEO—inside the existing Nirmal visual language.

The 4 public stories currently available from the Medium RSS feed will be imported once into local Markdown, with 18 article images downloaded into the repository. Builds will never depend on Medium. Original URLs, dates, tags, captions, and attribution will be preserved, while tracking pixels and Medium-specific markup will be removed.

## 2. Proposed Product Identity

These are defaults to approve or replace before implementation:

| Field | Proposed value |
| --- | --- |
| Site name | **Nirmal's Notes** |
| Tagline | **Practical notes on software, hardware, Linux, and the tools in between.** |
| Author | **Nirmal Katariya** |
| Canonical URL | **https://blog.nirmalkatariya.com** |
| Source repository | **https://github.com/Thundernirmal/blog** |
| Existing publication | **https://medium.com/@katariya_nirmal** |
| Language | English (`en`) |
| Initial theme | Dark only, matching `zsh-web` |

The implementation must keep site identity in one typed configuration module so the name, description, URL, author, and social links are not duplicated across layouts and feeds.

## 3. Goals

1. Match `zsh-web` closely enough that both sites are visibly part of one system.
2. Make articles comfortable to read on phones, tablets, and desktops.
3. Keep the primary experience static and useful without client-side JavaScript.
4. Store all posts and images locally in version control using a typed Astro content collection.
5. Import the current Medium archive with high fidelity and a repeatable, reviewable workflow.
6. Provide first-class discovery through archives, tags, full-text search, RSS, sitemap, and social metadata.
7. Meet WCAG 2.2 AA expectations and maintain high Lighthouse scores.
8. Deploy predictably to Cloudflare Pages with preview deployments.

## 4. Non-goals for v1

- No headless CMS, database, server rendering, Pages Functions, authentication, or admin UI.
- No comments, reactions, webmentions, newsletter, or contact form.
- No light-theme toggle; `zsh-web` is intentionally dark-only. This can be reconsidered later.
- No separate notes, projects, or portfolio collections.
- No automated rewriting of old Medium articles. Import fidelity comes before editorial changes.
- No live dependency on Medium during development, build, or runtime.
- No analytics by default. Cloudflare Web Analytics can be added later only after an explicit privacy decision.
- No per-post generated social image in v1; one polished branded fallback image is sufficient.

## 5. Research Findings and Decisions

### 5.1 Local `zsh-web` reference

The reference project is already Astro 7 with Tailwind CSS 4, React islands, shadcn Base Nova using Base UI, and Lucide icons. Its strongest reusable decisions are:

- Catppuccin Mocha semantic tokens rather than page-specific colors.
- Outfit for display text, Plus Jakarta Sans for body text, and JetBrains Mono for code.
- A `max-width: 1000px` page shell with responsive `16/24/32px` side padding.
- Dark `base` background, `mantle` cards, `surface` borders, and mauve primary actions.
- Sticky, translucent navigation; clear active state; skip link; semantic landmarks.
- CSS-first motion with a global reduced-motion fallback.
- Astro for static structure and client islands only for stateful interactions.

The blog will reuse those decisions, not copy unrelated command/tip UI or shell data extraction.

Core palette contrast is already strong: body text on base is approximately `11.34:1`, muted text on base `7.37:1`, and mauve on base `8.07:1`.

### 5.2 Astro blog benchmarks

| Reference | Useful pattern | Decision for this site |
| --- | --- | --- |
| [AstroPaper](https://github.com/pagescms/astro-blog-template) | Type-safe Markdown, drafts, pagination, accessible navigation, RSS, sitemap, search, SEO | Adopt the content, archive, accessibility, and metadata patterns; do not reuse its visual theme. |
| [Astro Cactus](https://github.com/chrismwilliams/astro-theme-cactus) | Pagefind search, tags, Expressive Code, semantic markup, static generation | Adopt Pagefind, strong code blocks, and static search indexing; defer webmentions and notes. |
| [Tone](https://astro.build/themes/details/tone/) | Token-driven design, sticky TOC rail, Pagefind, JSON-LD, quiet long-form layout | Adopt token theming, responsive TOC, and structured data; defer comments and theme switching. |

The result should be intentionally smaller than these general-purpose themes. Features only enter v1 if they improve publishing, reading, discovery, accessibility, or deployment.

### 5.3 Platform decision

Use Astro's default static output. Cloudflare's Pages guide supports a standard `npm run build` with `dist` as the output directory. The Cloudflare adapter is only needed for SSR/dynamic behavior and will not be installed for v1.

This honors the requested Cloudflare Pages target even though Astro's general Cloudflare guide now recommends Workers for many new full-stack projects. The architecture remains portable because it is entirely static.

## 6. Information Architecture

| Route | Purpose |
| --- | --- |
| `/` | Brand introduction, latest 3 posts, and a clear link to the archive. |
| `/blog/` | Reverse-chronological article archive; 10 posts per page. |
| `/blog/page/[page]/` | Static archive pagination starting at page 2. |
| `/blog/[slug]/` | Individual article. |
| `/tags/` | Alphabetical tag index with post counts. |
| `/tags/[tag]/` | Posts for one tag, newest first. |
| `/search/` | Full-text Pagefind search with query in `?q=`. |
| `/about/` | Short author profile, topics, GitHub, Medium, and RSS links. |
| `/rss.xml` | RSS feed for published posts. |
| `/robots.txt` | Generated robots policy referencing the sitemap. |
| `/sitemap-index.xml` | Generated by the official Astro sitemap integration. |
| `/404.html` | Branded, helpful static not-found page. |

All public HTML routes use trailing slashes and canonical URLs. Drafts must never enter routes, search, RSS, or sitemap production output.

## 7. Page Specifications

### 7.1 Shared shell

- Visible skip link targeting the single page `<main>`.
- Sticky header using the same translucent base background and border treatment as `zsh-web`.
- Brand: terminal icon plus “Nirmal's Notes.”
- Primary links: Home, Blog, Tags, About.
- Search link includes a `⌘ K`/`Ctrl K` hint on desktop; the shortcut navigates to `/search/` and focuses the search input only when invoked by keyboard.
- External GitHub link has a visible label and external-link indication.
- Footer links to the author site, source repository, Medium profile, and RSS.
- Exactly one `<main>` landmark; page layouts must not nest another `<main>`.

### 7.2 Home

- Hero heading and tagline using the existing `PageHeader` visual language.
- Small terminal-inspired surface such as `nirmal@Tiger ~/notes` with a static latest-post prompt. It must not simulate typing or loop animation.
- “Latest Writing” section with the newest 3 published posts.
- Each card includes title, description, date, reading time, and up to 3 tags.
- “View All Articles” primary action.
- No newsletter or decorative dashboard statistics.

### 7.3 Blog archive

- Page title, short description, article count.
- Reverse chronological list using a calm one-column layout; no image-heavy masonry grid.
- Pagination uses real links with previous/next labels and `aria-current` for the active page.
- Empty state is implemented with the shadcn `Empty` component if filters/content ever produce no posts.

### 7.4 Article

- Breadcrumb: Home → Blog → Article.
- One `<h1>`, followed by description, publication date, optional update date, reading time, and tags.
- Migrated posts show a neutral provenance callout linking to the original Medium story. Because the posts are older, the callout also notes that technical details may have changed.
- Reading column targets `65–72ch`; surrounding layout remains within the 1000px site shell.
- Desktop: article body plus a sticky TOC rail when there are at least 3 level-2/3 headings.
- Mobile/tablet: TOC becomes a native `<details>` disclosure above the body.
- Heading anchors receive `scroll-margin-top`; focus/target states remain visible below the sticky header.
- Figures preserve images, useful alt text, captions, and source attribution.
- Code blocks use a Catppuccin Mocha syntax theme, visible language/title where available, horizontal overflow, and an accessible copy action.
- Tables scroll inside their own labelled region on narrow screens instead of forcing page overflow.
- Footer includes tags, previous/next chronological article links, and “Edit on GitHub.”
- External links are not forced into a new tab inside article prose.

### 7.5 Search

- Pagefind indexes only the `<main>` article content and selected metadata, excluding header, footer, TOC, and repeated provenance UI.
- Search loads its index only on `/search/`; no Pagefind JavaScript is shipped on normal article pages.
- Query state is reflected in `?q=` so results are shareable and browser back/forward works.
- Result includes title, excerpt, date, and tags; matching terms are announced accessibly and not communicated by color alone.
- Empty query and zero-result states have useful instructions.
- Pagefind's accessible component system is preferred over a custom combobox implementation.

### 7.6 About and 404

- About copy stays concise: author identity, subjects, links, and the relationship to `zsh-web`/Nirmal's Shell.
- 404 uses the terminal motif, explains what happened, and links to Home, Blog, and Search.
- No fake command input or dead interactive control.

## 8. Visual Design System

### 8.1 Tokens

Copy the semantic token mapping from `zsh-web`, including:

- Background: Catppuccin `base` (`#1e1e2e`).
- Card/popover: `mantle` (`#181825`).
- Strong inset/terminal surface: mixed `crust`/`mantle`.
- Foreground: `text` (`#cdd6f4`).
- Muted foreground: `subtext0` (`#a6adc8`).
- Primary/focus: `mauve` (`#cba6f7`).
- Border/input: `surface1` (`#45475a`).
- Radius: `0.5rem`, with shadcn-derived radius scale.

Article-specific semantic accents use existing Catppuccin values, not raw Tailwind colors: links/anchors mauve, informational callouts blue, warnings peach/yellow, and destructive states red.

### 8.2 Typography

- Display/headings: Outfit, weights 600 and 800.
- Body/UI: Plus Jakarta Sans, weights 400–600.
- Code: JetBrains Mono, weights 400–500.
- Fonts are self-hosted and subset where practical; no runtime Google Fonts request.
- Preload only the critical body/display WOFF2 files and use `font-display: swap`.
- Body text is 16px minimum with roughly 1.75 line height in article prose.
- Headings use balanced wrapping; paragraphs use pretty wrapping where supported.
- Dates are rendered with `Intl.DateTimeFormat`, not hardcoded date formatting.

### 8.3 Components and shadcn usage

Use the same shadcn configuration as `zsh-web`: Base Nova, Base UI, Tailwind 4, CSS variables, Lucide, non-RSC, `@` aliases.

Initial shadcn source components:

- `button` for actions/navigation variants.
- `card` for home/article cards with complete header/content/footer composition.
- `badge` for tags and post status.
- `separator` for structural dividers.
- `kbd` for the search shortcut.
- `empty` for genuine empty states.
- `alert` for imported/archived content callouts.

The implementation must run `npx shadcn@latest docs` for every selected component before adding it, add components through the CLI, and inspect generated files. Semantic tokens and built-in variants take precedence over color overrides. Astro owns static layout; React components render server-side unless interaction truly requires hydration.

### 8.4 Motion

- Optional first-load entrance motion is limited to opacity/transform on the home hero and card list.
- No animation in the article body.
- No `transition: all`.
- Global `prefers-reduced-motion: reduce` fallback matches `zsh-web`.
- Standard document navigation is preferred over a global client router in v1.

## 9. Content Model

Define the `blog` collection in `src/content.config.ts` using Astro 7's `glob()` loader and a strict `astro/zod` schema.

| Field | Type | Rule |
| --- | --- | --- |
| `title` | string | Required; unique within the site. |
| `description` | string | Required; 50–180 characters preferred. |
| `publishedAt` | coerced date | Required. |
| `updatedAt` | coerced date | Optional; only display when later than publication. |
| `draft` | boolean | Defaults to `false`. |
| `tags` | string array | Defaults to `[]`; normalized lowercase slugs. |
| `heroImage` | Astro local image | Optional. |
| `heroAlt` | string | Required when `heroImage` exists. |
| `originalUrl` | URL string | Optional; used for migrated content provenance. |
| `mediumId` | string | Optional; stable import identity. |
| `archived` | boolean | Defaults to `false`; true for dated guidance needing a warning. |

Additional derived data—not frontmatter—is calculated centrally: slug/URL, reading time, formatted dates, related posts, and previous/next posts.

Content location:

```text
src/content/blog/
  article-slug/
    index.md
    image-01.webp
    image-02.png
```

Use Markdown for v1. MDX is not installed until a real article needs interactive components.

## 10. Medium Migration Specification

### 10.1 Current public inventory

The RSS feed currently exposes these 4 stories:

| Published | Title | Medium tags |
| --- | --- | --- |
| 2022-01-25 | Noob’s point of view on Cryptocurrency | nft, bitcoin, cryptocurrency |
| 2020-06-02 | Windows Subsystem for Linux (WSL) | windows, android, windows-10, ubuntu, wsl |
| 2020-05-15 | Features That are nice to have — E1 Mobile Madness | nokia, android, redmi, smartphones, oneplus |
| 2020-03-27 | Guide to computer storage | computers, ssd, guides-and-tutorials, hdd, technology |

Across the feed there are 18 article figures and 4 Medium tracking pixels. The 17 unique Medium tags will initially be preserved; tag cleanup can happen as an editorial change after the fidelity review.

### 10.2 Importer

Create a manual script at `scripts/import-medium.mjs` with an explicit `npm run import:medium` command. It must not run during normal development or Cloudflare builds.

Importer behavior:

1. Fetch `https://medium.com/feed/@katariya_nirmal` and parse the RSS/CDATA safely.
2. Use Medium's stable post ID as the idempotency key.
3. Convert article HTML to readable GitHub-flavored Markdown.
4. Preserve heading order, paragraphs, emphasis, lists, blockquotes, links, code, figures, captions, and attribution.
5. Remove Medium tracking pixels, UI markup, and `?source=rss...` tracking parameters.
6. Download every content image locally using deterministic names. The final site must not hotlink Medium's CDN.
7. Preserve original publication/update dates, original URL, Medium ID, and tags in frontmatter.
8. Derive a short description from the opening paragraph, then flag it for human review.
9. Refuse to overwrite an existing post unless an explicit `--force` option is supplied.
10. Produce a migration report listing imported posts, images, empty alt text, failed downloads, conversion warnings, and external links.

### 10.3 Manual fidelity and accessibility pass

- Compare every local article against the Medium source in order.
- Inspect all 18 content images; write useful alt text for informative images and use empty alt only for decorative images.
- Keep all photo/source attribution and figure captions.
- Correct conversion damage such as broken lists or adjacent code blocks, but do not silently modernize claims or rewrite the author's voice.
- Mark old technical guidance `archived: true` where it could be mistaken for current instructions.
- Check all external links; report dead or redirected sources instead of silently changing citations.
- After launch, update each Medium story's canonical link to the new blog URL. Medium documents this as an author-only manual action, so it is not automated.

## 11. Project Structure

```text
blog/
├── public/
│   ├── _headers
│   ├── favicon.svg
│   ├── favicon.png
│   └── og-default.png
├── scripts/
│   └── import-medium.mjs
├── src/
│   ├── components/
│   │   ├── blog/
│   │   │   ├── PostCard.astro
│   │   │   ├── PostMeta.astro
│   │   │   ├── PostNavigation.astro
│   │   │   ├── TableOfContents.astro
│   │   │   └── TagList.astro
│   │   ├── layout/
│   │   │   ├── Footer.astro
│   │   │   ├── Header.astro
│   │   │   ├── PageHeader.astro
│   │   │   └── TerminalMark.astro
│   │   ├── seo/
│   │   │   └── SEO.astro
│   │   └── ui/
│   │       └── shadcn source components
│   ├── content/
│   │   └── blog/
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   └── PostLayout.astro
│   ├── lib/
│   │   ├── content.ts
│   │   ├── dates.ts
│   │   ├── reading-time.ts
│   │   └── utils.ts
│   ├── pages/
│   │   ├── blog/
│   │   │   ├── index.astro
│   │   │   ├── [slug].astro
│   │   │   └── page/[page].astro
│   │   ├── tags/
│   │   │   ├── index.astro
│   │   │   └── [tag].astro
│   │   ├── 404.astro
│   │   ├── about.astro
│   │   ├── index.astro
│   │   ├── robots.txt.ts
│   │   ├── rss.xml.ts
│   │   └── search.astro
│   ├── styles/
│   │   └── global.css
│   ├── config.ts
│   └── content.config.ts
├── tests/
│   └── e2e/
├── astro.config.mjs
├── components.json
├── package.json
├── tsconfig.json
└── SPEC.md
```

The exact component split may be consolidated during implementation when a file would otherwise be trivial, but route boundaries, collection ownership, and the single global token file remain fixed.

## 12. Technical Architecture

### 12.1 Runtime and dependencies

- Node.js `>=22.12.0`, matching `zsh-web` and pinned for Cloudflare builds.
- npm with a committed lockfile and `npm ci` in CI.
- Astro 7 static output.
- Tailwind CSS 4 through `@tailwindcss/vite`.
- React integration only for server-rendered shadcn source components; no hydration unless required.
- shadcn Base Nova/Base UI and Lucide icons.
- Official `@astrojs/sitemap` and `@astrojs/rss` packages.
- Pagefind runs after Astro build and writes its static index into `dist/pagefind`.
- `astro-expressive-code` for Catppuccin Mocha syntax highlighting, labelled code frames, overflow handling, and copy controls. Its current peer range explicitly includes Astro 7; configuration remains build-time and article code stays readable without JavaScript.
- Import-only tooling for RSS parsing, HTML cleanup, HTML-to-Markdown conversion, and local image download.

Dependency versions are selected and locked at implementation time after compatibility checks; the major platform constraint is Astro 7.

### 12.2 Rendering and JavaScript budget

- All pages and posts are prerendered at build time.
- Navigation, pagination, tags, TOC disclosure, and article reading work with JavaScript disabled.
- Pagefind assets load only on the search route.
- No global React hydration and no global view-transition router.
- Home/article initial JavaScript target: effectively zero application JS beyond Astro-required static behavior.

### 12.3 Images

- Imported article images live beside each post and use Astro's local image pipeline.
- Every rendered image has intrinsic dimensions to prevent layout shift.
- Below-fold images are lazy loaded; above-fold hero images, when present, receive appropriate priority.
- Generate efficient WebP/AVIF candidates where Astro supports the source format, while keeping a compatible fallback.
- Captions wrap safely and long URLs cannot create horizontal page overflow.

### 12.4 SEO and syndication

- Centralized title template, description, canonical, Open Graph, and Twitter card metadata.
- `Blog` JSON-LD on the site and `BlogPosting` JSON-LD on articles.
- Published/updated dates use ISO values in metadata and `<time datetime>` in UI.
- Branded `og-default.png` in the same Catppuccin/terminal visual language.
- RSS includes title, description, canonical link, published date, and categories for every non-draft article.
- Official sitemap integration includes all public static routes.
- `robots.txt` is generated from the configured site URL and references the sitemap.
- Feed and sitemap discovery links appear in `<head>`.

### 12.5 Security and privacy

- No runtime third-party scripts, analytics, trackers, external fonts, or Medium image requests.
- Cloudflare `_headers` sets `X-Content-Type-Options`, a conservative `Referrer-Policy`, `Permissions-Policy`, and clickjacking protection.
- A Content Security Policy is added only after validating Astro/Pagefind output so it does not ship in a knowingly broken state.
- External links from author-controlled UI use safe `rel` values when opening a new tab.

## 13. Accessibility and Web Interface Requirements

Target WCAG 2.2 AA and apply the current Web Interface Guidelines during implementation review.

Required behaviors:

- Semantic header/nav/main/footer landmarks and hierarchical headings.
- Visible skip link and visible `:focus-visible` treatment on every interactive element.
- No `outline: none` without an equal or stronger replacement.
- All icon-only controls have accessible names; decorative icons are hidden from assistive tech.
- Native links for navigation and buttons only for actions.
- Minimum practical touch target of 44×44px for primary controls.
- Images have dimensions and meaningful alt decisions.
- Heading anchors have scroll offset for the sticky header.
- Search updates/results use appropriate live-region behavior.
- `color-scheme: dark`, matching theme color metadata, and intentional tap highlight.
- No disabled zoom, blocked paste, keyboard traps, color-only meaning, or unexpected auto-focus on mobile.
- Content handles 320px width, long titles, long code, tables, and long URLs without page-level horizontal scrolling.
- Animation uses opacity/transform, is interruptible, and honors reduced motion.
- Dates use `Intl`; loading/empty/error text gives a clear next step.

## 14. Performance Targets

Measured against a production Cloudflare preview on representative mobile and desktop profiles:

- Lighthouse Performance: **≥95**.
- Lighthouse Accessibility: **100 target; ≥95 release gate**.
- Lighthouse Best Practices: **≥95**.
- Lighthouse SEO: **≥95**.
- Core Web Vitals targets: LCP `<2.5s`, CLS `<0.1`, INP `<200ms` at the 75th percentile when real-user data exists.
- Home/article application JavaScript: no hydrated app bundle.
- Search code and index are lazy and isolated to `/search/`.
- No unoptimized remote article images or render-blocking external font requests.

## 15. Testing and Quality Gates

### Automated

- `astro check` passes with no errors.
- Production `astro build` plus Pagefind indexing completes from a clean install.
- Content schema rejects missing titles, descriptions, dates, or image alt metadata.
- E2E smoke tests cover home, archive, one article, tags, search, pagination behavior, and 404.
- Axe checks cover the shared shell and representative pages.
- Keyboard test covers skip link, navigation, search shortcut, search results, TOC disclosure, and pagination.
- Internal-link crawl reports zero broken links.

### Manual

- Viewports: 320px, 375px, 768px, 1024px, and 1440px.
- Current Chromium, Firefox, and Safari/WebKit.
- Reduced motion, keyboard-only navigation, 200% zoom, and forced long-content cases.
- Compare all 4 imported posts and 18 figures with Medium.
- Inspect Cloudflare preview headers, 404 behavior, RSS, sitemap, canonical URLs, and social metadata.
- Run the current Web Interface Guidelines review across all UI files and resolve all actionable findings.

## 16. Cloudflare Pages Deployment

Deployment model: Git-connected Cloudflare Pages project.

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Install | `npm ci` (managed by Pages) |
| Build command | `npm run build` |
| Build output | `dist` |
| Node | `22.12.0` or the approved later Node 22 release |
| Adapter | None; static output |

Additional rules:

- Every pull request gets a Pages preview deployment before production merge.
- The custom domain is attached only after the preview passes acceptance checks.
- `site` in `astro.config.mjs` must equal the final canonical production URL before launch.
- Cache hashed `/_astro/*` assets as immutable; use shorter safe caching for HTML, RSS, sitemap, and Pagefind metadata.
- The static Astro `404.html` must be verified on the deployed Pages hostname.

## 17. Implementation Sequence After Approval

1. **Foundation:** scaffold Astro 7, TypeScript strict mode, npm/Node constraints, Tailwind 4, aliases, shadcn config, and base checks.
2. **Design system:** port semantic tokens, self-host fonts, shared shell, header/footer, skip link, focus, and responsive primitives.
3. **Content system:** define collection/schema, content utilities, post/archive/tag routes, layouts, reading time, TOC, pagination, and drafts.
4. **Medium migration:** implement importer, import 4 stories and 18 images, then complete the fidelity/alt-text/link review.
5. **Discovery and SEO:** search, RSS, sitemap, robots, JSON-LD, canonical metadata, social image, and branded 404.
6. **Quality:** automated checks, browser/a11y review, performance pass, and content audit.
7. **Deployment handoff:** Cloudflare Pages configuration, preview verification, custom-domain readiness, and launch checklist.

No phase includes committing, pushing, opening a PR, or changing Cloudflare account state unless separately requested.

## 18. Definition of Done

The implementation is complete when:

- The design reads as a sibling of `zsh-web`, using the same tokens, fonts, component language, and interaction restraint.
- All specified routes build statically and work without JavaScript except full-text search enhancement.
- All 4 public Medium articles are present, ordered correctly, locally imaged, and fidelity-reviewed.
- All 18 content figures are local; all 4 Medium tracking pixels are absent.
- Every image has an intentional alt decision and retained caption/credit where applicable.
- Drafts are excluded from production pages, search, RSS, and sitemap.
- Search, RSS, sitemap, robots, canonical metadata, JSON-LD, and 404 work on a production build.
- Automated and manual quality gates pass, with no console errors or internal broken links.
- Cloudflare Pages preview deploys successfully from `main` settings with `dist` output.
- README documents local development, writing a post, importing Medium, validation, and deployment.

## 19. Approval Gate

Implementation may begin only after approval of this document and confirmation of these 3 defaults:

1. Site name: **Nirmal's Notes**.
2. Canonical domain: **https://blog.nirmalkatariya.com**.
3. Theme: **dark-only Catppuccin Mocha in v1**.

If the response is simply **“Approve the spec”**, all 3 proposed defaults are considered approved. Requested changes will be incorporated into this document before implementation starts.

## 20. Research Sources

- Local reference: `/home/nirmal/projects/zsh-web`
- [Astro content collections](https://docs.astro.build/en/guides/content-collections/)
- [Astro content API](https://docs.astro.build/en/reference/modules/astro-content/)
- [Astro RSS recipe](https://docs.astro.build/en/recipes/rss/)
- [Astro sitemap integration](https://docs.astro.build/en/guides/integrations-guide/sitemap/)
- [Cloudflare Pages: Astro](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/)
- [Pagefind component UI](https://pagefind.app/docs/search-ui/)
- [Medium canonical links](https://help.medium.com/hc/en-us/articles/360033930293-Set-a-canonical-link)
- [Medium RSS archive](https://medium.com/feed/@katariya_nirmal)
- [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md)
