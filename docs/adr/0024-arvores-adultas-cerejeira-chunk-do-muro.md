# ADR 0024 — Árvores adultas e variadas, madeira de cerejeira e chunk do muro

- **Status:** aceita
- **Data:** 2026-11-08 (v0.88.0)
- **Substitui:** a decisão de 2026-11-06 "árvores crescem de verdade" (mudas e estágios, v0.52.0)

## Contexto
O dono do produto enviou novas ilustrações de árvores (macieira, carvalho, cerejeira) e pediu: tirar o crescimento — as
árvores só aparecem adultas, de formas variadas —, incluir a cerejeira com tora (topo e frente) e tábuas (só o topo) e
proibir construir no chunk onde está o muro do castelo.

## Decisões
- **Sem crescimento**: removidos os estágios (muda, jovem, crescendo), as mudas (itens e plantio) e o tempo de crescimento.
  Os ids dos estágios ficam reservados e, em dados salvos, viram a árvore adulta da espécie (`GROWTH_STAGE_ADULT`); os itens
  de muda somem das bolsas (`RETIRED_ITEMS`), como foi com as paredes. Mesma abordagem de compatibilidade, sem subir
  `SAVE_VERSION` nem `PROTOCOL_VERSION` (nenhum formato muda).
- **A macieira colhida continua voltando a dar maçãs** (`APPLE_TREE_BARE` → `APPLE_TREE`): não é crescimento da árvore e sem
  isso a maçã seria finita. A arte da colhida é a da carregada até chegar a ilustração.
- **Formas variadas**: tira de quadros por espécie (`scripts/process-trees.py`), forma sorteada pela posição (hash), sem
  aleatório — o mesmo mapa sempre sai igual. Todas as formas de uma espécie na mesma escala, alinhadas pelo pé.
- **Madeira de cerejeira**: `CHERRY_LOG` (230) e `CHERRY_PLANKS` (231) entram em `MATERIALS` depois das pedras (só V2: o atlas
  antigo termina em `LEGACY_MATERIALS` = 15). A Cerejeira (`SAKURA_TREE`) dá Tora de Cerejeira; 1 tora = 2 tábuas.
- **Chunk do muro**: `World.isProtected` passa a incluir todo chunk que tenha célula da muralha (anel de `TOWN_WALL` na borda
  da área da cidade), mesmo fora dos limites dela. A volta ao gerador no carregamento (`inGuardedArea`) continua só para as
  áreas fixas: o que já foi construído fora da cidade não é apagado.

## Consequências
- Mundos e salas antigos: mudas e jovens viram adultas; mudas na bolsa somem; construções já feitas nos chunks do muro ficam.
- Receitas de porta, baú, cadeira e cerca seguem só com Tábua de Carvalho (decisão futura se a cerejeira também vale).
