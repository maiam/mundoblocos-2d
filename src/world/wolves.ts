import { SUBDIV } from '../config';
import { Block, blockDef } from './blocks';
import { isWolf, type Rect, WOLF_KINDS, type WolfKind } from './dungeon';
import { hash2 } from './random';
import { grow, TOWN_SOUTH_FIELD } from './town';
import type { World } from './world';

/**
 * Bandos de lobos do mapa (v0.91.0, dono do produto): de 1 a 3 lobos **da mesma cor** (marrom, cinza ou branco) que
 * passeiam juntos perto da toca, espalhados pelo mapa ao redor da cidade. Função pura da seed (sem `Math.random`, sem
 * carregar chunks): o mesmo mapa sempre tem os mesmos bandos nos mesmos lugares. Nenhum nasce na cidade, na estrada do
 * portão nem no campo do rebanho, nem em área protegida.
 */
export interface WolfSpawn {
  kind: WolfKind;
  x: number;
  y: number;
  /** Toca do bando (ponto de volta e de renascimento). */
  homeX: number;
  homeY: number;
}

/** Lado (células) de cada região; no máximo uma toca por região. */
export const WOLF_REGION = 40 * SUBDIV;
/** Quantas regiões para cada lado do centro da cidade (±): 7 × 7 regiões ≈ 280 × 280 células. */
export const WOLF_REGIONS = 3;
/** Chance de uma região ter toca. */
export const WOLF_DEN_CHANCE = 0.5;
/** Distância mínima (células) entre a muralha/campo do rebanho e qualquer toca. */
export const WOLF_TOWN_CLEARANCE = 28 * SUBDIV;
/** Quanto o bando pode se afastar da toca (células): limite do passeio e da perseguição. */
export const WOLF_ROAM = 12 * SUBDIV;
/** Posições dos membros do bando em torno da toca (o 1º é a própria toca). */
const SLOTS: ReadonlyArray<readonly [number, number]> = [[0, 0], [2 * SUBDIV, SUBDIV], [-SUBDIV, 2 * SUBDIV]];

/** O terreno-base da célula serve de chão para um lobo (sem água, buraco, árvore, pedra, bloco)? */
function open(world: World, x: number, y: number): boolean {
  const g = world.generator.groundAt(x, y);
  if (g === Block.WATER || g === Block.HOLE || g === Block.VOID || blockDef(g).liquid) return false;
  const o = world.generator.objectAt(x, y);
  return (o === Block.AIR || blockDef(o).shape === 'decoration') && world.generator.upperAt(x, y) === Block.AIR && !world.isProtected(x, y);
}

/** Retângulo de passeio de um bando em torno da toca. */
export function wolfRoam(homeX: number, homeY: number): Rect {
  return { x0: homeX - WOLF_ROAM, y0: homeY - WOLF_ROAM, x1: homeX + WOLF_ROAM, y1: homeY + WOLF_ROAM };
}

/** Todos os lobos do mapa (vazio em mundo sem cidade). */
export function wolfPacks(world: World): WolfSpawn[] {
  const town = world.town;
  if (!world.profile.wolves || !town) return [];
  const seed = world.seed;
  const keepOut = grow({ ...town.area, y1: town.area.y1 + TOWN_SOUTH_FIELD }, WOLF_TOWN_CLEARANCE);
  const cx = Math.floor((town.area.x0 + town.area.x1) / 2 / WOLF_REGION);
  const cy = Math.floor((town.area.y0 + town.area.y1) / 2 / WOLF_REGION);
  const out: WolfSpawn[] = [];
  for (let ry = cy - WOLF_REGIONS; ry <= cy + WOLF_REGIONS; ry++) {
    for (let rx = cx - WOLF_REGIONS; rx <= cx + WOLF_REGIONS; rx++) {
      if (hash2(seed, rx * 7 + 101, ry * 13 + 211) >= WOLF_DEN_CHANCE) continue;
      const kind = WOLF_KINDS[Math.floor(hash2(seed, rx * 31 + 5, ry * 17 + 9) * WOLF_KINDS.length)];
      const count = 1 + Math.floor(hash2(seed, rx * 5 + 3, ry * 11 + 7) * 3); // 1, 2 ou 3
      for (let k = 0; k < 12; k++) { // tenta posições da toca até caber o bando inteiro em terreno aberto
        const m = 4 * SUBDIV; // margem da região (grade fina: × SUBDIV)
        const hx = rx * WOLF_REGION + m + Math.floor(hash2(seed, rx * 3 + k, ry * 19 + 1) * (WOLF_REGION - 2 * m));
        const hy = ry * WOLF_REGION + m + Math.floor(hash2(seed, rx * 23 + 2, ry * 3 + k) * (WOLF_REGION - 2 * m));
        if (hx >= keepOut.x0 && hx <= keepOut.x1 && hy >= keepOut.y0 && hy <= keepOut.y1) continue;
        const cells = SLOTS.slice(0, count).map(([dx, dy]) => [hx + dx, hy + dy] as const);
        if (!cells.every(([x, y]) => open(world, x, y))) continue;
        for (const [x, y] of cells) out.push({ kind, x: x + 0.5, y: y + 0.5, homeX: hx + 0.5, homeY: hy + 0.5 });
        break;
      }
    }
  }
  return out;
}

export { isWolf };
