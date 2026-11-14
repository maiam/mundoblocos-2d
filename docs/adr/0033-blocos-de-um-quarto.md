# ADR 0033 — Blocos de 1/4 de célula (regra oficial do Mundo principal)

- **Status:** implementada (v0.93.76, 14/11/2026)
- **Relaciona:** ADR 0031 (render 3D), 0032 (grade fina), 0011 (save), 0016/0021 (protocolo e sala), `docs/domains/world.md`, `render.md`.

## Contexto
O piloto das lajes (`?tabua=laje`, v0.93.72–75) testou blocos de face 16 × 4 e topo 16 × 16 empilhando até 4. O dono do produto escolheu esta versão
("16×4, 16×16") e pediu que ela vire **regra de qualquer bloco do mundo, podendo empilhar até 4. Só blocos, não paredes.**

## Decisão
- **No Mundo principal todo bloco de construção** (`isStackBlock`: camada de objeto, forma cubo, colocável; o cacto fica de fora) **tem 1/4 de célula de altura**
  (face 16 × 4, topo 16 × 16) e **empilha até `CUBE_LEVELS = 4` (= `MAX_STACK`)**, ou seja, uma célula de altura. Um nível de pilha = um bloco.
- **Paredes** (`WALL_*`), portas, cercas, árvores e demais objetos **não mudam**. O Santuário Celestial **não muda** (`cubeLevels = 1`, `maxStack = 5`).
- **Unidades:** `z`/`standHeight`/`stackHeight` do `World` são em **níveis** (quartos). `visualZ` (câmera, atores, sombras) continua em **células de altura**
  (`z / world.cubeLevels`). A fonte de verdade da regra é o `World` (`cubeLevels`, `maxStack`, `stepLevels`).
- **Andar:** o corpo sobe 1 a 3 blocos empilhados (`World.stepLevels`: 1 cubo antigo → 3 blocos) e **a pilha de 4 bloqueia**. Acabou a "física sólida" do M5/M6.
- **Quebrar:** um bloco por golpe (4 golpes e 4 itens por célula cheia).
- **Migração (preservar a altura):** `world/quarters.ts#quarterLevel` — 1 cubo antigo → 4 blocos do mesmo material; 2 cubos antigos → 2 + 2 (a pilha
  perde 1 de altura, é o teto de 4). Vale para o gerador (`World.expandQuarters`: montanhas, muralha, cidade, covil), chunks não carregados (`getLevel`),
  `restoreChunk` (arrays de 2 níveis = formato antigo) e saves. `SAVE_VERSION` 16 → 17 (`z × 4`), `ROOM_SNAPSHOT_VERSION` 5 → 6, `PROTOCOL_VERSION` 23 → 24.
- **Desenho 3D:** blocos iguais seguidos na coluna viram uma caixa (`stackGeometry`, textura recortada continuamente: 4 iguais = o cubo de antes), com
  menos instâncias. **2D de reserva** (`?render=2d`): pilha de 4 = cubo cheio, parciais arredondam para cima (aproximação até o M7).
- Ids 250–252 (lajes do piloto) viram vazio em dados antigos (`isRemovedBlock`); `world/slabs.ts` e `?tabua=laje` saíram.

## Consequências
- Muralha da cidade e montanhas de 2 níveis ficam com 1 célula de altura; monstros e o "degrau" não sobem a pilha de 4.
- Constante nova em altura → usar `cubeLevels`; nunca assumir 1 nível = 1 célula no Mundo.
- Fica para depois: arte própria da face de 4 px por material, sombra/borda entre blocos parciais, 2D de reserva fiel.
