import { TILE } from '../config';
import { Block, type BlockId } from '../world/blocks';
import { townSize } from '../world/town';
import type { Sprite } from './textures';

/**
 * Arte da Cidade do Despertar, pintada em código (sem imagens: não pesa no artefato). Estilo ilustração de RPG
 * 2D/anime: contorno escuro quente, cores chapadas com luz de cima-esquerda, janelas acesas.
 * Cada construção é UM sprite sobre o canto inferior esquerdo da área que ocupa (as outras células são
 * `TOWN_PART`, sem arte): topo = telhado visto de cima (profundidade × TILE) e frente = parede (altura própria).
 * Variações (cor do telhado, estilo, chaminé) são escolhidas pelo render por posição, fixas como a cidade.
 */

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

function banner(ctx: Ctx, x: number, y: number, w = 8, h = 16): void {
  poly(ctx, [[x, y], [x + w, y], [x + w, y + h], [x + w / 2, y + h - 3], [x, y + h]], '#2f4d9e', INK, 1);
  poly(ctx, [[x + w / 2, y + 4], [x + w / 2 + 2.2, y + 7], [x + w / 2, y + 10], [x + w / 2 - 2.2, y + 7]], '#f2c94c', null);
  ctx.fillStyle = '#c9a23a';
  ctx.fillRect(x - 1, y - 1.5, w + 2, 1.6);
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

function houseVariants(id: BlockId): Sprite[] {
  const [w, d] = townSize(id);
  const out: Sprite[] = [];
  for (let v = 0; v < 6; v++) {
    const o: HouseOpts = { roof: ROOFS[v % ROOFS.length], gable: v % 2 === 0, stone: v === 3, chimney: v % 3 !== 1, smoke: v === 2 };
    out.push(buildingSprite(w, d, 44, 26, (ctx, pad, total) => house(ctx, w, d, 44, o, pad, total)));
  }
  return out;
}

function guild(): Sprite {
  const [w, d] = townSize(Block.GUILD);
  return buildingSprite(w, d, 60, 30, (ctx, pad, total) => house(ctx, w, d, 60, { roof: ROOFS[1], gable: true, stone: false, chimney: true }, pad, total, (wallTop, x0, x1) => {
    banner(ctx, x0 + 10, wallTop + 6, 10, 22);
    banner(ctx, x1 - 20, wallTop + 6, 10, 22);
    // Escudo com espadas cruzadas sobre a porta.
    const cx = (x0 + x1) / 2;
    poly(ctx, [[cx - 9, wallTop - 20], [cx + 9, wallTop - 20], [cx + 9, wallTop - 10], [cx, wallTop - 2], [cx - 9, wallTop - 10]], '#2f4d9e');
    ctx.strokeStyle = '#e8e8f0'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 6, wallTop - 17); ctx.lineTo(cx + 6, wallTop - 6); ctx.moveTo(cx + 6, wallTop - 17); ctx.lineTo(cx - 6, wallTop - 6); ctx.stroke();
    plaque(ctx, cx, wallTop + 9, 'Guilda', 8);
  }));
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

function smithy(): Sprite {
  const [w, d] = townSize(Block.SMITHY);
  return buildingSprite(w, d, 54, 40, (ctx, pad, total) => {
    house(ctx, w, d, 54, { roof: { base: '#5b5d6e', dark: '#3a3b49', light: '#8b8da0' }, gable: false, stone: true, chimney: false }, pad, total, (wallTop, x0, x1) => {
      chimney(ctx, x0 + 14, wallTop - d * T + 2, true);
      // Forja acesa à esquerda e bigorna.
      const fx = x0 + T * 1.6;
      ctx.beginPath(); ctx.moveTo(fx - 12, total - 1); ctx.lineTo(fx - 12, total - 18); ctx.arc(fx, total - 18, 12, Math.PI, 0); ctx.lineTo(fx + 12, total - 1); ctx.closePath();
      const g = ctx.createRadialGradient(fx, total - 8, 2, fx, total - 10, 16);
      g.addColorStop(0, '#fff2a8'); g.addColorStop(0.5, '#ff9a3c'); g.addColorStop(1, '#a8361f');
      ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke();
      plaque(ctx, (x0 + x1) / 2, wallTop + 8, 'Ferreiro', 8);
      const ax = x1 - T * 1.2;
      poly(ctx, [[ax - 9, total - 12], [ax + 9, total - 12], [ax + 5, total - 8], [ax + 3, total - 2], [ax - 3, total - 2], [ax - 5, total - 8]], '#4a4b57');
    });
  });
}

function shop(id: BlockId, stripe: string, icon: (ctx: Ctx, x: number, y: number) => void, label?: string): Sprite {
  const [w, d] = townSize(id);
  return buildingSprite(w, d, 48, 34, (ctx, pad, total) => house(ctx, w, d, 48, { roof: ROOFS[id === Block.SHOP_GOODS ? 1 : 0], gable: true, stone: false, chimney: false }, pad, total, (wallTop, x0, x1) => {
    // Toldo listrado sobre a frente.
    const ay = wallTop + 14;
    for (let k = 0; k < 8; k++) {
      const sx = x0 - 2 + ((x1 - x0 + 4) * k) / 8;
      const sw = (x1 - x0 + 4) / 8;
      poly(ctx, [[sx, ay], [sx + sw, ay], [sx + sw, ay + 8], [sx, ay + 8]], k % 2 ? '#ffffff' : stripe, null);
    }
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.strokeRect(x0 - 2, ay, x1 - x0 + 4, 8);
    box(ctx, (x0 + x1) / 2 - 8, wallTop + 1, 16, 12, '#f7e7c1', '#5a3a22', 1.1);
    icon(ctx, (x0 + x1) / 2, wallTop + 7);
    if (label) plaque(ctx, (x0 + x1) / 2, wallTop - d * T + 4, label, 8);
  }));
}

function tower(): Sprite {
  const [w, d] = townSize(Block.WATCHTOWER);
  const wallH = 70;
  return buildingSprite(w, d, wallH, 10, (ctx, pad, total) => {
    const cx = pad + (w * T) / 2;
    const r = (w * T) / 2 - 3;
    const bottom = total;
    const top = bottom - wallH;
    shadow(ctx, cx + 4, bottom - 3, r + 4, 8);
    // Corpo cilíndrico com fiadas e sombreado lateral.
    ctx.save();
    ctx.beginPath(); ctx.rect(cx - r, top, r * 2, wallH); ctx.clip();
    stoneCourses(ctx, cx - r, top - 4, r * 2, wallH + 4);
    const g = ctx.createLinearGradient(cx - r, 0, cx + r, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.18)'); g.addColorStop(0.45, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(30,20,60,0.35)');
    ctx.fillStyle = g; ctx.fillRect(cx - r, top, r * 2, wallH);
    ctx.restore();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.strokeRect(cx - r, top, r * 2, wallH);
    // Topo: plataforma redonda de lajes, com ameias em volta e mastro com estandarte.
    const ry = (d * T) / 2 - 4;
    const ty = top - ry;
    const merlon = (a: number) => {
      const mx = cx + Math.cos(a) * (r - 1);
      const my = ty + Math.sin(a) * (ry - 1);
      box(ctx, mx - 4, my - 9, 8, 9, STONE, INK, 1.1);
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(mx - 4, my - 9, 8, 1.5);
    };
    for (let k = 0; k < 14; k++) { const a = Math.PI + (k / 14) * Math.PI; merlon(a); } // fundo
    ctx.beginPath(); ctx.ellipse(cx, ty, r, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#a39daa'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, ty + 2, r - 9, ry - 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#8f8998'; ctx.fill();
    ctx.strokeStyle = 'rgba(70,60,80,0.35)'; ctx.lineWidth = 0.8;
    for (const f of [0.35, 0.65]) { ctx.beginPath(); ctx.ellipse(cx, ty + 2, (r - 9) * f, (ry - 9) * f, 0, 0, Math.PI * 2); ctx.stroke(); }
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (r - 9) * 0.35, ty + 2 + Math.sin(a) * (ry - 9) * 0.35); ctx.lineTo(cx + Math.cos(a) * (r - 9), ty + 2 + Math.sin(a) * (ry - 9)); ctx.stroke();
    }
    box(ctx, cx - 1.2, ty - 30, 2.4, 32, '#5a3a22', null);
    poly(ctx, [[cx + 1, ty - 30], [cx + 18, ty - 26], [cx + 1, ty - 21]], '#2f4d9e', INK, 1);
    for (let k = 0; k <= 12; k++) { const a = (k / 12) * Math.PI; merlon(a); } // frente
    windowLit(ctx, cx - 4, top + 22, 8, 12, true);
    banner(ctx, cx - 5, top + 40, 10, 18);
  });
}

function castle(): Sprite {
  const [w, d] = townSize(Block.CASTLE);
  const wallH = 96;
  return buildingSprite(w, d, wallH, 70, (ctx, pad, total) => {
    const x0 = pad;
    const x1 = pad + w * T;
    const cx = (x0 + x1) / 2;
    const bottom = total;
    const top = bottom - wallH;
    shadow(ctx, cx + 6, bottom - 3, (x1 - x0) / 2 + 4, 9);
    // Pátio interno (topo) de lajes, muralhas laterais e do fundo, jardins nos cantos e torre de menagem.
    const inTop = top - d * T;
    box(ctx, x0, inTop, x1 - x0, d * T, '#a29cab');
    ctx.strokeStyle = '#8b8596'; ctx.lineWidth = 0.8;
    for (let yy = inTop + 16; yy < top; yy += 16) { ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x1, yy); ctx.stroke(); }
    for (let yy = inTop, r = 0; yy < top; yy += 16, r++) {
      for (let xx = x0 + (r % 2 ? 12 : 0); xx < x1; xx += 24) { ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, Math.min(top, yy + 16)); ctx.stroke(); }
    }
    for (const gx of [x0 + 20, x1 - 120]) {
      box(ctx, gx, top - 70, 100, 50, '#6fbf4a', '#3f7d2a', 1.2);
      for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? '#f6a5c0' : '#fff2a8'; ctx.beginPath(); ctx.arc(gx + 12 + k * 15, top - 45 + (k % 2) * 8, 3, 0, Math.PI * 2); ctx.fill(); }
      for (const tx of [gx + 15, gx + 85]) {
        ctx.fillStyle = '#2f7d3a'; ctx.beginPath(); ctx.ellipse(tx, top - 62, 8, 14, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#1f5a2a'; ctx.lineWidth = 1; ctx.stroke();
      }
    }
    const curtain = (x: number, y: number, w: number, h: number) => {
      stoneCourses(ctx, x, y, w, h, '#aaa5b4', '#7f7a8a', 6);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.strokeRect(x, y, w, h);
    };
    curtain(x0, inTop - 14, x1 - x0, 20);
    for (let xx = x0; xx < x1 - 4; xx += 14) box(ctx, xx, inTop - 21, 8, 7, '#aaa5b4', INK, 1);
    curtain(x0, inTop, 12, d * T);
    curtain(x1 - 12, inTop, 12, d * T);
    const kx0 = x0 + (x1 - x0) * 0.2;
    const kx1 = x1 - (x1 - x0) * 0.2;
    const kBottom = top - 20;
    const kTop = kBottom - 110;
    box(ctx, kx0, kTop - 110, kx1 - kx0, 110, '#9d97a6');
    ctx.strokeStyle = '#8b8596'; ctx.lineWidth = 0.8;
    for (let yy = kTop - 94; yy < kTop; yy += 16) { ctx.beginPath(); ctx.moveTo(kx0, yy); ctx.lineTo(kx1, yy); ctx.stroke(); }
    stoneCourses(ctx, kx0, kTop, kx1 - kx0, kBottom - kTop);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.strokeRect(kx0, kTop, kx1 - kx0, kBottom - kTop);
    for (let xx = kx0; xx < kx1 - 4; xx += 14) box(ctx, xx, kTop - 9, 8, 9, STONE);
    for (let k = 0; k < 6; k++) windowLit(ctx, kx0 + 22 + k * ((kx1 - kx0 - 44) / 5) - 5, kTop + 30, 10, 16, true);
    // Torres com telhado cônico azul.
    const spire = (tx: number, base: number, height: number, rw: number) => {
      ctx.save();
      ctx.beginPath(); ctx.rect(tx - rw, base - height, rw * 2, height); ctx.clip();
      stoneCourses(ctx, tx - rw, base - height, rw * 2, height);
      const g = ctx.createLinearGradient(tx - rw, 0, tx + rw, 0);
      g.addColorStop(0, 'rgba(255,255,255,0.2)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(30,20,60,0.35)');
      ctx.fillStyle = g; ctx.fillRect(tx - rw, base - height, rw * 2, height);
      ctx.restore();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.strokeRect(tx - rw, base - height, rw * 2, height);
      poly(ctx, [[tx - rw - 4, base - height + 2], [tx, base - height - rw * 2.3], [tx + rw + 4, base - height + 2]], '#3f5fa8');
      poly(ctx, [[tx, base - height - rw * 2.3], [tx + rw + 4, base - height + 2], [tx + 2, base - height + 2]], '#2c4580', null);
      ctx.strokeStyle = '#c9a23a'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(tx, base - height - rw * 2.3); ctx.lineTo(tx, base - height - rw * 2.3 - 8); ctx.stroke();
      poly(ctx, [[tx, base - height - rw * 2.3 - 8], [tx + 7, base - height - rw * 2.3 - 6], [tx, base - height - rw * 2.3 - 4]], '#f2c94c', null);
      windowLit(ctx, tx - 4, base - height + 14, 8, 12, true);
    };
    spire(kx0 + 6, kBottom, 150, 14);
    spire(kx1 - 6, kBottom, 150, 14);
    spire(cx - 70, kBottom - 60, 120, 12);
    spire(cx + 70, kBottom - 60, 120, 12);
    spire(cx, kBottom - 30, 170, 17);
    // Muralha da frente com ameias, estandartes e portão.
    stoneCourses(ctx, x0, top, x1 - x0, wallH, '#aaa5b4', '#7f7a8a', 8);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.strokeRect(x0, top, x1 - x0, wallH);
    for (let xx = x0; xx < x1 - 4; xx += 14) box(ctx, xx, top - 9, 8, 9, '#aaa5b4');
    for (const bx of [x0 + 70, x0 + 150, x1 - 160, x1 - 80]) banner(ctx, bx, top + 18, 14, 34);
    for (let k = 0; k < 10; k++) if (k !== 4 && k !== 5) windowLit(ctx, x0 + 40 + k * ((x1 - x0 - 80) / 9) - 5, top + 62, 9, 13, true);
    // Portão em arco.
    const gw = 44;
    ctx.beginPath(); ctx.moveTo(cx - gw / 2 - 5, bottom); ctx.lineTo(cx - gw / 2 - 5, bottom - 50); ctx.arc(cx, bottom - 50, gw / 2 + 5, Math.PI, 0); ctx.lineTo(cx + gw / 2 + 5, bottom); ctx.closePath();
    ctx.fillStyle = '#8a8494'; ctx.fill(); ctx.strokeStyle = INK; ctx.stroke();
    door(ctx, cx, bottom - 1, gw, 66, '#7a4626');
    ctx.fillStyle = '#3a3b49';
    for (let yy = bottom - 50; yy < bottom - 4; yy += 10) for (let xx = cx - gw / 2 + 5; xx < cx + gw / 2 - 2; xx += 8) ctx.fillRect(xx, yy, 1.6, 1.6);
    // Torres da frente.
    for (const tx of [x0 + 14, x0 + 260, x1 - 260, x1 - 14]) spire(tx, bottom, wallH + 26, 16);
    plaque(ctx, cx, top + 16, 'Castelo', 11);
  });
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

const lamp = () => prop(58, (ctx, cx, b) => {
  shadow(ctx, cx + 3, b - 2, 7, 3);
  box(ctx, cx - 4, b - 6, 8, 5, '#3a3b49');
  box(ctx, cx - 1.5, b - 42, 3, 37, '#3a3b49', null);
  box(ctx, cx - 6, b - 54, 12, 13, '#ffe08a', '#2a2b36', 1.4);
  ctx.fillStyle = '#fff6c8'; ctx.fillRect(cx - 3, b - 51, 6, 7);
  poly(ctx, [[cx - 8, b - 54], [cx, b - 60], [cx + 8, b - 54]], '#2a2b36', null);
});

const bench = () => prop(26, (ctx, cx, b) => {
  shadow(ctx, cx + 2, b - 2, 13, 3);
  box(ctx, cx - 13, b - 14, 26, 5, '#a8703f');
  box(ctx, cx - 13, b - 22, 26, 5, '#b98050');
  for (const s of [-11, 9]) box(ctx, cx + s, b - 9, 3, 8, '#5a3a22', null);
});

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

const hedge = () => prop(30, (ctx, cx, b) => {
  shadow(ctx, cx + 2, b - 3, 15, 4);
  const blob = (x: number, y: number, r: number, c: string) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill(); };
  ctx.save();
  blob(cx - 7, b - 10, 9, '#2f7d3a'); blob(cx + 7, b - 10, 9, '#2f7d3a'); blob(cx, b - 16, 10, '#3a9147');
  ctx.globalCompositeOperation = 'source-atop';
  blob(cx - 4, b - 20, 6, '#5bb85e'); blob(cx + 8, b - 14, 4, '#4caa52');
  ctx.restore();
  ctx.strokeStyle = '#1f5a2a'; ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.arc(cx - 7, b - 10, 9, Math.PI * 0.6, Math.PI * 1.3); ctx.arc(cx, b - 16, 10, Math.PI * 1.15, Math.PI * 1.85); ctx.arc(cx + 7, b - 10, 9, Math.PI * 1.7, Math.PI * 0.4); ctx.stroke();
});

/** Sprites (com variações) de todas as construções e enfeites da cidade. */
export function townSprites(): Map<BlockId, Sprite[]> {
  const m = new Map<BlockId, Sprite[]>();
  for (const id of [Block.HOUSE_S, Block.HOUSE_M, Block.HOUSE_L, Block.HOUSE_XL]) m.set(id, houseVariants(id));
  m.set(Block.CASTLE, [castle()]);
  m.set(Block.GUILD, [guild()]);
  m.set(Block.INN, [inn()]);
  m.set(Block.SMITHY, [smithy()]);
  m.set(Block.SHOP_POTION, [shop(Block.SHOP_POTION, '#d9483b', (ctx, x, y) => {
    ctx.beginPath(); ctx.arc(x, y + 1.5, 3.6, 0, Math.PI * 2); ctx.fillStyle = '#e8574a'; ctx.fill(); ctx.fillStyle = '#ddd'; ctx.fillRect(x - 1.2, y - 4.5, 2.4, 3);
  })]);
  m.set(Block.SHOP_GOODS, [shop(Block.SHOP_GOODS, '#3f6fc0', (ctx, x, y) => {
    ctx.beginPath(); ctx.ellipse(x, y + 1.5, 4.2, 3.6, 0, 0, Math.PI * 2); ctx.fillStyle = '#b07a3e'; ctx.fill(); ctx.fillStyle = '#f2c94c'; ctx.fillRect(x - 1, y - 3.5, 2, 2);
  }, 'Lojas')]);
  m.set(Block.SHOP_TOOLS, [shop(Block.SHOP_TOOLS, '#d9483b', (ctx, x, y) => {
    ctx.strokeStyle = '#6e4a30'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 4, y + 4); ctx.lineTo(x + 3, y - 3); ctx.stroke();
    ctx.strokeStyle = '#8a8d99'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x + 1, y - 5); ctx.lineTo(x + 5, y - 1); ctx.stroke();
  })]);
  m.set(Block.WATCHTOWER, [tower()]);
  m.set(Block.FOUNTAIN, [fountain()]);
  m.set(Block.WELL, [well()]);
  m.set(Block.STALL, [stall()]);
  m.set(Block.LAMP, [lamp()]);
  m.set(Block.BENCH, [bench()]);
  m.set(Block.BARREL, [barrel()]);
  m.set(Block.CRATES, [crates()]);
  m.set(Block.SIGNPOST, [signpost()]);
  m.set(Block.HEDGE, [hedge()]);
  return m;
}

/** Ids desenhados pela arte da cidade (o render escolhe a variação por posição, fixa como a cidade). */
export function isTownArt(id: number): boolean {
  return id >= Block.CASTLE && id <= Block.STALL;
}

/** Maior alcance de um sprite da cidade além da célula âncora (células): à direita e para cima. */
export const TOWN_REACH = { right: 27, up: 18 };
