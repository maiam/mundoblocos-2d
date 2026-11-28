import { extrudeMask, itemMask, type Extruded } from '../titan/extrude';
import { Item } from '../titan/items';
import type { ModelData } from './art/titan';

/**
 * Modelo da Tocha do Orvalis (ADR 0121), sem arquivo: o sprite de 16 × 16 da Tocha vira malha extrudada (`extrudeMask`, a regra visual de itens do ADR 0097), com a textura do atlas de itens
 * (célula do item 85 = Tocha em pé; célula 86 = a Tocha de parede, que **não é item**: só a textura). Em pé: dois planos cruzados a 90° (lê-se de qualquer lado), 0,7 × o sprite (a Wiki tem 2 × 10 px:
 * o sprite tem 3 × 14), com a base na célula. De parede: um plano só, no sentido da chama (+z local, como a escada: `ladderFacing`), com a parte de baixo do sprite colada na parede (z = −0,5) e a ponta
 * inclinada para fora, a meia altura da célula. O giro vem da matriz da instância (`turn × 90°`).
 */
export const WALL_TORCH_SPRITE = 86;
const SCALE = 0.7, DEPTH = 3 / 16, WALL_INSET = 0.03, WALL_MID = 0.55;

/** UV do sprite (0–1) → célula `item` do atlas de itens (4 colunas × `rows` linhas), o mesmo mapeamento do item na mão. */
const atlasUv = (ex: Extruded, item: number, rows: number): number[] => ex.uv.map((v, i) => (i % 2 === 0 ? (((item - 1) % 4) + v) / 4 : 1 - ((((item - 1) / 4) | 0) + (1 - v)) / rows));

/** Cópia transformada: `f` leva posição e normal. */
function mapped(ex: Extruded, item: number, rows: number, f: (p: [number, number, number]) => [number, number, number], fn: (n: [number, number, number]) => [number, number, number]): ModelData {
  const pos: number[] = [], nrm: number[] = [];
  for (let i = 0; i < ex.pos.length; i += 3) { pos.push(...f([ex.pos[i], ex.pos[i + 1], ex.pos[i + 2]])); nrm.push(...fn([ex.nrm[i], ex.nrm[i + 1], ex.nrm[i + 2]])); }
  return { size: [1, 1, 1], pos, nrm, uv: atlasUv(ex, item, rows), idx: [...ex.idx] };
}

function merge(a: ModelData, b: ModelData): ModelData {
  const base = a.pos.length / 3;
  return { size: a.size, pos: [...a.pos, ...b.pos], nrm: [...a.nrm, ...b.nrm], uv: [...a.uv, ...b.uv], idx: [...a.idx, ...b.idx.map((i) => i + base)] };
}

/** Caixa (x, y, z mínimos e máximos, em unidades do sprite 0–1) dos pixels opacos da máscara; y vai de baixo para cima como na malha. */
function bounds(m: { mask: Uint8Array; w: number; h: number }): { x0: number; x1: number; y0: number; y1: number } {
  let x0 = m.w, x1 = -1, y0 = m.h, y1 = -1;
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.mask[y * m.w + x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { x0: x0 / m.w - 0.5, x1: (x1 + 1) / m.w - 0.5, y0: 0.5 - (y1 + 1) / m.h, y1: 0.5 - y0 / m.h };
}

export function tochaModels(rows: number): { standing: ModelData; wall: ModelData } {
  const vm = itemMask(Item.TOCHA), wm = itemMask(WALL_TORCH_SPRITE);
  if (!vm || !wm) throw new Error('máscara da Tocha ausente (itemMasks.json)');
  const vb = bounds(vm), wb = bounds(wm);
  const ve = extrudeMask(vm.mask, vm.w, vm.h, DEPTH), we = extrudeMask(wm.mask, wm.w, wm.h, DEPTH);
  const lift = -vb.y0 * SCALE; // a base do sprite em y = 0
  const a = mapped(ve, Item.TOCHA, rows, (p) => [p[0] * SCALE, p[1] * SCALE + lift, p[2] * SCALE], (n) => n);
  const b = mapped(ve, Item.TOCHA, rows, (p) => [p[2] * SCALE, p[1] * SCALE + lift, -p[0] * SCALE], (n) => [n[2], n[1], -n[0]]); // o mesmo sprite girado 90° em torno de Y
  const tz = -0.5 + WALL_INSET - wb.x0 * SCALE, ty = WALL_MID - ((wb.y0 + wb.y1) / 2) * SCALE;
  const wall = mapped(we, WALL_TORCH_SPRITE, rows, (p) => [-p[2] * SCALE, p[1] * SCALE + ty, p[0] * SCALE + tz], (n) => [-n[2], n[1], n[0]]); // +x do sprite → +z local (para fora da parede)
  return { standing: merge(a, b), wall };
}

/** Fogueira do Orvalis (ADR 0146): o ícone de 32 px (item 176) extrudado em dois planos cruzados a 90°, 1 bloco de largura, com a base na célula; lê-se de qualquer lado. */
export function fogueiraModel(rows: number): ModelData {
  const m = itemMask(Item.FOGUEIRA);
  if (!m) throw new Error('máscara da Fogueira ausente (itemMasks.json)');
  const b = bounds(m), e = extrudeMask(m.mask, m.w, m.h, DEPTH), S = 1, lift = -b.y0 * S;
  const a = mapped(e, Item.FOGUEIRA, rows, (p) => [p[0] * S, p[1] * S + lift, p[2] * S], (n) => n);
  const c = mapped(e, Item.FOGUEIRA, rows, (p) => [p[2] * S, p[1] * S + lift, -p[0] * S], (n) => [n[2], n[1], -n[0]]);
  return merge(a, c);
}

/** Altura (m) do modelo em pé: a caixa de mira da tocha usa esta medida. */
export const TORCH_HEIGHT = 0.7;
