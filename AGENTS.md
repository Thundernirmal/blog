# Repository Guidelines

## Project Structure & Module Organization

This is a static Astro 7 blog. Application code lives in `src/`: Astro routes are in `src/pages`, shared layouts in `src/layouts`, reusable UI in `src/components`, helpers in `src/lib`, and global styles in `src/styles`. Blog posts belong in `src/content/blog/<slug>/index.md`; keep each post's images in the same directory. Static files such as icons, social images, and Cloudflare headers are in `public/`. Maintenance and import utilities are in `scripts/`, and browser tests are in `tests/e2e/`. Do not commit generated `dist/`, `public/pagefind/`, `.astro/`, or Playwright report directories.

## Build, Test, and Development Commands

Use Node.js 22.12+ and npm 10.9+.

- `npm install` installs dependencies; use `npm ci` in CI or for a clean lockfile-based install.
- `npm run dev` starts Astro at `http://localhost:4321` and prepares the local Pagefind index.
- `npm run check` runs Astro's TypeScript and content validation.
- `npm run build` creates the static site in `dist/` and builds its Pagefind index.
- `npm run test:e2e` runs Playwright tests against the built site.
- `npm test` runs validation, the production build, and end-to-end tests together.
- `npm run check:external-links` checks outbound links; use `npm run search:sync` after substantial article edits during development.

## Coding Style & Naming Conventions

Use two-space indentation, semicolons, and single quotes in TypeScript/JavaScript, matching the existing code. Keep TypeScript strict and use the `@/*` alias for imports from `src`. Name Astro/React components and layouts in PascalCase, helpers in camelCase, and article directories and slugs in lowercase kebab-case. Prefer accessible semantic HTML and existing Tailwind/shadcn patterns; no separate formatter or linter is configured, so preserve nearby formatting.

## Testing Guidelines

Playwright tests live in `tests/e2e/` and include axe accessibility checks. Use descriptive behavior-based names such as `search index returns imported articles`. Run `npm test` before submitting changes; for faster iteration use `npm run check` and `npm run test:e2e`. There is no configured coverage threshold. UI changes should include or update route, keyboard, responsive, or accessibility coverage where relevant.

## Commit & Pull Request Guidelines

Use short, imperative commit subjects consistent with history, for example `Add icons to tag buttons` or `Refactor SVG structure`. Keep commits focused. Pull requests should explain the user-visible or technical change, link the relevant issue when one exists, and report validation commands run. Include screenshots or recordings for visual changes and call out content, configuration, or deployment implications.
