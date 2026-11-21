# ADR 0075 — Titã: controles de toque no estilo do Minecraft (setas e ação no ponto tocado) (v0.134.0)

**Status:** Aceita. Pedido do dono do produto (referência de captura do Minecraft de toque): no tablet e no celular o joystick funciona mal e a mira depende de selecionar o bloco com a mira central; no Minecraft há setas e a ação acontece onde o dedo toca. Substitui, no toque, o item 4 do ADR 0042 (a área de interação deixa de ser a metade direita).

## Decisão
1. **Setas no lugar do joystick** (`.titan-dpad`, 4 botões de 56 px: ▲ anda, ▼ recua, ◀ ▶ lateral; segurar duas dá a diagonal; multitoque, cada botão com captura de ponteiro). Alimentam o mesmo `input.stickX/Y` (digital: −1, 0, 1); o teclado e as setas do teclado seguem iguais. O botão de pular passou a quadrado com a seta para cima (⤒).
2. **A ação acontece onde o dedo toca** (`titan/aim.ts`, `rayThrough`): a área de interação cobre a tela toda acima da hotbar (os controles ficam por cima); ao tocar, o alvo (bloco, lasca ou animal) é o que está **sob o dedo**, calculado na hora (`computeAim` no `pointerdown`, a cada quadro e antes de soltar). O gesto não muda (ADR 0042/0055): toque curto coloca (ou golpeia o animal), segurar quebra, arrastar mais de 10 px gira a câmera. Sem dedo não há alvo nem contorno: **no toque some a mira central** (`.titan-cross`), e o contorno do bloco só aparece enquanto se toca.
3. **Anel no ponto do toque** (`.titan-touchring`, azul, como na referência): aparece ao armar o gesto e **enche com o progresso** da quebra; some ao levantar o dedo ou ao virar arrasto de câmera.
4. **Tocar na Mesa ou no Braseiro (ao alcance) abre a estação** no toque; o botão "Usar" fica só para quem não é de toque. `FOV_DEG` (75°) é compartilhado entre o renderer e `rayThrough`.
5. PC e mouse capturado não mudam (mira no centro).

## Consequências
- Quem toca fora do centro não precisa mais girar a câmera para mirar; arrastar continua girando. Um dedo em cima de um controle não age no mundo (os botões capturam o ponteiro).
- Pendências: aceite em aparelho real (tablet e celular, 360 px de altura); botão central da cruz (agachar/descer) não existe porque o Titã não tem agachar; sensibilidade da câmera e tamanho dos botões a calibrar; o tablet com mouse/teclado usa o ramo de PC.
- Testes: `aim.test.ts` (+2: o centro é o olhar, bordas e lados do raio). Conferido a 740 × 360 com emulação de toque: setas andam, segurar fora do centro mira e quebra o bloco sob o dedo, anel no ponto, alvo some ao soltar.
