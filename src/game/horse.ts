import type { World } from '../world/world';
import type { Blocker } from './walker';
import { Wanderer } from './wanderer';

/** Animais do campo que só passeiam (sem reprodução nem interação ainda — ver NEXT_STEPS). */
export type FarmKind = 'horse' | 'cow' | 'chicken';

/** Corpo e passeio de cada animal: velocidade, meia-largura/profundidade, pausas, passos e coleira (células). */
const FARM: Record<FarmKind, { speed: number; halfW: number; halfD: number; idle: [number, number]; walk: [number, number]; leash: number }> = {
  horse: { speed: 1.8, halfW: 0.4, halfD: 0.2, idle: [2, 6], walk: [1.5, 4], leash: 10 },
  cow: { speed: 0.9, halfW: 0.38, halfD: 0.2, idle: [3, 8], walk: [1.5, 3.5], leash: 8 },
  chicken: { speed: 1.3, halfW: 0.22, halfD: 0.14, idle: [1, 4], walk: [0.6, 2], leash: 6 },
};

/**
 * Animal do campo (cavalo, vaca, galinha): passeia perto de casa e, como a ovelha, não sobe em cubos (blocos servem
 * de cerca). Ainda sem montaria, leite ou ovos (ideias em NEXT_STEPS).
 */
export class FarmAnimal extends Wanderer {
  constructor(readonly kind: FarmKind, x: number, y: number, rand: () => number = Math.random) {
    const f = FARM[kind];
    super(x, y, { speed: f.speed, halfW: f.halfW, halfD: f.halfD, stepHeight: 0 }, x, y, rand, { idle: f.idle, walk: f.walk, leash: f.leash });
  }

  update(dt: number, world: World, blocked?: Blocker): void {
    this.wander(dt, world, blocked);
  }
}

/** Cavalo (atalho mantido para quem já usava). */
export class Horse extends FarmAnimal {
  constructor(x: number, y: number, rand: () => number = Math.random) {
    super('horse', x, y, rand);
  }
}
