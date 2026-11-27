import { Item } from './items';
import type { TitanSession } from './session';

/**
 * Pesca do Orvalis (ADR 0133, Minecraft Wiki "Fishing" e "Fishing Rod", Java): a vara lança a boia na água; depois de uma espera sorteada o peixe **fisga**, e há uma janela curta para recolher.
 * Estado só de execução (`session.fishing`, fora do save). Puro e determinístico com `rng` injetável; sem DOM.
 */
/** Espera até a fisgada (5 a 30 s) e janela para recolher depois dela (1 a 2 s, Java). */
export const FISH_WAIT_MIN_S = 5, FISH_WAIT_MAX_S = 30, FISH_WINDOW_MIN_S = 1, FISH_WINDOW_MAX_S = 2;
/** Distância máxima entre o jogador e a boia (Wiki: 33 blocos); além disso a linha se solta. */
export const FISH_MAX_DISTANCE = 33;
/** Peixes sem encantamento (Wiki: 60/25/13/2 % entre os peixes; lixo e tesouro ficam de fora até haver itens). */
export const FISH_TABLE: ReadonlyArray<{ item: number; weight: number }> = [
  { item: Item.BACALHAU_CRU, weight: 60 }, { item: Item.SALMAO_CRU, weight: 25 }, { item: Item.BAIACU, weight: 13 }, { item: Item.PEIXE_TROPICAL, weight: 2 },
];

/** A boia: célula do ar logo acima da superfície; `phase` espera ou fisgada; `t` = segundos que faltam para a fase acabar. */
export interface Bobber { x: number; y: number; z: number; phase: 'wait' | 'bite'; t: number }

const span = (min: number, max: number, rng: () => number): number => min + (max - min) * rng();
export const newBobber = (x: number, y: number, z: number, rng: () => number = Math.random): Bobber => ({ x, y, z, phase: 'wait', t: span(FISH_WAIT_MIN_S, FISH_WAIT_MAX_S, rng) });

/** Sorteia o peixe da pescaria. */
export function rollFish(rng: () => number = Math.random): number {
  const total = FISH_TABLE.reduce((a, e) => a + e.weight, 0);
  let r = rng() * total;
  for (const e of FISH_TABLE) { r -= e.weight; if (r < 0) return e.item; }
  return FISH_TABLE[0].item;
}

/** Avança a boia em `dt` s: no fim da espera o peixe fisga (`bite`); se a janela passa sem recolher, ele escapa (`escape`) e a espera recomeça. */
export function tickBobber(b: Bobber, dt: number, rng: () => number = Math.random): 'bite' | 'escape' | null {
  b.t -= Math.max(0, dt);
  if (b.t > 0) return null;
  if (b.phase === 'wait') { b.phase = 'bite'; b.t = span(FISH_WINDOW_MIN_S, FISH_WINDOW_MAX_S, rng); return 'bite'; }
  b.phase = 'wait'; b.t = span(FISH_WAIT_MIN_S, FISH_WAIT_MAX_S, rng);
  return 'escape';
}

/** A boia está longe demais do jogador (pés em `px, py, pz`)? */
export const bobberTooFar = (b: Bobber, px: number, py: number, pz: number): boolean => Math.hypot(b.x + 0.5 - px, b.y - py, b.z + 0.5 - pz) > FISH_MAX_DISTANCE;

export type FishEvent = 'bite' | 'escape' | 'lost' | null;
/**
 * Passo da pescaria da sessão: a linha se solta (`lost`) se a vara saiu da mão ou o jogador se afastou além de `FISH_MAX_DISTANCE`; senão avança a boia. Devolve o evento para o jogo avisar e redesenhar.
 */
export function stepFishing(s: TitanSession, dt: number, rng: () => number = Math.random): FishEvent {
  const f = s.fishing;
  if (!f) return null;
  const b = s.body;
  if (s.inventory.get(s.selected)?.item !== Item.VARA_PESCA || bobberTooFar(f, b.x, b.y, b.z)) { s.fishing = null; return 'lost'; }
  return tickBobber(f, dt, rng);
}
