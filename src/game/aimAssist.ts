import type { Facing } from './walker';

/**
 * Mira assistida do golpe (v0.93.69): ao golpear pelo botão de ação/teclado, o personagem vira para o monstro mais perto à frente em
 * vez de bater no vazio quando a direção está um pouco torta. Pura (testável). O golpe pelo mouse não usa: ali o cursor manda.
 */
const VEC: Record<Facing, [number, number]> = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };

/** Distância (células) até a qual a mira assistida procura. */
export function aimRange(swordReach: number): number {
  return swordReach * 1.5;
}

/** Cosseno mínimo entre a direção atual e o alvo (≥ 0 = até 90° para cada lado: nunca vira "para trás"). */
export const AIM_MIN_COS = 0;

/**
 * Para onde virar: o eixo dominante em direção ao alvo mais perto dentro do alcance e do cone, ou null se não há (mantém a direção).
 * `targets`: posições dos monstros vivos.
 */
export function aimFacing(
  from: { x: number; y: number },
  facing: Facing,
  targets: ReadonlyArray<{ x: number; y: number }>,
  range: number,
): Facing | null {
  const [fx, fy] = VEC[facing];
  let best: { x: number; y: number } | null = null;
  let bestD = Infinity;
  for (const t of targets) {
    const dx = t.x - from.x, dy = t.y - from.y;
    const d = Math.hypot(dx, dy);
    if (d < 1e-6 || d > range) continue;
    if ((dx * fx + dy * fy) / d < AIM_MIN_COS) continue;
    if (d < bestD) { best = t; bestD = d; }
  }
  if (!best) return null;
  const dx = best.x - from.x, dy = best.y - from.y;
  return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
}
