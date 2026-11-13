import { TILE } from '../config';
import type { Camera } from '../game/camera';
import type { Rect } from '../world/dungeon';

/**
 * Efeitos de tela da dungeon (ADR 0019), em funções sobre um `CanvasRenderingContext2D` — os MESMOS desenhos para o `Renderer`
 * 2D e para a camada 2D do render 3D (ADR 0031, M4.2).
 */

/** Pinta de escuro tudo fora do retângulo (células): de dentro do covil não se vê o mundo. */
export function darkenOutside(ctx: CanvasRenderingContext2D, cam: Camera, a: Rect, w: number, h: number): void {
  const x0 = Math.max(0, Math.round(cam.worldToScreenX(a.x0 * TILE)));
  const y0 = Math.max(0, Math.round(cam.worldToScreenY(a.y0 * TILE)));
  const x1 = Math.min(w, Math.round(cam.worldToScreenX((a.x1 + 1) * TILE)));
  const y1 = Math.min(h, Math.round(cam.worldToScreenY((a.y1 + 1) * TILE)));
  ctx.fillStyle = '#0b0612';
  ctx.fillRect(0, 0, w, y0);
  ctx.fillRect(0, y1, w, h - y1);
  ctx.fillRect(0, y0, x0, y1 - y0);
  ctx.fillRect(x1, y0, w - x1, y1 - y0);
}

/**
 * Entrada da dungeon: coluna de luz roxa pulsando sobre a célula da frente; fora da tela, uma seta na borda
 * aponta para ela (o jogador a encontra a partir do início).
 */
export function drawBeacon(ctx: CanvasRenderingContext2D, cam: Camera, [ex, ey]: [number, number], elapsed: number, w: number, h: number): void {
  const z = cam.zoom;
  const sx = cam.worldToScreenX((ex + 0.5) * TILE);
  const sy = cam.worldToScreenY((ey + 0.5) * TILE);
  const pulse = 0.75 + 0.25 * Math.sin(elapsed * 3);
  const margin = 28;
  if (sx > -40 && sx < w + 40 && sy > -40 && sy < h + 40) {
    const colH = TILE * 3.2 * z;
    const g = ctx.createLinearGradient(0, sy - colH, 0, sy);
    g.addColorStop(0, 'rgba(190, 120, 255, 0)');
    g.addColorStop(1, `rgba(190, 120, 255, ${0.8 * pulse})`);
    ctx.fillStyle = g;
    ctx.fillRect(sx - 9 * z, sy - colH, 18 * z, colH);
    ctx.fillStyle = `rgba(255, 245, 255, ${0.55 * pulse})`;
    ctx.fillRect(sx - 2.5 * z, sy - colH * 0.8, 5 * z, colH * 0.8);
    ctx.fillStyle = `rgba(230, 200, 255, ${0.8 * pulse})`;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 12 * z, 4.5 * z, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  // Seta na borda da tela, na direção da entrada.
  const ang = Math.atan2(sy - h / 2, sx - w / 2);
  const k = Math.min((w / 2 - margin) / Math.abs(Math.cos(ang) || 1e-6), (h / 2 - margin * 2.6) / Math.abs(Math.sin(ang) || 1e-6)); // longe da hotbar
  const ax = w / 2 + Math.cos(ang) * k;
  const ay = h / 2 + Math.sin(ang) * k;
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(ang);
  ctx.globalAlpha = 0.6 + 0.4 * pulse;
  ctx.fillStyle = '#c38cff';
  ctx.strokeStyle = '#2a1a48';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(-8, -10);
  ctx.lineTo(-3, 0);
  ctx.lineTo(-8, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
