# Domínio: world

**Fonte de verdade:** `World` (estado em execução) + `WorldGenerator` (terreno não editado, puro por seed).

## Modelo
- Bloco = id `Uint8` (`blocks.ts`). Propriedades: `solid`, `opaque`, `decoration`, `liquid`, `breakable`,
  `placeable`, `glow`.
- Chunk = 16×16 blocos, chave `"cx,cy"`. Vertical: céu acima de `SKY_LIMIT_Y` (-64), rocha-mãe a partir de
  `BEDROCK_Y` (120). Nível do mar `SEA_LEVEL` (4). y cresce para baixo.

## Geração (`generator.ts`)
- Por coluna (cacheado): bioma (temperatura/umidade fBm 1D) e `surfaceY` (montanhas + colinas + detalhe).
- `blockAt(x,y)` puro → chunks são contínuos nas bordas sem costura.
- Cavernas: túneis "espaguete" (|fBm| pequeno) + salões "queijo" profundos; entradas raras perto da superfície;
  nunca sob lagos rasos.
- Minérios por profundidade: carvão (>5), ouro (>35), cristal de mana (>60).
- Árvores: no máx. uma por célula de 5 colunas, posição/altura por hash; evitadas em encostas; consultadas
  em `x±3` para copas que cruzam chunks.

## Regras de interação
- Quebrar: só `breakable`; enfeite acima sem apoio também some; se vizinho é água, o espaço vira água.
- Colocar: só `placeable`, alvo não sólido; enfeites exigem bloco sólido abaixo.
- Chunks `modified` nunca são descarregados.
