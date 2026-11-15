import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { ChimneySmoke, chimneyWorldPos } from './chimneySmoke';
import { chimneyMouths } from '../townArt';
import { Block } from '../../world/blocks';

const VIEW = { x0: 0, y0: 0, x1: 20, y1: 20 };

describe('fumaça das chaminés da vila (v0.93.109)', () => {
  it('só as chaminés dentro da tela soltam fumaça; os puffs sobem, derivam e somem', () => {
    const scene = new THREE.Scene();
    const s = new ChimneySmoke(scene, 3);
    s.setChimneys([{ x: 5, y: 2, z: 6, phase: 0 }, { x: 500, y: 2, z: 600, phase: 0 }]);
    for (let i = 0; i < 40; i++) s.update(0.1, 32, VIEW, i * 0.1, 0); // 4 s
    expect(s.live).toBeGreaterThan(0);
    const pos = (scene.children[0] as THREE.Points).geometry.getAttribute('position') as THREE.BufferAttribute;
    let top = 0, xs = 0, n = 0;
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); if (y > 2.05) { top = Math.max(top, y); xs += pos.getX(i) - 5; n++; } }
    expect(top).toBeGreaterThan(2.5);          // subiu
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < pos.count; i++) expect(pos.getX(i) < 100).toBe(true); // a chaminé longe da tela nunca soltou
    for (let i = 0; i < 80; i++) s.update(0.1, 32, { x0: 900, y0: 900, x1: 920, y1: 920 }, 4 + i * 0.1, 0); // sai de cena: o resto termina a vida
    expect(s.live).toBe(0);
    s.dispose();
    expect(scene.children.length).toBe(0);
  });

  it('o pool tem teto e a posição 3D da boca segue a geometria do sprite', () => {
    const scene = new THREE.Scene();
    const s = new ChimneySmoke(scene, 1);
    s.setChimneys(Array.from({ length: 30 }, (_, i) => ({ x: i % 20, y: 2, z: 5, phase: i / 30 })));
    for (let i = 0; i < 100; i++) s.update(0.1, 32, VIEW, i * 0.1, 1);
    expect(s.live).toBeLessThanOrEqual(56);
    // sprite 200 px de imagem em 100 px de mundo, base na face sul da célula (z = 7 + 1), 64 px de altura: boca a (100, 16) da imagem = 50, 8 px do topo
    const p = chimneyWorldPos({ x: 4, y: 7 }, { ox: -20, oy: -63, w: 100, h: 64, imgW: 200 }, [100, 16], 1, 32);
    expect(p.x).toBeCloseTo(4 + (-20 + 50) / 32, 5);
    expect(p.y).toBeCloseTo((64 - 8) / 32, 5);
    expect(p.z).toBeCloseTo(7 + (-63 + 64) / 32 + 0.03, 5);
    // com a ampliação do 3D (grade fina) o desenho cresce em volta do meio da base
    const q = chimneyWorldPos({ x: 4, y: 7 }, { ox: -20, oy: -63, w: 100, h: 64, imgW: 200 }, [100, 16], 2, 32);
    expect(q.y).toBeCloseTo(2 * p.y, 5);
  });

  it('as 5 casas da vila têm a boca da chaminé medida; as outras peças não', () => {
    expect(chimneyMouths(Block.V_HOUSE_STRAW).every((m) => m !== null)).toBe(true);
    expect(chimneyMouths(Block.V_HOUSE_STRAW)).toHaveLength(3);
    expect(chimneyMouths(Block.V_HOUSE_TILE)).toHaveLength(2);
    expect(chimneyMouths(Block.V_BARN)).toEqual([null]);
  });
});
