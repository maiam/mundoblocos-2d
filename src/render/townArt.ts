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
  [Block.FOUNTAIN]: ['fountain'],
  [Block.WELL]: ['well'],
  [Block.STALL]: ['stall'],
  [Block.BARREL]: ['barrel'],
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

/** Objetos de 1 célula (enfeites fixos). */
function prop(h: number, draw: (ctx: Ctx, cx: number, bottom: number) => void): Sprite {
  const w = T + 8;
  const [c, ctx] = makeCanvas(w, h);
  draw(ctx, w / 2, h - 2);
  return { canvas: c, ox: -4, oy: T - h, w, h, hit: { x: 0, y: T - h, w: T, h } };
}

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
