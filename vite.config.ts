import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: {
    // Os sprites entram embutidos (?inline) para o build de arquivo único (Artifact):
    // o bundle passa de 500 kB por design. Limite = meta de < 3 MB por artefato (principal ~2,87 MB, só a arte dele — ADR 0010), para
    // que o aviso volte a aparecer se os assets crescerem demais.
    chunkSizeWarningLimit: 2950,
    // Um único JS (o artefato é um HTML de arquivo único): o pacote de arte do mundo, importado dinamicamente,
    // entra no mesmo bundle; com VITE_WORLD fixo, só o do mundo escolhido.
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
