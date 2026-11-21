# ADR 0076 — Titã: modo de mira no toque (dedo ou central) e corrida (v0.135.0)

**Status:** Aceita. Referência do Minecraft de toque do dono do produto (modo A: mira livre pelo dedo; modo B: controles divididos com mira central; corrida ao empurrar o movimento até o limite). Complementa o ADR 0075.

## Decisão
1. **Dois modos de mira no toque, com opção** (botão "Mira: no dedo / central" no menu do alto, só em aparelho de toque; lembrado em `localStorage` `orvalis-titan-mira`, que pode falhar sem quebrar nada). **"No dedo"** (padrão, ADR 0075): a ação é no ponto tocado, sem cruzeta, com o anel de progresso. **"Central"**: a cruzeta + volta ao centro, o raio sai sempre do centro da tela (como no PC), arrastar só gira a câmera, e o botão "Usar" reaparece para as estações. O gesto (toque curto coloca, segurar quebra, arrastar gira) é o mesmo nos dois.
2. **Corrida** (provisória, números a calibrar): segurar a seta ▲ por **0,2 s** liga a corrida enquanto o jogador estiver andando (parado ou preso numa parede, cai); **+30 %** de velocidade (`SPRINT_FACTOR`, só fora d'água), o campo de visão abre **+6°** com transição de ~0,15 s (`SPRINT_FOV_DEG`, `view.setSprint`), e o gasto de fome sobe de 0,1 para **0,2 por bloco** (`EXHAUSTION.sprintPerBlock`). `rayThrough` recebe o FOV atual (`view.fov`) para o toque continuar exato durante a corrida.
3. **O que o texto de referência trazia e já estava coberto**: o raycast de voxels já é o 3D DDA de Amanatides–Woo (`titan/physics.ts` `raycast`, com face, ponto de impacto `hy` e contorno); o multitoque isolado por `pointerId` (setas, pular e área de ação independentes). **Não foi feito** (decisão do dono do produto: setas, não joystick): joystick flutuante, zona morta e corrida ao empurrar o joystick; fica como alternativa em `NEXT_STEPS`.

## Consequências
- Quem prefere precisão (túneis, pontes, luta) usa "Central"; quem prefere construir rápido em várias direções, "No dedo".
- Pendências: calibrar a corrida (velocidade, FOV, fome) e testar o modo central em aparelho; corrida no PC (teclado) não existe ainda.
- Testes: `corrida.test.ts` (+3: velocidade, água, FOV no raio). Conferido a 740 × 360 com emulação de toque: o botão troca e grava o modo, a cruzeta some e volta, ▲ segurada dá 5,59 m/s (4,3 × 1,3) e FOV 81°, que volta a 75° ao soltar.
