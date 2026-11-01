import { SEA_LEVEL, TILE } from '../config';
import { Noise } from '../world/noise';
import { hash2 } from '../world/random';
import { mix, rgba } from './color';
import type { Camera } from '../game/camera';

/**
 * Céu e cenário em parallax: gradiente com ciclo dia/noite, sol/lua com halo,
 * nuvens cel-shaded, cordilheiras com perspectiva atmosférica e ilhas flutuantes.
 */

interface SkyKey {
  t: number;
  top: string;
  bottom: string;
  /** Tinta aplicada sobre o mundo (cor + alpha). */
  tint: string;
  tintA: number;
}

// t: 0 = meia-noite, 0.25 = amanhecer, 0.5 = meio-dia, 0.75 = pôr do sol.
const SKY: SkyKey[] = [
  { t: 0.0, top: '#0b1030', bottom: '#2a2a6a', tint: '#1a1850', tintA: 0.38 },
  { t: 0.2, top: '#1d2460', bottom: '#5c4a9a', tint: '#2a2470', tintA: 0.28 },
  { t: 0.27, top: '#5b7fd6', bottom: '#ffb38a', tint: '#ff9a6a', tintA: 0.08 },
  { t: 0.36, top: '#4fa3ff', bottom: '#bfe6ff', tint: '#ffffff', tintA: 0 },
  { t: 0.64, top: '#4f9dff', bottom: '#c6e8ff', tint: '#ffffff', tintA: 0 },
  { t: 0.74, top: '#6a5bd1', bottom: '#ff9e7a', tint: '#ff7a5a', tintA: 0.12 },
  { t: 0.82, top: '#2c2a74', bottom: '#b0608f', tint: '#3a2a80', tintA: 0.26 },
  { t: 1.0, top: '#0b1030', bottom: '#2a2a6a', tint: '#1a1850', tintA: 0.38 },
];

export interface SkyState {
  top: string;
  bottom: string;
  tint: string;
  tintA: number;
  night: number;
}

export function skyAt(time: number): SkyState {
  const t = ((time % 1) + 1) % 1;
  let i = 0;
  while (i < SKY.length - 2 && SKY[i + 1].t < t) i++;
  const a = SKY[i];
  const b = SKY[i + 1];
  const k = (t - a.t) / (b.t - a.t);
  const night = Math.max(0, Math.cos(t * Math.PI * 2)) ** 0.7; // 1 à meia-noite
  return {
    top: mix(a.top, b.top, k),
    bottom: mix(a.bottom, b.bottom, k),
    tint: mix(a.tint, b.tint, k),
    tintA: a.tintA + (b.tintA - a.tintA) * k,
    night,
  };
}

interface Layer {
  parallax: number;
  scale: number;
  amp: number;
  offset: number;
  color: string;
  rim: string;
}

export class Background {
  private readonly noise: Noise;
  private readonly stars: [number, number, number][] = [];

  constructor(private readonly seed: number) {
    this.noise = new Noise(seed ^ 0x51ed270b);
    for (let i = 0; i < 140; i++) {
      this.stars.push([hash2(seed, i, 1), hash2(seed, i, 2) * 0.7, hash2(seed, i, 3)]);
    }
  }

  draw(ctx: CanvasRenderingContext2D, cam: Camera, w: number, h: number, time: number, elapsed: number): SkyState {
    const sky = skyAt(time);
    // Linha do horizonte acompanha o nível do mar com parallax vertical leve.
    const seaScreenY = cam.worldToScreenY(SEA_LEVEL * TILE);
    const horizon = h * 0.55 + (seaScreenY - h * 0.55) * 0.25;

    const g = ctx.createLinearGradient(0, 0, 0, Math.max(horizon, 1));
    g.addColorStop(0, sky.top);
    g.addColorStop(1, sky.bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    if (sky.night > 0.05) this.drawStars(ctx, w, horizon, sky.night, elapsed);
    this.drawSunMoon(ctx, w, horizon, time);
    this.drawClouds(ctx, cam, w, horizon, sky, elapsed, 0.05, 0.6);

    const layers: Layer[] = [
      { parallax: 0.06, scale: 900, amp: 0.34, offset: 0.0, color: mix('#7b8fd6', sky.bottom, 0.55), rim: '#ffffff' },
      { parallax: 0.12, scale: 520, amp: 0.26, offset: 0.06, color: mix('#5a6fb8', sky.bottom, 0.38), rim: '#e9f0ff' },
    ];
    this.drawMountains(ctx, cam, w, h, horizon, layers[0], sky);
    this.drawIslands(ctx, cam, w, horizon, sky, elapsed);
    this.drawMountains(ctx, cam, w, h, horizon, layers[1], sky);
    this.drawHills(ctx, cam, w, h, horizon, sky);
    this.drawClouds(ctx, cam, w, horizon, sky, elapsed, 0.22, 1);
    return sky;
  }

  private drawStars(ctx: CanvasRenderingContext2D, w: number, horizon: number, night: number, elapsed: number): void {
    for (const [sx, sy, s] of this.stars) {
      const tw = 0.6 + 0.4 * Math.sin(elapsed * (1 + s * 2) + s * 40);
      ctx.fillStyle = `rgba(255, 250, 230, ${night * tw * (0.4 + s * 0.6)})`;
      const r = 0.6 + s * 1.4;
      ctx.beginPath();
      ctx.arc(sx * w, sy * horizon, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawSunMoon(ctx: CanvasRenderingContext2D, w: number, horizon: number, time: number): void {
    const t = ((time % 1) + 1) % 1;
    const draw = (phase: number, isSun: boolean) => {
      // phase 0..1 percorre o arco de um horizonte ao outro.
      if (phase < 0 || phase > 1) return;
      const x = w * (0.1 + 0.8 * phase);
      const y = horizon - Math.sin(phase * Math.PI) * horizon * 0.75 + 20;
      const r = isSun ? 34 : 26;
      const halo = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 4);
      halo.addColorStop(0, isSun ? 'rgba(255, 236, 170, 0.55)' : 'rgba(200, 210, 255, 0.35)');
      halo.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, y, r * 4, 0, Math.PI * 2);
      ctx.fill();
      const body = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 2, x, y, r);
      body.addColorStop(0, isSun ? '#fffbe6' : '#ffffff');
      body.addColorStop(1, isSun ? '#ffd27a' : '#c9d4ff');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      if (!isSun) {
        ctx.fillStyle = 'rgba(150, 160, 220, 0.45)';
        for (const [dx, dy, rr] of [[-8, -4, 5], [6, 8, 4], [9, -9, 3]]) {
          ctx.beginPath();
          ctx.arc(x + dx, y + dy, rr, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };
    draw((t - 0.25) / 0.5, true);
    draw(t >= 0.75 ? (t - 0.75) / 0.5 : (t + 0.25) / 0.5, false);
  }

  private drawClouds(ctx: CanvasRenderingContext2D, cam: Camera, w: number, horizon: number, sky: SkyState, elapsed: number, parallax: number, size: number): void {
    const spacing = 420 * size;
    const scroll = cam.x * parallax + elapsed * 8 * size;
    const first = Math.floor((scroll - 200) / spacing);
    const last = Math.ceil((scroll + w + 200) / spacing);
    const lit = mix('#ffffff', sky.bottom, 0.25);
    const shadow = mix('#b9c3ee', sky.top, 0.35);
    for (let i = first; i <= last; i++) {
      if (hash2(this.seed, i, 91 + size * 10) < 0.35) continue;
      const cx = i * spacing - scroll + hash2(this.seed, i, 5) * spacing * 0.5;
      const cy = horizon * (0.15 + hash2(this.seed, i, 6) * 0.45 * size);
      const s = (0.7 + hash2(this.seed, i, 7) * 0.6) * size;
      const puffs: [number, number, number][] = [
        [-50, 6, 26], [-22, -10, 34], [12, -16, 38], [44, -4, 30], [70, 8, 22], [10, 10, 30],
      ];
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(s, s);
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = shadow;
      for (const [x, y, r] of puffs) { ctx.beginPath(); ctx.arc(x, y + 6, r, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = lit;
      for (const [x, y, r] of puffs) { ctx.beginPath(); ctx.arc(x - 2, y, r * 0.92, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = rgba('#ffffff', 0.7);
      for (const [x, y, r] of puffs.slice(1, 4)) { ctx.beginPath(); ctx.arc(x - 8, y - 8, r * 0.45, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
  }

  private ridge(x: number, layer: Layer): number {
    const n = this.noise.fbm1(x / layer.scale + layer.offset * 1000, 4);
    const sharp = 1 - Math.abs(this.noise.noise1(x / (layer.scale * 0.6) + 300) * 2);
    return n * 0.6 + sharp * 0.5;
  }

  private drawMountains(ctx: CanvasRenderingContext2D, cam: Camera, w: number, h: number, horizon: number, layer: Layer, sky: SkyState): void {
    const off = cam.x * layer.parallax;
    ctx.beginPath();
    ctx.moveTo(0, h);
    const pts: [number, number][] = [];
    for (let sx = -8; sx <= w + 8; sx += 6) {
      const y = horizon - (0.25 + this.ridge(sx + off, layer)) * horizon * layer.amp;
      pts.push([sx, y]);
      ctx.lineTo(sx, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, horizon - horizon * layer.amp, 0, horizon + 60);
    g.addColorStop(0, layer.color);
    g.addColorStop(1, mix(layer.color, sky.bottom, 0.5));
    ctx.fillStyle = g;
    ctx.fill();
    // Luz de borda (rim light) no cume e neve nos picos.
    ctx.strokeStyle = rgba(layer.rim, 0.35 * (1 - sky.night * 0.6));
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();
  }

  private drawIslands(ctx: CanvasRenderingContext2D, cam: Camera, w: number, horizon: number, sky: SkyState, elapsed: number): void {
    const parallax = 0.09;
    const spacing = 1100;
    const scroll = cam.x * parallax;
    const first = Math.floor((scroll - 300) / spacing);
    const last = Math.ceil((scroll + w + 300) / spacing);
    for (let i = first; i <= last; i++) {
      if (hash2(this.seed, i, 333) < 0.45) continue;
      const s = 0.6 + hash2(this.seed, i, 334) * 0.7;
      const cx = i * spacing - scroll + hash2(this.seed, i, 335) * 400;
      const cy = horizon * (0.28 + hash2(this.seed, i, 336) * 0.25) + Math.sin(elapsed * 0.5 + i) * 4;
      const rock = mix('#6d6aa8', sky.bottom, 0.45);
      const grass = mix('#69c97a', sky.bottom, 0.35);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(s, s);
      // Base rochosa invertida.
      ctx.fillStyle = rock;
      ctx.beginPath();
      ctx.moveTo(-70, 0);
      ctx.quadraticCurveTo(-40, 30, -10, 80);
      ctx.quadraticCurveTo(0, 95, 8, 78);
      ctx.quadraticCurveTo(40, 30, 72, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba('#ffffff', 0.12);
      ctx.beginPath();
      ctx.moveTo(-70, 0);
      ctx.quadraticCurveTo(-40, 30, -10, 80);
      ctx.lineTo(-20, 10);
      ctx.closePath();
      ctx.fill();
      // Topo gramado.
      ctx.fillStyle = grass;
      ctx.beginPath();
      ctx.ellipse(0, 0, 74, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      // Arvorezinha e cascata.
      ctx.fillStyle = mix('#ff9fc8', sky.bottom, 0.35);
      ctx.beginPath(); ctx.arc(-25, -18, 14, 0, Math.PI * 2); ctx.arc(-12, -22, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rock;
      ctx.fillRect(-20, -10, 3, 10);
      ctx.fillStyle = rgba('#d8f3ff', 0.55);
      ctx.fillRect(30, 2, 4, 70 + Math.sin(elapsed * 2 + i) * 2);
      ctx.restore();
    }
  }

  private drawHills(ctx: CanvasRenderingContext2D, cam: Camera, w: number, h: number, horizon: number, sky: SkyState): void {
    const off = cam.x * 0.3;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let sx = -8; sx <= w + 8; sx += 6) {
      const y = horizon + 10 - (0.5 + this.noise.fbm1((sx + off) / 300 + 77, 3)) * 70;
      ctx.lineTo(sx, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, horizon - 80, 0, h);
    g.addColorStop(0, mix('#4f9a7a', sky.bottom, 0.35));
    g.addColorStop(0.4, mix('#2f5f66', sky.top, 0.3));
    g.addColorStop(1, '#1a1838');
    ctx.fillStyle = g;
    ctx.fill();
  }
}
