# Arquitetura

Site estático (Vite 7 + TypeScript, sem framework; testes com Vitest 5; Node ≥ 22.12), vista superior inclinada (3/4). Diagramas em
[MAPS.md](MAPS.md). Decisões em [DECISIONS.md](DECISIONS.md).

## Monstro Goblin e acampamentos no Mundo principal (PR #96)

`world/goblins.ts` planeja, por seed, quatro fogueiras da família **Block.CAMPFIRE** e um anel de sete células de nascimento por acampamento fora de cidades/áreas protegidas. `GoblinCampTerrain` sobrepõe somente essas fogueiras e limpa a vegetação dos slots, mantendo o gerador base e chunks modificados como fonte de verdade; sem gravar o estado derivado da seed. `Entities.spawnWildlife` coloca sete `Monster('goblin')` em cada um desses grupos, usando a IA de mundo aberto dos lobos (`sight=3`), com 60 HP/ataque-base 15 e área de passeio local. `game/monster.ts` define estados visuais, `render/character.ts` usa as sete folhas transparentes direcionais 4×4 registradas apenas em `render/art/principal.ts`; `MobState.v/r` sincroniza estados em salas e `CreatureMirror` os apresenta. A serialização da dungeon continua reservada às aranhas; os monstros do mundo aberto reaparecem por seed. O Santuário Three.js não importa os novos ativos.

## Mudanças direcionadas — autotile horizontal e dois níveis (PR #87)

(Histórico — desde a v0.93.76 o Mundo usa blocos de 1/4 e `MAX_STACK = CUBE_LEVELS = 4`, ADR 0033.) `MAX_STACK=2` em `src/config.ts` regia os níveis disponíveis do `Chunk`, `World` e `Renderer`. `World.getLevel` retorna AIR para nível obsoleto e a restauração descarta a terceira camada de um save antigo e `restoreChunk` devolve a contagem descartada (`applySave.droppedBlocks`, `Room.droppedOnRestore`); `applySave` limita a altitude do jogador. O novo `src/render/adaptiveWalls.ts` contém a decisão pura da forma horizontal (mesmo tipo à esquerda/direita, sem norte/sul; porta existente funciona como pilar) e compõe somente a metade frontal do topo do sprite, mantendo a face vertical inteira. O contrato `GameRenderer` (`render/rendererContract.ts`) tem `stats?()` opcional (só WebGL) e o mapa `SANCTUARY_THREE_OPTIONS`; `three` é a única dependência de runtime e `@types/three` a de tipos (sem declaração de protótipo). `Renderer.drawObject` usa esse desenho **apenas** em materiais de construção; outros blocos seguem renderização anterior e a câmera não muda. Os seis arquivos de arte 80–85 já foram incorporados ao pacote do Santuário no PR #87.

## Renderizador específico por mundo (PR #89; Mundo em 3D desde a v0.93.47)

> **M7 (v0.93.105):** o Canvas 2D (`render/renderer.ts`) foi **removido**: Mundo e Santuário usam só o renderer 2.5D em WebGL; sem WebGL o `main.ts` avisa na tela. O `ChunkRenderer` continua (pinta o chão numa textura por chunk). O parágrafo abaixo conta a origem (Santuário).

`Game` continua orquestrando `World`, personagem, controles, ações, hotbar, HUD e persistência. Sua opção `rendererFactory` pode substituir somente o renderer visual. O perfil **Santuário** carrega sob demanda `render/sanctuaryThreeRenderer.ts` (Three.js 0.187), com `render/sanctuaryThreeLayout.ts` para forma procedural de cubo/painel, instanciamento dos 18 tipos de bloco, câmera ortográfica superior, raycasting e Deusa animada em sprite 2D. O perfil **principal** mantém `render/renderer.ts` Canvas 2D intacto, sem carregar Three.js, inclusive no artefato fixo `VITE_WORLD=principal`. Sem WebGL, ou com `?render=2d`, o Santuário usa o renderer Canvas 2D antigo. O `World` continua a fonte de verdade para chunks, colisão, colocação, remoção e salvamento; o Santuário oficial não recebe as cenas experimentais de 5 níveis e primeira pessoa.

## Mármore Celestial V2/V3 removido (W4, v0.93.28, ADR 0027)
O comportamento especial do Mármore Celestial (82) no Santuário — dois níveis em um clique, formas adaptativas, âncora V3 de duas células, ordem de colocação, borda ornamental e cantos em L — foi **removido** (`sanctuaryMarbleAdaptive`, `sanctuaryV3Surfaces`, `World.marbleV3*`/`marblePlacement*`). O 82 é um cubo comum: empilha e quebra um nível por vez, e entra no autotile horizontal genérico (`render/adaptiveWalls.ts`, forma `thin`) como os demais celestiais. Paredes novas são só as autotile (`world/walls.ts`). Salvamento v15 descarta os campos antigos.


## Estrutura
```
CLAUDE.md / AGENTS.md          instruções para agentes de IA
assets-src/                    arte original (folhas 4×4, pranchas de blocos, ícones)
  ferramentas/                 contrato de arte das ferramentas por material (ADR 0018): CONTRATO.md, catalogo.json, entregas
scripts/
  process-sprite.py            folha → PNG transparente com quadros uniformes (--rows-map, --region, --respace…)
  extract-blocks.py            prancha 3/4 de blocos → atlas (topo, frente, chão contínuo) + ícones
  extract-town.py              pranchas da cidade (assets-src/town) → sprites em escala única (tabela OBJECTS)
  extract-grass.py             prancha da Terra com Grama → 3 variações (coluna 1 + colunas 15–16 do atlas) + ícone
  extract-stones.py            prancha das 8 pedras → ícones + colunas da Pedra Bruta e das variações no atlas
  extract-dungeon.py           pranchas da dungeon → chão, montanhas, pedras, blocos decorados e aranhas
  optimize-assets.py           src/assets/*.png → *.webp (o que o jogo importa)
  extract-rocks.py             prancha de pedras soltas → tira de pedregulhos (40 artes)
  extract-love.py              prancha de coraçõezinhos 4×4 → tira de 16 quadros do namoro dos animais
  extract-fence.py             moldura de cerca + portão de referência → peças emendáveis, portão e ícones
  extract-crops.py             pranchas de hortaliças 8×2 → folha 4×4 (batata, tomate, cenoura)
  extract-items.py             ícones soltos de itens (maçã, batata, tomate, cenoura) → 64×64
  sprite_segments.py           recorte de pranchas por pedaços conectados (usado pelos dois acima e por extract-trees)
  extract-trees.py             prancha 4×2 do cacto (e, até a v0.87.0, de carvalho/macieira) → quadros + ícone da maçã
  process-trees.py             tira de formas variadas por espécie (carvalho, macieira, cerejeira; v0.88.0)
  make-material-icons.py       ícone de bloco 3/4 a partir de topo e frente de um material V2
  extract-craftables.py        objetos de receita (fogueira, caldeirão, forno, cadeira) → sprite + ícone
  process-crop.py              folha de crescimento de planta → quadros ancorados pela base, mesma escala
  slice-icons.py               prancha em grade com transparência → um ícone por célula
  make-icons.py                ícones do PWA (public/) a partir de assets-src/icone-orvalis.webp
  build-artifact.mjs           dist/ → artifact/mundoblocos.html (arquivo único)
  build-net.mjs                src/net (+ regras de src/world) → dist-net/orvalis-net.cjs, pacote do multiplayer para o servidor (ADR 0016)
  process-trees.py / make-portraits.py  (ver OPERATIONS) NPCs: retratos da caixa de conversa a partir das folhas em assets-src/npcs
  extract-water.py             cubo de água e folhas de enchimento → texturas da água
  extract-ui.py                ícones de interface (Personagem, Habilidades, Construtor), baú e tenda
  extract-landmarks.py         marcos soltos do mundo (entrada do Covil das Aranhas) → sprite recortado
  extract-interiors.py         arte dos interiores (assets-src/interiors) → src/assets/interior-<id>.png (ADR 0014)
docs/                          documentação (README.md = índice); adr/, domains/, archive/ (histórico), assets/ (imagens de apoio)
bench/perf.bench.ts            benchmarks (npm run bench)
public/                        manifest PWA + ícones
src/
  config.ts                    TILE, CUBE_FRONT, CHUNK_SIZE, MAX_STACK, STEP_HEIGHT, orçamentos
  main.ts                      escolhe o mundo (perfil), carrega o pacote de arte e as imagens de bloco, lê ?seed=; sem ?seed=/?personagem= no mundo principal mostra a tela de entrada (Game em vitrine), senão cria o Game (__game só no dev)
  assets/*.webp                sprites, atlas e ícones (importados com ?inline só pelos pacotes em render/art/)
  world/   domínio — sem DOM, sem Math.random
    random.ts, noise.ts        PRNG/hash e Perlin + fBm com seed
    blocks.ts                  registro de blocos (MATERIALS, formas, camadas, trigo 60–75)
    profiles.ts                perfis de mundo (principal, santuario) + resolveWorldId
    biomes.ts                  Campos, Sakura, Dunas, Celestial
    terrain.ts                 interface TerrainSource (cellAt, biomeAt, generateChunk)
    dungeon.ts                 dungeon: área pura da seed (buildDungeon/planDungeon) + DungeonTerrain (sobreposição)
    progression.ts             regras numéricas da progressão: atributos, armas, ficha dos monstros, fórmula de dano
    town.ts                    Cidade do Despertar: mapa fixo (townLayout, semente própria) + TownTerrain (sobreposição)
    interiors.ts               interiores das construções: cômodos isolados (mapa lógico #/./E) + InteriorTerrain (ADR 0014)
    generator.ts               WorldGenerator.cellAt (uma avaliação de ruído por célula), generateChunk
    flatGenerator.ts           FlatGenerator: chão de um bloco só (Santuário)
    coords.ts                  célula ↔ chunk/local (seguro p/ negativos)
    chunk.ts                   Chunk 16×16: ground + levels[MAX_STACK], modified, version
    world.ts                   World(seed, perfil): limites, chunks, standHeight, quebrar/colocar/plantar, tick, spawn
    items.ts                   itens contáveis, ferramentas, dropsFor
    actions.ts                 ações do jogador como dados + applyAction (pelas regras do World) — multiplayer (ADR 0016)
  net/     multiplayer — sem DOM; usado pelo jogo e pelo servidor (ADR 0016)
    protocol.ts                mensagens, versão, código de convite, nome de convidado, leitura segura da rede
    room.ts                    Room: sala autoritativa pura (World da sala, jogadores, edições, itens, baús e bichos — Entities com avatares, ADR 0021)
    session.ts                 NetSession: lado do jogo (aplica ações confirmadas, outros jogadores)
    loopback.ts                LoopbackServer: salas dentro do jogo para testes (sem rede)
    index.ts                   o que vai no pacote do servidor (npm run build:net → dist-net/orvalis-net.cjs)
  dev/     só desenvolvimento, fora do build de produção: painel de desempenho (`?fps=1`; a cena dos materiais `?materiais=1` foi removida na v0.93.107)
  dev/perfHud.ts               painel de desempenho `?fps=1` (dev e piloto): FPS, GPU, memória; toque copia o relatório
  render/  apresentação — só lê o mundo
    art/                       pacotes de arte por mundo (principal.ts, santuario.ts, types.ts) + loadArtPack/art()
    blockArt.ts                carrega do pacote os atlas, a folha da porta e a arte da dungeon antes do jogo
    textures.ts                materiais 3/4 (atlas), água, árvores, cacto, enfeites, ícones, composeCube
    materialsV2.ts             Padrão de Materiais V2 (o padrão do jogo): V2_BLOCKS, atlas V2 e de máscaras, massa contínua (`cubeEdges`) (ADR 0023)
    three/                     núcleo 2.5D genérico (ADR 0031, M1): `stage.ts` (cena, câmera ortográfica/oblíqua, GPU, perda de contexto, mira/raio), `selection.ts` (realces), `blockMaterials.ts` (materiais por bloco), `chunkFloor.ts` (chão do Mundo: um plano por chunk com a textura do `ChunkRenderer`), `chunkBlocks.ts` (cubos do Mundo: malhas instanciadas por chunk e por (bloco, forma)), `chunkSprites.ts` (objetos altos: um plano vertical por sprite 2D, instanciado por chunk), `groundFx.ts` (brilho da água, água enchendo e sombras de nuvens sobre o chão), `actorBillboards.ts` (atores: planos verticais com a folha 2D, sombra, nome e coração), `itemSprites.ts` (itens caídos e anel da ovelha), `overlay2d.ts` (camada 2D sobre o WebGL: números de dano, vinheta de dano, fade de porta, partículas), `doorSprites.ts` (portas com a animação de abrir/fechar), `interiorRoom.ts` (interior: arte do cômodo sobre o chão da área)
    worldThreeRenderer.ts      Mundo em 2.5D (ADR 0031, M2 em construção; só dev, `?render=3d`): chão por chunk, cubos e jogador em plano vertical
    (SpriteSheet.frameAspect/shadowRadii: o 3D lê o tamanho da folha sem mexer no desenho 2D)
    worldBlockFaces.ts         topo e frente (provisória) de cada cubo do Mundo para o 3D
    groundFxMath.ts            matemática pura dos efeitos de chão (brilho da água, sombras de nuvens): a mesma do `Renderer` 2D
    selectionFx.ts             seleção na tela (moldura do cursor, cantoneiras do alvo, rachaduras): os mesmos desenhos do 2D e do 3D
    worldSelection.ts          retângulo da seleção no 3D (o que se vê: cubo = topo + frente)
    dungeonFx.ts               efeitos de tela da dungeon sobre um `ctx` (farol e seta da entrada, escuro fora do labirinto): os mesmos do 2D e do 3D
    doorAnim.ts                animação da porta (8 quadros, `DoorAnimator`): máquina de estados compartilhada pelo 2D e pelo 3D
    worldLight.ts              luz do Mundo (pura): brilho ambiente pela hora, cor da escuridão, luzes dos blocos que brilham (ADR 0031, M3.3)
    worldSpriteArt.ts          qual sprite 2D desenha cada objeto do Mundo no 3D (variações por célula, porta por estado, cerca emendada)
    isoSet.ts                  conjunto isométrico do Santuário: topos, faces e sprites dos cubos e objetos a partir da prancha
    three/isoFences.ts         cercas e portões 3D (malhas do modelo do Blockbench) do Santuário isométrico
    damageNumbers.ts           números de dano subindo na tela (apresentação)
    townArt.ts                 construções e enfeites da cidade pintados em canvas (sem imagens)
    chunkRenderer.ts           cache offscreen do chão por chunk (barrancas, espuma, buracos, sombras)
    character.ts               folhas dos atores (heroína ±ferramenta, ovelha, filhote, namoro) + coração
    (o personagem modular saiu na v0.92.0)
    minimap.ts, mapColors.ts   minimapa redondo (névoa + marcadores) e cor de cada célula no mapa, lida do World
    characterPreview.ts        prévia do personagem na tela de entrada (mesmo desenho do jogo, virando nas 4 direções)
    itemArt.ts                 trigo por estágio, ícones de itens/ferramentas
    daycycle.ts, particles.ts, color.ts
    rendererContract.ts        `RenderOptions` (o que o jogo entrega por quadro) e `GameRenderer` (draw, pick, addDamage, iconFor)
  game/    orquestração e entidades
    game.ts                    loop, criação do mundo/entidades, câmera, hotbar/HUD; repassa a entrada
    actionController.ts        regras de ação por célula (toque/clique/segurar), porta, quebra, alvos p/ render
    save.ts, menu.ts           salvamento automático (localStorage, ADR 0011) e menu ☰
    exploration.ts             névoa do minimapa: células já vistas (bits por chunk), salva com o mundo
    title.ts                   tela de entrada (Novo jogo / Continuar) e montagem do personagem; o mundo fica em vitrine atrás
    walker.ts → player.ts, monster.ts, wanderer.ts → sheep.ts, horse.ts (FarmAnimal: cavalo, vaca, galinha), villager.ts, npcs.ts (NPCs nomeados e falas), dialogue.ts (caixa de conversa)   movimento/colisão/altura compartilhados
    entities.ts                personagem + ovelhas + monstros: colisão, reprodução, golpe, mordida, mapa de distâncias,
                               morte/renascimento dos monstros, atores p/ render; roda também na sala do servidor
                               (sem personagem, jogadores como `avatars`) e em modo `remote` no aparelho dentro da sala
    creatureMirror.ts          na sala: espelho dos bichos que a sala manda (`mobs`), suavizados (ADR 0021)
    inventory.ts, hotbar.ts, bag.ts, chest.ts, skills.ts, drops.ts   inventário, grade, bolsa, baú, receitas, itens caídos
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

## Titã (ADR 0039–0043, v0.98.0)
`src/titan/` é um **segundo motor, isolado**: volume voxel por `(x, y, z)` (`voxel.ts`, `generator.ts`, `volume.ts`, `mesher.ts`, `physics.ts`, `save.ts`, `session.ts`, `sections.ts`, `inventory.ts`, `items.ts`, `actions.ts`, `light.ts`, `sky.ts`, `gesture.ts`, `breaking.ts`; sem DOM, determinístico) + `titanGame.ts` (entrada e laço) +
A **lanterna** é um modelo 3D do renderer (ADR 0043: `InstancedMesh` ×2, fora da malha do terreno); a mira dela usa a caixa do objeto (`titan/lantern.ts`, puro, sem DOM).
`render/titanRenderer.ts` (Three.js) + `render/art/titan.ts` (atlas do terreno e da hotbar). Só `main.ts` (`?mundo=titan`) e `world/profiles.ts` (registro do perfil) tocam o resto do jogo; nada de `World`, `Game`, `SUBDIV` ou `SaveStore`.

## Regras de dependência
- `titan/` não importa `world/` além de `noise.ts`/`random.ts` (utilitários puros) e não é importado pelo motor do Orvalis.
- `world/` não importa `render/` nem `game/`; não usa DOM; aleatoriedade só por seed.
- `render/` só lê o mundo (e tipos de `game/`). `game/` orquestra; regra de domínio fica em `world/`.
- Arte (`?inline`) só em `render/art/<mundo>.ts`; o resto do código lê o pacote carregado (`art()`).
- Sem backend aqui: salvamento local no navegador (`game/save.ts`); multiplayer e nuvem via backend do Orvalis
  (repositório separado, ADR 0015).

## Desempenho
Medido com `npm run bench` (Node) e Playwright (Chromium headless, 1280×760):

| Métrica | Valor | Orçamento |
|---|---|---|
| Gerar 1 chunk (256 células) | ~0,07 ms (era 0,26 ms) | 4 chunks/frame ≪ 16 ms |
| Ler 3.000 células carregadas | ~0,36 ms (era 0,50 ms) | — |
| `Renderer.draw` | ~0,5 ms média, 0,8 ms p95 | 16 ms (60 FPS) |
| Artefato (página + imagens em arquivos, ADR 0013) | principal: página 205 kB + 2,8 MB de imagens; **início ~2,5 MB**, dungeon/aranhas ~0,5 MB depois; Santuário ~0,7 MB | orçamento: início < 3 MB (o build avisa); total pode crescer |

Técnicas: uma avaliação de ruído por célula (`cellAt`); chunks em `Map` com chave numérica + cache do último
chunk; cache offscreen do chão invalidado por `version`; orçamento de geração e re-render por frame;
assets em WebP. Memória: cada canvas de chão em cache tem ~4 MB (2×), liberado após ~90 frames sem uso.
