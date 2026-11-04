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
  [Block.INN]: ['inn'],
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
const TIMBER = '#6e4a30';
const STONE = '#b4aeb0';

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

/** Sprite sobre o canto inferior esquerdo de uma construção w×d (base na borda de baixo da célula). */
function buildingSprite(w: number, d: number, wallH: number, headroom: number, draw: (ctx: Ctx, pad: number, totalH: number) => void): Sprite {
  const pad = 6;
  const totalH = d * T + wallH + headroom;
  const [c, ctx] = makeCanvas(w * T + pad * 2, totalH);
  draw(ctx, pad, totalH);
  return { canvas: c, ox: -pad, oy: T - totalH, w: w * T + pad * 2, h: totalH, hit: { x: 0, y: T - d * T - wallH, w: w * T, h: d * T + wallH } };
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
