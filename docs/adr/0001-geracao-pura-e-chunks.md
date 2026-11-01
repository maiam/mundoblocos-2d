# ADR 0001 — Geração pura por seed e chunks 16×16

**Status:** aceito (2026-11-01)

## Contexto
O mundo precisa ser "infinito" na horizontal, carregar sob demanda e ter bordas de chunk sem costura
(árvores e cavernas atravessando chunks).

## Decisão
- `WorldGenerator.blockAt(x, y)` é função pura da seed; gerar um chunk = avaliar 256 células.
- Estruturas multi-bloco (árvores) são resolvidas consultando células vizinhas por hash, sem estado.
- Chunks 16×16 em ambos os eixos; edições do jogador ficam no `Uint8Array` do chunk e o marcam como
  `modified` (não descartável).

## Consequências
- Determinismo testável e chunks independentes (paralelizáveis em Worker no futuro).
- Leitura de vizinho fora de chunk carregado cai no gerador, sem forçar carregamento.
- Salvar o mundo = salvar seed + chunks modificados.
