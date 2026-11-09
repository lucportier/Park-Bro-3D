import { defineConfig } from 'vite';

export default defineConfig({
  // Chemins relatifs : le site doit marcher tel quel sur GitHub Pages.
  base: './',
  // Three.js seul pèse environ 530 ko (130 ko compressé) : c'est attendu.
  build: { chunkSizeWarningLimit: 700 },
});
