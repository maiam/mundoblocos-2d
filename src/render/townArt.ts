import { TILE } from '../config';
import { Block, type BlockId } from '../world/blocks';
import { townSize, townSolid } from '../world/town';
import type { Sprite } from './textures';

/**
 * Arte da Cidade do Despertar, pintada em código (sem imagens: não pesa no artefato). Estilo ilustração de RPG
 * 2D/anime: contorno escuro quente, cores chapadas com luz de cima-esquerda, janelas acesas.
 * Cada construção é UM sprite sobre o canto inferior esquerdo da área que ocupa (as outras células são
 * `TOWN_PART`, sem arte): topo = telhado visto de cima (profundidade × TILE) e frente = parede (altura própria).
 * Variações (cor do telhado, estilo, chaminé) são escolhidas pelo render por posição, fixas como a cidade.
 * Casas de telhado vermelho usam as imagens fornecidas, uma por tamanho (`town-house-red-WxD`, via pacote de arte).
 */

/** Imagens da cidade vindas do pacote de arte, por nome (`town-<nome>`, `scripts/extract-town.py`). */
export type TownImages = Map<string, HTMLImageElement>;

/** Escala das imagens da cidade: px da imagem por célula (o recorte já sai nesta escala). */
export const TOWN_PX_PER_CELL = 48;

/** Construções/enfeites desenhados com imagem fornecida: variações sorteadas por posição. */
const IMAGE_ART: Partial<Record<BlockId, string[]>> = {
  [Block.HOUSE]: ['house-red-1f', 'house-blue-1f', 'house-brown-1f'],
  [Block.HOUSE_TALL]: ['house-red-2f', 'house-blue-2f', 'house-brown-2f'],
  [Block.SHOP_POTION]: ['shop-1f'],
  [Block.SHOP_GOODS]: ['shop-2f'],
  [Block.SHOP_TOOLS]: ['shop-1f'],
  [Block.SMITHY]: ['smithy'],
  [Block.GUILD]: ['guild'],
  [Block.CASTLE]: ['castle'],
  [Block.WATCHTOWER]: ['watchtower'],
  [Block.BENCH]: ['bench-2'],
  [Block.BENCH_LONG]: ['bench-3'],
  [Block.LAMP]: ['lamp-stone', 'lamp-wood', 'lamp-mixed'],
  [Block.HEDGE]: ['bush-round', 'bush-round', 'bush-tall', 'bush-wide'],
};

type Ctx = CanvasRenderingContext2D;
const T = TILE;
const RES = 2;
const INK = '#3a2630';

interface Roof { base: string; dark: string; light: string }
const ROOFS: Roof[] = [
  { base: '#c9583f', dark: '#8f3326', light: '#e8846a' }, // telha vermelha
  { base: '#4c6fae', dark: '#2f4677', light: '#7598d4' }, // ardósia azul
  { base: '#b5643a', dark: '#7a3b1f', light: '#d98c5c' }, // telha alaranjada
  { base: '#c9583f', dark: '#8f3326', light: '#e8846a' },
];
const PLASTER = '#f3e4c4';
const PLASTER_SHADE = '#dcc59c';
const TIMBER = '#6e4a30';
const STONE = '#b4aeb0';
const STONE_DARK = '#8a8389';

function makeCanvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * RES);
  c.height = Math.ceil(h * RES);
  const ctx = c.getContext('2d')!;
  ctx.scale(RES, RES);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  return [c, ctx];
}

function poly(ctx: Ctx, pts: Array<[number, number]>, fill: string, stroke: string | null = INK, lw = 1.4): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

function box(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, stroke: string | null = INK, lw = 1.4): void {
  poly(ctx, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], fill, stroke, lw);
}

function shadow(ctx: Ctx, cx: number, cy: number, rx: number, ry: number): void {
  ctx.fillStyle = 'rgba(30, 20, 60, 0.28)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Pedras em fiadas (muralha, fundações). */
function stoneCourses(ctx: Ctx, x: number, y: number, w: number, h: number, fill = STONE, joint = STONE_DARK, course = 7): void {
  box(ctx, x, y, w, h, fill, null);
  ctx.strokeStyle = joint;
  ctx.lineWidth = 0.8;
  for (let r = 0, yy = y + course; yy < y + h; r++, yy += course) {
    ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke();
  }
  for (let r = 0, yy = y; yy < y + h; r++, yy += course) {
    for (let xx = x + (r % 2 ? 6 : 0); xx < x + w; xx += 12) {
      ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, Math.min(y + h, yy + course)); ctx.stroke();
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x, y, w, 1.2);
}

function windowLit(ctx: Ctx, x: number, y: number, w = 9, h = 10, arch = false): void {
  ctx.beginPath();
  if (arch) {
    ctx.moveTo(x, y + h); ctx.lineTo(x, y + w / 2); ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w, y + h);
  } else ctx.rect(x, y, w, h);
  ctx.closePath();
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, '#fff3b0');
  g.addColorStop(1, '#f2b84b');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.strokeStyle = TIMBER;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y + (arch ? 1 : 0)); ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h * 0.55); ctx.lineTo(x + w, y + h * 0.55);
  ctx.stroke();
}

function door(ctx: Ctx, cx: number, bottom: number, w = 13, h = 20, color = '#8a5530'): void {
  const x = cx - w / 2;
  const y = bottom - h;
  ctx.beginPath();
  ctx.moveTo(x, bottom); ctx.lineTo(x, y + w / 2); ctx.arc(cx, y + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w, bottom);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(40,20,10,0.45)';
  ctx.lineWidth = 0.8;
  for (let k = 1; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x + (w * k) / 3, y + 3); ctx.lineTo(x + (w * k) / 3, bottom); ctx.stroke(); }
  ctx.fillStyle = '#f2c94c';
  ctx.beginPath(); ctx.arc(cx + w * 0.28, bottom - h * 0.42, 1.1, 0, Math.PI * 2); ctx.fill();
}

/** Plaquinha com texto (nome do estabelecimento). */
function plaque(ctx: Ctx, cx: number, cy: number, text: string, size = 7): void {
  ctx.font = `bold ${size}px Georgia, 'Times New Roman', serif`;
  const w = ctx.measureText(text).width + 8;
  const h = size + 5;
  box(ctx, cx - w / 2, cy - h / 2, w, h, '#f7e7c1', '#5a3a22', 1.2);
  ctx.fillStyle = '#4a2c18';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy + 0.5);
}

/** Telhado em duas águas com cumeeira horizontal, visto de cima (área x0..x1 × y0..y1). */
function sideRoof(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, r: Roof): void {
  const ridge = y0 + (y1 - y0) * 0.36;
  poly(ctx, [[x0 + 3, y0], [x1 - 3, y0], [x1, ridge], [x0, ridge]], r.dark);
  poly(ctx, [[x0, ridge], [x1, ridge], [x1 + 2, y1], [x0 - 2, y1]], r.base);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0 - 2, ridge, x1 - x0 + 4, y1 - ridge);
  ctx.clip();
  ctx.strokeStyle = r.dark;
  ctx.lineWidth = 0.9;
  for (let yy = ridge + 5; yy < y1; yy += 5) {
    for (let xx = x0 - 2; xx < x1 + 2; xx += 6) {
      ctx.beginPath(); ctx.arc(xx + 3, yy, 3, 0, Math.PI); ctx.stroke();
    }
  }
  ctx.restore();
  ctx.strokeStyle = r.light;
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(x0 + 1, ridge); ctx.lineTo(x1 - 1, ridge); ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(x0 - 2, y1); ctx.lineTo(x1 + 2, y1); ctx.stroke();
}

/** Telhado com cumeeira para o fundo e oitão (triângulo) na frente sobre a parede. */
function gableRoof(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, r: Roof, wallTop: number, gable: (cx: number, apex: number) => void): void {
  const cx = (x0 + x1) / 2;
  poly(ctx, [[x0 - 2, y1], [x0 + 2, y0 + 2], [cx, y0 - 2], [cx, y1 - (y1 - y0) * 0.1]], r.dark);
  poly(ctx, [[cx, y0 - 2], [x1 - 2, y0 + 2], [x1 + 2, y1], [cx, y1 - (y1 - y0) * 0.1]], r.base);
  ctx.strokeStyle = r.dark;
  ctx.lineWidth = 0.8;
  for (let k = 1; k < 6; k++) {
    const t = k / 6;
    ctx.beginPath(); ctx.moveTo(cx + (x1 - cx) * t, y0 + 1); ctx.lineTo(cx + (x1 + 2 - cx) * t, y1 - 1); ctx.stroke();
  }
  const apex = Math.max(y0 + 4, wallTop - Math.min((x1 - x0) * 0.42, (wallTop - y0) * 0.9));
  // Oitão: parede triangular + beiral grosso do telhado.
  poly(ctx, [[x0 + 3, wallTop], [cx, apex], [x1 - 3, wallTop]], PLASTER);
  gable(cx, apex);
  ctx.strokeStyle = r.base;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x0 - 3, wallTop + 3); ctx.lineTo(cx, apex - 2); ctx.lineTo(x1 + 3, wallTop + 3); ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(x0 - 4, wallTop + 1); ctx.lineTo(cx, apex - 4.5); ctx.lineTo(x1 + 4, wallTop + 1); ctx.stroke();
}

function chimney(ctx: Ctx, x: number, y: number, smoke: boolean): void {
  box(ctx, x, y, 7, 13, '#9c5a46');
  box(ctx, x - 1, y - 2, 9, 3, '#6d3a2c');
  if (!smoke) return;
  ctx.fillStyle = 'rgba(235,235,240,0.75)';
  for (const [dx, dy, r] of [[3, -6, 3.2], [6, -12, 4], [3, -19, 4.6]]) {
    ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2); ctx.fill();
  }
}

/** Parede de enxaimel (reboco + madeira) com fundação de pedra. */
function timberWall(ctx: Ctx, x: number, y: number, w: number, h: number, stoneBase: boolean): void {
  box(ctx, x, y, w, h, PLASTER);
  ctx.fillStyle = PLASTER_SHADE;
  ctx.fillRect(x + 1, y + 1, w - 2, 3);
  const base = stoneBase ? 8 : 4;
  stoneCourses(ctx, x, y + h - base, w, base, STONE, STONE_DARK, 4);
  ctx.strokeStyle = TIMBER;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (let xx = x + 1.5; xx <= x + w; xx += T / 2) { ctx.moveTo(xx, y); ctx.lineTo(xx, y + h - base); }
  ctx.moveTo(x, y + 1.5); ctx.lineTo(x + w, y + 1.5);
  ctx.moveTo(x, y + (h - base) * 0.48); ctx.lineTo(x + w, y + (h - base) * 0.48);
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.strokeRect(x, y, w, h);
}

interface HouseOpts { roof: Roof; gable: boolean; stone: boolean; chimney: boolean; smoke?: boolean }

/** Casa w×d: parede com porta na coluna central e janelas; telhado em duas águas ou com oitão. */
function house(ctx: Ctx, w: number, d: number, wallH: number, o: HouseOpts, pad: number, totalH: number, extras?: (wallTop: number, x0: number, x1: number) => void): void {
  const x0 = pad;
  const x1 = pad + w * T;
  const bottom = totalH;
  const wallTop = bottom - wallH;
  const roofTop = wallTop - d * T + 6;
  shadow(ctx, (x0 + x1) / 2 + 4, bottom - 2, (x1 - x0) / 2 + 3, 6);
  if (o.stone) {
    stoneCourses(ctx, x0, wallTop, x1 - x0, wallH);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.strokeRect(x0, wallTop, x1 - x0, wallH);
  } else timberWall(ctx, x0, wallTop, x1 - x0, wallH, true);
  // Janelas nas células sem porta; porta na coluna central.
  const doorCol = Math.floor(w / 2);
  for (let c = 0; c < w; c++) {
    if (c === doorCol) continue;
    windowLit(ctx, x0 + c * T + (T - 10) / 2, wallTop + wallH * 0.28, 10, 11);
  }
  door(ctx, x0 + doorCol * T + T / 2, bottom - 1);
  if (o.chimney) chimney(ctx, x1 - T * 0.9, roofTop - 6, o.smoke ?? false);
  if (o.gable) {
    gableRoof(ctx, x0, roofTop, x1, wallTop + 4, o.roof, wallTop + 2, (cx, apex) => {
      ctx.strokeStyle = TIMBER;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, apex + 2); ctx.lineTo(cx, wallTop + 2); ctx.stroke();
      if (wallTop - apex > 16) windowLit(ctx, cx - 4, apex + (wallTop - apex) * 0.38, 8, 8, true);
    });
  } else sideRoof(ctx, x0 - 2, roofTop, x1 + 2, wallTop + 4, o.roof);
  extras?.(wallTop, x0, x1);
}

/** Sprite sobre o canto inferior esquerdo de uma construção w×d (base na borda de baixo da célula). */
function buildingSprite(w: number, d: number, wallH: number, headroom: number, draw: (ctx: Ctx, pad: number, totalH: number) => void): Sprite {
  const pad = 6;
  const totalH = d * T + wallH + headroom;
  const [c, ctx] = makeCanvas(w * T + pad * 2, totalH);
  draw(ctx, pad, totalH);
  return { canvas: c, ox: -pad, oy: T - totalH, w: w * T + pad * 2, h: totalH, hit: { x: 0, y: T - d * T - wallH, w: w * T, h: d * T + wallH } };
}

function inn(): Sprite {
  const [w, d] = townSize(Block.INN);
  return buildingSprite(w, d, 60, 30, (ctx, pad, total) => house(ctx, w, d, 60, { roof: ROOFS[0], gable: false, stone: false, chimney: true, smoke: true }, pad, total, (wallTop, x0, x1) => {
    const cx = (x0 + x1) / 2;
    plaque(ctx, cx, wallTop - 4, 'Hospedaria', 8);
    // Placa de cama pendurada.
    box(ctx, x1 - 26, wallTop + 6, 16, 12, '#f7e7c1', '#5a3a22', 1.1);
    box(ctx, x1 - 23, wallTop + 11, 10, 4, '#c9583f', null);
    box(ctx, x1 - 23, wallTop + 9, 3, 3, '#ffffff', null);
    ctx.fillStyle = '#ffd36b';
    for (const lx of [x0 + 6, x1 - 8]) { ctx.beginPath(); ctx.arc(lx, wallTop + 22, 2.5, 0, Math.PI * 2); ctx.fill(); }
  }));
}

function fountain(): Sprite {
  const [w, d] = townSize(Block.FOUNTAIN);
  return buildingSprite(w, d, 16, 34, (ctx, pad, total) => {
    const cx = pad + (w * T) / 2;
    const cy = total - 16 - (d * T) / 2 + 6;
    const rx = (w * T) / 2 - 2;
    const ry = (d * T) / 2 - 4;
    shadow(ctx, cx + 3, total - 4, rx + 2, 7);
    // Borda frontal (cilindro) e água.
    ctx.beginPath(); ctx.ellipse(cx, cy + 16, rx, ry, 0, 0, Math.PI); ctx.lineTo(cx - rx, cy); ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, 0, true); ctx.closePath();
    ctx.fillStyle = '#a49eab'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = '#c9c4cf'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, cy, rx - 6, ry - 5, 0, 0, Math.PI * 2);
    const g = ctx.createLinearGradient(0, cy - ry, 0, cy + ry);
    g.addColorStop(0, '#7fd3f2'); g.addColorStop(1, '#3b8fd0');
    ctx.fillStyle = g; ctx.fill();
    // Coluna central e jatos.
    box(ctx, cx - 5, cy - 26, 10, 26, '#c9c4cf');
    ctx.beginPath(); ctx.ellipse(cx, cy - 26, 11, 4, 0, 0, Math.PI * 2); ctx.fillStyle = '#b4aeb8'; ctx.fill(); ctx.strokeStyle = INK; ctx.stroke();
    ctx.strokeStyle = 'rgba(200,240,255,0.95)'; ctx.lineWidth = 2;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx, cy - 34); ctx.quadraticCurveTo(cx + s * 16, cy - 44, cx + s * 22, cy - 6); ctx.stroke(); }
    ctx.fillStyle = '#ffffff';
    for (const [sx, sy] of [[-14, -2], [10, 3], [16, -5], [-6, 6]]) { ctx.beginPath(); ctx.arc(cx + sx, cy + sy, 1.3, 0, Math.PI * 2); ctx.fill(); }
  });
}

function well(): Sprite {
  const [w, d] = townSize(Block.WELL);
  return buildingSprite(w, d, 18, 40, (ctx, pad, total) => {
    const cx = pad + (w * T) / 2;
    const cy = total - 18 - (d * T) / 2 + 8;
    const rx = (w * T) / 2 - 6;
    const ry = (d * T) / 2 - 10;
    shadow(ctx, cx + 3, total - 3, rx + 4, 6);
    ctx.beginPath(); ctx.ellipse(cx, cy + 18, rx, ry, 0, 0, Math.PI); ctx.lineTo(cx - rx, cy); ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, 0, true); ctx.closePath();
    ctx.fillStyle = STONE; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = '#c9c4cf'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, cy, rx - 5, ry - 3, 0, 0, Math.PI * 2); ctx.fillStyle = '#26476b'; ctx.fill();
    for (const s of [-1, 1]) box(ctx, cx + s * (rx - 2) - 2, cy - 34, 4, 38, TIMBER);
    poly(ctx, [[cx - rx - 6, cy - 32], [cx, cy - 48], [cx + rx + 6, cy - 32]], ROOFS[0].base);
    box(ctx, cx - rx + 2, cy - 24, (rx - 2) * 2, 2.4, '#5a3a22', null);
  });
}

function stall(): Sprite {
  const [w, d] = townSize(Block.STALL);
  return buildingSprite(w, d, 30, 14, (ctx, pad, total) => {
    const x0 = pad + 2;
    const x1 = pad + w * T - 2;
    shadow(ctx, (x0 + x1) / 2 + 3, total - 2, (x1 - x0) / 2, 5);
    box(ctx, x0, total - 16, x1 - x0, 15, '#a0683c');
    for (const [k, c] of [[0, '#e8574a'], [1, '#f2c94c'], [2, '#7bc043'], [3, '#e8574a'], [4, '#f39c3d']] as const) {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x0 + 8 + k * 11, total - 18, 3.4, 0, Math.PI * 2); ctx.fill();
    }
    for (const s of [x0 + 2, x1 - 4]) box(ctx, s, total - 46, 2.5, 30, TIMBER, null);
    for (let k = 0; k < 6; k++) {
      const sx = x0 - 4 + ((x1 - x0 + 8) * k) / 6;
      poly(ctx, [[sx, total - 54], [sx + (x1 - x0 + 8) / 6, total - 54], [sx + (x1 - x0 + 8) / 6, total - 44], [sx, total - 44]], k % 2 ? '#ffffff' : '#3f6fc0', null);
    }
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.strokeRect(x0 - 4, total - 54, x1 - x0 + 8, 10);
  });
}

/** Objetos de 1 célula (enfeites fixos). */
function prop(h: number, draw: (ctx: Ctx, cx: number, bottom: number) => void): Sprite {
  const w = T + 8;
  const [c, ctx] = makeCanvas(w, h);
  draw(ctx, w / 2, h - 2);
  return { canvas: c, ox: -4, oy: T - h, w, h, hit: { x: 0, y: T - h, w: T, h } };
}

const barrel = () => prop(30, (ctx, cx, b) => {
  shadow(ctx, cx + 2, b - 2, 9, 3);
  ctx.beginPath(); ctx.ellipse(cx, b - 4, 9, 3.5, 0, 0, Math.PI); ctx.lineTo(cx - 9, b - 22); ctx.ellipse(cx, b - 22, 9, 3.5, 0, Math.PI, 0); ctx.closePath();
  ctx.fillStyle = '#9a6234'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx, b - 22, 9, 3.5, 0, 0, Math.PI * 2); ctx.fillStyle = '#b97a45'; ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#4a4b57'; ctx.lineWidth = 1.6;
  for (const y of [b - 9, b - 17]) { ctx.beginPath(); ctx.ellipse(cx, y, 9.2, 3.5, 0, 0, Math.PI); ctx.stroke(); }
});

const crates = () => prop(32, (ctx, cx, b) => {
  shadow(ctx, cx + 2, b - 2, 12, 3);
  const crate = (x: number, y: number, s: number) => {
    box(ctx, x, y, s, s, '#c08a4e');
    ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + 1, y + 1); ctx.lineTo(x + s - 1, y + s - 1); ctx.moveTo(x, y + s / 2); ctx.lineTo(x + s, y + s / 2); ctx.stroke();
  };
  crate(cx - 13, b - 14, 13);
  crate(cx, b - 13, 12);
  crate(cx - 7, b - 26, 12);
});

const signpost = () => prop(40, (ctx, cx, b) => {
  shadow(ctx, cx + 2, b - 2, 6, 2.5);
  box(ctx, cx - 1.8, b - 30, 3.6, 29, '#6e4a30');
  poly(ctx, [[cx - 13, b - 34], [cx + 10, b - 34], [cx + 15, b - 29], [cx + 10, b - 24], [cx - 13, b - 24]], '#c99a5e');
  ctx.strokeStyle = '#6e4a30'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx - 9, b - 29); ctx.lineTo(cx + 7, b - 29); ctx.stroke();
});

/**
 * Sprite de uma imagem da cidade: escala fixa (TOWN_PX_PER_CELL), centro da imagem no centro da largura da
 * construção, base no pé da célula do canto inferior esquerdo. Nada é esticado.
 */
function imageSprite(img: HTMLImageElement, id: BlockId): Sprite {
  const [w] = townSize(id);
  const d = townSolid(id);
  const k = T / TOWN_PX_PER_CELL;
  const sw = img.width * k;
  const sh = img.height * k;
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  c.getContext('2d')!.drawImage(img, 0, 0);
  return { canvas: c, ox: (w * T - sw) / 2, oy: T - sh + 1, w: sw, h: sh, hit: { x: 0, y: T - d * T, w: w * T, h: d * T } };
}

/** Sprites (com variações) de todas as construções e enfeites da cidade. */
export function townSprites(images: TownImages): Map<BlockId, Sprite[]> {
  const m = new Map<BlockId, Sprite[]>();
  for (const [key, names] of Object.entries(IMAGE_ART)) {
    const id = Number(key) as BlockId;
    const sprites = names!.map((n) => images.get(n)).filter((i): i is HTMLImageElement => !!i).map((i) => imageSprite(i, id));
    if (sprites.length) m.set(id, sprites);
  }
  // Sem imagem fornecida (ainda): pintados em código.
  m.set(Block.INN, [inn()]);
  m.set(Block.FOUNTAIN, [fountain()]);
  m.set(Block.WELL, [well()]);
  m.set(Block.STALL, [stall()]);
  m.set(Block.BARREL, [barrel()]);
  m.set(Block.CRATES, [crates()]);
  m.set(Block.SIGNPOST, [signpost()]);
  return m;
}

/** Ids desenhados pela arte da cidade (o render escolhe a variação por posição, fixa como a cidade). */
export function isTownArt(id: number): boolean {
  return id >= Block.CASTLE && id <= Block.BENCH_LONG;
}

/** Maior alcance de um sprite da cidade além da célula âncora (células): à direita e para cima. */
export const TOWN_REACH = { right: 28, up: 22 };
