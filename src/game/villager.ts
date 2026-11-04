import type { World } from '../world/world';
import { hash2 } from '../world/random';
import type { Blocker } from './walker';
import { Wanderer } from './wanderer';

/** Personagens-base dos moradores (roupa branca; arte `villager-<id>`). */
export const VILLAGER_BASES = ['blond', 'brown', 'black', 'silver'] as const;
export type VillagerBase = (typeof VILLAGER_BASES)[number];
/** Roupas vestidas por cima (arte `outfit-<id>`, mesma grade). Roupa nova: folha + id aqui + import no pacote de arte. */
export const OUTFITS = ['denim', 'varsity'] as const;
export type OutfitId = (typeof OUTFITS)[number];

/**
 * Morador da Cidade do Despertar: passeia pelas ruas e praças perto de casa e **nunca sai delas** (a caixa dos pés
 * só entra em células que `onStreet` aceita — a cidade decide; ver `Entities.spawnVillagers`). Visual = base + roupa.
 */
export class Villager extends Wanderer {
  constructor(
    x: number,
    y: number,
    readonly base: VillagerBase,
    readonly outfit: OutfitId,
    private readonly onStreet: (cx: number, cy: number) => boolean,
    rand: () => number = Math.random,
  ) {
    super(x, y, { speed: 1.4, halfW: 0.26, halfD: 0.14, stepHeight: 0 }, x, y, rand, { idle: [2, 7], walk: [1, 3], leash: 6 });
  }

  /** A caixa dos pés inteira fica em rua/praça? */
  allowedAt(x: number, y: number): boolean {
    const { halfW, halfD } = this.spec;
    for (let cy = Math.floor(y - halfD); cy <= Math.floor(y + halfD); cy++) {
      for (let cx = Math.floor(x - halfW); cx <= Math.floor(x + halfW); cx++) if (!this.onStreet(cx, cy)) return false;
    }
    return true;
  }

  update(dt: number, world: World, blocked?: Blocker): void {
    this.wander(dt, world, (self, x, y) => !this.allowedAt(x, y) || !!blocked?.(self, x, y));
  }
}

/** Roupa de cada morador: sorteio fixo pela seed do mundo (a cidade é igual em toda seed; as roupas variam). */
export function villagerOutfit(seed: number, i: number): OutfitId {
  return OUTFITS[Math.floor(hash2(seed, i, 913) * OUTFITS.length)];
}
