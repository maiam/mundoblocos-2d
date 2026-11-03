import { describe, expect, it } from 'vitest';
import { Block } from '../world/blocks';
import { mulberry32 } from '../world/random';
import { World } from '../world/world';
import { Entities } from './entities';
import { Player } from './player';
import { Sheep } from './sheep';

function run(n: number, fn: () => void) {
  for (let i = 0; i < n; i++) fn();
}

describe('Sheep', () => {
  it('alterna entre parar e passear, sem sair do mapa andável', () => {
    const w = new World(7);
    const [sx, sy] = w.outsideGate();
    const s = new Sheep(sx + 0.5, sy + 0.5, sx + 0.5, sy + 0.5, mulberry32(1));
    let movedFrames = 0, idleFrames = 0;
    run(60 * 40, () => {
      s.update(1 / 60, w);
      if (s.moving) movedFrames++; else idleFrames++;
      expect(w.standHeight(s.cellX, s.cellY)).not.toBeNull();
    });
    expect(movedFrames).toBeGreaterThan(60);
    expect(idleFrames).toBeGreaterThan(60);
  });

  it('volta para perto de casa', () => {
    const w = new World(7);
    const [sx, sy] = w.outsideGate();
    const s = new Sheep(sx + 0.5, sy + 0.5, sx + 0.5, sy + 0.5, mulberry32(2));
    let maxDist = 0;
    run(60 * 120, () => {
      s.update(1 / 60, w);
      maxDist = Math.max(maxDist, Math.hypot(s.x - s.homeX, s.y - s.homeY));
    });
    expect(maxDist).toBeLessThan(14);
  });

  it('não sobe em cubos: blocos funcionam como cerca', () => {
    const w = new World(7);
    const [sx, sy] = w.outsideGate();
    // Cerca 3×3 em volta da célula da ovelha.
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        while (w.topBlock(sx + dx, sy + dy)) w.breakBlock(sx + dx, sy + dy);
        if (w.isGroundStandable(sx + dx, sy + dy)) w.placeBlock(sx + dx, sy + dy, Block.STONE);
      }
    }
    const s = new Sheep(sx + 0.5, sy + 0.5, sx + 0.5, sy + 0.5, mulberry32(3));
    run(60 * 30, () => s.update(1 / 60, w));
    expect(s.cellX).toBe(sx);
    expect(s.cellY).toBe(sy);
    expect(s.z).toBe(0);
  });
});

describe('Entities', () => {
  it('rebanho nasce em grama andável perto do spawn', () => {
    const w = new World(42);
    const [sx, sy] = w.outsideGate();
    const e = new Entities(new Player(sx + 0.5, sy + 0.6));
    e.spawnFlock(w, sx, sy);
    expect(e.npcs.length).toBeGreaterThan(0);
    for (const s of e.npcs) {
      expect(w.isWalkable(s.cellX, s.cellY)).toBe(true);
      expect(Math.hypot(s.x - sx, s.y - sy)).toBeLessThan(10);
    }
    expect(e.actors.length).toBe(e.npcs.length + 1);
  });

  it('personagem não atravessa a ovelha e ocupação conta para todos', () => {
    const w = new World(7);
    const [sx, sy] = w.outsideGate();
    const p = new Player(sx + 0.5, sy + 0.5);
    const e = new Entities(p);
    const s = new Sheep(sx + 1.6, sy + 0.5, sx + 1.6, sy + 0.5, () => 0.99);
    e.npcs.push(s);
    run(60, () => p.update(1 / 60, 1, 0, w, e.blocker));
    expect(p.x + p.spec.halfW).toBeLessThanOrEqual(s.x - s.spec.halfW + 1e-6);
    expect(e.occupies(s.cellX, s.cellY)).toBe(true);
  });
});
