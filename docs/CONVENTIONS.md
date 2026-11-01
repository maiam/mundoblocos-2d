# Convenções

- TypeScript estrito, ES modules, sem framework. Código e identificadores em inglês; textos de UI,
  comentários e docs em pt-BR.
- Coordenadas: `x` → direita, `y` → **para baixo**. Unidade de mundo = bloco; pixels de mundo = bloco × `TILE`.
- Conversão bloco↔chunk **sempre** via `world/coords.ts` (`toChunk`, `toLocal`, `chunkKey`).
- Toda aleatoriedade do mundo deriva da seed (`random.ts`/`noise.ts`). Nunca `Math.random()` em `world/`
  (permitido apenas em efeitos visuais efêmeros, ex.: partículas).
- Propriedades de bloco em `world/blocks.ts`; aparência em `render/textures.ts`, indexada pelo mesmo id.
  Novo bloco = entrada nos dois lugares.
- Estilo visual: contornos e sombras em tons de índigo (`shade()`), nunca preto puro; luz vem de cima-esquerda;
  brilhos em estrela de 4 pontas para materiais mágicos/especulares.
- Mutação de chunk só via `World.setBlock` (garante `version` e invalidação dos vizinhos).
- Testes do domínio em `src/**/*.test.ts` (Vitest, ambiente Node).
