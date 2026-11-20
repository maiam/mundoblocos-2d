# ADR 0072 — Titã: fragmentos à vista na rocha escura (gerador v10, v0.129.0)

**Status:** Aceita. Contexto: o dono do produto encontrava só 3 fragmentos na superfície ("fragmentos deveriam ter em abundância nas rochas escuras das camadas altas"). Medido na v9: 3 veios de rocha, 3 de gelo e 6 de cobre à vista por seed (só as 2 formações e os 2 montes de cobre); os mais de 3 mil veios subterrâneos (ADR 0070) exigem escavar.

## Decisão
1. **`GENERATOR_VERSION` 10**: relevo, formações, cobre, abrigos, toca, plantas e veios subterrâneos **idênticos à v9** (teste compara a altura de toda coluna); só muda o bloco de topo de algumas colunas.
2. **`fragmentAt`** (`generator.ts`): coluna de superfície de **rocha escura** vira `VEIN_ROCK` com **12 % nas camadas altas (Y ≥ 72) e 6 % abaixo**; coluna de **gelo** vira `VEIN_FROST` com 6 %. Sorteio por `hash2(derive(seed, PURPOSE.fragmentos), x, z)`: determinístico e sem ordem de carga. Resultado medido: mais de 60 veios de rocha e mais de 30 de gelo à vista por seed (de 3 e 3).
3. **Exclusões**: raio de 5 em volta das formações, dos afloramentos de cobre e dos abrigos (e seus pilares), que têm desenho próprio; a clareira da chegada já é areia. O cobre, a brasa e os veios das formações têm precedência no `blockAt`.
4. Mesmos blocos e drops de sempre (`VEIN_ROCK`/`VEIN_FROST` soltam 1 lasca); sem item, bloco ou save novo; partidas antigas seguem na versão delas.

## Consequências
- Fragmentos de rocha e gelo ficam abundantes à vista (a lente de gelo e as receitas deixam de depender de 3 blocos); nada muda no cobre (continua raro e só com picareta).
- Pendências: as densidades (12 % / 6 %) são provisórias; as lascas continuam saindo 1 por veio (sem rendimento maior); `veinCells()` lista só os veios das formações (os novos não entram em pesquisas de alcance).
- Testes: `fragmentos.test.ts` (+3).
