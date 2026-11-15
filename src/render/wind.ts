import { Block, type BlockId, blockDef, isFancyFlower } from '../world/blocks';

/**
 * Vento e passos na vegetação (v0.93.69) e nas árvores (v0.93.82): quais objetos balançam e que folhas soltam. Puro. O desenho é o
 * material `sway` (capim e flores) e `tree` (copas) de `three/chunkSprites.ts`; as folhas caindo, `three/treeLeaves.ts`.
 */
export type WindKind = 'grass' | 'tree';

/** Como o objeto reage ao vento (null = não se mexe). Árvores: qualquer objeto de forma `tree` (adultas das quatro espécies). */
export function windKind(id: BlockId): WindKind | null {
  if (id === Block.TALL_GRASS || id === Block.FLOWER || isFancyFlower(id)) return 'grass';
  return id !== Block.AIR && blockDef(id).shape === 'tree' ? 'tree' : null;
}

/** Capim e flores balançam e se curvam ao jogador (o material `sway`). */
export function swaysInWind(id: BlockId): boolean {
  return windKind(id) === 'grass';
}

/** Alcance (células da grade atual, ver `SUBDIV`) em que o jogador curva a vegetação ao passar. */
export const SWAY_PUSH_RADIUS = 1.1;

/** Folha que a copa solta: cores (0–1), chance por tentativa de emissão e tamanho relativo. */
export interface LeafStyle {
  colors: readonly [number, number, number][];
  /** 0..1: probabilidade de uma tentativa (a cada `LEAF_TRY_SECONDS`) sair desta árvore. */
  chance: number;
  size: number;
}

const OAK: LeafStyle = { colors: [[0.45, 0.68, 0.22], [0.58, 0.74, 0.25], [0.78, 0.7, 0.2]], chance: 0.55, size: 1 };
const BIRCH: LeafStyle = { colors: [[0.72, 0.8, 0.28], [0.85, 0.78, 0.22], [0.6, 0.76, 0.3]], chance: 0.6, size: 0.9 };
const APPLE: LeafStyle = { colors: [[0.38, 0.65, 0.2], [0.52, 0.72, 0.24]], chance: 0.45, size: 0.95 };
const SAKURA: LeafStyle = { colors: [[1, 0.72, 0.84], [0.98, 0.62, 0.78], [1, 0.84, 0.9]], chance: 1, size: 0.85 };

/** Folha da árvore `id` (null: não solta). */
export function leafStyleFor(id: BlockId): LeafStyle | null {
  switch (id) {
    case Block.OAK_TREE: return OAK;
    case Block.BIRCH_TREE: return BIRCH;
    case Block.APPLE_TREE:
    case Block.APPLE_TREE_BARE: return APPLE;
    case Block.SAKURA_TREE: return SAKURA;
    default: return null;
  }
}

/** De quanto em quanto tempo (s) a vizinhança da câmera tenta soltar uma folha. */
export const LEAF_TRY_SECONDS = 0.18;
