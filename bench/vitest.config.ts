import { defineConfig } from 'vitest/config';
// Vitest 5: benchmarks ficam num projeto próprio, escolhido por `benchmark.include` (não por `test.include`), e
// rodam com `vitest bench`. O rastreamento de "export getters" (aviso do Vitest) pesa na medição: desligado, os
// números batem com os do Vitest 3 (~0,08 ms por chunk).
export default defineConfig({
  test: {
    include: [],
    reporters: ['verbose'],
    benchmark: { include: ['bench/**/*.bench.ts'], suppressExportGetterWarnings: true },
  },
});
