/**
 * Lanterna da Margem em 3D (ADR 0043): geometria e mira do objeto. Sem DOM nem Three.js (testável em Node).
 * O objeto mede 0,375 × 0,625 × 0,375 m, pivô no centro da base, apoiado no piso da célula; a **mira** usa a caixa do objeto (com folga de toque),
 * não a célula inteira: o raio passa por onde a lanterna não está e acerta o que há atrás.
 */
export const LANTERN_SIZE: readonly [number, number, number] = [0.375, 0.625, 0.375];
/** Folga (m) em cada lado da caixa de mira: mouse e toque. O toque é mais folgado (dedo), sem chegar a engolir a célula. */
export const LANTERN_PAD_MOUSE = 0.04;
export const LANTERN_PAD_TOUCH = 0.14;

export type Box = readonly [number, number, number, number, number, number];

/** Caixa de mira da lanterna na célula (x, y, z), com folga `pad` nos lados e em cima (a base fica no piso da célula). */
export function lanternBox(x: number, y: number, z: number, pad = 0): Box {
  const hx = LANTERN_SIZE[0] / 2 + pad, hz = LANTERN_SIZE[2] / 2 + pad;
  return [x + 0.5 - hx, y, z + 0.5 - hz, x + 0.5 + hx, y + LANTERN_SIZE[1] + pad, z + 0.5 + hz];
}

/** Raio × caixa (slabs). Devolve a distância de entrada e a normal da face atingida; `null` se erra ou se a caixa está atrás. */
export function rayBox(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, b: Box): { t: number; nx: number; ny: number; nz: number } | null {
  let tmin = 0, tmax = Infinity, nx = 0, ny = 0, nz = 0;
  const o = [ox, oy, oz], d = [dx, dy, dz];
  for (let a = 0; a < 3; a++) {
    const lo = b[a], hi = b[a + 3];
    if (Math.abs(d[a]) < 1e-12) { if (o[a] < lo || o[a] > hi) return null; continue; }
    let t0 = (lo - o[a]) / d[a], t1 = (hi - o[a]) / d[a];
    let sgn = -1; // entrou pela face "baixa" do eixo: normal aponta para −eixo
    if (t0 > t1) { const s = t0; t0 = t1; t1 = s; sgn = 1; }
    if (t0 > tmin) { tmin = t0; nx = a === 0 ? sgn : 0; ny = a === 1 ? sgn : 0; nz = a === 2 ? sgn : 0; }
    if (t1 < tmax) tmax = t1;
    if (tmin > tmax) return null;
  }
  return { t: tmin, nx, ny, nz };
}
