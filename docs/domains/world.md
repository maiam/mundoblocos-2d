# Domínio: world

**Fonte de verdade:** `World` (estado em execução) + `WorldGenerator` (terreno não editado, puro por seed).

## Modelo
- Célula com três camadas: **chão**, **objeto nível 0** e **cubo nível 1** (pilha de até `MAX_STACK` = 2).
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
- `standHeight(x, y)`: 0 chão, 1–2 sobre cubos, `null` (água, buraco, árvore, cacto). Regra única de entidades.
- `isGroundStandable`: material como chão é pisável; água/buraco não.
- Quebrar (`breakTarget`/`breakTargetId`): nível 1 → nível 0 → chão (vira buraco). Água não quebra. Restrição por
  ferramenta fica em `world/items.ts` (`toolCanBreak`), usando `BlockDef.choppable` (madeira/árvore/planta).
- Colocar (`placementLevel`): só materiais. Em buraco vira piso nivelado; senão nível 0 (substitui enfeite) ou
  nível 1 sobre cubo.
- Plantar: só em chão de Terra Arada. Arar (`till`): chão de Terra/Terra com Grama livre → Terra Arada.
- Chunks `modified` nunca são descarregados.
