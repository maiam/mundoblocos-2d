import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Block } from '../../world/blocks';
import { leafStyleFor } from '../wind';
import type { SpriteCell } from './chunkSprites';
import { TreeLeaves } from './treeLeaves';

const sprite = { canvas: {} as HTMLCanvasElement, ox: -16, oy: -64, w: 64, h: 96, hit: { x: 0, y: 0, w: 1, h: 1 } };
const cell = (id: number, x = 4, y = 4): SpriteCell => ({ x, y, id, sprite });

describe('TreeLeaves (folhas e pétalas caindo das copas)', () => {
  it('só as espécies com folha soltam; a cerejeira sempre tenta, o carvalho às vezes', () => {
    expect(leafStyleFor(Block.SAKURA_TREE)!.chance).toBe(1);
    expect(leafStyleFor(Block.OAK_TREE)!.chance).toBeLessThan(1);
    expect(leafStyleFor(Block.STONE)).toBeNull();
  });

  it('solta dentro da copa, cai até o chão e some; o pool não cresce nem atropela folha viva', () => {
    const scene = new THREE.Scene();
    const leaves = new TreeLeaves(scene, 32, 1);
    expect(leaves.emit(cell(Block.STONE))).toBe(false);
    expect(leaves.emit(cell(Block.SAKURA_TREE))).toBe(true);
    const [x, y, z] = leaves.livePositions()[0];
    expect(x).toBeGreaterThanOrEqual(2); // dentro da largura do desenho (64 px = 2 células a partir de x - 0,5)
    expect(x).toBeLessThanOrEqual(6.5);
    expect(y).toBeGreaterThan(0.5); // na copa, acima do chão
    expect(z).toBeGreaterThan(4);
    for (let i = 0; i < 200; i++) leaves.update(0.05, 30, null); // 10 s sem novas
    expect(leaves.live).toBe(0);
    for (let i = 0; i < 500; i++) leaves.emit(cell(Block.SAKURA_TREE));
    expect(leaves.live).toBeLessThanOrEqual(48);
    leaves.clear();
    expect(leaves.live).toBe(0);
    leaves.dispose();
    expect(scene.children).toHaveLength(0);
  });

  it('com árvores por perto, update solta folhas ao longo do tempo (determinístico)', () => {
    const run = () => {
      const leaves = new TreeLeaves(new THREE.Scene(), 32, 1);
      for (let i = 0; i < 60; i++) leaves.update(0.1, 30, [cell(Block.SAKURA_TREE)]);
      return leaves.livePositions().length;
    };
    expect(run()).toBeGreaterThan(0);
    expect(run()).toBe(run());
  });

  it('avisa onde cada folha pousa (onda na água)', () => {
    const leaves = new TreeLeaves(new THREE.Scene(), 32, 1);
    const landed: number[][] = [];
    leaves.onLand = (x, z) => landed.push([x, z]);
    leaves.emit(cell(Block.SAKURA_TREE));
    for (let i = 0; i < 200; i++) leaves.update(0.05, 30, null);
    expect(landed).toHaveLength(1);
    expect(landed[0][1]).toBeGreaterThan(4); // z da árvore em diante
  });
});
