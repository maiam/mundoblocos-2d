# ADR 0005 — Itens contáveis e inventário

**Status:** aceito (2026-11-01)

## Contexto
Semente e trigo precisam de quantidade (colheita rende, plantar e alimentar gastam), enquanto os blocos de
construção sempre foram infinitos.

## Decisão
- `world/items.ts` define os itens e `dropsFor` (o que o mundo devolve ao quebrar) — regra de domínio.
- `game/inventory.ts` guarda quantidades do jogador; `game/hotbar.ts` mistura espaços de item e de bloco.
- Blocos continuam infinitos (sem drops). Colheita gera `Drops` no chão, coletados por proximidade.
- Plantações vivem no `World` (estado do mapa); ovelhas e inventário são estado de execução do jogo.

## Consequências
- Persistência futura precisa salvar inventário + plantações + ovelhas junto com as edições (seed + chunks).
- Tornar blocos coletáveis (modo sobrevivência) é extensão natural: `dropsFor` + slots de bloco com contador.
