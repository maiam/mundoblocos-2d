# ADR 0065 — Titã: Braseiro de Rocha, Lingote de Cobre, Picareta e Adagas (v0.122.0)

**Status:** Aceita (a parte "acender com a brasa, 8 cargas" foi substituída pela fornalha da ADR 0068; etapa 2 de 4 do pacote "O que a duna guarda"; números provisórios autorizados pelo dono do produto). Continua a ADR 0063.

## Decisão
1. **Braseiro de Rocha** = dois blocos (`T.BRAZIER` 25 apagado, `T.BRAZIER_LIT` 26 aceso; `isBrazier`), cubo de rocha com cuba no topo (tiles 12 lateral, 13 topo apagado, 14 topo aceso do atlas de terreno, que passou a 80 × 80; `mesher.ts` lê `ATLAS_H = 80`; `scripts/make-titan-braseiro.py`). Item 21; receita na Mesa: 4 Rochas Escuras. Só o **aceso** é estação.
2. **Acender**: tocar no braseiro apagado com uma **Brasa de Âmbar** na mão (`igniteBrazier`, via `placeFromSlot`): consome 1 brasa, troca o bloco por aceso e registra `BRAZIER_CHARGES` = 8 preparações em `session.braziers` (`x,y,z` → cargas, `header.braziers` opcional no save, validado ao abrir: só braseiro aceso de verdade, carga 1–8). Cada fabricação do braseiro gasta 1 (`useBrazierCharge`); ao zerar o braseiro apaga e a tela fecha com aviso. Levar o braseiro aceso devolve o item apagado e esquece a carga. **Sem luz** do fogo ainda (pendência).
3. **Estações** (`recipes.ts`): `Station = personal | workbench | brazier`; `stationMet(receita, estação)` é a única regra (pessoal serve em qualquer lugar; Mesa e Braseiro só nas suas). A tela de fabricação abre pela mira + Usar/F tanto na Mesa quanto no braseiro **aceso**; o braseiro mostra só as receitas dele (descobertas ao ter cobre ou braseiro: `'braseiro'` em `discoverRecipes`).
4. **Receitas**: **Lingote de Cobre de Duna** = 2 Fragmentos de Cobre (braseiro aceso); **Picareta de Cobre** = 3 Lingotes + 2 Hastes Secas; **Adaga de Rocha** = 1 Fragmento de Rocha + 1 Haste Seca; **Adaga de Cobre** = 1 Lingote + 1 Haste Seca (todas na Mesa, grupo Ferramentas). Itens 21–24.
5. **Ferramentas** (`TOOLS`, `Tier`, `pickTier`, `isDagger`): a picareta de cobre quebra a rocha em 40 % do tempo (a de rocha, 60 %; `PICK_FACTOR` por nível) e o veio de cobre com qualquer picareta. **As adagas ainda não fazem nada**: o combate entra na etapa 4.
6. **Arte**: ícones provisórios das ilustrações (`make-titan-icones-conceito.py`) e tiles provisórios; atlas de itens com 24 dos 32 ids.

## Consequências
- Etapas seguintes: Placa e Revestimento de Carapaça; vida do Farejador, carne crua/assada (assar no braseiro, que ganha as cargas já prontas) e combate com adaga.
- Pendências: luz do braseiro aceso; modelo 3D do braseiro (hoje cubo com tiles); durabilidade das ferramentas; textura final.
- Testes: `braseiro.test.ts` (+4) e catálogo/atlas/itens atualizados.
