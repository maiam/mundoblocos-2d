import type { World } from '../world/world';
import type { Blocker } from './walker';
import { Wanderer } from './wanderer';

/**
 * Cavalo: animal do campo. Passeia perto de casa com passos mais longos que a ovelha e, como ela, não sobe em
 * cubos (blocos servem de cerca). Ainda sem montaria nem interação (ideia registrada em NEXT_STEPS).
 */
export class Horse extends Wanderer {
  constructor(x: number, y: number, rand: () => number = Math.random) {
    super(x, y, { speed: 1.8, halfW: 0.4, halfD: 0.2, stepHeight: 0 }, x, y, rand, { idle: [2, 6], walk: [1.5, 4], leash: 10 });
  }

  update(dt: number, world: World, blocked?: Blocker): void {
    this.wander(dt, world, blocked);
  }
}
