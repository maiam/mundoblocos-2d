# ADR 0055 — Titã: salto automático e quebra contínua ao arrastar

**Status:** aceito (dono do produto, 20/11/2026: "chega perto de um bloco à frente e pode subir automaticamente se continuar andando" e "se mantiver a pressão e arrastar para o próximo bloco consigo continuar quebrando?"). Altera, em parte, a ADR 0042 (uma ação por pressão) e estende a física da ADR 0046.

## Decisão
1. **Salto automático** (`titan/physics.ts`): no chão (fora do líquido), sem apertar pular, **andando contra um degrau de 1 bloco** com o espaço em cima livre para o corpo (sonda de 0,35 m à frente, a 1 m de altura), o corpo recebe o impulso do salto (sobe 1,25 m) e, se continua andando, sobe no bloco. Só vale se a componente de entrada **contra** o bloco for ≥ 0,35 (raspar na parede na diagonal não pula). Não pula no ar nem na água, nem com parede de 2 blocos ou teto baixo, nem repete o pulo enquanto sobe (um degrau por vez). O degrau de meia altura da laje continua à parte (ADR 0046). O botão de pular segue valendo.
2. **Quebra contínua por arrasto** (`titan/gesture.ts`): **segurando**, ao apontar outro bloco, a quebra segue nele, **com o tempo cheio, do zero** (o bloco deixado pela metade fica como estava, sem rachaduras novas):
   - em BREAKING, trocar de bloco quebrável recomeça no novo (sem alvo ou rocha-mãe, o gesto espera);
   - depois de uma quebra (COMPLETED), **arrastar além da tolerância** (10 px; no mouse, movimento acumulado) e apontar um bloco quebrável recomeça a quebra;
   - **sem arrastar não há quebra em série**: o bloco de trás não cede sozinho (continua valendo "uma ação por pressão" quando o jogador não move a mira);
   - gesto que nunca chegou a quebrar (ARMED consumido, rocha-mãe aos 200 ms) não recomeça; soltar encerra tudo e o arrasto de antes não conta; toque curto continua colocando.
3. Mesmos tempos por material (areia 0,6 s, gelo 1,2 s, rocha 1,6 s, laje 1 s, lanterna e lasca 0,35 s), mesmo som e mesmas rachaduras por bloco; quebrar uma lanterna ou lasca no meio da sequência também vale.

## Consequências
- Quem segura e gira a mira sem querer pode começar a quebrar o que passar na frente: é o comportamento pedido (como segurar para minerar), com o tempo cheio por bloco como proteção.
- Ficam como estavam: `HOLD_MS` (200 ms), a zona morta e o cancelamento por menu, perda de foco ou ponteiro cancelado.
