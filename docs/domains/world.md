# Domínio: world

**Fonte de verdade:** `World` (estado em execução) + `WorldGenerator` (terreno não editado, puro por seed).

## Paredes (W2, v0.93.15, ADR 0027)
Bloco de **nível único** (`shape: 'wall'`, `Block.WALL_PLANKS`/`WALL_STONE`): sólido, no nível 0, sem empilhar (a regra de `placementLevel` já cobre: só cubo sobre cubo empilha) e nunca degrau (`standHeight` nulo). A forma sai de `world/walls.ts` (puro): frente (`single`/`left`/`mid`/`right`; escondida com parede ao sul), tampa de 16 peças (máscara N=1, E=2, S=4, W=8) e cantos internos. `World.isWallAt` e `World.wallPieceAt(x, y)` expõem a peça ao render. Nenhum perfil as lista ainda (sem arte nem receita).

## Modelo
- Célula: **chão** + níveis de pilha (`Chunk.levels`, `World.getLevel`): **objeto nível 0** e **segundo cubo no nível 1**
  (pilha de até `MAX_STACK` = 2). O gerador só preenche os níveis 0 e 1; a terceira camada de saves antigos é descartada e `restoreChunk` devolve quantos blocos foram descartados (o jogo avisa; a sala registra).
- **Materiais** (prancha de blocos, únicos blocos de construção): Terra, Terra com Grama, Terra Arada,
  Caminho de Terra, Areia, Pedra Bruta, Tora de Carvalho, Tábua de Carvalho, 4 variações de pedra (Tijolo, Chão,
  Lisa, Polida — ids 35–38) e, no fim da lista, Tora e Tábua de Cerejeira e de Bétula (ids 230–233, v0.88.0/0.89.0; só V2, sem coluna no atlas antigo) (`MATERIALS`; coluna do atlas antigo = índice na lista, até `LEGACY_MATERIALS` = 15). **Aposentadas** (08/11, `RETIRED_STONES`):
  Pedra Irregular (34), Pedra Rachada (39) e Tijolo de Pedra Rachado (42) — sem receita e fora da cidade, mas os ids
  seguem reservados e na lista (mundos salvos podem tê-las: continuam aparecendo, quebrando e valendo de batente).
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
  mundo árido futuro. Areia só nas praias. Desde a v0.90.0 as árvores se misturam nos dois biomas (`Biome.altTrees`: carvalho, bétula, cerejeira e macieira) e na cidade (cerejeira, bétula, carvalho). Trilhas naturais de Caminho de Terra cortam os campos.
- Árvores por hash × densidade × manchas de floresta; **pedregulhos** raros (`ROCK_BOULDER`, desde v0.58.0 com a
  arte da prancha de pedras — antes eram cubos de `STONE`; minerados dão 1–3 Pedras Brutas); enfeites.

## Regras
- **Paredes removidas** (08/11, dono do produto): não existem mais. Os ids 210–225 (`isRemovedBlock`) viram vazio em
  mapa, bolsa, grade e baús vindos de dados antigos (`World.restoreChunk`/`setLevel`, `save.migrate`, `parseBag`,
  `parseChestSlots`); nenhum bloco novo deve reusar essa faixa enquanto houver mundos e salas antigos.
- **Cerca/portão** (v0.59.0): `FENCE` bloqueia; portão abre/fecha como a porta (`toggled`); nada empilha em cima;
  qualquer célula livre (sem batentes). A emenda entre cercas é só do render.
- `standHeight(x, y)`: 0 chão (ou porta/portão aberto), 1–3 sobre cubos, `null` (água, buraco, árvore, cacto, porta fechada). Regra única de entidades.
- `isGroundStandable`: material como chão é pisável; água/buraco não.
- Quebrar (`breakTarget`/`breakTargetId`): topo da pilha → … → nível 0 → chão (vira buraco). Água não quebra. Restrição por
  ferramenta fica em `world/items.ts` (`toolCanBreak`), usando `BlockDef.organic` (`wood` = madeira/árvore; `plant` = plantas e derivados) e `BlockDef.soft` (terra, grama,
  arada, caminho, areia: o que a pá cava). `canFlatten/flatten`: Terra/Grama/Arada → Caminho (pá).
- Colocar (`placementLevel`): só materiais. Em buraco vira piso nivelado; senão nível 0 (substitui enfeite) ou
  próximo nível sobre cubo (até 2). Porta (`shape: 'door'`): só nível 0, nada empilha sobre ela.
- **Dungeon** (`world/dungeon.ts`, perfil `dungeon`): `DungeonTerrain` sobrepõe a área ao gerador; `isProtected`
  bloqueia quebrar/colocar/arar/amassar/plantar na área inteira. Ver `domains/dungeon.md`.
- **Água** (`Block.WATER`, chão líquido): inquebrável e não pisável. `placementLevel`: qualquer terra (Terra, Terra com Grama, Terra Arada, Caminho de Terra), Pedra, Tora ou Tábua de Carvalho
  (`REPLACES_WATER`) substituem a água como chão (`'ground'`). **Enchimento**: buraco (`HOLE`) com água vizinha é
  agendado (`scheduleFlow`, lado de origem em ordem fixa oeste/leste/norte/sul); `tick` → `tickWater` avança
  (`FLOW_SECONDS` = 0,6 s) e, ao encher, agenda os buracos vizinhos (cadeia). Terra firme nunca é inundada; buraco
  tapado antes desiste. Estado em execução (`waterFlows`); `settleWater` reagenda após carregar (save.ts).
- **Chunk do muro** (v0.88.0): `isProtected` = áreas fixas (`inGuardedArea`: dungeon, covil, cidade, interiores) **ou** qualquer chunk que tenha célula da muralha (`inWallChunk`, anel de `TOWN_WALL` na borda de `town.area`; só o miolo sem muralha fica de fora). Vale também fora dos limites da cidade; ao carregar, só `inGuardedArea` volta do gerador (o que já foi construído fora da cidade continua). `outsideGate()` anda pela estrada até sair do chunk do muro.
- **Chão que se refaz** (v0.86.0): cada buraco tem uma idade (`holeAge`, ligada em `setLevel`/`restoreChunk`); `tick` →
  `tickHoles` envelhece e, ao completar `DAY_LENGTH_S`, `healedGround` escolhe o chão de um vizinho (laterais, depois
  diagonais; só cubos não líquidos; `hash2(seed, x, y)` desempata) e avisa pelo `onGrow`. Tapar o buraco (ou ele encher)
  tira a contagem; sem vizinho aproveitável espera. Na sala o aparelho aplica o aviso em `applyGrowth` (só em buraco).
  Idades persistem: `holeAges`/`loadHoleAges` (save.ts v11, snapshot da sala v4).
- **Baú**: conteúdo em `World.chests` ("x,y" → 27 espaços), criado sob demanda em `chestAt`, apagado ao quebrar (quem
  quebra lê antes para soltar os itens). Tenda: derrubar a atual zera `World.tent`.
- **Tenda 2×2** (`tentCells`, `tentAnchor`, `isFootprintFree`, `footprint`/`footprintAnchors` para quem coloca): canto `TENT` + 3 `TENT_PART`; `breakTargetId` de uma
  parte = `TENT`; `breakBlock` remove as 4.
- Porta só vai entre batentes: células da esquerda e da direita com **bloco** de madeira (`organic: 'wood'`) ou de qualquer pedra (`stone: true`) no nível 0 (`hasDoorFrame`; pode misturar; terra, grama e areia não servem).
- **Assentos** (v0.79.0): `BlockDef.seat` (cadeira, bancos da cidade); `World.seatAt(x, y, px, py)` dá a célula onde se senta (no banco, a mais perto de quem senta).
- Porta: `isDoor/isDoorOpen/toggleDoor` — o id guarda o estado (`OAK_DOOR` sólida, `OAK_DOOR_OPEN` passável). O `Game`
  só fecha se a célula estiver livre de entidades (`canToggleDoorAt`).
- Plantar: só em chão de Terra Arada. Arar (`till`): chão de Terra/Terra com Grama livre → Terra Arada.
- Chunks `modified` nunca são descarregados.
