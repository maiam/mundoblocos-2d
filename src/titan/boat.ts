import { isLiquidCell, LAKE_LAST_Y, LAKE_SURFACE_Y, T, Y_MAX, Y_MIN } from './voxel';
import type { TitanVolume } from './volume';

/**
 * Botes do Orvalis (ADR 0137, Minecraft Wiki "Boat"): entidade que flutua na superfície da água e carrega o jogador. Puro e determinístico, sem DOM. Cada bote é uma madeira (`BOAT_KINDS`), tem posição e giro e **só anda sobre
 * água**; o estado de execução de quem está a bordo (`session.boatRide`) não vai ao save. O modelo 3D (casco, bancos e remos) tem a proa em −Z, o mesmo sentido do olhar com giro 0.
 */
export const BOAT_KINDS = ['carvalho', 'betula', 'cerejeira'] as const;
export const BOAT_NAMES = ['Bote de Carvalho', 'Bote de Bétula', 'Bote de Cerejeira'] as const;
/** Velocidade máxima na água (m/s, Wiki), de ré, aceleração, desaceleração sem comando (m/s²) e giro do leme (rad/s): os três últimos são adaptação. */
export const BOAT_MAX_SPEED = 8, BOAT_REVERSE_SPEED = 2.5, BOAT_ACCEL = 6, BOAT_DRAG = 5, BOAT_TURN_RATE = 1.8;
/** Meio comprimento e meia largura do casco (m, medidos no modelo do pacote), altura da borda e a cota do casco: flutua com 0,1 m abaixo da superfície. */
export const BOAT_HALF_LENGTH = 1.2, BOAT_HALF_WIDTH = 0.62, BOAT_HEIGHT = 0.5, BOAT_Y = LAKE_SURFACE_Y - 0.1;
/** O jogador sentado: pés um pouco acima do fundo do casco. */
export const BOAT_SEAT_Y = 0.25;
/** Alcance de mira e de embarque (m). */
export const BOAT_REACH = 4;

export interface Boat { id: string; kind: number; x: number; y: number; z: number; yaw: number }
export interface BoatData { k: number; x: number; y: number; z: number; r: number }
/** Controle de quem pilota: `forward` −1 (ré) a 1, `turn` −1 (direita) a 1 (esquerda). */
export interface BoatInput { forward: number; turn: number }

/** Sentido da proa (x, z) para o giro `yaw` — o mesmo do olhar. */
export const boatHeading = (yaw: number): [number, number] => [-Math.sin(yaw), -Math.cos(yaw)];

/** A coluna `(x, z)` é água na superfície (a célula de cima é ar livre, sem planta aquática nem bloco)? */
export const boatWater = (vol: TitanVolume, x: number, z: number): boolean => {
  const cx = Math.floor(x), cz = Math.floor(z);
  return isLiquidCell(vol.get(cx, LAKE_LAST_Y, cz)) && vol.get(cx, LAKE_SURFACE_Y, cz) === T.AIR;
};

/** O casco cabe em `(x, z)` com giro `yaw`? Testa o centro, a proa, a popa e os dois bordos: todos precisam ser água. */
export function boatFits(vol: TitanVolume, x: number, z: number, yaw: number): boolean {
  const [hx, hz] = boatHeading(yaw), sx = -hz, sz = hx; // sx, sz: bordo direito
  const L = BOAT_HALF_LENGTH * 0.95, W = BOAT_HALF_WIDTH * 0.9;
  return [[0, 0], [L, 0], [-L, 0], [0, W], [0, -W]].every(([f, s]) => boatWater(vol, x + hx * f + sx * s, z + hz * f + sz * s));
}

/** Avança o bote em `dt` s com o comando de quem pilota; `speed` é a velocidade ao longo da proa (devolvida atualizada). Para na margem. */
export function stepBoat(vol: TitanVolume, b: Boat, speed: number, input: BoatInput, dt: number): number {
  const t = Math.min(Math.max(dt, 0), 0.1);
  const yaw = b.yaw + Math.max(-1, Math.min(1, input.turn)) * BOAT_TURN_RATE * t;
  if (boatFits(vol, b.x, b.z, yaw)) b.yaw = yaw;
  const want = input.forward > 0 ? BOAT_MAX_SPEED * Math.min(1, input.forward) : input.forward < 0 ? -BOAT_REVERSE_SPEED * Math.min(1, -input.forward) : 0;
  const rate = want === 0 || Math.sign(want) !== Math.sign(speed) ? BOAT_DRAG : BOAT_ACCEL;
  speed = speed < want ? Math.min(want, speed + rate * t) : Math.max(want, speed - rate * t);
  const [hx, hz] = boatHeading(b.yaw), nx = b.x + hx * speed * t, nz = b.z + hz * speed * t;
  if (boatFits(vol, nx, nz, b.yaw)) { b.x = nx; b.z = nz; return speed; }
  return 0; // encostou na margem
}

/** Posição do assento do piloto (pés). */
export const boatSeat = (b: Boat): { x: number; y: number; z: number } => ({ x: b.x, y: b.y + BOAT_SEAT_Y, z: b.z });

/** Caixa de mira (alinhada aos eixos) que envolve o casco girado. */
export function boatBox(b: Boat): { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number } {
  const s = Math.abs(Math.sin(b.yaw)), c = Math.abs(Math.cos(b.yaw));
  const hx = s * BOAT_HALF_LENGTH + c * BOAT_HALF_WIDTH, hz = c * BOAT_HALF_LENGTH + s * BOAT_HALF_WIDTH;
  return { x0: b.x - hx, y0: b.y, z0: b.z - hz, x1: b.x + hx, y1: b.y + BOAT_HEIGHT, z1: b.z + hz };
}

/** Bote na mira: o mais perto cuja caixa o raio atravessa (ordem do vetor), mais perto que o bloco apontado (`blockDist`). */
export function boatAim(list: readonly Boat[], ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, reach: number, blockDist = Infinity): { index: number; dist: number } | null {
  let best: { index: number; dist: number } | null = null;
  list.forEach((boat, index) => {
    const bx = boatBox(boat);
    let t0 = 0, t1 = Infinity;
    for (const [o, d, lo, hi] of [[ox, dx, bx.x0, bx.x1], [oy, dy, bx.y0, bx.y1], [oz, dz, bx.z0, bx.z1]] as const) {
      if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) return; continue; }
      let a = (lo - o) / d, c = (hi - o) / d;
      if (a > c) [a, c] = [c, a];
      t0 = Math.max(t0, a); t1 = Math.min(t1, c);
      if (t0 > t1) return;
    }
    if (t0 > reach || t0 >= blockDist) return;
    if (!best || t0 < best.dist) best = { index, dist: t0 };
  });
  return best;
}

/** Id novo, único na lista. */
export const newBoatId = (list: readonly Boat[]): string => { let n = 0; for (const b of list) { const k = Number(b.id.slice(5)); if (Number.isInteger(k) && k >= n) n = k + 1; } return `boat:${n}`; };

export const boatsToData = (list: readonly Boat[]): BoatData[] => list.map((b) => ({ k: b.kind, x: +b.x.toFixed(3), y: +b.y.toFixed(3), z: +b.z.toFixed(3), r: +b.yaw.toFixed(4) }));

/** Lê os botes do save, descartando entradas inválidas (madeira, posição ou giro fora do formato). */
export function boatsFromData(raw: unknown): Boat[] {
  if (!Array.isArray(raw)) return [];
  const out: Boat[] = [];
  for (const e of raw.slice(0, 64)) {
    if (!e || typeof e !== 'object') continue;
    const o = e as Record<string, unknown>;
    const k = o.k, x = o.x, y = o.y, z = o.z, r = o.r;
    if (!Number.isInteger(k) || (k as number) < 0 || (k as number) >= BOAT_KINDS.length) continue;
    if (![x, y, z, r].every((v) => typeof v === 'number' && Number.isFinite(v)) || (y as number) < Y_MIN || (y as number) > Y_MAX) continue;
    out.push({ id: `boat:${out.length}`, kind: k as number, x: x as number, y: y as number, z: z as number, yaw: r as number });
  }
  return out;
}
