import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: {
    // Os sprites entram embutidos (?inline) para o build de arquivo único (Artifact):
    // o bundle passa de 500 kB por design. Limite acima do tamanho atual (principal ~2,63 MB, só a arte dele — ADR 0010) para
    // que o aviso volte a aparecer se os assets crescerem demais.
    chunkSizeWarningLimit: 2800,
    // Um único JS (o artefato é um HTML de arquivo único): o pacote de arte do mundo, importado dinamicamente,
    // entra no mesmo bundle; com VITE_WORLD fixo, só o do mundo escolhido.
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
