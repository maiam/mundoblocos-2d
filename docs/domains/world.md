# Domínio: world

**Fonte de verdade:** `World` (estado em execução) + `WorldGenerator` (terreno não editado, puro por seed).

## Modelo
- Célula com duas camadas: **chão** (`GRASS`, `ENCHANTED_GRASS`, `SAND`, `SNOW`, `DIRT`, `WATER`, `ICE`) e
  **objeto** (`AIR` = vazio; cubos, árvores, enfeites). Propriedades em `blocks.ts`.
- Chunk = 16×16 células, chave `"cx,cy"`, nos dois eixos do mapa (sem limite).

## Geração (`generator.ts`)
- Elevação = fBm local + continental. `< -0.26` água; `< -0.2` praia; `> 0.36` montanha (cubos de pedra/arenito
  com carvão, ouro e cristal de mana nas partes altas); rios por |fBm| estreito.
- Bioma por temperatura/umidade (fBm 2D), com deslocamento por seed. Tundra usa gelo (andável) no lugar de água.
- Árvores por hash × densidade do bioma × manchas de floresta; arbustos e pedregulhos raros; enfeites.

## Regras
- Andável: chão não líquido e objeto não sólido (`isWalkable`).
- Quebrar: objetos `breakable`. Colocar: `placeable`, camada objeto, chão não líquido, célula vazia ou com enfeite.
- Spawn: anel de busca por bioma acolhedor (Campos/Sakura/Encantada) e célula andável cercada de andáveis.
- Chunks `modified` nunca são descarregados.
