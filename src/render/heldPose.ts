/**
 * Pose da mão em primeira pessoa (ADR 0071): funções puras, em espaço de câmera (−Z à frente, +Y acima, +X à direita), sem THREE nem DOM.
 * Repouso: o item pende à direita e embaixo com a ponta para frente e para cima; o golpe levanta, desce cortando e volta (`SWING_S`).
 */
export const SWING_S = 0.34;

export interface HandPose { x: number; y: number; z: number; rx: number; ry: number; rz: number }

/** Posição e giro de repouso da adaga (a ponta do modelo é +Y). */
export const REST: HandPose = { x: 0.24, y: -0.17, z: -0.5, rx: -0.8, ry: 0.0, rz: 0.3 };

/** Curva do golpe: 0 → recuo (−0,45) → corte (+1) → volta a 0. `t` de 0 a 1. */
export function swingCurve(t: number): number {
  if (t <= 0 || t >= 1) return 0;
  if (t < 0.25) return -0.45 * (t / 0.25);
  if (t < 0.55) { const u = (t - 0.25) / 0.3; return -0.45 + 1.45 * (u * u * (3 - 2 * u)); }
  const u = (t - 0.55) / 0.45; return 1 - u * u * (3 - 2 * u);
}

/** Pose no instante: `swingT` em segundos desde o início do golpe (≥ `SWING_S` ou negativo = parado), `time` em segundos para o balanço leve. */
export function handPose(swingT: number, time: number): HandPose {
  const a = swingT >= 0 && swingT < SWING_S ? swingCurve(swingT / SWING_S) : 0, fwd = Math.max(0, a);
  const bob = Math.sin(time * 1.6) * 0.004;
  return {
    x: REST.x - fwd * 0.1, y: REST.y + bob - fwd * 0.07, z: REST.z - fwd * 0.16,
    rx: REST.rx + a * 0.95, ry: REST.ry - fwd * 0.25, rz: REST.rz - fwd * 0.2,
  };
}
