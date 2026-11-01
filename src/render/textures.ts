import { CUBE_FRONT, TILE } from '../config';
import { ALL_BLOCK_IDS, Block, type BlockId } from '../world/blocks';
import { mulberry32 } from '../world/random';
import { rgba, shade } from './color';

/**
 * Texturas procedurais para a vista superior inclinada (3/4), no estilo
 * ilustração digital de fantasia (RPG/anime): cel-shading, contorno colorido
 * (nunca preto puro), brilhos em estrela. Cubos mostram face superior + frontal.
 * Aparência é responsabilidade exclusiva do render; propriedades vivem em world/blocks.
 */

type Ctx = CanvasRenderingContext2D;

/** Resolução das texturas em relação aos pixels de mundo (nitidez com zoom ~2×). */
export const TEX_RES = 2;
const T = TILE;
const F = CUBE_FRONT;
const GROUND_VARIANTS = 3;

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
  ground: Map<BlockId, HTMLCanvasElement[]>;
  objects: Map<BlockId, Sprite>;
  icons: Map<BlockId, string>;
  glowColor: Map<BlockId, string>;
  /** Cor da "barranca" (face frontal do chão elevado) mostrada sobre a água. */
  bankColor: Map<BlockId, string>;
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

function groundTile(id: BlockId, variant: number): HTMLCanvasElement {
  const [c, ctx] = canvas(T, T);
  const rand = mulberry32(id * 131 + variant * 7 + 1);
  const fill = (color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, T, T);
  };
  switch (id) {
    case Block.GRASS:
    case Block.ENCHANTED_GRASS: {
      const base = id === Block.GRASS ? '#79d265' : '#4fd2c0';
      fill(base);
      blobs(ctx, rand, shade(base, -0.25), 5, 3, 6, 0, 0, T, T, 0.35);
      blobs(ctx, rand, shade(base, 0.3), 4, 2, 4, 0, 0, T, T, 0.4);
      for (let i = 0; i < 4; i++) {
        const x = 3 + rand() * (T - 6);
        const y = 6 + rand() * (T - 8);
        ctx.fillStyle = shade(base, -0.45);
        blade(ctx, x, y, 5 + rand() * 3, (rand() - 0.5) * 3, 2.4);
        ctx.fillStyle = shade(base, 0.25);
        blade(ctx, x, y, 4 + rand() * 2, (rand() - 0.5) * 3, 1.5);
      }
      if (id === Block.ENCHANTED_GRASS) for (let i = 0; i < 2; i++) sparkle(ctx, 4 + rand() * 24, 4 + rand() * 24, 1.8, '#d9fffb');
      else if (variant === 0) {
        ctx.fillStyle = rand() < 0.5 ? '#fff6c8' : '#ffd1e6';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(6 + rand() * 20, 6 + rand() * 20, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case Block.SAND: {
      fill('#f3d595');
      ctx.strokeStyle = rgba('#fff3cf', 0.85);
      ctx.lineWidth = 1.1;
      for (let i = 0; i < 3; i++) {
        const y = 6 + i * 10 + rand() * 3;
        ctx.beginPath();
        ctx.moveTo(-2, y);
        ctx.bezierCurveTo(8, y - 3, 20, y + 3, T + 2, y - 1);
        ctx.stroke();
      }
      blobs(ctx, rand, '#c99c55', 5, 0.6, 1.2, 0, 0, T, T, 0.7);
      break;
    }
    case Block.SNOW: {
      fill('#eaf3ff');
      blobs(ctx, rand, '#d2e2f6', 3, 3, 6, 0, 0, T, T, 0.35);
      sparkle(ctx, 6 + rand() * 20, 6 + rand() * 20, 2.4);
      if (variant === 1) sparkle(ctx, 6 + rand() * 20, 6 + rand() * 20, 1.6);
      break;
    }
    case Block.DIRT: {
      fill('#b78155');
      blobs(ctx, rand, '#7e4f2e', 6, 1, 2.2, 0, 0, T, T, 0.6);
      blobs(ctx, rand, '#dcab7c', 4, 0.8, 1.6, 0, 0, T, T, 0.7);
      break;
    }
    case Block.WATER: {
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
      break;
    }
    case Block.ICE: {
      fill('#bfeaff');
      ctx.strokeStyle = rgba('#ffffff', 0.8);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(4 + rand() * 6, 26);
      ctx.lineTo(18 + rand() * 6, 6);
      ctx.stroke();
      ctx.strokeStyle = rgba('#7fb9dc', 0.6);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(rand() * T, rand() * T);
      ctx.lineTo(rand() * T, rand() * T);
      ctx.lineTo(rand() * T, rand() * T);
      ctx.stroke();
      break;
    }
    default:
      fill('#ff00ff');
  }
  return c;
}

// ---------------------------------------------------------------- cubos

interface CubeStyle {
  top: string;
  front: string;
  paintTop?: (ctx: Ctx, rand: () => number) => void;
  paintFront?: (ctx: Ctx, rand: () => number) => void;
  radius?: number;
}

/** Cubo 3/4: face superior em [0, T) e face frontal em [T, T + F) no canvas. */
function cube(style: CubeStyle, seed: number): Sprite {
  const [c, ctx] = canvas(T, T + F);
  const rand = mulberry32(seed);
  const r = style.radius ?? 3;
  const outline = shade(style.front, -0.6);

  // Face frontal (sombra suave de cima para baixo).
  ctx.save();
  roundRect(ctx, 0.5, T - r, T - 1, F + r - 0.5, r);
  const gf = ctx.createLinearGradient(0, T, 0, T + F);
  gf.addColorStop(0, style.front);
  gf.addColorStop(1, shade(style.front, -0.25));
  ctx.fillStyle = gf;
  ctx.fill();
  ctx.clip();
  style.paintFront?.(ctx, rand);
  ctx.fillStyle = rgba(shade(style.front, -0.5), 0.3);
  ctx.fillRect(T - 4, T, 4, F);
  ctx.restore();

  // Face superior (luz vinda de cima-esquerda).
  ctx.save();
  roundRect(ctx, 0.5, 0.5, T - 1, T - 1, r);
  const gt = ctx.createLinearGradient(0, 0, T, T);
  gt.addColorStop(0, shade(style.top, 0.18));
  gt.addColorStop(1, style.top);
  ctx.fillStyle = gt;
  ctx.fill();
  ctx.clip();
  style.paintTop?.(ctx, rand);
  ctx.strokeStyle = rgba('#ffffff', 0.45);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(2.5, T - 5);
  ctx.lineTo(2.5, 2.5);
  ctx.lineTo(T - 5, 2.5);
  ctx.stroke();
  ctx.restore();

  // Aresta entre faces + contorno geral.
  ctx.strokeStyle = rgba(shade(style.top, 0.5), 0.8);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(2, T - 0.5);
  ctx.lineTo(T - 2, T - 0.5);
  ctx.stroke();
  roundRect(ctx, 0.5, 0.5, T - 1, T + F - 1, r);
  ctx.strokeStyle = outline;
  ctx.stroke();

  return { canvas: c, ox: 0, oy: -F, w: T, h: T + F, hit: { x: 0, y: -F, w: T, h: T + F } };
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
  ctx.lineWidth = 0.8;
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

const stoneTop = (base: string) => (ctx: Ctx, rand: () => number) => {
  for (let i = 0; i < 5; i++) {
    const cx = 4 + rand() * (T - 8);
    const cy = 4 + rand() * (T - 8);
    const r = 4 + rand() * 5;
    ctx.fillStyle = rgba(rand() < 0.5 ? shade(base, 0.25) : shade(base, -0.18), 0.5);
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + rand() * 0.6;
      const px = cx + Math.cos(a) * r * (0.7 + rand() * 0.4);
      const py = cy + Math.sin(a) * r * (0.7 + rand() * 0.4);
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = rgba(shade(base, -0.45), 0.5);
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  let x = 6 + rand() * 18;
  let y = 4 + rand() * 6;
  ctx.moveTo(x, y);
  for (let k = 0; k < 3; k++) { x += (rand() - 0.5) * 9; y += 4 + rand() * 4; ctx.lineTo(x, y); }
  ctx.stroke();
};

const stoneFront = (base: string) => (ctx: Ctx, rand: () => number) => {
  ctx.fillStyle = rgba(shade(base, -0.35), 0.5);
  for (let i = 0; i < 3; i++) ctx.fillRect(2 + rand() * 24, T + 3 + rand() * (F - 6), 4 + rand() * 6, 1.4);
};

const oreTop = (color: string, size: number, shiny: boolean) => (ctx: Ctx, rand: () => number) => {
  stoneTop('#8f95ab')(ctx, rand);
  for (let i = 0; i < 3; i++) gem(ctx, 6 + rand() * 20, 6 + rand() * 20, size * (0.7 + rand() * 0.5), color, rand);
  if (shiny) sparkle(ctx, 6 + rand() * 20, 6 + rand() * 14, 2.6);
};

const oreFront = (color: string) => (ctx: Ctx, rand: () => number) => {
  stoneFront('#757b93')(ctx, rand);
  for (let i = 0; i < 2; i++) gem(ctx, 6 + rand() * 20, T + 6 + rand() * (F - 10), 3, color, rand);
};

const leafTop = (base: string, extra?: (ctx: Ctx, rand: () => number) => void) => (ctx: Ctx, rand: () => number) => {
  const clump = (x: number, y: number, r: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      const a = Math.PI + (k / 4) * Math.PI;
      ctx.arc(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.35, r * 0.45, 0, Math.PI * 2);
    }
    ctx.fill();
  };
  for (let i = 0; i < 4; i++) clump(4 + rand() * 24, 10 + rand() * 20, 10, rgba(shade(base, -0.35), 0.55));
  for (let i = 0; i < 4; i++) clump(4 + rand() * 24, 6 + rand() * 18, 9, base);
  for (let i = 0; i < 3; i++) clump(4 + rand() * 22, 4 + rand() * 12, 7, shade(base, 0.28));
  extra?.(ctx, rand);
};

function cubeStyles(): Partial<Record<BlockId, CubeStyle>> {
  return {
    [Block.STONE]: { top: '#9aa0b6', front: '#7a8098', paintTop: stoneTop('#9aa0b6'), paintFront: stoneFront('#7a8098') },
    [Block.SANDSTONE]: {
      top: '#ecc283', front: '#cf9a5c',
      paintTop: (ctx, rand) => blobs(ctx, rand, '#c48a4c', 5, 1, 2.5, 0, 0, T, T, 0.5),
      paintFront: (ctx) => {
        ctx.fillStyle = rgba('#a87040', 0.6);
        ctx.fillRect(0, T + 6, T, 1.5);
        ctx.fillRect(0, T + 12, T, 1.5);
      },
    },
    [Block.COAL_ORE]: { top: '#8f95ab', front: '#757b93', paintTop: oreTop('#3a3550', 4.5, false), paintFront: oreFront('#3a3550') },
    [Block.GOLD_ORE]: { top: '#8f95ab', front: '#757b93', paintTop: oreTop('#ffc93c', 4, true), paintFront: oreFront('#ffc93c') },
    [Block.MANA_CRYSTAL]: { top: '#8f95ab', front: '#757b93', paintTop: oreTop('#b26cff', 6, true), paintFront: oreFront('#b26cff') },
    [Block.LOG]: {
      top: '#d9a46e', front: '#8a5a3a',
      paintTop: (ctx) => {
        ctx.strokeStyle = rgba('#9b6a42', 0.7);
        ctx.lineWidth = 1.2;
        for (const r of [4, 8, 12]) { ctx.beginPath(); ctx.arc(T / 2, T / 2, r, 0, Math.PI * 2); ctx.stroke(); }
      },
      paintFront: (ctx, rand) => {
        ctx.strokeStyle = rgba('#5a3420', 0.7);
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 4; i++) {
          const x = 5 + i * 7 + rand() * 2;
          ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x + (rand() - 0.5) * 2, T + F); ctx.stroke();
        }
      },
    },
    [Block.PLANKS]: {
      top: '#e0a866', front: '#b57a40',
      paintTop: (ctx) => {
        for (let i = 1; i < 4; i++) {
          ctx.fillStyle = rgba('#8a5a30', 0.7);
          ctx.fillRect(0, i * 8 - 0.5, T, 1.2);
          ctx.fillStyle = rgba('#f7cf98', 0.7);
          ctx.fillRect(0, i * 8 + 0.8, T, 0.8);
        }
      },
      paintFront: (ctx) => {
        ctx.fillStyle = rgba('#7b4d2a', 0.7);
        ctx.fillRect(0, T + F / 2, T, 1.2);
        ctx.fillRect(10, T, 1.2, F / 2);
        ctx.fillRect(22, T + F / 2, 1.2, F / 2);
      },
    },
    [Block.BRICK]: {
      top: '#d0675a', front: '#a8473f',
      paintTop: (ctx) => {
        ctx.strokeStyle = rgba('#f4d6bf', 0.85);
        ctx.lineWidth = 1.3;
        for (let row = 0; row < 4; row++) {
          const y = row * 8;
          ctx.beginPath();
          ctx.moveTo(0, y); ctx.lineTo(T, y);
          for (let x = row % 2 === 0 ? 8 : 16; x < T; x += 16) { ctx.moveTo(x, y); ctx.lineTo(x, y + 8); }
          ctx.stroke();
        }
      },
      paintFront: (ctx) => {
        ctx.strokeStyle = rgba('#e9c3aa', 0.75);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, T + F / 2); ctx.lineTo(T, T + F / 2);
        for (const x of [8, 24]) { ctx.moveTo(x, T); ctx.lineTo(x, T + F / 2); }
        ctx.moveTo(16, T + F / 2); ctx.lineTo(16, T + F);
        ctx.stroke();
      },
    },
    [Block.LEAVES]: { top: '#5cc565', front: '#3f9a52', radius: 6, paintTop: leafTop('#5cc565') },
    [Block.SAKURA_LEAVES]: {
      top: '#ffb2d3', front: '#e37fac', radius: 6,
      paintTop: leafTop('#ffb2d3', (ctx, rand) => blobs(ctx, rand, '#ffffff', 4, 0.9, 1.6, 2, 2, T - 4, T - 4, 0.9)),
    },
    [Block.MAGIC_LEAVES]: {
      top: '#7476f2', front: '#5052c4', radius: 6,
      paintTop: leafTop('#7476f2', (ctx, rand) => {
        for (let i = 0; i < 3; i++) sparkle(ctx, 4 + rand() * 24, 4 + rand() * 24, 2.2, '#a8fdff');
      }),
    },
  };
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

  if (kind === Block.PINE_TREE) {
    const tiers = [
      { y: baseY - T * 1.05, w: 30 },
      { y: baseY - T * 1.65, w: 24 },
      { y: baseY - T * 2.2, w: 17 },
    ];
    for (const { y, w } of tiers) {
      const h = T * 0.95;
      const tri = () => {
        ctx.beginPath();
        ctx.moveTo(cx, y - h);
        ctx.quadraticCurveTo(cx + w * 0.4, y - h * 0.4, cx + w, y);
        ctx.quadraticCurveTo(cx, y + 5, cx - w, y);
        ctx.quadraticCurveTo(cx - w * 0.4, y - h * 0.4, cx, y - h);
        ctx.closePath();
      };
      tri();
      ctx.fillStyle = '#1d5a4f';
      ctx.fill();
      ctx.save();
      tri();
      ctx.clip();
      const g = ctx.createLinearGradient(cx - w, 0, cx + w, 0);
      g.addColorStop(0, '#4bb08f');
      g.addColorStop(0.55, '#2f8f78');
      g.addColorStop(1, '#22705f');
      ctx.fillStyle = g;
      ctx.fillRect(cx - w, y - h, w * 2, h + 6);
      // Neve nas pontas.
      ctx.fillStyle = rgba('#f4fbff', 0.95);
      ctx.beginPath();
      ctx.ellipse(cx - 2, y - h + 5, w * 0.35, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - w, y - 2, w * 2, 3);
      ctx.restore();
      ctx.strokeStyle = '#163f3a';
      ctx.lineWidth = 1;
      tri();
      ctx.stroke();
    }
  } else {
    const palette: Record<number, [string, string]> = {
      [Block.OAK_TREE]: ['#5cc565', '#c8f7a0'],
      [Block.SAKURA_TREE]: ['#ffa9cf', '#ffffff'],
      [Block.MAGIC_TREE]: ['#6f71f0', '#a8fdff'],
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
    if (kind === Block.MAGIC_TREE) {
      for (let i = 0; i < 6; i++) sparkle(ctx, cx - 22 + rand() * 44, ccy - 18 + rand() * 30, 2 + rand() * 1.6, accent);
    } else {
      blobs(ctx, rand, accent, kind === Block.SAKURA_TREE ? 9 : 6, 1, 1.8, cx - 22, ccy - 18, 44, 32, 0.9);
    }
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
    case Block.GLOW_MUSHROOM: {
      for (const [mx, s] of [[12, 1], [22, 0.7]] as const) {
        ctx.fillStyle = '#e9e2ff';
        roundRect(ctx, mx - 2 * s, T - 4 - 10 * s, 4 * s, 10 * s, 1.5);
        ctx.fill();
        const g = ctx.createRadialGradient(mx - 2, T - 14 * s - 2, 1, mx, T - 12 * s, 8 * s);
        g.addColorStop(0, '#d8ffff');
        g.addColorStop(0.5, '#4fe3ff');
        g.addColorStop(1, '#2a7fd6');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(mx, T - 12 * s, 8 * s, 6 * s, 0, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#1d4f9c';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      break;
    }
  }
  return { canvas: c, ox: 0, oy: -6, w: T, h: T, hit: { x: 0, y: -6, w: T, h: T } };
}

function iconFrom(sprite: Sprite): string {
  const size = 48;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const scale = Math.min(size / sprite.canvas.width, size / sprite.canvas.height) * 0.95;
  const w = sprite.canvas.width * scale;
  const h = sprite.canvas.height * scale;
  ctx.drawImage(sprite.canvas, (size - w) / 2, (size - h) / 2, w, h);
  return c.toDataURL();
}

export function createBlockTextures(): BlockTextures {
  const ground = new Map<BlockId, HTMLCanvasElement[]>();
  for (const id of [Block.GRASS, Block.ENCHANTED_GRASS, Block.SAND, Block.SNOW, Block.DIRT, Block.WATER, Block.ICE] as BlockId[]) {
    ground.set(id, Array.from({ length: GROUND_VARIANTS }, (_, v) => groundTile(id, v)));
  }
  const objects = new Map<BlockId, Sprite>();
  const styles = cubeStyles();
  for (const id of ALL_BLOCK_IDS) {
    const style = styles[id];
    if (style) objects.set(id, cube(style, id * 7919 + 13));
  }
  for (const id of [Block.OAK_TREE, Block.SAKURA_TREE, Block.MAGIC_TREE, Block.PINE_TREE] as BlockId[]) {
    objects.set(id, treeSprite(id));
  }
  objects.set(Block.CACTUS, cactusSprite());
  for (const id of [Block.TALL_GRASS, Block.FLOWER, Block.GLOW_MUSHROOM] as BlockId[]) {
    objects.set(id, decorationSprite(id));
  }
  const icons = new Map<BlockId, string>();
  for (const [id, sprite] of objects) icons.set(id, iconFrom(sprite));
  const glowColor = new Map<BlockId, string>([
    [Block.MANA_CRYSTAL, '#c38bff'],
    [Block.GLOW_MUSHROOM, '#5fe8ff'],
    [Block.MAGIC_LEAVES, '#8fa0ff'],
    [Block.MAGIC_TREE, '#8fa0ff'],
  ]);
  const bankColor = new Map<BlockId, string>([
    [Block.GRASS, '#9a6a42'],
    [Block.ENCHANTED_GRASS, '#9a6a42'],
    [Block.DIRT, '#8a5a36'],
    [Block.SAND, '#d9b06a'],
    [Block.SNOW, '#b9cde8'],
  ]);
  return { ground, objects, icons, glowColor, bankColor };
}

export function groundVariant(textures: BlockTextures, id: BlockId, h: number): HTMLCanvasElement | undefined {
  const list = textures.ground.get(id);
  return list ? list[Math.floor(h * list.length) % list.length] : undefined;
}

