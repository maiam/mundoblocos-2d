# Domínio: render

Apenas apresentação; lê `World`, nunca escreve.

## Direção de arte — "ilustração digital de fantasia, RPG/anime" em 3/4
- Cubos: face superior clara (gradiente cima-esquerda, filete de luz), face frontal mais escura, aresta clara
  entre faces, contorno na cor escurecida. Árvores: copa em "nuvens" cel-shaded sobre tronco; pinheiros com neve.
- Sombras e contornos puxam para índigo; brilhos em estrela para neve, ouro, cristais, água.
- Texturas em resolução 2× (`TEX_RES`) para nitidez com zoom ~2.

## Arte dos blocos (prancha)
- Fonte: `assets-src/blocks-sheet-34.png` (prancha já em 3/4, topo + frente) → `scripts/extract-blocks.py` →
  `src/assets/blocks-atlas.png` (linha 0: topo do cubo 64×64; linha 1: face frontal 64×36; linha 2: chão
  contínuo) + `icon-block-*.png`.
- Recorte direto por proporção medida (corpo ≈ 1,17 × largura, topo ≈ 51,5 % do corpo), ancorado na base do cubo
  (a grama transborda por cima). A frente encaixa sem distorção; o topo, desenhado achatado, é esticado ~1,6× na
  vertical para a célula quadrada.
- A prancha isométrica anterior (`blocks-sheet.png`) segue suportada com `--iso` (comparação registrada no CHANGELOG).
- Chão: miolo do topo sem contorno, misturado com cópia deslocada meia célula (sem emendas); terra/grama/
  caminho/areia/pedra giram/espelham por célula; arado, tora e piso mantêm a orientação.
- `render/blockArt.ts` carrega o atlas antes do jogo começar (`main.ts`).

## Pipeline
- `ChunkRenderer` (cache do chão por chunk, invalidado por `version`, liberado após ~90 frames sem uso):
  variação de tile por hash → barranca no lado norte da água → espuma nas margens → grade sutil → sombras
  projetadas por cubos e árvores.
- Chão especial: `HOLE` = fundo escuro + parede de terra no lado norte (onde o vizinho não é buraco) + contornos;
  cubo como piso = face superior do sprite do cubo desenhada plana na célula.
- Pilhas: cada nível é desenhado `CUBE_FRONT` px acima do anterior (mesmo sprite de cubo); sombra no chão cresce
  com a altura. `pick()` considera a pilha inteira clicável; clicar num cubo com espaço empilha nele.
- Por frame: objetos linha a linha (de cima para baixo da tela); a personagem é desenhada logo após a linha
  dos seus pés. Água ganha brilhos animados; nuvens projetam sombras que derivam.
- `pick()` escolhe o objeto sob o cursor testando as linhas da frente primeiro (sprites sobem acima da célula).

## Personagem
- Folhas canônicas: frente, esquerda, direita, costas. As folhas com ferramenta chegaram como frente, direita,
  costas, esquerda (e a da pá sem lado direito); `process-sprite.py --rows-map` normaliza (a pá usa espelho
  da esquerda). Mesma altura de desenho da folha base → mesma escala (`CHARACTER_H`).
- `assets-src/heroine-sheet.png` → `scripts/process-sprite.py` → `src/assets/heroine.png` (fundo e sombra
  removidos por flood fill, caixa comum a todos os quadros, 4×4 de 115×144 px).
- Linhas: frente, esquerda, direita, costas. Parado = quadro 0; andando = 7 quadros/s. Sombra própria fixa nos pés.
