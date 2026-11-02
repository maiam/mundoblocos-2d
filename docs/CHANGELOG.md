# Changelog

## 0.29.0 — 2026-11-02
- **Água como bloco do mundo** (arte fornecida): o chão de água usa o topo do bloco de água (ladrilho contínuo).
  Continua **inquebrável**, mas **Terra, Pedra ou Tora a substituem** (viram o chão da célula; gastam o material).
- **Água enche buracos vizinhos**: buraco ao lado de água enche sozinho em 0,6 s, com a animação de enchimento
  (4 direções, conforme o lado de onde a água vem), e passa a encher os buracos vizinhos em cadeia. Terra firme não é
  inundada; buraco tapado antes de encher desiste. Ao carregar um salvamento, buracos vizinhos de água voltam a encher.
- `World.scheduleFlow/tickWater/waterFlows/settleWater`, `REPLACES_WATER`, `FLOW_SECONDS`; `scripts/extract-water.py`.
  4 testes novos (97).

## 0.28.0 — 2026-11-02 (Fase 3 — coleta de materiais)
- **Materiais coletados** no mundo principal: quebrar solta o próprio bloco (cubo ou chão), árvores soltam 2–3 Toras
  de Carvalho, porta volta porta; colocar gasta 1. Santuário continua infinito (perfil `collectBlocks`).
- **Grade de 8 espaços + bolsa no 9º** (ícone fornecido): ferramentas, itens e materiais dividem os 8 espaços; o que é
  coletado soma na grade (se já estiver nela ou houver espaço livre) ou vai para a bolsa. **Bolsa**: tudo que a
  heroína carrega; toque num item e num espaço para trocar; pausa o jogo. Teclas 1–8, 9/I/B (bolsa), Esc.
- **Ao cair, perde todos os materiais** (ferramentas, sementes, trigo e espólios ficam).
- Começo: ferramentas, 5 sementes, 2 trigos e 1 Porta de Carvalho (na bolsa). Contador de espólios saiu da HUD
  (estão na bolsa). Salvamento v2 (grade + materiais; migra a v1). 5 testes novos (93).

## 0.27.0 — 2026-11-02 (Fase 2 do plano — salvamento automático)
- **Salvamento automático no navegador** (ADR 0011): chunks editados, plantações, heroína (posição, vida), item
  selecionado, inventário (com espólios), ovelhas, aranhas vivas e renascimentos pendentes, hora do dia. A cada
  10 s, ao esconder a aba, ao sair e ao abrir o menu. Um salvamento por mundo e seed; abrir sem `?seed=` continua o
  último. Navegador sem armazenamento → o jogo segue e o menu avisa.
- **Menu** (☰): continuar, novo mundo, recomeçar este mundo; mostra a semente e o último salvamento; pausa o jogo.
- `game/save.ts`, `game/menu.ts`, `World.modifiedChunks/restoreChunk`. 2 testes novos (88).

## 0.26.1 — 2026-11-02
- **Arte final de combate** (pranchas fornecidas): ícones de Seda, Presa e Coração da Rainha; **folhas de morte** das
  três aranhas (8, 8 e 16 quadros: reação → colapso → fumaça), na mesma escala da caminhada. Substituem a arte
  provisória (a morte procedural fica só como reserva). Duração da morte por tipo (0,7 / 0,9 / 1,6 s); a sombra some
  junto. `extract-dungeon.py` ganhou `icons()` e `death()` (quadros pelos vãos entre colunas, franja colorida removida).

## 0.26.0 — 2026-11-02 (Fase 1 do plano — combate jogável)
- **Vida da heroína**: 5 corações, invencibilidade curta e recuo ao levar dano, regeneração fora de combate;
  derrotada, **renasce no início mantendo os itens**. Corações na HUD só quando importam.
- **Aranhas mordem** (½, 1 e 2 corações) e **perseguem pelos corredores** (mapa de distâncias por BFS na dungeon).
- **Morte dos monstros** com animação provisória e **espólios**: Seda, Presa e Coração da Rainha (contador na HUD).
- **Renascimento**: todas as aranhas voltam com o tempo (40 s / 60 s / Rainha 300 s), longe da heroína.
- **Entrada**: farol roxo na frente e seta na borda da tela; penumbra dentro do labirinto; vinheta de dano.
- Arte provisória (ícones SVG, corações vetoriais, morte procedural) até as pranchas finais. 5 testes novos (86).

## 0.25.0 — 2026-11-02 (Fase 0 do plano)
- **Arte separada por mundo** (ADR 0010): pacotes `render/art/principal.ts` e `santuario.ts`; o build de cada
  artefato só leva a arte do seu mundo. Sprites em WebP q84/alfa q85. **Mundo principal 3,84 → 2,63 MB; Santuário
  3,29 → 0,68 MB**; o build não avisa mais de tamanho.
- **`ActionController`** (`game/actionController.ts`): regras de ação por célula, toque/clique/segurar, porta,
  quebra e alvos para o render saíram do `Game` (611 → 290 linhas), sem mudar comportamento (regressão completa no
  navegador: arar, plantar, amassar, colocar, quebrar com mão e ferramenta, porta, alimentar, golpe, Santuário).
- Santuário republicado com o motor atual.

## Docs — 2026-11-02
- `NEXT_STEPS.md` reorganizado em **plano por fases** (panorama, fases 0–5, decisões pendentes, dependências
  externas, riscos); itens já feitos removidos (monstros, quebra mais rápida com ferramenta). Números atualizados
  em `CURRENT_STATE`/`ARCHITECTURE` (artefato 3,84 MB, render ~0,4 ms).

## 0.24.0 — 2026-11-02
- **Covil das Aranhas vira um labirinto procedural** (~9× maior: 96–108 × 66–78 blocos, tamanho pela seed):
  caminhos sinuosos (árvore "growing tree"), bifurcações, circuitos, becos sem saída, câmaras com bordas
  irregulares, corredores de 2–3 blocos com curvas, **uma única entrada** e a **câmara da Rainha** (~17×17) no
  ponto mais fundo, com **uma única passagem**. Validação de navegação na própria geração.
- Geração em etapas separadas: área (`dungeonSize/planDungeon`) → labirinto (`buildMaze`: só chão e paredes) →
  conteúdo (`decorateDungeon`: blocos, obstáculos nas câmaras, monstros proporcionais ao chão, ~39 na seed 42).
- Paredes = cubo de pedra escura da prancha (`DUNGEON_WALL`, 2 de altura no desenho, `textures.stackDraw`);
  montanhas só no anel externo. Chefe preso à câmara da Rainha.
- Testes da dungeon reescritos para as regras da spec (6 casos, 5 seeds). 81 testes.

## 0.23.0 — 2026-11-02
- **Primeira dungeon — Covil das Aranhas** (mundo principal, a ~26–60 células do spawn): área 34 × 24 murada por
  montanhas com **uma única entrada** voltada para o spawn; chão de caverna (terra, musgo, teias, ossos); pedras,
  ninhos de ovos, cogumelos, espinhos e raízes como obstáculos que nunca bloqueiam o caminho.
- **Área protegida**: nada quebra, nada é colocado, arado, amassado ou plantado lá dentro — só combate.
- **Monstros**: 10 aranhas pequenas, 5 grandes e **1 Aranha Gigante (chefe, 14 golpes)**. Passeiam, perseguem a
  personagem dentro da dungeon e **nunca saem dela**. Espada/machado tiram vida (pisca, recua, barra de vida);
  sem vida, somem. Ainda não causam dano.
- Arte das 6 pranchas fornecidas via `scripts/extract-dungeon.py` (3 modos de recorte de fundo); sprites de cenário
  com variantes por célula; folhas de monstro em ciclo único (8 quadros) espelhadas para a direita.
- `world/dungeon.ts` (`buildDungeon/planDungeon/DungeonTerrain`), `World.isProtected/dungeon`, `game/monster.ts`,
  perfil `dungeon`, ADR 0009. 8 testes novos (79 no total).

## 0.22.0 — 2026-11-02
- **Porta só entre batentes de madeira**: as células da esquerda e da direita precisam de um cubo de madeira no
  nível 0 (Tora ou Piso de Carvalho; `World.hasDoorFrame`, por `BlockDef` cubo + `organic: 'wood'`).
- **Quebrar com ferramenta leva 1 s** (mão/item continua 2 s): `breakSeconds(tool)` em `world/items.ts` substitui
  `BREAK_HOLD_S` do `Game`. 2 testes novos (71 no total).

## 0.21.0 — 2026-11-02
- **Pilha de até 3 cubos** (`MAX_STACK` = 3): `Chunk.levels` (um array por nível), `World.getLevel/topBlock/
  stackHeight/placementLevel` genéricos; render, sombra e `pick()` iteram os níveis. A personagem sobe até o nível 3
  (1 por passo).
- **Porta de Carvalho** (prancha fornecida, 8 quadros): bloco de madeira na hotbar (16º espaço), altura de 3 frentes
  de cubo. Vai só no chão; nada empilha sobre ela. Toque (botão de ação/Espaço ou clique, com qualquer item) abre e
  fecha com animação; fechada bloqueia, aberta deixa passar; não fecha com alguém dentro. Estado no id
  (`OAK_DOOR`/`OAK_DOOR_OPEN`); machado/mão quebram, picareta não (madeira).
- Hotbar menor em celulares deitados ≤ 700 px para caber os 16 espaços. 3 testes novos (69 no total).

## 0.20.0 — 2026-11-02
- **Picareta**: toque toca a animação de minerar (folha fornecida); segurar 2 s quebra **qualquer bloco** (pedra,
  terra, areia, cubos e chão) e plantas — **destruídas sem drop** —, mas **não** madeira nem árvores; não ataca.
- Registro: `breaks: 'nonWood'`; toque curto de qualquer ferramenta com `swings` toca a animação (não só as de chão).
- `process-sprite.py --respace PAD`: corta cada coluna no vão vazio perto da divisa de linha (quadros que
  transbordam a grade para cima e para baixo). 3 testes novos (66 no total).

## 0.19.0 — 2026-11-02
- **Pá**: toque (animação de cavar, folha fornecida) em Terra, Terra com Grama ou Terra Arada livre → **Caminho de
  Terra** (`World.canFlatten/flatten`). Segurar 2 s cava **só blocos macios** (terra, grama, arada, caminho, areia —
  cubo ou chão, que vira buraco) e **plantas, destruídas sem drop**; não quebra pedra, madeira, árvore; não ataca.
- Registro de ferramentas: `breaks: 'soft'`, `destroysPlants`, `groundUse: 'till' | 'flatten'` (o `Game` não testa
  mais `=== 'hoe'`); `toolDrops(tool, id)` aplica a regra de drop. `BlockDef.soft` nos 5 materiais macios.
- Atores de ação derivados de `TOOLS[t].swings`. 5 testes novos (63 no total).

## 0.18.0 — 2026-11-02
- **Enxada quebra plantas e derivados** (capim, flor, trigo — colheita —, cacto) segurando 2 s, com a animação de
  arar repetindo; continua sem quebrar madeira/árvore/blocos e sem atacar.
- `BlockDef.choppable` substituído por `organic: 'wood' | 'plant' | null`; regras `breaks: 'organic'` (machado) e
  `'plant'` (enxada). Animação durante a quebra vale para qualquer ferramenta com ação que quebre algo.

## 0.17.0 — 2026-11-02
- **Enxada**: animação de arar (folha fornecida) a cada toque; só troca Terra/Terra com Grama → Terra Arada.
- **Restrição**: enxada não quebra blocos, itens nem elementos (`breaks: 'none'`) e não acerta entidades.
- Registro de ferramentas ganha `swings` (tem animação de ação) separado de `strikes` (acerta entidades).
- 2 testes novos.

## 0.16.0 — 2026-11-02
- **Machado**: toque = golpe com a folha fornecida (animais somem, como a espada); segurar 2 s corta só o que é de
  madeira, árvore ou planta, repetindo a animação de golpe enquanto corta.
- Restrição de quebra por ferramenta no registro (`TOOLS.breaks`, `toolCanBreak`) + `BlockDef.choppable` +
  `World.breakTargetId`. Golpe genérico por ferramenta (`Player.attackTool`, `ActorKind heroine-<tool>-attack`).
- 4 testes novos.

## 0.15.0 — 2026-11-02
- **Ataque com espada**: toque/clique (ou botão de ação/Espaço) com a espada = golpe com a folha de ataque
  fornecida; acerto no meio do golpe, num arco à frente. Animais atingidos somem (sem animação de morte ainda).
- **Restrição**: a espada não quebra blocos, itens nem elementos (segurar com a espada não faz nada).
- Anel vermelho marca a entidade que seria atingida. `Entities.strike/strikeTargets` preparado para monstros.
- `process-sprite.py --largest` (mantém o maior pedaço por quadro).
- 5 testes novos (duração/quadros/acerto único, direção fixa, arco, par desfeito, sprite de golpe).

## 0.14.0 — 2026-11-02
- Mundo principal: **enxada ativa** — toque/clique (ou botão de ação) em Terra/Terra com Grama → Terra Arada
  (`World.canTill/till`; enfeites em cima são removidos).
- **Semente de trigo só em Terra Arada** (antes: grama, terra ou arada).
- Novos sprites de crescimento do trigo (16 estágios, sem monte de terra), processados por
  `scripts/process-crop.py` com base do caule ancorada e escala comum.
- Testes de cultivo atualizados (arar antes de plantar; não ara areia/pedra/piso/buraco).

## 0.13.2 — 2026-11-02
- Deusa da Vida passa a **flutuar** em vez de caminhar (a caminhada travava): folha de flutuação 7×4 fornecida,
  quadros em vai-e-volta contínuo, pairando acima da sombra com balanço suave; câmera sem balanço.
- `SheetSpec.float` no render de atores (reutilizável para outros personagens voadores).
- Folha de caminhada da Deusa removida do jogo (mantida em `assets-src/` como referência).

## 0.13.1 — 2026-11-02
- Santuário: arte provisória dos 18 blocos celestiais substituída pela prancha 3/4 fornecida
  (`extract-blocks.py --celestial` → `celestial-atlas.webp` + ícones refeitos do cubo inteiro).
- Chão: blocos com desenho central não giram; nuvens sem giro/espelho e com contraste suavizado.
- `blockArt.ts` carrega os dois atlas; `celestialArt.ts` deixa de ter pintura procedural.

## 0.13.0 — 2026-11-02
- **Santuário Celestial da Deusa da Vida**: novo mundo com 10 chunks (5×2), chão todo de Nuvem Sólida, Deusa da Vida
  como única personagem e 18 blocos celestiais como únicos blocos de construção. Sem ferramentas, cultivo ou ovelhas.
- Perfis de mundo (`world/profiles.ts`, ADR 0008): terreno, limites, personagem, blocos e sistemas por mundo;
  seleção por `VITE_WORLD` → subdomínio `santuario.` → `?mundo=santuario`.
- `World` com limites (`VOID` fora, carregamento recortado, spawn central) e blocos permitidos por perfil.
- `FlatGenerator` + interface `TerrainSource`; bioma `celestial`; partículas douradas (`sparkle`); céu em degradê e
  orla de nuvem nas bordas do mundo.
- Arte: Deusa (folha transparente; `process-sprite.py --alpha --grid-offset-y`), 18 ícones da prancha
  (`scripts/slice-icons.py`), faces provisórias procedurais (`render/celestialArt.ts`), `composeCube` reutilizável.
- Artefato próprio do Santuário (`npm run build:artifact:santuario`); `build-artifact.mjs` aceita nome e título.
- 7 testes novos (perfis, limites, blocos permitidos, buraco, spawn, personagem, hotbar).

## 0.12.0 — 2026-11-02
**Desempenho**
- Gerador: uma avaliação de ruído por célula (`cellAt`) → gerar chunk 3,5× mais rápido (0,26 → 0,07 ms).
- `World`: chunks com chave numérica + cache do último chunk → leituras 1,4× mais rápidas.
- Assets em WebP (`scripts/optimize-assets.py`, ADR 0007): 3,4 → 1,1 MB; artefato 4,7 → 1,5 MB.
- `npm run bench` com benchmarks de geração e leitura.

**Correções**
- Zoom pelo teclado (Q/E) dependia da taxa de quadros; agora usa `dt`.
- Árvores podiam nascer sobre as trilhas de caminho de terra.
- `make-icons.py` lia o PNG antigo da heroína.
- Aviso de tamanho do bundle no build ajustado ao arquivo único (limite 1,8 MB, documentado).

**Documentação**
- `CLAUDE.md` (instruções para IA, armadilhas conhecidas) + `AGENTS.md`; `docs/README.md` (índice);
  `docs/MAPS.md` (módulos, frame, regras, ciclos, assets, "onde mexer para…").
- CURRENT_STATE, NEXT_STEPS, ARCHITECTURE (seção Desempenho), OPERATIONS, CONVENTIONS e DECISIONS
  reorganizados; conteúdo obsoleto removido dos domínios.

**Verificação**: sessão automatizada (3 seeds, desktop/celular, 120 ações aleatórias cada) sem erros.

## 0.11.1 — 2026-11-02
- Arte dos blocos trocada pela prancha 3/4 fornecida (`blocks-sheet-34.png`) após comparação no jogo com a extração
  da prancha isométrica: frente sem distorção, terra arada/pedra/piso mais legíveis, grama mais calma no chão.
- `extract-blocks.py`: modo 3/4 (padrão) por recorte direto; `--iso` mantém a prancha antiga; `--out` para testes.
- Ícones da hotbar refeitos a partir da prancha 3/4.

## 0.11.0 — 2026-11-01
- Blocos substituídos pelos 8 da prancha fornecida: Terra, Terra com Grama, Terra Arada, Caminho de Terra, Areia,
  Pedra, Tora de Carvalho, Piso de Carvalho. Removidos tijolos, tábuas antigas, arbustos, minérios, cristal,
  arenito, neve, gelo, musgo encantado, cogumelo e árvores encantada/pinheiro (com tundra e floresta encantada).
- Materiais com id único para chão e cubo; mundo gerado só com eles (+ água, árvores, cacto, enfeites, trigo).
- `scripts/extract-blocks.py`: prancha isométrica → atlas 3/4 (topo, frente, chão contínuo) + ícones.
- Trilhas naturais de caminho de terra; plantio também em terra arada.

## 0.10.0 — 2026-11-01
- Botão de ação (toque) com aro vazado: toque curto usa o selecionado no alvo à frente; segurar 2 s quebra.
  Ícone = espaço selecionado ou mão; anel de progresso no próprio botão. Espaço faz o mesmo no desktop.
- Alvo à frente da personagem parada com cantoneiras pulsantes; nenhum alvo ao andar.
- Mão vazia: tocar no espaço selecionado (ou Esc) solta; o jogo começa com a mão vazia.
- No toque, tocar direto no mundo não age mais (só o botão). Mouse inalterado.
- Regras de ação unificadas por célula (`canUseAt/canBreakAt/applyUse`) para cursor e botão.
- `setPointerCapture` defensivo no botão e no joystick.

## 0.9.0 — 2026-11-01
- Ferramentas como itens selecionáveis (`TOOLS`): espada, enxada, picareta, pá, machado, com ícones fornecidos.
- Equipar ao selecionar: heroína usa a folha da ferramenta ao andar (5 folhas fornecidas, normalizadas).
- Hotbar: ferramentas 1–5, semente 6, trigo 7, blocos depois. Joystick acima da hotbar em paisagem baixa.
- `process-sprite.py --rows-map` (reordenar/espelhar linhas) e altura do desenho no relatório.

## 0.8.0 — 2026-11-01
- Itens contáveis (`world/items.ts`): Semente de Trigo e Trigo; inventário, hotbar com contador, itens caídos com coleta.
- Trigo plantável na terra, 16 estágios de crescimento por tempo (`World.tick`), colheita com drops.
- Ovelhas comem trigo, formam par, namoram (animação fornecida) e têm filhote (sprite fornecido) que cresce.
- Desvio lateral das ovelhas ao contornar obstáculos a caminho do par.
- `process-sprite.py` com argumentos nomeados (`--cols/--rows/--region/--sat/--min/--frame-h`).
- `window.__game` exposto apenas em desenvolvimento para testes no navegador.

## 0.7.0 — 2026-11-01
- Jogo garantidamente horizontal em toque: tela cheia + `screen.orientation.lock('landscape')` no 1º gesto
  (repetido se o jogador sair), camada "Gire o aparelho" em retrato que pausa a entrada.
- PWA: `manifest.webmanifest` (fullscreen, landscape), ícones, metas iOS/Android, `viewport-fit=cover`.
- Layout compacto para paisagem com até 500 px de altura (hotbar e joystick menores).
- Correção: camada com `display: grid` ignorava `hidden` e capturava toques.

## 0.6.0 — 2026-11-01
- Primeiro NPC: ovelha (sprite fornecido, 4 direções × 4 quadros) com IA de pastar/passear e retorno a casa.
- `Walker`: base comum de movimento/colisão/altura extraída do `Player` (sem duplicar regra para NPCs).
- `Entities`: personagem + NPCs, colisão entre entidades, ocupação de células para colocar/cavar, rebanho inicial.
- Renderer desenha todos os atores com ordenação por profundidade; `character.ts` generalizado para folhas de atores.
- `process-sprite.py` aceita altura do quadro e limiares de fundo/sombra.

## 0.5.0 — 2026-11-01
- Tela limpa: removidos painel de informações, botões (Chunks/Modo/Tempo/Novo mundo), dica de nome e texto de
  ajuda. Fica só a hotbar; o joystick aparece apenas em telas de toque.
- Quebrar passa a exigir segurar 2 s sobre o alvo (rachaduras + anel); colocar é toque/clique curto. Removido o
  modo Quebrar/Colocar (tecla F) e a diferença entre botões do mouse.
- Novo mundo agora só via `?seed=` (sem botão).

## 0.4.0 — 2026-11-01
- Chão quebrável: quebrar célula vazia cria `HOLE` (não pisável por personagem/animais, não quebrável).
- Buraco só aceita cubo novo, que vira piso nivelado (pisável e empilhável); quebrar o piso reabre o buraco.
- Bloqueado cavar sob a personagem. Água continua inquebrável.
- Render de buraco (parede interna 3/4) e de piso de cubo.

## 0.3.0 — 2026-11-01
- Cubos empilháveis (máx. 2 por célula, `MAX_STACK`); quebrar remove o de cima.
- Personagem sobe 1 nível por vez (`STEP_HEIGHT`) e desce livremente; altura suavizada no sprite e na câmera;
  HUD mostra o nível.
- Montanhas geradas com 1–2 níveis (minério no cubo exposto).
- Correção: `AIR` herdava `shape: 'cube'` da fábrica de objetos.

## 0.2.0 — 2026-11-01
- **Vista superior inclinada (3/4)** substitui a vista lateral (ADR 0003): mundo com camadas chão/objeto,
  gerador 2D (elevação, rios, montanhas com minérios, florestas), cubos com face superior + frontal.
- **Personagem jogável** a partir da folha de sprites fornecida (`scripts/process-sprite.py` remove o fundo e
  uniformiza quadros), colisão, 4 direções e animação de caminhada.
- **Câmera** segue a posição lógica com suavização (sem balanço), zoom automático com personagem grande.
- **Joystick virtual** alinhado às direções da tela.
- Alcance de interação; spawn em bioma acolhedor; clima deslocado por seed.
- Removidos: céu/parallax lateral (`background.ts`), rocha-mãe, cavernas. Novos: `daycycle.ts`,
  `character.ts`, `player.ts`, `joystick.ts`, sombras de nuvens.

## 0.1.1 — 2026-11-01
- `npm run build:artifact`: build em arquivo único publicado como Artifact para teste no navegador.
- Canvas usa `100%` em vez de `100vw/100vh` (respeita a área segura do host).

## 0.1.0 — 2026-11-01
- Projeto criado (Vite + TypeScript, sem framework).
- Domínio `world`: PRNG/ruído com seed, registro de blocos, biomas, gerador puro, chunks 16×16, `World`
  com regras de quebrar/colocar e ciclo de vida de chunks. Testes Vitest.
- Domínio `render`: texturas procedurais estilo RPG/anime, cache offscreen por chunk, fundo parallax com
  ciclo dia/noite, brilhos, partículas por bioma.
- `game`: câmera, input (teclado/mouse/toque), HUD e hotbar.
- Documentação viva inicial (`docs/`) e ADRs 0001–0002.
