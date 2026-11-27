import { lanternBox, rayBox, type Box } from './lantern';
import type { TitanVolume } from './volume';
import { modelBox } from './models';
import { blockBoxes, isBed, isBrazier, isTorch, isSlab, isSlabBottom, isChest, isLadder, isMarco, isOccupied, isPanel, isTarget, ladderFacing, ladderTurn, MAT_HEIGHT, T, Y_MAX, Y_MIN } from './voxel';

/** Corpo do jogador: caixa de 0,6 × 1,8 × 0,6 m, olhos a 1,62 m dos pés. Pés em y (base do corpo). */
export const BODY_HALF = 0.3;
export const BODY_HEIGHT = 1.8;
export const EYE_HEIGHT = 1.62;
const GRAVITY = 28;
/** Salta 1 bloco (e um pouco mais): v = √(2 g h) com h = 1,25 m. */
const JUMP_SPEED = Math.sqrt(2 * GRAVITY * 1.25);
const WALK_SPEED = 4.3;
/** Fator da corrida sobre a caminhada (ADR 0076). */
export const SPRINT_FACTOR = 1.3;
const TERMINAL = 20;
/** Escada (ADR 0088): sobe a 2,3 m/s pulando ou empurrando para a parede; sem comando, escorrega a 1,2 m/s (soltar é descer); de lado o corpo anda a 60 %. */
export const CLIMB_UP = 2.3, CLIMB_SLIDE = 1.2, LADDER_WALK = 0.6;
const EPS = 1e-4;

export interface Body { x: number; y: number; z: number; vx: number; vy: number; vz: number; onGround: boolean; inLiquid: boolean; /** Está numa escada (ADR 0088): sem gravidade e sem dano de queda. */ onLadder?: boolean; /** Pulo para sair da água (ADR 0099): direção do degrau (`dx`, `dz`), topo dele (`ledge`) e tempo restante do empurrão (`t`). */ hop?: { dx: number; dz: number; ledge: number; t: number }; /** Suavização visual da câmera depois de subir um degrau (ADR 0103): deslocamento em y (≤ 0) que decai até 0; só o render o lê, a física não. */ stepSmooth?: number }
export const newBody = (x: number, y: number, z: number): Body => ({ x, y, z, vx: 0, vy: 0, vz: 0, onGround: false, inLiquid: false });

/** A caixa em (x, y, z) toca algum sólido? */
export function collides(v: TitanVolume, x: number, y: number, z: number): boolean {
  const x0 = Math.floor(x - BODY_HALF + EPS), x1 = Math.floor(x + BODY_HALF - EPS);
  const y0 = Math.floor(y + EPS), y1 = Math.floor(y + BODY_HEIGHT - EPS);
  const z0 = Math.floor(z - BODY_HALF + EPS), z1 = Math.floor(z + BODY_HALF - EPS);
  for (let yy = y0; yy <= y1; yy++) for (let zz = z0; zz <= z1; zz++) for (let xx = x0; xx <= x1; xx++) {
    const boxes = v.bodyBoxes(xx, yy, zz); // degrau e cadeira (ADR 0101): várias caixas, cada uma com a sua faixa horizontal
    if (boxes) {
      for (const b of boxes) if (x - BODY_HALF < xx + b[3] - EPS && x + BODY_HALF > xx + b[0] + EPS && y < yy + b[4] - EPS && y + BODY_HEIGHT > yy + b[1] + EPS && z - BODY_HALF < zz + b[5] - EPS && z + BODY_HALF > zz + b[2] + EPS) return true;
      continue;
    }
    const [lo, hi] = v.bodySpan(xx, yy, zz);
    if (hi <= lo) continue; // não sólido
    if (lo === 0 && hi === 1) return true; // cubo inteiro
    if (y < yy + hi - EPS && y + BODY_HEIGHT > yy + lo + EPS) return true; // laje: só colide se o corpo cruza a faixa que ela ocupa (a inferior [0, 0,5], a superior [0,5, 1])
  }
  return false;
}

/** Auto-step (ADR 0103): altura máxima que o corpo sobe andando, no chão, ao bater num obstáculo baixo (0,6 m, como o Minecraft); o corpo encaixa no topo real do degrau (laje, degrau, assento), não numa altura fixa. Contra cubo inteiro (1 m) continua barrado. */
export const STEP_HEIGHT = 0.6;
/** Suavização da câmera ao subir: decai como `exp(−22·dt)` (~0,08 s para sumir). */
const STEP_SMOOTH_RATE = 22;
/** Salto automático (ADR 0055): andando no chão contra um degrau de 1 bloco com espaço livre em cima, o corpo pula sozinho e sobe se continuar andando. */
const AUTO_JUMP_PROBE = 0.35;
const AUTO_JUMP_MIN_INPUT = 0.35; // só conta a componente de entrada que empurra contra o bloco (raspar numa parede na diagonal não pula)

/** Altura do apoio ao cair: o topo mais alto sob os pés entre a posição nova (`ny`) e a anterior (`oldY`). Cai no chão inteiro ou na laje. */
function landingY(v: TitanVolume, x: number, z: number, ny: number, oldY: number): number {
  const x0 = Math.floor(x - BODY_HALF + EPS), x1 = Math.floor(x + BODY_HALF - EPS);
  const z0 = Math.floor(z - BODY_HALF + EPS), z1 = Math.floor(z + BODY_HALF - EPS);
  let best = -Infinity;
  for (let yy = Math.floor(ny + EPS); yy <= Math.floor(oldY + EPS); yy++) for (let zz = z0; zz <= z1; zz++) for (let xx = x0; xx <= x1; xx++) {
    const boxes = v.bodyBoxes(xx, yy, zz);
    if (boxes) { // degrau e cadeira: o apoio é o topo da caixa mais alta sob o corpo (ADR 0101)
      for (const b of boxes) {
        if (!(x - BODY_HALF < xx + b[3] - EPS && x + BODY_HALF > xx + b[0] + EPS && z - BODY_HALF < zz + b[5] - EPS && z + BODY_HALF > zz + b[2] + EPS)) continue;
        const top = yy + b[4];
        if (top > ny + EPS && top <= oldY + 2 * EPS) best = Math.max(best, top);
      }
      continue;
    }
    const h = v.bodyHeight(xx, yy, zz);
    if (h > 0 && yy + h > ny + EPS && yy + h <= oldY + 2 * EPS) best = Math.max(best, yy + h);
  }
  return best === -Infinity ? Math.floor(ny + EPS) + 1 : best;
}

/** Limite da cabeça ao subir: a base do sólido mais baixo que o corpo acabou de cruzar (cubo: o fundo da célula; laje superior: o meio dela). */
function ceilingY(v: TitanVolume, x: number, z: number, ny: number, oldY: number): number {
  const x0 = Math.floor(x - BODY_HALF + EPS), x1 = Math.floor(x + BODY_HALF - EPS);
  const z0 = Math.floor(z - BODY_HALF + EPS), z1 = Math.floor(z + BODY_HALF - EPS);
  const oldHead = oldY + BODY_HEIGHT;
  let best = Infinity;
  for (let yy = Math.floor(oldHead - 1 + EPS); yy <= Math.floor(ny + BODY_HEIGHT - EPS); yy++) for (let zz = z0; zz <= z1; zz++) for (let xx = x0; xx <= x1; xx++) {
    const boxes = v.bodyBoxes(xx, yy, zz);
    if (boxes) { // degrau e cadeira (ADR 0101)
      for (const b of boxes) {
        if (!(x - BODY_HALF < xx + b[3] - EPS && x + BODY_HALF > xx + b[0] + EPS && z - BODY_HALF < zz + b[5] - EPS && z + BODY_HALF > zz + b[2] + EPS)) continue;
        const cand = yy + b[1];
        if (cand >= oldHead - 2 * EPS && ny + BODY_HEIGHT > cand + EPS && ny < yy + b[4] - EPS) best = Math.min(best, cand);
      }
      continue;
    }
    const [lo, hi] = v.bodySpan(xx, yy, zz);
    if (hi <= lo) continue;
    const cand = yy + lo;
    if (cand >= oldHead - 2 * EPS && ny + BODY_HEIGHT > cand + EPS && ny < yy + hi - EPS) best = Math.min(best, cand);
  }
  return best === Infinity ? Math.floor(ny + BODY_HEIGHT - EPS) : best;
}

/** Sair da água (ADR 0099): maior diferença de altura, em níveis (1 nível = 1 bloco), entre o topo da célula onde estão os pés (na superfície, o nível da água) e o topo do bloco ao lado que o pulo alcança. */
export const LEDGE_REACH = 1;
/** Tempo (s) e velocidade (m/s) do empurrão em direção ao degrau durante o pulo de saída. */
const HOP_TIME = 0.7, HOP_PUSH = 1.8;

/**
 * Degrau para sair da água (ADR 0099): o jogador na água, encostado (a ≤ 0,15 m) num bloco **fora da água** cujo topo fica a até `LEDGE_REACH` acima dos pés e com espaço livre em cima para o corpo.
 * Olha primeiro o lado para onde se empurra e depois os outros (sem direção, os quatro). Devolve a direção unitária do bloco e a altura do topo, ou null. Puro e sem efeitos.
 */
export function waterLedge(v: TitanVolume, b: Body, dirX: number, dirZ: number): { dx: number; dz: number; ledge: number } | null {
  if (!b.inLiquid) return null;
  const ax = Math.abs(dirX), az = Math.abs(dirZ), sx = Math.sign(dirX), sz = Math.sign(dirZ);
  const order: Array<[number, number]> = ax > 0.2 || az > 0.2 ? (ax >= az ? [[sx, 0], [0, sz]] : [[0, sz], [sx, 0]]) : [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const reach = BODY_HALF + 0.15;
  for (const [dx, dz] of order) {
    if (!dx && !dz) continue;
    const cx = Math.floor(b.x + dx * reach), cz = Math.floor(b.z + dz * reach);
    if (cx === Math.floor(b.x) && cz === Math.floor(b.z)) continue; // ainda não encostou na parede
    let best: number | null = null;
    const cellTop = Math.floor(b.y + 0.2) + 1; // topo da célula dos pés: na superfície, o nível da água
    for (let yy = Math.floor(b.y + EPS); yy <= cellTop + LEDGE_REACH; yy++) {
      const id = v.get(cx, yy, cz), h = v.bodyHeight(cx, yy, cz);
      if (h <= 0 || id === T.LAKE) continue;
      const top = yy + h;
      if (top - cellTop > LEDGE_REACH + EPS || top - b.y < 0.05) continue;
      if (collides(v, cx + 0.5, top, cz + 0.5)) continue; // sem espaço para o corpo em cima
      if (best === null || top > best) best = top;
    }
    if (best !== null) return { dx, dz, ledge: best };
  }
  return null;
}

export interface MoveInput {
  /** Direção de caminhada no mundo (já girada pelo olhar), módulo ≤ 1. */
  dirX: number; dirZ: number;
  jump: boolean;
  /** Corrida (ADR 0076): +30 % de velocidade fora d'água. */
  sprint?: boolean;
}

/** Um passo de física (dt em s; passos grandes são divididos): gravidade, salto de 1 bloco, colisão por eixo, líquido que freia. */
export function stepBody(v: TitanVolume, b: Body, input: MoveInput, dt: number): void {
  let left = Math.min(dt, 0.25);
  while (left > 0) {
    const h = Math.min(left, 1 / 40);
    stepOnce(v, b, input, h);
    left -= h;
  }
  if (b.stepSmooth) { b.stepSmooth *= Math.exp(-STEP_SMOOTH_RATE * dt); if (Math.abs(b.stepSmooth) < 0.001) b.stepSmooth = 0; }
}

/** Frente [x, z] da escada que o corpo ocupa (pés, cintura ou cabeça na célula dela), ou null. */
export function ladderUnder(v: TitanVolume, b: Body): readonly [number, number] | null {
  const cx = Math.floor(b.x), cz = Math.floor(b.z);
  for (const dy of [0.2, 1.0, 1.7]) { const id = v.get(cx, Math.floor(b.y + dy), cz); if (isLadder(id)) return ladderFacing(ladderTurn(id)); }
  return null;
}

function stepOnce(v: TitanVolume, b: Body, input: MoveInput, dt: number): void {
  const feetCell = v.get(Math.floor(b.x), Math.floor(b.y + 0.2), Math.floor(b.z));
  b.inLiquid = feetCell === T.LAKE;
  const ladder = b.inLiquid ? null : ladderUnder(v, b);
  b.onLadder = !!ladder;
  const speed = WALK_SPEED * (b.inLiquid ? 0.6 : ladder ? LADDER_WALK : input.sprint ? SPRINT_FACTOR : 1);
  b.vx = input.dirX * speed;
  b.vz = input.dirZ * speed;
  if (b.hop) { // empurrão para o degrau enquanto dura o pulo de saída (se o jogador não está empurrando já)
    b.hop.t -= dt;
    if (b.hop.t <= 0 || (b.onGround && !b.inLiquid)) b.hop = undefined;
    else if (input.dirX * b.hop.dx + input.dirZ * b.hop.dz < 0.3) { b.vx = b.hop.dx * HOP_PUSH; b.vz = b.hop.dz * HOP_PUSH; }
  }
  if (ladder) {
    const into = -(input.dirX * ladder[0] + input.dirZ * ladder[1]); // > 0: empurrando para a parede (a frente da escada aponta para fora dela)
    b.vy = input.jump || into > 0.3 ? CLIMB_UP : -CLIMB_SLIDE;
  } else if (b.inLiquid) {
    b.vy = Math.max(b.vy - GRAVITY * 0.25 * dt, b.hop ? -TERMINAL : -2.5);
    if (input.jump && !b.hop) {
      const l = waterLedge(v, b, input.dirX, input.dirZ); // pular encostado num bloco até 1 nível acima: sai da água (ADR 0099)
      if (l) { b.vy = Math.sqrt(2 * GRAVITY * (l.ledge - b.y + 0.3)); b.hop = { dx: l.dx, dz: l.dz, ledge: l.ledge, t: HOP_TIME }; }
      else b.vy = 3;
    }
  } else {
    const grounded = b.onGround;
    b.vy = Math.max(b.vy - GRAVITY * dt, -TERMINAL);
    if (input.jump && grounded) b.vy = JUMP_SPEED;
  }
  const wasGrounded = b.onGround && !b.inLiquid;
  const blockedX = moveAxis(v, b, 'x', b.vx * dt);
  const blockedZ = moveAxis(v, b, 'z', b.vz * dt);
  // salto automático: barrado por um degrau de 1 bloco (e o espaço em cima do degrau, na direção do passo, está livre) → pula sem apertar o botão
  if (wasGrounded && !input.jump && ((blockedX && Math.abs(input.dirX) >= AUTO_JUMP_MIN_INPUT) || (blockedZ && Math.abs(input.dirZ) >= AUTO_JUMP_MIN_INPUT))) {
    const m = Math.hypot(input.dirX, input.dirZ) || 1;
    if (!collides(v, b.x + (input.dirX / m) * AUTO_JUMP_PROBE, b.y + 1, b.z + (input.dirZ / m) * AUTO_JUMP_PROBE)) b.vy = JUMP_SPEED;
  }
  b.onGround = false; // `moveAxis` volta a ligar quando a queda é barrada pelo chão
  moveAxis(v, b, 'y', b.vy * dt);
}

/**
 * Auto-step (ADR 0103): teste geométrico em três passos, só com o corpo no chão e o eixo barrado. 1) há teto livre para subir `STEP_HEIGHT` aqui; 2) a caixa elevada cabe na posição nova;
 * 3) desce até o topo real do apoio entre a altura atual e a elevada (snap down). Devolve quanto sobe (0 = não sobe: obstáculo alto demais, sem teto ou sem apoio mais alto que os pés).
 */
function autoStepUp(v: TitanVolume, b: Body, nx: number, nz: number): number {
  if (collides(v, b.x, b.y + STEP_HEIGHT, b.z) || collides(v, nx, b.y + STEP_HEIGHT, nz)) return 0;
  const top = landingY(v, nx, nz, b.y, b.y + STEP_HEIGHT);
  const up = top - b.y;
  if (up <= 0.01 || up > STEP_HEIGHT + 1e-4 || collides(v, nx, top, nz)) return 0;
  return up;
}

/** Move o corpo num eixo; devolve se um sólido barrou o movimento (e o degrau de meia altura não resolveu). */
function moveAxis(v: TitanVolume, b: Body, axis: 'x' | 'y' | 'z', d: number): boolean {
  if (d === 0) return false;
  const nx = axis === 'x' ? b.x + d : b.x, ny = axis === 'y' ? b.y + d : b.y, nz = axis === 'z' ? b.z + d : b.z;
  if (!collides(v, nx, ny, nz)) { b.x = nx; b.y = ny; b.z = nz; return false; }
  // no chão, contra uma laje: sobe o degrau de meia altura e segue andando
  if (axis !== 'y' && b.onGround) {
    const up = autoStepUp(v, b, nx, nz);
    if (up > 0) { b.x = nx; b.z = nz; b.y += up; b.stepSmooth = (b.stepSmooth ?? 0) - up; return false; }
  }
  // encosta na face do bloco que barrou
  if (axis === 'x') { b.x = d > 0 ? Math.floor(nx + BODY_HALF - EPS) - BODY_HALF - EPS : Math.floor(nx - BODY_HALF + EPS) + 1 + BODY_HALF + EPS; b.vx = 0; }
  else if (axis === 'z') { b.z = d > 0 ? Math.floor(nz + BODY_HALF - EPS) - BODY_HALF - EPS : Math.floor(nz - BODY_HALF + EPS) + 1 + BODY_HALF + EPS; b.vz = 0; }
  else if (d > 0) { b.y = ceilingY(v, b.x, b.z, ny, b.y) - BODY_HEIGHT - EPS; b.vy = 0; }
  else { b.y = landingY(v, b.x, b.z, ny, b.y); b.vy = 0; b.onGround = true; }
  return true;
}

/** Direção de olhar (yaw/pitch, Three.js: yaw 0 olha para −Z) → vetor unitário. */
export function lookVector(yaw: number, pitch: number): [number, number, number] {
  const cp = Math.cos(pitch);
  return [-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp];
}

export interface Hit { x: number; y: number; z: number; nx: number; ny: number; nz: number; /** Altura (0–1) do ponto atingido dentro da célula: decide laje superior ou inferior ao colocar (ADR 0056). */ hy?: number; /** id do fragmento de superfície apontado (coleta à mão). */ item?: string; /** caixa do objeto apontado (lanterna), para o contorno. */ box?: Box }
/** Fragmentos de superfície ainda no mundo, por célula. */
export interface ItemLookup { at(x: number, y: number, z: number): string | null }

/** Raio por células (Amanatides–Woo) até o primeiro alvo — sólido, lanterna ou fragmento de superfície; a mira ignora ar e líquido (salvo `liquid`, com o balde na mão). Devolve a célula e a face atingida; a lanterna só vale dentro da sua caixa (`pad` = folga de toque). */
export function raycast(v: TitanVolume, ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, reach = 6, items?: ItemLookup, pad = 0, liquid = false): Hit | null {
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
      const hy = oy + dy * t - y; // altura do ponto de entrada na célula (laje superior × inferior)
      const id = v.get(x, y, z);
      if (id === T.LANTERN) {
        // a lanterna é pequena: acerta só a caixa do objeto (com folga de toque); fora dela o raio segue e pega o que está atrás
        const box = lanternBox(x, y, z, pad), h = rayBox(ox, oy, oz, dx, dy, dz, box);
        if (h && h.t <= reach) return { x, y, z, nx: h.nx, ny: h.ny, nz: h.nz, box: lanternBox(x, y, z) };
      } else if (isMarco(id) || isPanel(id) || isLadder(id) || isChest(id) || isBed(id) || isBrazier(id) || isTorch(id)) {
        // Marco e Painel: a mira acerta a caixa do modelo (com folga de toque); fora dela o raio segue e pega o que está atrás
        const h = rayBox(ox, oy, oz, dx, dy, dz, modelBox(id, x, y, z, pad));
        if (h && h.t <= reach) return { x, y, z, nx: h.nx, ny: h.ny, nz: h.nz, hy: oy + dy * h.t - y, box: modelBox(id, x, y, z) };
      } else if (blockBoxes(id)) {
        // degrau e cadeira (ADR 0101): o raio acerta a caixa mais próxima e passa pelos vãos (o patamar de cima do degrau, o espaço sob o encosto)
        let nearest: { t: number; nx: number; ny: number; nz: number; box: Box } | null = null;
        for (const b of blockBoxes(id)!) {
          const box: Box = [x + b[0], y + b[1], z + b[2], x + b[3], y + b[4], z + b[5]], h = rayBox(ox, oy, oz, dx, dy, dz, box);
          if (h && h.t <= reach && (!nearest || h.t < nearest.t)) nearest = { t: h.t, nx: h.nx, ny: h.ny, nz: h.nz, box };
        }
        if (nearest) return { x, y, z, nx: nearest.nx, ny: nearest.ny, nz: nearest.nz, hy: oy + dy * nearest.t - y, box: nearest.box };
      } else if (id === T.MAT) {
        // a esteira é fina (1/16 m): a mira acerta só a caixa dela (com folga de toque para cima) e o raio segue por baixo e pelos lados
        const h = rayBox(ox, oy, oz, dx, dy, dz, [x, y, z, x + 1, y + MAT_HEIGHT + pad, z + 1]);
        if (h && h.t <= reach) return { x, y, z, nx: h.nx, ny: h.ny, nz: h.nz, hy: oy + dy * h.t - y, box: [x, y, z, x + 1, y + MAT_HEIGHT, z + 1] };
      } else if (isSlab(id)) {
        // a laje ocupa só a metade de baixo da célula: a mira acerta essa caixa (o topo fica em y + 0,5) e o raio segue por cima dela
        const lo = isSlabBottom(id) ? 0 : 0.5, box: Box = [x, y + lo, z, x + 1, y + lo + 0.5, z + 1], h = rayBox(ox, oy, oz, dx, dy, dz, box);
        if (h && h.t <= reach) return { x, y, z, nx: h.nx, ny: h.ny, nz: h.nz, hy: oy + dy * h.t - y, box };
      } else if (isTarget(id) || (liquid && id === T.LAKE)) return { x, y, z, nx, ny, nz, hy }; // `liquid`: o balde mira o líquido (ADR 0091)
    }
    if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; nx = -sx; ny = 0; nz = 0; }
    else if (ty < tz) { y += sy; t = ty; ty += tdy; nx = 0; ny = -sy; nz = 0; }
    else { z += sz; t = tz; tz += tdz; nx = 0; ny = 0; nz = -sz; }
  }
  return null;
}

/** Colocar na célula adjacente à face aponta­da: livre (ar ou líquido), editável e fora do corpo do jogador. */
export function canPlaceAt(v: TitanVolume, b: Body, x: number, y: number, z: number, items?: ItemLookup, span: readonly [number, number] = [0, 1]): boolean {
  if (!v.editable(x, y, z) || isOccupied(v.get(x, y, z)) || items?.at(x, y, z)) return false;
  const overlap = x + 1 > b.x - BODY_HALF && x < b.x + BODY_HALF && z + 1 > b.z - BODY_HALF && z < b.z + BODY_HALF && y + span[1] > b.y + EPS && y + span[0] < b.y + BODY_HEIGHT;
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
