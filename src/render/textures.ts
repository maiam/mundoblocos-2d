import { TILE } from '../config';
import { Block, type BlockId } from '../world/blocks';
import { mulberry32 } from '../world/random';
import { mix, rgba, shade } from './color';

/**
 * Texturas procedurais no estilo ilustração digital de fantasia (RPG/anime):
 * cel-shading com gradientes suaves, contorno colorido (nunca preto puro),
 * brilho especular, bevel de cubo (face superior clara, lateral sombreada).
 * Aparência é responsabilidade exclusiva do render; propriedades vivem em world/blocks.
 */

type Ctx = CanvasRenderingContext2D;

export interface BlockTextures {
  /** Textura principal do bloco (TILE×TILE). */
  tile: Map<BlockId, HTMLCanvasElement>;
  /** Versão escurecida e sem contorno usada como parede de fundo das cavernas. */
  wall: Map<BlockId, HTMLCanvasElement>;
  /** Tufos de grama que "transbordam" para a célula de cima (TILE×GRASS_TUFT_H). */
  tufts: Map<BlockId, HTMLCanvasElement>;
  /** Cor de brilho para blocos luminosos. */
  glowColor: Map<BlockId, string>;
}

export const GRASS_TUFT_H = 8;
const S = TILE;

function canvas(w = S, h = S): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
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

interface CubeOpts {
  base: string;
  /** Inset lateral (cacto é mais estreito). */
  inset?: number;
  radius?: number;
  alpha?: number;
}

/** Corpo do "cubo": gradiente vertical + face superior + lateral direita sombreada + contorno. */
function cube(ctx: Ctx, { base, inset = 0, radius = 3, alpha = 1 }: CubeOpts): void {
  const x = inset + 0.5;
  const w = S - inset * 2 - 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  const g = ctx.createLinearGradient(0, 0, 0, S);
  g.addColorStop(0, shade(base, 0.12));
  g.addColorStop(0.55, base);
  g.addColorStop(1, shade(base, -0.22));
  roundRect(ctx, x, 0.5, w, S - 1, radius);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  // Face superior do cubo (luz de cima).
  ctx.fillStyle = rgba(shade(base, 0.45), 0.55);
  ctx.fillRect(x, 0, w, 4);
  // Lateral direita e base em sombra (luz vindo da esquerda-cima).
  ctx.fillStyle = rgba(shade(base, -0.45), 0.35);
  ctx.fillRect(x + w - 4, 0, 4, S);
  ctx.fillRect(x, S - 4, w, 4);
  // Filete de luz interno (rim light).
  ctx.strokeStyle = rgba('#ffffff', 0.35);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 2, S - 5);
  ctx.lineTo(x + 2, 5);
  ctx.lineTo(x + w - 5, 5);
  ctx.stroke();
  ctx.restore();
  outline(ctx, base, inset, radius, alpha);
}

function outline(ctx: Ctx, base: string, inset = 0, radius = 3, alpha = 1): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  roundRect(ctx, inset + 0.5, 0.5, S - inset * 2 - 1, S - 1, radius);
  ctx.strokeStyle = shade(base, -0.62);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

/** Manchas pintadas (pinceladas suaves) dentro do tile. */
function speckles(ctx: Ctx, rand: () => number, color: string, count: number, rMin: number, rMax: number, alpha = 0.6): void {
  ctx.save();
  roundRect(ctx, 1, 1, S - 2, S - 2, 3);
  ctx.clip();
  for (let i = 0; i < count; i++) {
    const r = rMin + rand() * (rMax - rMin);
    ctx.fillStyle = rgba(color, alpha * (0.5 + rand() * 0.5));
    ctx.beginPath();
    ctx.ellipse(3 + rand() * (S - 6), 5 + rand() * (S - 9), r, r * (0.6 + rand() * 0.4), rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Pequeno brilho em estrela de 4 pontas (marca registrada do estilo anime). */
function sparkle(ctx: Ctx, x: number, y: number, r: number, color = '#ffffff', alpha = 0.9): void {
  ctx.save();
  ctx.fillStyle = rgba(color, alpha);
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
  ctx.restore();
}

function facetedStone(ctx: Ctx, rand: () => number, base: string): void {
  cube(ctx, { base });
  ctx.save();
  roundRect(ctx, 1, 1, S - 2, S - 2, 3);
  ctx.clip();
  // Facetas poligonais claras/escuras (pedra pintada).
  for (let i = 0; i < 5; i++) {
    const cx = 4 + rand() * (S - 8);
    const cy = 6 + rand() * (S - 12);
    const r = 4 + rand() * 5;
    ctx.fillStyle = rgba(rand() < 0.5 ? shade(base, 0.25) : shade(base, -0.2), 0.45);
    ctx.beginPath();
    const n = 5;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + rand() * 0.6;
      const rr = r * (0.7 + rand() * 0.4);
      const px = cx + Math.cos(a) * rr;
      const py = cy + Math.sin(a) * rr * 0.8;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
  // Rachaduras finas.
  ctx.strokeStyle = rgba(shade(base, -0.5), 0.55);
  ctx.lineWidth = 1;
  for (let i = 0; i < 2; i++) {
    let x = 4 + rand() * (S - 8);
    let y = 6 + rand() * (S - 14);
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 3; k++) {
      x += (rand() - 0.5) * 8;
      y += 2 + rand() * 4;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
  outline(ctx, base);
}

function gem(ctx: Ctx, x: number, y: number, r: number, color: string, rand: () => number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rand() - 0.5) * 0.8);
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * 0.75, -r * 0.2);
  ctx.lineTo(r * 0.5, r * 0.8);
  ctx.lineTo(-r * 0.5, r * 0.8);
  ctx.lineTo(-r * 0.75, -r * 0.2);
  ctx.closePath();
  const g = ctx.createLinearGradient(-r, -r, r, r);
  g.addColorStop(0, shade(color, 0.55));
  g.addColorStop(0.5, color);
  g.addColorStop(1, shade(color, -0.35));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = shade(color, -0.6);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = rgba('#ffffff', 0.7);
  ctx.beginPath();
  ctx.moveTo(-r * 0.2, -r * 0.7);
  ctx.lineTo(r * 0.05, -r * 0.2);
  ctx.lineTo(-r * 0.45, -r * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function ore(ctx: Ctx, rand: () => number, color: string, count: number, size: number, sparkles: boolean): void {
  facetedStone(ctx, rand, '#8a90a6');
  for (let i = 0; i < count; i++) {
    gem(ctx, 6 + rand() * (S - 12), 8 + rand() * (S - 15), size * (0.7 + rand() * 0.5), color, rand);
  }
  if (sparkles) {
    sparkle(ctx, 6 + rand() * 20, 6 + rand() * 12, 3);
    sparkle(ctx, 12 + rand() * 14, 16 + rand() * 10, 2);
  }
}

function leafCluster(ctx: Ctx, rand: () => number, base: string, accent: string | null, opts: { petals?: boolean; glowDots?: string } = {}): void {
  // Cubo de folhagem: massa pintada com tufos de folhas em camadas (sombra → luz).
  cube(ctx, { base: shade(base, -0.12), radius: 5 });
  ctx.save();
  roundRect(ctx, 1, 1, S - 2, S - 2, 5);
  ctx.clip();
  const clump = (x: number, y: number, r: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      const a = Math.PI + (k / 4) * Math.PI; // arco superior recortado (scallop)
      ctx.arc(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.35, r * 0.45, 0, Math.PI * 2);
    }
    ctx.fill();
  };
  for (let i = 0; i < 4; i++) clump(4 + rand() * 24, 10 + rand() * 20, 9 + rand() * 4, rgba(shade(base, -0.4), 0.55));
  for (let i = 0; i < 4; i++) clump(4 + rand() * 24, 6 + rand() * 18, 8 + rand() * 4, base);
  for (let i = 0; i < 3; i++) clump(4 + rand() * 22, 4 + rand() * 12, 6 + rand() * 3, shade(base, 0.28));
  // Recortes de folha (traços de luz em meia-lua, estilo cel).
  ctx.strokeStyle = rgba(shade(base, 0.6), 0.85);
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) {
    const x = 5 + rand() * 22;
    const y = 5 + rand() * 20;
    ctx.beginPath();
    ctx.arc(x, y, 3 + rand() * 2, Math.PI * 1.1, Math.PI * 1.7);
    ctx.stroke();
  }
  if (accent) speckles(ctx, rand, accent, 5, 0.8, 1.6, 0.9);
  if (opts.petals) {
    for (let i = 0; i < 4; i++) {
      const x = 4 + rand() * (S - 8);
      const y = 4 + rand() * (S - 8);
      ctx.fillStyle = rgba('#ffffff', 0.85);
      ctx.beginPath();
      ctx.ellipse(x, y, 1.8, 1.1, rand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (opts.glowDots) {
    for (let i = 0; i < 4; i++) sparkle(ctx, 4 + rand() * (S - 8), 4 + rand() * (S - 8), 2 + rand() * 1.5, opts.glowDots, 0.95);
  }
  ctx.restore();
  outline(ctx, base, 0, 5);
}

function grassTop(ctx: Ctx, rand: () => number, grass: string, dirt: string, glow?: string): void {
  cube(ctx, { base: dirt });
  speckles(ctx, rand, shade(dirt, -0.3), 6, 1, 2);
  speckles(ctx, rand, shade(dirt, 0.25), 4, 0.8, 1.4);
  ctx.save();
  roundRect(ctx, 0.5, 0.5, S - 1, S - 1, 3);
  ctx.clip();
  // Camada de grama com borda ondulada e "gotas".
  const g = ctx.createLinearGradient(0, 0, 0, 12);
  g.addColorStop(0, shade(grass, 0.25));
  g.addColorStop(1, grass);
  ctx.fillStyle = shade(grass, -0.5);
  drawGrassEdge(ctx, 1.2);
  ctx.fillStyle = g;
  drawGrassEdge(ctx, 0);
  ctx.fillStyle = rgba(shade(grass, 0.6), 0.7);
  ctx.fillRect(1, 1, S - 2, 2);
  if (glow) for (let i = 0; i < 3; i++) sparkle(ctx, 4 + rand() * (S - 8), 3 + rand() * 5, 1.8, glow);
  ctx.restore();
  outline(ctx, mix(grass, dirt, 0.5));
}

let edgeSeed = 0;
function drawGrassEdge(ctx: Ctx, extra: number): void {
  // Usa um gerador fixo para que contorno e preenchimento coincidam.
  const r = mulberry32(1000 + edgeSeed);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(S, 0);
  let x = S;
  ctx.lineTo(S, 8 + extra);
  while (x > 0) {
    const w = 4 + r() * 4;
    const depth = 7 + r() * 6;
    ctx.quadraticCurveTo(x - w / 2, depth + extra + 2, x - w, 8 + extra);
    x -= w;
  }
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();
}

function tuft(base: string, flowers: string[] = []): HTMLCanvasElement {
  const [c, ctx] = canvas(S, GRASS_TUFT_H + 2);
  const r = mulberry32(77);
  const H = GRASS_TUFT_H + 2;
  for (let i = 0; i < 9; i++) {
    const x = 2 + i * 3.4 + r() * 2;
    const h = 3 + r() * (GRASS_TUFT_H - 3);
    const lean = (r() - 0.5) * 3;
    ctx.fillStyle = shade(base, -0.5);
    blade(ctx, x, H, h + 1, lean, 2.6);
    ctx.fillStyle = shade(base, 0.1 + r() * 0.2);
    blade(ctx, x, H, h, lean, 1.8);
  }
  for (const f of flowers) {
    if (r() < 0.5) continue;
    sparkle(ctx, 4 + r() * (S - 8), 3 + r() * 3, 2, f, 1);
  }
  return c;
}

function blade(ctx: Ctx, x: number, baseY: number, h: number, lean: number, w: number): void {
  ctx.beginPath();
  ctx.moveTo(x - w / 2, baseY);
  ctx.quadraticCurveTo(x + lean * 0.3, baseY - h * 0.6, x + lean, baseY - h);
  ctx.quadraticCurveTo(x + lean * 0.3 + w * 0.2, baseY - h * 0.5, x + w / 2, baseY);
  ctx.closePath();
  ctx.fill();
}

function makeTile(id: BlockId): HTMLCanvasElement | null {
  const [c, ctx] = canvas();
  const rand = mulberry32(id * 7919 + 13);
  edgeSeed = id;
  switch (id) {
    case Block.GRASS:
      grassTop(ctx, rand, '#6fd35a', '#a86b42');
      break;
    case Block.ENCHANTED_GRASS:
      grassTop(ctx, rand, '#45d6c4', '#a86b42', '#c9fffb');
      break;
    case Block.DIRT:
      cube(ctx, { base: '#a86b42' });
      speckles(ctx, rand, '#6e3f25', 7, 1, 2.2);
      speckles(ctx, rand, '#d29a68', 5, 0.8, 1.5);
      break;
    case Block.STONE:
      facetedStone(ctx, rand, '#8a90a6');
      break;
    case Block.SAND: {
      cube(ctx, { base: '#f3d48e' });
      ctx.strokeStyle = rgba('#fff4cf', 0.8);
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 3; i++) {
        const y = 8 + i * 8 + rand() * 2;
        ctx.beginPath();
        ctx.moveTo(4, y);
        ctx.bezierCurveTo(10, y - 3, 18, y + 3, 27, y - 1);
        ctx.stroke();
      }
      speckles(ctx, rand, '#c99c55', 6, 0.6, 1.1);
      break;
    }
    case Block.SANDSTONE: {
      cube(ctx, { base: '#e2b46e' });
      ctx.fillStyle = rgba('#b9824a', 0.55);
      for (let y = 9; y < S - 2; y += 8) ctx.fillRect(2, y, S - 4, 2);
      ctx.fillStyle = rgba('#fbe0a8', 0.6);
      for (let y = 6; y < S - 2; y += 8) ctx.fillRect(2, y, S - 4, 1);
      break;
    }
    case Block.SNOW: {
      cube(ctx, { base: '#e6f1ff' });
      speckles(ctx, rand, '#b9cfee', 5, 1.5, 3, 0.5);
      sparkle(ctx, 9, 9, 3);
      sparkle(ctx, 22, 19, 2);
      break;
    }
    case Block.ICE: {
      cube(ctx, { base: '#9fe3ff', alpha: 0.82 });
      ctx.strokeStyle = rgba('#ffffff', 0.75);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(6, 22); ctx.lineTo(18, 8);
      ctx.moveTo(12, 26); ctx.lineTo(22, 14);
      ctx.stroke();
      sparkle(ctx, 24, 8, 2.5);
      break;
    }
    case Block.WATER: {
      ctx.fillStyle = rgba('#3aa7e8', 0.62);
      ctx.fillRect(0, 0, S, S);
      ctx.strokeStyle = rgba('#bff0ff', 0.45);
      ctx.lineWidth = 1;
      for (let i = 0; i < 2; i++) {
        const y = 10 + i * 12 + rand() * 3;
        ctx.beginPath();
        ctx.moveTo(4 + rand() * 4, y);
        ctx.quadraticCurveTo(16, y - 2, 26, y);
        ctx.stroke();
      }
      break;
    }
    case Block.LOG: {
      cube(ctx, { base: '#8a5a3a', inset: 3, radius: 2 });
      ctx.save();
      ctx.strokeStyle = rgba('#5a3420', 0.7);
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 4; i++) {
        const x = 8 + i * 5 + rand() * 2;
        ctx.beginPath();
        ctx.moveTo(x, 2);
        ctx.bezierCurveTo(x - 2, 10, x + 2, 20, x, S - 2);
        ctx.stroke();
      }
      ctx.strokeStyle = rgba('#c48d62', 0.6);
      ctx.beginPath();
      ctx.moveTo(7, 3); ctx.lineTo(7, S - 3);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case Block.LEAVES:
      leafCluster(ctx, rand, '#4fbf5a', '#c8f7a0');
      break;
    case Block.SAKURA_LEAVES:
      leafCluster(ctx, rand, '#ffa9cf', '#fff0f6', { petals: true });
      break;
    case Block.MAGIC_LEAVES:
      leafCluster(ctx, rand, '#6a6cf0', null, { glowDots: '#9ffcff' });
      break;
    case Block.PINE_LEAVES: {
      leafCluster(ctx, rand, '#2f8f78', null);
      // Neve acumulada no topo.
      ctx.fillStyle = rgba('#f4fbff', 0.95);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(6 + i * 10, 3, 5, 2.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case Block.COAL_ORE:
      ore(ctx, rand, '#3a3550', 4, 5.5, false);
      break;
    case Block.GOLD_ORE:
      ore(ctx, rand, '#ffc93c', 4, 4, true);
      break;
    case Block.MANA_CRYSTAL:
      ore(ctx, rand, '#b26cff', 3, 6, true);
      break;
    case Block.BEDROCK: {
      facetedStone(ctx, rand, '#3d3552');
      speckles(ctx, rand, '#1a1530', 6, 1.5, 3);
      break;
    }
    case Block.PLANKS: {
      cube(ctx, { base: '#d39a5c' });
      ctx.save();
      for (let i = 1; i < 4; i++) {
        ctx.fillStyle = rgba('#7b4d2a', 0.8);
        ctx.fillRect(1, i * 8 - 1, S - 2, 1.5);
        ctx.fillStyle = rgba('#f4c48a', 0.7);
        ctx.fillRect(1, i * 8 + 0.5, S - 2, 1);
      }
      ctx.fillStyle = rgba('#7b4d2a', 0.6);
      for (let i = 0; i < 4; i++) {
        const x = i % 2 === 0 ? 10 : 22;
        ctx.fillRect(x, i * 8 + 1, 1.2, 6);
      }
      ctx.restore();
      break;
    }
    case Block.BRICK: {
      cube(ctx, { base: '#c4554a' });
      ctx.save();
      ctx.strokeStyle = rgba('#f1d2b8', 0.85);
      ctx.lineWidth = 1.5;
      for (let row = 0; row < 4; row++) {
        const y = row * 8;
        ctx.beginPath();
        ctx.moveTo(1, y + 0.5); ctx.lineTo(S - 1, y + 0.5);
        const off = row % 2 === 0 ? 8 : 16;
        for (let x = off; x < S; x += 16) {
          ctx.moveTo(x, y); ctx.lineTo(x, y + 8);
        }
        ctx.stroke();
      }
      ctx.restore();
      speckles(ctx, rand, '#ff8c7a', 4, 1, 2, 0.4);
      break;
    }
    case Block.TALL_GRASS: {
      const r = mulberry32(5);
      for (let i = 0; i < 7; i++) {
        const x = 5 + i * 3.5 + r() * 2;
        const h = 10 + r() * 14;
        const lean = (r() - 0.5) * 6;
        ctx.fillStyle = '#2a6b34';
        blade(ctx, x, S, h + 1.5, lean, 3.2);
        ctx.fillStyle = shade('#6fd35a', r() * 0.3);
        blade(ctx, x, S, h, lean, 2.2);
      }
      break;
    }
    case Block.FLOWER: {
      ctx.strokeStyle = '#3c8f45';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(16, S); ctx.quadraticCurveTo(13, 22, 16, 13);
      ctx.stroke();
      ctx.fillStyle = '#5fc46a';
      ctx.beginPath();
      ctx.ellipse(12, 24, 4, 2, -0.6, 0, Math.PI * 2);
      ctx.fill();
      const petal = '#ff7fb5';
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        ctx.fillStyle = shade(petal, -0.45);
        ctx.beginPath();
        ctx.ellipse(16 + Math.cos(a) * 4.5, 11 + Math.sin(a) * 4.5, 4, 3, a, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = petal;
        ctx.beginPath();
        ctx.ellipse(16 + Math.cos(a) * 4.5, 11 + Math.sin(a) * 4.5, 3.2, 2.3, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffe066';
      ctx.beginPath();
      ctx.arc(16, 11, 2.6, 0, Math.PI * 2);
      ctx.fill();
      sparkle(ctx, 24, 5, 2.5);
      break;
    }
    case Block.GLOW_MUSHROOM: {
      ctx.fillStyle = '#e9e2ff';
      roundRect(ctx, 13.5, 16, 5, 16, 2);
      ctx.fill();
      ctx.strokeStyle = '#6b5f9e';
      ctx.stroke();
      const g = ctx.createRadialGradient(13, 11, 1, 16, 14, 11);
      g.addColorStop(0, '#d8ffff');
      g.addColorStop(0.5, '#4fe3ff');
      g.addColorStop(1, '#2a7fd6');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(4, 18);
      ctx.quadraticCurveTo(5, 5, 16, 5);
      ctx.quadraticCurveTo(27, 5, 28, 18);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#1d4f9c';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = rgba('#ffffff', 0.9);
      for (const [x, y, r] of [[10, 11, 1.8], [18, 9, 1.4], [23, 14, 1.6]] as const) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case Block.CACTUS: {
      cube(ctx, { base: '#4fb35a', inset: 4, radius: 5 });
      ctx.strokeStyle = rgba('#2c7a3a', 0.8);
      ctx.lineWidth = 1.2;
      for (const x of [11, 16, 21]) {
        ctx.beginPath(); ctx.moveTo(x, 2); ctx.lineTo(x, S - 2); ctx.stroke();
      }
      ctx.strokeStyle = '#fff6d6';
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const y = 4 + i * 5;
        const left = i % 2 === 0;
        ctx.beginPath();
        ctx.moveTo(left ? 5 : 27, y);
        ctx.lineTo(left ? 2 : 30, y - 1);
        ctx.stroke();
      }
      break;
    }
    default:
      return null;
  }
  return c;
}

/** Versão de fundo (parede de caverna): escurecida, dessaturada, sem contorno forte. */
function makeWall(src: HTMLCanvasElement): HTMLCanvasElement {
  const [c, ctx] = canvas();
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = 'rgba(28, 22, 58, 0.62)';
  ctx.fillRect(0, 0, S, S);
  return c;
}

export function createBlockTextures(): BlockTextures {
  const tile = new Map<BlockId, HTMLCanvasElement>();
  const ids = Object.values(Block) as BlockId[];
  for (const id of ids) {
    const t = makeTile(id);
    if (t) tile.set(id, t);
  }
  const wall = new Map<BlockId, HTMLCanvasElement>();
  for (const id of [Block.DIRT, Block.STONE, Block.SANDSTONE, Block.SAND] as BlockId[]) {
    wall.set(id, makeWall(tile.get(id)!));
  }
  const tufts = new Map<BlockId, HTMLCanvasElement>([
    [Block.GRASS, tuft('#6fd35a', ['#ffffff', '#ffe066'])],
    [Block.ENCHANTED_GRASS, tuft('#45d6c4', ['#c9fffb'])],
  ]);
  const glowColor = new Map<BlockId, string>([
    [Block.MANA_CRYSTAL, '#c38bff'],
    [Block.GLOW_MUSHROOM, '#5fe8ff'],
    [Block.MAGIC_LEAVES, '#8fa0ff'],
  ]);
  return { tile, wall, tufts, glowColor };
}
