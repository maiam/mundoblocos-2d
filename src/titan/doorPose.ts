import { DOOR_THICK } from './voxel';

/**
 * Pose visual da Porta de Junco (ADR 0102). Puro (sem DOM nem THREE): o renderer só monta a matriz.
 * Referencial da célula, giro 0, origem no centro da célula: a folha fechada tem o centro em `z = 0,5 − espessura/2` (rente à borda da frente, +Z) e gira em torno do eixo vertical
 * da dobradiça, no centro da quina (`|x| = 0,5 − espessura/2`, 0,40625 m com 3/16 m). Aberta (90°), a folha fica rente à borda da dobradiça, ocupando a profundidade da célula (a mesma caixa de `blockBoxes`).
 */
export const DOOR_PIVOT = 0.5 - DOOR_THICK / 2;

/** Centro da folha fechada: `(0, DOOR_PIVOT)` (x, z). */
export const DOOR_CLOSED_CENTER: readonly [number, number] = [0, DOOR_PIVOT];

/** Eixo da dobradiça `(x, z)`: à direita de quem olha a frente (`+x` no giro 0) ou à esquerda. */
export const doorPivot = (hingeRight: boolean): readonly [number, number] => [hingeRight ? DOOR_PIVOT : -DOOR_PIVOT, DOOR_PIVOT];

/** Giro em torno do eixo Y (rad) para a abertura `amount` (0 = fechada, 1 = aberta): a folha entra na célula, para o lado de trás (−Z). */
export const doorAngle = (hingeRight: boolean, amount: number): number => (hingeRight ? -1 : 1) * (Math.PI / 2) * amount || 0; // `|| 0`: sem −0

/** Anima a abertura visual rumo ao alvo (suave, ~0,2 s); chega exato quando falta pouco. */
export function stepDoor(amount: number, open: boolean, dt: number): number {
  const target = open ? 1 : 0, next = amount + (target - amount) * Math.min(1, dt * 14);
  return Math.abs(target - next) < 0.002 ? target : next;
}

/** A folha ainda está se movendo? */
export const doorMoving = (amount: number, open: boolean): boolean => amount !== (open ? 1 : 0);
