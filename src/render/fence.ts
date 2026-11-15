import { TILE } from '../config';
import { Block, isFence, type BlockId } from '../world/blocks';

/**
 * Cerca de tábuas que se emenda sozinha (aparência; a regra de bloquear/abrir fica no `World`).
 *
 * Cada célula de cerca olha os 4 vizinhos (cerca ou portão contam) e monta o desenho com 3 peças da tira
 * `fence.webp` (`scripts/extract-fence.py`), todas com a mesma âncora no centro da célula:
 * - trecho reto (leste+oeste ou norte+sul, nada mais): a peça inteira, com o poste do meio;
 * - qualquer outro caso (canto, "T", cruz, ponta, cerca solta): só as metades que apontam para vizinhos
 *   + o poste grande por cima (os postes sempre cobrem as travessas, como na referência).
 * Portão: desenho próprio com os dois postes nas bordas da célula, onde chegam as travessas das vizinhas.
 */

/**
 * Quadro de cada peça na tira (px da imagem) e a âncora = centro da base da estaca (no centro da célula). Cerca do modelo 3D (v0.93.96,
 * `scripts/extract-fence-model.py`): 128 px por célula (12 u do modelo = 1 célula); a estaca tem 4 u de largura e 17 de altura (~22 px no jogo).
 * Tira de 5 quadros: horizontal, vertical, estaca, braço norte, braço sul (os braços são só as travessas).
 */
export const FENCE_FRAME = { w: 128, h: 232, ax: 64, ay: 208 } as const;
/**
 * Porteira do modelo 3D (v0.93.96): 5 poses (0°, 22,5°, 45°, 67,5°, 90°) lado a lado, cada uma `w × h` (a folha gira para o norte em torno da
 * dobradiça); `postBase` = linha da base das estacas (a mesma âncora da cerca). Há uma tira por madeira; a porteira usa a da cerca vizinha.
 */
export const GATE_FRAME = { w: 224, h: 300, postBase: 278, poses: 5 } as const;

/** Madeira da porteira: a da primeira cerca vizinha (oeste, leste, norte, sul); sem cerca por perto, Carvalho. `at(dx, dy)` devolve o objeto da célula vizinha. */
export function gateWood(at: (dx: number, dy: number) => BlockId): BlockId {
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
    const id = at(dx, dy);
    if (isFence(id)) return id;
  }
  return Block.FENCE;
}

export const enum FencePiece { Horizontal = 0, Vertical = 1, Post = 2, ArmNorth = 3, ArmSouth = 4 }

/** O que desenhar numa célula de cerca, dados os vizinhos que se emendam. */
export interface FenceParts {
  /** Peça inteira (trecho reto) ou null. */
  whole: FencePiece | null;
  north: boolean;
  south: boolean;
  west: boolean;
  east: boolean;
  /** Poste grande por cima. */
  post: boolean;
}

export function fenceParts(n: boolean, e: boolean, s: boolean, w: boolean): FenceParts {
  if (e && w && !n && !s) return { whole: FencePiece.Horizontal, north: false, south: false, west: false, east: false, post: false };
  if (n && s && !e && !w) return { whole: FencePiece.Vertical, north: false, south: false, west: false, east: false, post: false };
  return { whole: null, north: n, south: s, west: w, east: e, post: true };
}

/** Escala px da tira → px de mundo. */
export const FENCE_SCALE = TILE / FENCE_FRAME.w;
/** Canto superior esquerdo do quadro em relação ao canto da célula (px de mundo). */
export const FENCE_OFFSET = {
  x: TILE / 2 - FENCE_FRAME.ax * FENCE_SCALE,
  y: TILE / 2 - FENCE_FRAME.ay * FENCE_SCALE,
} as const;

function blob(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, alpha: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, `rgba(0,0,0,${alpha})`);
  g.addColorStop(0.55, `rgba(0,0,0,${alpha * 0.7})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Sombra de contato da cerca no chão (v0.93.96; sem ela a cerca parece flutuar): uma mancha suave sob a estaca e outra sob cada braço que se emenda.
 * Desenhada por código (não vai na arte: o 3D usa `alphaTest` nos sprites e pontos translúcidos virariam pretos) com `ax, ay` = pé da estaca no
 * canvas e `z` = escala (px do canvas por px do quadro de 128 px por célula).
 */
export function drawFenceShadow(ctx: CanvasRenderingContext2D, ax: number, ay: number, z: number, n: boolean, e: boolean, s: boolean, w: boolean): void {
  blob(ctx, ax + 5 * z, ay + 3 * z, 38 * z, 26 * z, 0.5);
  if (w) blob(ctx, ax - 40 * z, ay + 3 * z, 36 * z, 17 * z, 0.36);
  if (e) blob(ctx, ax + 46 * z, ay + 3 * z, 36 * z, 17 * z, 0.36);
  if (n) blob(ctx, ax + 5 * z, ay - 40 * z, 20 * z, 36 * z, 0.36);
  if (s) blob(ctx, ax + 5 * z, ay + 46 * z, 20 * z, 36 * z, 0.36);
}
