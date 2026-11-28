import { hash2 } from '../world/random';
import { faunaYaw, rayAabb, type AabbBox } from './fauna';
import { newBody, stepBody, type Body } from './physics';
import type { TitanVolume } from './volume';

/**
 * Grunho Casca-Rachada (ADR 0147): o primeiro **mob inimigo** do Orvalis, um goblin saqueador que acampa em volta de uma Fogueira (sala 102). Regras aprovadas pelo dono (ADR 0116),
 * no molde do zumbi (números de espelhos da Wiki, a confirmar): vida 20, golpe de clava 3, 1,5 s entre golpes, avisa a 12 m, persegue até 25 m **da fogueira** e volta; não queima ao sol;
 * ao ser abatido solta nada e volta ao acampamento após 10 min. Puro, sem DOM e sem `Math.random()` (sorteios por `hash2`): testável em Node e rodável na sala (ADR 0104).
 * Estado só de execução (a posição inicial vem da geração do mapa): não vai ao save.
 */
export const GRUNHO = {
  hp: 20, damage: 3,
  /** Pausa mínima entre o início de um golpe e o seguinte (s). */
  hitIntervalS: 1.5,
  /** Duração do gesto do golpe (s) e o instante em que a clava acerta. */
  swingS: 0.5, hitAtS: 0.3,
  /** Alcance para começar o golpe e para ele ainda acertar (m, entre os pés). */
  reach: 1.6, hitReach: 2.0,
  /** Avisa o viajante a este raio (m) e não persegue além deste raio **da fogueira**. */
  alertRadius: 12, chaseRadius: 25,
  /** Passeio em volta do lugar dele na roda (m) e as velocidades (m/s): o jogador anda 4,3 e corre 5,6, então dá para fugir. */
  wanderRadius: 1.5, walk: 1.0, run: 3.0,
  /** Caixa de acerto (m): largura × altura. */
  width: 0.7, height: 1.4,
  /** Depois de abatido, volta em tantos segundos. */
  respawnS: 600,
} as const;

const WALK_REF = 4.3; // a caminhada do jogador (physics.ts): o `stepBody` lê a entrada como fração dela

export type GrunhoPhase = 'wander' | 'chase' | 'return' | 'dead';
export interface Grunho {
  id: string;
  /** A fogueira do acampamento (centro da coleira). */
  camp: { x: number; z: number };
  body: Body;
  /** Giro do modelo em torno de Y (`rotation.y`): o modelo olha para −Z com 0 (`faunaYaw`). */
  yaw: number;
  phase: GrunhoPhase;
  /** Segundos na fase atual. */
  t: number;
  /** O lugar dele na roda em volta da fogueira (para onde volta). */
  home: { x: number; z: number };
  goal: { x: number; z: number };
  pause: number;
  stuck: number;
  hp: number;
  /** Segundos desde o último golpe levado (recuo curto na pose). */
  hurt: number;
  /** Segundos que faltam para poder começar outro golpe. */
  cooldown: number;
  /** Segundos desde o início do gesto do golpe (−1 = não está golpeando) e se o dano já foi aplicado nele. */
  swing: number;
  hitDone: boolean;
  /** Quem ele persegue (id do jogador) ou `null`. */
  target: string | null;
  /** Segundos desde a morte (só em `dead`). */
  deadFor: number;
  clock: number;
  seed: number;
}

export interface GrunhoSpec { id: string; x: number; y: number; z: number; campX: number; campZ: number }
export interface GrunhoTarget { id: string; x: number; y: number; z: number }
export interface GrunhoHit { target: string; damage: number; dx: number; dz: number }

export function newGrunho(sp: GrunhoSpec, seed: number): Grunho {
  const hx = sp.x + 0.5, hz = sp.z + 0.5, cx = sp.campX + 0.5, cz = sp.campZ + 0.5;
  const salt = [...sp.id].reduce((a, ch) => (Math.imul(a, 31) + ch.charCodeAt(0)) >>> 0, 7);
  return { id: sp.id, camp: { x: cx, z: cz }, body: newBody(hx, sp.y, hz), yaw: faunaYaw(cx - hx, cz - hz), phase: 'wander', t: 0, home: { x: hx, z: hz }, goal: { x: hx, z: hz }, pause: 0.5 + 2 * hash2(seed, salt, 7), stuck: 0, hp: GRUNHO.hp, hurt: 99, cooldown: 0, swing: -1, hitDone: false, target: null, deadFor: 0, clock: hash2(seed, salt, 5) * 10, seed: salt };
}

/** Um acampamento do mapa: a Fogueira (célula `x, y, z`) e os lugares (pés) dos goblins na roda em volta dela. */
export interface GrunhoCamp { id: string; x: number; y: number; z: number; slots: ReadonlyArray<{ x: number; y: number; z: number }> }
/** Goblins do mapa (função pura do gerador): um por lugar de cada acampamento, ids `g:<acampamento>:<n>`. Sem `camps` = nenhum. */
export const grunhoSpecs = (g: { camps?: readonly GrunhoCamp[] }): GrunhoSpec[] => (g.camps ?? []).flatMap((c) => c.slots.map((s, i) => ({ id: `g:${c.id}:${i}`, x: s.x, y: s.y, z: s.z, campX: c.x, campZ: c.z })));

export const newGrunhosFromSpecs = (specs: readonly GrunhoSpec[], seed: number): Grunho[] => specs.map((sp) => newGrunho(sp, seed));

const dist2 = (ax: number, az: number, bx: number, bz: number): number => Math.hypot(ax - bx, az - bz);

/** Um passo do Grunho. Devolve os golpes que acertaram neste passo (a sala aplica o dano) e se está andando (pose). */
export function stepGrunho(g: Grunho, vol: TitanVolume, dt: number, targets: readonly GrunhoTarget[]): { hits: GrunhoHit[]; moving: boolean } {
  const hits: GrunhoHit[] = [];
  g.clock += dt; g.t += dt; g.hurt += dt;
  if (g.phase === 'dead') {
    g.deadFor += dt;
    if (g.deadFor >= GRUNHO.respawnS) { // voltou ao acampamento, inteiro
      g.phase = 'wander'; g.t = 0; g.hp = GRUNHO.hp; g.deadFor = 0; g.target = null; g.swing = -1; g.cooldown = 0;
      g.body.x = g.home.x; g.body.z = g.home.z; g.body.vx = g.body.vz = 0; g.goal = { x: g.home.x, z: g.home.z }; g.pause = 1;
    }
    return { hits, moving: false };
  }
  if (g.cooldown > 0) g.cooldown = Math.max(0, g.cooldown - dt);
  const b = g.body;
  let dirX = 0, dirZ = 0, speed = 0;
  const walkTo = (tx: number, tz: number, mps: number): void => {
    const dx = tx - b.x, dz = tz - b.z, d = Math.hypot(dx, dz);
    if (d < 1e-6) return;
    dirX = dx / d; dirZ = dz / d; speed = mps / WALK_REF; g.yaw = faunaYaw(dirX, dirZ);
  };
  const face = (tx: number, tz: number): void => { if (Math.hypot(tx - b.x, tz - b.z) > 1e-6) g.yaw = faunaYaw(tx - b.x, tz - b.z); };

  // o gesto do golpe: a clava acerta em `hitAtS` se o alvo ainda está ao alcance
  if (g.swing >= 0) {
    g.swing += dt;
    if (!g.hitDone && g.swing >= GRUNHO.hitAtS) {
      g.hitDone = true;
      const tg = targets.find((t) => t.id === g.target);
      if (tg && dist2(tg.x, tg.z, b.x, b.z) <= GRUNHO.hitReach && Math.abs(tg.y - b.y) < 1.6) hits.push({ target: tg.id, damage: GRUNHO.damage, dx: tg.x - b.x, dz: tg.z - b.z });
    }
    if (g.swing >= GRUNHO.swingS) g.swing = -1;
  }

  // quem está ao alcance do aviso (ou, já em perseguição, da perseguição) e dentro da coleira; vence o mais perto
  const radius = g.phase === 'chase' ? GRUNHO.chaseRadius : GRUNHO.alertRadius;
  let best: GrunhoTarget | null = null, bestD = Infinity;
  for (const t of targets) {
    const d = dist2(t.x, t.z, b.x, b.z);
    if (d <= radius && dist2(t.x, t.z, g.camp.x, g.camp.z) <= GRUNHO.chaseRadius && Math.abs(t.y - b.y) < 6 && d < bestD) { best = t; bestD = d; }
  }
  const leashed = dist2(b.x, b.z, g.camp.x, g.camp.z) > GRUNHO.chaseRadius;
  if (best && !leashed && g.phase !== 'return') { if (g.phase !== 'chase') { g.phase = 'chase'; g.t = 0; } g.target = best.id; }
  else if (g.phase === 'chase') { g.phase = 'return'; g.t = 0; g.target = null; g.swing = -1; }

  if (g.phase === 'chase' && best) {
    if (g.swing >= 0) face(best.x, best.z); // golpeando, fica parado e olha o alvo
    else if (bestD <= GRUNHO.reach) {
      face(best.x, best.z);
      if (g.cooldown === 0) { g.swing = 0; g.hitDone = false; g.cooldown = GRUNHO.hitIntervalS; }
    } else walkTo(best.x, best.z, GRUNHO.run);
  } else if (g.phase === 'return') {
    if (dist2(b.x, b.z, g.home.x, g.home.z) < 0.6) {
      g.phase = 'wander'; g.t = 0; g.hp = GRUNHO.hp; g.pause = 1; g.goal = { x: g.home.x, z: g.home.z }; // voltou à roda: cura-se
    } else walkTo(g.home.x, g.home.z, GRUNHO.run);
  } else if (g.pause > 0) { g.pause -= dt; g.stuck = 0; face(g.camp.x, g.camp.z); } // parado, olha o fogo
  else if (dist2(b.x, b.z, g.goal.x, g.goal.z) < 0.3 || g.stuck > 4) {
    g.pause = 2 + 4 * hash2(g.seed, Math.floor(g.clock), 5); g.stuck = 0;
    const a = hash2(g.seed, Math.floor(g.clock * 0.5), 11) * Math.PI * 2, r = GRUNHO.wanderRadius * (0.3 + 0.7 * hash2(g.seed, Math.floor(g.clock * 0.5), 23));
    g.goal = { x: g.home.x + Math.cos(a) * r, z: g.home.z + Math.sin(a) * r };
  } else { walkTo(g.goal.x, g.goal.z, GRUNHO.walk); g.stuck += dt; }

  stepBody(vol, b, { dirX: dirX * speed, dirZ: dirZ * speed, jump: false }, dt);
  return { hits, moving: speed > 0 && Math.hypot(b.vx, b.vz) > 0.05 };
}

/** Golpe levado: tira vida; vivo, passa a perseguir quem bateu (`by`); morto, cai e só volta após `respawnS`. Devolve se morreu. */
export function hurtGrunho(g: Grunho, damage: number, by: string | null = null): { dead: boolean } {
  if (g.phase === 'dead') return { dead: false };
  g.hp = Math.max(0, g.hp - Math.max(0, damage));
  g.hurt = 0;
  if (g.hp <= 0) { g.phase = 'dead'; g.deadFor = 0; g.swing = -1; g.target = null; g.t = 0; return { dead: true }; }
  if (by) { g.target = by; if (g.phase !== 'chase') { g.phase = 'chase'; g.t = 0; } }
  return { dead: false };
}

export const grunhoAlive = (g: Grunho): boolean => g.phase !== 'dead';

/** Caixa de acerto: centrada nos pés (x, z), de y a y + altura. */
export const grunhoBox = (g: Grunho): AabbBox => {
  const h = GRUNHO.width / 2;
  return { x0: g.body.x - h, y0: g.body.y, z0: g.body.z - h, x1: g.body.x + h, y1: g.body.y + GRUNHO.height, z1: g.body.z + h };
};

/** Grunho na mira: o raio do olhar contra a caixa de cada Grunho vivo até `reach` m, escondido por bloco mais perto; vence o mais perto. */
export function grunhoAim(list: readonly Grunho[], ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, reach: number, blockDist = Infinity): { index: number; dist: number } | null {
  let best: { index: number; dist: number } | null = null;
  list.forEach((g, index) => {
    if (!grunhoAlive(g)) return;
    const t0 = rayAabb(ox, oy, oz, dx, dy, dz, grunhoBox(g));
    if (t0 === null || t0 > reach || t0 >= blockDist) return;
    if (!best || t0 < best.dist) best = { index, dist: t0 };
  });
  return best;
}

/** Pose (rad): pernas e braço da esquerda andando em contrafase, o braço da clava (direito) no gesto do golpe (levanta, desce rápido, volta), cabeça que acompanha e recuo ao levar um golpe. */
export interface GrunhoPose { legs: [number, number]; armL: number; armR: number; headYaw: number; headPitch: number; bob: number }
export function grunhoPose(g: Grunho, moving: boolean): GrunhoPose {
  const c = g.clock, run = g.phase === 'chase' || g.phase === 'return', w = c * (run ? 11 : 6), amp = moving ? (run ? 0.8 : 0.5) : 0, s = Math.sin(w) * amp;
  let armR = -s * 0.5 + Math.sin(c * 1.7 + g.seed) * 0.03;
  if (g.swing >= 0) {
    const p = Math.min(1, g.swing / GRUNHO.swingS);
    armR = p < 0.35 ? 0.9 * (p / 0.35) : p < 0.6 ? 0.9 + (-2.2 - 0.9) * ((p - 0.35) / 0.25) : -2.2 * (1 - (p - 0.6) / 0.4);
  }
  const flinch = g.hurt < 0.3 ? 1 - g.hurt / 0.3 : 0;
  return { legs: [s, -s], armL: s * 0.8, armR, headYaw: moving ? 0 : Math.sin(c * 0.7 + g.seed) * 0.25, headPitch: -0.4 * flinch + (g.swing >= 0 ? 0.15 : 0), bob: moving ? Math.abs(Math.sin(w)) * 0.03 : 0 };
}
