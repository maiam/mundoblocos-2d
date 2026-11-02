# Domínio: world

**Fonte de verdade:** `World` (estado em execução) + `WorldGenerator` (terreno não editado, puro por seed).

## Modelo
- Célula: **chão** + níveis de pilha (`Chunk.levels`, `World.getLevel`): **objeto nível 0** e **cubos nos níveis 1–2**
  (pilha de até `MAX_STACK` = 3). O gerador só preenche os níveis 0 e 1; o nível 2 é só do jogador.
- **Materiais** (prancha de blocos, únicos blocos de construção): Terra, Terra com Grama, Terra Arada,
  Caminho de Terra, Areia, Pedra, Tora de Carvalho, Piso de Carvalho (`MATERIALS`). O **mesmo id** serve de
  chão natural (camada de chão) e de cubo (camada de objeto).
- Só-chão: Água (líquida) e Buraco. Objetos naturais: Carvalho, Cerejeira, Cacto, Capim, Flor, Trigo.
- Chunk = 16×16 células, chave `"cx,cy"`, nos dois eixos do mapa (sem limite).

## Geração (`generator.ts`)
- Elevação = fBm local + continental. `< -0.26` água; `< -0.2` areia (praia); `> 0.31` terra; `> 0.36` cubos de
  pedra; `> 0.43` pedra com 2 níveis (escalável pelas bordas). Rios por |fBm| estreito.
- Biomas (temperatura/umidade): Campos (grama + carvalhos), Bosque de Sakura (grama + cerejeiras), Dunas
  (areia + cactos). Trilhas naturais de Caminho de Terra cortam os campos.
- Árvores por hash × densidade × manchas de floresta; pedregulhos raros; enfeites.

## Regras
- `standHeight(x, y)`: 0 chão (ou porta aberta), 1–3 sobre cubos, `null` (água, buraco, árvore, cacto, porta fechada). Regra única de entidades.
- `isGroundStandable`: material como chão é pisável; água/buraco não.
- Quebrar (`breakTarget`/`breakTargetId`): topo da pilha → … → nível 0 → chão (vira buraco). Água não quebra. Restrição por
  ferramenta fica em `world/items.ts` (`toolCanBreak`), usando `BlockDef.organic` (`wood` = madeira/árvore; `plant` = plantas e derivados) e `BlockDef.soft` (terra, grama,
  arada, caminho, areia: o que a pá cava). `canFlatten/flatten`: Terra/Grama/Arada → Caminho (pá).
- Colocar (`placementLevel`): só materiais. Em buraco vira piso nivelado; senão nível 0 (substitui enfeite) ou
  próximo nível sobre cubo (até 3). Porta (`shape: 'door'`): só nível 0, nada empilha sobre ela.
- Porta: `isDoor/isDoorOpen/toggleDoor` — o id guarda o estado (`OAK_DOOR` sólida, `OAK_DOOR_OPEN` passável). O `Game`
  só fecha se a célula estiver livre de entidades (`canToggleDoorAt`).
- Plantar: só em chão de Terra Arada. Arar (`till`): chão de Terra/Terra com Grama livre → Terra Arada.
- Chunks `modified` nunca são descarregados.
