import { DAY_LENGTH_S } from '../config';
import type { AnimalKind } from '../world/items';
import { Breeder } from './breeder';
import type { WalkerSpec } from './walker';

/** Animais do campo: cavalo, vaca e galinha (a ovelha tem classe própria). */
export type FarmKind = Exclude<AnimalKind, 'sheep'>;

/** Filhote vira adulto depois de 3 dias de jogo (dono do produto, 2026-11-06). */
export const FARM_GROW_UP_SECONDS = 3 * DAY_LENGTH_S;

/** Nome do filhote de cada animal (ator do render e textos). */
export const BABY_KIND = { horse: 'foal', cow: 'calf', chicken: 'chick' } as const;
export type BabyKind = (typeof BABY_KIND)[FarmKind];

/** Corpo (adulto e filhote) e passeio de cada animal: velocidade, meia-largura/profundidade, pausas, passos e coleira (células). */
const FARM: Record<FarmKind, { adult: WalkerSpec; baby: WalkerSpec; idle: [number, number]; walk: [number, number]; leash: number }> = {
  horse: {
    adult: { speed: 1.8, halfW: 0.4, halfD: 0.2, stepHeight: 0 },
    baby: { speed: 1.9, halfW: 0.28, halfD: 0.15, stepHeight: 0 },
    idle: [2, 6], walk: [1.5, 4], leash: 10,
  },
  cow: {
    adult: { speed: 0.9, halfW: 0.38, halfD: 0.2, stepHeight: 0 },
    baby: { speed: 1.1, halfW: 0.27, halfD: 0.15, stepHeight: 0 },
    idle: [3, 8], walk: [1.5, 3.5], leash: 8,
  },
  chicken: {
    adult: { speed: 1.3, halfW: 0.22, halfD: 0.14, stepHeight: 0 },
    baby: { speed: 1.4, halfW: 0.16, halfD: 0.1, stepHeight: 0 },
    idle: [1, 4], walk: [0.6, 2], leash: 6,
  },
};

/**
 * Animal do campo (cavalo, vaca, galinha): passeia perto de casa e, como a ovelha, não sobe em cubos (blocos e cercas
 * seguram). Come o alimento da espécie (`ITEMS[item].feeds`: vaca = trigo, galinha = semente de trigo, cavalo =
 * cenoura) e se reproduz pelo ciclo comum (`Breeder`); o filhote cresce em 3 dias de jogo.
 */
export class FarmAnimal extends Breeder {
  constructor(readonly kind: FarmKind, x: number, y: number, rand: () => number = Math.random, baby = false, homeX = x, homeY = y) {
    const f = FARM[kind];
    super(kind, { adult: f.adult, baby: f.baby, growUpSeconds: FARM_GROW_UP_SECONDS }, x, y, homeX, homeY, rand, baby,
      { idle: f.idle, walk: f.walk, leash: f.leash });
  }
}

/** Cavalo (atalho mantido para quem já usava). */
export class Horse extends FarmAnimal {
  constructor(x: number, y: number, rand: () => number = Math.random) {
    super('horse', x, y, rand);
  }
}
