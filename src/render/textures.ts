import dirtIcon from '../assets/icon-block-dirt.webp?inline';
import grassIcon from '../assets/icon-block-grass.webp?inline';
import oakLogIcon from '../assets/icon-block-oak-log.webp?inline';
import oakPlanksIcon from '../assets/icon-block-oak-planks.webp?inline';
import pathIcon from '../assets/icon-block-path.webp?inline';
import sandIcon from '../assets/icon-block-sand.webp?inline';
import stoneIcon from '../assets/icon-block-stone.webp?inline';
import tilledIcon from '../assets/icon-block-tilled.webp?inline';
import { CUBE_FRONT, TILE } from '../config';
import { Block, type BlockId, CELESTIAL_BLOCKS, MATERIALS } from '../world/blocks';
import { mulberry32 } from '../world/random';
import { getBlockAtlas, getDungeonArt, getOakDoorSheet } from './blockArt';
import { CELESTIAL_ICONS, celestialFaces, CELESTIAL_STYLE } from './celestialArt';
import { rgba, shade } from './color';

/**
 * Texturas do mundo em vista 3/4.
 * - Materiais (terra, grama, arada, caminho, areia, pedra, tora, piso): arte da prancha de
 *   blocos (atlas gerado por scripts/extract-blocks.py) → topo quadrado + face frontal.
 *   O topo também é o chão natural.
 * - Água, árvores, cacto e enfeites: pintura procedural no mesmo estilo (cel-shading,
 *   contorno colorido, brilhos em estrela).
 * Aparência é responsabilidade exclusiva do render; propriedades vivem em world/blocks.
 */

type Ctx = CanvasRenderingContext2D;

/** Resolução das texturas em relação aos pixels de mundo (nitidez com zoom ~2×). */
export const TEX_RES = 2;
const T = TILE;
const F = CUBE_FRONT;
const WATER_VARIANTS = 3;

/** Sprite posicionado em relação ao canto superior-esquerdo da célula (px de mundo). */
export interface Sprite {
  canvas: HTMLCanvasElement;
  ox: number;
  oy: number;
  w: number;
  h: number;
  /** Retângulo clicável relativo à célula (para escolher o objeto sob o cursor). */
  hit: { x: number; y: number; w: number; h: number };
}

export interface BlockTextures {
  /** Topo de cada material, usado como chão (TILE×TILE em resolução TEX_RES). */
  groundTop: Map<BlockId, HTMLCanvasElement>;
  water: HTMLCanvasElement[];
  objects: Map<BlockId, Sprite>;
  icons: Map<BlockId, string>;
  glowColor: Map<BlockId, string>;
  /** Cor da "barranca" (face frontal do chão elevado) mostrada sobre a água. */
  bankColor: Map<BlockId, string>;
  /** Porta de Carvalho: 8 quadros (0..3 abrindo, 4..7 fechando); fechada = 0, aberta = 3. */
  doorFrames: Sprite[];
  /** Objetos com várias artes (montanhas, pedras): o render escolhe uma por célula (hash). */
  variants: Map<BlockId, Sprite[]>;
  /** Objetos desenhados empilhados N vezes (aparência; ex.: parede do labirinto com 2 cubos de altura). */
  stackDraw: Map<BlockId, number>;
}

/** Quadros de uma folha em tira → sprites com a base no pé da célula (largura `w` px de mundo). */
function stripSprites(img: HTMLImageElement, count: number, w: number, sink: number): Sprite[] {
  const fw = img.width / count;
  const h = w * (img.height / fw);
  return Array.from({ length: count }, (_, i) => {
    const c = document.createElement('canvas');
    c.width = fw;
    c.height = img.height;
    c.getContext('2d')!.drawImage(img, i * fw, 0, fw, img.height, 0, 0, fw, img.height);
    const oy = T - h + sink;
    return { canvas: c, ox: (T - w) / 2, oy, w, h, hit: { x: 0, y: Math.max(oy, -T), w: T, h: T - Math.max(oy, -T) } };
  });
}

/** Dungeon: chão (4 topos), muralha de montanhas, pedras e blocos decorados (ovos, cogumelos, espinhos, raízes). */
/** Escurece o desenho do sprite (só onde há tinta). */
function shadeSprite(s: Sprite, color: string): Sprite {
  const ctx = s.canvas.getContext('2d')!;
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, s.canvas.width, s.canvas.height);
  ctx.globalCompositeOperation = 'source-over';
  return s;
}

function dungeonTextures(groundTop: Map<BlockId, HTMLCanvasElement>, objects: Map<BlockId, Sprite>, variants: Map<BlockId, Sprite[]>, stackDraw: Map<BlockId, number>): void {
  const art = getDungeonArt();
  [Block.DUNGEON_DIRT, Block.DUNGEON_WEB, Block.DUNGEON_BONES, Block.DUNGEON_MOSS].forEach((id, i) => {
    const [c, ctx] = canvas(T, T);
    ctx.drawImage(art.ground, i * 64, 0, 64, 64, 0, 0, T, T);
    groundTop.set(id, c);
  });
  const mountains = stripSprites(art.mountains, 8, T * 2.2, 6);
  // Parede do labirinto: cubo com a largura da célula (emenda com os vizinhos), escurecido para se separar do
  // chão e desenhado com 2 níveis de altura (`stackDraw`). Liso na maioria; musgo e teia de vez em quando.
  const walls = stripSprites(art.walls, 4, T, 0).map((s) => shadeSprite(s, 'rgba(28, 14, 40, 0.38)'));
  variants.set(Block.DUNGEON_WALL, [...Array(10).fill(walls[0]), walls[3], walls[1]]);
  objects.set(Block.DUNGEON_WALL, walls[0]);
  stackDraw.set(Block.DUNGEON_WALL, 2);
  const rocks = stripSprites(art.rocks, 8, T * 1.5, 4);
  const props = stripSprites(art.props, 4, T * 1.15, 2);
  variants.set(Block.DUNGEON_MOUNTAIN, mountains);
  variants.set(Block.DUNGEON_ROCK, rocks);
  objects.set(Block.DUNGEON_MOUNTAIN, mountains[0]);
  objects.set(Block.DUNGEON_ROCK, rocks[0]);
  [Block.DUNGEON_EGGS, Block.DUNGEON_MUSHROOM, Block.DUNGEON_SPIKES, Block.DUNGEON_ROOTS].forEach((id, i) => objects.set(id, props[i]));
}

/** Geometria da folha `oak-door` (quadros 70×120): corpo da porta fechada em x 8..69, base em y 112. */
const DOOR_FRAME_W = 70;
const DOOR_FRAME_H = 120;
const DOOR_BODY_X = 8;
const DOOR_BODY_W = 61;
const DOOR_BASE_Y = 112;

/**
 * Quadros da porta: corpo da porta fechada com a largura de uma célula, base na borda de baixo da
 * célula (como a frente de um cubo) e dobradiça à esquerda. Altura resultante ≈ 3 frentes de cubo.
 */
function doorSprites(): Sprite[] {
  const sheet = getOakDoorSheet();
  const s = T / DOOR_BODY_W;
  const w = DOOR_FRAME_W * s;
  const h = DOOR_FRAME_H * s;
  const ox = -DOOR_BODY_X * s;
  const oy = T - DOOR_BASE_Y * s;
  return Array.from({ length: 8 }, (_, i) => {
    const c = document.createElement('canvas');
    c.width = DOOR_FRAME_W;
    c.height = DOOR_FRAME_H;
    c.getContext('2d')!.drawImage(sheet, (i % 4) * DOOR_FRAME_W, Math.floor(i / 4) * DOOR_FRAME_H,
      DOOR_FRAME_W, DOOR_FRAME_H, 0, 0, DOOR_FRAME_W, DOOR_FRAME_H);
    return { canvas: c, ox, oy, w, h, hit: { x: 0, y: oy, w: T, h: T - oy } };
  });
}

/** Ícones da hotbar: o cubo da prancha inteiro. */
const MATERIAL_ICONS: Record<number, string> = {
  [Block.DIRT]: dirtIcon,
  [Block.GRASS]: grassIcon,
  [Block.TILLED]: tilledIcon,
  [Block.PATH]: pathIcon,
  [Block.SAND]: sandIcon,
  [Block.STONE]: stoneIcon,
  [Block.OAK_LOG]: oakLogIcon,
  [Block.OAK_PLANKS]: oakPlanksIcon,
};

function canvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * TEX_RES);
  c.height = Math.ceil(h * TEX_RES);
  const ctx = c.getContext('2d')!;
  ctx.scale(TEX_RES, TEX_RES);
  return [c, ctx];
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function sparkle(ctx: Ctx, x: number, y: number, r: number, color = '#ffffff', alpha = 0.9): void {
  ctx.fillStyle = rgba(color, alpha);
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

function blobs(ctx: Ctx, rand: () => number, color: string, n: number, rMin: number, rMax: number, x0: number, y0: number, w: number, h: number, alpha = 0.5): void {
  for (let i = 0; i < n; i++) {
    const r = rMin + rand() * (rMax - rMin);
    ctx.fillStyle = rgba(color, alpha * (0.5 + rand() * 0.5));
    ctx.beginPath();
    ctx.ellipse(x0 + rand() * w, y0 + rand() * h, r, r * (0.55 + rand() * 0.4), rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------------------------------------------------------------- chão

function blade(ctx: Ctx, x: number, baseY: number, h: number, lean: number, w: number): void {
  ctx.beginPath();
  ctx.moveTo(x - w / 2, baseY);
  ctx.quadraticCurveTo(x + lean * 0.3, baseY - h * 0.6, x + lean, baseY - h);
  ctx.quadraticCurveTo(x + lean * 0.3 + w * 0.2, baseY - h * 0.5, x + w / 2, baseY);
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------------------------- materiais (prancha)

/**
 * Atlas: linha 0 = topos do cubo (64×64), linha 1 = faces frontais (64×36),
 * linha 2 = versão contínua do topo para o chão (sem emendas), na ordem de MATERIALS.
 */
const ATLAS_TOP = T * TEX_RES;
const ATLAS_FRONT = F * TEX_RES;

function materialTop(index: number): HTMLCanvasElement {
  const [c, ctx] = canvas(T, T);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(getBlockAtlas(), index * ATLAS_TOP, ATLAS_TOP + ATLAS_FRONT, ATLAS_TOP, ATLAS_TOP, 0, 0, c.width, c.height);
  return c;
}

/** Cubo 3/4 com a arte da prancha: topo em [0, T) e face frontal em [T, T + F), mais contorno. */
function materialCube(index: number, outline: string): Sprite {
  const atlas = getBlockAtlas();
  return composeCube(
    (ctx) => ctx.drawImage(atlas, index * ATLAS_TOP, 0, ATLAS_TOP, ATLAS_TOP, 0, 0, T, T),
    (ctx) => ctx.drawImage(atlas, index * ATLAS_TOP, ATLAS_TOP, ATLAS_TOP, ATLAS_FRONT, 0, T, T, F),
    outline,
  );
}

/**
 * Monta um cubo 3/4 a partir de duas faces: `drawTop` pinta [0, T) e `drawFront`
 * pinta [T, T + F). Aplica sombra na frente, aresta clara e contorno.
 */
export function composeCube(drawTop: (ctx: Ctx) => void, drawFront: (ctx: Ctx) => void, outline: string): Sprite {
  const [c, ctx] = canvas(T, T + F);
  ctx.save();
  roundRect(ctx, 0.5, 0.5, T - 1, T + F - 1, 3);
  ctx.clip();
  drawFront(ctx);
  // Face frontal um pouco mais escura (luz vem de cima).
  ctx.fillStyle = 'rgba(30, 20, 60, 0.18)';
  ctx.fillRect(0, T, T, F);
  drawTop(ctx);
  // Aresta clara entre topo e frente + filete de luz no topo.
  ctx.fillStyle = 'rgba(255, 250, 230, 0.45)';
  ctx.fillRect(0, T - 1, T, 1);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.fillRect(0, 0, T, 1.5);
  ctx.restore();
  roundRect(ctx, 0.5, 0.5, T - 1, T + F - 1, 3);
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1;
  ctx.stroke();
  return { canvas: c, ox: 0, oy: -F, w: T, h: T + F, hit: { x: 0, y: -F, w: T, h: T + F } };
}

/** Contorno de cada material (cor escura da própria arte). */
const OUTLINE: Record<number, string> = {
  [Block.DIRT]: '#4a2a18',
  [Block.GRASS]: '#2f4a1c',
  [Block.TILLED]: '#4a2a18',
  [Block.PATH]: '#5a3a20',
  [Block.SAND]: '#8a6a3a',
  [Block.STONE]: '#3e3a48',
  [Block.OAK_LOG]: '#3e2414',
  [Block.OAK_PLANKS]: '#4e3018',
};

// ---------------------------------------------------------------- água

function waterTile(variant: number): HTMLCanvasElement {
  const [c, ctx] = canvas(T, T);
  const rand = mulberry32(6 * 131 + variant * 7 + 1);

      const g = ctx.createLinearGradient(0, 0, T, T);
      g.addColorStop(0, '#46b4f0');
      g.addColorStop(1, '#2f8fd8');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, T, T);
      ctx.strokeStyle = rgba('#c4f1ff', 0.5);
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 2; i++) {
        const y = 8 + i * 13 + rand() * 4;
        const x = 2 + rand() * 12;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + 6, y - 2, x + 12, y);
        ctx.stroke();
      }
        return c;
}

// ---------------------------------------------------------------- árvores e enfeites

function treeSprite(kind: BlockId): Sprite {
  const W = T * 2;
  const H = T * 3;
  const [c, ctx] = canvas(W, H);
  const rand = mulberry32(kind * 17);
  const cx = W / 2;
  const baseY = H; // pé do tronco = base da célula
  // Tronco.
  const trunkTop = baseY - T * 1.25;
  ctx.fillStyle = '#5a3420';
  roundRect(ctx, cx - 6, trunkTop, 12, baseY - trunkTop - 2, 3);
  ctx.fill();
  const tg = ctx.createLinearGradient(cx - 5, 0, cx + 5, 0);
  tg.addColorStop(0, '#b07a4e');
  tg.addColorStop(1, '#7a4c2c');
  ctx.fillStyle = tg;
  roundRect(ctx, cx - 5, trunkTop, 10, baseY - trunkTop - 3, 2.5);
  ctx.fill();
  // Raízes.
  ctx.fillStyle = '#7a4c2c';
  ctx.beginPath();
  ctx.ellipse(cx, baseY - 3, 9, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  {
    const palette: Record<number, [string, string]> = {
      [Block.OAK_TREE]: ['#5cc565', '#c8f7a0'],
      [Block.SAKURA_TREE]: ['#ffa9cf', '#ffffff'],
    };
    const [base, accent] = palette[kind];
    const ccy = baseY - T * 1.85;
    const puffs: [number, number, number][] = [
      [-14, 6, 15], [14, 6, 15], [0, 10, 16], [-9, -9, 15], [10, -9, 15], [0, -16, 13], [-20, -4, 11], [20, -4, 11],
    ];
    // Contorno.
    ctx.fillStyle = shade(base, -0.62);
    for (const [x, y, r] of puffs) { ctx.beginPath(); ctx.arc(cx + x, ccy + y, r + 1.4, 0, Math.PI * 2); ctx.fill(); }
    // Massa em sombra.
    ctx.fillStyle = shade(base, -0.22);
    for (const [x, y, r] of puffs) { ctx.beginPath(); ctx.arc(cx + x, ccy + y, r, 0, Math.PI * 2); ctx.fill(); }
    // Luz (deslocada para cima-esquerda).
    ctx.fillStyle = base;
    for (const [x, y, r] of puffs) { ctx.beginPath(); ctx.arc(cx + x - 2, ccy + y - 3, r * 0.82, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = shade(base, 0.3);
    for (const [x, y, r] of puffs.slice(3, 6)) { ctx.beginPath(); ctx.arc(cx + x - 4, ccy + y - 5, r * 0.45, 0, Math.PI * 2); ctx.fill(); }
    // Recortes de folha em meia-lua.
    ctx.strokeStyle = rgba(shade(base, 0.6), 0.85);
    ctx.lineWidth = 1.3;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(cx - 20 + rand() * 40, ccy - 14 + rand() * 26, 3 + rand() * 2, Math.PI * 1.1, Math.PI * 1.7);
      ctx.stroke();
    }
    blobs(ctx, rand, accent, kind === Block.SAKURA_TREE ? 9 : 6, 1, 1.8, cx - 22, ccy - 18, 44, 32, 0.9);
  }
  return {
    canvas: c, ox: -T / 2, oy: T - H, w: W, h: H,
    hit: { x: -T * 0.3, y: T - H * 0.92, w: T * 1.6, h: H * 0.92 },
  };
}

function cactusSprite(): Sprite {
  const W = T;
  const H = T * 1.7;
  const [c, ctx] = canvas(W, H);
  const body = (x: number, y: number, w: number, h: number) => {
    roundRect(ctx, x, y, w, h, w / 2);
    ctx.fillStyle = '#2c7a3a';
    ctx.fill();
    roundRect(ctx, x + 1, y + 1, w - 2, h - 2, w / 2 - 1);
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, '#7fd67f');
    g.addColorStop(0.5, '#4fb35a');
    g.addColorStop(1, '#3a9248');
    ctx.fillStyle = g;
    ctx.fill();
  };
  body(4, H * 0.42, 7, 16);
  body(21, H * 0.3, 7, 14);
  body(10, 2, 12, H - 6);
  ctx.strokeStyle = rgba('#2c7a3a', 0.8);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(16, 6); ctx.lineTo(16, H - 6);
  ctx.stroke();
  ctx.fillStyle = '#ff8fb8';
  ctx.beginPath();
  ctx.arc(16, 4, 3, 0, Math.PI * 2);
  ctx.fill();
  return { canvas: c, ox: 0, oy: T - H, w: W, h: H, hit: { x: 4, y: T - H, w: T - 8, h: H } };
}

function decorationSprite(id: BlockId): Sprite {
  const [c, ctx] = canvas(T, T);
  const r = mulberry32(id * 3);
  switch (id) {
    case Block.TALL_GRASS:
      for (let i = 0; i < 7; i++) {
        const x = 6 + i * 3.3 + r() * 2;
        const h = 9 + r() * 10;
        const lean = (r() - 0.5) * 6;
        ctx.fillStyle = '#2a6b34';
        blade(ctx, x, T - 4, h + 1.4, lean, 3);
        ctx.fillStyle = shade('#79d265', r() * 0.3);
        blade(ctx, x, T - 4, h, lean, 2);
      }
      break;
    case Block.FLOWER:
      for (const [fx, fy, color] of [[11, 16, '#ff7fb5'], [21, 21, '#ffd23f']] as const) {
        ctx.strokeStyle = '#3c8f45';
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(fx, T - 4); ctx.lineTo(fx, fy); ctx.stroke();
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          ctx.fillStyle = shade(color, -0.45);
          ctx.beginPath(); ctx.ellipse(fx + Math.cos(a) * 3.4, fy + Math.sin(a) * 3.4, 3, 2.2, a, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = color;
          ctx.beginPath(); ctx.ellipse(fx + Math.cos(a) * 3.4, fy + Math.sin(a) * 3.4, 2.4, 1.7, a, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#fff6c8';
        ctx.beginPath(); ctx.arc(fx, fy, 1.8, 0, Math.PI * 2); ctx.fill();
      }
      sparkle(ctx, 26, 8, 2.2);
      break;
  }
  return { canvas: c, ox: 0, oy: -6, w: T, h: T, hit: { x: 0, y: -6, w: T, h: T } };
}

export function createBlockTextures(): BlockTextures {
  const groundTop = new Map<BlockId, HTMLCanvasElement>();
  const objects = new Map<BlockId, Sprite>();
  const icons = new Map<BlockId, string>();
  MATERIALS.forEach((id, i) => {
    groundTop.set(id, materialTop(i));
    objects.set(id, materialCube(i, OUTLINE[id] ?? '#3a2a20'));
    icons.set(id, MATERIAL_ICONS[id]);
  });
  const water = Array.from({ length: WATER_VARIANTS }, (_, v) => waterTile(v));
  for (const id of [Block.OAK_TREE, Block.SAKURA_TREE] as BlockId[]) objects.set(id, treeSprite(id));
  objects.set(Block.CACTUS, cactusSprite());
  for (const id of [Block.TALL_GRASS, Block.FLOWER] as BlockId[]) objects.set(id, decorationSprite(id));
  // Santuário Celestial: arte da prancha 3/4 (atlas) + ícones do cubo inteiro.
  for (const id of CELESTIAL_BLOCKS) {
    const { top, front, ground } = celestialFaces(id);
    groundTop.set(id, ground);
    objects.set(id, composeCube(
      (ctx) => ctx.drawImage(top, 0, 0, T, T),
      (ctx) => ctx.drawImage(front, 0, T, T, F),
      CELESTIAL_STYLE[id].outline,
    ));
    icons.set(id, CELESTIAL_ICONS[id]);
  }
  const variants = new Map<BlockId, Sprite[]>();
  const stackDraw = new Map<BlockId, number>();
  dungeonTextures(groundTop, objects, variants, stackDraw);
  const doorFrames = doorSprites();
  objects.set(Block.OAK_DOOR, doorFrames[0]);
  objects.set(Block.OAK_DOOR_OPEN, doorFrames[3]);
  icons.set(Block.OAK_DOOR, doorFrames[0].canvas.toDataURL());
  const glowColor = new Map<BlockId, string>([
    [Block.MOSS_LUMINOUS, '#c8ff8a'],
    [Block.CRYSTAL_LIFE, '#ff9be6'],
    [Block.LIGHT_BLOCK, '#ffe08a'],
  ]);
  const bankColor = new Map<BlockId, string>([
    [Block.GRASS, '#8a5a36'],
    [Block.DIRT, '#8a5a36'],
    [Block.TILLED, '#7a4a2a'],
    [Block.PATH, '#a07040'],
    [Block.SAND, '#d9b06a'],
    [Block.STONE, '#6a6676'],
  ]);
  return { groundTop, water, objects, icons, glowColor, bankColor, doorFrames, variants, stackDraw };
}
