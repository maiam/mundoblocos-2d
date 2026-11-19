# ADR 0042 — Titã: gesto primário (toque curto coloca, segurar quebra) e rachaduras progressivas

**Status:** aceito (dono do produto, 19/11/2026, "Prompt para o programador — interação, fragmentos e lanterna 3D de Titã", etapa 1 de 3). Estende as ADRs 0039–0041.

## Decisão
1. **Um gesto para colocar e quebrar** (`titan/gesture.ts`, máquina de estados pura, tempo injetado em ms monotônicos): `IDLE → ARMED → CAMERA_DRAG | BREAKING → COMPLETED → IDLE`.
   - **ARMED** (pressionou sobre alvo válido): guarda ponteiro, tempo, alvo e face. Soltar **antes de 200 ms**, sem arrasto e com **alvo e face iguais**, coloca uma unidade na célula adjacente (a colocação valida antes de consumir o item). Outra célula ou saída do alcance consome o gesto até soltar.
   - **CAMERA_DRAG**: arrasto acima de **10 px CSS** no toque (distância desde a pressão) ou movimento relativo acumulado acima de 10 px no mouse capturado: o movimento é da câmera e soltar não faz nada. Sem alvo na mira o gesto já nasce como câmera.
   - **BREAKING**: depois de **200 ms** no mesmo bloco, dentro do alcance, o progresso é `(tempo − 200 ms) / (total − 200 ms)`. Trocar de bloco ou sair do alcance cancela; **mudar só a face do mesmo bloco mantém o progresso**. Soltar antes do fim cancela e limpa o efeito.
   - **COMPLETED**: ao atingir o tempo total o alvo é revalidado e há **uma única ação**; a pressão mantida não repete e é preciso soltar e pressionar de novo (também depois de tentativa cancelada ou falha, como mochila cheia).
   - O tempo é conferido **também em `release`**, com o carimbo do evento (`pointerup`/`mouseup`): uma pressão de 200 ms ou mais **nunca** vira colocação por atraso de quadro; se já passou do tempo total, a quebra vale. Cancelamento de ponteiro, perda de foco ou de captura, aba oculta e abertura da mochila limpam o gesto sem agir. Um segundo ponteiro (outro dedo em outro controle) não arma, não solta nem dispara a ação do primeiro.
2. **Tempos totais desde a pressão** (`titan/breaking.ts`): areia e areia úmida 0,6 s, gelo 1,2 s, rocha 1,6 s, lanterna instalada e lasca solta 0,35 s; rocha-mãe e líquido não têm tempo (o gesto é consumido). Valores iniciais para ajuste em aparelho.
3. **Rachaduras**: dez estágios próprios (`scripts/make-titan-cracks.py` → `src/assets/titan-cracks-16px.webp`, 160 × 16, lossless; núcleo escuro, sombra e contorno claro discreto para lerem em areia, gelo e rocha escura), numa **sobreposição reutilizável** (`TitanRenderer.setCrack`: uma caixa um pouco maior que o bloco, `polygonOffset`, atlas deslocado por estágio). Aparece aos 200 ms, sai no mesmo quadro de cancelamento ou conclusão e **não refaz malha de chunk**. Lanterna e lasca usam só um **anel discreto de recolhimento** em volta da mira, sem rachaduras.
4. **Controles**: o botão primário do mouse e a **área de interação do toque (metade direita)** usam o mesmo gesto, com **zona morta de 10 px** (a câmera só gira depois dela, para um toque com tremor ainda poder colocar). Os botões "Colocar" e "Quebrar" e o **clique direito** deixam de existir (a quebra instantânea acabou); joystick, "Pular", "Mochila", hotbar e a própria mochila mantêm suas interações.

## Consequências
- O evento de quebra concluída (`complete`) é um ponto único: o drop dos veios do gerador v3 (etapa 3) o reaproveita.
- A arte das rachaduras é provisória do projeto: o dono do produto pode substituir o atlas mantendo 10 estágios de 16 × 16 em 160 × 16.
- Pendente em aparelho real: sensação dos tempos e da zona morta no toque; mouse físico com captura de ponteiro.
