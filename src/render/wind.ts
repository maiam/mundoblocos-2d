import { Block, type BlockId } from '../world/blocks';

/**
 * Vento e passos na vegetação (v0.93.69): quais objetos balançam. Pura. O desenho é o material `sway` de `three/chunkSprites.ts`
 * (ondula com o tempo e se curva para longe do jogador que passa por perto).
 */
export function swaysInWind(id: BlockId): boolean {
  return id === Block.TALL_GRASS || id === Block.FLOWER;
}

/** Alcance (células da grade atual, ver `SUBDIV`) em que o jogador curva a vegetação ao passar. */
export const SWAY_PUSH_RADIUS = 1.1;
