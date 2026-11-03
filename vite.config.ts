import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: {
    // As imagens saem como arquivos separados (ADR 0013); o JS (código) fica pequeno e entra embutido no HTML do
    // Artifact. O aviso padrão de 500 kB vale para o código.
    // Um único JS (embutido no HTML do Artifact): o pacote de arte do mundo, importado dinamicamente, entra no mesmo
    // bundle; com VITE_WORLD fixo, só o do mundo escolhido (ADR 0010).
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
