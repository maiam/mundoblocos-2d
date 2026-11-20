import { T } from './voxel';

/**
 * Regras puras do som do Titã (ADR 0054; sem DOM, testável em Node): qual material soa em cada bloco e o relógio dos passos.
 * O sintetizador em si (Web Audio) fica em `gameAudio.ts`.
 */
export type SurfaceMaterial = 'rock' | 'sand' | 'ice';

/** Material sonoro de um bloco (quebra, colocação e passos); `null` = silêncio (ar, líquido, lanterna). Rocha: escura, veio, laje, mesa e rocha-mãe; areia: ocre e úmida; gelo: fosco, veio e brasa de âmbar (cristal). */
export function surfaceOf(block: number | undefined): SurfaceMaterial | null {
  switch (block) {
    case T.SAND: case T.DAMP_SAND: return 'sand';
    case T.FROST: case T.VEIN_FROST: case T.EMBER: return 'ice';
    case T.DARK_ROCK: case T.VEIN_ROCK: case T.SLAB: case T.SLAB_TOP: case T.SLAB_DOUBLE: case T.BEDROCK: case T.WORKBENCH: case T.WORKBENCH_90: case T.WORKBENCH_180: case T.WORKBENCH_270: return 'rock';
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
