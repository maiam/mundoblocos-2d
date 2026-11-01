# Arquitetura

```
src/
  config.ts            constantes globais (TILE, CHUNK_SIZE, limites verticais, orçamentos)
  main.ts              bootstrap + seed via URL
  world/   (domínio — sem DOM)
    random.ts          PRNG mulberry32, hash2, seedFromString
    noise.ts           Perlin 1D/2D + fBm
    blocks.ts          registro de blocos (propriedades de domínio)
    biomes.ts          biomas e seleção por temperatura/umidade
    generator.ts       WorldGenerator: blockAt(x,y) PURO, generateChunk
    coords.ts          bloco ↔ chunk/local (seguro p/ negativos)
    chunk.ts           Chunk 16×16 (Uint8Array, modified, version)
    world.ts           World: chunks carregados, edições, regras quebrar/colocar, ciclo de vida
  render/  (apresentação — lê o domínio, nunca escreve)
    color.ts           utilitários de cor (sombras puxam para índigo)
    textures.ts        texturas procedurais por id de bloco
    chunkRenderer.ts   cache offscreen por chunk (invalidação por version)
    background.ts      céu, sol/lua, nuvens, montanhas, ilhas flutuantes
    particles.ts       partículas ambientes por bioma
    renderer.ts        frame: fundo → chunks → brilhos → tinta dia/noite → partículas → overlays
  game/    (orquestração)
    camera.ts          câmera 2D, zoom, retângulo de chunks visíveis
    game.ts            loop, input, carregamento/descarregamento, liga render e HUD
    hud.ts             overlay HTML (apenas apresentação)
```

## Fluxo de dados
1. `Game.frame` calcula o retângulo visível (+`LOAD_MARGIN`) e chama `World.ensureChunks` com orçamento
   (`MAX_CHUNK_GEN_PER_FRAME`). A cada 1s, `World.unloadFar` descarta chunks **não modificados** distantes.
2. `Renderer.draw` desenha cada chunk carregado via `ChunkRenderer` (re-render limitado a 3/frame).
3. Input → `World.breakBlock/placeBlock` (regras no domínio) → `chunk.version++` (+ vizinhos na borda) →
   cache do chunk invalidado automaticamente.

## Regras de dependência
- `world/` não importa de `render/` nem `game/` e não usa DOM (testável em Node).
- `render/` depende de `world/` só para leitura. `game/` orquestra ambos.
- Sem backend; nenhuma regra de negócio duplicada fora de `world/`.
