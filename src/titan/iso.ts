/**
 * Vista isométrica 2:1 do Titã (ADR 0106). Puro, sem DOM: o renderer e o jogo usam **a mesma** câmera, para o raio do mouse ou do dedo cair exatamente no bloco que se vê.
 *
 * Projeção ortográfica a **30° de elevação** (`ISO_PITCH`), com o giro em passos de 90° a partir de 45°: nesses ângulos o topo de um bloco é um losango **2:1** exato. A escala é de
 * `ISO_PX_PER_BLOCK` = 16/√2 px de tela por bloco, então o losango do topo mede **16 × 8 px** e cada aresta tem ~8 px (a textura de 8 × 8, 1 texel por pixel); a aresta vertical mede ~9,8 px.
 * A câmera se prende à grade de pixels da tela (`snap`) para a textura não tremer quando o jogador anda.
 */
export const ISO_PITCH = Math.PI / 6;
export const ISO_PX_PER_BLOCK = 16 / Math.SQRT2;
/** Distância da câmera ao alvo (blocos): longe o bastante para ficar acima do relevo; a vista é ortográfica, então não muda o tamanho dos blocos. */
export const ISO_DISTANCE = 220;
/** Quanto do raio, a partir da câmera, fica **antes** do jogador: o raio do mouse começa um pouco à frente do plano dele (não da câmera, a 220 blocos). */
export const ISO_RAY_LEAD = 40;
export const ISO_BASE_YAW = Math.PI / 4;

/** Giro (rad) da vista `quarter` (0, 1, 2, 3, … — qualquer inteiro): 45°, 135°, 225°, 315°. */
export const isoYawOf = (quarter: number): number => ISO_BASE_YAW + quarter * (Math.PI / 2);
/** A vista de 90° mais próxima de um giro qualquer. */
export const isoQuarterOf = (yaw: number): number => Math.round((yaw - ISO_BASE_YAW) / (Math.PI / 2)) + 0; // + 0: nunca −0
/** Diferença de ângulo mais curta de `from` até `to` (−π…π). */
export function angleDelta(from: number, to: number): number {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2; else if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
/** Um passo da transição do giro: aproxima `yaw` de `goal` (suave, ~0,2 s) e encaixa quando falta quase nada. */
export function stepIsoYaw(yaw: number, goal: number, dt: number): number {
  const d = angleDelta(yaw, goal);
  return Math.abs(d) < 0.002 ? goal : yaw + d * Math.min(1, dt * 14);
}

export type Vec3 = readonly [number, number, number];
export interface IsoCamera {
  /** Posição da câmera, já presa à grade de pixels. */
  pos: Vec3;
  /** Direção do olhar (unitária, para baixo). */
  dir: Vec3;
  /** Direita e cima da tela (unitários). */
  right: Vec3;
  up: Vec3;
  /** Meia largura e meia altura do volume visível, em blocos. */
  halfW: number;
  halfH: number;
}
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** A câmera olhando para `target` (centro do jogador) com o giro `yaw`, para uma tela de `bufW × bufH` px (1 px de tela = 1 px do buffer). */
export function isoCamera(target: Vec3, yaw: number, bufW: number, bufH: number, snap = true): IsoCamera {
  const s = Math.sin(yaw), c = Math.cos(yaw), cp = Math.cos(ISO_PITCH), sp = Math.sin(ISO_PITCH);
  const f: Vec3 = [-s, 0, -c]; // frente horizontal (yaw 0 = −Z, como no resto do Titã)
  const dir: Vec3 = [f[0] * cp, -sp, f[2] * cp];
  const right: Vec3 = [c, 0, -s];
  const up: Vec3 = [f[0] * sp, cp, f[2] * sp];
  let tx = target[0], ty = target[1], tz = target[2];
  if (snap) { // prende o ponto de visada à grade de pixels da tela (1 px = 1 / ISO_PX_PER_BLOCK bloco, sobre os eixos direita e cima)
    const a = dot(target, right), b = dot(target, up), k = ISO_PX_PER_BLOCK;
    const da = Math.round(a * k) / k - a, db = Math.round(b * k) / k - b;
    tx += right[0] * da + up[0] * db; ty += right[1] * da + up[1] * db; tz += right[2] * da + up[2] * db;
  }
  return { pos: [tx - dir[0] * ISO_DISTANCE, ty - dir[1] * ISO_DISTANCE, tz - dir[2] * ISO_DISTANCE], dir, right, up, halfW: bufW / 2 / ISO_PX_PER_BLOCK, halfH: bufH / 2 / ISO_PX_PER_BLOCK };
}

/** Raio do ponto da tela `(ndcX, ndcY)` (−1…1; +Y para cima): origem a `ISO_RAY_LEAD` blocos do plano do jogador e a direção do olhar (ortográfica: todos os raios são paralelos). */
export function isoRay(cam: IsoCamera, ndcX: number, ndcY: number): { origin: Vec3; dir: Vec3 } {
  const lead = ISO_DISTANCE - ISO_RAY_LEAD;
  const ox = cam.pos[0] + cam.right[0] * ndcX * cam.halfW + cam.up[0] * ndcY * cam.halfH + cam.dir[0] * lead;
  const oy = cam.pos[1] + cam.right[1] * ndcX * cam.halfW + cam.up[1] * ndcY * cam.halfH + cam.dir[1] * lead;
  const oz = cam.pos[2] + cam.right[2] * ndcX * cam.halfW + cam.up[2] * ndcY * cam.halfH + cam.dir[2] * lead;
  return { origin: [ox, oy, oz], dir: cam.dir };
}
/** Alcance máximo do raio a partir da origem de `isoRay` (cobre o que está atrás do jogador). */
export const ISO_RAY_MAX = ISO_RAY_LEAD * 2 + 20;
/** Alcance do jogador na isométrica: o bloco alvo precisa estar a até isto dos olhos (como o raio de 6 blocos da primeira pessoa). */
export const ISO_REACH = 6;
