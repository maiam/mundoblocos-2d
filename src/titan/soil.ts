import type { TitanVolume } from './volume';
import { T } from './voxel';

/**
 * Solo de cultivo do Orvalis em voxel (ADR 0112). Puro e sem DOM: a regra de arar com a enxada e de abrir caminho com a pá, e a hidratação que decide se a terra arada nasce
 * úmida ou seca. A água segue a regra do Minecraft: lago a até 4 células na horizontal, no mesmo nível ou 1 acima. (A terra arada ainda **não** muda sozinha quando a água
 * chega ou sai: isso é do cultivo, E5.)
 */
export const HYDRATION_RADIUS = 4;

/** Há água (lago) ao alcance da terra em (x, y, z)? */
export function isHydrated(v: Pick<TitanVolume, 'get'>, x: number, y: number, z: number): boolean {
  for (let dy = 0; dy <= 1; dy++)
    for (let dx = -HYDRATION_RADIUS; dx <= HYDRATION_RADIUS; dx++)
      for (let dz = -HYDRATION_RADIUS; dz <= HYDRATION_RADIUS; dz++) if (v.get(x + dx, y + dy, z + dz) === T.LAKE) return true;
  return false;
}

/** Em que a enxada transforma o bloco (null = não faz nada): terra, grama e caminho viram terra arada (úmida se há água ao alcance); terra infértil vira terra comum. */
export function hoeResult(v: Pick<TitanVolume, 'get'>, block: number, x: number, y: number, z: number): number | null {
  if (block === T.GRASS || block === T.DIRT || block === T.PATH) return isHydrated(v, x, y, z) ? T.FARMLAND_WET : T.FARMLAND_DRY;
  if (block === T.DIRT_INFERTILE) return T.DIRT;
  return null;
}

/** Em que a pá transforma o bloco: grama e terra viram Caminho de Terra (null = não faz nada). */
export const shovelResult = (block: number): number | null => (block === T.GRASS || block === T.DIRT ? T.PATH : null);
