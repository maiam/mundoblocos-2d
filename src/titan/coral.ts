import type { TitanSession } from './session';
import { deadCoral, isCoralBlock, isCoralLive, isLiquidCell } from './voxel';

/**
 * Coral vivo fora da água (ADR 0136, Minecraft Wiki "Dead Coral": o coral vivo sem água por perto vira o morto depois de alguns segundos, na Java): o bloco de coral vivo posto **sem água em nenhuma das seis células vizinhas**
 * entra em `session.coralWatch` (só de execução, fora do save) e, passados `CORAL_DRY_MIN_S` a `CORAL_DRY_MAX_S` segundos, vira a versão morta; se a água volta antes, o relógio é descartado. O coral e a gorgônia (plantas)
 * só se plantam dentro da água, então só o bloco morre assim. Puro e determinístico com `rng` injetável; sem DOM.
 */
export const CORAL_DRY_MIN_S = 3, CORAL_DRY_MAX_S = 6;
const key = (x: number, y: number, z: number): string => `${x},${y},${z}`;
const NEIGHBORS: ReadonlyArray<readonly [number, number, number]> = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

/** Há água (com ou sem planta aquática) em alguma célula vizinha? */
export const coralWet = (s: TitanSession, x: number, y: number, z: number): boolean => NEIGHBORS.some(([dx, dy, dz]) => isLiquidCell(s.volume.get(x + dx, y + dy, z + dz)));

/** Começa a vigiar um bloco de coral vivo recém-posto; sem água em volta, o relógio de morte corre. */
export function watchCoral(s: TitanSession, x: number, y: number, z: number, rng: () => number = Math.random): void {
  const id = s.volume.get(x, y, z);
  if (!isCoralBlock(id) || !isCoralLive(id) || coralWet(s, x, y, z)) return;
  s.coralWatch.set(key(x, y, z), { x, y, z, t: CORAL_DRY_MIN_S + (CORAL_DRY_MAX_S - CORAL_DRY_MIN_S) * rng() });
}

/** Avança os relógios em `dt` s; devolve quantos blocos morreram. */
export function stepCoral(s: TitanSession, dt: number): number {
  let died = 0;
  for (const [k, w] of [...s.coralWatch]) {
    const id = s.volume.get(w.x, w.y, w.z);
    if (!isCoralBlock(id) || !isCoralLive(id) || coralWet(s, w.x, w.y, w.z)) { s.coralWatch.delete(k); continue; }
    w.t -= Math.max(0, dt);
    if (w.t > 0) continue;
    s.coralWatch.delete(k);
    if (s.volume.set(w.x, w.y, w.z, deadCoral(id))) died++;
  }
  return died;
}
