import type { ModelData } from './art/titan';

/**
 * Modelos 3D da Cerca e do Portão de madeira (ADR 0140), gerados em código (sem arquivo): caixas finas com a textura da tábua da madeira, na tira de 3 tiles de 16 px
 * `titan-cerca-madeira.webp` (carvalho | cerejeira | bétula; `scripts/make-orvalis-madeira-familia.py`). Medidas em px de 16 (Wiki: poste de 4 px, 1 m de altura visual).
 * A cerca sai por madeira × máscara de conexão (bits N 1, E 2, S 4, W 8, como a mureta): poste central e, por vizinho ligado, duas travessas de 2 px de espessura.
 * O portão sai por madeira × estado (fechado/aberto) com giro 0 (abre para +Z); o giro vai na instância. A textura segue a direção desenhada: topo por (x, z), laterais por (posição, 1 − y).
 */
type Box = readonly [number, number, number, number, number, number]; // x0, y0, z0, x1, y1, z1 em px (0–16)
const EPS = 0.5 / 48; // meio texel de recuo nas bordas dos tiles da tira

function boxData(boxes: readonly Box[], wood: number): ModelData {
  const pos: number[] = [], nrm: number[] = [], uv: number[] = [], idx: number[] = [];
  for (const [ax0, ay0, az0, ax1, ay1, az1] of boxes) {
    const [x0, y0, z0, x1, y1, z1] = [ax0 / 16, ay0 / 16, az0 / 16, ax1 / 16, ay1 / 16, az1 / 16];
    const faces: Array<{ c: [number, number, number][]; n: [number, number, number]; uv: (x: number, y: number, z: number) => [number, number] }> = [
      { c: [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], n: [0, 1, 0], uv: (x, _y, z) => [x, z] },
      { c: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], n: [0, -1, 0], uv: (x, _y, z) => [x, z] },
      { c: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], n: [0, 0, 1], uv: (x, y) => [x, 1 - y] },
      { c: [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], n: [0, 0, -1], uv: (x, y) => [1 - x, 1 - y] },
      { c: [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], n: [1, 0, 0], uv: (_x, y, z) => [1 - z, 1 - y] },
      { c: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], n: [-1, 0, 0], uv: (_x, y, z) => [z, 1 - y] },
    ];
    for (const f of faces) {
      const base = pos.length / 3;
      for (const [x, y, z] of f.c) {
        pos.push(+(x - 0.5).toFixed(4), +y.toFixed(4), +(z - 0.5).toFixed(4));
        nrm.push(...f.n);
        const [u, v] = f.uv(x, y, z);
        uv.push(+((wood + Math.min(Math.max(u, 0), 1) * (1 - 6 * EPS) + 3 * EPS) / 3).toFixed(5), +Math.min(Math.max(v, 1 / 32), 1 - 1 / 32).toFixed(5));
      }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  return { size: [1, 1, 1], pos, nrm, uv, idx };
}

const cache = new Map<string, ModelData>();
const memo = (key: string, make: () => ModelData): ModelData => { const hit = cache.get(key); if (hit) return hit; const out = make(); cache.set(key, out); return out; };

/** Cerca da madeira `wood` (0 carvalho, 1 cerejeira, 2 bétula) com a máscara de conexão `mask`. */
export function fenceModelData(wood: number, mask: number): ModelData {
  return memo(`f${wood}:${mask}`, () => {
    const boxes: Box[] = [[6, 0, 6, 10, 16, 10]];
    for (const [y0, y1] of [[6, 9], [12, 15]] as const) {
      if (mask & 1) boxes.push([7, y0, 0, 9, y1, 6]);   // norte (−Z)
      if (mask & 2) boxes.push([10, y0, 7, 16, y1, 9]); // leste (+X)
      if (mask & 4) boxes.push([7, y0, 10, 9, y1, 16]); // sul (+Z)
      if (mask & 8) boxes.push([0, y0, 7, 6, y1, 9]);   // oeste (−X)
    }
    return boxData(boxes, wood);
  });
}

/** Portão da madeira `wood`, giro 0 (abre para +Z): fechado = painel de 2 px entre dois postes; aberto = as duas folhas recolhidas em ângulo reto para +Z. */
export function gateModelData(wood: number, open: boolean): ModelData {
  return memo(`g${wood}:${open}`, () => {
    const boxes: Box[] = [[0, 5, 7, 2, 16, 9], [14, 5, 7, 16, 16, 9]]; // os postes das pontas
    if (!open) boxes.push([2, 6, 7, 14, 9, 9], [2, 12, 7, 14, 15, 9], [7, 9, 7, 9, 12, 9]);
    else for (const [x0, x1] of [[0, 2], [14, 16]] as const) boxes.push([x0, 6, 9, x1, 9, 15], [x0, 12, 9, x1, 15, 15], [x0, 9, 13, x1, 12, 15]);
    return boxData(boxes, wood);
  });
}
