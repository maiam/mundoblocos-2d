import { hash2 } from '../world/random';
import { biomeAt } from './biomes';
import { newBody, stepBody, type Body } from './physics';
import { isSolid, T } from './voxel';
import type { TitanVolume } from './volume';

/**
 * Farejadores de Duna (ADR 0061): os animais da enseada de Noz de Duna. Dois tamanhos do mesmo modelo (a escala é relativa ao modelo do pacote, de 1,85 m, quase a altura do jogador): o **pequeno**
 * (½) e o **grande** (1,3×). Sem DOM, sem `Math.random()` (o passeio vem de hash por seed e tempo), testável em Node.
 * Fases: **wander** (passeia em volta da toca farejando), **charge** (avistou o viajante: uma investida curta em linha reta), **stunned** (bateu: cai de costas como um tatu e fica `stunS` parado,
 * estonteado, antes de poder investir de novo) e **return** (errou a investida ou perdeu o viajante: volta à toca). Dano por tamanho: o pequeno dá menos que o grande.
 * Andam na física do jogador (`stepBody`), em fração da velocidade de caminhada; nunca perseguem além do raio de perseguição da toca.
 */
export type Kind = 'pequeno' | 'grande';

export const KINDS: Readonly<Record<Kind, { scale: number; damage: number; sight: number; walk: number; charge: number; hitRadius: number; hp: number; name: string }>> = {
  pequeno: { scale: 0.5, damage: 2, sight: 8, walk: 0.2, charge: 1.15, hitRadius: 0.8, hp: 10, name: 'Farejador pequeno' },
  grande: { scale: 1.3, damage: 4, sight: 11, walk: 0.14, charge: 0.95, hitRadius: 1.5, hp: 30, name: 'Farejador grande' },
};

export const FAREJADOR = {
  /** Passeio em volta da toca (m). */
  wanderRadius: 8,
  /** Não persegue o viajante que está além disto da toca; a investida aborta se o animal passa disto. */
  chaseRadius: 20,
  returnSpeed: 0.4,
  /** A investida dura no máximo isto (s). */
  chargeMaxS: 1.7,
  /** Parado, estonteado, depois de bater (s). */
  stunS: 2,
  /** Tempo de virar de costas e de se levantar dentro do atordoamento (s). */
  flipS: 0.35,
  /** Pausa depois de uma investida que errou (s). */
  missPauseS: 1.5,
} as const;

export type Phase = 'wander' | 'charge' | 'stunned' | 'return';

export interface Farejador {
  /** Identidade estável (o ninho): `grande`/`pequeno` nas partidas antigas (v ≤ 11); `g0`, `p3`… no bioma (v12). A volta depois do abate é por id. */
  id: string;
  kind: Kind;
  body: Body;
  /** Giro do modelo em torno de Y (rad, `rotation.y` do Three.js): o modelo olha para −X com 0. Ver `facingYaw`. */
  yaw: number;
  phase: Phase;
  /** Segundos na fase atual. */
  t: number;
  home: { x: number; z: number };
  /** Alvo do passeio e pausa farejando antes do próximo. */
  goal: { x: number; z: number };
  pause: number;
  /** Segundos até poder investir de novo (pausa depois de errar). */
  cooldown: number;
  /** Segundos sem chegar ao alvo do passeio (travado num obstáculo: escolhe outro). */
  stuck: number;
  /** Vida (ADR 0069): ao zerar o animal é abatido. */
  hp: number;
  /** Segundos de provocação depois de levar um golpe: enxerga o viajante além do alcance de visão (dentro do raio de perseguição). */
  aggro: number;
  /** Segundos desde o último golpe levado (animação de recuo e rótulo). */
  hurt: number;
  /** Relógio do animal, só para o passeio e a animação (s). */
  clock: number;
  seed: number;
}

export interface FarejadorEvents { hit: boolean; damage: number; phase: Phase | null; moving: boolean }

/** Cria o animal parado na toca (célula `den`, pés em `den.y`). */
export function newFarejador(kind: Kind, den: { x: number; y: number; z: number }, seed: number, id: string = kind): Farejador {
  const hx = den.x + 0.5, hz = den.z + 0.5, idSalt = id === kind ? 0 : [...id].reduce((a, ch) => (Math.imul(a, 31) + ch.charCodeAt(0)) >>> 0, 7), s = ((seed >>> 0) + (kind === 'grande' ? 7919 : 104729) + idSalt) >>> 0;
  return { id, kind, body: newBody(hx, den.y, hz), yaw: Math.PI / 2, phase: 'wander', t: 0, home: { x: hx, z: hz }, goal: { x: hx, z: hz }, pause: kind === 'grande' ? 1.5 : 0.4, cooldown: 0, stuck: 0, hp: KINDS[kind].hp, aggro: 0, hurt: 99, clock: 0, seed: s };
}

/** Os animais de uma toca: um grande e um pequeno. */
/** O que o gerador diz sobre os animais: quem existe, onde nasce (célula, pés em `y`) e o tipo. A volta depois do abate recria pelo `id`. */
export interface CreatureSpec { id: string; kind: Kind; x: number; y: number; z: number }
interface PackSource { version: number; seed: number; arrival: { x: number; z: number }; den: { x: number; y: number; z: number } | null; nutPlants: ReadonlyArray<{ x: number; y: number; z: number }>; column(x: number, z: number): { top: number } }

/**
 * Animais da seed. Até a v11: um grande e um pequeno na toca. v12 (ADR 0074, bioma): **um pequeno por planta de noz**, a 2–3 células dela, e **um grande a cada `plantsPerGrande` plantas** (o primeiro na toca da
 * enseada; os outros junto de plantas afastadas ≥ 24 da chegada e ≥ 20 entre si, relaxando até 18 e 10 se faltar lugar). Puro e determinístico.
 */
export function creatureSpecs(g: PackSource): CreatureSpec[] {
  if (g.version < 12) return g.den ? [{ id: 'grande', kind: 'grande', ...g.den }, { id: 'pequeno', kind: 'pequeno', ...g.den }] : [];
  const biome = biomeAt(g.arrival.x, g.arrival.z), out: CreatureSpec[] = [];
  const near = (p: { x: number; y: number; z: number }, id: string, kind: Kind, r: number): CreatureSpec => {
    const k = [...id].reduce((a, ch) => (Math.imul(a, 31) + ch.charCodeAt(0)) >>> 0, 11);
    for (let i = 0; i < 8; i++) { // primeira direção (a partir de uma sorteada) com chão plano ao lado da planta
      const ang = ((Math.floor(hash2(g.seed, k, 3) * 8) + i) % 8) * (Math.PI / 4), x = Math.round(p.x + Math.cos(ang) * r), z = Math.round(p.z + Math.sin(ang) * r), top = g.column(x, z).top;
      if (Math.abs(top - (p.y - 1)) <= 1 && top >= 64) return { id, kind, x, y: top + 1, z };
    }
    return { id, kind, x: p.x, y: p.y, z: p.z };
  };
  // v13 (ADR 0086): a planta mais próxima da chegada fica sem guarda (nem pequeno nem grande): a primeira refeição é segura
  let free = -1;
  if (g.version >= 13) g.nutPlants.forEach((p, i) => { if (free < 0 || Math.hypot(p.x - g.arrival.x, p.z - g.arrival.z) < Math.hypot(g.nutPlants[free].x - g.arrival.x, g.nutPlants[free].z - g.arrival.z)) free = i; });
  const wanted = Math.max(1, Math.floor(g.nutPlants.length / biome.plantsPerGrande));
  if (g.den) out.push({ id: 'g0', kind: 'grande', ...g.den });
  const bigs = g.den ? [g.den] : [];
  for (const [minArrival, apart] of [[24, 20], [20, 14], [18, 10]]) { // relaxa a distância se a seed não tiver lugar para todos
    for (let i = 0; i < g.nutPlants.length && bigs.length < wanted; i++) {
      if (i === free) continue;
      const p = g.nutPlants[i];
      if (Math.hypot(p.x - g.arrival.x, p.z - g.arrival.z) < minArrival || bigs.some((o) => Math.hypot(o.x - p.x, o.z - p.z) < apart)) continue;
      bigs.push(p); out.push(near(p, `g${bigs.length - 1}`, 'grande', 3));
    }
  }
  g.nutPlants.forEach((p, i) => { if (i === free) return; for (let k = 0; k < biome.pequenoPerPlant; k++) out.push(near(p, k ? `p${i}_${k}` : `p${i}`, 'pequeno', 2)); });
  return out;
}

export const newFromSpec = (sp: CreatureSpec, seed: number): Farejador => newFarejador(sp.kind, sp, seed, sp.id);

export const newPack = (den: { x: number; y: number; z: number }, seed: number): Farejador[] => [newFarejador('grande', den, seed), newFarejador('pequeno', den, seed)];

const dist = (ax: number, az: number, bx: number, bz: number): number => Math.hypot(ax - bx, az - bz);
/** Giro (`rotation.y`) que faz o modelo (voltado para −X) olhar na direção (dx, dz). */
export const facingYaw = (dx: number, dz: number): number => Math.atan2(dz, -dx);

/** Novo alvo de passeio: ponto seco em volta da toca (chão sólido, ar em cima, no nível do animal), por hash do relógio; sem ponto bom, fica onde está. */
function pickGoal(f: Farejador, vol: TitanVolume): { x: number; z: number } {
  const k0 = Math.floor(f.clock * 0.37) + 1, y = Math.floor(f.body.y + 0.01);
  for (let i = 0; i < 8; i++) {
    const a = hash2(f.seed, k0 + i * 31, 11) * Math.PI * 2, r = FAREJADOR.wanderRadius * (0.3 + 0.7 * hash2(f.seed, k0 + i * 31, 23));
    const x = f.home.x + Math.cos(a) * r, z = f.home.z + Math.sin(a) * r, cx = Math.floor(x), cz = Math.floor(z);
    if (isSolid(vol.get(cx, y - 1, cz)) && vol.get(cx, y - 1, cz) !== T.LAKE && vol.get(cx, y, cz) === T.AIR && vol.get(cx, y + 1, cz) === T.AIR) return { x, z };
  }
  return { x: f.body.x, z: f.body.z };
}

function setPhase(f: Farejador, p: Phase, ev: FarejadorEvents): void { f.phase = p; f.t = 0; ev.phase = p; }

/**
 * Um passo do animal. `player` = pés do jogador (ou null se pausado: o animal passeia). Devolve o que aconteceu neste passo: `hit` + `damage` (a batida acertou: o jogo tira vida), `phase` (mudou de
 * fase) e `moving` (para o som).
 */
export function stepFarejador(f: Farejador, vol: TitanVolume, player: { x: number; y: number; z: number } | null, dt: number): FarejadorEvents {
  const ev: FarejadorEvents = { hit: false, damage: 0, phase: null, moving: false };
  const K = KINDS[f.kind];
  f.clock += dt; f.t += dt;
  if (f.cooldown > 0) f.cooldown = Math.max(0, f.cooldown - dt);
  if (f.aggro > 0) f.aggro = Math.max(0, f.aggro - dt);
  f.hurt += dt;
  const b = f.body;
  const pd = player ? dist(b.x, b.z, player.x, player.z) : Infinity;
  const playerHome = player ? dist(f.home.x, f.home.z, player.x, player.z) : Infinity;
  const sees = !!player && f.cooldown === 0 && Math.abs(player.y - b.y) < 3 && (pd <= K.sight || (f.aggro > 0 && pd <= FAREJADOR.chaseRadius)) && playerHome <= FAREJADOR.chaseRadius;
  let dirX = 0, dirZ = 0, speed = 0;
  const walkTo = (tx: number, tz: number, s: number): void => {
    const dx = tx - b.x, dz = tz - b.z, d = Math.hypot(dx, dz);
    if (d < 1e-6) return;
    dirX = dx / d; dirZ = dz / d; speed = s; f.yaw = facingYaw(dirX, dirZ);
  };

  if (f.phase === 'wander' || f.phase === 'return') {
    if (sees) setPhase(f, 'charge', ev);
    else if (f.phase === 'return') {
      if (dist(b.x, b.z, f.home.x, f.home.z) < 1.2) { f.pause = 0.6; setPhase(f, 'wander', ev); } else walkTo(f.home.x, f.home.z, FAREJADOR.returnSpeed);
    } else if (f.pause > 0) { f.pause -= dt; f.stuck = 0; }
    else if (dist(b.x, b.z, f.goal.x, f.goal.z) < 0.4 || f.stuck > 5) { f.pause = 1 + 2 * hash2(f.seed, Math.floor(f.clock), 5); f.goal = pickGoal(f, vol); f.stuck = 0; }
    else { walkTo(f.goal.x, f.goal.z, K.walk); f.stuck += dt; }
  } else if (f.phase === 'charge') {
    const away = dist(f.home.x, f.home.z, b.x, b.z) > FAREJADOR.chaseRadius;
    if (!player || away || f.t >= FAREJADOR.chargeMaxS) { f.cooldown = FAREJADOR.missPauseS; setPhase(f, 'return', ev); }
    else {
      walkTo(player.x, player.z, K.charge);
      if (pd <= K.hitRadius && Math.abs(player.y - b.y) < 1.4) { ev.hit = true; ev.damage = K.damage; setPhase(f, 'stunned', ev); }
    }
  } else { // stunned: caído de costas, parado
    if (f.t >= FAREJADOR.stunS) setPhase(f, 'wander', ev);
  }
  stepBody(vol, b, { dirX: dirX * speed, dirZ: dirZ * speed, jump: false }, dt);
  ev.moving = speed > 0 && Math.hypot(b.vx, b.vz) > 0.05;
  return ev;
}

/** Golpe levado (ADR 0069): tira vida, provoca (investe mesmo fora do alcance de visão por `aggro` s) e interrompe a pausa de uma investida que errou. Devolve se morreu. */
export function hurtFarejador(f: Farejador, damage: number): { dead: boolean } {
  f.hp = Math.max(0, f.hp - Math.max(0, damage));
  f.hurt = 0; f.aggro = 8; f.cooldown = 0;
  return { dead: f.hp <= 0 };
}

/** Raio da esfera de acerto (m): o corpo inteiro do modelo (1,85 m de comprimento × escala), centrada a ~0,45 da altura do modelo. */
export const hitSphere = (f: Farejador): { x: number; y: number; z: number; r: number } => ({ x: f.body.x, y: f.body.y + 0.45 * KINDS[f.kind].scale, z: f.body.z, r: 0.95 * KINDS[f.kind].scale });

/**
 * Animal na mira (ADR 0069, 0074): raio do olhar contra a esfera de cada animal até `reach` m, escondido por bloco mais perto (`blockDist`). Entre os que o raio acerta vence o que está **mais perto do eixo
 * da mira** em proporção ao tamanho (o pequeno não fica escondido atrás da esfera do grande quando os dois estão juntos). Sem acerto de esfera, uma **ajuda de mira** pega o animal bem perto dos pés
 * (≤ 1,4 m na horizontal e dentro de 60° do olhar), onde olhar para baixo o bastante para acertar a esfera pequena seria incômodo.
 */
export function creatureAim(list: readonly Farejador[], ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, reach: number, blockDist = Infinity): { index: number; dist: number } | null {
  let best: { index: number; dist: number; score: number } | null = null;
  list.forEach((f, index) => {
    const s = hitSphere(f), lx = s.x - ox, ly = s.y - oy, lz = s.z - oz;
    const t0 = lx * dx + ly * dy + lz * dz; // projeção do centro no raio
    const d2 = lx * lx + ly * ly + lz * lz - t0 * t0;
    if (d2 > s.r * s.r) return;
    const t = t0 - Math.sqrt(s.r * s.r - d2); // entrada na esfera (se estamos dentro dela, t < 0: acerta a 0)
    const dist = Math.max(0, t);
    if (t0 < 0 || dist > reach || dist >= blockDist) return;
    const score = d2 / (s.r * s.r);
    if (!best || score < best.score) best = { index, dist, score };
  });
  const hit = best as { index: number; dist: number } | null;
  if (hit) return { index: hit.index, dist: hit.dist };
  let near: { index: number; dist: number } | null = null;
  const hl = Math.hypot(dx, dz);
  list.forEach((f, index) => {
    const lx = f.body.x - ox, lz = f.body.z - oz, h = Math.hypot(lx, lz);
    if (h > 1.4 || h >= blockDist || hl < 1e-6) return;
    const cos = h < 1e-6 ? 1 : (lx * dx + lz * dz) / (h * hl); // o animal está na frente (dentro de 60° do olhar na horizontal)
    if (cos < 0.5) return;
    if (!near || h < near.dist) near = { index, dist: h };
  });
  return near as { index: number; dist: number } | null;
}

/** Pose das partes do modelo (rad, em torno do pivô de cada parte; o modelo olha para −X, o eixo lateral é Z). Pura do estado: sem rig, cada parte gira em torno do próprio pivô. */
export interface FarejadorPose {
  /** Sobe/desce do tronco inteiro (m, na escala do modelo) e rolagem do corpo em torno do eixo do comprimento (0 = de pé, π = de costas). */
  bob: number; roll: number;
  /** Cabeça: arfar (em Z) e girar (em Y). */
  headPitch: number; headYaw: number;
  /** Cauda: balanço lateral (em Y). */
  tailYaw: number;
  /** Giro em Z das patas: dianteira direita, dianteira esquerda, traseira direita, traseira esquerda. */
  legs: [number, number, number, number];
}

export function farejadorPose(f: Farejador, moving: boolean): FarejadorPose {
  const c = f.clock;
  const pose: FarejadorPose = { bob: 0, roll: 0, headPitch: 0, headYaw: 0, tailYaw: Math.sin(c * 1.6) * 0.12, legs: [0, 0, 0, 0] };
  const flinch = f.hurt < 0.3 ? 1 - f.hurt / 0.3 : 0; // recuo curto ao levar um golpe (ADR 0069)
  const out = (p: FarejadorPose): FarejadorPose => { p.headPitch -= 0.45 * flinch; p.bob += 0.05 * flinch; return p; };
  if (f.phase === 'stunned') {
    const fl = FAREJADOR.flipS;
    // cai de costas rápido (primeiros `flipS` s), fica de barriga para cima balançando as patas, e se vira de volta nos últimos `flipS` s
    const down = Math.min(1, f.t / fl), up = Math.min(1, Math.max(0, (FAREJADOR.stunS - f.t) / fl));
    const lying = Math.min(down, up);
    pose.roll = Math.PI * lying;
    pose.legs = [Math.sin(c * 7) * 0.5 * lying, Math.sin(c * 7 + 2) * 0.5 * lying, Math.sin(c * 6 + 1) * 0.5 * lying, Math.sin(c * 6 + 3) * 0.5 * lying];
    pose.headPitch = 0.25 * lying; pose.headYaw = Math.sin(c * 4) * 0.35 * lying; // estonteado: a cabeça balança
    pose.tailYaw = Math.sin(c * 3) * 0.25 * lying;
    return out(pose);
  }
  if (f.phase === 'charge') {
    const w = c * 17;
    pose.legs = [Math.sin(w) * 0.8, Math.sin(w + Math.PI) * 0.8, Math.sin(w + Math.PI * 0.5) * 0.8, Math.sin(w + Math.PI * 1.5) * 0.8];
    pose.headPitch = 0.12; pose.bob = Math.abs(Math.sin(w)) * 0.05; pose.tailYaw = Math.sin(w * 0.5) * 0.1;
    return out(pose);
  }
  const w = c * (f.phase === 'return' ? 8 : 4.2);
  if (moving) {
    pose.legs = [Math.sin(w) * 0.5, Math.sin(w + Math.PI) * 0.5, Math.sin(w + Math.PI) * 0.5, Math.sin(w) * 0.5]; // passo em diagonais (como um quadrúpede)
    pose.bob = Math.abs(Math.sin(w)) * 0.015;
  }
  // farejar: a cabeça desce e sobe em pequenos movimentos, de um lado a outro
  pose.headPitch = 0.1 + Math.sin(c * 3.1) * 0.12 + (moving ? 0 : 0.06);
  pose.headYaw = Math.sin(c * 1.3) * 0.22;
  return out(pose);
}
