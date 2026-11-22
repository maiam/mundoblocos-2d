# ADR 0095 — Titã: balde 3D na mão e som de água (v0.156.0)

**Status:** Aceita; **a malha 3D do balde foi substituída pelo sprite extrudado de 16 × 16 no ADR 0097 (v0.158.0)**; o som de água segue valendo. Fecha duas pendências do ADR 0091 (o balde aparecia como sprite extrudado e recolher/despejar usavam o som de colocar bloco).

## Decisão
1. **Malha embutida na mão:** o GLB de jogo 1K do pacote (corpo e alça de cobre com a textura PBR e, no cheio, um disco de líquido) é convertido por `scripts/extract-titan-balde.py` (Blender) em dois JSON (`titan-balde.json`, 1.400 triângulos; `titan-balde-cheio.json`, 1.424) e um atlas único de 256 × 320 px sem perdas (cobre nas 256 linhas de cima, uma amostra do líquido do lago embaixo). O cobre é decimado a 1.400 triângulos com as UVs mantidas. **Pivô no topo da alça**, centrado em x e z, o balde pende para −y. No GLB de jogo a alça já vem tombada contra o corpo; o pivô fica no topo do conjunto.
2. **Sem arquivo para carregar:** `HELD_MESHES` (renderer) liga os itens 35 e 36 a esses modelos; `ensureHeld` os monta de forma síncrona (`buildHeldMesh`: `modelGeometry` + material `MeshBasic` com o atlas e a mesma luz do dia), ao lado do caminho de GLB de `HELD_MODELS` (adaga e picareta, que seguem carregando arquivo). A categoria é `model` (`heldCategory(item, hasModel)`).
3. **Estilo de mão `bucket`** (`render/heldPose.ts`): repouso à direita, balde inclinado para mostrar a boca, mesmas curvas de golpe e troca (`EquipAnim`); recolher e despejar trocam o item (35 ↔ 36) e a troca dispara o afundar-e-subir como feedback. Escala 0,66.
4. **Som de água sintetizado** (`gameAudio.playWaterScoop`/`playWaterPour`, Web Audio, sem arquivos): recolher = ruído que sobe e duas bolhas; despejar = fio de água descendo e um glub grave. `titanGame` chama um ou outro quando a ação do balde dá certo (antes soava como colocar bloco).

## Consequências
- Sem mudança de gerador, de save nem de regra do balde (ADR 0091). Peso novo no pacote: ≈ 270 KB de JSON + 47 KB de atlas (o GLB original de 1,7 MB continua só em `assets-src`).
- Pendências: o ícone de 32 px do inventário segue provisório (arte 2D reduzida); conferir os sons e a pose no toque real; o balde cheio não mostra líquido derramando ao despejar.
- Testes: `balde3d.test.ts` (+2: malhas coerentes, pivô no topo, cheio = vazio + 24 triângulos, categoria `model` e estilo `bucket`). Conferido a 740 × 360: balde vazio e cheio na mão, com o líquido escuro à vista.
