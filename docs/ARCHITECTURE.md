# Arquitetura

Vista superior inclinada (3/4). Ver [ADR 0003](adr/0003-vista-superior-inclinada.md).

```
assets-src/*-sheet.png         folhas originais (heroína, ovelha; fundo claro, 4×4)
scripts/process-sprite.py      gera src/assets/*.png (transparente, quadros uniformes)
scripts/build-artifact.mjs     HTML de arquivo único a partir de dist/
src/
  config.ts            constantes (TILE, CUBE_FRONT, CHUNK_SIZE, orçamentos)
  main.ts              bootstrap + seed via URL
  assets/heroine.png, sheep.png   folhas processadas (importadas com ?inline)
  world/   (domínio — sem DOM)
    random.ts, noise.ts   PRNG/hash e Perlin + fBm com seed
    blocks.ts          registro de blocos: camada (chão/objeto), forma, sólido, etc.
    biomes.ts          biomas (chão, água, árvore, enfeites)
    generator.ts       WorldGenerator: groundAt/objectAt PUROS, generateChunk
    coords.ts          célula ↔ chunk/local (seguro p/ negativos)
    chunk.ts           Chunk 16×16 com camadas ground/objects, modified, version
    world.ts           World: chunks, edições, isWalkable, quebrar/colocar, spawn, ciclo de vida
  render/  (apresentação — lê o domínio, nunca escreve)
    color.ts           utilitários de cor
    textures.ts        chão (variações), cubos 3/4, árvores, enfeites, ícones
    chunkRenderer.ts   cache offscreen do CHÃO por chunk (barrancas, espuma, grade, sombras)
    character.ts       folhas de sprite dos atores (heroína, ovelha): linha por direção, quadro por caminhada
    daycycle.ts        tinta do ciclo dia/noite
    particles.ts       partículas ambientes por bioma
    renderer.ts        frame + pick (objeto sob o cursor)
  game/    (orquestração e entidades)
    walker.ts          base de quem anda: posição, z, direção, colisão (World.standHeight + degrau), animação
    player.ts          Walker controlado pelo jogador (sobe 1 nível)
    sheep.ts           NPC ovelha: pasta/passeia perto de casa (não sobe em cubos)
    entities.ts        personagem + NPCs: update, colisão entre entidades, ocupação de células, rebanho inicial
    camera.ts          câmera sem rotação, zoom automático, acompanhamento suave
    joystick.ts        joystick virtual em direções de tela
    game.ts            loop, input, alcance, carregamento de chunks, liga render/HUD
    hud.ts             overlay HTML mínimo: só a hotbar (joystick em telas de toque)
```

## Fluxo de um frame
1. Input (teclado + joystick, já em direções de tela) → `Player.update`; `Entities.update` move os NPCs.
   Todos usam `Walker.move` (mapa via `World.standHeight`, entidades via `Entities.blocker`).
2. `Camera.follow` mira a posição **lógica** do personagem (sem o balanço do sprite).
3. `World.ensureChunks` (orçamento por frame) e `unloadFar` a cada 1 s.
4. `Renderer.draw`: chão (cache por chunk, máx. 2 re-renders/frame) → objetos e atores por linha
   (de trás para frente) → sombras de nuvens → brilhos/tinta dia-noite → partículas → overlays.
5. Toque curto (colocar) ou segurar 2 s (quebrar, progresso em `Game.updateBreaking`) → `Renderer.pick` → regras em `World.breakBlock/placeBlock` (+ alcance e "não sobre a
   personagem" no `Game`) → `chunk.version++` invalida o cache.

## Regras de dependência
- `world/` não importa de `render/` nem `game/` e não usa DOM (testável em Node).
- `render/` só lê `world/` (e tipos de `game/`). `game/` orquestra.
- Sem backend; regra de domínio só em `world/`.
