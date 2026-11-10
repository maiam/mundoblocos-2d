/**
 * Aperiodic-looking, world-aligned cloud painting from one user-provided 128px tile.
 * Each smooth lattice corner samples the same hand-painted art at a different,
 * deterministic phase. Four phases are blended without introducing tile borders.
 * The resulting large tile repeats only every 16 WORLD cells, never every block.
 *
 * CPU-only: no Three.js, DOM, or external random state. Small, testable helper.
 */
export const CLOUD_PATTERN_CELLS = 16;
const NODES = 4;
const SRC = 128;

function hash(x: number, y: number, salt: number): number {
  let h = Math.imul(x + 0x7f4a7c15, 0x9e3779b1) ^ Math.imul(y + 0x3c6ef372, 0x85ebca6b) ^ salt;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
}
const smooth = (t: number): number => t * t * (3 - 2 * t);
const periodic = (n: number): number => ((n % NODES) + NODES) % NODES;

/** Build square RGBA image bytes. Edges match exactly (safe for RepeatWrapping). */
export function synthesizeCloudPattern(
  source: Uint8ClampedArray,
  size = 768,
  salt = 0,
): Uint8ClampedArray {
  if (source.length !== SRC * SRC * 4) throw new Error('A textura-fonte deve ser RGBA 128×128.');
  if (!Number.isInteger(size) || size < 16 || size > 2048) throw new Error('Tamanho de textura inválido.');
  const output = new Uint8ClampedArray(size * size * 4);
  // Exactly four source cycles across the macro tile; no discontinuity at wrap.
  const ratio = SRC * NODES / size;
  const phase = (x: number, y: number) => ({
    u: hash(periodic(x), periodic(y), salt + 51) & 127,
    v: hash(periodic(x), periodic(y), salt + 587) & 127,
  });
  const phases = Array.from({ length: NODES + 1 }, (_, y) =>
    Array.from({ length: NODES + 1 }, (_, x) => phase(x, y)));

  for (let y = 0; y < size; y++) {
    const gy = y * NODES / size;
    const cy = Math.floor(gy), fy = smooth(gy - cy);
    const sy = y * ratio;
    for (let x = 0; x < size; x++) {
      const gx = x * NODES / size;
      const cx = Math.floor(gx), fx = smooth(gx - cx);
      const sx = x * ratio;
      const p00 = phases[cy][cx], p10 = phases[cy][cx + 1];
      const p01 = phases[cy + 1][cx], p11 = phases[cy + 1][cx + 1];
      // Bilinear *phase* blend. The patches are periodic, but the blend isn't
      // repeated per original 128px source tile.
      const weights = [(1 - fx) * (1 - fy), fx * (1 - fy), (1 - fx) * fy, fx * fy];
      const points = [p00, p10, p01, p11];
      const k = (y * size + x) * 4;
      for (let ch = 0; ch < 3; ch++) {
        let value = 0;
        for (let i = 0; i < 4; i++) {
          const u = (Math.floor(sx + points[i].u)) & 127;
          const v = (Math.floor(sy + points[i].v)) & 127;
          value += source[(v * SRC + u) * 4 + ch] * weights[i];
        }
        output[k + ch] = Math.round(value);
      }
      output[k + 3] = 255;
    }
  }
  // Explicit seam pixel equality eliminates filtering artifacts at UV wrap.
  for (let y = 0; y < size; y++) {
    const dst = (y * size + size - 1) * 4, src = y * size * 4;
    for (let c = 0; c < 4; c++) output[dst + c] = output[src + c];
  }
  for (let x = 0; x < size; x++) {
    const dst = ((size - 1) * size + x) * 4, src = x * 4;
    for (let c = 0; c < 4; c++) output[dst + c] = output[src + c];
  }
  return output;
}
