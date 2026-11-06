import { Breeder, type BreedSpec } from './breeder';

export { BREED_COOLDOWN, COURTSHIP_SECONDS, LOVE_SECONDS } from './breeder';

/** Tempo até o filhote virar adulto (s). */
export const GROW_UP_SECONDS = 120;

const SHEEP: BreedSpec = {
  adult: { speed: 1.3, halfW: 0.3, halfD: 0.17, stepHeight: 0 },
  baby: { speed: 1.6, halfW: 0.22, halfD: 0.13, stepHeight: 0 },
  growUpSeconds: GROW_UP_SECONDS,
};

/**
 * Ovelha. Pasta perto de "casa" (passeio do `Wanderer`). Não sobe em cubos (blocos servem de cerca).
 * Come trigo e se reproduz pelo ciclo comum (`Breeder`); o namoro dela tem folha própria (`sheep-love`).
 */
export class Sheep extends Breeder {
  constructor(x: number, y: number, homeX = x, homeY = y, rand: () => number = Math.random, baby = false) {
    super('sheep', SHEEP, x, y, homeX, homeY, rand, baby);
  }
}
