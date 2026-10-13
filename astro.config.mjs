import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://juhyeonni.github.io',
  base: '/blog',
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    },
  },
});
