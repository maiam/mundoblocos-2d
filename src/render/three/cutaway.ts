import { Block, blockDef, type BlockId } from '../../world/blocks';

/** O mínimo do mundo que o corte precisa (testável sem WebGL). */
export interface CutawayWorld {
  readonly maxStack: number;
  standHeight(x: number, y: number): number | null;
  getLevel(x: number, y: number, level: number): BlockId;
}

/** Máximo de células da casa varridas (uma construção enorme não trava o quadro). */
const MAX_CELLS = 900;

const isCube = (id: BlockId): boolean => id !== Block.AIR && blockDef(id).shape === 'cube';

/**
 * Corte da casa (v0.93.153, Santuário): quando a jogadora está **debaixo de um telhado** (um cubo a 2 níveis ou mais acima do piso onde ela pisa), a construção
 * inteira — paredes, telhado e o que mais cobrir as mesmas células — perde tudo o que fica **acima do 1º nível de parede** (o piso e uma fileira de parede ficam), para
 * se ver o interior pela câmera isométrica. Ao sair, tudo volta. Função PURA do mundo.
 *
 * Devolve `célula "x,y" → menor nível escondido` (= piso + 1), ou `null` se não há telhado sobre a jogadora.
 */
export function computeCutaway(w: CutawayWorld, px: number, py: number): Map<string, number> | null {
  const floor = w.standHeight(px, py);
  if (floor === null) return null;
  const hide = floor + 1;
  const roofed = (x: number, y: number): boolean => {
    for (let l = floor + 2; l < w.maxStack; l++) if (isCube(w.getLevel(x, y, l))) return true;
    return false;
  };
  if (!roofed(px, py)) return null;
  const out = new Map<string, number>();
  const queue: Array<[number, number]> = [[px, py]];
  out.set(px + ',' + py, hide);
  while (queue.length && out.size < MAX_CELLS) {
    const [x, y] = queue.pop()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx, ny = y + dy;
      const key = nx + ',' + ny;
      if (out.has(key) || !roofed(nx, ny)) continue;
      out.set(key, hide);
      queue.push([nx, ny]);
    }
  }
  return out;
}
