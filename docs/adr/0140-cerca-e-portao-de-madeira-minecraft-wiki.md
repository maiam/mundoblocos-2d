# ADR 0140 — Cerca e Portão de madeira do Orvalis (auditoria #46, W2, v0.211.0)

**Estado:** aceita (27/11/2026). Ciclo da ADR 0116 cumprido na ADR 0139 (aprovação "Sim. Pode seguir": W1 → W2 → W3, receitas da Wiki, cerca e portão com 1,5 m). Detalhes conferidos na Wiki ([Fence](https://minecraft.wiki/w/Fence), [Fence Gate](https://minecraft.wiki/w/Fence_Gate), [Hitbox](https://minecraft.wiki/w/Hitbox)).

## Wiki
Cerca de madeira: visual de 1 bloco, **colisão de 1,5** (ninguém pula por cima; dá para ficar em pé em cima); poste de 4 px, braços por vizinho; liga-se a bloco inteiro, a outras cercas de madeira (de qualquer madeira) e a portões; dureza 2. Portão: painel fechado colide a 1,5 m; **aberto não colide**; abre **para longe de quem o usa**; não abre se há bloco na meia célula do vão (Java 1.11). Rendimentos: cerca 4 tábuas + 2 hastes → 3; portão 2 tábuas + 4 hastes → 1 (de espelho de terceiros, não confirmados na página principal).

## Decisão (W2)
1. **Cerca = ids 208–255** (`FENCE_OAK + madeira × 16 + máscara`, bits N 1/E 2/S 4/W 8 como a mureta): `TitanVolume.set` normaliza a máscara e `refreshWalls` refaz as cercas vizinhas (a sala repassa por `onSet`). Liga a `isFull` (folhas não), a outra cerca e ao portão **só pelo eixo** do painel. Pergunte `isFence`/`fenceMask`/`fenceId`/`fenceMaskFor`, nunca ids soltos.
2. **Portão = ids 256–279** (`GATE_OAK + madeira × 8 + (aberto ? 4 : 0) + giro`; o giro é a direção do vão, painel de través a ela): `isGate`/`isGateOpen`/`gateId`/`gateToggled`; `isOpenable` = porta ou portão. Aberto **não é sólido** mas é alvo da mira (`isSolid`/`isTarget`; `bodyBoxes` devolve null para ele).
3. **Colisão a 1,5 m sem mexer na mira:** `blockBoxes` (mira, 1 m) segue; `TitanVolume.bodyBoxes` soma, na célula de cima, as caixas da cerca/portão fechado de baixo recortadas em [0, 0,5] (`tallBoxes`). `T_MAX` = 279.
4. **Uso:** `useDoor` despacha para `useGate` (portão): abre para o lado contrário ao de quem usa, **recusa se a célula do vão é sólida** ("O portão não abre: tem algo no caminho") e recusa fechar com o corpo no painel; na sala é a mesma ação (`useCell` → `isOpenable`). Colocar: o painel sai de través ao olhar (`marcoTurnFacing`).
5. **Itens 162–167** (cercas e portões das 3 madeiras), ícones do pacote (sprites 16 × 16 extrudados, `arte16/itens.json`; o PNG "portão aberto" fica só como arte-fonte); atlas de itens **4 × 42** (168): item novo é o **168**. Receitas na Mesa de Carpintaria (Wiki). Dureza 2 e machado como a tábua; som de rocha (sem timbre de madeira, dívida).
6. **Modelos:** `render/cercaModel.ts` gera em código, por madeira × máscara (48 tipos) e por madeira × estado do portão (6; giro na instância), com a tábua da madeira numa tira de 3 tiles (`titan-cerca-madeira.webp`, `make-orvalis-madeira-familia.py`). Sem mudança de gerador, save ou protocolo (ids são números).

## Consequências
Pendentes: **W3** porta de 2 células e alçapão; a cerca não liga a muretas/degraus/lajes (só cubo inteiro, como a Wiki para blocos parciais); portão não liga a muretas; correntes/amarrar animais não existem. Dívida: som de madeira, portão sem abertura por redstone (não existe).
