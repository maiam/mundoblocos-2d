# ADR 0006 — Materiais da prancha como únicos blocos

**Status:** aceito (2026-11-01). Substitui a parte "texturas procedurais dos blocos" da ADR 0002.

## Contexto
Pedido: manter apenas os 8 blocos da prancha (terra, grama, arada, caminho, areia, pedra, tora, piso de carvalho).
A prancha é isométrica; o jogo é 3/4 oblíquo. O chão antigo tinha tipos próprios (grama, neve, gelo…).

## Decisão
- Um id por material, usado tanto na camada de chão quanto como cubo. Chão do mapa = materiais (+ água/buraco).
- Biomas sem material próprio (tundra, floresta encantada) e blocos fora da prancha foram removidos.
- Arte: faces extraídas da prancha por transformação de perspectiva (gabarito da geometria) em um atlas;
  chão usa uma versão contínua do topo. Água, árvores, cacto e enfeites seguem procedurais.

## Consequências
- Novo material exige cubo na prancha (mesmo estilo) + reexecutar `extract-blocks.py`.
- Achatamento da face lateral isométrica para a frontal 3/4 perde um pouco de detalhe (aceitável).
- Terra arada e caminho já existem como material: a ação da enxada/pá pode converter chão em vez de criar tipos.
