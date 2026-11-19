import { lanternBox, rayBox, type Box } from './lantern';
import type { TitanVolume } from './volume';
import { isOccupied, isTarget, T, Y_MAX, Y_MIN } from './voxel';

/** Corpo do jogador: caixa de 0,6 × 1,8 × 0,6 m, olhos a 1,62 m dos pés. Pés em y (base do corpo). */
export const BODY_HALF = 0.3;
export const BODY_HEIGHT = 1.8;
export const EYE_HEIGHT = 1.62;
const GRAVITY = 28;
/** Salta 1 bloco (e um pouco mais): v = √(2 g h) com h = 1,25 m. */
const JUMP_SPEED = Math.sqrt(2 * GRAVITY * 1.25);
const WALK_SPEED = 4.3;
const TERMINAL = 20;
const EPS = 1e-4;

export interface Body { x: number; y: number; z: number; vx: number; vy: number; vz: number; onGround: boolean; inLiquid: boolean }
export const newBody = (x: number, y: number, z: number): Body => ({ x, y, z, vx: 0, vy: 0, vz: 0, onGround: false, inLiquid: false });

/** A caixa em (x, y, z) toca algum sólido? */
export function collides(v: TitanVolume, x: number, y: number, z: number): boolean {
  const x0 = Math.floor(x - BODY_HALF + EPS), x1 = Math.floor(x + BODY_HALF - EPS);
  const y0 = Math.floor(y + EPS), y1 = Math.floor(y + BODY_HEIGHT - EPS);
  const z0 = Math.floor(z - BODY_HALF + EPS), z1 = Math.floor(z + BODY_HALF - EPS);
  for (let yy = y0; yy <= y1; yy++) for (let zz = z0; zz <= z1; zz++) for (let xx = x0; xx <= x1; xx++) {
    const h = v.bodyHeight(xx, yy, zz);
    if (h >= 1 || (h > 0 && y < yy + h - EPS)) return true; // laje (meia altura): só colide se os pés estão abaixo do topo dela
  }
  return false;
}

/** Degrau automático de meia altura (a laje): o corpo sobe a laje andando, sem pular; contra cubo inteiro (1 m) continua barrado. */
const STEP = 0.5;

/** Altura do apoio ao cair: o topo mais alto sob os pés entre a posição nova (`ny`) e a anterior (`oldY`). Cai no chão inteiro ou na laje. */
function landingY(v: TitanVolume, x: number, z: number, ny: number, oldY: number): number {
  const x0 = Math.floor(x - BODY_HALF + EPS), x1 = Math.floor(x + BODY_HALF - EPS);
  const z0 = Math.floor(z - BODY_HALF + EPS), z1 = Math.floor(z + BODY_HALF - EPS);
  let best = -Infinity;
  for (let yy = Math.floor(ny + EPS); yy <= Math.floor(oldY + EPS); yy++) for (let zz = z0; zz <= z1; zz++) for (let xx = x0; xx <= x1; xx++) {
    const h = v.bodyHeight(xx, yy, zz);
    if (h > 0 && yy + h > ny + EPS && yy + h <= oldY + 2 * EPS) best = Math.max(best, yy + h);
  }
  return best === -Infinity ? Math.floor(ny + EPS) + 1 : best;
}

export interface MoveInput {
  /** Direção de caminhada no mundo (já girada pelo olhar), módulo ≤ 1. */
  dirX: number; dirZ: number;
  jump: boolean;
}

/** Um passo de física (dt em s; passos grandes são divididos): gravidade, salto de 1 bloco, colisão por eixo, líquido que freia. */
export function stepBody(v: TitanVolume, b: Body, input: MoveInput, dt: number): void {
  let left = Math.min(dt, 0.25);
  while (left > 0) {
    const h = Math.min(left, 1 / 40);
    stepOnce(v, b, input, h);
    left -= h;
  }
}

function stepOnce(v: TitanVolume, b: Body, input: MoveInput, dt: number): void {
  const feetCell = v.get(Math.floor(b.x), Math.floor(b.y + 0.2), Math.floor(b.z));
  b.inLiquid = feetCell === T.LAKE;
  const speed = WALK_SPEED * (b.inLiquid ? 0.6 : 1);
  b.vx = input.dirX * speed;
  b.vz = input.dirZ * speed;
  if (b.inLiquid) {
    b.vy = Math.max(b.vy - GRAVITY * 0.25 * dt, -2.5);
    if (input.jump) b.vy = 3;
  } else {
    const grounded = b.onGround;
    b.vy = Math.max(b.vy - GRAVITY * dt, -TERMINAL);
    if (input.jump && grounded) b.vy = JUMP_SPEED;
  }
  moveAxis(v, b, 'x', b.vx * dt);
  moveAxis(v, b, 'z', b.vz * dt);
  b.onGround = false; // `moveAxis` volta a ligar quando a queda é barrada pelo chão
  moveAxis(v, b, 'y', b.vy * dt);
}

function moveAxis(v: TitanVolume, b: Body, axis: 'x' | 'y' | 'z', d: number): void {
  if (d === 0) return;
  const nx = axis === 'x' ? b.x + d : b.x, ny = axis === 'y' ? b.y + d : b.y, nz = axis === 'z' ? b.z + d : b.z;
  if (!collides(v, nx, ny, nz)) { b.x = nx; b.y = ny; b.z = nz; return; }
  // no chão, contra uma laje: sobe o degrau de meia altura e segue andando
  if (axis !== 'y' && b.onGround && !collides(v, nx, b.y + STEP, nz) && collides(v, nx, b.y + STEP / 2, nz)) { b.x = nx; b.y += STEP; b.z = nz; return; }
  // encosta na face do bloco que barrou
  if (axis === 'x') { b.x = d > 0 ? Math.floor(nx + BODY_HALF - EPS) - BODY_HALF - EPS : Math.floor(nx - BODY_HALF + EPS) + 1 + BODY_HALF + EPS; b.vx = 0; }
  else if (axis === 'z') { b.z = d > 0 ? Math.floor(nz + BODY_HALF - EPS) - BODY_HALF - EPS : Math.floor(nz - BODY_HALF + EPS) + 1 + BODY_HALF + EPS; b.vz = 0; }
  else if (d > 0) { b.y = Math.floor(ny + BODY_HEIGHT - EPS) - BODY_HEIGHT - EPS; b.vy = 0; }
  else { b.y = landingY(v, b.x, b.z, ny, b.y); b.vy = 0; b.onGround = true; }
}

/** Direção de olhar (yaw/pitch, Three.js: yaw 0 olha para −Z) → vetor unitário. */
export function lookVector(yaw: number, pitch: number): [number, number, number] {
  const cp = Math.cos(pitch);
  return [-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp];
}

export interface Hit { x: number; y: number; z: number; nx: number; ny: number; nz: number; /** id do fragmento de superfície apontado (coleta à mão). */ item?: string; /** caixa do objeto apontado (lanterna), para o contorno. */ box?: Box }
/** Fragmentos de superfície ainda no mundo, por célula. */
export interface ItemLookup { at(x: number, y: number, z: number): string | null }

/** Raio por células (Amanatides–Woo) até o primeiro alvo — sólido, lanterna ou fragmento de superfície; a mira ignora ar e líquido. Devolve a célula e a face atingida; a lanterna só vale dentro da sua caixa (`pad` = folga de toque). */
export function raycast(v: TitanVolume, ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, reach = 6, items?: ItemLookup, pad = 0): Hit | null {
  let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
  const sx = Math.sign(dx), sy = Math.sign(dy), sz = Math.sign(dz);
  const tdx = dx !== 0 ? Math.abs(1 / dx) : Infinity, tdy = dy !== 0 ? Math.abs(1 / dy) : Infinity, tdz = dz !== 0 ? Math.abs(1 / dz) : Infinity;
  let tx = dx !== 0 ? (dx > 0 ? x + 1 - ox : ox - x) * tdx : Infinity;
  let ty = dy !== 0 ? (dy > 0 ? y + 1 - oy : oy - y) * tdy : Infinity;
  let tz = dz !== 0 ? (dz > 0 ? z + 1 - oz : oz - z) * tdz : Infinity;
  let nx = 0, ny = 0, nz = 0, t = 0;
  while (t <= reach) {
    if (y >= Y_MIN && y <= Y_MAX && (nx || ny || nz)) {
      const it = items?.at(x, y, z);
      if (it) return { x, y, z, nx, ny, nz, item: it };
      const id = v.get(x, y, z);
      if (id === T.LANTERN) {
        // a lanterna é pequena: acerta só a caixa do objeto (com folga de toque); fora dela o raio segue e pega o que está atrás
        const box = lanternBox(x, y, z, pad), h = rayBox(ox, oy, oz, dx, dy, dz, box);
        if (h && h.t <= reach) return { x, y, z, nx: h.nx, ny: h.ny, nz: h.nz, box: lanternBox(x, y, z) };
      } else if (id === T.SLAB) {
        // a laje ocupa só a metade de baixo da célula: a mira acerta essa caixa (o topo fica em y + 0,5) e o raio segue por cima dela
        const box: Box = [x, y, z, x + 1, y + 0.5, z + 1], h = rayBox(ox, oy, oz, dx, dy, dz, box);
        if (h && h.t <= reach) return { x, y, z, nx: h.nx, ny: h.ny, nz: h.nz, box };
      } else if (isTarget(id)) return { x, y, z, nx, ny, nz };
    }
    if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; nx = -sx; ny = 0; nz = 0; }
    else if (ty < tz) { y += sy; t = ty; ty += tdy; nx = 0; ny = -sy; nz = 0; }
    else { z += sz; t = tz; tz += tdz; nx = 0; ny = 0; nz = -sz; }
  }
  return null;
}

/** Colocar na célula adjacente à face aponta­da: livre (ar ou líquido), editável e fora do corpo do jogador. */
export function canPlaceAt(v: TitanVolume, b: Body, x: number, y: number, z: number, items?: ItemLookup, height = 1): boolean {
  if (!v.editable(x, y, z) || isOccupied(v.get(x, y, z)) || items?.at(x, y, z)) return false;
  const overlap = x + 1 > b.x - BODY_HALF && x < b.x + BODY_HALF && z + 1 > b.z - BODY_HALF && z < b.z + BODY_HALF && y + height > b.y + EPS && y < b.y + BODY_HEIGHT;
  return !overlap;
}

/**
 * Posição segura para (re)abrir: se a gravada tem o corpo livre, vale; se está obstruída, sobe pela coluna até achar vão livre; se nada
 * serve (ou está fora da região), usa a chegada. `fallback` = pés da chegada.
 */
export function safePosition(v: TitanVolume, p: { x: number; y: number; z: number }, fallback: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  if (![p.x, p.y, p.z].every(Number.isFinite) || p.y < Y_MIN || p.y > Y_MAX - 3) return { x: fallback.x, y: fallback.y, z: fallback.z };
  if (!collides(v, p.x, p.y, p.z)) return p;
  for (let y = Math.ceil(p.y); y <= Y_MAX - 3; y++) if (!collides(v, p.x, y, p.z)) return { x: p.x, y, z: p.z };
  return { x: fallback.x, y: fallback.y, z: fallback.z };
}
