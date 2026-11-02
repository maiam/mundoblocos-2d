import iconCloudEthereal from '../assets/icon-celestial-cloud-ethereal.webp?inline';
import iconCloudSolid from '../assets/icon-celestial-cloud-solid.webp?inline';
import iconCrystalLife from '../assets/icon-celestial-crystal-life.webp?inline';
import iconEarthCultivated from '../assets/icon-celestial-earth-cultivated.webp?inline';
import iconEarthFloral from '../assets/icon-celestial-earth-floral.webp?inline';
import iconEarthSacred from '../assets/icon-celestial-earth-sacred.webp?inline';
import iconFoliageGolden from '../assets/icon-celestial-foliage-golden.webp?inline';
import iconGrassCelestial from '../assets/icon-celestial-grass-celestial.webp?inline';
import iconGrassFlowery from '../assets/icon-celestial-grass-flowery.webp?inline';
import iconLightBlock from '../assets/icon-celestial-light-block.webp?inline';
import iconMarbleCelestial from '../assets/icon-celestial-marble-celestial.webp?inline';
import iconMarbleOrnate from '../assets/icon-celestial-marble-ornate.webp?inline';
import iconMossLuminous from '../assets/icon-celestial-moss-luminous.webp?inline';
import iconStoneCelestial from '../assets/icon-celestial-stone-celestial.webp?inline';
import iconStoneGolden from '../assets/icon-celestial-stone-golden.webp?inline';
import iconWaterCrystal from '../assets/icon-celestial-water-crystal.webp?inline';
import iconWaterSacred from '../assets/icon-celestial-water-sacred.webp?inline';
import iconWoodCelestial from '../assets/icon-celestial-wood-celestial.webp?inline';
import { CUBE_FRONT, TILE } from '../config';
import { Block, CELESTIAL_BLOCKS } from '../world/blocks';
import { getCelestialAtlas } from './blockArt';

/**
 * Blocos do Santuário Celestial — arte da prancha 3/4 fornecida
 * (assets-src/celestial-blocks-34.png → scripts/extract-blocks.py --celestial):
 * atlas com topo/frente/chão contínuo + ícones do cubo inteiro.
 */

interface Style {
  /** Contorno desenhado ao redor do cubo (cor escura do próprio material). */
  outline: string;
  /** Desenho com direção/centro: no chão não gira nem espelha. */
  oriented?: boolean;
  /** Textura em faixas (nuvens): no chão não gira nem espelha (emenda pelo topo contínuo). */
  mirrorOnly?: boolean;
}

const RES = 2; // mesma resolução das demais texturas (TEX_RES)
const T = TILE;
const F = CUBE_FRONT;

export const CELESTIAL_STYLE: Record<number, Style> = {
  [Block.CLOUD_SOLID]: { outline: '#8b90c8', mirrorOnly: true },
  [Block.CLOUD_ETHEREAL]: { outline: '#5c64b8', mirrorOnly: true },
  [Block.MARBLE_CELESTIAL]: { outline: '#a8957a' },
  [Block.MARBLE_ORNATE]: { outline: '#a9813a', oriented: true },
  [Block.STONE_CELESTIAL]: { outline: '#8f857a' },
  [Block.STONE_GOLDEN]: { outline: '#a07a30', oriented: true },
  [Block.GRASS_CELESTIAL]: { outline: '#4a6a24' },
  [Block.GRASS_FLOWERY]: { outline: '#4a6a24' },
  [Block.MOSS_LUMINOUS]: { outline: '#5f8a2a' },
  [Block.EARTH_SACRED]: { outline: '#5a3420' },
  [Block.EARTH_FLORAL]: { outline: '#5a3420' },
  [Block.EARTH_CULTIVATED]: { outline: '#4e2e1a', oriented: true },
  [Block.WATER_SACRED]: { outline: '#1f7fae' },
  [Block.WATER_CRYSTAL]: { outline: '#1a6aa0', oriented: true },
  [Block.CRYSTAL_LIFE]: { outline: '#9a4aa8', oriented: true },
  [Block.LIGHT_BLOCK]: { outline: '#b8862a', oriented: true },
  [Block.WOOD_CELESTIAL]: { outline: '#9a8264', oriented: true },
  [Block.FOLIAGE_GOLDEN]: { outline: '#8a6418' },
};

export const CELESTIAL_ICONS: Record<number, string> = {
  [Block.CLOUD_SOLID]: iconCloudSolid,
  [Block.CLOUD_ETHEREAL]: iconCloudEthereal,
  [Block.MARBLE_CELESTIAL]: iconMarbleCelestial,
  [Block.MARBLE_ORNATE]: iconMarbleOrnate,
  [Block.STONE_CELESTIAL]: iconStoneCelestial,
  [Block.STONE_GOLDEN]: iconStoneGolden,
  [Block.GRASS_CELESTIAL]: iconGrassCelestial,
  [Block.GRASS_FLOWERY]: iconGrassFlowery,
  [Block.MOSS_LUMINOUS]: iconMossLuminous,
  [Block.EARTH_SACRED]: iconEarthSacred,
  [Block.EARTH_FLORAL]: iconEarthFloral,
  [Block.EARTH_CULTIVATED]: iconEarthCultivated,
  [Block.WATER_SACRED]: iconWaterSacred,
  [Block.WATER_CRYSTAL]: iconWaterCrystal,
  [Block.CRYSTAL_LIFE]: iconCrystalLife,
  [Block.LIGHT_BLOCK]: iconLightBlock,
  [Block.WOOD_CELESTIAL]: iconWoodCelestial,
  [Block.FOLIAGE_GOLDEN]: iconFoliageGolden,
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

const cache = new Map<number, { top: HTMLCanvasElement; front: HTMLCanvasElement; ground: HTMLCanvasElement }>();

/**
 * Faces de um bloco celestial, recortadas do atlas da prancha 3/4 (ordem de CELESTIAL_BLOCKS):
 * topo do cubo, frente e topo contínuo para o chão — em resolução 2×.
 */
export function celestialFaces(id: number): { top: HTMLCanvasElement; front: HTMLCanvasElement; ground: HTMLCanvasElement } {
  let faces = cache.get(id);
  if (!faces) {
    const col = CELESTIAL_BLOCKS.indexOf(id);
    const atlas = getCelestialAtlas();
    faces = {
      top: slice(atlas, col, 0, ATLAS_TOP, T, T),
      front: slice(atlas, col, ATLAS_TOP, ATLAS_FRONT, T, F),
      ground: slice(atlas, col, ATLAS_TOP + ATLAS_FRONT, ATLAS_TOP, T, T),
    };
    cache.set(id, faces);
  }
  return faces;
}
