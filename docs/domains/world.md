# Domínio: world

**Fonte de verdade:** `World` (estado em execução) + `WorldGenerator` (terreno não editado, puro por seed).

## Modelo
- Célula: **chão** + níveis de pilha (`Chunk.levels`, `World.getLevel`): **objeto nível 0** e **cubos nos níveis 1–2**
  (pilha de até `MAX_STACK` = 3). O gerador só preenche os níveis 0 e 1; o nível 2 é só do jogador.
- **Materiais** (prancha de blocos, únicos blocos de construção): Terra, Terra com Grama, Terra Arada,
  Caminho de Terra, Areia, Pedra Bruta, Tora de Carvalho, Tábua de Carvalho e 7 variações de pedra (Irregular, Tijolo,
  Chão, Lisa, Polida, Rachada, Tijolo Rachado — ids 34–39 e 42) (`MATERIALS`; coluna do atlas = índice na lista).
  O gerador só usa a Pedra Bruta; substituir água aceita só ela entre as pedras; **qualquer pedra** (`stone: true`) serve de batente de porta. O **mesmo id** serve de
  chão natural (camada de chão) e de cubo (camada de objeto).
- Cidade do Despertar: construções (ids 121–134 e bancos 136/142, forma `building`, id no canto inferior esquerdo + `TOWN_PART`) e
  enfeites fixos (135–141); ver `domains/town.md`.
- Só-chão: Água (líquida) e Buraco. Objetos naturais: Carvalho, Cerejeira, Cacto, Capim, Flor, Trigo.
- Chunk = 16×16 células, chave `"cx,cy"`, nos dois eixos do mapa (sem limite).

## Geração (`generator.ts`)
- Elevação = fBm local + continental. `< -0.26` água; `< -0.2` areia (praia); `> 0.31` terra; `> 0.36` cubos de
  pedra; `> 0.43` pedra com 2 níveis (escalável pelas bordas). Rios por |fBm| estreito.
- Biomas (umidade; `pickBiome`): Campos (grama + carvalhos, 1/6 macieiras) e Bosque de Sakura (grama + cerejeiras).
  Desde a v0.55.0 o mundo da Cidade 1 é só de florestas (ADR 0019): as Dunas (areia + cactos) ficam no código para um
  mundo árido futuro. Areia só nas praias. Trilhas naturais de Caminho de Terra cortam os campos.
- Árvores por hash × densidade × manchas de floresta; **pedregulhos** raros (`ROCK_BOULDER`, desde v0.58.0 com a
  arte da prancha de pedras — antes eram cubos de `STONE`; minerados dão 1–3 Pedras Brutas); enfeites.

## Regras
- **Paredes de pedra** (v0.68.0): `isWall` (forma `wall`): bloqueiam, ninguém sobe, nada empilha em cima; só em chão
  livre. Diferente do bloco (cubo: empilha até 3 e se sobe nele).
- **Cerca/portão** (v0.59.0): `FENCE` bloqueia; portão abre/fecha como a porta (`toggled`); nada empilha em cima;
  qualquer célula livre (sem batentes). A emenda entre cercas é só do render.
- `standHeight(x, y)`: 0 chão (ou porta/portão aberto), 1–3 sobre cubos, `null` (água, buraco, árvore, cacto, porta fechada). Regra única de entidades.
- `isGroundStandable`: material como chão é pisável; água/buraco não.
- Quebrar (`breakTarget`/`breakTargetId`): topo da pilha → … → nível 0 → chão (vira buraco). Água não quebra. Restrição por
  ferramenta fica em `world/items.ts` (`toolCanBreak`), usando `BlockDef.organic` (`wood` = madeira/árvore; `plant` = plantas e derivados) e `BlockDef.soft` (terra, grama,
  arada, caminho, areia: o que a pá cava). `canFlatten/flatten`: Terra/Grama/Arada → Caminho (pá).
- Colocar (`placementLevel`): só materiais. Em buraco vira piso nivelado; senão nível 0 (substitui enfeite) ou
  próximo nível sobre cubo (até 3). Porta (`shape: 'door'`): só nível 0, nada empilha sobre ela.
- **Dungeon** (`world/dungeon.ts`, perfil `dungeon`): `DungeonTerrain` sobrepõe a área ao gerador; `isProtected`
  bloqueia quebrar/colocar/arar/amassar/plantar na área inteira. Ver `domains/dungeon.md`.
- **Água** (`Block.WATER`, chão líquido): inquebrável e não pisável. `placementLevel`: qualquer terra (Terra, Terra com Grama, Terra Arada, Caminho de Terra), Pedra, Tora ou Tábua de Carvalho
  (`REPLACES_WATER`) substituem a água como chão (`'ground'`). **Enchimento**: buraco (`HOLE`) com água vizinha é
  agendado (`scheduleFlow`, lado de origem em ordem fixa oeste/leste/norte/sul); `tick` → `tickWater` avança
  (`FLOW_SECONDS` = 0,6 s) e, ao encher, agenda os buracos vizinhos (cadeia). Terra firme nunca é inundada; buraco
  tapado antes desiste. Estado em execução (`waterFlows`); `settleWater` reagenda após carregar (save.ts).
- **Baú**: conteúdo em `World.chests` ("x,y" → 27 espaços), criado sob demanda em `chestAt`, apagado ao quebrar (quem
  quebra lê antes para soltar os itens). Tenda: derrubar a atual zera `World.tent`.
- **Tenda 2×2** (`tentCells`, `tentAnchor`, `isFootprintFree`, `footprint`/`footprintAnchors` para quem coloca): canto `TENT` + 3 `TENT_PART`; `breakTargetId` de uma
  parte = `TENT`; `breakBlock` remove as 4.
- Porta só vai entre batentes: células da esquerda e da direita com cubo de madeira (`organic: 'wood'`) ou de qualquer pedra (`stone: true`) no nível 0 (`hasDoorFrame`; pode misturar).
- Porta: `isDoor/isDoorOpen/toggleDoor` — o id guarda o estado (`OAK_DOOR` sólida, `OAK_DOOR_OPEN` passável). O `Game`
  só fecha se a célula estiver livre de entidades (`canToggleDoorAt`).
- Plantar: só em chão de Terra Arada. Arar (`till`): chão de Terra/Terra com Grama livre → Terra Arada.
- Chunks `modified` nunca são descarregados.
