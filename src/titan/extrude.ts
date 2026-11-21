import masks from './itemMasks.json';

/**
 * Extrusão de sprite (ADR 0087), no modelo do `ItemModelGenerator` do Minecraft: a malha do item plano é a frente e o verso do sprite (um quadrado por pixel opaco) mais uma tirinha lateral de
 * `depth` onde o pixel opaco faz fronteira com um transparente. Puro e sem canvas: a máscara de pixels vem pronta de `itemMasks.json` (script `make-titan-item-masks.py`), porque ler um canvas
 * pode ser bloqueado no Artifact. As posições saem centradas em [−0,5, 0,5] (x à direita, y acima, z para a câmera) e as UVs em coordenadas do sprite (u à direita, v acima, 0–1).
 */
export interface Extruded {
  pos: number[]; uv: number[]; nrm: number[]; idx: number[];
  /** Quadrados gerados (cada um vale 2 triângulos). */
  quads: number;
}

/** Decodifica `hex` (1 bit por pixel, linha por linha, bit mais alto primeiro) em 0/1 de `w × h`. */
export function maskFromHex(hex: string, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = (parseInt(hex[i >> 2] ?? '0', 16) >> (3 - (i & 3))) & 1;
  return out;
}

/** Máscara do ícone do item (`w × h`), ou null se o item não tem ícone. */
export function itemMask(item: number): { mask: Uint8Array; w: number; h: number } | null {
  const hex = (masks.items as Record<string, string>)[String(item)];
  return hex ? { mask: maskFromHex(hex, masks.w, masks.h), w: masks.w, h: masks.h } : null;
}

/** Inset das UVs da frente e do verso (fração de pixel): evita que o filtro leia o pixel vizinho do atlas. */
const INSET = 0.02;

export function extrudeMask(mask: ArrayLike<number>, w: number, h: number, depth: number): Extruded {
  const out: Extruded = { pos: [], uv: [], nrm: [], idx: [], quads: 0 };
  const solid = (x: number, y: number): boolean => x >= 0 && x < w && y >= 0 && y < h && mask[y * w + x] > 0;
  const d = depth / 2;
  const quad = (p: ReadonlyArray<readonly [number, number, number]>, n: readonly [number, number, number], u: number, v: number, du = 0, dv = 0): void => {
    const base = out.pos.length / 3;
    p.forEach((q, i) => {
      out.pos.push(q[0], q[1], q[2]);
      out.nrm.push(n[0], n[1], n[2]);
      // frente e verso usam o quadrado do pixel (com inset); as laterais, o centro do pixel (uma cor só)
      const cu = du ? u + (i === 1 || i === 2 ? du : 0) : u, cv = dv ? v + (i >= 2 ? dv : 0) : v;
      out.uv.push(cu, cv);
    });
    out.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    out.quads++;
  };
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
    if (!solid(px, py)) continue;
    const x0 = px / w - 0.5, x1 = (px + 1) / w - 0.5, y1 = 0.5 - py / h, y0 = 0.5 - (py + 1) / h;
    const u0 = (px + INSET) / w, v0 = 1 - (py + 1 - INSET) / h, du = (1 - 2 * INSET) / w, dv = (1 - 2 * INSET) / h;
    const uc = (px + 0.5) / w, vc = 1 - (py + 0.5) / h;
    quad([[x0, y0, d], [x1, y0, d], [x1, y1, d], [x0, y1, d]], [0, 0, 1], u0, v0, du, dv); // frente
    quad([[x1, y0, -d], [x0, y0, -d], [x0, y1, -d], [x1, y1, -d]], [0, 0, -1], u0, v0, du, dv); // verso (o mesmo pixel; a UV segue o canto, só o sentido do desenho muda)
    if (!solid(px - 1, py)) quad([[x0, y0, -d], [x0, y0, d], [x0, y1, d], [x0, y1, -d]], [-1, 0, 0], uc, vc);
    if (!solid(px + 1, py)) quad([[x1, y0, d], [x1, y0, -d], [x1, y1, -d], [x1, y1, d]], [1, 0, 0], uc, vc);
    if (!solid(px, py - 1)) quad([[x0, y1, d], [x1, y1, d], [x1, y1, -d], [x0, y1, -d]], [0, 1, 0], uc, vc);
    if (!solid(px, py + 1)) quad([[x0, y0, -d], [x1, y0, -d], [x1, y0, d], [x0, y0, d]], [0, -1, 0], uc, vc);
  }
  return out;
}
