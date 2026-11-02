import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: {
    // Os sprites entram embutidos (?inline) para o build de arquivo único (Artifact):
    // o bundle passa de 500 kB por design. Limite acima do tamanho atual (~1,2 MB) para
    // que o aviso volte a aparecer se os assets crescerem demais.
    chunkSizeWarningLimit: 1800,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
