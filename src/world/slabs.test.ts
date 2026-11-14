import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { slabGeometry } from '../render/three/chunkBlocks';
import { sanctuaryBlockTransform } from '../render/sanctuaryThreeLayout';
import { Player } from '../game/player';
import { Block } from './blocks';
import { SLAB_HEIGHT, slabIdsFromSearch } from './slabs';
import { World } from './world';

describe('Lajes (piloto ?tabua=laje, v0.93.72)', () => {
  it('só com ?tabua=laje a Tábua de Carvalho vira laje', () => {
    expect(slabIdsFromSearch('')).toEqual([]);
    expect(slabIdsFromSearch('?tabua=cubo')).toEqual([]);
    expect(slabIdsFromSearch('?tabua=laje')).toEqual([Block.OAK_PLANKS]);
  });

  it('a laje é andável (nível do chão), o corpo sobe 1/4 de célula por cima dela e nada muda sem o piloto', () => {
    const w = new World(42);
    const [gx, gy] = w.outsideGate();
    const x = gx + 6, y = gy - 3;
    expect(w.placeBlock(x, y, Block.OAK_PLANKS)).toBe(true);
    // Sem o piloto: cubo comum (bloqueia, nível 1), sem elevação.
    expect(w.standHeight(x, y)).toBe(1);
    expect(w.slabLift(x, y)).toBe(0);
    expect(w.hasSlabs).toBe(false);
    // Com o piloto: andável no nível 0, elevação de SLAB_HEIGHT.
    w.setSlabBlocks([Block.OAK_PLANKS]);
    expect(w.hasSlabs).toBe(true);
    expect(w.isSlabAt(x, y)).toBe(true);
    expect(w.standHeight(x, y)).toBe(0);
    expect(w.isWalkable(x, y)).toBe(true);
    expect(w.slabLift(x, y)).toBe(SLAB_HEIGHT);
    // Outro bloco continua cubo; um segundo cubo em cima desfaz a laje (vira pilha de 2).
    expect(w.slabLift(x + 1, y)).toBe(0);
    expect(w.placeBlock(x, y, Block.OAK_PLANKS)).toBe(true);
    expect(w.isSlabAt(x, y)).toBe(false);
    expect(w.standHeight(x, y)).toBe(2);
    w.setSlabBlocks([]);
    expect(w.isSlabAt(x, y)).toBe(false);
  });

  it('o personagem anda por cima da laje e o `visualZ` sobe a SLAB_HEIGHT sem mudar o nível lógico; ao sair volta a 0', () => {
    const w = new World(42);
    const [gx, gy] = w.outsideGate();
    const y = gy - 3;
    for (let x = gx + 4; x <= gx + 8; x++) w.placeBlock(x, y, Block.OAK_PLANKS);
    w.setSlabBlocks([Block.OAK_PLANKS]);
    const p = new Player(gx + 2.5, y + 0.5);
    for (let i = 0; i < 40; i++) p.update(0.016, 1, 0, w); // anda para leste até subir na laje
    expect(p.x).toBeGreaterThan(gx + 4);
    expect(p.z).toBe(0);
    expect(p.lift).toBe(SLAB_HEIGHT);
    for (let i = 0; i < 40; i++) p.update(0.016, 0, 0, w);
    expect(p.visualZ).toBeCloseTo(SLAB_HEIGHT, 2);
    for (let i = 0; i < 400; i++) p.update(0.016, 1, 0, w); // atravessa e sai do outro lado
    expect(p.x).toBeGreaterThan(gx + 9);
    for (let i = 0; i < 40; i++) p.update(0.016, 0, 0, w);
    expect(p.lift).toBe(0);
    expect(p.visualZ).toBeCloseTo(0, 2);
  });

  it('geometria da laje: caixa 1 × 1/4 × 1 e as faces laterais recortam o quarto de cima da imagem (16 × 4), sem esticar', () => {
    const g = slabGeometry();
    g.computeBoundingBox();
    const size = g.boundingBox!.getSize(new THREE.Vector3());
    expect([size.x, size.y, size.z]).toEqual([1, SLAB_HEIGHT, 1]);
    const uv = g.getAttribute('uv') as THREE.BufferAttribute;
    for (const face of [0, 1, 4, 5]) {
      for (let i = face * 4; i < face * 4 + 4; i++) {
        expect(uv.getY(i)).toBeGreaterThanOrEqual(1 - SLAB_HEIGHT - 1e-6);
        expect(uv.getY(i)).toBeLessThanOrEqual(1 + 1e-6);
      }
    }
    // O topo (face 2) mantém a imagem inteira.
    const topV = [8, 9, 10, 11].map((i) => uv.getY(i));
    expect(Math.min(...topV)).toBeCloseTo(0);
    expect(Math.max(...topV)).toBeCloseTo(1);
    // 16 px de largura para 4 de altura: a proporção do recorte é a da face.
    expect(1 / SLAB_HEIGHT).toBe(4);
  });

  it('a laje assenta no nível e fica com o centro 1/8 acima dele', () => {
    const t = sanctuaryBlockTransform({ x: 3, y: 5, level: 0, shape: 'slab' });
    expect(t).toMatchObject({ x: 3.5, z: 5.5, height: SLAB_HEIGHT, depth: 1 });
    expect(t.y).toBeCloseTo(SLAB_HEIGHT / 2);
  });
});
