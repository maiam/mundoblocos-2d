import { SUBDIV, TILE } from '../config';
import type { Hit } from '../world/progression';
import type { Camera } from '../game/camera';

/**
 * Números de dano subindo na tela (apresentação pura): branco no inimigo, vermelho na heroína, amarelo e maior no
 * crítico. Cada número sobe ~0,9 célula e some em 0,9 s; posição em células do mundo (acompanha a câmera).
 */
interface FloatText {
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  t: number;
}

const LIFE_S = 0.9;
const MAX_TEXTS = 40;

export class DamageNumbers {
  private readonly list: FloatText[] = [];

  add(x: number, y: number, hit: Hit, target: 'enemy' | 'player'): void {
    if (this.list.length >= MAX_TEXTS) this.list.shift();
    const crit = hit.crit;
    this.list.push({
      x: x + (Math.random() - 0.5) * 0.3, // só visual: evita números empilhados exatamente no mesmo ponto
      y,
      text: crit ? `${hit.amount}!` : String(hit.amount),
      color: target === 'player' ? '#ff5c6c' : crit ? '#ffd23f' : '#ffffff',
      size: crit ? 17 : 13,
      t: 0,
    });
  }

  draw(ctx: CanvasRenderingContext2D, cam: Camera, dt: number): void {
    if (!this.list.length) return;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (let i = this.list.length - 1; i >= 0; i--) {
      const f = this.list[i];
      f.t += dt;
      if (f.t >= LIFE_S) {
        this.list.splice(i, 1);
        continue;
      }
      const p = f.t / LIFE_S;
      const rise = 0.9 * SUBDIV * (1 - (1 - p) * (1 - p)); // sobe rápido e desacelera
      const pop = p < 0.15 ? 0.7 + (p / 0.15) * 0.45 : 1.15 - Math.min(0.15, (p - 0.15) * 0.4);
      const sx = cam.worldToScreenX(f.x * TILE);
      const sy = cam.worldToScreenY((f.y - 1.4 * SUBDIV - rise) * TILE);
      const size = Math.max(10, f.size * pop * Math.min(1.6, Math.max(0.9, cam.zoom * 0.7)));
      ctx.globalAlpha = p > 0.65 ? 1 - (p - 0.65) / 0.35 : 1;
      ctx.font = `900 ${size}px Nunito, system-ui, sans-serif`;
      ctx.lineWidth = Math.max(2.5, size * 0.22);
      ctx.strokeStyle = 'rgba(28, 12, 40, 0.9)';
      ctx.strokeText(f.text, sx, sy);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, sx, sy);
    }
    ctx.restore();
  }
}
