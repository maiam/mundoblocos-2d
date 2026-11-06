import { describe, expect, it } from 'vitest';
import { DAY_LENGTH_S } from '../config';
import { Block } from '../world/blocks';
import { ITEMS } from '../world/items';
import { mulberry32 } from '../world/random';
import { World } from '../world/world';
import { Entities, MAX_PER_SPECIES } from './entities';
import { FARM_GROW_UP_SECONDS, FarmAnimal, type FarmKind } from './horse';
import { Player } from './player';
import { Sheep } from './sheep';

function field(seed = 7): [World, number, number] {
  const w = new World(seed);
  const [sx, sy] = w.outsideGate();
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      while (w.topBlock(sx + dx, sy + dy)) w.breakBlock(sx + dx, sy + dy);
      if (w.getGround(sx + dx, sy + dy) === Block.WATER) w.placeBlock(sx + dx, sy + dy, Block.OAK_PLANKS);
    }
  }
  return [w, sx, sy];
}

describe('Animais do campo: alimento, filhote e crescimento', () => {
  it('cada animal come o seu: vaca = trigo, galinha = semente, cavalo = cenoura (ovelha segue no trigo)', () => {
    const cow = new FarmAnimal('cow', 0.5, 0.5, () => 0.5);
    const chicken = new FarmAnimal('chicken', 0.5, 0.5, () => 0.5);
    const horse = new FarmAnimal('horse', 0.5, 0.5, () => 0.5);
    expect(cow.eats('wheat')).toBe(true);
    expect(cow.eats('carrot')).toBe(false);
    expect(chicken.eats('wheat_seed')).toBe(true);
    expect(chicken.eats('wheat')).toBe(false);
    expect(horse.eats('carrot')).toBe(true);
    expect(new Sheep(0.5, 0.5).eats('wheat')).toBe(true);
    // Semente e cenoura continuam plantando (o toque num animal alimenta; fora dele, planta).
    expect(ITEMS.wheat_seed.plants).toBe(Block.WHEAT_0);
    expect(ITEMS.carrot.plants).toBe(Block.CARROT_0);
  });

  it('filhote não come e cresce em 3 dias de jogo', () => {
    expect(FARM_GROW_UP_SECONDS).toBe(3 * DAY_LENGTH_S);
    const [w, sx, sy] = field();
    const calf = new FarmAnimal('cow', sx + 0.5, sy + 0.5, mulberry32(2), true);
    expect(calf.feed()).toBe(false);
    for (let t = 0; t < FARM_GROW_UP_SECONDS - 1; t += 1) calf.update(1, w);
    expect(calf.baby).toBe(true);
    calf.update(2, w);
    expect(calf.baby).toBe(false);
    expect(calf.feed()).toBe(true);
  });

  for (const [kind, baby] of [['cow', 'calf'], ['chicken', 'chick'], ['horse', 'foal']] as [FarmKind, string][]) {
    it(`dois ${kind} alimentados namoram e nasce um ${baby}`, () => {
      const [w, sx, sy] = field();
      const e = new Entities(new Player(sx - 3.5, sy - 1.5), mulberry32(3));
      const a = new FarmAnimal(kind, sx - 1.5, sy + 0.5, mulberry32(4));
      const b = new FarmAnimal(kind, sx + 2.5, sy + 0.5, mulberry32(5));
      e.horses.push(a, b);
      a.feed();
      b.feed();
      for (let i = 0; i < 60 * 25 && e.horses.length === 2; i++) e.update(1 / 60, w);
      expect(e.horses.length).toBe(3);
      expect(e.horses[2].kind).toBe(kind);
      expect(e.horses[2].baby).toBe(true);
      expect(e.actors.some((x) => x.kind === baby)).toBe(true);
    });
  }

  it('espécies diferentes não formam par; limite por espécie', () => {
    const [w, sx, sy] = field();
    const e = new Entities(new Player(sx - 3.5, sy - 1.5), mulberry32(3));
    const cow = new FarmAnimal('cow', sx - 1.5, sy + 0.5, mulberry32(4));
    const sheep = new Sheep(sx + 1.5, sy + 0.5, sx, sy, mulberry32(5));
    e.horses.push(cow);
    e.npcs.push(sheep);
    cow.feed();
    sheep.feed();
    for (let i = 0; i < 60 * 10; i++) e.update(1 / 60, w);
    expect(cow.partner).toBeNull();
    expect(e.horses.length + e.npcs.length).toBe(2);
    expect(MAX_PER_SPECIES.chicken).toBeGreaterThan(0);
  });
});
