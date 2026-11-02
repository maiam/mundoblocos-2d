import goddessFloatUrl from '../assets/goddess-float.webp?inline';
import heroineSwordAttackUrl from '../assets/heroine-sword-attack.webp?inline';
import heroineAxeAttackUrl from '../assets/heroine-axe-attack.webp?inline';
import heroineAxeUrl from '../assets/heroine-axe.webp?inline';
import heroineHoeUrl from '../assets/heroine-hoe.webp?inline';
import heroinePickaxeUrl from '../assets/heroine-pickaxe.webp?inline';
import heroineShovelUrl from '../assets/heroine-shovel.webp?inline';
import heroineSwordUrl from '../assets/heroine-sword.webp?inline';
import heroineUrl from '../assets/heroine.webp?inline';
import lambUrl from '../assets/lamb.webp?inline';
import sheepLoveUrl from '../assets/sheep-love.webp?inline';
import sheepUrl from '../assets/sheep.webp?inline';
import { TILE } from '../config';
import type { Actor, ActorKind } from '../game/entities';
import type { Facing } from '../game/walker';

/**
 * Sprites de atores (folhas geradas por scripts/process-sprite.py).
 * Folhas 4×4 na ordem canônica: frente, esquerda, direita, costas (as folhas das
 * ferramentas vêm em outra ordem e são normalizadas no processamento com --rows-map).
 * Folha de namoro: 4×1 (quadro = etapa da animação, corações crescendo).
 * Todos os quadros de uma folha compartilham a ancoragem (base na base do quadro).
 */
const ROW: Record<Facing, number> = { down: 0, left: 1, right: 2, up: 3 };

/** Altura desenhada da heroína em pixels de mundo (~2,2 células). */
export const CHARACTER_H = TILE * 2.2;

interface SheetSpec {
  url: string;
  cols: number;
  rows: number;
  /** Altura desenhada (px de mundo). */
  height: number;
  /** Raios da sombra no chão (em células). */
  shadow: [number, number];
  walkFps: number;
  /** Fração do quadro abaixo dos pés (sombra desenhada na própria arte). */
  footPad?: number;
  /**
   * Flutuação (em vez de caminhada): os quadros rodam sempre, em vai-e-volta, e o sprite
   * paira `lift` células acima do chão balançando `bob` px. A sombra fica no chão e encolhe
   * quando o sprite sobe. A câmera não balança (segue a posição lógica).
   */
  float?: { lift: number; bob: number; fps: number; movingFps: number };
  /** Folha de ação (ex.: golpe): o quadro vem de `Actor.frame`, a linha da direção. */
  action?: boolean;
}

const SPECS: Record<ActorKind, SheetSpec> = {
  // Deusa da Vida: flutua (folha 7×4 de flutuação; asas abertas, sem chão na arte).
  goddess: {
    url: goddessFloatUrl, cols: 7, rows: 4, height: TILE * 2.3, shadow: [0.34, 0.11], walkFps: 0,
    float: { lift: 0.32, bob: 3, fps: 7, movingFps: 10 },
  },
  heroine: { url: heroineUrl, cols: 4, rows: 4, height: CHARACTER_H, shadow: [0.32, 0.12], walkFps: 7 },
  // Heroína com ferramenta: mesma escala (altura do desenho igual à folha base).
  'heroine-sword': { url: heroineSwordUrl, cols: 4, rows: 4, height: CHARACTER_H, shadow: [0.32, 0.12], walkFps: 7 },
  'heroine-hoe': { url: heroineHoeUrl, cols: 4, rows: 4, height: CHARACTER_H, shadow: [0.32, 0.12], walkFps: 7 },
  'heroine-pickaxe': { url: heroinePickaxeUrl, cols: 4, rows: 4, height: CHARACTER_H, shadow: [0.32, 0.12], walkFps: 7 },
  'heroine-shovel': { url: heroineShovelUrl, cols: 4, rows: 4, height: CHARACTER_H, shadow: [0.32, 0.12], walkFps: 7 },
  // Golpe de espada: desenho 297 px contra 288 da caminhada → mesma escala da personagem.
  'heroine-sword-attack': {
    url: heroineSwordAttackUrl, cols: 4, rows: 4, height: CHARACTER_H * (297 / 288), shadow: [0.32, 0.12], walkFps: 0, action: true,
  },
  // Golpe de machado: o desenho inclui o machado erguido (313 px contra 288 da caminhada).
  'heroine-axe-attack': {
    url: heroineAxeAttackUrl, cols: 4, rows: 4, height: CHARACTER_H * (313 / 288), shadow: [0.32, 0.12], walkFps: 0, action: true,
  },
  'heroine-axe': { url: heroineAxeUrl, cols: 4, rows: 4, height: CHARACTER_H, shadow: [0.32, 0.12], walkFps: 7 },
  sheep: { url: sheepUrl, cols: 4, rows: 4, height: TILE * 1.25, shadow: [0.42, 0.14], walkFps: 6 },
  lamb: { url: lambUrl, cols: 4, rows: 4, height: TILE * 0.9, shadow: [0.3, 0.1], walkFps: 8 },
  // Dois animais lado a lado: ~2 células de largura, mesma escala da ovelha adulta.
  'sheep-love': { url: sheepLoveUrl, cols: 4, rows: 1, height: TILE * 1.75, shadow: [0.9, 0.16], walkFps: 0 },
};

class SpriteSheet {
  private readonly img = new Image();
  private ready = false;

  constructor(private readonly spec: SheetSpec) {
    this.img.onload = () => (this.ready = true);
    this.img.src = spec.url;
  }

  /** Desenha com a base em (fx, fy) — coordenadas de tela. */
  draw(ctx: CanvasRenderingContext2D, fx: number, fy: number, zoom: number, a: Actor, elapsed = 0): void {
    const { height, shadow, walkFps, cols, rows, footPad = 0, float, action } = this.spec;
    // Flutuação: fase contínua (não zera ao parar) → sem trancos entre parado e andando.
    const wave = float ? Math.sin(elapsed * 2.4) : 0;
    const shadowScale = float ? 1 - 0.12 * (wave + 1) / 2 : 1;
    // Sombra fixa no chão (não acompanha o balanço do sprite).
    ctx.fillStyle = float ? 'rgba(30, 20, 70, 0.22)' : 'rgba(30, 20, 70, 0.3)';
    ctx.beginPath();
    ctx.ellipse(fx, fy, shadow[0] * TILE * zoom * shadowScale, shadow[1] * TILE * zoom * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!this.ready) return;
    const h = height * zoom;
    const fw = this.img.width / cols;
    const fh = this.img.height / rows;
    const w = h * (fw / fh);
    let col: number;
    let lift = 0;
    if (float) {
      // Vai-e-volta pelos quadros (0…n-1…1): sem salto do último para o primeiro.
      const span = cols * 2 - 2;
      const step = Math.floor(elapsed * (a.moving ? float.movingFps : float.fps)) % span;
      col = step < cols ? step : span - step;
      lift = float.lift * TILE * zoom + (wave + 1) * 0.5 * float.bob * zoom;
    } else {
      col = rows === 1 || action ? (a.frame ?? 0) : a.moving ? Math.floor(a.walkTime * walkFps) % cols : 0;
    }
    const row = rows === 1 ? 0 : ROW[a.facing];
    // Sem arredondar a posição na flutuação: o balanço sub-pixel fica suave.
    const dx = fx - w / 2;
    const dy = fy - h + 2 * zoom + h * footPad - lift;
    if (float) ctx.drawImage(this.img, col * fw, row * fh, fw, fh, dx, dy, w, h);
    else ctx.drawImage(this.img, col * fw, row * fh, fw, fh, Math.round(dx), Math.round(dy), Math.round(w), Math.round(h));
  }

  /** Altura total na tela (px de mundo), incluindo o quanto paira acima do chão. */
  get drawHeight(): number {
    return this.spec.height + (this.spec.float ? this.spec.float.lift * TILE : 0);
  }
}

export class ActorSprites {
  private readonly sheets = Object.fromEntries(
    (Object.keys(SPECS) as ActorKind[]).map((k) => [k, new SpriteSheet(SPECS[k])]),
  ) as Record<ActorKind, SpriteSheet>;

  get(kind: ActorKind): SpriteSheet {
    return this.sheets[kind];
  }
}

/** Coração cel-shaded (contorno vinho, brilho) — mesmo estilo da folha de namoro. */
export function drawHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, alpha = 1): void {
  const s = size / 2;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.9);
    ctx.bezierCurveTo(cx - s * 1.6, cy - s * 0.1, cx - s * 0.9, cy - s * 1.3, cx, cy - s * 0.45);
    ctx.bezierCurveTo(cx + s * 0.9, cy - s * 1.3, cx + s * 1.6, cy - s * 0.1, cx, cy + s * 0.9);
    ctx.closePath();
  };
  ctx.save();
  ctx.globalAlpha = alpha;
  path();
  ctx.fillStyle = '#ff6f8e';
  ctx.fill();
  ctx.lineWidth = Math.max(1, size * 0.08);
  ctx.strokeStyle = '#a8324f';
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.beginPath();
  ctx.ellipse(cx - s * 0.45, cy - s * 0.35, s * 0.22, s * 0.14, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
