import { CUBE_FRONT, TILE } from '../config';

/**
 * Vista OBLÍQUA do Santuário (experimento da ADR 0026): a câmera olha reto para baixo (chão em quadrados perfeitos) e a
 * altura vira um deslocamento fixo na tela — cada nível sobe `OBLIQUE_K` de célula, a mesma proporção da arte 3/4 do
 * jogo (frente de CUBE_FRONT px numa célula de TILE px). Tudo que é vertical (personagem, parede) mantém a proporção
 * da arte, em vez de ser achatado por cos(elevação) como numa câmera inclinada.
 *
 * Funções puras (sem DOM nem Three): a matriz é montada à mão e o renderer só a entrega à câmera.
 *
 * Eixos do mundo: X leste, Z sul (para baixo na tela), Y altura. No espaço da câmera (olhando para -Y, topo da tela = norte):
 *   vx = x - fx;  vy = fz - z;  vz = y - H   (H = altura da câmera).
 */
export const OBLIQUE_K = CUBE_FRONT / TILE;
/** Peso da altura na profundidade: o que está mais ao sul (ou mais alto) fica na frente. Pequeno: só desempata. */
export const OBLIQUE_DEPTH_EPS = 0.05;
export const OBLIQUE_CAMERA_HEIGHT = 37;
/** Alcance vertical (células) coberto pela profundidade; fora dele o Three recorta. */
const DEPTH_RANGE = 15;

/**
 * Matriz de projeção (16 números, ordem de linhas — `Matrix4.set`) da vista oblíqua.
 * - x_clip = vx / halfW
 * - y_clip = (vy + k·y) / halfH   (y = altura sobre o chão; o chão y = 0 cai exatamente como numa vista reta)
 * - z_clip cresce para o norte e para baixo: sul/alto → menor z → mais perto (teste de profundidade `LESS`).
 */
export function obliqueProjection(halfW: number, halfH: number, k = OBLIQUE_K, eps = OBLIQUE_DEPTH_EPS, height = OBLIQUE_CAMERA_HEIGHT): number[] {
  const sx = 1 / halfW;
  const sy = 1 / halfH;
  const sd = 1 / (halfH + DEPTH_RANGE);
  return [
    sx, 0, 0, 0,
    0, sy, sy * k, sy * k * height,
    0, sd, -sd * eps, -sd * eps * (height - 1.5),
    0, 0, 0, 1,
  ];
}

/** Espaço da câmera de um ponto do mundo, com a câmera em (fx, H, fz) olhando para baixo. */
export function obliqueViewSpace(p: { x: number; y: number; z: number }, focus: { x: number; z: number }, height = OBLIQUE_CAMERA_HEIGHT): [number, number, number] {
  return [p.x - focus.x, focus.z - p.z, p.y - height];
}

/** Aplica a matriz de `obliqueProjection` a um ponto do mundo (só para testes e depuração). */
export function obliqueClip(m: number[], p: { x: number; y: number; z: number }, focus: { x: number; z: number }, height = OBLIQUE_CAMERA_HEIGHT): [number, number, number] {
  const [vx, vy, vz] = obliqueViewSpace(p, focus, height);
  return [
    m[0] * vx + m[1] * vy + m[2] * vz + m[3],
    m[4] * vx + m[5] * vy + m[6] * vz + m[7],
    m[8] * vx + m[9] * vy + m[10] * vz + m[11],
  ];
}

/**
 * Raio do cursor: o ponto (nx, ny) da tela (-1..1, ny para cima) é uma reta no mundo que sobe 1 de altura a cada
 * `k` de célula para o sul. Devolve origem alta e direção para baixo (normalizada), para o `Raycaster`.
 */
export function obliqueRay(nx: number, ny: number, halfW: number, halfH: number, focus: { x: number; z: number }, k = OBLIQUE_K, top = 12): { origin: [number, number, number]; dir: [number, number, number] } {
  const x = focus.x + nx * halfW;
  const groundZ = focus.z - ny * halfH; // onde a reta cruza o chão (y = 0)
  const origin: [number, number, number] = [x, top, groundZ + k * top];
  const len = Math.hypot(1, k);
  return { origin, dir: [0, -1 / len, -k / len] };
}
