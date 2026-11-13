import { hash2 } from '../world/random';

/** Matemática pura dos efeitos de chão do Mundo (brilho da água, sombras de nuvens) — a MESMA do `Renderer` 2D, em células. */

/** Intensidade 0..1 do brilho de uma célula de água neste instante (0 = apagado). */
export function glintAlpha(seed: number, x: number, y: number, elapsed: number): number {
  const hsh = hash2(seed, x, y);
  const phase = Math.sin(elapsed * 1.6 + hsh * 40);
  return phase < 0.93 ? 0 : (phase - 0.93) / 0.07;
}

/** Onde o brilho cai dentro da célula (coordenadas de mundo, em células). */
export function glintPosition(seed: number, x: number, y: number): { x: number; y: number } {
  const hsh = hash2(seed, x, y);
  return { x: x + 0.25 + hsh * 0.5, y: y + 0.3 + hsh * 0.4 };
}

export interface CloudBlob {
  /** Centro e raios da elipse da sombra, em células. */
  x: number;
  y: number;
  rx: number;
  ry: number;
}

/** Lado da grade das nuvens (células), velocidade da deriva (células/s) e achatamento da sombra. */
export const CLOUD_CELL = 14;
export const CLOUD_DRIFT = 9 / 32;
const CLOUD_SQUASH = 0.6;

/** Sombras de nuvens passando sobre a área visível `[x0, x1] × [y0, y1]` (células de mundo). */
export function cloudBlobs(seed: number, x0: number, y0: number, x1: number, y1: number, elapsed: number): CloudBlob[] {
  const drift = elapsed * CLOUD_DRIFT;
  const out: CloudBlob[] = [];
  const gx0 = Math.floor((x0 - drift) / CLOUD_CELL) - 1;
  const gx1 = Math.floor((x1 - drift) / CLOUD_CELL) + 1;
  const gy0 = Math.floor(y0 / CLOUD_CELL) - 1;
  const gy1 = Math.floor(y1 / CLOUD_CELL) + 1;
  for (let gy = gy0; gy <= gy1; gy++) {
    for (let gx = gx0; gx <= gx1; gx++) {
      if (hash2(seed, gx, gy * 3 + 1) < 0.55) continue;
      const r = CLOUD_CELL * (0.35 + hash2(seed, gx + 9, gy) * 0.3);
      out.push({
        x: (gx + hash2(seed, gx, gy)) * CLOUD_CELL + drift,
        y: (gy + hash2(seed, gy, gx)) * CLOUD_CELL,
        rx: r,
        ry: r * CLOUD_SQUASH,
      });
    }
  }
  return out;
}
