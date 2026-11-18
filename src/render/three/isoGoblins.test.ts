import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import model from '../../assets/iso-goblin.json';
import { Block, type BlockId } from '../../world/blocks';
import { Chunk } from '../../world/chunk';
import { GOBLIN_HEIGHT, IsoGoblins } from './isoGoblins';

const art = { model, image: { width: 4, height: 4 } as unknown as HTMLImageElement };
function worldWith(cells: Record<string, BlockId>): { world: ConstructorParameters<typeof IsoGoblins>[1]; chunk: Chunk } {
  const chunk = new Chunk(0, 0, 8);
  const world = { getChunk: (cx: number, cy: number) => (cx === 0 && cy === 0 ? chunk : undefined), getLevel: (x: number, y: number, l: number) => (cells[`${x},${y},${l}`] ?? Block.AIR) as BlockId };
  return { world, chunk };
}
const rect = { cx0: 0, cy0: 0, cx1: 0, cy1: 0 };

describe('Goblin 3D do Vale', () => {
  it('a malha extraída tem altura 1, pés em 0, UV em [0, 1] e índices válidos', () => {
    const n = model.positions.length / 3;
    expect(model.normals.length).toBe(model.positions.length);
    expect(model.uvs.length / 2).toBe(n);
    expect(model.indices.length / 3).toBe(3000);
    expect(Math.max(...model.indices)).toBeLessThan(n);
    const ys = model.positions.filter((_, i) => i % 3 === 1);
    expect(Math.min(...ys)).toBeCloseTo(0, 3);
    expect(Math.max(...ys)).toBeCloseTo(1, 3);
    expect(Math.min(...model.uvs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...model.uvs)).toBeLessThanOrEqual(1);
  });

  it('um goblin por célula, no nível dele e na escala certa; olha para a fogueira mais próxima', () => {
    const cells: Record<string, BlockId> = { '3,4,2': Block.ISO_GOBLIN, '8,4,2': Block.CAMPFIRE, '9,9,0': Block.ISO_GOBLIN };
    const { world } = worldWith(cells);
    const scene = new THREE.Group();
    const g = new IsoGoblins(scene, world, art);
    g.update(rect);
    expect(g.count).toBe(2);
    const m = g.meshes().find((o) => o.userData.cell.x === 3)!;
    expect(m.position.toArray()).toEqual([3.5, 2, 4.5]);
    expect(m.scale.x).toBeCloseTo(GOBLIN_HEIGHT, 5);
    expect(m.rotation.y).toBeCloseTo(Math.PI / 2, 5); // a fogueira está a leste (+x): a frente (+z) gira 90°
    expect(g.cellOf(m)).toEqual({ x: 3, y: 4 });
    g.dispose();
    expect(scene.children).toHaveLength(0);
  });
});
