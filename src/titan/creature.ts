import { hash2 } from '../world/random';
import { newBody, stepBody, type Body } from './physics';
import type { TitanVolume } from './volume';

/**
 * Farejador de Duna (ADR 0061): o animal territorial que guarda a enseada de Noz de Duna ("O dono da enseada"). Sem DOM, sem `Math.random()` (o passeio vem de hash por seed e tempo), testável em Node.
 * Quatro fases: **sniff** (fareja a areia perto da toca), **warn** (o viajante entrou no aviso: raspa a pata de lado, sem atacar), **charge** (se o viajante continua se aproximando: uma investida curta
 * e uma batida) e **return** (volta à toca e só reage de novo depois da pausa). Fora do território ele nunca persegue. Andar na física do jogador (`stepBody`), em fração da velocidade de caminhada.
 */
export const FAREJADOR = {
  /** Raio (m) em que o viajante é notado e o aviso começa. */
  warnRadius: 9,
  /** Se o viajante chega tão perto durante o aviso, vem a investida. */
  chargeRadius: 5,
  /** O viajante recua além disto e o aviso termina. */
  calmRadius: 11,
  /** Raio do território em volta da toca: a investida e o passeio nunca saem dele. */
  territory: 13,
  /** Passeio de farejar, em volta da toca. */
  wanderRadius: 3,
  /** Velocidades, fração da caminhada do jogador. */
  walkSpeed: 0.16, returnSpeed: 0.4, chargeSpeed: 1.05,
  /** A investida dura no máximo isto (s) e a batida alcança a este raio (m). */
  chargeMaxS: 1.4, hitRadius: 1.0,
  /** Dano da batida (pontos de vida; 2 = 1 coração) e pausa antes de reagir de novo (s). */
  damage: 2, cooldownS: 4,
} as const;

export type Phase = 'sniff' | 'warn' | 'charge' | 'return';

export interface Farejador {
  body: Body;
  /** Giro do modelo em torno de Y (rad, `rotation.y` do Three.js): o modelo olha para −X com 0. Ver `facingYaw`. */
  yaw: number;
  phase: Phase;
  /** Segundos na fase atual. */
  t: number;
  home: { x: number; z: number };
  /** Alvo do passeio (centro de célula) e se está parado farejando. */
  goal: { x: number; z: number };
  pause: number;
  cooldown: number;
  /** A batida da investida atual já foi dada. */
  hit: boolean;
  /** Relógio do animal, só para o passeio e a animação (s). */
  clock: number;
  seed: number;
}

export interface FarejadorEvents { hit: boolean; phase: Phase | null; moving: boolean }

/** Cria o animal parado na toca (célula `den`, pés em `den.y`). */
export function newFarejador(den: { x: number; y: number; z: number }, seed: number): Farejador {
  const hx = den.x + 0.5, hz = den.z + 0.5;
  return { body: newBody(hx, den.y, hz), yaw: Math.PI / 2, phase: 'sniff', t: 0, home: { x: hx, z: hz }, goal: { x: hx, z: hz }, pause: 1.5, cooldown: 0, hit: false, clock: 0, seed: seed >>> 0 };
}

const dist = (ax: number, az: number, bx: number, bz: number): number => Math.hypot(ax - bx, az - bz);
/** Yaw que faz o animal (modelo voltado para −X) olhar na direção (dx, dz): o jogo desenha o modelo com `rotation.y = yaw`. */
export const facingYaw = (dx: number, dz: number): number => Math.atan2(dz, -dx);

/** Novo alvo de passeio: ponto em volta da toca, escolhido por hash do relógio (determinístico por seed). */
function pickGoal(f: Farejador): { x: number; z: number } {
  const k = Math.floor(f.clock * 0.37) + 1;
  const a = hash2(f.seed, k, 11) * Math.PI * 2, r = FAREJADOR.wanderRadius * (0.35 + 0.65 * hash2(f.seed, k, 23));
  return { x: f.home.x + Math.cos(a) * r, z: f.home.z + Math.sin(a) * r };
}

function setPhase(f: Farejador, p: Phase, ev: FarejadorEvents): void { f.phase = p; f.t = 0; ev.phase = p; }

/**
 * Um passo do animal. `player` = pés do jogador (ou null se morto/pausado: o animal volta a farejar). Devolve o que aconteceu neste passo: `hit` (a batida acertou: o jogo tira vida),
 * `phase` (mudou de fase) e `moving` (para o som e a animação).
 */
export function stepFarejador(f: Farejador, vol: TitanVolume, player: { x: number; y: number; z: number } | null, dt: number): FarejadorEvents {
  const ev: FarejadorEvents = { hit: false, phase: null, moving: false };
  f.clock += dt; f.t += dt;
  if (f.cooldown > 0) f.cooldown = Math.max(0, f.cooldown - dt);
  const b = f.body;
  const pd = player ? dist(b.x, b.z, player.x, player.z) : Infinity;
  const playerHome = player ? dist(f.home.x, f.home.z, player.x, player.z) : Infinity;
  const near = !!player && Math.abs(player.y - b.y) < 4; // noutro nível (de cima do paredão), não incomoda
  let dirX = 0, dirZ = 0, speed = 0;
  const walkTo = (tx: number, tz: number, s: number): void => {
    const dx = tx - b.x, dz = tz - b.z, d = Math.hypot(dx, dz);
    if (d < 1e-6) return;
    dirX = dx / d; dirZ = dz / d; speed = s; f.yaw = facingYaw(dirX, dirZ);
  };

  if (f.phase === 'sniff') {
    if (near && f.cooldown === 0 && pd <= FAREJADOR.warnRadius && playerHome <= FAREJADOR.territory + FAREJADOR.warnRadius) { setPhase(f, 'warn', ev); }
    else if (f.pause > 0) f.pause -= dt;
    else {
      if (dist(b.x, b.z, f.goal.x, f.goal.z) < 0.35) { f.pause = 1.2 + 1.8 * hash2(f.seed, Math.floor(f.clock), 5); f.goal = pickGoal(f); }
      else walkTo(f.goal.x, f.goal.z, FAREJADOR.walkSpeed);
    }
  } else if (f.phase === 'warn') {
    if (!near || pd > FAREJADOR.calmRadius || playerHome > FAREJADOR.territory + FAREJADOR.calmRadius) { setPhase(f, 'return', ev); }
    else {
      f.yaw = facingYaw(player!.x - b.x, player!.z - b.z); // de lado para o viajante, raspando a pata: o corpo gira devagar para ele
      if (pd <= FAREJADOR.chargeRadius && dist(f.home.x, f.home.z, b.x, b.z) <= FAREJADOR.territory) { f.hit = false; setPhase(f, 'charge', ev); }
    }
  } else if (f.phase === 'charge') {
    if (!player) setPhase(f, 'return', ev);
    else {
      walkTo(player.x, player.z, FAREJADOR.chargeSpeed);
      if (!f.hit && pd <= FAREJADOR.hitRadius && Math.abs(player.y - b.y) < 1.4) { f.hit = true; ev.hit = true; f.cooldown = FAREJADOR.cooldownS; setPhase(f, 'return', ev); }
      else if (f.t >= FAREJADOR.chargeMaxS || dist(f.home.x, f.home.z, b.x, b.z) > FAREJADOR.territory) { f.cooldown = FAREJADOR.cooldownS * 0.5; setPhase(f, 'return', ev); }
    }
  } else { // return
    const hd = dist(b.x, b.z, f.home.x, f.home.z);
    if (hd < 0.8) { f.goal = { ...f.home }; f.pause = 1; setPhase(f, 'sniff', ev); }
    else walkTo(f.home.x, f.home.z, FAREJADOR.returnSpeed);
  }
  stepBody(vol, b, { dirX: dirX * speed, dirZ: dirZ * speed, jump: false }, dt);
  ev.moving = speed > 0 && Math.hypot(b.vx, b.vz) > 0.05;
  return ev;
}

/** Pose das partes do modelo (rad, em torno do pivô de cada parte; o modelo olha para −X, o eixo lateral é Z). Pura do estado: sem rig, cada parte gira em torno do próprio pivô. */
export interface FarejadorPose {
  /** Sobe/desce do tronco inteiro (m). */
  bob: number;
  /** Cabeça: arfar (em Z) e girar (em Y). */
  headPitch: number; headYaw: number;
  /** Cauda: balanço lateral (em Y). */
  tailYaw: number;
  /** Giro em Z das patas: dianteira direita, dianteira esquerda, traseira direita, traseira esquerda. */
  legs: [number, number, number, number];
}

export function farejadorPose(f: Farejador, moving: boolean): FarejadorPose {
  const c = f.clock;
  const pose: FarejadorPose = { bob: 0, headPitch: 0, headYaw: 0, tailYaw: Math.sin(c * 1.6) * 0.12, legs: [0, 0, 0, 0] };
  if (f.phase === 'warn') {
    pose.headPitch = 0.3; // cabeça baixa, ameaçando
    pose.headYaw = Math.sin(c * 2.2) * 0.12;
    pose.tailYaw = Math.sin(c * 5) * 0.3;
    pose.legs[0] = -0.2 - Math.abs(Math.sin(c * 6.5)) * 0.85; // a dianteira direita raspa a areia: sobe e arrasta para trás, em ritmo seco
    pose.bob = -0.02;
    return pose;
  }
  if (f.phase === 'charge') {
    const w = c * 17;
    pose.legs = [Math.sin(w) * 0.8, Math.sin(w + Math.PI) * 0.8, Math.sin(w + Math.PI * 0.5) * 0.8, Math.sin(w + Math.PI * 1.5) * 0.8];
    pose.headPitch = 0.12; pose.bob = Math.abs(Math.sin(w)) * 0.05; pose.tailYaw = Math.sin(w * 0.5) * 0.1;
    return pose;
  }
  const w = c * (f.phase === 'return' ? 8 : 4.2);
  if (moving) {
    pose.legs = [Math.sin(w) * 0.5, Math.sin(w + Math.PI) * 0.5, Math.sin(w + Math.PI) * 0.5, Math.sin(w) * 0.5]; // passo em diagonais (como um quadrúpede)
    pose.bob = Math.abs(Math.sin(w)) * 0.015;
  }
  // farejar: a cabeça desce e sobe em pequenos movimentos, de um lado a outro
  pose.headPitch = 0.1 + Math.sin(c * 3.1) * 0.12 + (moving ? 0 : 0.06);
  pose.headYaw = Math.sin(c * 1.3) * 0.22;
  return pose;
}
