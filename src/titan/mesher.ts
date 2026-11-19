import type { TitanVolume } from './volume';
import { isSolid, SECTION, T, tileFor, type Face, Y_MIN } from './voxel';

/**
 * Malha de uma seção 16³ (ADR 0039): só faces expostas, lendo os vizinhos do outro lado das bordas (cópia com margem de 1 bloco), para a
 * junção entre seções e chunks não ter frestas nem faces escondidas duplicadas. Sem Three.js: devolve arrays (o renderer monta a `BufferGeometry`).
 * Luz de tarde fixa embutida na cor dos vértices (sol baixo vindo de +X/−Z); névoa âmbar é do material.
 */
export interface MeshData { pos: Float32Array; uv: Float32Array; col: Float32Array; idx: Uint32Array }
export interface SectionMesh { opaque: MeshData | null; liquid: MeshData | null }

const ATLAS_W = 80, ATLAS_H = 40, PITCH = 20, PAD = 2, TILE = 16;
/** UV (u0, v0, u1, v1) de um tile do atlas 4 × 2; v do WebGL cresce para cima (textura com flipY). */
export function tileUV(tile: number): [number, number, number, number] {
  const col = tile % 4, row = (tile / 4) | 0;
  const x = col * PITCH + PAD, y = row * PITCH + PAD;
  return [x / ATLAS_W, 1 - (y + TILE) / ATLAS_H, (x + TILE) / ATLAS_W, 1 - y / ATLAS_H];
}

// face: normal e os 4 cantos (CCW visto de fora), com (u, v) por canto
const FACES = [
  { n: [1, 0, 0], light: 0.86, f: 'side' as Face, c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
  { n: [-1, 0, 0], light: 0.66, f: 'side' as Face, c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { n: [0, 1, 0], light: 1, f: 'top' as Face, c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { n: [0, -1, 0], light: 0.5, f: 'bottom' as Face, c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { n: [0, 0, 1], light: 0.78, f: 'side' as Face, c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { n: [0, 0, -1], light: 0.7, f: 'side' as Face, c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
];
const CORNER_UV = [[0, 0], [1, 0], [1, 1], [0, 1]];
/** A rocha-mãe é mais escura que a rocha comum. */
const TINT: Record<number, number> = { [T.BEDROCK]: 0.55 };

class Builder {
  pos: number[] = []; uv: number[] = []; col: number[] = []; idx: number[] = [];
  face(x: number, y: number, z: number, fi: number, tile: number, tint: number): void {
    const F = FACES[fi];
    const [u0, v0, u1, v1] = tileUV(tile);
    const base = this.pos.length / 3;
    const shade = F.light * tint;
    for (let k = 0; k < 4; k++) {
      const c = F.c[k];
      this.pos.push(x + c[0], y + c[1], z + c[2]);
      this.uv.push(CORNER_UV[k][0] ? u1 : u0, CORNER_UV[k][1] ? v1 : v0);
      this.col.push(shade, shade, shade);
    }
    this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  done(): MeshData | null {
    return this.idx.length ? { pos: new Float32Array(this.pos), uv: new Float32Array(this.uv), col: new Float32Array(this.col), idx: new Uint32Array(this.idx) } : null;
  }
}

/** Malha da seção (cx, sy, cz) do volume. As posições saem em coordenadas globais do mundo. */
export function meshSection(vol: TitanVolume, cx: number, sy: number, cz: number): SectionMesh {
  const x0 = cx * 16, z0 = cz * 16, y0 = Y_MIN + sy * SECTION;
  const N = SECTION + 2;
  const cells = new Uint8Array(N * N * N); // índice ((ly+1) * N + (lz+1)) * N + (lx+1)
  let any = false;
  for (let ly = -1; ly <= SECTION; ly++) for (let lz = -1; lz <= SECTION; lz++) for (let lx = -1; lx <= SECTION; lx++) {
    const id = vol.get(x0 + lx, y0 + ly, z0 + lz);
    cells[((ly + 1) * N + (lz + 1)) * N + (lx + 1)] = id;
    if (id !== T.AIR && ly >= 0 && ly < SECTION && lx >= 0 && lx < SECTION && lz >= 0 && lz < SECTION) any = true;
  }
  if (!any) return { opaque: null, liquid: null };
  const op = new Builder(), lq = new Builder();
  const at = (lx: number, ly: number, lz: number): number => cells[((ly + 1) * N + (lz + 1)) * N + (lx + 1)];
  for (let ly = 0; ly < SECTION; ly++) for (let lz = 0; lz < SECTION; lz++) for (let lx = 0; lx < SECTION; lx++) {
    const id = at(lx, ly, lz);
    if (id === T.AIR) continue;
    for (let fi = 0; fi < 6; fi++) {
      const n = FACES[fi].n;
      const nb = at(lx + n[0], ly + n[1], lz + n[2]);
      if (id === T.LAKE) {
        if (nb === T.AIR) lq.face(x0 + lx, y0 + ly, z0 + lz, fi, tileFor(id, 'top'), 1); // só a superfície (e bordas expostas ao ar)
      } else if (!isSolid(nb)) {
        op.face(x0 + lx, y0 + ly, z0 + lz, fi, tileFor(id, FACES[fi].f), TINT[id] ?? 1);
      }
    }
  }
  return { opaque: op.done(), liquid: lq.done() };
}
