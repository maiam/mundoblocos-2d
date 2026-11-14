import { SUBDIV } from '../config';
import { Block, type BlockId } from '../world/blocks';

/**
 * Poeira de passos (v0.93.69): de que cor e quanta sobe do chão sob os pés. Funções PURAS; o desenho é de `three/footDust.ts`.
 * O mundo continua dono do chão (`World.getGround`); aqui só a aparência.
 */
export interface DustStyle {
  /** Cor (0–1). */
  color: [number, number, number];
  /** 0..1: quanto aparece (terra solta levanta mais que o piso de pedra). */
  amount: number;
}

const GRASS: DustStyle = { color: [0.55, 0.72, 0.38], amount: 0.45 };
const DIRT: DustStyle = { color: [0.72, 0.55, 0.36], amount: 0.9 };
const SAND: DustStyle = { color: [0.93, 0.84, 0.58], amount: 1 };
const STONE: DustStyle = { color: [0.78, 0.76, 0.72], amount: 0.35 };

/** Poeira para o chão `id` (ou null: água, buraco, vazio e afins não levantam nada). */
export function dustFor(id: BlockId): DustStyle | null {
  switch (id) {
    case Block.GRASS: return GRASS;
    case Block.DIRT:
    case Block.PATH:
    case Block.TILLED:
    case Block.DUNGEON_DIRT: return DIRT;
    case Block.SAND: return SAND;
    case Block.WATER:
    case Block.HOLE:
    case Block.VOID:
    case Block.AIR: return null;
    default: return STONE;
  }
}

/** Distância (células da grade atual) entre uma nuvenzinha e a seguinte: uma por passada. */
export const DUST_STRIDE = 0.55 * SUBDIV;

/** Pegada deixada no chão macio (areia, terra, caminho, terra arada); grama, pedra, água e afins não deixam. */
export interface PrintStyle {
  color: [number, number, number];
  /** Opacidade inicial (0–1); some em `PRINT_LIFE` segundos. */
  alpha: number;
}
export const PRINT_LIFE = 7;

export function printFor(id: BlockId): PrintStyle | null {
  switch (id) {
    case Block.SAND: return { color: [0.62, 0.5, 0.28], alpha: 0.5 };
    case Block.DIRT:
    case Block.PATH:
    case Block.DUNGEON_DIRT: return { color: [0.3, 0.18, 0.09], alpha: 0.5 };
    case Block.TILLED: return { color: [0.22, 0.13, 0.06], alpha: 0.5 };
    default: return null;
  }
}
