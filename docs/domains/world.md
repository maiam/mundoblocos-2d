# Domínio: world

**Fonte de verdade:** `World` (estado em execução) + `WorldGenerator` (terreno não editado, puro por seed).

## Modelo
- Célula com três camadas: **chão**, **objeto nível 0** e **cubo nível 1** (pilha de até `MAX_STACK` = 2 cubos).
  Antes eram duas; o nível 1 só existe sobre cubo. Camadas: **chão** (`GRASS`, `ENCHANTED_GRASS`, `SAND`, `SNOW`, `DIRT`, `WATER`, `ICE`) e
  **objeto** (`AIR` = vazio; cubos, árvores, enfeites). Propriedades em `blocks.ts`.
- Chunk = 16×16 células, chave `"cx,cy"`, nos dois eixos do mapa (sem limite).

## Geração (`generator.ts`)
- Elevação = fBm local + continental. `< -0.26` água; `< -0.2` praia; `> 0.36` montanha de 1 cubo; `> 0.43`
  montanha de 2 cubos (escalável a partir das bordas). Minérios (carvão, ouro, cristal de mana) ficam no cubo exposto
  do topo; rios por |fBm| estreito.
- Bioma por temperatura/umidade (fBm 2D), com deslocamento por seed. Tundra usa gelo (andável) no lugar de água.
- Árvores por hash × densidade do bioma × manchas de floresta; arbustos e pedregulhos raros; enfeites.

## Regras
- `standHeight(x, y)`: altura em que se fica de pé (0 chão, 1–2 sobre cubos) ou `null` (água, **buraco**, árvore,
  cacto). É a regra única para qualquer entidade (personagem hoje, animais no futuro).
- **Chão quebrável**: com a célula sem objeto, quebrar cava o chão → `HOLE` (`standable: false`, não quebrável).
  Água não é quebrável. O buraco só aceita **cubo novo**, que é gravado na camada de chão e vira **piso nivelado**
  (pisável, aceita pilha por cima). Quebrar o piso reabre o buraco.
  `isWalkable` = altura 0 (usado pelo spawn).
- Quebrar (`breakTarget`): nível 1 → nível 0 → chão.
- Colocar (`placementLevel`): `'ground'` em buraco (só cubos); nível 0 em chão firme vazio ou com enfeite (substituído); nível 1 somente cubo sobre
  cubo, até 2. Enfeites e árvores só no chão; nada empilha sobre árvore/enfeite.
- Spawn: anel de busca por bioma acolhedor (Campos/Sakura/Encantada) e célula andável cercada de andáveis.
- Chunks `modified` nunca são descarregados.
