import { lookVector } from './physics';

/** Campo de visão vertical da câmera do Titã (graus); o renderer usa o mesmo valor. */
export const FOV_DEG = 75;
/** Quanto a corrida abre o campo de visão (graus; ADR 0076). */
export const SPRINT_FOV_DEG = 6;

/**
 * Raio do olhar que passa pelo ponto da tela `(ndcX, ndcY)` (−1 a 1; +X à direita, +Y para cima; `aspect` = largura/altura): no toque, a ação acontece onde o dedo está (ADR 0075), como no Minecraft de toque.
 * `fovDeg` é o campo de visão atual (a corrida o abre um pouco). `(0, 0)` é o centro da tela e devolve exatamente `lookVector`. Puro.
 */
export function rayThrough(yaw: number, pitch: number, ndcX: number, ndcY: number, aspect: number, fovDeg: number = FOV_DEG): [number, number, number] {
  const [fx, fy, fz] = lookVector(yaw, pitch);
  const ty = Math.tan((fovDeg * Math.PI) / 360), tx = ty * aspect;
  const rx = Math.cos(yaw), rz = -Math.sin(yaw); // direita (horizontal)
  const ux = Math.sin(yaw) * Math.sin(pitch), uy = Math.cos(pitch), uz = Math.cos(yaw) * Math.sin(pitch); // cima, perpendicular ao olhar
  const dx = fx + rx * ndcX * tx + ux * ndcY * ty, dy = fy + uy * ndcY * ty, dz = fz + rz * ndcX * tx + uz * ndcY * ty;
  const m = Math.hypot(dx, dy, dz);
  return [dx / m, dy / m, dz / m];
}
