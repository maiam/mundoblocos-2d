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
};
const cache = new Map<number, CelestialFaces>();
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
 * Faces de um bloco celestial, recortadas do atlas da prancha 3/4 (ordem de CELESTIAL_BLOCKS):
 * topo do cubo, frente e topo contínuo para o chão — em resolução 2×.
 */
export function celestialFaces(id: number): CelestialFaces {
  let faces = cache.get(id);
  if (!faces) {
    if (id === Block.GRASS_CELESTIAL && grassNet) {
      const east = netTile(grassNet, 0, 1);
      const west = netTile(grassNet, 1, 1);
      const south = netTile(grassNet, 2, 1);
      const north = netTile(grassNet, 3, 1);
      const top = netTile(grassNet, 1, 0);
      const bottom = netTile(grassNet, 1, 2);
      faces = { top, front: south, ground: top, cube: [east, west, top, bottom, south, north] };
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
        faces = { top, front: side, ground: top, cube: [side, side, top, side, side, side] };
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
    cache.set(id, faces);
  }
  return faces;
}
