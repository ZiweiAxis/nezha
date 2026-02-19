import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://ziwei-ai.github.io',
  base: '/',
  output: 'static',
  build: {
    format: 'file'
  }
});
