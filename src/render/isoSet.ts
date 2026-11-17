import { TILE } from '../config';
import { Block, ISO_BIG, ISO_CUBES, ISO_PROPS, ISO_SCALE, type BlockId } from '../world/blocks';
import { RIO_CANAL, RIO_LAGO, RIO_PIECES, rioVirtualId } from '../world/rio';
import { ISO_GROUND_ORDER, ISO_PROPS_ATLAS } from './isoSetManifest';
import type { Sprite } from './textures';

/**
 * Conjunto isométrico do Santuário (ADR 0036, v0.93.140): a prancha do dono do produto (`assets-src/iso-set/prancha-iso.png`,
 * `scripts/extract-iso-set.py`) vira blocos. A câmera isométrica (azimute 45°, elevação 35,264°) mostra o topo de um cubo como um losango de
 * 1,414 de largura por 0,816 de altura e uma aresta vertical com 0,816 — o desenho da prancha já nasceu nessa projeção, então:
 *  - **cubos**: o topo vem "desentortado" do losango para um quadrado (u = leste, v = sul) e as duas faces visíveis (sul e leste) viram texturas
 *    próprias do cubo (`BlockFaces.cube`, ordem +X −X +Y −Y +Z −Z);
 *  - **objetos**: o desenho vai inteiro num plano vertical que gira 45° para encarar a câmera (`SpriteDraw.yaw`); 127,3 px da prancha = 1 célula na
 *    horizontal e 103,9 px = 1 célula de altura.
 * Só composição de canvas (nada de ler pixels, CLAUDE.md).
 */
export interface IsoSetImages {
  ground: HTMLImageElement;
  cube: HTMLImageElement;
  props: HTMLImageElement;
  /** Bloco de Pedra (`scripts/extract-iso-stone.py`): topo, sul e leste, 3 quadrados de 128 px em 1 linha. */
  stone: HTMLImageElement;
  /** Rio das Fadas (`scripts/extract-iso-rio.py`): topos de 128 px (7 por linha, ordem de `RIO_PIECES`) e, na linha de baixo, as laterais seco / canal / lago. */
  rio: HTMLImageElement;
}

/** Pixels da prancha por célula, na horizontal (a largura do losango é 1,414 célula) e na vertical (aresta × cos 35,264°). */
const ART_PER_CELL_X = 127.3;
const ART_PER_CELL_Y = 103.9;
const RES = TILE * 2; // a mesma resolução das outras texturas (TEX_RES = 2)
const FACE = 128;

type Side = 'grass' | 'earth' | 'stone';
/** De que são as laterais de cada cubo: terra com franja de grama (o Piso de Grama), terra lisa (o de Terra), ou pedra (o de Pedra). */
const SIDE: Record<string, Side> = { g_grass: 'grass', g_dirt: 'earth', g_stone: 'stone' };
export const ISO_KEY: ReadonlyMap<BlockId, string> = new Map<BlockId, string>([...ISO_CUBES, ...ISO_PROPS].map((id) => {
  const name = Object.entries(Block).find(([, v]) => v === id)![0]; // ISO_G_GRASS → g_grass
  return [id, name.slice(4).toLowerCase()];
}));

function square(size = RES): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')!];
}

function slice(img: HTMLImageElement, sx: number, sy: number, sw: number, sh: number, size = RES): HTMLCanvasElement {
  const [c, ctx] = square(size);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
  return c;
}

export type IsoCubeFaces = [HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement];

/**
 * Monta as texturas do conjunto: topo de cada cubo (chão e cubo), as 6 faces, o sprite de cada objeto e o ícone de cada peça. `icons` vem do pacote de arte
 * (URLs por chave da peça, ex. `g-grass`).
 */
export function isoSetTextures(
  images: IsoSetImages, iconUrls: Readonly<Record<string, string>>,
  groundTop: Map<BlockId, HTMLCanvasElement>, objects: Map<BlockId, Sprite>, icons: Map<BlockId, string>, cubes: Map<BlockId, IsoCubeFaces>,
): void {
  const { ground, cube, props, stone, rio } = images;
  const tops = new Map<string, HTMLCanvasElement>();
  ISO_GROUND_ORDER.forEach((key, i) => tops.set(key, slice(ground, (i % 5) * FACE, Math.floor(i / 5) * FACE, FACE, FACE)));
  const south = slice(cube, 0, 0, FACE, FACE);
  const east = slice(cube, FACE, 0, FACE, FACE);
  // Laterais: franja de grama sobre terra (o bloco de grama), a terra (o próprio piso escurecido) e a pedra (idem).
  const darken = (src: HTMLCanvasElement, k: number): HTMLCanvasElement => {
    const [c, ctx] = square();
    ctx.drawImage(src, 0, 0, RES, RES);
    ctx.fillStyle = `rgba(20, 15, 35, ${k})`;
    ctx.fillRect(0, 0, RES, RES);
    return c;
  };
  const sides: Record<Side, [HTMLCanvasElement, HTMLCanvasElement]> = {
    grass: [south, east],
    // Piso de Terra: a lateral é o próprio piso (a terra com pedrinhas) escurecido — sem esticar um pedaço da lateral do bloco de grama, que deformava a pedra e a trepadeira.
    earth: [darken(tops.get('g_dirt')!, 0.16), darken(tops.get('g_dirt')!, 0.3)],
    stone: [darken(tops.get('g_stone')!, 0.2), darken(tops.get('g_stone')!, 0.34)],
  };
  for (const id of ISO_CUBES) {
    if (id === Block.ISO_STONE_BLOCK) {
      const top = slice(stone, 0, 0, FACE, FACE), s = slice(stone, FACE, 0, FACE, FACE), e = slice(stone, 2 * FACE, 0, FACE, FACE);
      groundTop.set(id, top);
      cubes.set(id, [e, e, top, s, s, s]);
      continue;
    }
    const key = ISO_KEY.get(id)!;
    const top = tops.get(key)!;
    const [s, e] = sides[SIDE[key]];
    groundTop.set(id, top);
    // +X (leste), −X, +Y (topo), −Y, +Z (sul), −Z
    cubes.set(id, [e, e, top, s, s, s]);
  }
  // Rio das Fadas: uma face-conjunto por peça (id virtual, só do desenho). A lateral sul vem da borda S da peça e a leste da borda L; a laje (7/16) fica em cima
  // de uma base de terra (já composta na folha).
  const RIO_COLS = 7;
  const rioBase = Math.ceil(RIO_PIECES.length / RIO_COLS) * FACE;
  const rioSides: Record<string, [HTMLCanvasElement, HTMLCanvasElement]> = {};
  ['D', 'C', 'F'].forEach((edge, j) => {
    const face = slice(rio, j * FACE, rioBase, FACE, FACE);
    rioSides[edge] = [darken(face, 0.1), darken(face, 0.24)];
  });
  for (const p of RIO_PIECES) {
    const top = slice(rio, (p.index % RIO_COLS) * FACE, Math.floor(p.index / RIO_COLS) * FACE, FACE, FACE);
    const s = rioSides[p.edges[2]][0], e = rioSides[p.edges[1]][1];
    cubes.set(rioVirtualId(p), [e, e, top, s, s, s]);
  }
  // Os pincéis (cursor fantasma e ícone) usam a peça de exemplo: canal norte–sul e água calma.
  cubes.set(RIO_CANAL, cubes.get(rioVirtualId(RIO_PIECES.find((p) => p.key === 'canal_ns')!))!);
  cubes.set(RIO_LAGO, cubes.get(rioVirtualId(RIO_PIECES.find((p) => p.key === 'calma')!))!);
  if (iconUrls['rio-canal']) icons.set(RIO_CANAL, iconUrls['rio-canal']);
  if (iconUrls['rio-lago']) icons.set(RIO_LAGO, iconUrls['rio-lago']);
  for (const id of ISO_PROPS) {
    const key = ISO_KEY.get(id)!;
    const r = ISO_PROPS_ATLAS[key];
    if (!r) continue;
    const [x, y, w, h] = r;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.getContext('2d')!.drawImage(props, x, y, w, h, 0, 0, w, h);
    const k = ISO_SCALE[id] ?? 1; // a árvore 2×, a casa 4×, a barraca 3× (pedido do dono do produto)
    const pw = (w / ART_PER_CELL_X) * TILE * k, ph = (h / ART_PER_CELL_Y) * TILE * k;
    const cells = ISO_BIG[id]?.size ?? 1; // a casa ocupa 12 × 12 e a barraca 3 × 3
    // O desenho se apoia na quina sul da base (onde o losango da base toca o chão mais perto da câmera): o plano gira em volta do meio da borda de baixo.
    objects.set(id, { canvas: c, ox: cells * TILE - pw / 2, oy: TILE - ph, w: pw, h: ph, hit: { x: 0, y: 0, w: TILE * cells, h: TILE } });
  }
  for (const id of [...ISO_CUBES, ...ISO_PROPS]) {
    const url = iconUrls[ISO_KEY.get(id)!.replace(/_/g, '-')];
    if (url) icons.set(id, url);
  }
}
