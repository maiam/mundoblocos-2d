# ADR 0091 — Titã: Balde de Cobre, recolher e despejar o líquido do lago (v0.152.0)

**Status:** Aceita. Quarta e última entrega de itens da rodada "Itens do Abrigo" do Drive (escada, baú, cama, balde); resta o Braseiro 3D.

## Decisão
1. **Dois itens**, pilha de 1 (`items.ts`): `Item.BALDE` (35, vazio) e `Item.BALDE_CHEIO` (36); `isItem` até 36; pergunte `isBucket`, nunca compare ids. Não é bloco nem ferramenta (sem durabilidade). Receita na Mesa de Trabalho: **3 Lingotes de Cobre de Duna → 1 balde** (grupo Ferramentas). A fundição do pacote (1 lingote por 2 Fragmentos no Braseiro) **já era a receita vigente** (`lingote-cobre`): o balde custa 6 fragmentos.
2. **Mira no líquido:** o líquido nunca foi alvo. `raycast(…, liquid)` passa a aceitar `T.LAKE` como alvo quando o item na mão é um balde (`titanGame.computeAim`, `isBucket`); sem balde nada muda. Cheio ou vazio, para poder olhar a cavidade e desfazer.
3. **Recolher** (balde vazio, toque curto, `actions.useBucket` por `placeFromSlot`): a célula apontada precisa ser `T.LAKE` e **a de cima da coluna** (acima dela não há líquido), para não abrir bolha de ar no meio da água. A célula vira **ar** (edição gravada; `volume.set`, não `remove`, que devolveria o lago) e o balde vem **cheio** (`Inventory.replace`).
4. **Despejar** (balde cheio): a célula vizinha da face apontada precisa estar **livre (ar), editável, sem item solto e em Y ≤ `LAKE_LAST_Y` (63)**: o líquido só existe na altura do lago (a imersão e o ar do ADR 0057 dependem disso). Vira `T.LAKE` e o balde volta **vazio**. Cavidade escavada em Y ≤ 63, mesmo longe do lago, aceita líquido ("a primeira versão permite transferir o líquido para cavidades escavadas").
5. **Sem fluxo:** não há simulação de líquido. O que se despeja fica onde caiu; o que se recolhe deixa cavidade. A regra do lago continua: sólido colocado sobre líquido o desloca e, ao quebrar, a célula **de base lago** volta a líquido (`volume.remove`); onde a base era ar, volta ar.
6. **Arte:** ícones de 32 px reduzidos da arte 2D do pacote (`scripts/make-titan-balde-icone.py`, vazio e cheio, entradas em `assets-src/titan/balde/`); item 35 e 36 no atlas 4 × 10 (cabem nos 40 ids). Na mão: sprite extrudado (categoria `flat`, ADR 0087). Os GLB de jogo 1K do pacote (≈ 1,7 MB, ~2.300 triângulos) ficam em `assets-src/titan/balde/` **sem uso por ora**: o balde na mão em 3D (ADR 0078, `HELD_MODELS`) é a evolução natural.

## Consequências
- Sem mudança de gerador nem do formato do save (edições e inventário já persistem; `isItem` aceita 35–36).
- Pendências: balde 3D na mão; som próprio de água ao recolher/despejar (hoje usa o som de colocar bloco); ícone final; aceite no toque real (mirar o líquido); Braseiro 3D da mesma rodada.
- Testes: `balde.test.ts` (+6: ids/receita, mira com e sem `liquid`, recolher e despejar, recusas, deslocamento por sólido, persistência); `recipes` e `margem` ajustados. Conferido a 740 × 360: o toque na água abriu a cavidade, o balde ficou cheio na mão e, olhando a cavidade, o toque devolveu o líquido.
