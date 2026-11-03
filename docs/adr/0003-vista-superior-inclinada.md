# ADR 0003 — Vista superior inclinada (3/4) e personagem jogável

**Status:** aceito (2026-11-01). Substitui a parte "vista lateral" da ADR 0001 (geração pura e chunks 16×16
continuam valendo).

## Contexto
Pedido: câmera em vista superior inclinada, personagem maior na tela, joystick alinhado às direções da tela
e acompanhamento sem o balanço da caminhada. Foi fornecida uma folha de sprites (4 direções × 4 quadros).

## Decisão
- Mundo em plano 2D com **duas camadas por célula**: chão (plano, walkable ou líquido) e objeto (cubo,
  árvore ou enfeite). Sem eixo de altura por enquanto.
- Projeção 3/4 "oblíqua": face superior do cubo deslocada `CUBE_FRONT` px para cima + face frontal. Ordenação
  por linha (base do sprite = base da célula) entre objetos e personagem.
- Chão vai para cache por chunk; objetos e personagem são desenhados por frame (poucas centenas de células).
- **Câmera sem rotação**: direções de tela = direções do mapa; joystick e teclado produzem o mesmo vetor.
- Câmera segue a posição lógica (pés) com suavização exponencial; o sprite anima, a câmera não.
- Personagem é um **asset raster** (exceção à ADR 0002): processado offline por script reprodutível a partir
  da folha original versionada em `assets-src/`, com ancoragem comum entre quadros.

## Consequências
- Cavernas/rocha-mãe e o céu lateral saíram; montanhas viraram paredes de blocos mineráveis.
- PNG da personagem (~400 kB) entra inline no artifact; otimização listada em NEXT_STEPS.
- Testes cobrem determinismo, camadas, spawn, regras de colocar/quebrar e colisão do jogador.
