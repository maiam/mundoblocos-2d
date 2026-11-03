# ADR 0004 — Entidades andantes compartilham `Walker`

**Status:** aceito (2026-11-01)

## Contexto
Chegada do primeiro NPC (ovelha). Movimento, colisão com o mapa, altura/degrau e animação já existiam no
`Player`; copiar isso para cada NPC criaria regras paralelas.

## Decisão
- `game/walker.ts` concentra movimento, colisão (`World.standHeight` + `stepHeight`), `z`/`visualZ`, direção
  do sprite e ocupação. `Player` e `Sheep` estendem `Walker` variando só a especificação e a fonte de direção
  (entrada do jogador vs. IA).
- `game/entities.ts` mantém personagem + NPCs, resolve colisão entre entidades e responde ocupação de células.
- NPCs são **estado de execução** do jogo (não fazem parte do `World` nem são persistidos); o `World` segue como
  fonte de verdade do mapa e das regras de pisar.

## Consequências
- Novo animal = nova subclasse de `Walker` + folha de sprite + entrada em `ActorKind`.
- Persistir/spawnar NPCs por chunk exigirá decidir onde guardar esse estado (ver NEXT_STEPS).
