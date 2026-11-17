import { CUBE_FRONT, TILE } from '../config';
import { Block, type BlockId, CELESTIAL_BLOCKS, FLOWER_BLOCKS, MATERIALS } from '../world/blocks';
import { mulberry32 } from '../world/random';
import { art } from './art';
import { materialsV2InWorld, transitionMasks, v2Faces, v2GroundTop, v2WaterTop } from './materialsV2';
import { TRANSITION_PIECES, TRANSITION_RULES, type TransitionRule } from './transitions';
import { getBlockAtlas, getCelestialAtlas, getCraftableSprite, getDungeonArt, getFenceArt, getOakDoorSheet, getChestSprite, getRockArt, getFlowerArt, getTentSprite, getTownImages, getTreeArt, getWaterArt, type TreeArt } from './blockArt';
import type { CraftableArt } from './art/types';
import { celestialFaces, CELESTIAL_STYLE } from './celestialArt';
import { rgba, shade } from './color';
import { FENCE_FRAME, FENCE_OFFSET, FENCE_SCALE, GATE_FRAME, GATE_SIDE_FRAME } from './fence';
import { townSprites } from './townArt';

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
/** Objetos fabricados desenhados com imagem: id → [nome da arte, largura em células]. */
const CRAFT_PROPS: Partial<Record<BlockId, [CraftableArt, number]>> = {
  [Block.CAMPFIRE]: ['campfire', 1.05],
  [Block.CAULDRON]: ['cauldron', 1.1],
  [Block.OVEN]: ['oven', 1.25],
  [Block.CHAIR]: ['chair', 0.9],
};

export const TEX_RES = 2;
const T = TILE;
const F = CUBE_FRONT;
const WATER_VARIANTS = 3;
/** Quantos materiais (as primeiras posições de `MATERIALS`) têm coluna no atlas antigo (`?blocos=legado`). */
const LEGACY_MATERIALS = 15;

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
  /** Chãos do Padrão V2 (ADR 0023): textura contínua, sem a grade sutil de blocos por cima (`chunkRenderer`). */
  continuousGround: Set<BlockId>;
  /** Transições de chão (V2): por material que avança, as 8 peças (bordas e cantos) já com o topo dele por dentro da máscara. */
  transitionOver: Map<string, TransitionLayers>;
  /** Transições de chão: por material que recebe, quais materiais avançam sobre ele (`TRANSITION_RULES`). */
  transitionOnto: Map<BlockId, TransitionRule[]>;
  /** Materiais com várias artes de chão (ex.: Terra com Grama): o chão escolhe uma por célula (hash da seed). */
  groundVariants: Map<BlockId, HTMLCanvasElement[]>;
  water: HTMLCanvasElement[];
  objects: Map<BlockId, Sprite>;
  icons: Map<BlockId, string>;
  glowColor: Map<BlockId, string>;
  /** Onde fica a luz no sprite (células a partir do centro da base), quando não é no pé (ex.: lanterna do poste). */
  glowAt: Map<BlockId, [number, number]>;
  /** Cor da "barranca" (face frontal do chão elevado) mostrada sobre a água. */
  bankColor: Map<BlockId, string>;
  /** Porta de Carvalho: 8 quadros (0..3 abrindo, 4..7 fechando); fechada = 0, aberta = 3. */
  doorFrames: Sprite[];
  /** Porteira do jogador: 10 quadros (0..4 abrindo, 5..9 fechando); fechada = 0, aberta = 4. Vazio sem a arte. */
  gateFrames: Map<BlockId, Sprite[]>;
  /** Idem, de LADO (cercas ao norte/sul; `gateIsSide`). */
  gateFramesSide: Map<BlockId, Sprite[]>;
  /** Objetos com várias artes (montanhas, pedras): o render escolhe uma por célula (hash). */
  variants: Map<BlockId, Sprite[]>;
  /** Carvalhos isométricos (3 tamanhos): só a câmera Isométrica do Santuário os usa (`worldSpriteArt`, `isometric`). Vazio sem a arte. */
  isoOak: Sprite[];
  /** Objetos desenhados empilhados N vezes (aparência; ex.: parede do labirinto com 2 cubos de altura). */
  stackDraw: Map<BlockId, number>;
  /** Peças da cerca (trecho horizontal, vertical, poste grande; `render/fence.ts`), ou null sem a arte. */
  fencePieces: Map<BlockId, HTMLCanvasElement[]>;
}

/**
 * Quadros de uma prancha em grade (`cols` × `rows`, quadros quadrados) → sprites com o pé do desenho na base da célula,
 * `cells` células de largura. Usado pelas pranchas de crescimento (árvores, cacto).
 */
function gridSprites(img: HTMLImageElement, cols: number, rows: number, cells: number, sink: number): Sprite[] {
  const fw = img.width / cols;
  const fh = img.height / rows;
  const w = T * cells;
  const h = w * (fh / fw);
  const out: Sprite[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cv = document.createElement('canvas');
      cv.width = fw;
      cv.height = fh;
      cv.getContext('2d')!.drawImage(img, c * fw, r * fh, fw, fh, 0, 0, fw, fh);
      const oy = T - h + sink;
      const top = Math.max(oy + h * 0.35, -T * 1.5);
      out.push({ canvas: cv, ox: (T - w) / 2, oy, w, h, hit: { x: 0, y: top, w: T, h: T - top } });
    }
  }
  return out;
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

/** Injeta a arte da dungeon nas texturas (depois que ela termina de carregar em segundo plano). */
export function addDungeonTextures(t: BlockTextures): boolean {
  if (!getDungeonArt() || t.variants.has(Block.DUNGEON_WALL)) return false;
  dungeonTextures(t.groundTop, t.objects, t.variants, t.stackDraw);
  return true;
}

function dungeonTextures(groundTop: Map<BlockId, HTMLCanvasElement>, objects: Map<BlockId, Sprite>, variants: Map<BlockId, Sprite[]>, stackDraw: Map<BlockId, number>): void {
  const art = getDungeonArt()!;
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
  // Entrada do covil no mundo: a caverna sobre a base 5 × 3 (canto inferior esquerdo), boca no meio de baixo.
  if (art.cave) {
    const w = T * 4.7;
    const h = w * (art.cave.height / art.cave.width);
    const c = document.createElement('canvas');
    c.width = art.cave.width;
    c.height = art.cave.height;
    c.getContext('2d')!.drawImage(art.cave, 0, 0);
    const oy = T - h + 4;
    objects.set(Block.DUNGEON_CAVE, { canvas: c, ox: (5 * T - w) / 2, oy, w, h, hit: { x: 0, y: -2 * T, w: 5 * T, h: 3 * T } });
  }
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
  const sheet = getOakDoorSheet()!;
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
/**
 * Variações extras de um material: colunas do atlas depois dos materiais (scripts/extract-grass.py). A coluna normal
 * do material é a 1ª variação; chão e cubo sorteiam uma por célula.
 */
const MATERIAL_VARIANT_COLS: Partial<Record<BlockId, number[]>> = { [Block.GRASS]: [15, 16] };

function materialTop(index: number): HTMLCanvasElement {
  const [c, ctx] = canvas(T, T);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(getBlockAtlas()!, index * ATLAS_TOP, ATLAS_TOP + ATLAS_FRONT, ATLAS_TOP, ATLAS_TOP, 0, 0, c.width, c.height);
  return c;
}

/** Cubo 3/4 com a arte da prancha: topo em [0, T) e face frontal em [T, T + F), mais contorno. */
function materialCube(index: number, outline: string): Sprite {
  const atlas = getBlockAtlas()!;
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
  const F_ = F;
  const [c, ctx] = canvas(T, T + F_);
  ctx.save();
  roundRect(ctx, 0.5, 0.5, T - 1, T + F_ - 1, 3);
  ctx.clip();
  drawFront(ctx);
  // Face frontal um pouco mais escura (luz vem de cima).
  ctx.fillStyle = 'rgba(30, 20, 60, 0.18)';
  ctx.fillRect(0, T, T, F_);
  drawTop(ctx);
  // Aresta clara entre topo e frente + filete de luz no topo.
  ctx.fillStyle = 'rgba(255, 250, 230, 0.45)';
  ctx.fillRect(0, T - 1, T, 1);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.fillRect(0, 0, T, 1.5);
  ctx.restore();
  roundRect(ctx, 0.5, 0.5, T - 1, T + F_ - 1, 3);
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1;
  ctx.stroke();
  return { canvas: c, ox: 0, oy: -F_, w: T, h: T + F_, hit: { x: 0, y: -F_, w: T, h: T + F_ } };
}

/**
 * V2 (padrão, ADR 0023; `?blocos=legado` desliga): troca chão e cubo dos materiais V2 pela montagem V2, com a frente na altura atual do
 * mundo (F). As variações legadas da grama saem (o V2 ainda não tem variações).
 */
function applyMaterialsV2(groundTop: Map<BlockId, HTMLCanvasElement>, groundVariants: Map<BlockId, HTMLCanvasElement[]>, objects: Map<BlockId, Sprite>, variants: Map<BlockId, Sprite[]>, continuousGround: Set<BlockId>): void {
  for (const id of MATERIALS) {
    const faces = v2Faces(id, T, F, TEX_RES);
    if (!faces) continue;
    const [c, ctx] = canvas(T, T);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    v2GroundTop(id, ctx, c.width, c.height);
    groundTop.set(id, c);
    continuousGround.add(id);
    objects.set(id, composeCube(faces.top, faces.front, OUTLINE[id] ?? '#3a2a20'));
    groundVariants.delete(id);
    variants.delete(id);
  }
}

/**
 * Peças de transição entre chãos (ADR 0023): para cada material que avança, as 8 peças (`TRANSITION_PIECES`) = topo dele
 * dentro da máscara de alfa (`source-in`; a máscara é a única coisa que gira, o topo nunca). Só entre chãos V2 e se o
 * pacote trouxe as máscaras. Nada de ler pixel de canvas: tudo é composição.
 */
/** Camadas de uma forma de transição, 8 peças cada: halo (antes), corpo (o topo que avança) e espuma (depois). */
export interface TransitionLayers { body: HTMLCanvasElement[]; halo: HTMLCanvasElement[] | null; foam: HTMLCanvasElement[] | null }

function buildTransitions(groundTop: Map<BlockId, HTMLCanvasElement>, continuous: Set<BlockId>, water: HTMLCanvasElement | null): { over: Map<string, TransitionLayers>; onto: Map<BlockId, TransitionRule[]> } {
  const over = new Map<string, TransitionLayers>();
  const onto = new Map<BlockId, TransitionRule[]>();
  const masks = transitionMasks();
  if (!masks) return { over, onto };
  for (const rule of TRANSITION_RULES) {
    const shape = masks.shapes.indexOf(rule.shape);
    const tile = rule.over === Block.WATER ? water : continuous.has(rule.over) ? groundTop.get(rule.over) : undefined;
    if (shape < 0 || !tile || !continuous.has(rule.onto)) continue;
    const painted = masks.overlay.includes(rule.shape);
    const n = TRANSITION_PIECES.length;
    const layer = (col: (i: number) => number) => TRANSITION_PIECES.map((_, i) => {
      const [c, ctx] = canvas(T, T);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(masks.img, col(i) * masks.cell, shape * masks.cell, masks.cell, masks.cell, 0, 0, c.width, c.height);
      return c;
    });
    const body = layer((i) => i).map((c) => { // o topo de quem avança dentro da forma (a forma é a única coisa que gira)
      const ctx = c.getContext('2d')!;
      ctx.globalCompositeOperation = 'source-in';
      ctx.drawImage(tile, 0, 0, c.width, c.height);
      return c;
    });
    const pieces: TransitionLayers = { body, halo: painted ? layer((i) => n + i) : null, foam: painted ? layer((i) => 2 * n + i) : null };
    over.set(rule.shape, pieces);
    onto.set(rule.onto, [...(onto.get(rule.onto) ?? []), rule]);
  }
  return { over, onto };
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
  [Block.CHERRY_LOG]: '#5a2a24',
  [Block.CHERRY_PLANKS]: '#6a2e2a',
  [Block.BIRCH_LOG]: '#6a5a48',
  [Block.BIRCH_PLANKS]: '#8a6a44',
};

// ---------------------------------------------------------------- água

/** Ladrilho de água a partir do topo do bloco da arte; `v` espelha (bit 0: horizontal, bit 1: vertical). */
function artWaterTile(top: HTMLImageElement, v: number): HTMLCanvasElement {
  const [c, ctx] = canvas(T, T);
  ctx.translate(v & 1 ? T : 0, v & 2 ? T : 0);
  ctx.scale(v & 1 ? -1 : 1, v & 2 ? -1 : 1);
  ctx.drawImage(top, 0, 0, T, T);
  return c;
}

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

/** Quadros de cada tira de árvore adulta (`scripts/process-trees.py`): a variante de cada árvore é sorteada pela posição. */
const TREE_FRAMES = { oak: 3, apple: 3, appleBare: 3, cherry: 3, birch: 3 } as const;
/** Largura da árvore em células de mundo (o quadro tem a árvore mais larga da espécie de ponta a ponta). */
const TREE_CELLS = 3.4;

/**
 * Árvores adultas e cacto (v0.88.0, sem crescimento): carvalho, macieira e cerejeira vêm em tiras de variantes (formas
 * diferentes; a macieira colhida tem as mesmas formas, sem as maçãs), o cacto, da prancha 4 × 2. Sem a arte, ficam as pintadas.
 */
function growthTreeSprites(
  art: TreeArt | null, objects: Map<BlockId, Sprite>,
): Map<BlockId, Sprite[]> {
  const variants = new Map<BlockId, Sprite[]>();
  if (!art) return variants;
  const oak = stripSprites(art.oak, TREE_FRAMES.oak, T * TREE_CELLS, 6);
  const apple = stripSprites(art.apple, TREE_FRAMES.apple, T * TREE_CELLS, 6);
  const appleBare = stripSprites(art.appleBare, TREE_FRAMES.appleBare, T * TREE_CELLS, 6);
  const cherry = stripSprites(art.cherry, TREE_FRAMES.cherry, T * TREE_CELLS, 6);
  const birch = stripSprites(art.birch, TREE_FRAMES.birch, T * TREE_CELLS, 6);
  const cactus = gridSprites(art.cactus, 4, 2, 1.7, 3);
  const set = (id: BlockId, frames: Sprite[]) => {
    objects.set(id, frames[0]);
    if (frames.length > 1) variants.set(id, frames);
  };
  set(Block.OAK_TREE, oak);
  set(Block.APPLE_TREE, apple);
  set(Block.APPLE_TREE_BARE, appleBare); // mesma forma e mesma ordem da carregada: a mesma variante por célula, só sem as maçãs
  set(Block.SAKURA_TREE, cherry);
  set(Block.BIRCH_TREE, birch);
  set(Block.CACTUS, cactus);
  return variants;
}

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

/** `town`: o mundo tem a Cidade do Despertar (pinta as construções dela). */
export function createBlockTextures(opts: { town?: boolean } = {}): BlockTextures {
  const groundTop = new Map<BlockId, HTMLCanvasElement>();
  const groundVariants = new Map<BlockId, HTMLCanvasElement[]>();
  const objects = new Map<BlockId, Sprite>();
  const icons = new Map<BlockId, string>();
  // Cada grupo só é montado se o pacote de arte do mundo trouxe a imagem (ex.: Santuário não tem materiais).
  const pack = art();
  if (getBlockAtlas()) {
    MATERIALS.forEach((id, i) => {
      icons.set(id, pack.materialIcons[id] ?? '');
      if (i >= LEGACY_MATERIALS) return; // madeira de cerejeira e outros novos só existem no V2 (sem coluna no atlas antigo)
      groundTop.set(id, materialTop(i));
      objects.set(id, materialCube(i, OUTLINE[id] ?? '#3a2a20'));
    });
  }
  // Água: topo do bloco de água da arte, ladrilho contínuo sempre na mesma orientação (espelhar por célula
  // quebra a continuidade e forma um quadriculado); sem arte, procedural.
  const wa = getWaterArt();
  let water = wa ? [artWaterTile(wa.top, 0)] : Array.from({ length: WATER_VARIANTS }, (_, v) => waterTile(v));
  if (materialsV2InWorld()) { // topo da água do V2 (ladrilho contínuo); o da arte antiga só no `?blocos=legado`
    const [wc, wctx] = canvas(T, T);
    wctx.setTransform(1, 0, 0, 1, 0, 0);
    if (v2WaterTop(wctx, wc.width, wc.height)) water = [wc];
  }
  for (const id of [Block.OAK_TREE, Block.SAKURA_TREE] as BlockId[]) objects.set(id, treeSprite(id));
  objects.set(Block.CACTUS, cactusSprite());
  const treeVariants = growthTreeSprites(getTreeArt(), objects);
  // Carvalhos isométricos (v0.93.127): a mesma tira de 3 quadros do carvalho (o maior de ponta a ponta), mas desenhados em perspectiva isométrica; só a câmera Isométrica do Santuário.
  const isoArt = getTreeArt()?.oakIso;
  const isoOak: Sprite[] = isoArt ? stripSprites(isoArt, TREE_FRAMES.oak, T * TREE_CELLS, 6) : [];
  // Pedregulhos: 40 artes da prancha de pedras (quadro de 2 células; as pedrinhas ficam pequenas no meio).
  const rockArt = getRockArt();
  if (rockArt) {
    const frames = stripSprites(rockArt, Math.round(rockArt.width / rockArt.height), T * 2, 4);
    objects.set(Block.ROCK_BOULDER, frames[0]);
    treeVariants.set(Block.ROCK_BOULDER, frames);
  }
  for (const id of [Block.TALL_GRASS, Block.FLOWER] as BlockId[]) objects.set(id, decorationSprite(id));
  // Flores fofas (`scripts/extract-flowers.py`): um quadro por flor, sorteado por célula; a Flor procedural fica de reserva (Santuário etc.).
  const flowerArt = getFlowerArt();
  if (flowerArt) {
    const n = Math.round(flowerArt.width / flowerArt.height);
    const fw = flowerArt.width / n, k = T / 128; // 128 px de arte = 1 célula, como a cerca
    const frames = Array.from({ length: n }, (_, i): Sprite => {
      const c = document.createElement('canvas');
      c.width = fw;
      c.height = flowerArt.height;
      c.getContext('2d')!.drawImage(flowerArt, i * fw, 0, fw, flowerArt.height, 0, 0, fw, flowerArt.height);
      const w = fw * k, h = flowerArt.height * k;
      const oy = T - 3 - (92 / 96) * h; // base do caule 3 px acima da borda de baixo da célula
      return { canvas: c, ox: (T - w) / 2, oy, w, h, hit: { x: 0, y: oy, w: T, h: T - oy } };
    });
    objects.set(Block.FLOWER, frames[0]);
    treeVariants.set(Block.FLOWER, frames);
    // As 15 Flores Fofas colocáveis (v0.93.110): cada bloco desenha o quadro da própria flor (mesma ordem da lista) e tem o ícone dela.
    const icons15 = art().flowerIcons ?? [];
    FLOWER_BLOCKS.forEach((id, i) => {
      if (frames[i]) objects.set(id, frames[i]);
      if (icons15[i]) icons.set(id, icons15[i]);
    });
  }
  // Santuário Celestial: arte da prancha 3/4 (atlas) + ícones do cubo inteiro.
  for (const id of getCelestialAtlas() ? CELESTIAL_BLOCKS : []) {
    const { top, front, ground } = celestialFaces(id);
    groundTop.set(id, ground);
    objects.set(id, composeCube(
      (ctx) => ctx.drawImage(top, 0, 0, T, T),
      (ctx) => ctx.drawImage(front, 0, T, T, F),
      CELESTIAL_STYLE[id].outline,
    ));
    icons.set(id, pack.celestialIcons[id] ?? '');
  }
  const variants = new Map<BlockId, Sprite[]>(treeVariants);
  const stackDraw = new Map<BlockId, number>();
  if (getDungeonArt()) dungeonTextures(groundTop, objects, variants, stackDraw);
  // Materiais com mais de uma arte (Terra com Grama): chão e cubo sorteiam a variação por célula.
  if (getBlockAtlas()) {
    for (const [key, cols] of Object.entries(MATERIAL_VARIANT_COLS)) {
      const id = Number(key) as BlockId;
      const i = MATERIALS.indexOf(id);
      if (i < 0 || !cols || getBlockAtlas()!.width < (Math.max(...cols) + 1) * ATLAS_TOP) continue;
      groundVariants.set(id, [groundTop.get(id)!, ...cols.map(materialTop)]);
      variants.set(id, [objects.get(id)!, ...cols.map((c) => materialCube(c, OUTLINE[id] ?? '#3a2a20'))]);
    }
  }
  const continuousGround = new Set<BlockId>();
  if (materialsV2InWorld()) applyMaterialsV2(groundTop, groundVariants, objects, variants, continuousGround);
  const { over: transitionOver, onto: transitionOnto } = buildTransitions(groundTop, continuousGround, materialsV2InWorld() ? water[0] : null);
  // Tenda (2×2): base na borda de baixo do canto inferior esquerdo; ícone do pacote.
  const tentImg = getTentSprite();
  if (tentImg) {
    // 2×2: sprite com 2 células de largura sobre o canto inferior esquerdo (as partes não têm arte).
    const w = T * 2.1;
    const h = w * (tentImg.height / tentImg.width);
    const c = document.createElement('canvas');
    c.width = tentImg.width;
    c.height = tentImg.height;
    c.getContext('2d')!.drawImage(tentImg, 0, 0);
    const oy = T - h + 2;
    objects.set(Block.TENT, { canvas: c, ox: (2 * T - w) / 2, oy, w, h, hit: { x: 0, y: oy, w: 2 * T, h: T - oy } });
    icons.set(Block.TENT, pack.tent?.icon ?? '');
  }
  // Baú: sprite de frente, ~1 célula de largura, base na borda de baixo da célula; ícone do pacote.
  const chestImg = getChestSprite();
  if (chestImg) {
    const w = T * 1.05;
    const h = w * (chestImg.height / chestImg.width);
    const c = document.createElement('canvas');
    c.width = chestImg.width;
    c.height = chestImg.height;
    c.getContext('2d')!.drawImage(chestImg, 0, 0);
    const oy = T - h + 1;
    objects.set(Block.CHEST, { canvas: c, ox: (T - w) / 2, oy, w, h, hit: { x: 0, y: oy, w: T, h: T - oy } });
    icons.set(Block.CHEST, pack.chest?.icon ?? '');
  }
  // Objetos fabricados: sprite de frente com a largura em células da tabela, base no pé da célula; ícone do pacote.
  for (const [key, prop] of Object.entries(CRAFT_PROPS)) {
    if (!prop) continue;
    const [name, cells] = prop;
    const id = Number(key) as BlockId;
    const img = getCraftableSprite(name);
    if (!img) continue;
    const w = T * cells;
    const h = w * (img.height / img.width);
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    c.getContext('2d')!.drawImage(img, 0, 0);
    const oy = T - h + 2;
    objects.set(id, { canvas: c, ox: (T - w) / 2, oy, w, h, hit: { x: 0, y: oy, w: T, h: T - oy } });
    icons.set(id, pack.craftables?.[name]?.icon ?? '');
  }
  const doorFrames = getOakDoorSheet() ? doorSprites() : [];
  if (doorFrames.length) {
    objects.set(Block.OAK_DOOR, doorFrames[0]);
    objects.set(Block.OAK_DOOR_OPEN, doorFrames[3]);
    // Ícone em arquivo próprio: ler um canvas desenhado com imagem de outro arquivo pode ser bloqueado (ADR 0013).
    icons.set(Block.OAK_DOOR, pack.materialIcons[Block.OAK_DOOR] ?? '');
  }
  // Paredes autotile (W5): o desenho é do `ChunkWalls`; aqui só os ícones da hotbar/bolsa.
  for (const id of [Block.WALL_PLANKS, Block.WALL_STONE, Block.WALL_DOOR_PLANKS] as BlockId[]) {
    const url = id === Block.WALL_DOOR_PLANKS ? pack.materialIcons[Block.OAK_DOOR] : pack.materialIcons[id];
    if (url) icons.set(id, url);
  }
  const gateFrames = new Map<BlockId, Sprite[]>();
  const gateFramesSide = new Map<BlockId, Sprite[]>();
  const fencePieces = fenceTextures(objects, icons, gateFrames, gateFramesSide);
  // Cerca de Estacas (v0.93.90): o ícone vem do pacote da vila (`village-stake-icon`).
  const stakeIcon = getTownImages().get('village-stake-icon')?.src;
  if (stakeIcon) icons.set(Block.FENCE_STAKE, stakeIcon);
  const glowColor = new Map<BlockId, string>([
    [Block.MOSS_LUMINOUS, '#c8ff8a'],
    [Block.CRYSTAL_LIFE, '#ff9be6'],
    [Block.LIGHT_BLOCK, '#ffe08a'],
    [Block.LAMP, '#ffd27a'],
    [Block.CAMPFIRE, '#ffab4a'],
    [Block.CAULDRON, '#ff9a3c'],
    [Block.OVEN, '#ff9a3c'],
  ]);
  if (opts.town) for (const [id, sprites] of townSprites(getTownImages())) variants.set(id, sprites);
  const bankColor = new Map<BlockId, string>([
    [Block.GRASS, '#8a5a36'],
    [Block.DIRT, '#8a5a36'],
    [Block.TILLED, '#7a4a2a'],
    [Block.PATH, '#a07040'],
    [Block.SAND, '#d9b06a'],
    [Block.STONE, '#6a6676'],
    [Block.STONE_COBBLE, '#6a6676'],
    [Block.STONE_BRICK, '#6a6676'],
    [Block.STONE_FLOOR, '#6a6676'],
    [Block.STONE_SMOOTH, '#6a6676'],
    [Block.STONE_POLISHED, '#6a6676'],
    [Block.STONE_CRACKED, '#6a6676'],
    [Block.STONE_BRICK_CRACKED, '#6a6676'],
  ]);
  // Poste de luz: a lanterna fica pendurada à direita, ~1,6 célula acima do pé.
  // Fogo do caldeirão e do forno fica na base do desenho.
  const glowAt = new Map<BlockId, [number, number]>([[Block.LAMP, [0.32, -1.6]], [Block.CAULDRON, [0, -0.25]], [Block.OVEN, [0, -0.6]]]);
  return { groundTop, continuousGround, transitionOver, transitionOnto, groundVariants, water, objects, icons, glowColor, glowAt, bankColor, doorFrames, gateFrames, gateFramesSide, variants, isoOak, stackDraw, fencePieces };
}

/**
 * Cerca e portão (`render/fence.ts`): as 3 peças viram canvases para o render cortar as metades; a cerca também
 * ganha um sprite (trecho horizontal) para o clique e o destaque. Portão: um sprite por estado.
 */
function fenceTextures(objects: Map<BlockId, Sprite>, icons: Map<BlockId, string>, gateFrames: Map<BlockId, Sprite[]>, gateFramesSide: Map<BlockId, Sprite[]>): Map<BlockId, HTMLCanvasElement[]> {
  const a = getFenceArt();
  const pack = art().fence;
  const out = new Map<BlockId, HTMLCanvasElement[]>();
  if (!a || !pack) return out;
  const hit = { x: 0, y: -T * 0.9, w: T, h: T * 1.5 };
  for (const [id, img, icon] of [
    [Block.FENCE, a.pieces.get(Block.FENCE), pack.icon],
    [Block.FENCE_BIRCH, a.pieces.get(Block.FENCE_BIRCH), pack.birch.icon],
    [Block.FENCE_CHERRY, a.pieces.get(Block.FENCE_CHERRY), pack.cherry.icon],
  ] as const) {
    if (!img) continue;
    const pieces = [0, 1, 2, 3, 4].map((i) => {
      const c = document.createElement('canvas');
      c.width = FENCE_FRAME.w;
      c.height = FENCE_FRAME.h;
      c.getContext('2d')!.drawImage(img, i * FENCE_FRAME.w, 0, FENCE_FRAME.w, FENCE_FRAME.h, 0, 0, FENCE_FRAME.w, FENCE_FRAME.h);
      return c;
    });
    out.set(id, pieces);
    objects.set(id, { canvas: pieces[0], ox: FENCE_OFFSET.x, oy: FENCE_OFFSET.y, w: FENCE_FRAME.w * FENCE_SCALE, h: FENCE_FRAME.h * FENCE_SCALE, hit });
    icons.set(id, icon);
  }
  // Porteira: 5 poses (0°→90°) por madeira, na mesma escala e âncora da cerca; 10 quadros (abre 0..4, fecha 5..9).
  const k = FENCE_SCALE;
  const w = GATE_FRAME.w * k;
  const h = GATE_FRAME.h * k;
  const oy = T / 2 - GATE_FRAME.postBase * k;
  for (const [fenceId, img] of a.gates) {
    const poses: Sprite[] = [];
    for (let i = 0; i < GATE_FRAME.poses; i++) {
      const c = document.createElement('canvas');
      c.width = GATE_FRAME.w;
      c.height = GATE_FRAME.h;
      c.getContext('2d')!.drawImage(img, i * GATE_FRAME.w, 0, GATE_FRAME.w, GATE_FRAME.h, 0, 0, GATE_FRAME.w, GATE_FRAME.h);
      poses.push({ canvas: c, ox: (T - w) / 2, oy, w, h, hit });
    }
    gateFrames.set(fenceId, [...poses, ...[...poses].reverse()]);
    const [closed, open] = fenceId === Block.FENCE_BIRCH ? [Block.FENCE_GATE_BIRCH, Block.FENCE_GATE_BIRCH_OPEN]
      : fenceId === Block.FENCE_CHERRY ? [Block.FENCE_GATE_CHERRY, Block.FENCE_GATE_CHERRY_OPEN] : [Block.FENCE_GATE, Block.FENCE_GATE_OPEN];
    objects.set(closed, poses[0]);
    objects.set(open, poses[poses.length - 1]);
  }
  // De lado (v0.93.104): quadro mais alto, mesma âncora.
  const sw = GATE_SIDE_FRAME.w * k, sh = GATE_SIDE_FRAME.h * k, soy = T / 2 - GATE_SIDE_FRAME.postBase * k;
  for (const [fenceId, img] of a.gatesSide) {
    const poses: Sprite[] = [];
    for (let i = 0; i < GATE_SIDE_FRAME.poses; i++) {
      const c = document.createElement('canvas');
      c.width = GATE_SIDE_FRAME.w;
      c.height = GATE_SIDE_FRAME.h;
      c.getContext('2d')!.drawImage(img, i * GATE_SIDE_FRAME.w, 0, GATE_SIDE_FRAME.w, GATE_SIDE_FRAME.h, 0, 0, GATE_SIDE_FRAME.w, GATE_SIDE_FRAME.h);
      poses.push({ canvas: c, ox: (T - sw) / 2, oy: soy, w: sw, h: sh, hit: { x: 0, y: -T * 0.9, w: T, h: T * 2.4 } });
    }
    gateFramesSide.set(fenceId, [...poses, ...[...poses].reverse()]);
  }
  icons.set(Block.FENCE_GATE, pack.gateIcon);
  icons.set(Block.FENCE_GATE_BIRCH, pack.birch.gateIcon);
  icons.set(Block.FENCE_GATE_CHERRY, pack.cherry.gateIcon);
  return out;
}

