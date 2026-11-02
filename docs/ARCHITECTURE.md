# Arquitetura

Site estático (Vite + TypeScript, sem framework), vista superior inclinada (3/4). Diagramas em
[MAPS.md](MAPS.md). Decisões em [DECISIONS.md](DECISIONS.md).

## Estrutura
```
CLAUDE.md / AGENTS.md          instruções para agentes de IA
assets-src/                    arte original (folhas 4×4, pranchas de blocos, ícones)
scripts/
  process-sprite.py            folha → PNG transparente com quadros uniformes (--rows-map, --region…)
  extract-blocks.py            prancha 3/4 de blocos → atlas (topo, frente, chão contínuo) + ícones
  optimize-assets.py           src/assets/*.png → *.webp (o que o jogo importa)
  process-crop.py              folha de crescimento de planta → quadros ancorados pela base, mesma escala
  slice-icons.py               prancha em grade com transparência → um ícone por célula
  make-icons.py                ícones do PWA (public/)
  build-artifact.mjs           dist/ → artifact/mundoblocos.html (arquivo único)
bench/perf.bench.ts            benchmarks (npm run bench)
public/                        manifest PWA + ícones
src/
  config.ts                    TILE, CUBE_FRONT, CHUNK_SIZE, MAX_STACK, STEP_HEIGHT, orçamentos
  main.ts                      escolhe o mundo (perfil), carrega a arte, lê ?seed=, cria o Game (__game só no dev)
  assets/*.webp                sprites, atlas e ícones (importados com ?inline)
  world/   domínio — sem DOM, sem Math.random
    random.ts, noise.ts        PRNG/hash e Perlin + fBm com seed
    blocks.ts                  registro de blocos (MATERIALS, formas, camadas, trigo 60–75)
    profiles.ts                perfis de mundo (principal, santuario) + resolveWorldId
    biomes.ts                  Campos, Sakura, Dunas, Celestial
    terrain.ts                 interface TerrainSource (cellAt, biomeAt, generateChunk)
    generator.ts               WorldGenerator.cellAt (uma avaliação de ruído por célula), generateChunk
    flatGenerator.ts           FlatGenerator: chão de um bloco só (Santuário)
    coords.ts                  célula ↔ chunk/local (seguro p/ negativos)
    chunk.ts                   Chunk 16×16: ground/objects/upper, modified, version
    world.ts                   World(seed, perfil): limites, chunks, standHeight, quebrar/colocar/plantar, tick, spawn
    items.ts                   itens contáveis, ferramentas, dropsFor
  render/  apresentação — só lê o mundo
    blockArt.ts                carrega o atlas antes do jogo
    textures.ts                materiais 3/4 (atlas), água, árvores, cacto, enfeites, ícones, composeCube
    celestialArt.ts            blocos celestiais: ícones da prancha + faces provisórias
    chunkRenderer.ts           cache offscreen do chão por chunk (barrancas, espuma, buracos, sombras)
    character.ts               folhas dos atores (heroína ±ferramenta, ovelha, filhote, namoro) + coração
    itemArt.ts                 trigo por estágio, ícones de itens/ferramentas
    daycycle.ts, particles.ts, color.ts
    renderer.ts                frame + pick (objeto sob o cursor)
  game/    orquestração e entidades
    game.ts                    loop, entrada, alvos, regras de ação por célula, quebra segurando
    walker.ts → player.ts, sheep.ts   movimento/colisão/altura compartilhados
    entities.ts                personagem + ovelhas: colisão, reprodução, ocupação, atores p/ render
    inventory.ts, hotbar.ts, drops.ts
    camera.ts, joystick.ts, actionButton.ts, screenMode.ts, hud.ts
```

## Fluxo de um frame
1. Entrada (teclado + joystick em direções de tela) → `Player.update`; `Entities.update` (ovelhas, pares,
   filhotes); `World.tick` (trigo); `Drops.update` (coleta); `Camera.follow` (posição lógica).
2. `updateBreaking`: segurar (mouse ou botão de ação) acumula progresso no alvo; ao completar quebra e solta drops.
3. `World.ensureChunks` (até 4 por frame, do centro para fora); `unloadFar` a cada 1 s.
4. `Renderer.draw`: chão em cache por chunk (até 2 re-renders/frame) → objetos e atores por linha → sombras de
   nuvens → dia/noite → partículas → foco/cursor/rachaduras. Depois HUD e botão de ação.
Detalhado em [MAPS §2](MAPS.md#2-um-quadro-frame).

## Regras de dependência
- `world/` não importa `render/` nem `game/`; não usa DOM; aleatoriedade só por seed.
- `render/` só lê o mundo (e tipos de `game/`). `game/` orquestra; regra de domínio fica em `world/`.
- Sem backend; persistência futura via core.

## Desempenho
Medido com `npm run bench` (Node) e Playwright (Chromium headless, 1280×760):

| Métrica | Valor | Orçamento |
|---|---|---|
| Gerar 1 chunk (256 células) | ~0,07 ms (era 0,26 ms) | 4 chunks/frame ≪ 16 ms |
| Ler 3.000 células carregadas | ~0,36 ms (era 0,50 ms) | — |
| `Renderer.draw` | ~0,5 ms média, 0,8 ms p95 | 16 ms (60 FPS) |
| Artefato (HTML único, cada mundo) | ~3,0 MB (era 4,7 MB antes do WebP) — **acima do alerta** | aviso do build acima de 2,8 MB |

Técnicas: uma avaliação de ruído por célula (`cellAt`); chunks em `Map` com chave numérica + cache do último
chunk; cache offscreen do chão invalidado por `version`; orçamento de geração e re-render por frame;
assets em WebP. Memória: cada canvas de chão em cache tem ~4 MB (2×), liberado após ~90 frames sem uso.
