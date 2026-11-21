# ADR 0083 — Titã: cultivo do Junco de Vidro por random ticks (v0.144.0)

**Status:** Aceita. Rodada "cultivo e oficina da Margem" do Drive, etapa 1 (muda, fases, colheita, Junco Ressecado). Decisões do dono do produto: aceitou as sugestões e pediu o modelo de crescimento do Minecraft (random ticks) no lugar de tempos fixos.

## Decisão
1. **Muda = Junco de Vidro** (item 12, sem item novo). Tocar no topo de uma areia com a muda na mão a planta (`actions.plantReed`); só no topo (`ny = 1`), com a célula de cima livre. **Areia Úmida** → junco de vidro em 3 fases (muda 0, crescendo 1, adulto 2); **Areia Ocre** → junco ressecado em 2 (muda 0, ressecado 1).
2. **Colheita** (alvo `crop:x,y,z`, o mesmo toque/segurar dos itens): o adulto úmido rende **2 mudas** e recua a "crescendo"; o ressecado rende **2 Hastes Secas** (item 19; "Junco Seco" da proposta é a Haste Seca) e recua a muda. A planta nunca é arrancada; sem espaço na mochila (tudo ou nada) nada muda; planta ainda crescendo só avisa. **Quebrar a areia de baixo** derruba a planta e devolve a muda no chão.
3. **Crescimento** (`titan/crops.ts`, puro; `session.tickCrops`): cada planta guarda só `age`. Sorteio médio de **30 s** de jogo ativo por planta (`CROP_TICK_MEAN_S`), só a até 56 m do viajante. Chance por sorteio `1 / (⌊25 / pontos⌋ + 1)`; pontos = areia sob a planta (úmida 4, ocre 2) + 8 vizinhas (+0,75 úmida, +0,25 ocre); **metade** se houver planta da mesma espécie nas diagonais ou nos dois eixos. **Luz ≥ 9** no bloco de cima: céu aberto × `skyAt(hora).ambient × 15` ou a luz da lanterna (`volume.light`), a maior. Tempos de referência: úmida cercada ≈ 90 s por fase, isolada ≈ 210 s; aglomerada dobra. O `rng` é injetável (jogo usa `Math.random`; testes, constante).
4. **Save:** `header.crops` (`x,y,z` → idade), campo **opcional**, sem subir `TITAN_SAVE_VERSION`; na leitura só entra planta com areia sob a célula, ar nela, na região e idade ≤ limite da espécie. O sorteio não guarda progresso parcial (nada a perder ao recarregar). `session.crops` muda → `metaRev++` (grava).
5. **Desenho:** atlas `titan-cultivo-32px.webp` (128 × 32; `scripts/make-titan-cultivo32.py` a partir de `assets-src/titan/cultivo/junco/`), duas faixas cruzadas como o junco silvestre (uma malha instanciada por fase, `TitanRenderer.setCrops`).
6. **Esteira de Junco (etapa 3, decidida, não feita):** referência das placas de pressão do Minecraft **sem** as regras de pressão: peça de 1/16 m de altura, **sem colisão** (anda-se por cima), exige face superior sólida abaixo e, sem o apoio, vira item; trama no topo e borda nas laterais (`assets-src/titan/cultivo/esteira/`).

## Consequências
- Sem gerador novo (as hastes secas avulsas seguem até a etapa 4); a Picareta de Rocha continua fabricável como hoje.
- Pendências: tempo de rebrota e tick calibrados em jogo; noz plantada e Noz Torrada (etapa 2); esteira (etapa 3); gerador v13 sem hastes avulsas, mantendo as 2 mais próximas da chegada (etapa 4).
- Testes: `crops.test.ts` (regras puras) e `cropsSession.test.ts` (plantar, crescer, colher, noite/lanterna/teto, mochila cheia, apoio quebrado, save). Conferido a 740 × 360: as quatro fases e o alvo da mira.
