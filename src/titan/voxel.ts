/**
 * Titã — grade voxel (ADR 0039). Independente de `SUBDIV`, de `World` e da grade de chão/pilhas do Orvalis: aqui a unidade é 1 bloco = 1 m
 * e a ocupação é por `(x, y, z)`. Sem DOM e sem `Math.random()`: roda em Node (testes) e é determinística por seed + versão do gerador.
 */

/** Altura mínima/máxima (inclusivas) das células: 384 camadas, 24 seções de 16. Y é a base do voxel. */
export const Y_MIN = -64;
export const Y_MAX = 319;
export const SECTION = 16;
export const SECTIONS = (Y_MAX - Y_MIN + 1) / SECTION; // 24
/** Nível do lago: última célula líquida em Y = 63; a superfície fica em Y = 64. */
export const LAKE_LAST_Y = 63;
export const LAKE_SURFACE_Y = 64;

/** Região de teste da primeira entrega: 4 × 4 chunks (64 × 64 blocos) em volta da origem, x/z em [-32, 32). */
export const REGION_MIN = -32;
export const REGION_MAX = 32;

/** Ids de bloco (um byte; 0 = ar). */
export const T = { AIR: 0, SAND: 1, DAMP_SAND: 2, DARK_ROCK: 3, FROST: 4, LAKE: 5, BEDROCK: 6, LANTERN: 7, VEIN_ROCK: 8, VEIN_FROST: 9, WORKBENCH: 10, EMBER: 11, SLAB: 12 } as const;
export type TitanBlock = (typeof T)[keyof typeof T];

export const BLOCK_NAMES: Record<number, string> = { 1: 'Areia ocre', 2: 'Areia úmida', 3: 'Rocha escura', 4: 'Gelo fosco', 5: 'Lago escuro', 6: 'Rocha-mãe', 7: 'Lanterna da margem', 8: 'Rocha com veio', 9: 'Gelo com veio', 10: 'Mesa de Trabalho', 11: 'Brasa de âmbar', 12: 'Laje de rocha' };

/** Sólido = colide e esconde as faces vizinhas. Ar, líquido e a lanterna (objeto pequeno que emite luz) não. */
export const isSolid = (id: number): boolean => id !== T.AIR && id !== T.LAKE && id !== T.LANTERN;
/** Alvo da mira (e do "quebrar"): sólido ou lanterna. O líquido e o ar são atravessados. */
export const isTarget = (id: number): boolean => isSolid(id) || id === T.LANTERN;
/** Célula ocupada: não aceita colocar nada (sólido ou lanterna). Líquido e ar aceitam. */
export const isOccupied = isTarget;
/** Altura do bloco dentro da célula (0–1): 1 = cubo inteiro, 0,5 = laje (ADR 0046), 0 = não sólido. A física e a mira usam esta altura. */
export const blockHeight = (id: number): number => (id === T.SLAB ? 0.5 : isSolid(id) ? 1 : 0);
/** Cubo inteiro: só ele esconde as faces vizinhas (a laje deixa a metade de cima da célula aberta). */
export const isFull = (id: number): boolean => isSolid(id) && id !== T.SLAB;
/** Veio natural (rocha ou gelo com marca visível): quebrar devolve o bloco e solta uma lasca (ADR 0044). */
export const isVein = (id: number): boolean => id === T.VEIN_ROCK || id === T.VEIN_FROST;

export type Face = 'top' | 'side' | 'bottom';

/** Índice do tile no atlas 4 × 2 (col = i % 4, linha = i / 4 | 0): ver `render/art/titan.ts` e a direção de arte. */
export function tileFor(id: number, face: Face): number {
  switch (id) {
    case T.SAND: return face === 'top' ? 0 : 1;
    case T.DAMP_SAND: return face === 'top' ? 2 : 3;
    case T.DARK_ROCK:
    case T.SLAB: // a laje reaproveita a rocha escura: topo de 16 × 16 e lateral com 8 px de altura (ADR 0046)
    case T.BEDROCK: return 4;
    case T.FROST: return 5;
    case T.LAKE: return 6; // quadro 1 (o quadro 2 = 7 é alternado no render)
    case T.VEIN_ROCK: return 8; // veios naturais (gerador v3): linha 3 do atlas, mesma arte nas 6 faces
    case T.VEIN_FROST: return 9;
    case T.EMBER: return 10; // depósito de brasa de âmbar (gerador v4): rocha com cristal; a mesa (10) é o modelo 3D do renderer, não usa o atlas
    default: return 4;
  }
}

export const inRegion = (x: number, z: number): boolean => x >= REGION_MIN && x < REGION_MAX && z >= REGION_MIN && z < REGION_MAX;

// ---- Endereçamento (docs Titã 05, §2) ----
export const chunkOf = (v: number): number => Math.floor(v / 16);
export const localOf = (v: number): number => v - chunkOf(v) * 16;
export const sectionOf = (y: number): number => Math.floor((y - Y_MIN) / SECTION);
export const localY = (y: number): number => (y - Y_MIN) - sectionOf(y) * SECTION;
/** Índice de uma célula dentro da coluna do chunk (0..98303): camada de Y desde o fundo, depois z e x locais. */
export const columnIndex = (lx: number, y: number, lz: number): number => ((y - Y_MIN) * 16 + lz) * 16 + lx;
export const unpackIndex = (i: number): { lx: number; y: number; lz: number } => ({ lx: i & 15, lz: (i >> 4) & 15, y: (i >> 8) + Y_MIN });
export const chunkKey = (cx: number, cz: number): string => `${cx},${cz}`;
