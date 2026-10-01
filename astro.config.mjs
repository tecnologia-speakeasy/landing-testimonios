// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // La landing es estática (se genera en el build, con sus imágenes ya
  // optimizadas); solo /api/estudiante corre en servidor (`prerender = false`).
  adapter: vercel(),
  vite: {
    plugins: [tailwindcss()],
  },
});
