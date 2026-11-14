import { SUBDIV } from '../config';
import { Block, type BlockId } from '../world/blocks';
import { flickerFactor, lightFalloff } from './lighting';

/**
 * Fogueira viva (v0.93.67): quais fogueiras há na área visível e a luz que cada uma joga nos atores. Funções PURAS (sem DOM nem Three);
 * o desenho (chama que balança, brilho no chão, brasas) é de `three/fireFx.ts` e `three/chunkSprites.ts`.
 */

export interface FireSource {
  /** Posição no mundo (células): x leste, z sul; a chama fica na face sul da célula. */
  x: number;
  z: number;
  /** Altura do miolo da chama (células de mundo). */
  height: number;
  /** Alcance da luz em células da grade atual (5,5 da grade 1 = os mesmos pixels em qualquer grade). */
  radius: number;
  /** Para a oscilação (determinística pela posição). */
  seed: number;
}

export const FIRE_RADIUS = 5.5 * SUBDIV;
export const FIRE_FLICKER = 0.12;
export const FIRE_COLOR: [number, number, number] = [1, 0.62, 0.28];
/** No máximo estas fogueiras (as mais perto do foco) recebem efeitos por quadro. */
export const MAX_FIRES = 8;

/** Fogueiras na área `[x0, x1] × [y0, y1]` (células), as `max` mais perto de (fx, fz). */
export function findFires(
  view: { x0: number; y0: number; x1: number; y1: number },
  objectAt: (x: number, y: number) => BlockId,
  focus: { x: number; z: number },
  max = MAX_FIRES,
): FireSource[] {
  const out: FireSource[] = [];
  for (let y = Math.floor(view.y0); y <= Math.ceil(view.y1); y++) {
    for (let x = Math.floor(view.x0); x <= Math.ceil(view.x1); x++) {
      if (objectAt(x, y) !== Block.CAMPFIRE) continue;
      out.push({ x: x + 0.5, z: y + 1, height: 0.9, radius: FIRE_RADIUS, seed: x * 7 + y * 13 });
    }
  }
  out.sort((a, b) => Math.hypot(a.x - focus.x, a.z - focus.z) - Math.hypot(b.x - focus.x, b.z - focus.z));
  return out.slice(0, max);
}

/** A luz que as fogueiras jogam num ator em (ax, az): direção para a luz (x leste, y para cima, z para a câmera/sul) e força 0..1. */
export interface FireOnActor {
  dir: [number, number, number];
  intensity: number;
}

export function fireLightOn(ax: number, az: number, fires: readonly FireSource[], elapsed: number): FireOnActor {
  let sx = 0, sy = 0, sz = 0, total = 0;
  for (const f of fires) {
    const dx = f.x - ax, dz = f.z - az;
    const d = Math.hypot(dx, dz);
    const w = lightFalloff(d, f.radius) * flickerFactor(FIRE_FLICKER, elapsed, f.seed);
    if (w <= 0) continue;
    // Da altura do peito (0,6) ao miolo da chama; a coordenada z do mundo (sul) é "para a câmera".
    const vx = dx, vy = f.height - 0.6, vz = dz;
    const l = Math.hypot(vx, vy, vz) || 1;
    sx += (vx / l) * w; sy += (vy / l) * w; sz += (vz / l) * w;
    total += w;
  }
  if (total <= 0) return { dir: [0, 1, 0], intensity: 0 };
  const m = Math.hypot(sx, sy, sz) || 1;
  return { dir: [sx / m, sy / m, sz / m], intensity: Math.min(1, total) };
}
