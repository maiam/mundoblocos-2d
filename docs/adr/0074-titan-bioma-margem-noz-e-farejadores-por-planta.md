# ADR 0074 — Titã: Margem como bioma, noz em 1 % da areia seca e Farejadores por planta (gerador v12, v0.133.0)

**Status:** Aceita. Pedido do dono do produto: tratar a margem como bioma; a Noz de Duna só em areia seca e em uma porcentagem da areia seca (1 %); um Farejador pequeno por planta, nascendo perto dela, e um grande a cada 5 plantas. Corrige também o texto do ADR 0060 (a v5–v11 aceitava areia seca **ou úmida**, ~86 % em seca).

## Decisão
1. **`titan/biomes.ts`** (puro): descritor `MARGEM_SILENCIOSA` (`nutRate` 0,01; `nutSpacing` 4; `pequenoPerPlant` 1; `plantsPerGrande` 5) e `biomeAt(x, z)`, que hoje devolve a Margem em todo o mundo. Outro bioma entra com outro descritor; só a noz e os animais leem o bioma por enquanto.
2. **Gerador v12** (`nutsFor`): candidatas = **areia seca** (`T.SAND`; a úmida sai), topo 64–66, alcançável a pé com os 4 vizinhos, fora da clareira, das formações, do âmbar e dos montes de cobre. Alvo = `round(nutRate × candidatas)` (cerca de **22 plantas** na seed 42; 18–34 nas 13 seeds testadas). Mantém as 2 plantas "seguras" a 7–16 blocos da chegada e a enseada de até 4 plantas em volta da toca; o resto sai por sorteio de hash, com espaçamento ≥ 4 e a ≥ 18 da chegada, ≥ 22 do cobre e ≥ 18 dos abrigos. Até a v11 continua como era (6 plantas).
3. **Animais por planta** (`creatureSpecs`): **um Farejador pequeno por planta** (`p<i>`), numa célula de chão plano a 2–3 da planta, e **um grande a cada 5 plantas** (`g0` = o da toca; os outros junto de plantas afastadas da chegada e entre si, relaxando 24/20 → 20/14 → 18/10 se faltar lugar). Seed 42: 22 pequenos e 4 grandes. Até a v11, o par `grande`/`pequeno` da toca (ids = tamanho).
4. **Volta por id** (`session.respawn: Map<id, s>`, `header.respawn` com os mesmos ids; as partidas v ≤ 11 já gravavam `grande`/`pequeno`): abater um animal agenda a volta **dele**, no ninho de origem, 600 s de jogo ativo depois; os demais seguem vivos. Espólio com id `m:<id>:…`.
5. **Custo**: simulam-se só os animais a até 56 m do viajante (os longe e sossegados ficam parados) e só os 8 mais próximos, a até 64 m, vão para o desenho (cada rig tem ~24 mil triângulos). A mira e o golpe valem para qualquer animal da lista.

## Consequências
- A comida deixa de ser rara, mas cada planta tem seu guardião: colher noz passa a ser uma pequena luta (dano do pequeno: 1 coração); há 2 pequenos a 11 e 16 m da chegada na seed 42, dentro da visão de 8 m de quem explora. Se isso pesar no começo, dá para tirar o animal das 2 plantas seguras (decisão de balanço, não de regra).
- Pendências: balanço (taxa, espaçamento, dano, volta); aceite em aparelho do custo de ~8 rigs ao mesmo tempo; mais biomas (a Margem vira uma entre outras).
- Testes: `bioma.test.ts` (+4); `noz.test.ts` e `combat.test.ts` fixam a v11 (par da toca, 6 plantas).
