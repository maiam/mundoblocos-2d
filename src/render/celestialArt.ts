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
import { Block } from '../world/blocks';
import { mulberry32 } from '../world/random';

/**
 * Blocos do Santuário Celestial.
 * - Ícones da hotbar: cubos da prancha fornecida (assets-src/celestial-blocks-iso.png).
 * - Faces no mundo: ARTE PROVISÓRIA procedural na paleta de cada bloco, até chegar a
 *   prancha em 3/4 (aí estas faces passam a vir de um atlas, como os materiais do mundo principal).
 * O topo é contínuo (desenhos repetidos nas bordas), porque a Nuvem Sólida cobre todo o chão.
 */

type Ctx = CanvasRenderingContext2D;
type Motif =
  | 'cloud' | 'ethereal' | 'veins' | 'ornate' | 'bricks' | 'goldBricks' | 'grass' | 'flowery' | 'moss'
  | 'earth' | 'floral' | 'furrows' | 'water' | 'lotus' | 'crystal' | 'light' | 'wood' | 'foliage';

interface Style {
  top: string;
  front: string;
  outline: string;
  accent: string;
  motif: Motif;
}

const RES = 2; // mesma resolução das demais texturas (TEX_RES)
const T = TILE;
const F = CUBE_FRONT;
const EARTH = '#a4683e';

export const CELESTIAL_STYLE: Record<number, Style> = {
  [Block.CLOUD_SOLID]: { top: '#eef0ff', front: '#cdd2f6', outline: '#8b90c8', accent: '#ffffff', motif: 'cloud' },
  [Block.CLOUD_ETHEREAL]: { top: '#b8c2ff', front: '#98a3ee', outline: '#5c64b8', accent: '#fff3c4', motif: 'ethereal' },
  [Block.MARBLE_CELESTIAL]: { top: '#f6efe6', front: '#e4d8c8', outline: '#a8957a', accent: '#e0b24a', motif: 'veins' },
  [Block.MARBLE_ORNATE]: { top: '#f7efe2', front: '#e8d9c0', outline: '#a9813a', accent: '#e6b33e', motif: 'ornate' },
  [Block.STONE_CELESTIAL]: { top: '#ece6df', front: '#d3cbc2', outline: '#8f857a', accent: '#8cc04a', motif: 'bricks' },
  [Block.STONE_GOLDEN]: { top: '#f2dfb8', front: '#e0c287', outline: '#a07a30', accent: '#d9a63a', motif: 'goldBricks' },
  [Block.GRASS_CELESTIAL]: { top: '#8fd44f', front: EARTH, outline: '#4a6a24', accent: '#ffffff', motif: 'grass' },
  [Block.GRASS_FLOWERY]: { top: '#7cc445', front: EARTH, outline: '#4a6a24', accent: '#ff9fc4', motif: 'flowery' },
  [Block.MOSS_LUMINOUS]: { top: '#a6e05a', front: '#e7dfd2', outline: '#5f8a2a', accent: '#f4ffc8', motif: 'moss' },
  [Block.EARTH_SACRED]: { top: '#b97a48', front: EARTH, outline: '#5a3420', accent: '#d9a070', motif: 'earth' },
  [Block.EARTH_FLORAL]: { top: '#c48450', front: EARTH, outline: '#5a3420', accent: '#ff9fc4', motif: 'floral' },
  [Block.EARTH_CULTIVATED]: { top: '#a66a3c', front: '#94603a', outline: '#4e2e1a', accent: '#6fbf4a', motif: 'furrows' },
  [Block.WATER_SACRED]: { top: '#5fd6f0', front: '#3fb6e0', outline: '#1f7fae', accent: '#e6fbff', motif: 'water' },
  [Block.WATER_CRYSTAL]: { top: '#41b6ea', front: '#2f97d4', outline: '#1a6aa0', accent: '#ff9fc4', motif: 'lotus' },
  [Block.CRYSTAL_LIFE]: { top: '#f2a6f0', front: '#d982e0', outline: '#9a4aa8', accent: '#fff0fb', motif: 'crystal' },
  [Block.LIGHT_BLOCK]: { top: '#ffe7a3', front: '#f5c96a', outline: '#b8862a', accent: '#fffbe6', motif: 'light' },
  [Block.WOOD_CELESTIAL]: { top: '#f1e6d6', front: '#e0cfb8', outline: '#9a8264', accent: '#7fae4a', motif: 'wood' },
  [Block.FOLIAGE_GOLDEN]: { top: '#f2c63a', front: '#a87a3e', outline: '#8a6418', accent: '#fff1a8', motif: 'foliage' },
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

function surface(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = w * RES;
  c.height = h * RES;
  const ctx = c.getContext('2d')!;
  ctx.scale(RES, RES);
  return [c, ctx];
}

/** Desenha `fn(x, y)` e suas cópias deslocadas ±T, para o topo emendar sem costura. */
function wrap(x: number, y: number, fn: (x: number, y: number) => void): void {
  for (const dx of [-T, 0, T]) for (const dy of [-T, 0, T]) fn(x + dx, y + dy);
}

function star(ctx: Ctx, x: number, y: number, r: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

function flower(ctx: Ctx, x: number, y: number, r: number, petal: string, center = '#ffd76a'): void {
  ctx.fillStyle = petal;
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = center;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.4, 0, Math.PI * 2);
  ctx.fill();
}

function paintTop(ctx: Ctx, s: Style, rand: () => number): void {
  ctx.fillStyle = s.top;
  ctx.fillRect(0, 0, T, T);
  const a = s.accent;
  switch (s.motif) {
    case 'cloud':
    case 'ethereal': {
      // Nuvem macia: poucos montinhos largos e de baixo contraste (o chão inteiro é nuvem,
      // então precisa ser calmo para não competir com o que é construído em cima).
      for (let i = 0; i < 4; i++) {
        const x = rand() * T, y = rand() * T, r = 7 + rand() * 5;
        wrap(x, y, (px, py) => {
          ctx.fillStyle = 'rgba(170, 176, 232, 0.16)';
          ctx.beginPath(); ctx.arc(px + 1.5, py + 2.5, r, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = s.motif === 'cloud' ? 'rgba(255,255,255,0.55)' : 'rgba(225,230,255,0.5)';
          ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
        });
      }
      if (s.motif === 'cloud') wrap(6 + rand() * 20, 6 + rand() * 20, (px, py) => star(ctx, px, py, 1.6, 'rgba(255,255,255,0.9)'));
      if (s.motif === 'ethereal') wrap(8 + rand() * 16, 8 + rand() * 16, (px, py) => star(ctx, px, py, 4, a));
      break;
    }
    case 'veins':
    case 'ornate': {
      ctx.strokeStyle = a;
      ctx.lineWidth = 0.9;
      for (let i = 0; i < 3; i++) {
        let x = rand() * T, y = 0;
        ctx.beginPath(); ctx.moveTo(x, y);
        while (y < T) { x += (rand() - 0.5) * 8; y += 4 + rand() * 4; ctx.lineTo(x, y); }
        ctx.stroke();
      }
      if (s.motif === 'ornate') {
        ctx.strokeStyle = a; ctx.lineWidth = 2;
        ctx.strokeRect(2, 2, T - 4, T - 4);
        flower(ctx, T / 2, T / 2, 6, a, '#fff3c4');
      }
      break;
    }
    case 'bricks':
    case 'goldBricks': {
      ctx.strokeStyle = s.motif === 'bricks' ? 'rgba(120,110,100,0.55)' : a;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(0.5, 0.5, T / 2, T / 2); ctx.strokeRect(T / 2, 0.5, T / 2 - 0.5, T / 2);
      ctx.strokeRect(0.5, T / 2, T / 2, T / 2 - 0.5); ctx.strokeRect(T / 2, T / 2, T / 2 - 0.5, T / 2 - 0.5);
      if (s.motif === 'bricks') { ctx.fillStyle = a; ctx.fillRect(T / 2 - 1, 4, 2, 10); ctx.fillRect(4, T / 2 - 1, 9, 2); }
      break;
    }
    case 'grass':
    case 'flowery':
    case 'moss': {
      for (let i = 0; i < 14; i++) {
        const x = rand() * T, y = rand() * T;
        wrap(x, y, (px, py) => {
          ctx.fillStyle = 'rgba(60, 120, 30, 0.35)';
          ctx.beginPath(); ctx.ellipse(px, py, 2.6, 1.4, rand(), 0, Math.PI * 2); ctx.fill();
        });
      }
      const n = s.motif === 'flowery' ? 4 : s.motif === 'grass' ? 2 : 0;
      for (let i = 0; i < n; i++) wrap(4 + rand() * 24, 4 + rand() * 24, (px, py) => flower(ctx, px, py, s.motif === 'flowery' ? 3.6 : 2.4, a));
      if (s.motif === 'moss') for (let i = 0; i < 4; i++) wrap(rand() * T, rand() * T, (px, py) => star(ctx, px, py, 1.8, a));
      break;
    }
    case 'earth':
    case 'floral': {
      for (let i = 0; i < 8; i++) wrap(rand() * T, rand() * T, (px, py) => {
        ctx.fillStyle = 'rgba(90, 52, 32, 0.35)';
        ctx.beginPath(); ctx.ellipse(px, py, 3 + rand() * 2, 2, rand(), 0, Math.PI * 2); ctx.fill();
      });
      if (s.motif === 'floral') for (let i = 0; i < 3; i++) wrap(4 + rand() * 24, 4 + rand() * 24, (px, py) => flower(ctx, px, py, 3, a));
      break;
    }
    case 'furrows': {
      for (let i = 0; i < 3; i++) {
        const y = 5 + i * 10;
        ctx.fillStyle = 'rgba(70, 40, 22, 0.55)'; ctx.fillRect(0, y + 3, T, 3);
        ctx.fillStyle = 'rgba(200, 140, 90, 0.35)'; ctx.fillRect(0, y, T, 2);
        for (let k = 0; k < 4; k++) { ctx.fillStyle = a; ctx.beginPath(); ctx.ellipse(4 + k * 8, y + 1, 1.6, 1, 0, 0, Math.PI * 2); ctx.fill(); }
      }
      break;
    }
    case 'water':
    case 'lotus': {
      ctx.strokeStyle = 'rgba(230, 251, 255, 0.55)'; ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const x = rand() * T, y = rand() * T;
        wrap(x, y, (px, py) => { ctx.beginPath(); ctx.ellipse(px, py, 5, 2.2, 0, 0, Math.PI * 2); ctx.stroke(); });
      }
      if (s.motif === 'lotus') {
        ctx.fillStyle = '#5aa84a'; ctx.beginPath(); ctx.arc(T / 2 + 5, T / 2 + 4, 4, 0, Math.PI * 2); ctx.fill();
        flower(ctx, T / 2, T / 2, 4.5, a, '#ffe08a');
      }
      break;
    }
    case 'crystal': {
      ctx.strokeStyle = 'rgba(255, 240, 251, 0.7)'; ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(rand() * T, rand() * T); ctx.lineTo(rand() * T, rand() * T); ctx.stroke(); }
      star(ctx, 9, 9, 3, a);
      break;
    }
    case 'light': {
      const g = ctx.createRadialGradient(T / 2, T / 2, 1, T / 2, T / 2, T * 0.7);
      g.addColorStop(0, '#fffbe6'); g.addColorStop(1, 'rgba(255,231,163,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, T, T);
      flower(ctx, T / 2, T / 2, 7, '#fff3c4', '#ffd76a');
      break;
    }
    case 'wood': {
      ctx.strokeStyle = 'rgba(160, 130, 95, 0.6)'; ctx.lineWidth = 1;
      for (const r of [4, 8, 12]) { ctx.beginPath(); ctx.arc(T / 2, T / 2, r, 0, Math.PI * 2); ctx.stroke(); }
      break;
    }
    case 'foliage': {
      for (let i = 0; i < 10; i++) wrap(rand() * T, rand() * T, (px, py) => {
        ctx.fillStyle = i % 2 ? '#e0a92a' : '#ffd55a';
        ctx.beginPath(); ctx.ellipse(px, py, 5, 2.6, rand() * Math.PI, 0, Math.PI * 2); ctx.fill();
      });
      flower(ctx, 10, 20, 3, '#ffffff');
      break;
    }
  }
}

function paintFront(ctx: Ctx, s: Style, rand: () => number): void {
  const g = ctx.createLinearGradient(0, 0, 0, F);
  g.addColorStop(0, s.front);
  g.addColorStop(1, s.outline);
  ctx.fillStyle = s.front;
  ctx.fillRect(0, 0, T, F);
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, T, F);
  ctx.globalAlpha = 1;
  switch (s.motif) {
    case 'grass': case 'flowery': case 'moss': {
      // Franja do topo descendo pela frente.
      ctx.fillStyle = s.top;
      ctx.beginPath(); ctx.moveTo(0, 0);
      for (let x = 0; x <= T; x += 4) ctx.lineTo(x, 3 + rand() * 4);
      ctx.lineTo(T, 0); ctx.fill();
      break;
    }
    case 'bricks': case 'goldBricks': case 'ornate': {
      ctx.strokeStyle = s.motif === 'bricks' ? 'rgba(120,110,100,0.5)' : s.accent; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, F / 2); ctx.lineTo(T, F / 2);
      ctx.moveTo(T / 2, 0); ctx.lineTo(T / 2, F / 2); ctx.moveTo(T / 4, F / 2); ctx.lineTo(T / 4, F);
      ctx.moveTo((3 * T) / 4, F / 2); ctx.lineTo((3 * T) / 4, F); ctx.stroke();
      break;
    }
    case 'wood': {
      ctx.strokeStyle = s.accent; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(4, F); ctx.bezierCurveTo(10, 4, 22, F, 28, 2); ctx.stroke();
      break;
    }
    case 'cloud': case 'ethereal': {
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      for (let x = 2; x < T; x += 8) { ctx.beginPath(); ctx.arc(x + 2, 2, 4, 0, Math.PI); ctx.fill(); }
      break;
    }
    default:
      for (let i = 0; i < 4; i++) { ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(rand() * T, rand() * F, 3, 1.2); }
  }
}

const cache = new Map<number, { top: HTMLCanvasElement; front: HTMLCanvasElement }>();

/** Faces (topo T×T contínuo e frente T×F) de um bloco celestial, em resolução 2×. */
export function celestialFaces(id: number): { top: HTMLCanvasElement; front: HTMLCanvasElement } {
  let faces = cache.get(id);
  if (!faces) {
    const s = CELESTIAL_STYLE[id];
    const [top, tctx] = surface(T, T);
    paintTop(tctx, s, mulberry32(id * 31 + 7));
    const [front, fctx] = surface(T, F);
    paintFront(fctx, s, mulberry32(id * 17 + 3));
    faces = { top, front };
    cache.set(id, faces);
  }
  return faces;
}
