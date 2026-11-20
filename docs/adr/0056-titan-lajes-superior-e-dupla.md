# ADR 0056 — Titã: Laje de Rocha inferior, superior e dupla

**Status:** aceito (dono do produto, 20/11/2026: regras de laje do Minecraft e o `resolveSlabPlacement`). Estende a ADR 0046.

## Decisão
1. **Três estados na mesma célula, no id do bloco** (sem estado extra, sem mudar `TITAN_SAVE_VERSION`): `T.SLAB` (12, **inferior**, ocupa a faixa [0, 0,5] da célula), `T.SLAB_TOP` (16, **superior**, [0,5, 1]) e `T.SLAB_DOUBLE` (17, **dupla**, cubo inteiro). Um só material (rocha), então não há mistura de materiais na célula. Os três valem o item 13 (Laje de Rocha); a dupla devolve **2 lajes** (`dropCountOf`) e não vira bloco maciço; o carregamento aceita ids até 17.
2. **Colocação** (`titan/slabs.ts: resolveSlabPlacement`, pura): clicar com laje no **topo de uma laje inferior** ou na **face de baixo de uma laje superior** **funde** na mesma célula (laje dupla, gasta 1); senão a laje vai para a célula vizinha da face apontada, **superior** se clicou a face de baixo de um bloco ou a **metade de cima** (`hy ≥ 0,5`) de uma lateral, **inferior** no resto. A mira devolve a altura do ponto clicado (`Hit.hy`, `GestureTarget.hy`). A fusão não acontece se a metade que falta invadir o corpo do jogador.
3. **Física pela faixa** (`voxel.ts: blockSpan`, `TitanVolume.bodySpan`): `collides` testa o cruzamento do corpo com a faixa [baixo, topo] (a laje superior colide só na metade de cima); o pouso usa o topo (superior = y + 1), o degrau de 0,5 m vale para a laje inferior, e a cabeça bate **no meio da célula** na laje superior (`ceilingY`). A laje superior sob um corredor de 2 blocos deixa 1,5 m: o corpo de 1,8 m não passa. O salto automático (ADR 0055) sobe numa laje superior à altura dos pés.
4. **Mira e malha:** o raio acerta a caixa da metade ocupada (inferior ou superior; o raio passa pela metade vazia). A malha da superior espelha a da inferior (base em y + 0,5, topo em y + 1; some o topo sob cubo ou laje inferior e a base de uma inferior some sob laje superior); a dupla é cubo (`isFull`). Quebrar: laje 1 s, dupla 1,6 s (como a rocha); som de rocha nos três.

## Consequências
- Ficam de fora do Minecraft: transparência parcial de luz (a laje ainda bloqueia a luz por inteiro), spawn de monstros e agachar. Lajes de outros materiais exigiriam novos ids (combinações), então ficam para quando houver mais de um material.
- O `placeFromSlot` agora pode alterar uma célula já ocupada (fusão): sempre pela `volume.set`, que registra a edição no chunk como qualquer outra.
