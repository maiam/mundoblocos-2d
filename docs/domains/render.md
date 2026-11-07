# Domínio: render

Apenas apresentação; lê `World`, nunca escreve.

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

## Padrão de Materiais V2 (em validação, ADR 0022)
- A arte entrega **material plano** 128×128 (`assets-src/materiais/<material>/{top,front,front_overlay}.png`,
  contrato na pasta); `scripts/build-materials.py` gera `materials-v2.webp` (linhas top 64, f16 32, f18 36, o16, o18)
  + `materials-v2.json`. O motor monta o cubo: `composeCube(top, front, contorno, alturaDaFrente)`; ordem interna frente
  → franja → sombra da frente → topo → aresta/contorno. Chão plano usa só o topo.
- `render/materialsV2.ts`: `V2_BLOCKS` (composição por bloco: areia, terra, grama, Pedra Bruta) e o estado do atlas; `textures.applyMaterialsV2` troca os
  blocos-piloto quando `?blocos=v2`; `textures.qaMaterial` serve a cena `?escala=1` (`render/scaleScene.ts`).
- Transições entre chãos (etapa 3) só no chão plano e na mesma altura; máscaras são formas e podem girar (CONVENTIONS).

## Pipeline
- `ChunkRenderer` (cache do chão por chunk, invalidado por `version`, liberado após ~90 frames sem uso):
  material → topo contínuo do atlas **sempre na direção desenhada** (nunca gira nem espelha; só a variação, quando há mais de uma, é sorteada por célula) · água → tile procedural ·
  `HOLE` → fundo escuro + parede de terra no lado norte; depois barranca e espuma nas margens, grade sutil e
  sombras projetadas por cubos e árvores.
- Pilhas (até 3): cada nível é desenhado `CUBE_FRONT` px acima do anterior (mesmo sprite de cubo); sombra no chão cresce
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

## Personagem modular (teste, ADR 0017)

Contrato em `assets-src/personagens/CONTRATO.md`; `scripts/export-personagem.py` gera, por parte e ação, folhas WebP
(linhas frente, esquerda, direita, costas; uma coluna por quadro) e `manifesto.json` com quadro, âncora já recortada,
`escalaMundo`, fps, ciclo e ordem das partes (padrão + por direção). O motor deve desenhar o quadro no tamanho dele ×
`escalaMundo` × zoom — **não** esticar para uma altura fixa como `SheetSpec.height` — e empilhar as partes pela ordem.
Implementado na v0.48.0: `render/modular.ts` (puro: `modularFrame` escolhe ação, linha, coluna e partes;
`lookFromSearch` lê `?personagem=chibi`), `render/modularCharacter.ts` (`ModularSprites`: carrega as folhas sob
demanda e só desenha com todas prontas; senão o `Renderer` usa a folha de sempre). `ArtPack.modular` traz o manifesto
e as URLs (`import.meta.glob` de `src/assets/chibi-*.webp`). O ator do jogador ganha `Actor.look` quando
`Entities.look` está definido.

O piloto artístico em `humano-chibi/entrega/v02/` agora tem onze peças e treze folhas de caminhada,
status `revisao` (guarda-roupa fantasia 01, revisão 4). Há quatro tops e quatro peças de pernas, combináveis
independentemente: 16 combinações sobrepostas, 25 incluindo a roupa bege da base. A revisão 4 corrige os braços da linha direita e os recortes das roupas;
frente/esquerda/costas, cabeças, cabelo e sapatos permanecem idênticos. Seletores, sorteio, prancha comparativa e animações em `previas/v02/`.
Sapatos começam desligados; encaixes, detalhes entre vistas e movimento continuam em revisão.
Usar o exportador antes do teste optativo no cenário. As prévias montam as folhas mestre; não validam integração,
colisão ou desempenho no jogo.
