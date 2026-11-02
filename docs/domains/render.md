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
- `render/blockArt.ts` carrega os atlas (materiais e celestiais) antes do jogo começar (`main.ts`).

## Pipeline
- `ChunkRenderer` (cache do chão por chunk, invalidado por `version`, liberado após ~90 frames sem uso):
  material → topo contínuo do atlas (girado/espelhado por célula, exceto orientados) · água → tile procedural ·
  `HOLE` → fundo escuro + parede de terra no lado norte; depois barranca e espuma nas margens, grade sutil e
  sombras projetadas por cubos e árvores.
- Pilhas: cada nível é desenhado `CUBE_FRONT` px acima do anterior (mesmo sprite de cubo); sombra no chão cresce
  com a altura. `pick()` considera a pilha inteira clicável; clicar num cubo com espaço empilha nele.
- Por frame: objetos linha a linha (de cima para baixo da tela); a personagem é desenhada logo após a linha
  dos seus pés. Água ganha brilhos animados; nuvens projetam sombras que derivam.
- `pick()` escolhe o objeto sob o cursor testando as linhas da frente primeiro (sprites sobem acima da célula).

## Personagem
- Folhas canônicas: frente, esquerda, direita, costas. As folhas com ferramenta chegaram como frente, direita,
  costas, esquerda (e a da pá sem lado direito); `process-sprite.py --rows-map` normaliza (a pá usa espelho
  da esquerda). Mesma altura de desenho da folha base → mesma escala (`CHARACTER_H`).
- `assets-src/heroine-sheet.png` → `scripts/process-sprite.py` → `optimize-assets.py` → `src/assets/heroine.webp` (fundo e sombra
  removidos por flood fill, caixa comum a todos os quadros, 4×4 de 115×144 px).
- Linhas: frente, esquerda, direita, costas. Parado = quadro 0; andando = 7 quadros/s. Sombra própria fixa nos pés.
- Folhas de ação (`SheetSpec.action`: golpes `heroine-sword-attack` e `heroine-axe-attack` (313/288, machado erguido)): quadro vem de `Actor.frame`.
  Recorte com `--alpha --largest` (o maior pedaço por quadro descarta fragmentos de quadros vizinhos);
  altura ajustada pela razão de desenho (297/288) para manter a escala da personagem.
- Personagens que flutuam (`SheetSpec.float`, hoje a Deusa): quadros em vai-e-volta contínuo, sprite pairando
  com balanço senoidal sub-pixel, sombra no chão que encolhe ao subir.
