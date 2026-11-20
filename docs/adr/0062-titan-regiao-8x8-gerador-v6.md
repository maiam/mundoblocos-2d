# ADR 0062 — Titã: região de 8 × 8 chunks (gerador v6) e lote de 200 seeds (v0.119.0)

**Status:** Aceita. Contexto: pedido do dono do produto ("já podemos aumentar para 8 × 8; não precisamos de 1.000 seeds diferentes nesse início, reduza para 200"), com a decisão de manter as partidas existentes como estão (região por versão).

## Decisão
1. **Região por versão** (`voxel.ts`: `Region`, `regionFor`, `REGION_LEGACY` = [−32, 32), `REGION_V6` = [−64, 64)). `TitanGenerator.region`/`inRegion(x, z)` é a única fonte; `TitanVolume` (colisão, edição, parede invisível), `LightEngine` (luz só dentro da região), `initialSections`, `validDrops` e todas as buscas do gerador leem dela. `voxel.inRegion(x, z, r)` ficou com a região antiga por padrão (compatibilidade de testes e utilidades). Partida v1–v5 continua em 64 × 64 como foi gravada; só a v6 abre o mundo de 128 × 128.
2. **Gerador v6** (`GENERATOR_VERSION` 6): além da região, o **relevo longe do lago** muda: sem o degrau de 5 blocos em `s = 24`; a subida é gradual e limitada (`gentle` ≤ 6 + `slope` ≤ 14), então a região inteira fica entre Y ≈ 53 e 84, andável (degraus de 1 bloco) até a borda. A chegada, as formações, os veios, a brasa, os juncos, as plantas e a toca seguem as regras da v5, agora sorteados na região maior (a chegada continua sempre na costa seca do lago). Mapas de seeds já abertas na v5 não mudam.
3. **Lote de 200 seeds** (era 1.000) nos testes de levantamento (`veins.test.ts`: fontes de rocha e gelo alcançáveis, brasa e juncos em toda seed; amostra do alcance a pé a cada 40 seeds). As 9 seeds de reserva achadas no lote antigo viraram regressão da **v5** (geometria da região antiga).
4. **Renderização**: a fila de malhas já é ordenada por distância e repartida por orçamento de tempo (`MESH_BUDGET_MS`), então o mundo 4× maior abre em ≈ 1,5 s (conferido a 740 × 360); a névoa de 64 m esconde o resto.

## Consequências
- Testes que dependiam do desenho da seed 42 na região antiga (luz, lajes, Marco/Painel) passaram a fixar a **v5** explicitamente; `regiao.test.ts` (+5) cobre a v6: bordas, relevo limitado, determinismo, seções iniciais (64 chunks), luz cruzando a antiga borda e persistência de edição nos cantos novos.
- Pendências: só há um lago e o mesmo conjunto de pontos de interesse (a área nova é planície de dunas); conteúdo para a área extra (afloramentos de cobre, mais plantas e tocas, outros pontos) entra nas próximas etapas; descartar malhas além da névoa e medir memória em aparelho; revisar o desenho de luz e do céu nas bordas.
