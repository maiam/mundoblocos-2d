import { art } from './art';
import { TILE } from '../config';
import type { Actor, ActorKind } from '../game/entities';
import type { Facing } from '../game/walker';
import type { VillagerBase } from '../game/villager';

/**
 * Sprites de atores (folhas geradas por scripts/process-sprite.py); URLs vêm do pacote de arte do mundo (`render/art`).
 * Folhas 4×4 na ordem canônica: frente, esquerda, direita, costas (as folhas das
 * ferramentas vêm em outra ordem e são normalizadas no processamento com --rows-map).
 * Folha de namoro: 4×1 (quadro = etapa da animação, corações crescendo).
 * Todos os quadros de uma folha compartilham a ancoragem (base na base do quadro).
 */
const ROW: Record<Facing, number> = { down: 0, left: 1, right: 2, up: 3 };

/** Altura desenhada da heroína em pixels de mundo (~2,2 células). */
export const CHARACTER_H = TILE * 2.2;

interface SheetSpec {
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
  /**
   * Ciclo único (monstros): `cols × rows` quadros em sequência, sem linha por direção (arte de frente).
   * `flipRight` espelha o desenho quando o ator olha para a direita.
   */
  cycle?: { flipRight: boolean };
  /**
   * Folha de morte (monstros): `cols × rows` quadros em sequência; `ratio` = altura da caixa da morte em relação à
   * do quadro de caminhada (o 1º quadro tem a aranha na mesma escala). URL vem do pacote (`monsterDeaths`).
   */
  death?: { cols: number; rows: number; ratio: number };
}

const SPECS: Record<ActorKind, SheetSpec> = {
  // Deusa da Vida: flutua (folha 7×4 de flutuação; asas abertas, sem chão na arte).
  goddess: {
    cols: 7, rows: 4, height: TILE * 2.3, shadow: [0.34, 0.11], walkFps: 0,
    float: { lift: 0.32, bob: 3, fps: 7, movingFps: 10 },
  },
  heroine: { cols: 4, rows: 4, height: CHARACTER_H, shadow: [0.32, 0.12], walkFps: 7 },
  // Heroína com ferramenta: mesma escala (altura do desenho igual à folha base).
  'heroine-sword': { cols: 4, rows: 4, height: CHARACTER_H, shadow: [0.32, 0.12], walkFps: 7 },
  'heroine-hoe': { cols: 4, rows: 4, height: CHARACTER_H, shadow: [0.32, 0.12], walkFps: 7 },
  'heroine-pickaxe': { cols: 4, rows: 4, height: CHARACTER_H, shadow: [0.32, 0.12], walkFps: 7 },
  'heroine-shovel': { cols: 4, rows: 4, height: CHARACTER_H, shadow: [0.32, 0.12], walkFps: 7 },
  // Golpe de espada: desenho 297 px contra 288 da caminhada → mesma escala da personagem.
  'heroine-sword-attack': {
    cols: 4, rows: 4, height: CHARACTER_H * (297 / 288), shadow: [0.32, 0.12], walkFps: 0, action: true,
  },
  // Golpe de machado: o desenho inclui o machado erguido (313 px contra 288 da caminhada).
  'heroine-axe-attack': {
    cols: 4, rows: 4, height: CHARACTER_H * (313 / 288), shadow: [0.32, 0.12], walkFps: 0, action: true,
  },
  // Arar com enxada (306 px de desenho contra 288 da caminhada).
  'heroine-hoe-attack': {
    cols: 4, rows: 4, height: CHARACTER_H * (306 / 288), shadow: [0.32, 0.12], walkFps: 0, action: true,
  },
  // Cavar com pá (306 px de desenho contra 288 da caminhada).
  'heroine-shovel-attack': {
    cols: 4, rows: 4, height: CHARACTER_H * (306 / 288), shadow: [0.32, 0.12], walkFps: 0, action: true,
  },
  // Minerar com picareta: o desenho inclui a picareta erguida (362 px contra 288 da caminhada).
  'heroine-pickaxe-attack': {
    cols: 4, rows: 4, height: CHARACTER_H * (362 / 288), shadow: [0.32, 0.12], walkFps: 0, action: true,
  },
  'heroine-axe': { cols: 4, rows: 4, height: CHARACTER_H, shadow: [0.32, 0.12], walkFps: 7 },
  // Herói (personagem pronto, assets-src/hero): caminhada sem ferramenta (298 px de desenho), golpes das 5
  // ferramentas e a caminhada com picareta. Ainda sem folha: andar segurando enxada, machado, espada e pá (usa a
  // caminhada sem ferramenta) — pendência da arte.
  hero: { cols: 4, rows: 4, height: CHARACTER_H, shadow: [0.32, 0.12], walkFps: 7 },
  'hero-sword': { cols: 4, rows: 4, height: CHARACTER_H, shadow: [0.32, 0.12], walkFps: 7 },
  'hero-hoe': { cols: 4, rows: 4, height: CHARACTER_H, shadow: [0.32, 0.12], walkFps: 7 },
  'hero-shovel': { cols: 4, rows: 4, height: CHARACTER_H, shadow: [0.32, 0.12], walkFps: 7 },
  'hero-axe': { cols: 4, rows: 4, height: CHARACTER_H, shadow: [0.32, 0.12], walkFps: 7 },
  'hero-pickaxe': { cols: 4, rows: 4, height: CHARACTER_H * (305 / 298), shadow: [0.32, 0.12], walkFps: 7 },
  'hero-sword-attack': { cols: 4, rows: 4, height: CHARACTER_H * (307 / 298), shadow: [0.32, 0.12], walkFps: 0, action: true },
  'hero-axe-attack': { cols: 4, rows: 4, height: CHARACTER_H * (312 / 298), shadow: [0.32, 0.12], walkFps: 0, action: true },
  'hero-hoe-attack': { cols: 4, rows: 4, height: CHARACTER_H * (311 / 298), shadow: [0.32, 0.12], walkFps: 0, action: true },
  'hero-shovel-attack': { cols: 4, rows: 4, height: CHARACTER_H * (313 / 298), shadow: [0.32, 0.12], walkFps: 0, action: true },
  'hero-pickaxe-attack': { cols: 4, rows: 4, height: CHARACTER_H * (311 / 298), shadow: [0.32, 0.12], walkFps: 0, action: true },
  // Hood (personagem pronto, assets-src/hood): caminhada sem ferramenta (292 px de desenho) e com as 5 ferramentas.
  // Ainda sem folhas de golpe: o golpe usa a caminhada com a ferramenta (pendência da arte).
  hood: { cols: 4, rows: 4, height: CHARACTER_H, shadow: [0.32, 0.12], walkFps: 7 },
  'hood-sword': { cols: 4, rows: 4, height: CHARACTER_H, shadow: [0.32, 0.12], walkFps: 7 },
  'hood-hoe': { cols: 4, rows: 4, height: CHARACTER_H, shadow: [0.32, 0.12], walkFps: 7 },
  'hood-shovel': { cols: 4, rows: 4, height: CHARACTER_H * (291 / 292), shadow: [0.32, 0.12], walkFps: 7 },
  'hood-axe': { cols: 4, rows: 4, height: CHARACTER_H * (297 / 292), shadow: [0.32, 0.12], walkFps: 7 },
  'hood-pickaxe': { cols: 4, rows: 4, height: CHARACTER_H * (297 / 292), shadow: [0.32, 0.12], walkFps: 7 },
  'hood-sword-attack': { cols: 4, rows: 4, height: CHARACTER_H, shadow: [0.32, 0.12], walkFps: 0, action: true },
  'hood-axe-attack': { cols: 4, rows: 4, height: CHARACTER_H * (297 / 292), shadow: [0.32, 0.12], walkFps: 0, action: true },
  'hood-hoe-attack': { cols: 4, rows: 4, height: CHARACTER_H, shadow: [0.32, 0.12], walkFps: 0, action: true },
  'hood-shovel-attack': { cols: 4, rows: 4, height: CHARACTER_H * (291 / 292), shadow: [0.32, 0.12], walkFps: 0, action: true },
  'hood-pickaxe-attack': { cols: 4, rows: 4, height: CHARACTER_H * (297 / 292), shadow: [0.32, 0.12], walkFps: 0, action: true },
  sheep: { cols: 4, rows: 4, height: TILE * 1.25, shadow: [0.42, 0.14], walkFps: 6 },
  lamb: { cols: 4, rows: 4, height: TILE * 0.9, shadow: [0.3, 0.1], walkFps: 8 },
  // Dois animais lado a lado: ~2 células de largura, mesma escala da ovelha adulta.
  // Aranhas da dungeon (scripts/extract-dungeon.py): 8 quadros de caminhada, arte de frente/esquerda.
  'spider-small': { cols: 4, rows: 2, height: TILE * 0.85, shadow: [0.42, 0.13], walkFps: 12, cycle: { flipRight: true }, death: { cols: 4, rows: 2, ratio: 1.034 } },
  'spider-big': { cols: 4, rows: 2, height: TILE * 1.3, shadow: [0.6, 0.17], walkFps: 10, cycle: { flipRight: true }, death: { cols: 4, rows: 2, ratio: 1.0 } },
  'spider-boss': { cols: 4, rows: 2, height: TILE * 2.3, shadow: [1.45, 0.36], walkFps: 8, cycle: { flipRight: true }, death: { cols: 8, rows: 2, ratio: 1.012 } },
  // Coraçõezinhos do namoro (qualquer animal): 16 quadros numa fileira, sem sombra; tamanho por `Actor.scale`.
  'love-hearts': { cols: 16, rows: 1, height: TILE * 1.8, shadow: [0, 0], walkFps: 0 },
  horse: { cols: 4, rows: 4, height: TILE * 1.6, shadow: [0.5, 0.15], walkFps: 7 },
  // Vaca e galinha (process-sprite.py --alpha --largest): bichinhos chibi, menores que o cavalo.
  cow: { cols: 4, rows: 4, height: TILE * 1.35, shadow: [0.46, 0.14], walkFps: 6 },
  chicken: { cols: 4, rows: 4, height: TILE * 0.85, shadow: [0.26, 0.09], walkFps: 9 },
  // Filhotes (process-sprite.py --alpha --largest): potro, bezerro e pintinho, menores e mais ligeiros que os pais.
  foal: { cols: 4, rows: 4, height: TILE * 1.1, shadow: [0.36, 0.11], walkFps: 8 },
  calf: { cols: 4, rows: 4, height: TILE * 0.95, shadow: [0.34, 0.11], walkFps: 7 },
  chick: { cols: 4, rows: 4, height: TILE * 0.6, shadow: [0.2, 0.07], walkFps: 10 },
  // Moradores (scripts/extract-villagers.py): mesma escala da heroína; a roupa vem por cima (`Actor.outfit`).
  'villager-blond': { cols: 4, rows: 4, height: CHARACTER_H, shadow: [0.32, 0.12], walkFps: 7 },
  'villager-brown': { cols: 4, rows: 4, height: CHARACTER_H, shadow: [0.32, 0.12], walkFps: 7 },
  'villager-black': { cols: 4, rows: 4, height: CHARACTER_H, shadow: [0.32, 0.12], walkFps: 7 },
  'villager-silver': { cols: 4, rows: 4, height: CHARACTER_H, shadow: [0.32, 0.12], walkFps: 7 },
  'villager-red': { cols: 4, rows: 4, height: CHARACTER_H, shadow: [0.32, 0.12], walkFps: 7 },
};

class SpriteSheet {
  private readonly img = new Image();
  private ready = false;

  private readonly deathImg = new Image();
  private deathReady = false;

  /**
   * Camadas desenhadas por cima no mesmo quadro (moradores), por chave: `face:<expr>`, `bangs`, `fx:<expr>`,
   * `outfit:<id>`. Ordem: base → rosto → franja → efeitos → roupa.
   */
  private readonly layers = new Map<string, HTMLImageElement>();

  /** `url` ausente = o mundo não tem este ator (só a sombra seria desenhada; na prática ele não aparece). */
  constructor(private readonly spec: SheetSpec, url: string | undefined, deathUrl?: string, layers?: Partial<Record<string, string>>) {
    this.img.onload = () => (this.ready = true);
    if (url) this.img.src = url;
    for (const [id, src] of Object.entries(layers ?? {})) {
      if (!src) continue;
      const im = new Image();
      im.src = src;
      this.layers.set(id, im);
    }
    this.deathImg.onload = () => (this.deathReady = true);
    if (deathUrl) this.deathImg.src = deathUrl;
  }

  /** Desenha com a base em (fx, fy) — coordenadas de tela. */
  draw(ctx: CanvasRenderingContext2D, fx: number, fy: number, zoom: number, a: Actor, elapsed = 0): void {
    const { height, shadow, walkFps, cols, rows, footPad = 0, float, action, cycle } = this.spec;
    if (cycle) {
      this.drawCycle(ctx, fx, fy, zoom, a, elapsed);
      return;
    }
    // Flutuação: fase contínua (não zera ao parar) → sem trancos entre parado e andando.
    const wave = float ? Math.sin(elapsed * 2.4) : 0;
    const shadowScale = float ? 1 - 0.12 * (wave + 1) / 2 : 1;
    // Sombra fixa no chão (não acompanha o balanço do sprite).
    if (shadow[0] > 0) {
      ctx.fillStyle = float ? 'rgba(30, 20, 70, 0.22)' : 'rgba(30, 20, 70, 0.3)';
      ctx.beginPath();
      ctx.ellipse(fx, fy, shadow[0] * TILE * zoom * shadowScale, shadow[1] * TILE * zoom * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!this.ready) return;
    const h = height * zoom * (a.scale ?? 1);
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
    // Invencível depois de levar dano: pisca.
    if (a.hurt && Math.floor(elapsed * 14) % 2 === 1) return;
    if (float) ctx.drawImage(this.img, col * fw, row * fh, fw, fh, dx, dy, w, h);
    else ctx.drawImage(this.img, col * fw, row * fh, fw, fh, Math.round(dx), Math.round(dy), Math.round(w), Math.round(h));
    // Camadas do morador: mesmo quadro de cada folha (mesma grade e escala da base — extract-villagers.py).
    const keys = a.expression ? [`face:${a.expression}`, 'bangs', `fx:${a.expression}`] : [];
    if (a.outfit) keys.push(`outfit:${a.outfit}`);
    for (const key of keys) {
      const layer = this.layers.get(key);
      if (!layer?.complete || !layer.naturalWidth) continue;
      const lw = layer.naturalWidth / cols;
      const lh = layer.naturalHeight / rows;
      ctx.drawImage(layer, col * lw, row * lh, lw, lh, Math.round(dx), Math.round(dy), Math.round(w), Math.round(h));
    }
  }

  /** Monstro: ciclo de 8 quadros (andando) ou respiração lenta (parado), espelho à direita, pisca ferido. */
  private drawCycle(ctx: CanvasRenderingContext2D, fx: number, fy: number, zoom: number, a: Actor, elapsed: number): void {
    const { height, shadow, walkFps, cols, rows, cycle } = this.spec;
    ctx.fillStyle = `rgba(30, 20, 70, ${0.3 * (1 - (a.dying ?? 0))})`; // a sombra some junto na morte
    ctx.beginPath();
    ctx.ellipse(fx, fy, shadow[0] * TILE * zoom, shadow[1] * TILE * zoom, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!this.ready) return;
    const n = cols * rows;
    const i = a.moving ? Math.floor(a.walkTime * walkFps) % n : Math.floor(elapsed * 2) % 2;
    const fw = this.img.width / cols;
    const fh = this.img.height / rows;
    const h = Math.round(height * zoom);
    const w = Math.round(h * (fw / fh));
    const dy = Math.round(fy - h + 3 * zoom);
    const visible = !a.hurt || Math.floor(elapsed * 16) % 2 === 0;
    if (a.dying !== undefined && this.deathReady && this.spec.death) {
      // Morte com a folha própria: quadros em sequência, mesma escala da caminhada, espelhada à direita.
      const dd = this.spec.death;
      const n = dd.cols * dd.rows;
      const k = Math.min(n - 1, Math.floor(a.dying * n));
      const dfw = this.deathImg.width / dd.cols;
      const dfh = this.deathImg.height / dd.rows;
      const dh = Math.round(height * dd.ratio * zoom);
      const dw = Math.round(dh * (dfw / dfh));
      ctx.save();
      ctx.translate(Math.round(fx), 0);
      if (cycle?.flipRight && a.facing === 'right') ctx.scale(-1, 1);
      ctx.drawImage(this.deathImg, (k % dd.cols) * dfw, Math.floor(k / dd.cols) * dfh, dfw, dfh, -Math.round(dw / 2), Math.round(fy - dh + 3 * zoom), dw, dh);
      ctx.restore();
      return;
    }
    if (a.dying !== undefined) {
      // Morte provisória (sem folha própria): encolhe, achata, desbota e solta faíscas roxas.
      const d = a.dying;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - d);
      ctx.translate(Math.round(fx), Math.round(fy));
      ctx.scale((cycle?.flipRight && a.facing === 'right' ? -1 : 1) * (1 + d * 0.15), 1 - d * 0.6);
      ctx.drawImage(this.img, 0, 0, fw, fh, -Math.round(w / 2), dy - Math.round(fy), w, h);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - d);
      for (let k = 0; k < 8; k++) {
        const ang = (k / 8) * Math.PI * 2 + a.x;
        const r = (6 + d * w * 0.6) * (0.7 + (k % 3) * 0.15);
        ctx.fillStyle = k % 2 ? '#c38cff' : '#ff8ab0';
        ctx.beginPath();
        ctx.arc(fx + Math.cos(ang) * r, fy - h * 0.35 + Math.sin(ang) * r * 0.6, (2.2 - d * 1.2) * zoom, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return;
    }
    if (visible) {
      ctx.save();
      ctx.translate(Math.round(fx), 0);
      if (cycle?.flipRight && a.facing === 'right') ctx.scale(-1, 1);
      ctx.drawImage(this.img, (i % cols) * fw, Math.floor(i / cols) * fh, fw, fh, -Math.round(w / 2), dy, w, h);
      ctx.restore();
    }
    if (a.hp !== undefined) {
      // Barra de vida acima do monstro ferido.
      const bw = Math.max(18, w * 0.5);
      const bx = Math.round(fx - bw / 2);
      const by = dy - 6 * zoom;
      ctx.fillStyle = 'rgba(20, 12, 40, 0.75)';
      ctx.fillRect(bx - 1, by - 1, bw + 2, 4 * zoom + 2);
      ctx.fillStyle = a.hp > 0.35 ? '#ff6b8a' : '#ffb347';
      ctx.fillRect(bx, by, Math.round(bw * a.hp), 4 * zoom);
    }
  }

  /** Altura total na tela (px de mundo), incluindo o quanto paira acima do chão. */
  get drawHeight(): number {
    return this.spec.height + (this.spec.float ? this.spec.float.lift * TILE : 0);
  }
}

/** Camadas de um personagem-base de morador (ver `SpriteSheet.layers`), do pacote de arte do mundo. */
function villagerLayers(base: VillagerBase): Record<string, string> {
  const a = art();
  const out: Record<string, string> = {};
  for (const [id, url] of Object.entries(a.outfits ?? {})) if (url) out[`outfit:${id}`] = url;
  for (const [id, e] of Object.entries(a.expressions ?? {})) {
    if (!e) continue;
    out[`face:${id}`] = e.face;
    if (e.fx) out[`fx:${id}`] = e.fx;
  }
  const bangs = a.bangs?.[base];
  if (bangs) out.bangs = bangs;
  return out;
}

export class ActorSprites {
  private readonly sheets = Object.fromEntries(
    (Object.keys(SPECS) as ActorKind[]).map((k) => [k, new SpriteSheet(
      SPECS[k], art().actors[k], (art().monsterDeaths as Record<string, string> | undefined)?.[k],
      k.startsWith('villager-') ? villagerLayers(k.slice('villager-'.length) as VillagerBase) : undefined,
    )]),
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
