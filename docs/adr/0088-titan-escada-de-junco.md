# ADR 0088 — Titã: Escada de Junco (v0.149.0)

**Status:** Aceita. Primeira entrega da rodada "Itens do Abrigo" do Drive (ordem do material: escada, baú, cama, balde); escopo escolhido pelo dono do produto: só a escada.

## Decisão
1. **Blocos 31–34 e item 32 (`Item.ESCADA`):** 4 ids com o giro no id (`T.LADDER` … `LADDER_270`; `isLadder`, `ladderTurn`, `ladderId`, `ladderFacing`, `ladderTurnOf` em `voxel.ts`), como o Marco. A **frente** da escada aponta para onde se sobe; a **face de apoio** fica na borda da célula do lado oposto. Giro 0 frente +Z, 1 +X, 2 −Z, 3 −X. `T_MAX` 34, `isItem` até 32.
2. **Receita** na Mesa de Trabalho: 4 Hastes Secas → **3 escadas** (grupo Construção). Cada escada é um segmento de 1 m de altura.
3. **Colocar** (`placeFromSlot`): só na **lateral** de um **cubo inteiro** (`isFull`); o giro vem da normal da face tocada. No topo, no ar ou numa laje o jogo avisa ("A escada se prende à lateral de um bloco" / "…precisa de um bloco inteiro atrás"). **Quebrar o bloco de apoio** derruba as escadas presas a ele como itens soltos (`releaseLadders`, ADR 0082).
4. **Não sólida, alvo da mira:** sem colisão (sobe-se por ela), ocupa a célula, não bloqueia luz; a mira acerta a **placa fina** (0,63 × 1 × 0,12 m, `modelBox`/`LADDER_SIZE`), com a folga de toque dos outros modelos. Recolhe rápido (0,35 s, `isCollectBlock`) e devolve o item solto.
5. **Escalar** (`physics.stepOnce`, `ladderUnder`): o corpo ocupa a célula da escada (pés, cintura ou cabeça). **Empurrar para a parede ou pular sobe a 2,3 m/s; sem comando escorrega a 1,2 m/s** (soltar é descer, como no Minecraft sem agachar); de lado anda a 60 %. Sem gravidade nem dano de queda (`Body.onLadder`; `titanGame` zera o ponto de queda). A água vence a escada.
6. **Desenho:** modelo 3D instanciado (`ModelKind` `escada`, `TitanVolume.modelCells`), como o Marco. O GLB de jogo 1K do pacote (5.448 triângulos, três PNG de 1K) é reduzido pelo Blender a **1.398 triângulos** (`scripts/extract-titan-escada.py`, `titan-escada.json` de 168 KB, com o apoio deslocado para a borda da célula) e a cor-base vai para um atlas de 256 px (`titan-escada-atlas.webp`, 79 KB); o jogo usa luz própria, sem normal nem ORM. O GLB original fica em `assets-src/titan/escada/`.
7. **Ícone provisório** (`scripts/make-titan-escada-icone.py`: o modelo rasterizado em vista 3/4); entra no atlas de itens por `make-titan-arte32.py` e na mão como item plano (`make-titan-item-masks.py`).

## Consequências
- Sem mudança de gerador nem de versão do save (os ids novos cabem no formato de edições de chunk).
- Pendências: aceite no toque real (mirar na placa fina; subir com o joystick e pelo botão de pular); poses de mão; baú, cama e balde da mesma rodada; modelo 3D do Braseiro (apagado/aceso) do pacote.
- Testes: `escada.test.ts` (+13: ids e regras, caixa da mira nos 4 giros, receita, colocar nos 4 giros e recusas, mira, apoio quebrado, persistência, escalar: subir/escorregar/gravidade/topo). Conferido a 740 × 360: quatro escadas empilhadas numa parede, ícone e item na mão.
