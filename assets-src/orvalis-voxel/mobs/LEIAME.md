# Mobs 64 px — fauna de fazenda (pacote do Drive `Mobs64px`, 27/11/2026)

Entram no jogo **4 dos 40 animais** do pacote: `porco`, `vaca`, `ovelha` e `galinha` (ADR 0124). Os outros ficam na fila, cada um pelo ciclo da ADR 0116 (Wiki → estado atual → proposta → aprovação).

| Arquivo | O que é |
|---|---|
| `{porco,vaca,ovelha,galinha}_uv_64x64.png` | atlas UV de 64 × 64 (RGBA; só as faces das caixas são pintadas) |
| `fazenda-uv.json` | as 4 fichas do `mobs64px-uv.json` (caixas `sizePx`, `pivotPx`, `meshOffsetPx`, `restEulerRad`, `uvPx` por face; frente −Z, 16 unidades por bloco) |
| `LEIA-ME-pacote-original.md`, `montar-mob.mjs` | texto e exemplo de montagem do pacote original (referência) |

`python3 -I scripts/make-orvalis-fazenda.py` gera `src/assets/orvalis-fazenda-*.webp`, `src/render/art/fazenda-modelos.json` (os ícones do espólio não passam por ele: vão direto em `assets-src/titan/arte16/` + `itens.json`).

## Regra de caixa da Wiki para mobs (registro)
A **caixa de acerto** é a da Minecraft Wiki (Java), em largura × altura, centrada nos pés: porco 0,9 × 0,9 · vaca 0,9 × 1,4 · ovelha 0,9 × 1,3 · galinha 0,4 × 0,7 (filhote = metade; Bedrock difere: vaca 1,3, galinha 0,8 × 0,6). Alturas dos olhos: vaca 1,3 · ovelha 1,235 · porco 0,765 · galinha 0,644. As caixas do **desenho** (acima) são livres e não decidem mira nem golpe.

## Ícones do espólio (todos do Drive, v0.193.1)
Couro, lã branca, pena, costeleta de porco (crua e cozida), carne bovina (crua e cozida), carne de carneiro (crua e cozida) e frango (cru e assado), em 16 × 16, ficam em `assets-src/titan/arte16/` (`orvalis_*_16x16.png`) e entram no atlas de itens 4 × 25 por `itens.json` (ids 89–99). O ovo (`orvalis_ovo_icone_16x16`) existe no Drive e **não** entrou (sem ovos nesta fase). Também há no Drive carne de coelho e carne podre, sem uso ainda.
