import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { slabGeometry } from '../render/three/chunkBlocks';
import { sanctuaryBlockTransform } from '../render/sanctuaryThreeLayout';
import { Player } from '../game/player';
import { Block, blockDef, SLAB_BLOCKS } from './blocks';
import { blockStack, RECIPES } from './items';
import { SLABS, slabBaseOf, slabHeightOf, slabIdsFromSearch } from './slabs';
import { World } from './world';

describe('Lajes de Carvalho 1, 2 e 3 (piloto ?tabua=laje, v0.93.73)', () => {
  it('três blocos com face de 4, 6 e 8 px (1/4, 3/8 e 1/2 de célula de 16 px) e topo cheio', () => {
    expect(SLABS.map((s) => s.facepx)).toEqual([4, 6, 8]);
    expect(SLABS.map((s) => s.height)).toEqual([0.25, 0.375, 0.5]);
    expect(SLABS.map((s) => s.recipe)).toEqual(['laje1', 'laje2', 'laje3']);
    expect(SLAB_BLOCKS).toEqual([Block.OAK_SLAB_1, Block.OAK_SLAB_2, Block.OAK_SLAB_3]);
    expect(new Set(SLAB_BLOCKS).size).toBe(3);
    for (const id of SLAB_BLOCKS) { expect(id).toBeLessThanOrEqual(255); expect(blockDef(id).shape).toBe('cube'); expect(slabBaseOf(id)).toBe(Block.OAK_PLANKS); }
    expect(slabHeightOf(Block.OAK_PLANKS)).toBe(0);
  });

  it('só com ?tabua=laje as três viram laje; as receitas laje1, laje2 e laje3 existem como do piloto', () => {
    expect(slabIdsFromSearch('')).toEqual([]);
    expect(slabIdsFromSearch('?tabua=cubo')).toEqual([]);
    expect(slabIdsFromSearch('?tabua=laje')).toEqual(SLAB_BLOCKS);
    for (const s of SLABS) {
      const r = RECIPES.find((x) => x.id === s.recipe)!;
      expect(r.pilot).toBe('laje');
      expect(r.output.item).toBe(blockStack(s.id));
      expect(r.inputs).toEqual([{ item: blockStack(Block.OAK_PLANKS), count: 1 }]);
    }
    // A Tábua comum segue cubo (o piloto não a muda mais).
    expect(RECIPES.filter((r) => r.pilot).length).toBe(3);
  });

  it('cada laje é andável (nível do chão) e sobe o corpo a sua altura; sem o piloto é cubo comum', () => {
    const w = new World(42);
    const [gx, gy] = w.outsideGate();
    for (const [i, s] of SLABS.entries()) {
      const x = gx + 6 + i * 2, y = gy - 3;
      // Sem o piloto: o bloco não se coloca (não está no perfil do Mundo) e, se vier num save, é um cubo cheio.
      expect(w.placeBlock(x, y, s.id)).toBe(false);
      w.setSlabBlocks(SLAB_BLOCKS);
      expect(w.placeBlock(x, y, s.id)).toBe(true);
      expect(w.isSlabAt(x, y)).toBe(true);
      expect(w.standHeight(x, y)).toBe(0);
      expect(w.isWalkable(x, y)).toBe(true);
      expect(w.slabLift(x, y)).toBe(s.height);
      w.setSlabBlocks([]);
      expect(w.isSlabAt(x, y)).toBe(false);
      expect(w.standHeight(x, y)).toBe(1); // cubo comum
      expect(w.slabLift(x, y)).toBe(0);
    }
  });

  it('lajes não empilham: nada se põe em cima de uma laje e a laje não vai em cima de cubo; a Tábua comum continua cubo', () => {
    const w = new World(42);
    w.setSlabBlocks(SLAB_BLOCKS);
    const [gx, gy] = w.outsideGate();
    const x = gx + 6, y = gy - 3;
    expect(w.placeBlock(x, y, Block.OAK_SLAB_2)).toBe(true);
    expect(w.placeBlock(x, y, Block.OAK_SLAB_1)).toBe(false);
    expect(w.placeBlock(x, y, Block.OAK_PLANKS)).toBe(false);
    expect(w.placeBlock(x + 1, y, Block.OAK_PLANKS)).toBe(true);
    expect(w.standHeight(x + 1, y)).toBe(1); // a Tábua comum bloqueia como cubo
    expect(w.placeBlock(x + 1, y, Block.OAK_SLAB_3)).toBe(false); // laje em cima de cubo: não
    expect(w.breakBlock(x, y)).toBe(Block.OAK_SLAB_2);
  });

  it('o personagem sobe a altura da laje em que pisa (visual) e volta ao sair', () => {
    const w = new World(42);
    w.setSlabBlocks(SLAB_BLOCKS);
    const [gx, gy] = w.outsideGate();
    const y = gy - 3;
    w.placeBlock(gx + 4, y, Block.OAK_SLAB_1);
    w.placeBlock(gx + 5, y, Block.OAK_SLAB_3);
    const p = new Player(gx + 2.5, y + 0.5);
    const seen = new Set<number>();
    for (let i = 0; i < 300; i++) { p.update(0.016, 1, 0, w); seen.add(Math.round(p.lift * 1000)); }
    expect(p.z).toBe(0);
    expect(seen.has(250)).toBe(true); // passou pela laje 1 (1/4)
    expect(seen.has(500)).toBe(true); // e pela laje 3 (1/2)
    for (let i = 0; i < 60; i++) p.update(0.016, 0, 0, w);
    expect(p.lift).toBe(0);
    expect(p.visualZ).toBeCloseTo(0, 2);
  });

  it('geometria: caixa 1 × altura × 1 e as faces laterais recortam a faixa de cima da imagem (sem esticar)', () => {
    for (const s of SLABS) {
      const g = slabGeometry(s.height);
      g.computeBoundingBox();
      const size = g.boundingBox!.getSize(new THREE.Vector3());
      expect([size.x, size.y, size.z]).toEqual([1, s.height, 1]);
      const uv = g.getAttribute('uv') as THREE.BufferAttribute;
      for (const face of [0, 1, 4, 5]) for (let i = face * 4; i < face * 4 + 4; i++) {
        expect(uv.getY(i)).toBeGreaterThanOrEqual(1 - s.height - 1e-6);
        expect(uv.getY(i)).toBeLessThanOrEqual(1 + 1e-6);
      }
      const topV = [8, 9, 10, 11].map((i) => uv.getY(i)); // topo: imagem inteira
      expect(Math.min(...topV)).toBeCloseTo(0);
      expect(Math.max(...topV)).toBeCloseTo(1);
      const t = sanctuaryBlockTransform({ x: 3, y: 5, level: 0, shape: 'slab', slabHeight: s.height });
      expect(t).toMatchObject({ x: 3.5, z: 5.5, height: s.height, depth: 1 });
      expect(t.y).toBeCloseTo(s.height / 2);
    }
  });
});
