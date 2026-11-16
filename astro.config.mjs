// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://kinako890419.github.io',
  trailingSlash: 'always',
  i18n: {
    locales: ['zh-tw', 'en'],
    defaultLocale: 'zh-tw',
    // /en/... renders the zh-tw pages (same posts) with the English UI
    fallback: { en: 'zh-tw' },
    routing: { prefixDefaultLocale: false, fallbackType: 'rewrite' },
  },
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
    },
  },
});
