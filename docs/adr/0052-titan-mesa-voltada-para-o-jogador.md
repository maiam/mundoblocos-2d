# ADR 0052 — Titã: a Mesa de Trabalho fica voltada para o jogador

**Status:** aceito (dono do produto, 19/11/2026: "os itens colocados sempre ficam virados para o mesmo lado… se eu estiver olhando para o norte a frente fique virada para o sul"). Estende as ADR 0045 e 0049.

## Decisão
1. **Orientação no id do bloco.** A mesa passa a ter quatro ids: `T.WORKBENCH` (10, giro 0, frente ao norte = −Z, como o modelo sempre foi) e `T.WORKBENCH_90/180/270` (13–15). O giro vai nos deltas de chunk que já existem: **sem estado extra, sem mudar `TITAN_SAVE_VERSION`**. Mesas de saves antigos (id 10) abrem como estavam. A validação do carregamento aceita ids até 15.
2. **Regra de colocação** (`voxel.ts: workbenchTurnFacing(yaw)`): o yaw (0 = olha para −Z) é arredondado ao eixo mais próximo e invertido, de modo que a **frente (o nicho) fica voltada para o jogador**: olhando ao norte → frente ao sul; ao oeste → frente a leste; etc. `placeFromSlot` escolhe o id pelo `yaw` da sessão.
3. **Uma pergunta só:** `isWorkbench(id)` (e `workbenchTurn`, `workbenchId`) substituem `=== T.WORKBENCH` na malha (modelo 3D fora do terreno), na quebra (1,6 s, devolve o item 9), na mira/alcance da estação (Usar), na lista de instâncias do volume (`workbenchCells()` agora devolve `[x, y, z, giro]`) e no renderer, que gira cada instância (`makeRotationY(giro × 90°)`).
4. Lanterna, laje e junco não têm frente (simétricos ou sem orientação): ficam como estão.

## Consequências
- Mover o jogador depois de colocar não gira a mesa. Quebrar e recolocar gira de novo. O id da mesa agora está em 4 valores: código novo que compare com `T.WORKBENCH` direto deve usar `isWorkbench`.
