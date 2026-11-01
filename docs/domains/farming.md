# Domínio: cultivo e itens

## Ferramentas (`world/items.ts` → `TOOLS`)
- Espada, Enxada, Picareta, Pá, Machado: itens únicos, sem quantidade, equipados ao selecionar.
- Uso planejado (sem efeito ainda): espada = combate; enxada = preparar terra; picareta = pedra/minério;
  pá = cavar; machado = árvores/madeira.

## Itens (`world/items.ts`) — fonte de verdade
- **Itens contáveis** ≠ blocos: blocos de construção são infinitos; itens têm quantidade no inventário.
- `Semente de Trigo` (planta `WHEAT_0`) e `Trigo` (alimenta ovelhas).
- `dropsFor(bloco)`: trigo maduro → 1 trigo + 1–2 sementes; trigo verde → devolve 1 semente; demais blocos → nada.

## Plantação (`world/world.ts`, `world/blocks.ts`)
- Trigo = 16 ids consecutivos (`WHEAT_FIRST` = 60 … 75), forma `crop`: não bloqueia passagem, não aceita bloco
  por cima, não se coloca pela hotbar (só plantando).
- `canPlant`: chão de **terra** (grama, musgo encantado ou terra) com célula vazia ou com enfeite.
- Crescimento: `World.tick(dt)` avança cada trigo um estágio com probabilidade `dt / WHEAT_STAGE_SECONDS` (6 s)
  → ~1,5 min da semente ao maduro, sem sincronia entre plantas. O `World` guarda as células plantadas
  (só em chunks modificados, que não descarregam).
- Colher = quebrar segurando 2 s (mesma regra de qualquer quebra).

## Inventário e coleta (`game/`)
- `Inventory`: quantidades de itens; começa com 5 sementes e 2 trigos. Não persistido.
- Hotbar (`game/hotbar.ts`): ferramentas 1–5, semente 6 e trigo 7 (com contador), blocos depois.
- `Drops`: o que cai da colheita fica no chão (pulinho + flutuação) e voa até a personagem a < 1,6 célula.

## Ações (toque curto, conforme o item selecionado)
- Semente → planta na célula de chão sob o dedo (alcance 4,5).
- Trigo → dá para a ovelha sob o dedo (anel dourado = pode comer; vermelho = não).

## Arte
- `assets-src/wheat-growth-sheet.png` → `src/assets/wheat-crop.png` (16 estágios; canteiro ~1,15 célula).
- Ícones escolhidos da prancha: **monte de sementes** (Semente de Trigo) e **feixe com laço** (Trigo).
