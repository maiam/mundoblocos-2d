import type { Actor } from '../game/entities';
import type { Facing } from '../game/walker';
import { art } from './art';
import { ActorSprites, CHARACTER_H } from './character';
import type { ModularLook } from './modular';
import { ModularSprites } from './modularCharacter';

/** Ordem em que a prévia vira (frente, esquerda, costas, direita) e quanto tempo anda em cada direção (s). */
const TURN: Facing[] = ['down', 'left', 'up', 'right'];
const TURN_EVERY = 1.6;

/**
 * Prévia do personagem na tela de entrada: o mesmo desenho do jogo (heroína ou chibi modular), andando no lugar e
 * virando nas 4 direções. Só desenha — não conhece regra nenhuma.
 */
export class CharacterPreview {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly heroine = new ActorSprites().get('heroine');
  private readonly modular = art().modular ? new ModularSprites(art().modular!.manifest, art().modular!.sheets) : undefined;
  private look: ModularLook | null = null;
  private running = false;
  private t = 0;
  private last = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  /** null = heroína. */
  setLook(look: ModularLook | null): void {
    this.look = look;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    this.t += Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.draw();
    requestAnimationFrame(this.frame);
  };

  private draw(): void {
    const c = this.canvas;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(c.clientWidth * dpr);
    const h = Math.round(c.clientHeight * dpr);
    if (!w || !h) return;
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // Personagem ocupa ~80% da altura, pés perto da base.
    const zoom = (h * 0.8) / CHARACTER_H;
    const facing = TURN[Math.floor(this.t / TURN_EVERY) % TURN.length];
    const a: Actor = {
      kind: 'heroine', x: 0, y: 0, visualZ: 0, facing, moving: true, walkTime: this.t, look: this.look ?? undefined,
    };
    const fx = w / 2;
    const fy = h * 0.92;
    if (!this.modular?.draw(ctx, fx, fy, zoom, a, this.t)) this.heroine.draw(ctx, fx, fy, zoom, a, this.t);
  }
}
