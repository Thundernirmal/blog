// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import expressiveCode from 'astro-expressive-code';
import tailwindcss from '@tailwindcss/vite';
import { unified } from '@astrojs/markdown-remark';

function rehypeAccessibleTables() {
  /** @param {{ children?: Array<Record<string, any>> }} tree */
  return (tree) => {
    /** @param {Record<string, any>} node */
    const wrapTables = (node) => {
      if (!Array.isArray(node.children)) return;
      node.children = node.children.map((child) => {
        if (child.type === 'element' && child.tagName === 'table') {
          return {
            type: 'element',
            tagName: 'div',
            properties: {
              className: ['table-scroll'],
              role: 'region',
              ariaLabel: 'Scrollable data table',
              tabIndex: 0,
            },
            children: [child],
          };
        }
        wrapTables(child);
        return child;
      });
    };
    wrapTables(tree);
  };
}

export default defineConfig({
  site: 'https://blog.nirmalkatariya.com',
  output: 'static',
  trailingSlash: 'always',
  prefetch: true,
  image: {
    layout: 'constrained',
    responsiveStyles: true,
  },
  markdown: {
    processor: unified({ rehypePlugins: [rehypeAccessibleTables] }),
  },
  integrations: [
    expressiveCode({
      themes: ['catppuccin-mocha'],
      defaultLocale: 'en-US',
      defaultProps: { wrap: true },
      emitExternalStylesheet: true,
      styleOverrides: {
        borderRadius: '0.5rem',
        codeFontFamily: 'var(--font-mono)',
        codeFontSize: '0.875rem',
        codeLineHeight: '1.7',
        borderColor: 'var(--border)',
        frames: {
          shadowColor: 'transparent',
        },
      },
    }),
    react(),
    sitemap({
      filter: (page) => {
        const pathname = new URL(page).pathname;
        const isTagDetailPage = pathname.startsWith('/tags/') && pathname !== '/tags/';
        return pathname !== '/search/' && !isTagDetailPage;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
