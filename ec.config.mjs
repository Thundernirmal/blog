// @ts-check
import { defineEcConfig } from 'astro-expressive-code';

export default defineEcConfig({
  // Latte first so it is the default; the site's data-theme attribute selects a flavour, and
  // without one (no JavaScript yet) the dark-mode media query picks Mocha.
  themes: ['catppuccin-latte', 'catppuccin-mocha'],
  themeCssSelector: (theme) => `[data-theme="${theme.name.replace('catppuccin-', '')}"]`,
  useDarkModeMediaQuery: true,
  defaultLocale: 'en-US',
  defaultProps: { wrap: true },
  emitExternalStylesheet: true,
  styleOverrides: {
    borderRadius: '0',
    codeFontFamily: 'var(--font-mono)',
    codeFontSize: '0.875rem',
    codeLineHeight: '1.7',
    borderColor: 'var(--border)',
    frames: {
      shadowColor: 'transparent',
    },
  },
});
