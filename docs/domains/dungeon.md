# Domínio: dungeon e monstros

Primeira dungeon: **Covil das Aranhas**, no mundo principal (perfil `dungeon: true`), perto do spawn.

## Área (`world/dungeon.ts`) — fonte de verdade
- `buildDungeon(seed, x0, y0, side)`: retângulo de **34 × 24** células, função pura da seed.
  - **Muralha** de 2 células de `DUNGEON_MOUNTAIN` (sprite grande, bloqueia) com **uma única entrada** de 3 células
    no meio do lado `side`.
  - **Chão**: terra (84%), musgo, teias e ossos (`DUNGEON_DIRT/MOSS/WEB/BONES`).
  - **Obstáculos** isolados (pedras, ninhos de ovos, cogumelos, espinhos, raízes; `shape: 'rock'`): nenhum vizinho,
    nem na diagonal, é obstáculo e todos ficam a 1 célula da muralha → o interior nunca é dividido (teste de
    alcance por BFS a partir da entrada).
  - Zonas livres: chegada (raio 4 dentro da entrada) e **arena do chefe** (raio 5), no fundo oposto à entrada.
  - **Monstros** (`spawns`): 1 `spider-boss` na arena, 5 `spider-big` e 10 `spider-small` em células livres a
    ≥ 7 células da entrada (`MONSTER_COUNTS`).
- `planDungeon(base, spawnX, spawnY)`: tenta 8 direções × distâncias 26–60 do spawn; aceita a primeira com pouca
  água e terra firme diante da entrada. A entrada fica **voltada para o spawn** (`sideFacing`).
- `DungeonTerrain`: `TerrainSource` que sobrepõe a área ao terreno base (fora dela, nada muda).
- `World`: com perfil `dungeon`, calcula o spawn no terreno base, planeja a dungeon e troca o gerador pela
  sobreposição; `findSpawn` devolve o spawn calculado (a dungeon não o altera).

## Regras
- **Área protegida** (`World.isProtected`, muralha incluída): nada quebra (`breakTarget` = null), nada é colocado
  (`placementLevel` = null), nem arado, amassado ou plantado. Só se luta lá dentro.
- **Monstros não saem**: `Monster.insideAt` bloqueia a caixa dos pés fora de `interior`; a entrada fica fora do
  interior, então nenhum monstro a atravessa (teste com 50 s simulados).

## Monstros (`game/monster.ts`)
- `Monster extends Walker`; atributos em `MONSTERS` (velocidade, caixa, vida, visão, raio de passeio):
  aranha pequena 2 golpes, grande 4, **chefe 14** (caixa 1,8 × 0,9).
- Passeiam perto de onde nasceram; com a personagem **dentro** da dungeon e no raio de visão, vão atrás dela e
  param encostados. **Ainda não causam dano** (a personagem não tem vida — próximo passo).
- Golpe (espada/machado, `Entities.strike`): −1 de vida, pisca 0,35 s, recua; sem vida, some. O alcance conta a
  partir da borda do corpo (o chefe é atingido de mais longe). Barra de vida aparece quando feridos.
- Estado de execução (não persistido): ao recarregar, renascem todos.

## Arte
- `scripts/extract-dungeon.py` (comando em `OPERATIONS.md`): montanhas e blocos (transparentes), pedras e aranhas
  pequena/grande (fundo claro), aranha gigante (fundo escuro). Detalhes de render em `render.md`.
