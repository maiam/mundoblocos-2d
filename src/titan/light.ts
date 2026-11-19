import { inRegion, isSolid, Y_MAX, Y_MIN } from './voxel';

/**
 * Luz de bloco do Titã (ADR 0040): cada lanterna emite 15 e perde 1 por célula (6 vizinhas); sólidos bloqueiam. Calculada sob demanda pelo volume,
 * só na região jogável. Puro: recebe o leitor de blocos e as lanternas.
 */
export const LIGHT_MAX = 15;
export const lightKey = (x: number, y: number, z: number): number => ((x + 2048) * 4096 + (z + 2048)) * 512 + (y - Y_MIN);

const DIRS: ReadonlyArray<readonly [number, number, number]> = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

/** Níveis de luz (chave `lightKey` → 1..15) a partir das lanternas. A célula da lanterna vale 15; vence o maior valor de cada célula. */
export function computeLight(get: (x: number, y: number, z: number) => number, lanterns: Iterable<readonly [number, number, number]>): Map<number, number> {
  const out = new Map<number, number>();
  const queue: Array<[number, number, number, number]> = [];
  for (const [x, y, z] of lanterns) { out.set(lightKey(x, y, z), LIGHT_MAX); queue.push([x, y, z, LIGHT_MAX]); }
  for (let head = 0; head < queue.length; head++) {
    const [x, y, z, l] = queue[head];
    if (l <= 1) continue;
    for (const [dx, dy, dz] of DIRS) {
      const nx = x + dx, ny = y + dy, nz = z + dz;
      if (ny < Y_MIN || ny > Y_MAX || !inRegion(nx, nz)) continue;
      if (isSolid(get(nx, ny, nz))) continue; // opaco bloqueia
      const k = lightKey(nx, ny, nz);
      if ((out.get(k) ?? 0) >= l - 1) continue;
      out.set(k, l - 1);
      queue.push([nx, ny, nz, l - 1]);
    }
  }
  return out;
}
