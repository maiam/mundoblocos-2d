# Domínio: render

Apenas apresentação; lê `World`, nunca escreve.

## Paredes com arte (W3, v0.93.22, ADR 0027)

`scripts/build-wall-atlas.py <material>` gera `src/assets/walls-<material>.webp` (16 tampas 4 × 4, índice = máscara N·1 + L·2 + S·4 + O·8, e 4 frentes abaixo; `render/wallAtlas.ts` guarda o layout e `wallArtPiece`, a escolha da peça). `render/sanctuaryWallArt.ts` desenha: um plano horizontal (tampa) à altura `WORLD_SCALE.wall` e, onde não há parede ao sul, um plano vertical (frente) com a base na face sul da laje; planos instanciados por peça, `alphaTest` 0,5, texturas recortadas do atlas (mipmaps sem sangrar). O `SanctuaryThreeRenderer` carrega os atlas do pacote de arte (`ArtPack.wallAtlases`) e refaz as paredes ao carregar; blocos sem atlas usam o protótipo de cor lisa (hoje Tábuas e Pedra têm atlas). O `pick` inclui as malhas das paredes. **Porta:** o atlas ganha 3 quadros (`door_closed/half/open`, fileira y = 4·128+154; atlas 512 × 820); a frente da porta é o quadro do estado, com quadro intermediário de 140 ms ao trocar de estado (`DOOR_HALF_MS` no `SanctuaryThreeRenderer`).

## Iluminação dinâmica (v0.93.19, ADR 0029)

`render/lighting.ts` (puro) escolhe e calcula as luzes; `render/sanctuaryLighting.ts` desenha, depois da cena, um retângulo de tela cheia com a escuridão ambiente e um buraco de luz por fonte (shader com até `MAX_LIGHTS` = 12 fontes; posição na tela pela mesma projeção oblíqua; raio em pixels). Fontes: a Deusa (`PLAYER_LIGHT`) e os blocos com `glow` (`glowLightFor`), reunidos junto com as malhas e filtrados por `pickLights`. Ligada por `?luz=noite|penumbra|0..1` (só vista oblíqua); `GameRenderer` não muda. O HUD é DOM e não escurece.

## Paredes — protótipo de autotile (v0.93.16, ADR 0027)

> **v0.93.20:** a tampa do protótipo tem franjas (coluna: `franja | miolo | franja`, `CAP_TRIM` ≈ 0,21; fileira: franja na borda norte); `?espessura=` aceita `x` até 1,0 (coluna = célula inteira). A geometria usa `wallFootprintParts` (tipo de cada parte).

`render/sanctuaryWallPrototype.ts` desenha cada parede do `World` como uma placa fina de cores lisas: para cada célula, `wallFootprint(wallNeighbors(...))` dá o poste e os braços (retângulos em coordenadas da célula) e cada um vira uma caixa de altura `WORLD_SCALE.wall`. A frente só aparece no último bloco de uma fileira norte–sul por consequência da geometria. O `SanctuaryThreeRenderer` refaz as paredes junto com as malhas, inclui-as no `pick` (a célula inteira conta como parede, mesmo no vão) e usa um ícone SVG provisório na hotbar. `sanctuary3DGeometryCells` não desenha paredes como cubos. Desde a v0.93.27 as paredes estão no perfil do Santuário (a flag `?paredes=autotile` foi removida); `&espessura=x,z` (ex.: `0.25,0.35`) muda a espessura por eixo (x = faixas, z = tampa). Será substituído pela arte (W1/W3).

## Escala do mundo no Santuário (v0.93.14, ADR 0028)

A vista oblíqua usa **K = 1** (`OBLIQUE_K`): um metro de altura = uma célula na tela, frente do cubo quadrada (a imagem do topo, escurecida, serve de frente enquanto a arte de frente não vem). `render/worldScale.ts` guarda as relações do Core Keeper: cubo 1,0, parede ≈ 1,2, personagem ≈ 1,2 (`CHARACTER_SCALE_FACTOR` = 1,2/2,2 sobre os planos desenhados para a escala antiga). O renderer expõe `preferredCellsTall` (14); o `Game` repassa à `Camera.setCellsTall`. A inclinada (`?vista=inclinada`) não muda.

## Teste da escala do mundo (v0.93.12–13, ADR 0027/0028)

`?mundo=santuario&paredes=teste` adiciona à cena (`sanctuaryWallProportionTest.ts`) três grupos lado a lado, cada um com cubo, parede, régua vertical de 2 segmentos, régua de 1 célula no chão e uma personagem de referência parada: **ATUAL** (cubo 0,56; parede 1,125; personagem 2,2), **PROPOSTA** (1,0; 2,0; 1,75) e **CORE KEEPER** (1,0; ≈ 1,2; ≈ 1,2, medida de uma cena do jogo). A Deusa controlável usa a escala de `?escala=atual|proposta|core` (padrão `core`; fator `characterScale`). Altura de tela = altura de mundo × K, então o teste emula cada escala dentro da vista atual. Só visual: não entra no `World` nem bloqueia a Deusa.

## Vista oblíqua do Santuário — padrão (v0.93.10, ADR 0026)

A vista oblíqua é o padrão; `?vista=inclinada` volta à câmera inclinada a 67°. Ela troca a câmera inclinada por uma **projeção oblíqua**: câmera reta para baixo, altura = deslocamento de `OBLIQUE_K` (18/32) de célula por nível na tela. A matriz é montada em `render/sanctuaryObliqueView.ts` (função pura, testada): `y_clip = (vy + K·altura)/halfH`, profundidade `z_clip` que cresce para o norte e para baixo (sul/alto na frente). Vertical mantém a proporção da arte: a Deusa é um plano de altura 3,0/K (3,0 células em tela). Materiais sem luz (arte já pintada) com a frente escurecida por um multiplicador frio fixo. O `pick` usa o raio da oblíqua (`obliqueRay`). Não adaptados: mármore V3 (calibrado a 67°), contorno de blocos, partículas.

## Fase 1 do render WebGL — robustez e medição (v0.93.5, ADR 0026)

`SanctuaryThreeRenderer` trata perda e volta do contexto WebGL (o Three recria seus recursos; o renderer refaz malhas e texturas de canvas) e remove os listeners no `dispose`. Tipos reais (`@types/three`), sem `any`. `GameRenderer.stats?()` expõe contadores para medir desempenho; `SANCTUARY_THREE_OPTIONS` (em `rendererContract.ts`) classifica cada campo de `RenderOptions` como `honored`/`ignored` e serve de checklist de paridade para as próximas fases.

## Mármore Celestial V2/V3 removido (W4, v0.93.28, ADR 0027)
O comportamento especial do Mármore Celestial (82) no Santuário — dois níveis em um clique, formas adaptativas, âncora V3 de duas células, ordem de colocação, borda ornamental e cantos em L — foi **removido** (`sanctuaryMarbleAdaptive`, `sanctuaryV3Surfaces`, `World.marbleV3*`/`marblePlacement*`). O 82 é um cubo comum: empilha e quebra um nível por vez, e entra no autotile horizontal genérico (`render/adaptiveWalls.ts`, forma `thin`) como os demais celestiais. Paredes novas são só as autotile (`world/walls.ts`). Salvamento v15 descarta os campos antigos.


## Núcleo 2.5D genérico — `render/three/` (ADR 0031, M1, v0.93.29)
`ThreeStage` (cena, câmera `tilt`/`oblique`, `WebGLRenderer`, perda/volta de contexto com `onRestored`, `syncCamera`, `aim`/`hits`/`groundCell` para o `pick`, `stats`), `SelectionMarkers` (realce de cursor/foco e de quebra) e `BlockMaterials` (cache de materiais por id; cada mundo passa a sua função de faces — `celestialFaces` no Santuário). O `SanctuaryThreeRenderer` (548 → ~395 linhas) compõe os três e ficou só com o que é do Santuário (chão/blocos por perfil fixo, paredes, Deusa, luz). O `WorldThreeRenderer` do Mundo (M2) usará o mesmo núcleo. Refator sem mudança visual: capturas antes × depois idênticas fora da animação (4 variantes) e mesmas estatísticas de GPU (62 chamadas / 30 956 triângulos na cena de teste).

## Mundo em 2.5D — `WorldThreeRenderer` (ADR 0031, M2 em construção, v0.93.30)
Só em **desenvolvimento** e com `?render=3d` (o build de produção não o contém: o `import()` fica sob `import.meta.env.DEV`). **Fatia M2.1:** `ChunkFloor` (um plano de 16 × 16 por chunk visível, textura = canvas do `ChunkRenderer`, que continua pintando Material V2, transições, barrancas e sombras; reenvio à GPU só quando `chunk.version` muda, no máximo 2 chunks pintados por quadro, chunks fora da área liberam a GPU) + o jogador (`actors[0]`) numa folha 2D em plano vertical com a escala do mundo (`CHARACTER_SCALE_FACTOR`, altura ÷ K) e sombra + realces + `pick` no plano do chão. Mesma vista oblíqua K = 1 e `preferredCellsTall` 14 do Santuário. **Fatia M2.2 (v0.93.31):** cubos (`shape: 'cube'`) por `ChunkBlocks` — por chunk visível, uma malha instanciada por (bloco, forma) (`solid` ou `thin`, a parede horizontal fina legada, via `classifySanctuaryBlock`), reconstruída só quando `chunk.version` muda (o `World` já avisa os vizinhos nas bordas), no máximo 2 reconstruções por quadro (a versão antiga fica na tela até lá) e liberação fora da área; `pick` acerta cubos. `worldBlockFaces`: topo = textura de chão do material; **frente provisória** = o próprio topo (escurecido pelo material) ou, quando o V2 tem frente própria (terra sob a grama, casca da tora), essa arte esticada a uma célula — até a arte de frente nova chegar (ADR 0031 § 6). **Fatia M2.3 (v0.93.32):** objetos altos por `ChunkSprites` — cada sprite 2D (árvores, pedras, cultura, enfeites, cerca, baú, fogueira, tenda, **cidade**: torres, bancos, poço…) vira um plano vertical com a base na face sul da célula (mesma âncora `ox`/`oy` do 2D) e o tamanho **em células** da arte (o mundo mantém a escala em células; só o personagem encolhe, ADR 0028; altura ÷ K). Instanciado por chunk e sprite, reconstruído por `chunk.version`/orçamento como os cubos; **sólidos** usam `alphaTest` e escrevem profundidade (o personagem some atrás), os **de passar por cima** (grama, flor, cultura, porta aberta) não escrevem profundidade, para nunca cobrir o personagem. `worldSpriteArt` repete as escolhas do `drawObject` 2D (variação por hash da seed, na cidade por sal fixo; porta aberta/fechada; cerca emendada compondo as peças num canvas). `pick` por plano só vale dentro do retângulo `hit` do sprite (sem ler pixels). Chegada de arte (cultura, dungeon) refaz os planos (`invalidateAll`). **Ainda sem:** animação da porta, brilhos/luz, sobreposição ordenada entre enfeites. **Não desenha ainda:** atores além do jogador, itens, luz, efeitos, interiores e dungeon — o mapa de paridade é `WORLD_THREE_OPTIONS` (`rendererContract.ts`). Física **inalterada** (degrau automático ligado; a regra sem degrau é do M5, atrás de flag). **Fatias seguintes:** M2.2 cubos e terreno alto (frente quadrada provisória), M2.3 objetos altos (árvores, cultura, cercas, portas, baú), M2.4 água animada e acabamento.

## Revisão da câmera do Santuário — 67° (PR #93)

Após comparação visual com Core Keeper, a câmera Three.js do Santuário foi ajustada de 80° para **67° acima do chão** (ortográfica, azimute 0°). Isso torna a frente dos blocos e objetos mais visível, preservando exatamente os estados `pillar`, `wall_front`, `wall_back`, a textura do topo ornamental do Mármore Celestial 82, a Deusa em plano vertical, colisões e salvamentos. O ângulo original do Core Keeper não é conhecido; 67° é um ponto de partida experimental para validação visual.

## Santuário oficial — oclusão e sombra independentes da Deusa (PR #91)

No Three.js, `ActorSprites.get('goddess').draw()` é chamado sem sombra e com ponto de apoio no rodapé do canvas 256×320, alinhado ao jogador; o deslocamento de flutuação é aplicado **uma vez só**, pela animação original. O ponto físico da sombra usa `player.z`, enquanto o billboard usa `player.visualZ` para transições suaves. A sombra é uma elipse horizontal escura acima do suporte, nunca um elemento vertical que acompanha a câmera. O billboard principal usa teste de profundidade normal; um eco espectral com 18% de opacidade o precede na renderização para não apagar a Deusa completamente atrás de blocos, sem transformar toda parede em transparência. O motor e a física do Mundo principal permanecem iguais.

## Santuário oficial — Three.js com personagem 2D (PR #89)

**Colisões após a migração (PR #90):** o `World.standHeight` e o `Walker` continuam como fontes de verdade, mas na sessão do Santuário com WebGL a configuração do jogador aplica `stepHeight=0`. Cubos visíveis são obstáculos sólidos e não degraus automáticos. Um bloco de altura 1 passa a bloquear a entrada, enquanto um chão desocupado segue transitável. O Mundo principal e o fallback `?render=2d` mantêm `STEP_HEIGHT=1`. Não há colisão física subcélula para o recorte traseiro das paredes finas nesta etapa.

O perfil Santuário é renderizado por `render/sanctuaryThreeRenderer.ts` via `THREE.WebGLRenderer`, com objetos 3D reais e `InstancedMesh` agrupados por bloco/material e altura. Os 18 materiais usam as faces existentes de `celestialArt.ts` (80–85 usam as seis superfícies aprovadas); o personagem é o sprite original da Deusa animado em billboard transparente. Câmera ortográfica top-down inclinada, frente física dos painéis finos alinhada à dos pilares, dois níveis oficiais e herança geométrica vertical. A classificação 3D está em `render/sanctuaryThreeLayout.ts`, sempre derivada de `World`/`adaptiveWalls.ts`, sem duplicar estado. Seleção por raycast; movimentação, colocação, quebra e salvamento permanecem no Game oficial. `?render=2d` força o renderer original. O Mundo principal segue Canvas 2D.

## Direção de arte — "ilustração digital de fantasia, RPG/anime" em 3/4
- Materiais: arte da prancha 3/4 (topo + frente), com contorno na cor do material, frente levemente escurecida e
  aresta clara entre faces.
- Procedural no mesmo estilo: água (brilhos em estrela), carvalho/cerejeira (copa em "nuvens" cel-shaded),
  cacto, capim e flores. Sombras e contornos puxam para índigo.
- Texturas em resolução 2× (`TEX_RES`) para nitidez com zoom ~2. Assets finais em WebP (ADR 0007).

## Arte dos blocos (prancha)
- Fonte: `assets-src/blocks-sheet-34.png` (prancha já em 3/4, topo + frente) → `scripts/extract-blocks.py` →
  `src/assets/blocks-atlas.webp` (linha 0: topo do cubo 64×64; linha 1: face frontal 64×36; linha 2: chão
  contínuo) + `icon-block-*.webp`.
- Recorte direto por proporção medida (corpo ≈ 1,17 × largura, topo ≈ 51,5 % do corpo), ancorado na base do cubo
  (a grama transborda por cima). A frente encaixa sem distorção; o topo, desenhado achatado, é esticado ~1,6× na
  vertical para a célula quadrada.
- A prancha isométrica anterior (`blocks-sheet.png`) segue suportada com `--iso` (comparação registrada no CHANGELOG).
- Chão: miolo do topo sem contorno, misturado com cópia deslocada meia célula (sem emendas); terra/grama/
  caminho/areia/pedra giram/espelham por célula; arado, tora e piso mantêm a orientação.
- Materiais com várias artes (`MATERIAL_VARIANT_COLS`, hoje a Terra com Grama): `textures.groundVariants` (chão) e
  `variants` (cubo); o chão e o cubo sorteiam a variação por célula com a seed.
- `render/blockArt.ts` carrega os atlas (materiais e celestiais), porta, água, tenda, baú e cidade antes do jogo começar
  (`main.ts`); a arte da dungeon vem depois (`loadDungeonArt` → `addDungeonTextures` → `ChunkRenderer.invalidateAll`,
  ADR 0013). Imagens são URLs de arquivos ao lado da página; o render nunca lê pixels de canvas.

## Padrão de Materiais V2 (em validação, ADR 0023)
- A arte entrega **material plano** 128×128 (`assets-src/materiais/<material>/{top,front,front_overlay}.png`,
  contrato na pasta; sem `front` a frente repete o topo; franja ≤ 32 px); `scripts/build-materials.py` gera
  `materials-v2.webp` (linhas top 64, front 36, overlay 36: frente de 18) + `materials-v2.json`. O motor monta o cubo
  com `composeCube`; ordem interna frente → franja → sombra da frente → topo → aresta/contorno. Chão plano usa só o topo.
- `render/materialsV2.ts`: `V2_BLOCKS` (composição por bloco: areia, terra, grama, Pedra Bruta) e o estado do atlas; `textures.applyMaterialsV2` troca os
  materiais V2 (o padrão; `?blocos=legado` desliga); `textures.qaMaterial` serve a cena `?materiais=1` (`dev/materialsScene.ts`, só dev).
- **Massa contínua** (v0.82.0): `cubeEdges` (puro) diz onde o cubo V2 tem contorno, olhando os vizinhos (`CubeView`);
  `textures.cubeSpriteV2` monta a variante (cache por bloco, nível e bordas) e `drawCubeParts` desenha topo e frente com
  bordas iguais às dos vizinhos (`Renderer.drawCubeV2`). Frente = textura seamless inteira, fatiada por nível
  (`materialsV2.paintFront`); franja só no nível mais alto; nível coberto desenha a continuação da parede, não o topo.
- **Chão V2 sem grade**: `BlockTextures.continuousGround` lista os chãos V2; o `chunkRenderer` pula neles a "grade sutil de blocos" (1 px por célula, alfa 0,07) que continua no chão antigo.
- **Transições entre chãos** (v0.87.0): `render/transitions.ts` (regras por par com `shape`, e `transitionPieces`), `textures.buildTransitions` (por forma 8 peças em 3 camadas: halo, corpo = topo do material que avança dentro da máscara, espuma; a Água avança com o ladrilho `agua` do V2) e `chunkRenderer` (desenha depois do chão: halo, corpo, espuma; pula barranca/fio de espuma antigos quando o vizinho recebe a margem nova). Só chão plano e mesma altura; máscaras são formas e podem girar (CONVENTIONS); a textura nunca gira.

## Texturas celestiais aprovadas — PR #87

O pacote `render/art/santuario.ts` registra seis imagens quadradas individuais (`Block.CLOUD_SOLID` a `Block.STONE_GOLDEN`, IDs 80–85). `render/blockArt.ts` pré-carrega essas superfícies, com fallback no atlas original, e `render/celestialArt.ts` aplica a mesma textura de cada material ao topo, frente e chão 2D. Os ícones dos seis blocos apontam às imagens novas. Não afeta o atlas dos outros 12 blocos nem o pacote do mundo principal.

## Autotile vertical dependente da base — revisão posterior ao PR #87

A forma da estrutura é determinada pelo bloco do **nível 0**, calculando apenas sua vizinhança horizontal e o bloqueio ao norte/sul. O nível 1 usa exatamente a mesma decisão geométrica, sem avaliar seus próprios vizinhos e sem alterar sua textura ou material. Se a base for pilar (inclusive porta), o bloco de cima será maciço; se a base for parede fina, o de cima também será fino. Blocos superiores não construtivos ou sem base construtiva permanecem maciços. Válido somente para os dois níveis oficiais e a câmera top-down, sem mudanças físicas.

## Autotile horizontal de construção — PR #87

`render/adaptiveWalls.ts` decide `solid`/`thin` consultando esquerda/direita e frente/trás no mesmo nível: só materiais construtivos específicos, nunca terreno, pedras naturais nem nuvens. Uma porta de carvalho oficial (aberta ou fechada) vale como pilar para conexões horizontais. No estado `thin`, o cubo V2 ou celestial continua usando o sprite já produzido, mas seu topo é recortado para a **metade frontal**, preservando **100% da face vertical frontal** no alinhamento do pilar. Grupos 2×2/3×3 permanecem maciços. Não requer câmera 3D, atlas novo nem sprites por combinação.

## Pipeline
- `ChunkRenderer` (cache do chão por chunk, invalidado por `version`, liberado após ~90 frames sem uso):
  material → topo contínuo do atlas **sempre na direção desenhada** (nunca gira nem espelha; só a variação, quando há mais de uma, é sorteada por célula) · água → tile procedural ·
  `HOLE` → fundo escuro + parede de terra no lado norte; depois barranca e espuma nas margens, grade sutil e
  sombras projetadas por cubos e árvores.
- Pilhas (até 2): cada nível é desenhado `CUBE_FRONT` px acima do anterior (mesmo sprite de cubo); sombra no chão cresce
  com a altura. `pick()` considera a pilha inteira clicável; clicar num cubo com espaço empilha nele.
- Porta (`textures.doorFrames`, folha `oak-door` 4×2 carregada com os atlas em `blockArt.ts`): corpo da porta
  fechada com a largura da célula, base na borda inferior (altura ≈ 3 × `CUBE_FRONT`), dobradiça à esquerda.
  Quadros 0–3 abrindo, 4–7 fechando; `Renderer.drawDoor` guarda quando cada porta mudou de estado (só aparência) e
  anima 0,32 s. Ícone da hotbar = quadro 0.
- Dungeon (`blockArt.getDungeonArt`, `textures.dungeonTextures`): 4 topos de chão; `shape: 'rock'` com
  **variantes por célula** (`textures.variants`, escolha por hash): montanhas 2,2 células de largura (anel externo),
  pedras 1,5, blocos decorados 1,15 (ovos/cogumelo/espinhos/raízes). **Parede do labirinto**: cubo da prancha
  esticado para T × (T + F), escurecido e desenhado 2 níveis (`textures.stackDraw`); liso na maioria, musgo/teia raros.
- Monstros (`SheetSpec.cycle`): 8 quadros em sequência (4×2) sem linha por direção; espelhados ao olhar para a
  direita; parados alternam 2 quadros; piscam ao levar golpe; barra de vida quando feridos. **Morte**
  (`Actor.dying`): folha própria (`SheetSpec.death`: quadros em sequência, `ratio` mantém a escala da caminhada;
  URL em `ArtPack.monsterDeaths`); sem ela, reserva procedural (encolhe/desbota + faíscas). A sombra some junto.
- Combate (`RenderOptions.hurtFlash/inDungeon/entrance`): vinheta vermelha de dano; penumbra radial dentro da
  dungeon; farol na entrada (`drawBeacon`) ou seta na borda da tela. Heroína invencível pisca (`Actor.hurt`).
- HUD (`game/hud.ts`): barra de vida com número e contador de espólios no canto superior esquerdo (safe-area).
- Números de dano (`render/damageNumbers.ts`): sobem ~0,9 célula e somem em 0,9 s, por cima da noite.
- Água (`blockArt.getWaterArt`, `extract-water.py`): chão = topo do bloco de água (ladrilho contínuo, sem espelhar);
  sem a arte, procedural. Enchimento (`Renderer.drawWaterFlows`): quadro 0–3 da linha da direção (oeste, leste, sul,
  norte) sobre a célula do buraco, entre o chão e os objetos.
- Tenda: sprite de ~2 células de largura desenhado no canto inferior esquerdo (`TENT`); `TENT_PART` sem sprite nem
  sombra; área clicável cobre as 2 colunas.
- Por frame: objetos linha a linha (de cima para baixo da tela); a personagem é desenhada logo após a linha
  dos seus pés. Água ganha brilhos animados; nuvens projetam sombras que derivam.
- `pick()` escolhe o objeto sob o cursor testando as linhas da frente primeiro (sprites sobem acima da célula).
  Construções da cidade valem pelo desenho inteiro (telhado incluído); objeto atrás delas não ganha o toque.
- Cidade (`render/townArt.ts`): imagens em escala única (`TOWN_PX_PER_CELL`), variação por posição com sal fixo; o
  quadro varre `TOWN_REACH` além da tela para sprites grandes. Brilho noturno: `glowColor` + `glowAt` (posição da luz
  no sprite, ex.: lanterna do poste).

## Cena de escala (ADR 0022, só em desenvolvimento)
- `?escala=1` abre uma fila de comparação com o **renderizador real** (`src/dev/scaleScene.ts`; os dados da fila em
  `scaleLayout.ts`, sem DOM e testados): personagens, animais, monstros, baú, bancos, árvores e uma casa 5×5 sobre a grade
  de 32 px. Marcações por cima (G grade, A âncoras e altura desenhada, B células bloqueadas e caixa de colisão, L nomes).
- Reproduzível: seed, hora (0,5), relógio de animação e `Math.random` fixos. Carregada por `import()` dentro de
  `import.meta.env.DEV`: não vai para o build de produção.
- Regra de escala conferida em teste: filhote ≈ 0,7× o adulto. Cavalo (1,6) < personagem (2,2): reavaliar antes de montaria.
- Ao integrar arte nova, compare na cena com o que já existe (ADR 0022; evoluções futuras: catálogo gerado, validação
  no pipeline, alturas calculadas em vez das razões `297/288` digitadas em `character.ts`).

## Cerca que se emenda (v0.59.0)
- `render/fence.ts`: `fenceParts(n, e, s, w)` decide a montagem pelos vizinhos que se emendam (`joinsFence`: cerca ou
  portão). Trecho reto = peça inteira (com o poste do meio); senão, metades cortadas na âncora (centro da célula) +
  poste grande por cima. `Renderer.drawFence` corta os canvases das peças (`textures.fencePieces`).
- Portão: sprite por estado (`objects`), desenhado depois dos objetos da linha para os postes cobrirem as travessas.
  Desenho de frente; em cerca vertical usa o mesmo (aguarda arte de lado).

## Minimapa (v0.51.0)
- `render/minimap.ts`: círculo no canto superior direito (112 px; 84 px no celular deitado), raio de 36 blocos, norte
  para cima, seta do jogador pela direção. Chunk descoberto = imagem 16 × 16 px (1 px por célula) refeita só quando
  muda a `version` do chunk do `World` ou a da névoa (`Exploration.chunk`), no máximo 6 por redesenho (10×/s).
- Cores em `render/mapColors.ts` (aparência, não propriedade do bloco): chão por id, objetos por id ou pela forma
  (árvore, construção, rocha), cubos pela cor do bloco do topo; enfeites pequenos deixam ver o chão.
- Marcadores: cidade (estrela), dungeon (quadrado, só depois de descoberta), tenda (triângulo), amigos (círculo);
  cidade e tenda presas na borda quando longe. Nunca lê pixels de volta (regra do Artifact).

## Personagem
- Folhas canônicas: frente, esquerda, direita, costas. As folhas com ferramenta chegaram como frente, direita,
  costas, esquerda (e a da pá sem lado direito); `process-sprite.py --rows-map` normaliza (a pá usa espelho
  da esquerda). Mesma altura de desenho da folha base → mesma escala (`CHARACTER_H`).
- `assets-src/heroine-sheet.png` → `scripts/process-sprite.py` → `optimize-assets.py` → `src/assets/heroine.webp` (fundo e sombra
  removidos por flood fill, caixa comum a todos os quadros, 4×4 de 115×144 px).
- Linhas: frente, esquerda, direita, costas. Parado = quadro 0; andando = 7 quadros/s. Sombra própria fixa nos pés.
- Folhas de ação (`SheetSpec.action`: `heroine-sword-attack`, `heroine-axe-attack` (313/288) arar `heroine-hoe-attack` (306/288) cavar `heroine-shovel-attack` (306/288) e minerar `heroine-pickaxe-attack` (362/288)): quadro vem de `Actor.frame`.
  Recorte com `--alpha --largest` (o maior pedaço por quadro descarta fragmentos de quadros vizinhos);
  altura ajustada pela razão de desenho (297/288) para manter a escala da personagem.
- Personagens que flutuam (`SheetSpec.float`, hoje a Deusa): quadros em vai-e-volta contínuo, sprite pairando
  com balanço senoidal sub-pixel, sombra no chão que encolhe ao subir.

