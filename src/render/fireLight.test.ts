import { describe, expect, it } from 'vitest';
import { Block } from '../world/blocks';
import { FIRE_RADIUS, findFires, fireLightOn, type FireSource } from './fireLight';

const fire = (x: number, z: number): FireSource => ({ x, z, height: 0.9, radius: FIRE_RADIUS, seed: 1 });

describe('Fogueira viva (v0.93.67)', () => {
  it('findFires acha só fogueiras na área e devolve as mais perto do foco primeiro, no máximo `max`', () => {
    const at = new Map<string, number>([['3,3', Block.CAMPFIRE], ['10,2', Block.CAMPFIRE], ['5,5', Block.CHEST], ['40,40', Block.CAMPFIRE]]);
    const objectAt = (x: number, y: number) => (at.get(`${x},${y}`) ?? Block.AIR) as never;
    const fires = findFires({ x0: 0, y0: 0, x1: 20, y1: 20 }, objectAt, { x: 9, z: 3 });
    expect(fires).toHaveLength(2);
    expect(fires[0].x).toBe(10.5); // a de (10,2) está mais perto de (9,3)
    expect(fires[1].x).toBe(3.5);
    expect(findFires({ x0: 0, y0: 0, x1: 20, y1: 20 }, objectAt, { x: 9, z: 3 }, 1)).toHaveLength(1);
    expect(fires[0].z).toBe(3); // na face sul da célula (y + 1)
  });

  it('a luz sobre o ator cai com a distância e some fora do alcance', () => {
    const f = fire(10, 10);
    const near = fireLightOn(10, 9, [f], 0).intensity;
    const mid = fireLightOn(10 + FIRE_RADIUS * 0.5, 10, [f], 0).intensity;
    const far = fireLightOn(10 + FIRE_RADIUS + 1, 10, [f], 0).intensity;
    expect(near).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(0);
    expect(far).toBe(0);
    expect(fireLightOn(10, 9, [], 0).intensity).toBe(0);
  });

  it('a luz vem do lado da fogueira: ator a oeste recebe luz de leste; ator ao norte, de frente (sul = para a câmera)', () => {
    const f = fire(10, 10);
    expect(fireLightOn(8, 10, [f], 0).dir[0]).toBeGreaterThan(0.5); // fogueira a leste do ator
    expect(fireLightOn(12, 10, [f], 0).dir[0]).toBeLessThan(-0.5);
    expect(fireLightOn(10, 8, [f], 0).dir[2]).toBeGreaterThan(0.5); // fogueira ao sul do ator: para a câmera
    const d = fireLightOn(8, 10, [f], 0).dir;
    expect(Math.hypot(...d)).toBeCloseTo(1, 5);
  });

  it('o fogo oscila no tempo (a intensidade muda de um instante para outro) sem passar de 1', () => {
    const f = fire(10, 10);
    const v = [0, 0.1, 0.2, 0.3, 0.4].map((t) => fireLightOn(10, 9, [f], t).intensity);
    expect(new Set(v.map((x) => x.toFixed(4))).size).toBeGreaterThan(1);
    for (const x of v) expect(x).toBeLessThanOrEqual(1);
  });
});
