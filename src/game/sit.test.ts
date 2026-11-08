import { describe, expect, it } from 'vitest';
import { Block } from '../world/blocks';
import { World } from '../world/world';
import { canSit } from './entities';
import { Player, SEAT_FEET, SEATED_FRAME } from './player';

/** Lugar livre fora da muralha para construir. */
function spot(w: World): [number, number] {
  const [gx, gy] = w.outsideGate();
  const x = gx + 4;
  const y = gy + 4;
  for (let dx = -2; dx <= 2; dx++) while (w.topBlock(x + dx, y)) w.breakBlock(x + dx, y);
  return [x, y];
}

describe('Sentar e levantar', () => {
  it('cadeira: anda até ela, senta no lugar, fica parado e, ao mexer o controle, levanta e volta andando', () => {
    const w = new World(7);
    const [x, y] = spot(w);
    expect(w.placeBlock(x, y, Block.CHAIR)).toBe(true);
    expect(w.seatAt(x, y, x + 0.5, y + 1.5)).toEqual([x, y]);
    const p = new Player(x + 0.5, y + 1.5);
    expect(p.sitOn(x, y)).toBe(true);
    expect(p.sitting).toBe(false); // primeiro anda até o assento (desenho de caminhada)
    const frames: number[] = [];
    for (let t = 0; t < 2; t += 0.05) {
      p.update(0.05, 0, 0, w);
      if (p.sitting) frames.push(p.sitFrame);
    }
    expect([p.x, p.y, p.facing]).toEqual([x + 0.5, y + SEAT_FEET, 'down']);
    expect(p.seat?.phase).toBe('seated');
    // Senta no lugar (0→3) e fica parado num quadro só (sem balanço).
    expect(frames[0]).toBe(0);
    expect(new Set(frames.slice(-10))).toEqual(new Set([SEATED_FRAME]));
    p.update(0.05, 1, 0, w); // mexeu: levanta no lugar
    expect(p.seat?.phase).toBe('up');
    for (let t = 0; t < 2; t += 0.05) p.update(0.05, 0, 0, w);
    expect(p.seat).toBeNull();
    expect([p.x, p.y]).toEqual([x + 0.5, y + 1.5]); // andou de volta para onde estava
  });

  it('banco da cidade: senta na célula do banco mais perto; outros blocos não são assento; os quatro personagens sentam', () => {
    const w = new World(7);
    const bench = w.town!.buildings.find((b) => b.id === Block.BENCH_LONG)!;
    expect(w.seatAt(bench.x + 2, bench.y, bench.x + 2.5, bench.y + 1.5)).toEqual([bench.x + 2, bench.y]);
    expect(w.seatAt(bench.x, bench.y, bench.x + 9, bench.y + 1)).toEqual([bench.x + 2, bench.y]);
    const [x, y] = spot(w);
    w.placeBlock(x, y, Block.STONE);
    expect(w.seatAt(x, y, x, y + 1)).toBeNull();
    expect(canSit('gino')).toBe(true);
    expect(canSit('mila')).toBe(true);
    expect(['heroine', 'hero', 'hood', 'gino', 'mila'].every((b) => canSit(b as never))).toBe(true);
  });

  it('levar dano sentado levanta na hora', () => {
    const w = new World(7);
    const [x, y] = spot(w);
    w.placeBlock(x, y, Block.CHAIR);
    const p = new Player(x + 0.5, y + 1.5);
    p.sitOn(x, y);
    p.hurt(5, x + 3, y, w);
    expect(p.seat).toBeNull();
  });
});

describe('Porta entre blocos de madeira ou pedra', () => {
  it('vale entre blocos de pedra ou de madeira (e mistura), não entre blocos de terra', () => {
    const w = new World(7);
    const [x, y] = spot(w);
    w.placeBlock(x - 1, y, Block.STONE_BRICK);
    w.placeBlock(x + 1, y, Block.OAK_PLANKS);
    expect(w.hasDoorFrame(x, y)).toBe(true);
    expect(w.placeBlock(x, y, Block.OAK_DOOR)).toBe(true);
    w.breakBlock(x, y);
    w.breakBlock(x + 1, y);
    w.placeBlock(x + 1, y, Block.DIRT);
    expect(w.hasDoorFrame(x, y)).toBe(false);
    w.breakBlock(x + 1, y);
    w.placeBlock(x + 1, y, Block.OAK_LOG);
    expect(w.hasDoorFrame(x, y)).toBe(true); // tijolo de pedra + tora
  });
});
