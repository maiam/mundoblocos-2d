import type { SanctuaryV2Id } from './sanctuaryV2Materials';

export type SanctuarySector = 'A' | 'B' | 'C' | 'D';
export interface SanctuaryV2Cell {
  x: number;
  y: number;
  height: number;
  side: SanctuaryV2Id;
  top: SanctuaryV2Id;
  section: SanctuarySector;
  /** Demonstration volume only: does not take part in player physics or save. */
  floating?: boolean;
}

/**
 * A fixed 80×32 reference scene: materials, architecture, natural relief,
 * and a composed miniature sanctuary. Coordinates are local to the sanctuary.
 *
 * Deliberately independent from World/MAX_STACK: columns of height 4–5 and
 * the suspended island are preview meshes, never object levels or save data.
 */
export function sanctuaryV2Plan(): SanctuaryV2Cell[] {
  const cells = new Map<string, SanctuaryV2Cell>();
  const put = (
    x: number, y: number, height: number, side: SanctuaryV2Id,
    section: SanctuarySector, top: SanctuaryV2Id = side, floating = false,
  ) => {
    if (x < 0 || x >= 80 || y < 0 || y >= 32 || height < 1 || height > 5)
      throw new Error('Célula do laboratório V2 fora dos limites ou da altura 1–5.');
    cells.set(x + ',' + y, { x, y, height, side, top, section, ...(floating ? { floating: true } : {}) });
  };
  const rect = (x0: number, y0: number, width: number, depth: number, height: number,
    side: SanctuaryV2Id, section: SanctuarySector, top: SanctuaryV2Id = side) => {
    for (let y = y0; y < y0 + depth; y++) for (let x = x0; x < x0 + width; x++)
      put(x, y, height, side, section, top);
  };
  // A — six test stations: isolated, 3-level, 5-level, 2×2 floor sample.
  for (const [index, id] of ([80, 81, 82, 83, 84, 85] as const).entries()) {
    const x = 4 + index * 6;
    put(x, 4, 1, id, 'A');
    put(x, 7, 3, id, 'A');
    put(x, 10, 5, id, 'A');
    rect(x - 1, 12, 2, 2, 1, id, 'A');
  }

  // B1 — nine-by-nine sacred square; ornament cross and golden border.
  rect(44, 3, 9, 9, 1, 82, 'B');
  for (let y = 3; y <= 11; y++) for (let x = 44; x <= 52; x++) {
    if (x === 44 || x === 52 || y === 3 || y === 11) put(x, y, 1, 85, 'B');
    else if (x === 48 || y === 7) put(x, y, 1, 83, 'B');
  }
  for (const [x, y] of [[45, 4], [51, 4], [45, 10], [51, 10]]) put(x, y, 3, 84, 'B', 85);

  // B2 — three-step altar (7×6 -> 5×4 -> 3×2).
  rect(55, 5, 7, 6, 1, 84, 'B');
  rect(56, 6, 5, 4, 2, 84, 'B', 82);
  rect(57, 7, 3, 2, 3, 84, 'B', 83);
  put(58, 7, 3, 85, 'B', 83);
  // B3 — construction corridor and two walls, with a central opening.
  for (let x = 66; x <= 75; x++) {
    if (x !== 70 && x !== 71) put(x, 4, 3, 84, 'B', x % 3 === 0 ? 85 : 84);
    if (x !== 70 && x !== 71) put(x, 9, 2, 84, 'B');
  }
  for (let y = 5; y <= 8; y++) {
    put(66, y, 2, 84, 'B');
    put(75, y, 2, 84, 'B');
  }

  // C1 — small rounded natural hill, 1–3 levels.
  for (let y = 20; y <= 28; y++) for (let x = 3; x <= 12; x++) {
    const dist = Math.sqrt(((x - 7.5) / 5) ** 2 + ((y - 24) / 4.5) ** 2);
    const jitter = (stableHash(x, y, 17) - 0.5) * 0.2;
    const h = Math.min(3, Math.max(0, Math.ceil((1 - dist + jitter) * 3)));
    if (h) put(x, y, h, 84, 'C', h === 3 ? 80 : 84);
  }
  // C2 — asymmetric broad mountain with deterministic irregular silhouette, 1–5.
  for (let y = 19; y <= 29; y++) for (let x = 14; x <= 27; x++) {
    const dist = Math.sqrt(((x - 20.7) / 7) ** 2 + ((y - 24.2) / 5.5) ** 2);
    const jitter = (stableHash(x, y, 44) - 0.5) * 0.23;
    const h = Math.min(5, Math.max(0, Math.ceil((1 - dist + jitter) * 5)));
    if (h) put(x, y, h, h === 1 && stableHash(x, y, 11) > 0.87 ? 85 : 84,
      'C', h >= 4 && stableHash(x, y, 8) > 0.55 ? 80 : 84);
  }
  // C3 — 9×9 plateau with mild irregularities and differentiated top marble.
  for (let y = 20; y <= 28; y++) for (let x = 29; x <= 37; x++) {
    const edge = Math.min(x - 29, 37 - x, y - 20, 28 - y);
    const variation = stableHash(x, y, 33) > 0.78 ? 1 : 0;
    const h = edge === 0 ? 1 : edge === 1 ? 2 : Math.min(4, 3 + variation);
    put(x, y, h, 84, 'C', edge >= 2 ? (stableHash(x, y, 67) > 0.9 ? 83 : 82) : 84);
  }

  // D1 — compact cloud garden / decorative ethereal areas.
  rect(44, 20, 8, 8, 1, 80, 'D');
  for (let y = 20; y <= 27; y++) for (let x = 44; x <= 51; x++)
    if (stableHash(x, y, 19) > 0.82) put(x, y, 1, 81, 'D');
  // D2 — winding marble path.
  for (let x = 44; x <= 69; x++) {
    const center = 23 + Math.round(Math.sin((x - 44) * 0.42));
    for (let dy = -1; dy <= 1; dy++)
      put(x, center + dy, 1, dy === 0 && x % 7 === 0 ? 85 : 82, 'D');
  }
  // D3 — 7×7 sanctuary plaza and the stepped central altar.
  rect(57, 19, 7, 9, 1, 82, 'D');
  rect(58, 21, 5, 5, 2, 84, 'D', 82);
  rect(59, 22, 3, 3, 3, 84, 'D', 83);
  put(60, 23, 3, 85, 'D', 83);
  // D4 — elevated island: an isolated visual mesh, not logical stack.
  for (let y = 18; y <= 22; y++) for (let x = 71; x <= 75; x++) {
    if ((x === 71 || x === 75) && (y === 18 || y === 22)) continue;
    put(x, y, 1, 80, 'D', x === 73 && y === 20 ? 83 : 82, true);
  }
  return [...cells.values()].sort((a, b) => a.y - b.y || a.x - b.x);
}

function stableHash(x: number, y: number, seed: number): number {
  let n = Math.imul(x + seed, 374761393) ^ Math.imul(y - seed, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

export const SANCTUARY_V2_SECTORS = {
  A: { label: 'A — Materiais', x: 20, y: 8 },
  B: { label: 'B — Construções', x: 60, y: 8 },
  C: { label: 'C — Relevo', x: 20, y: 24 },
  D: { label: 'D — Mini Santuário', x: 60, y: 24 },
} as const;
