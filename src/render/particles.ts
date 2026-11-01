import type { Biome } from '../world/biomes';

/** Partículas ambientes em espaço de tela, temáticas por bioma. */

type Kind = 'petal' | 'firefly' | 'snow' | 'dust' | 'pollen';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  phase: number;
  size: number;
  kind: Kind;
}

const KIND_BY_BIOME: Record<Biome['key'], Kind> = {
  sakura: 'petal',
  enchanted: 'firefly',
  tundra: 'snow',
  desert: 'dust',
  meadow: 'pollen',
};

export class Particles {
  private list: Particle[] = [];

  update(dt: number, w: number, h: number, biome: Biome, night: number): void {
    let kind = KIND_BY_BIOME[biome.key];
    if (kind === 'pollen' && night > 0.4) kind = 'firefly';
    const target = kind === 'snow' ? 90 : kind === 'firefly' ? 40 : 55;
    while (this.list.length < target) this.list.push(spawn(kind, w, h, this.list.length < target / 2));
    for (const p of this.list) {
      // Partículas de outro bioma desaparecem suavemente.
      if (p.kind !== kind && p.life > 1.5) p.life = 1.5;
      p.phase += dt;
      p.life -= dt;
      const sway = Math.sin(p.phase * 1.7) * (p.kind === 'petal' ? 30 : 10);
      p.x += (p.vx + sway) * dt;
      p.y += p.vy * dt;
      if (p.kind === 'firefly') {
        p.x += Math.cos(p.phase * 0.9) * 12 * dt;
        p.y += Math.sin(p.phase * 1.3) * 12 * dt;
      }
    }
    this.list = this.list.filter(
      (p) => p.life > 0 && p.y < h + 20 && p.y > -40 && p.x > -40 && p.x < w + 40,
    );
    if (this.list.length > target) this.list.length = target;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.list) {
      const fade = Math.min(1, p.life / 1.5, p.phase / 1);
      ctx.save();
      ctx.translate(p.x, p.y);
      switch (p.kind) {
        case 'petal':
          ctx.rotate(p.phase * 2);
          ctx.fillStyle = `rgba(255, 170, 205, ${0.9 * fade})`;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 1.6, p.size, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgba(255, 240, 248, ${0.8 * fade})`;
          ctx.beginPath();
          ctx.ellipse(-p.size * 0.4, -p.size * 0.2, p.size * 0.6, p.size * 0.35, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'firefly': {
          const a = fade * (0.5 + 0.5 * Math.sin(p.phase * 4));
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 5);
          g.addColorStop(0, `rgba(220, 255, 200, ${a})`);
          g.addColorStop(0.3, `rgba(140, 255, 220, ${a * 0.5})`);
          g.addColorStop(1, 'rgba(140, 255, 220, 0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 5, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'snow':
          ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * fade})`;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'dust':
          ctx.fillStyle = `rgba(255, 225, 160, ${0.5 * fade})`;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          break;
        case 'pollen':
          ctx.fillStyle = `rgba(255, 250, 200, ${0.6 * fade})`;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.8, 0, Math.PI * 2);
          ctx.fill();
          break;
      }
      ctx.restore();
    }
  }
}

function spawn(kind: Kind, w: number, h: number, anywhere: boolean): Particle {
  const r = Math.random;
  const base: Particle = {
    x: r() * w, y: anywhere ? r() * h : -20, vx: 0, vy: 0,
    life: 8 + r() * 10, phase: 0, size: 2 + r() * 2, kind,
  };
  switch (kind) {
    case 'petal': base.vx = 20 + r() * 30; base.vy = 25 + r() * 25; break;
    case 'snow': base.vx = -10 + r() * 20; base.vy = 30 + r() * 40; base.size = 1 + r() * 2.5; break;
    case 'dust': base.vx = 60 + r() * 60; base.vy = -5 + r() * 15; base.size = 1.5 + r() * 1.5; break;
    case 'pollen': base.vx = 10 + r() * 10; base.vy = -4 + r() * 10; break;
    case 'firefly': base.y = r() * h; base.size = 1.5 + r(); break;
  }
  return base;
}
