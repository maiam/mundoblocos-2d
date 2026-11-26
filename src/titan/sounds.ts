import { isWall, T } from './voxel';

/**
 * Regras puras do som do Titã (ADR 0054; sem DOM, testável em Node): qual material soa em cada bloco e o relógio dos passos.
 * O sintetizador em si (Web Audio) fica em `gameAudio.ts`.
 */
export type SurfaceMaterial = 'rock' | 'sand' | 'ice';

/** Material sonoro de um bloco (quebra, colocação e passos); `null` = silêncio (ar, líquido, lanterna). Rocha: escura, veio, laje, mesa e rocha-mãe; areia: ocre e úmida; gelo: fosco, veio e brasa de âmbar (cristal). */
export function surfaceOf(block: number | undefined): SurfaceMaterial | null {
  if (block !== undefined && isWall(block)) return 'rock'; // mureta de pedra (ADR 0110)
  if (block !== undefined && block >= T.DOOR && block <= T.DOOR_LAST) return 'sand'; // a porta de junco soa como o resto do junco (ADR 0102)
  switch (block) {
    case T.GRASS: case T.DIRT: case T.BEACH: case T.LEAVES_OAK: case T.LEAVES_CHERRY: case T.LEAVES_BIRCH: return 'sand'; // Orvalis em voxel (ADR 0105): sem timbre próprio ainda; terra, areia e folhas soam como areia
    case T.STONE_STAIR: case T.STONE_STAIR_90: case T.STONE_STAIR_180: case T.STONE_STAIR_270: case T.STONE_SMOOTH: case T.STONE_BRICK: case T.STONE_SLAB: case T.STONE_SLAB_TOP: case T.STONE: case T.LOG_OAK: case T.LOG_CHERRY: case T.LOG_BIRCH: case T.PLANKS_OAK: case T.PLANKS_CHERRY: case T.PLANKS_BIRCH: case T.CARPENTRY: case T.CARPENTRY_90: case T.CARPENTRY_180: case T.CARPENTRY_270: return 'rock'; // a tora ainda soa como rocha (falta o som de madeira)
    case T.SAND: case T.DAMP_SAND: case T.REED_BLOCK: case T.REED_SLAB: case T.REED_SLAB_TOP: case T.REED_STAIR: case T.REED_STAIR_90: case T.REED_STAIR_180: case T.REED_STAIR_270: case T.REED_CHAIR: case T.REED_CHAIR_90: case T.REED_CHAIR_180: case T.REED_CHAIR_270: case T.PAINEL: case T.PAINEL_Z: case T.MAT: case T.LADDER: case T.LADDER_90: case T.LADDER_180: case T.LADDER_270: return 'sand';
    case T.CHEST: case T.CHEST_90: case T.CHEST_180: case T.CHEST_270: return 'rock';
    case T.BED: case T.BED_90: case T.BED_180: case T.BED_270: case T.BED_HEAD: case T.BED_HEAD_90: case T.BED_HEAD_180: case T.BED_HEAD_270: return 'sand'; // o painel é um trançado de junco sobre base de basalto: soa abafado
    case T.MARCO: case T.MARCO_90: case T.MARCO_180: case T.MARCO_270: return 'rock';
    case T.FROST: case T.VEIN_FROST: case T.EMBER: case T.EMBER_VEIN: return 'ice';
    case T.DARK_ROCK: case T.VEIN_ROCK: case T.VEIN_COPPER: case T.BRAZIER: case T.BRAZIER_LIT: case T.CARAPACE: case T.EMBER_BLOCK: case T.SLAB: case T.SLAB_TOP: case T.SLAB_DOUBLE: case T.BEDROCK: case T.WORKBENCH: case T.WORKBENCH_90: case T.WORKBENCH_180: case T.WORKBENCH_270: return 'rock';
    default: return null;
  }
}

/** Distância percorrida no chão (em blocos) entre dois passos. */
export const STRIDE_BLOCKS = 2.4;

/**
 * Relógio dos passos: acumula o caminho horizontal **só com o jogador no chão e fora do líquido**; a cada `STRIDE_BLOCKS` devolve verdadeiro (um passo). Sair do chão (pulo, queda)
 * mantém o acúmulo, mas não soma distância; parar não gera passo. Zera ao reiniciar.
 */
export class FootstepClock {
  private acc = 0;
  /** `dist` = deslocamento horizontal deste quadro; `grounded` = no chão e fora do líquido. */
  step(dist: number, grounded: boolean): boolean {
    if (!grounded || !(dist > 0)) return false;
    this.acc += dist;
    if (this.acc < STRIDE_BLOCKS) return false;
    this.acc -= STRIDE_BLOCKS;
    return true;
  }
  reset(): void { this.acc = 0; }
}
