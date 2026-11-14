import { CUBE_FRONT, TILE } from '../config';
import { Block, CELESTIAL_BLOCKS } from '../world/blocks';
import { getCelestialAtlas, getCelestialSurface } from './blockArt';
import { v2Faces } from './materialsV2';

/**
 * Blocos do Santuário Celestial — arte da prancha 3/4 fornecida
 * (assets-src/celestial-blocks-34.png → scripts/extract-blocks.py --celestial):
 * atlas com topo/frente/chão contínuo. Os ícones do cubo inteiro vêm do pacote de arte (`render/art/santuario.ts`).
 */

interface Style {
  /** Contorno desenhado ao redor do cubo (cor escura do próprio material). */
  outline: string;
}

const RES = 2; // mesma resolução das demais texturas (TEX_RES)
const T = TILE;
const F = CUBE_FRONT;

export const CELESTIAL_STYLE: Record<number, Style> = {
  [Block.CLOUD_SOLID]: { outline: '#8b90c8' },
  [Block.CLOUD_ETHEREAL]: { outline: '#5c64b8' },
  [Block.MARBLE_CELESTIAL]: { outline: '#a8957a' },
  [Block.MARBLE_ORNATE]: { outline: '#a9813a' },
  [Block.STONE_CELESTIAL]: { outline: '#8f857a' },
  [Block.STONE_GOLDEN]: { outline: '#a07a30' },
  [Block.GRASS_CELESTIAL]: { outline: '#4a6a24' },
  [Block.GRASS_FLOWERY]: { outline: '#4a6a24' },
  [Block.MOSS_LUMINOUS]: { outline: '#5f8a2a' },
  [Block.EARTH_SACRED]: { outline: '#5a3420' },
  [Block.EARTH_FLORAL]: { outline: '#5a3420' },
  [Block.EARTH_CULTIVATED]: { outline: '#4e2e1a' },
  [Block.WATER_SACRED]: { outline: '#1f7fae' },
  [Block.WATER_CRYSTAL]: { outline: '#1a6aa0' },
  [Block.WATER_PURE]: { outline: '#00a9d6' },
  [Block.CRYSTAL_LIFE]: { outline: '#9a4aa8' },
  [Block.LIGHT_BLOCK]: { outline: '#b8862a' },
  [Block.WOOD_CELESTIAL]: { outline: '#9a8264' },
  [Block.FOLIAGE_GOLDEN]: { outline: '#8a6418' },
};

const ATLAS_TOP = T * RES;
const ATLAS_FRONT = F * RES;

function slice(atlas: HTMLImageElement, col: number, sy: number, sh: number, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w * RES;
  c.height = h * RES;
  c.getContext('2d')!.drawImage(atlas, col * ATLAS_TOP, sy, ATLAS_TOP, sh, 0, 0, c.width, c.height);
  return c;
}

/** Textura quadrada única: a projeção do cubo decide a altura da frente. */
function surfaceFace(img: HTMLImageElement, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w * RES;
  c.height = h * RES;
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

type CelestialFaces = {
  top: HTMLCanvasElement; front: HTMLCanvasElement; ground: HTMLCanvasElement;
  cube?: [HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement];
  unlit?: boolean;
};
const cache = new Map<number, CelestialFaces>();
/** Atlas exclusivo do laboratório: 8 blocos × 6 faces, ordenados pela hotbar.
 * Linhas: +X, -X, +Y, -Y, +Z, -Z (ordem nativa do BoxGeometry). */
export const SANCTUARY_CUBE_IDS = [
  Block.DIRT, Block.TILLED, Block.GRASS, Block.WATER_PURE,
  Block.OAK_LOG, Block.OAK_PLANKS, Block.STONE, Block.STONE_SMOOTH,
] as const;
let sanctuaryEightAtlas: HTMLImageElement | null = null;
export function installSanctuaryEightBlockAtlas(atlas: HTMLImageElement): void {
  sanctuaryEightAtlas = atlas;
  for (const id of SANCTUARY_CUBE_IDS) cache.delete(id);
}
function atlasCell(atlas: HTMLImageElement, column: number, face: number): HTMLCanvasElement {
  const side = atlas.width / SANCTUARY_CUBE_IDS.length;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  canvas.getContext('2d')!.drawImage(
    atlas, column * side, face * side, side, side, 0, 0, 128, 128,
  );
  return canvas;
}
let grassNet: HTMLImageElement | null = null;
export function installCelestialGrassNet(image: HTMLImageElement): void {
  grassNet = image;
  cache.delete(Block.GRASS_CELESTIAL);
}
function netTile(img: HTMLImageElement, col: number, row: number): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = out.height = 128;
  out.getContext('2d')!.drawImage(img, col * 128, row * 128, 128, 128, 0, 0, 128, 128);
  return out;
}

/**
 * A Terra Arada tem o mesmo pigmento do barro da Grama Celestial.
 * O atlas de arado V2 fornece somente a variação de relevo/claridade,
 * jamais uma segunda paleta de terra (evita blocos com tons incompatíveis).
 */
function cultivatedTop(earth: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = out.height = 128;
  const ctx = out.getContext('2d')!;
  ctx.drawImage(earth, 0, 0);
  const furrows = v2Faces(Block.TILLED, 128, 128, 1);
  if (!furrows) return out;
  const source = document.createElement('canvas');
  source.width = source.height = 128;
  furrows.top(source.getContext('2d')!);
  const original = ctx.getImageData(0, 0, 128, 128);
  const relief = source.getContext('2d')!.getImageData(0, 0, 128, 128).data;
  const pixels = original.data;
  const lum = (index: number) => 0.2126 * relief[index] + 0.7152 * relief[index + 1] + 0.0722 * relief[index + 2];
  let average = 0;
  for (let i = 0; i < relief.length; i += 4) average += lum(i);
  average /= relief.length / 4;
  for (let i = 0; i < pixels.length; i += 4) {
    const factor = Math.max(0.68, Math.min(1.32, 1 + (lum(i) - average) * 1.5 / 255));
    pixels[i] = Math.min(255, pixels[i] * factor);
    pixels[i + 1] = Math.min(255, pixels[i + 1] * factor);
    pixels[i + 2] = Math.min(255, pixels[i + 2] * factor);
  }
  ctx.putImageData(original, 0, 0);
  return out;
}

/**
 * Faces de um bloco celestial, recortadas do atlas da prancha 3/4 (ordem de CELESTIAL_BLOCKS):
 * topo do cubo, frente e topo contínuo para o chão — em resolução 2×.
 */
export function celestialFaces(id: number): CelestialFaces {
  let faces = cache.get(id);
  if (!faces) {
    // As oito artes novas são a única fonte visual desses materiais no
    // Santuário. Cada cubo usa as seis faces EXATAS da rede enviada, sem
    // modificar o restante dos blocos do Mundo principal.
    const atlasColumn = SANCTUARY_CUBE_IDS.indexOf(id as typeof SANCTUARY_CUBE_IDS[number]);
    if (sanctuaryEightAtlas && atlasColumn !== -1) {
      const sides = [0, 1, 2, 3, 4, 5].map((face) => atlasCell(sanctuaryEightAtlas!, atlasColumn, face));
      const cube = sides as CelestialFaces['cube'];
      faces = { top: sides[2], front: sides[4], ground: sides[2], cube, unlit: true };
      cache.set(id, faces);
      return faces;
    }
    if (id === Block.GRASS_CELESTIAL && grassNet) {
      const east = netTile(grassNet, 0, 1);
      const west = netTile(grassNet, 1, 1);
      const south = netTile(grassNet, 2, 1);
      const north = netTile(grassNet, 3, 1);
      const top = netTile(grassNet, 1, 0);
      const bottom = netTile(grassNet, 1, 2);
      faces = { top, front: south, ground: top, cube: [east, west, top, bottom, south, north], unlit: true };
      cache.set(id, faces);
      return faces;
    }
    // Grama, Terra e Arada passam a usar a MESMA tinta de barro, diretamente
    // da face inferior da rede da Grama Celestial (sem diferença de iluminação).
    if ((id === Block.DIRT || id === Block.TILLED) && grassNet) {
      const earth = netTile(grassNet, 1, 2);
      const top = id === Block.TILLED ? cultivatedTop(earth) : earth;
      faces = { top, front: earth, ground: top,
        cube: [earth, earth, top, earth, earth, earth], unlit: true };
      cache.set(id, faces);
      return faces;
    }
    // Água Pura: arte enviada em azul-turquesa aplicada em seis faces reais.
    if (id === Block.WATER_PURE) {
      const water = getCelestialSurface(id);
      const face = document.createElement('canvas');
      face.width = face.height = 128;
      const ctx = face.getContext('2d')!;
      if (water) ctx.drawImage(water, 0, 0, 128, 128);
      else { ctx.fillStyle = '#08b9d9'; ctx.fillRect(0, 0, 128, 128); }
      faces = { top: face, front: face, ground: face,
        cube: [face, face, face, face, face, face], unlit: true };
      cache.set(id, faces);
      return faces;
    }
    // Terra lisa e Terra Arada: topo V2 de cada material, quatro faces laterais
    // da mesma terra e face inferior de terra. Não repetir o topo arado nas laterais.
    if (id === Block.DIRT || id === Block.TILLED) {
      const surface = v2Faces(id, 128, 128, 1);
      const dirt = v2Faces(Block.DIRT, 128, 128, 1);
      if (surface && dirt) {
        const top = document.createElement('canvas');
        top.width = top.height = 128;
        surface.top(top.getContext('2d')!);
        const sheet = document.createElement('canvas');
        sheet.width = 128; sheet.height = 256;
        dirt.front(sheet.getContext('2d')!);
        const side = document.createElement('canvas');
        side.width = side.height = 128;
        side.getContext('2d')!.drawImage(sheet, 0, 128, 128, 128, 0, 0, 128, 128);
        faces = { top, front: side, ground: top, cube: [side, side, top, side, side, side], unlit: true };
        cache.set(id, faces);
        return faces;
      }
    }
    const approved = getCelestialSurface(id);
    if (approved) {
      faces = {
        top: surfaceFace(approved, T, T),
        front: surfaceFace(approved, T, F),
        ground: surfaceFace(approved, T, T),
      };
    } else {
      const col = CELESTIAL_BLOCKS.indexOf(id);
      const atlas = getCelestialAtlas()!; // fallback para os outros 12 blocos
      faces = {
        top: slice(atlas, col, 0, ATLAS_TOP, T, T),
        front: slice(atlas, col, ATLAS_TOP, ATLAS_FRONT, T, F),
        ground: slice(atlas, col, ATLAS_TOP + ATLAS_FRONT, ATLAS_TOP, T, T),
      };
    }
    // Água Cristalina: mapa físico de seis faces, com topo próprio e
    // laterais aquáticas mesmo quando o jogador gira a câmera.
    // Reusa a arte celestial aprovada até existir uma rede 512×512 específica.
    if (id === Block.WATER_CRYSTAL) {
      faces.cube = [faces.front, faces.front, faces.top, faces.ground, faces.front, faces.front];
    }
    cache.set(id, faces);
  }
  return faces;
}
