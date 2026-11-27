# Mobs 64 px — fauna de fazenda (pacote do Drive `Mobs64px`, 27/11/2026)

Entram no jogo **4 dos 40 animais** do pacote: `porco`, `vaca`, `ovelha` e `galinha` (ADR 0124). Os outros ficam na fila, cada um pelo ciclo da ADR 0116 (Wiki → estado atual → proposta → aprovação).

| Arquivo | O que é |
|---|---|
| `{porco,vaca,ovelha,galinha}_uv_64x64.png` | atlas UV de 64 × 64 (RGBA; só as faces das caixas são pintadas) |
| `fazenda-uv.json` | as 4 fichas do `mobs64px-uv.json` (caixas `sizePx`, `pivotPx`, `meshOffsetPx`, `restEulerRad`, `uvPx` por face; frente −Z, 16 unidades por bloco) |
| `LEIA-ME-pacote-original.md`, `montar-mob.mjs` | texto e exemplo de montagem do pacote original (referência) |

`python3 -I scripts/make-orvalis-fazenda.py` gera `src/assets/orvalis-fazenda-*.webp`, `src/render/art/fazenda-modelos.json` e os ícones provisórios do espólio.

## Regra de caixa da Wiki para mobs (registro)
A **caixa de acerto** é a da Minecraft Wiki (Java), em largura × altura, centrada nos pés: porco 0,9 × 0,9 · vaca 0,9 × 1,4 · ovelha 0,9 × 1,3 · galinha 0,4 × 0,7 (filhote = metade; Bedrock difere: vaca 1,3, galinha 0,8 × 0,6). Alturas dos olhos: vaca 1,3 · ovelha 1,235 · porco 0,765 · galinha 0,644. As caixas do **desenho** (acima) são livres e não decidem mira nem golpe.

## Ícones do espólio
Couro (`orvalis_couro_icone_16x16`) e lã branca (`orvalis_la_branca_icone_16x16`) vieram do Drive (`Banco de Assets`); o ovo (`orvalis_ovo_icone_16x16`) existe no Drive e **não** entrou (sem ovos nesta fase). Pena e as 8 carnes têm ícone **provisório** desenhado pelo script — trocar quando a arte chegar.
