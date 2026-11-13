import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { Chunk } from '../../world/chunk';
import { ChunkBlocks, type BlockWorld } from './chunkBlocks';

const STONE = 5, TREE = 99;

function setup(maxBuilds = 2) {
  const chunks = new Map<string, Chunk>();
  for (let cx = 0; cx < 3; cx++) chunks.set(cx + ',0', { cx, cy: 0, version: 1 } as Chunk);
  const cells = new Map<string, number>(); // "x,y,level" → id
  const world: BlockWorld = {
    getChunk: (cx, cy) => chunks.get(cx + ',' + cy),
    getLevel: (x, y, level) => cells.get(x + ',' + y + ',' + level) ?? 0,
  };
  const scene = new THREE.Scene();
  const blocks = new ChunkBlocks(scene, world, {
    isCube: (id) => id === STONE,
    classify: (_w, _id, x, y) => (x === 17 && y === 0 ? 'thin' : 'solid'),
    transform: (c) => ({ x: c.x + 0.5, y: c.level + 0.5, z: c.y + 0.5 }),
    material: () => [new THREE.MeshBasicMaterial()],
    maxBuildsPerFrame: maxBuilds,
  });
  return { chunks, cells, scene, blocks };
}

describe('ChunkBlocks (cubos do Mundo no 3D)', () => {
  it('só desenha cubos, uma malha por (bloco, forma), com as células para o pick', () => {
    const { cells, blocks, scene } = setup();
    cells.set('1,1,0', STONE); cells.set('1,1,1', STONE); cells.set('2,2,0', STONE);
    cells.set('3,3,0', TREE); // objeto alto: não é cubo
    cells.set('17,0,0', STONE); // chunk 1, forma fina
    blocks.update({ cx0: 0, cy0: 0, cx1: 1, cy1: 0 });
    const meshes = blocks.meshes();
    expect(meshes).toHaveLength(2); // solid (chunk 0) + thin (chunk 1)
    const solid = meshes.find((m) => (m.userData.cells as unknown[]).length === 3)!;
    expect(solid.count).toBe(3);
    expect(blocks.cellOf(solid, 0)).toEqual({ x: 1, y: 1, level: 0, id: STONE });
    expect(blocks.cellOf(solid, 99)).toBeUndefined();
    expect(scene.children).toHaveLength(2);
  });

  it('reconstrói só quando a version muda e respeita o orçamento por quadro', () => {
    const { cells, chunks, blocks } = setup(1);
    cells.set('1,1,0', STONE); cells.set('17,1,0', STONE); cells.set('33,1,0', STONE);
    const rect = { cx0: 0, cy0: 0, cx1: 2, cy1: 0 };
    blocks.update(rect);
    expect(blocks.meshes()).toHaveLength(1); // 1 chunk por quadro
    blocks.update(rect); blocks.update(rect);
    expect(blocks.meshes()).toHaveLength(3);
    const before = blocks.meshes()[0];
    blocks.update(rect);
    expect(blocks.meshes()[0]).toBe(before); // nada mudou: mesma malha
    cells.set('2,2,0', STONE); chunks.get('0,0')!.version++;
    blocks.update(rect);
    expect(blocks.meshes().some((m) => (m.userData.cells as unknown[]).length === 2)).toBe(true);
  });

  it('chunks fora da área somem; dispose limpa a cena', () => {
    const { cells, blocks, scene } = setup(9);
    cells.set('1,1,0', STONE); cells.set('33,1,0', STONE);
    blocks.update({ cx0: 0, cy0: 0, cx1: 2, cy1: 0 });
    expect(blocks.count).toBe(3);
    blocks.update({ cx0: 2, cy0: 0, cx1: 2, cy1: 0 });
    expect(blocks.count).toBe(1);
    expect(scene.children).toHaveLength(1);
    blocks.dispose();
    expect(scene.children).toHaveLength(0);
  });
});
