# Arquitetura

Site estático (Vite 7 + TypeScript, sem framework; testes com Vitest 5; Node ≥ 22.12), vista superior inclinada (3/4). Diagramas em
[MAPS.md](MAPS.md). Decisões em [DECISIONS.md](DECISIONS.md).

## Estrutura
```
CLAUDE.md / AGENTS.md          instruções para agentes de IA
assets-src/                    arte original (folhas 4×4, pranchas de blocos, ícones)
  ferramentas/                 contrato de arte das ferramentas por material (ADR 0018): CONTRATO.md, catalogo.json, entregas
  personagens/                 personagem modular: CONTRATO.md + humano-chibi/{entrega,previas}/v02 (git);
                               _trabalho/ e _arquivo/ (Krita, v01) só locais — ADR 0017; ainda fora do runtime
scripts/
  export-personagem.py         personagem modular v02 → valida a entrega e exporta WebP + manifesto (ADR 0017);
                               --out src/assets --prefixo chibi- alimenta o teste no jogo (render/modular*.ts)
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
  extract-trees.py             pranchas de crescimento 4×2 (carvalho, macieira, cacto) → quadros + ícones de mudas/maçã
  extract-craftables.py        objetos de receita (fogueira, caldeirão, forno, cadeira) → sprite + ícone
  process-crop.py              folha de crescimento de planta → quadros ancorados pela base, mesma escala
  slice-icons.py               prancha em grade com transparência → um ícone por célula
  make-icons.py                ícones do PWA (public/) a partir de assets-src/icone-orvalis.webp
  build-artifact.mjs           dist/ → artifact/mundoblocos.html (arquivo único)
  build-net.mjs                src/net (+ regras de src/world) → dist-net/orvalis-net.cjs, pacote do multiplayer para o servidor (ADR 0016)
  extract-villagers.py         moradores: personagens-base de roupa branca + roupas em camadas (assets-src/villagers)
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
  dev/     só desenvolvimento, fora do build de produção: cena de escala (`?escala=1`, ADR 0022) e dos materiais (`?materiais=1`, ADR 0023)
    scaleLayout.ts             fila de comparação (dados puros, testados)
    scaleScene.ts              cena: grade, âncoras, células bloqueadas, nomes e alturas por cima do quadro real
    materialsScene.ts          cena ?materiais=1: atlas legado × materiais V2 lado a lado (ADR 0023)
  render/  apresentação — só lê o mundo
    art/                       pacotes de arte por mundo (principal.ts, santuario.ts, types.ts) + loadArtPack/art()
    blockArt.ts                carrega do pacote os atlas, a folha da porta e a arte da dungeon antes do jogo
    textures.ts                materiais 3/4 (atlas), água, árvores, cacto, enfeites, ícones, composeCube
    materialsV2.ts             Padrão de Materiais V2 em validação: V2_BLOCKS, atlas V2, chave ?blocos=v2, massa contínua (`cubeEdges`) (ADR 0023)
    celestialArt.ts            blocos celestiais: ícones da prancha + faces provisórias
    damageNumbers.ts           números de dano subindo na tela (apresentação)
    townArt.ts                 construções e enfeites da cidade pintados em canvas (sem imagens)
    chunkRenderer.ts           cache offscreen do chão por chunk (barrancas, espuma, buracos, sombras)
    character.ts               folhas dos atores (heroína ±ferramenta, ovelha, filhote, namoro) + coração
    modular.ts, modularCharacter.ts   personagem modular (ADR 0017): manifesto, peças/sorteio/limpeza da aparência, desenho
    minimap.ts, mapColors.ts   minimapa redondo (névoa + marcadores) e cor de cada célula no mapa, lida do World
    characterPreview.ts        prévia do personagem na tela de entrada (mesmo desenho do jogo, virando nas 4 direções)
    itemArt.ts                 trigo por estágio, ícones de itens/ferramentas
    daycycle.ts, particles.ts, color.ts
    renderer.ts                frame + pick (objeto sob o cursor)
  game/    orquestração e entidades
    game.ts                    loop, criação do mundo/entidades, câmera, hotbar/HUD; repassa a entrada
    actionController.ts        regras de ação por célula (toque/clique/segurar), porta, quebra, alvos p/ render
    save.ts, menu.ts           salvamento automático (localStorage, ADR 0011) e menu ☰
    exploration.ts             névoa do minimapa: células já vistas (bits por chunk), salva com o mundo
    title.ts                   tela de entrada (Novo jogo / Continuar) e montagem do personagem; o mundo fica em vitrine atrás
    walker.ts → player.ts, monster.ts, wanderer.ts → sheep.ts, horse.ts (FarmAnimal: cavalo, vaca, galinha), villager.ts   movimento/colisão/altura compartilhados
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

## Regras de dependência
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
