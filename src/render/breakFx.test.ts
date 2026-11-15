import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Block } from '../world/blocks';
import { breakShake, chipColor, chipsPerBurst, CRACK_STAGES, crackStage } from './breakFx';
import { BreakChips } from './three/breakChips';
import { ChunkBlocks } from './three/chunkBlocks';
import type { Chunk } from '../world/chunk';

describe('breakFx (quebra de blocos)', () => {
  it('as lascas têm a cor do material; flores e capim não soltam', () => {
    const stone = chipColor(Block.STONE)!, sand = chipColor(Block.SAND)!;
    expect(stone).not.toBeNull();
    expect(sand[0]).toBeGreaterThan(stone[0]); // areia mais clara/quente que a pedra
    expect(chipColor(Block.OAK_PLANKS)).not.toBeNull();
    expect(chipColor(Block.FLOWER)).toBeNull();
    expect(chipColor(Block.TALL_GRASS)).toBeNull();
  });

  it('mais lascas e mais tremor quanto mais perto de quebrar', () => {
    expect(chipsPerBurst(1)).toBeGreaterThan(chipsPerBurst(0));
    const amp = (p: number) => { let m = 0; for (let t = 0; t < 2; t += 0.003) { const s = breakShake(t, p); m = Math.max(m, Math.abs(s.dx), Math.abs(s.dz)); } return m; };
    expect(amp(1)).toBeGreaterThan(amp(0) * 2);
    expect(amp(1)).toBeLessThan(0.05); // nunca sai da célula
  });

  it('BreakChips: solta, cai, quica e some; pool com limite; limpa e libera', () => {
    const scene = new THREE.Scene();
    const c = new BreakChips(scene, 1);
    c.emit(3.5, 1, 4.5, [0.5, 0.5, 0.5], 10);
    expect(c.live).toBe(10);
    for (let i = 0; i < 20; i++) c.update(0.05, 30);
    expect(c.live).toBeGreaterThan(0);
    for (let i = 0; i < 60; i++) c.update(0.05, 30);
    expect(c.live).toBe(0);
    for (let i = 0; i < 20; i++) c.emit(0, 0, 0, [1, 1, 1], 16);
    expect(c.live).toBeLessThanOrEqual(96);
    c.clear();
    expect(c.live).toBe(0);
    c.dispose();
    expect(scene.children).toHaveLength(0);
  });

  it('ChunkBlocks.setShake desloca só o bloco mais alto da célula e o devolve ao lugar', () => {
    const chunks = new Map<string, Chunk>([['0,0', { cx: 0, cy: 0, version: 1, levels: [] } as unknown as Chunk]]);
    const cells = new Map<string, number>([['1,1,0', 5], ['2,2,0', 5]]);
    const world = { getChunk: (cx: number, cy: number) => chunks.get(cx + ',' + cy), getLevel: (x: number, y: number, l: number) => cells.get(`${x},${y},${l}`) ?? 0 };
    const scene = new THREE.Scene();
    const blocks = new ChunkBlocks(scene, world, {
      isCube: (id) => id === 5, classify: () => 'solid', material: () => [new THREE.MeshBasicMaterial()], transform: (c) => ({ x: c.x + 0.5, y: 0.5, z: c.y + 0.5 }),
    });
    blocks.update({ cx0: 0, cy0: 0, cx1: 0, cy1: 0 });
    const mesh = blocks.meshes()[0];
    const at = (i: number) => { const m = new THREE.Matrix4(); mesh.getMatrixAt(i, m); return [m.elements[12], m.elements[13], m.elements[14]]; };
    const before = [at(0), at(1)];
    expect(blocks.setShake({ x: 1, y: 1 }, { dx: 0.02, dy: 0.01, dz: -0.02 })).toBe(true);
    const moved = [at(0), at(1)];
    const diff = moved.map((p, i) => p.some((v, k) => Math.abs(v - before[i][k]) > 1e-9));
    expect(diff.filter(Boolean)).toHaveLength(1); // só uma instância mexeu
    expect(blocks.setShake(null)).toBe(false);
    expect([at(0), at(1)]).toEqual(before);
    expect(blocks.setShake({ x: 9, y: 9 })).toBe(false); // célula sem bloco
  });
});

describe('rachaduras em estágios', () => {
  it('sem rachadura no começo, cresce com o progresso até o último estágio', () => {
    expect(crackStage(0)).toBe(0);
    expect(crackStage(0.05)).toBe(0);
    const stages = [0.1, 0.3, 0.55, 0.8, 1].map(crackStage);
    expect(stages[0]).toBe(1);
    expect(stages[stages.length - 1]).toBe(CRACK_STAGES);
    for (let i = 1; i < stages.length; i++) expect(stages[i]).toBeGreaterThanOrEqual(stages[i - 1]);
    expect(crackStage(5)).toBe(CRACK_STAGES);
  });
});
