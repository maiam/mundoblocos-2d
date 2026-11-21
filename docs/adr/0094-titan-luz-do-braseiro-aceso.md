# ADR 0094 — Titã: luz de bloco do Braseiro aceso (v0.155.0)

**Status:** Aceita. Fecha a pendência do ADR 0092 (o braseiro aceso brilhava só no desenho, sem iluminar o entorno).

## Decisão
1. **Emissores com nível:** a luz de bloco (ADR 0040) deixa de supor que todo emissor vale 15. `lightLevelOf(id)` (`voxel.ts`) é a fonte: lanterna 15 e **Braseiro aceso 13** (`BRAZIER_LIGHT`); emissor novo entra aí, nunca `id === …` solto na luz. A propagação é a mesma (−1 por célula nas 6 vizinhas, sólidos bloqueiam, o Painel deixa passar): a 13 a luz alcança 12 células.
2. **Motor:** `LightEngine.rebuild`/`computeLight` aceitam `[x, y, z, nível?]` (sem nível = 15) e `sourceAdded(x, y, z, nível)`. O `TitanVolume` mantém `emitters` (todos, com nível) ao lado de `lanterns` (só as lanternas, que desenham o modelo); `hasLanterns` e `light()` olham os emissores.
3. **Ordem em `updateLight`:** como o braseiro aceso é **sólido e emissor** ao mesmo tempo, a ordem passou a ser: emissor que sai → sólido que entra ou sai → emissor que entra (do contrário o sólido que entra apagaria a luz recém-criada do próprio emissor). Para a lanterna (não sólida) nada muda. Apagar (aceso → apagado, `tickFurnaces`) e quebrar tiram a luz; carregar o save acende de novo pelos blocos (nada novo no save).
4. O brilho fixo por instância do modelo (`EMBER_GLOW`, ADR 0092) continua: as brasas aparecem mesmo onde o mapa de luz é ignorado por modelos vizinhos.

## Consequências
- Sem mudança de gerador, de save nem de protocolo. Custo: um emissor a mais por braseiro aceso no cálculo incremental (o mesmo caminho da lanterna).
- Pendências: fagulhas/partículas do aceso; calibrar o 13 em aparelho real.
- Testes: `braseiroLuz.test.ts` (+4: níveis, acender/apagar com 13/12/11/7 e igualdade com o cálculo completo, quebrar e pôr direto, bloqueio por sólido). Conferido a 740 × 360 de noite: a luz subiu de 0 para 13 na célula, 12 ao lado e 10 a 3 m, e o chão ao redor ficou mais claro e quente.
