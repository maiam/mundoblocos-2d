# ADR 0109 — Orvalis em voxel: Degrau de Pedra (modelo próprio com a arte do pacote) — v0.176.0, entrega E2b

**Status:** Aceita. Quarta entrega do pacote Texturas16px (P1-04). O degrau do Titã (ADR 0101) é um modelo de caixas com a trama do junco; o de pedra reaproveita a **forma e a física** e troca só o modelo e a textura.

## Decisão
- **Blocos 111–114** (`T.STONE_STAIR` + giro no id), `T_MAX` = 114; **item 60** (`Item.DEGRAU_PEDRA`; o atlas de itens 4 × 15 enche: o próximo item amplia). Pergunte `isStair` (qualquer família), `isReedStair`/`isStoneStair`, `stairTurn(id)` e `stairId(giro, pedra)`; nunca compare ids soltos.
- **Mesmas caixas** (`STAIR_BASE` em `voxel.ts`, registradas também para 111–114): física por caixa, degrau automático, mira e colocação com a frente voltada para o jogador (`placeFromSlot`) valem sem código novo (ADR 0101, 0103).
- **Modelo próprio** `degrauPedra` em `modelOf`/`ModelKindName`: instanciado como o degrau de junco, com material próprio. `scripts/make-orvalis-degrau.py` monta a **tira de 3 tiles de 16 px** `titan-degrau-pedra.webp` (topo | frente | perfil, vindos de `assets-src/orvalis-voxel/texturas32/degrau-pedra/`, fonte editável) e o modelo `titan-degrau-pedra.json` (24 triângulos, UV na arte **como desenhada**: o perfil em L cobre a lateral +X; o espelho usa a metade de baixo do PNG de frente; o piso é o topo). Sem repetição de textura (16 px por face, ADR 0106); o u é recuado meio texel para não sangrar entre tiles.
- Ícone isométrico gerado por `stair_icon` (mesma luz 100/80/60 %, frente na esquerda). `npm run texturas` agora roda também `make-orvalis-degrau.py`.
- **Receita** (Mesa, `world: 'orvalis'`, **provisória**): 3 Pedra Lisa → 4 Degraus de Pedra. Quebra 1 s (como a laje), som de rocha. Vitrine de texturas ganhou o degrau na fila 2.

## Consequências
- Sem mudança de gerador, save nem protocolo (ids acima do `T_MAX` anterior; salvamento antigo abre igual).
- Limitação: na lateral −X o perfil sai espelhado (a arte tem o patamar alto à direita; a geometria é simétrica) — a única inversão inevitável. Mesmas pendências do degrau de junco: canto e invertido, aceite no toque; na vista isométrica o modelo usa a tira de 16 px (sem variante de 8 px: o atlas de 8 px não se aplica a modelos).
- Testes: `orvalis/pedraObra.test.ts` (ids e giros, caixas iguais às do junco, modelo, item, receita, colocar e quebrar); limites fixos `isItem(60)` → 61 nos testes antigos. Conferido na vitrine em vista isométrica.
