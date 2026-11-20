# ADR 0070 — Titã: veios subterrâneos com altura triangular (gerador v9, v0.127.0)

**Status:** Aceita. Contexto: referência do Minecraft 1.18 enviada pelo dono do produto (distribuição triangular por altura, veio como caminhada aleatória, descarte por exposição ao ar, só substitui rocha profunda). Até a v8 o subsolo era rocha escura lisa com 1,2 % de gelo solto entre Y −32 e 0 (`hash`).

## Decisão
1. **`GENERATOR_VERSION` 9**: a superfície, a chegada, os veios de superfície, abrigos e toca são **idênticos à v8** (teste compara coluna e bloco de topo); só o subsolo muda. A partida antiga continua na versão dela (os gelos soltos ficam só na v1–v8).
2. **`titan/ores.ts` (puro)**: `OreRule`, `sampleTriangleY` (pico em `peakY`) ou uniforme, `veinCells` (um passo ortogonal aleatório por bloco; passo fora da rocha não conta; blocos que encostam em ar são descartados com `airDiscardChance`), `attemptsFor` (parte fracionária sorteada).
3. **Regras** (`ORE_RULES` em `generator.ts`; faixas escaladas para superfície em Y ≈ 64 e fundo em −64): cobre 3 tentativas/chunk, tamanho 6, Y −48..48 pico 8, descarte 50 %; rocha 5/chunk, tamanho 5, uniforme −60..56, 50 %; gelo 3/chunk, tamanho 5, −44..8 pico −24, sem descarte (a água do lago não conta como ar).
4. **Só substitui a rocha profunda**: abaixo de `top − 3` (as 3 camadas de baixo da superfície ficam intactas) e acima do leito; nunca fora da região.
5. **Determinismo sem ordem**: veios por chunk de 16 × 16 (`genOreChunk`, semente por seed + chunk + regra, `PURPOSE.mina`); consultar uma célula gera os 3 × 3 chunks em volta (o veio passa para o vizinho) e, em sobreposição, vence a menor prioridade (regra, chunk, tentativa) — o mesmo resultado em qualquer ordem de leitura (teste).
6. Os blocos são os existentes (`VEIN_COPPER` só com picareta, `VEIN_ROCK`/`VEIN_FROST` soltam lasca); sem item, bloco ou save novo; `TITAN_SAVE_VERSION` inalterada.

## Consequências
- Primeiro uso de recursos abaixo da superfície: cobre, lascas e gelo ficam acessíveis cavando; custo de gerar a região inteira desprezível (cerca de 0,25 s para 128 × 128 × 123 células nos testes, em conjunto com a v8).
- Pendências: mais minérios e balanço de raridade; luz/escuridão no subsolo e cavernas (hoje não há ar enterrado, então a exposição só ocorre em barrancos); mostrar veios expostos em paredes de barranco; aceite em aparelho.
- Testes: `ores.test.ts` (+6).
