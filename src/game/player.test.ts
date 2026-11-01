import { describe, expect, it } from 'vitest';
import { Block } from '../world/blocks';
import { World } from '../world/world';
import { Player } from './player';

describe('Player', () => {
  it('anda nas direções da tela e vira o sprite pelo eixo dominante', () => {
    const w = new World(7);
    const [sx, sy] = w.findSpawn();
    const p = new Player(sx + 0.5, sy + 0.5);
    p.update(0.05, 1, 0, w);
    expect(p.x).toBeGreaterThan(sx + 0.5);
    expect(p.facing).toBe('right');
    p.update(0.05, 0, -1, w);
    expect(p.facing).toBe('up');
    p.update(0.05, 0, 0, w);
    expect(p.moving).toBe(false);
  });

  it('não atravessa blocos sólidos', () => {
    const w = new World(7);
    const [sx, sy] = w.findSpawn();
    w.placeBlock(sx + 1, sy, Block.STONE);
    const p = new Player(sx + 0.5, sy + 0.5);
    for (let i = 0; i < 60; i++) p.update(1 / 60, 1, 0, w);
    expect(p.x).toBeLessThan(sx + 1);
    expect(p.occupies(sx, sy)).toBe(true);
  });
});
