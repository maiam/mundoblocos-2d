import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import model from '../../assets/iso-cauldron.json';
import { Block, type BlockId } from '../../world/blocks';
import { Chunk } from '../../world/chunk';
import { IsoCauldrons } from './isoCauldrons';

function worldWith(cells: Record<string, BlockId>): { world: ConstructorParameters<typeof IsoCauldrons>[1]; chunk: Chunk } {
  const chunk = new Chunk(0, 0, 5);
  const world = { getChunk: (cx: number, cy: number) => (cx === 0 && cy === 0 ? chunk : undefined), getLevel: (x: number, y: number, l: number) => (cells[`${x},${y},${l}`] ?? Block.AIR) as BlockId };
  return { world, chunk };
}
const rect = { cx0: 0, cy0: 0, cx1: 0, cy1: 0 };

describe('Caldeirão 3D do Santuário', () => {
  it('a malha extraída é fechada em índices válidos, com base em 0 e cabe na célula', () => {
    const n = model.positions.length / 3;
    expect(model.indices.length / 3).toBe(5514); // 2757 quadriláteros
    expect(Math.max(...model.indices)).toBeLessThan(n);
    const xs = model.positions.filter((_, i) => i % 3 === 0), ys = model.positions.filter((_, i) => i % 3 === 1);
    expect(Math.min(...ys)).toBeCloseTo(0, 3);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(1.1);
    expect(Math.max(...ys)).toBeLessThan(0.8);
  });

  it('desenha um caldeirão por célula, no nível em que está, e acompanha a edição do chunk', () => {
    const cells: Record<string, BlockId> = { '3,4,2': Block.CAULDRON, '5,5,0': Block.CAULDRON, '6,6,1': Block.CHEST };
    const { world, chunk } = worldWith(cells);
    const scene = new THREE.Group();
    const c = new IsoCauldrons(scene, world, model, () => undefined);
    c.update(rect);
    expect(c.count).toBe(2);
    const m = c.meshes().find((o) => o.userData.cell.x === 3)!;
    expect(m.position.toArray()).toEqual([3.5, 2, 4.5]);
    expect(c.cellOf(m)).toEqual({ x: 3, y: 4 });
    expect(scene.children).toHaveLength(2);
    delete cells['3,4,2'];
    chunk.setLevel(3, 4, 2, Block.AIR); // muda a versão do chunk
    c.update(rect);
    expect(c.count).toBe(1);
    expect(scene.children).toHaveLength(1);
    c.dispose();
    expect(scene.children).toHaveLength(0);
  });
});
