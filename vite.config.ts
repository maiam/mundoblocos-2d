import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  assetsInclude: ['**/*.glb'], // modelos 3D (Farejador de Duna com rig, ADR 0064) são arquivos separados, como as imagens
  build: {
    // As imagens saem como arquivos separados (ADR 0013); o JS (código) fica pequeno e entra embutido no HTML do
    // Artifact. O aviso padrão de 500 kB vale para o código.
    // Artefatos de mundo fixo precisam de um único JS embutível no HTML.
    // No site genérico, os imports são CHUNKS separados: Three.js baixa só
    // para o Santuário. O Mundo principal não transfere nem executa WebGL.
    rollupOptions: {
      output: { inlineDynamicImports: process.env.VITE_WORLD === 'principal' },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
