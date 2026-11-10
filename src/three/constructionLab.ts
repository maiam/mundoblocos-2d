import { Block, type BlockId } from '../world/blocks';
import { MAX_STACK } from '../config';
import type { World } from '../world/world';

export interface LabCell { x: number; y: number; height: 1 | 2 | 3; section: 'pilhas' | 'parede' | 'plataforma5' | 'plataforma10' }
export const LAB_WIDTH = 28;
export const LAB_DEPTH = 11;

/**
 * Layout repetível e totalmente isolado para testar altura, plataforma e oclusão.
 * A origem deve ficar dentro dos limites do Santuário.
 */
export function constructionLabPlan(x0: number, y0: number): LabCell[] {
  const cells: LabCell[] = [];
  const add = (x: number, y: number, height: 1 | 2 | 3, section: LabCell['section']) =>
    cells.push({ x: x0 + x, y: y0 + y, height, section });
  add(1, 1, 1, 'pilhas');
  add(4, 1, 2, 'pilhas');
  add(7, 1, 3, 'pilhas');
  // Parede 2 níveis, com uma abertura central para ver o personagem.
  for (let x = 0; x < 9; x++) if (x !== 4) add(x, 5, 2, 'parede');
  // Plataformas separadas: 5×5 com 2 níveis e 10×10 com 1 nível.
  for (let y = 1; y <= 5; y++) for (let x = 11; x <= 15; x++) add(x, y, 2, 'plataforma5');
  for (let y = 1; y <= 10; y++) for (let x = 18; x <= 27; x++) add(x, y, 1, 'plataforma10');
  return cells;
}

export interface LabBuildResult { placed: number; failed: number; cells: number; blocks: number }

/**
 * Restores only this transient demo footprint. Does not break the ground layer
 * or write to the player's normal persisted world.
 */
export function resetAndBuildLab(world: World, cells: readonly LabCell[], id: BlockId = Block.CLOUD_SOLID): LabBuildResult {
  let placed = 0, failed = 0;
  for (const cell of cells) {
    if (!world.inBounds(cell.x, cell.y)) { failed += cell.height; continue; }
    // Only object levels, never excavate the ground by mistake.
    let attempts = 0;
    while (world.topBlock(cell.x, cell.y) !== null && attempts < MAX_STACK) {
      if (world.breakBlock(cell.x, cell.y) === null) break;
      attempts++;
    }
    for (let i = 0; i < cell.height; i++) {
      if (world.placeBlock(cell.x, cell.y, id)) placed++;
      else failed++;
    }
  }
  return { placed, failed, cells: cells.length, blocks: cells.reduce((n, cell) => n + cell.height, 0) };
}

/** Only draw debug wireframes around actual elevated block objects. */
export function labWireframePositions(world: World, cells: readonly LabCell[]): number[] {
  const positions: number[] = [];
  const edge = (a: number[], b: number[]) => positions.push(...a, ...b);
  for (const cell of cells) {
    const { x, y } = cell;
    for (let level = 0; level < MAX_STACK; level++) {
      if (world.getLevel(x, y, level) === Block.AIR) continue;
      const lower = [
        [x, level, y], [x + 1, level, y], [x + 1, level, y + 1], [x, level, y + 1],
      ];
      const upper = lower.map(([px, , pz]) => [px, level + 1, pz]);
      for (let k = 0; k < 4; k++) {
        edge(lower[k], lower[(k + 1) % 4]);
        edge(upper[k], upper[(k + 1) % 4]);
        edge(lower[k], upper[k]);
      }
    }
  }
  return positions;
}
