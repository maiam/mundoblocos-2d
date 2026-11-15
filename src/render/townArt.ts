import { TILE } from '../config';
import { Block, type BlockId } from '../world/blocks';
import { townSize, townSolid } from '../world/town';
import { isWaterPlant } from '../world/blocks';
import { isVillageId, VILLAGE_SIZES } from '../world/village';
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
  // Vila Camponesa (v0.93.89): itens do dono do produto, na escala do jogo (`scripts/extract-village.py`); a variação sai da posição.
  [Block.V_HOUSE_STRAW]: ['village-house-straw-1', 'village-house-straw-2', 'village-house-straw-3'],
  [Block.V_HOUSE_TILE]: ['village-house-tile-1', 'village-house-tile-2'],
  [Block.V_BARN]: ['village-barn'], [Block.V_COOP]: ['village-coop'], [Block.V_WELL]: ['village-well'],
  [Block.V_BENCH]: ['village-bench-1', 'village-bench-2'], [Block.V_BED_WHEAT]: ['village-bed-wheat'], [Block.V_BED_VEG]: ['village-bed-veg'],
  [Block.V_OAK]: ['village-oak-1', 'village-oak-2', 'village-oak-3'], [Block.V_TREE]: ['village-tree-1', 'village-tree-2'],
  [Block.V_STAKE]: ['village-stake-tall'], [Block.FENCE_STAKE]: ['village-stake-low'], [Block.V_GATE]: ['village-gate-open'], [Block.V_GATE_CLOSED]: ['village-gate-closed'],
  [Block.V_BARREL]: ['village-barrel'], [Block.V_ROCKS]: ['village-rocks'], [Block.V_BUSH]: ['village-bush'], [Block.V_LOGS]: ['village-logs'],
  // Vitórias-régias (v0.93.92): variante pela posição.
  [Block.WATER_LILY]: ['water-lily-leaf', 'water-lily-pink', 'water-lily-white', 'water-lily-bud', 'water-lily-leaf'],
  [Block.VICTORIA]: ['water-victoria-a', 'water-victoria-b', 'water-victoria-flower', 'water-victoria-pair', 'water-victoria-a'],
  [Block.V_HAY]: ['village-hay'], [Block.V_CART]: ['village-cart'], [Block.V_SACKS]: ['village-sacks'], [Block.V_FLOWERS]: ['village-flowers'],
};

/**
 * Boca da chaminé (px da imagem final de cada casa da vila, a partir do canto superior esquerdo) — de onde sobe a fumaça animada
 * (`three/chimneySmoke.ts`). Medida na arte SEM a fumaça desenhada (`scripts/extract-village.py`, `SMOKE_RIM`).
 */
export const CHIMNEY_MOUTH: Readonly<Record<string, readonly [number, number]>> = {
  'village-house-straw-1': [118, 43], 'village-house-straw-2': [122, 41], 'village-house-straw-3': [122, 44],
  'village-house-tile-1': [118, 39], 'village-house-tile-2': [113, 41],
};

/** Boca da chaminé de cada variante de `id` (mesma ordem de `IMAGE_ART[id]`; null onde a casa não tem chaminé animada). */
export function chimneyMouths(id: BlockId): Array<readonly [number, number] | null> {
  return (IMAGE_ART[id] ?? []).map((n) => CHIMNEY_MOUTH[n] ?? null);
}

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
  // Vila Camponesa: lotes em células da grade fina; o desenho trabalha em células antigas (metade).
  const vs = VILLAGE_SIZES[id] ?? (id === Block.FENCE_STAKE ? ([1, 1] as [number, number]) : id === Block.WATER_LILY ? ([2, 1] as [number, number]) : id === Block.VICTORIA ? ([4, 1] as [number, number]) : undefined);
  const w = vs ? vs[0] / 2 : townSize(id)[0];
  const d = vs ? vs[1] / 2 : townSolid(id);
  // As estacas da cerca são só 16 px de jogo: a imagem tem 4× a densidade das outras peças (`STAKE_PX_PER_CELL` em `scripts/extract-village.py`).
  const dense = id === Block.V_STAKE || id === Block.FENCE_STAKE || id === Block.WATER_LILY || id === Block.VICTORIA;
  const k = T / (dense ? TOWN_PX_PER_CELL * 2 : TOWN_PX_PER_CELL);
  const sw = img.width * k;
  const sh = img.height * k;
  // O 3D amplia o desenho em volta do meio da base (`objectScaleFor`): o centro fica em `x + (ox + sw/2)/T`. Nos lotes da vila (em células
  // da grade fina, `vs[0]` de largura) o centro é `x + vs[0]/2`, então `ox` usa a largura do lote inteira (a cidade, em células antigas, não muda).
  const lotW = vs ? vs[0] : w;
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  c.getContext('2d')!.drawImage(img, 0, 0);
  return { canvas: c, ox: (lotW * T - sw) / 2, oy: T - sh + 1, w: sw, h: sh, hit: { x: 0, y: T - d * T, w: w * T, h: d * T } };
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
  return (id >= Block.CASTLE && id <= Block.BENCH_LONG) || isVillageId(id) || isWaterPlant(id);
}

/** Maior alcance de um sprite da cidade além da célula âncora (células): à direita e para cima. */
