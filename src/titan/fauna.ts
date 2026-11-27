import { hash2 } from '../world/random';
import { newBody, stepBody, type Body } from './physics';
import { isSolid, T } from './voxel';
import type { TitanVolume } from './volume';
import { Item } from './items';

/**
 * Fauna de fazenda do Orvalis em voxel (ADR 0124): porco, vaca, ovelha e galinha. Animais **passivos** (passeiam, fogem ao levar dano, soltam espólio), à parte dos Farejadores do Titã (`creature.ts`,
 * hostis e presos à toca). Regras da Minecraft Wiki (ADR 0116): vida, caixa de colisão/acerto (Java), grupos de 4 em grama na geração, pesos 12/10/10/8, fuga ao ser ferido e espólio por espécie.
 * Puro, sem DOM e sem `Math.random()` (sorteios por `hash2` da seed): testável em Node. Estado só de execução: não vai ao save.
 */
export type FaunaKind = 'porco' | 'vaca' | 'ovelha' | 'galinha';

export interface FaunaSpecies {
  name: string;
  /** Vida (Wiki, Java): porco e vaca 10, ovelha 8, galinha 4. */
  hp: number;
  /** Caixa de acerto da Wiki (Java), em m: largura (lados iguais) × altura. É o que a mira e o golpe leem, não o desenho. */
  width: number;
  height: number;
  /** Passeio e fuga em m/s (a Wiki dá só o atributo, sem m/s: valores provisórios). */
  walk: number;
  /** Fator da fuga sobre o passeio (a Wiki: pânico 1,25×; galinha 1,4×). */
  panic: number;
  /** Peso na tabela de geração (Wiki, Planície: ovelha 12, galinha 10, porco 10, vaca 8). */
  weight: number;
}

export const FAUNA_KINDS: Readonly<Record<FaunaKind, FaunaSpecies>> = {
  porco: { name: 'Porco', hp: 10, width: 0.9, height: 0.9, walk: 1.3, panic: 1.25, weight: 10 },
  vaca: { name: 'Vaca', hp: 10, width: 0.9, height: 1.4, walk: 1.1, panic: 1.25, weight: 8 },
  ovelha: { name: 'Ovelha', hp: 8, width: 0.9, height: 1.3, walk: 1.2, panic: 1.25, weight: 12 },
  galinha: { name: 'Galinha', hp: 4, width: 0.4, height: 0.7, walk: 1.3, panic: 1.4, weight: 10 },
};
export const FAUNA_ORDER: readonly FaunaKind[] = ['ovelha', 'galinha', 'porco', 'vaca'];

/** Geração (Wiki, "Mob spawning"): grupos de 4 por geração de chunk; cada membro a ±4 do ponto do grupo. */
export const GROUP_SIZE = 4;
export const GROUP_SPREAD = 4;
/**
 * Probabilidade de grupo por chunk de 16 × 16: a Wiki dá 10 %, mas o Orvalis não repõe animais com o tempo (sem geração contínua), então a geração inicial usa 4× (adaptação registrada, ADR 0124).
 */
export const GROUP_CHANCE = 0.4;
/** Fuga depois do golpe (s). */
export const PANIC_S = 5;
const WALK_REF = 4.3; // a caminhada do jogador (physics.ts): o `stepBody` lê a entrada como fração dela
const WANDER_RADIUS = 6;
const SPAWN_MIN_Y = 64; // acima da água (superfície do lago em Y = 64)

/**
 * Reprodução (ADR 0125, Minecraft Wiki "Breeding"): alimentar um adulto com a comida da espécie o põe em **amor** por `LOVE_S` s; dois adultos da mesma espécie em amor a até `MATE_RANGE` m andam um até o outro e,
 * ao se encostarem, nasce um **filhote** entre eles e os pais descansam `BREED_COOLDOWN_S` s. O filhote cresce em `GROW_S` s (alimentar corta 10 % do que falta), tem a metade da caixa e da vida e não solta espólio.
 * Adaptações: sem XP (o Orvalis não tem) e teto de `MAX_FAUNA` animais vivos (a Wiki não tem).
 */
export const LOVE_S = 30;
export const BREED_COOLDOWN_S = 300;
export const GROW_S = 1200;
export const GROW_FEED = 0.1;
export const MATE_RANGE = 8;
export const MATE_TOUCH = 1.2;
export const MAX_FAUNA = 200;
export const BABY_SCALE = 0.5;
/** Comida de cada espécie (Wiki: vaca e ovelha trigo; porco cenoura, batata ou beterraba; galinha sementes). Sem beterraba e sem as outras sementes: ainda não são cultura do Orvalis. */
export const BREED_FOOD: Readonly<Record<FaunaKind, readonly number[]>> = {
  porco: [Item.CENOURA, Item.BATATA],
  vaca: [Item.TRIGO],
  ovelha: [Item.TRIGO],
  galinha: [Item.SEMENTE_TRIGO],
};
export const isBreedFood = (kind: FaunaKind, item: number | undefined | null): boolean => !!item && BREED_FOOD[kind].includes(item);

export interface FaunaSpec { id: string; kind: FaunaKind; x: number; y: number; z: number }
interface FaunaSource { world: string; version: number; seed: number; inRegion(x: number, z: number): boolean; column(x: number, z: number): { top: number }; blockAt(x: number, y: number, z: number): number }

/** Só o Orvalis a partir da v3 tem fauna de fazenda. */
export const hasFauna = (g: { world: string; version: number }): boolean => g.world === 'orvalis' && g.version >= 3;

/**
 * Animais da seed (função pura da seed): por chunk, enquanto o sorteio ficar abaixo de `GROUP_CHANCE` (até 3 grupos), um grupo de `GROUP_SIZE` da espécie sorteada pelos pesos; cada membro vale se está
 * em grama, acima da água e com 2 blocos de ar em cima (sem árvore em cima). Nada depende da ordem de leitura.
 */
export function faunaSpecs(g: FaunaSource & { region: { min: number; max: number } }): FaunaSpec[] {
  if (!hasFauna(g)) return [];
  const out: FaunaSpec[] = [], total = FAUNA_ORDER.reduce((a, k) => a + FAUNA_KINDS[k].weight, 0);
  for (let cx = Math.floor(g.region.min / 16); cx < Math.ceil(g.region.max / 16); cx++) for (let cz = Math.floor(g.region.min / 16); cz < Math.ceil(g.region.max / 16); cz++) {
    const key = Math.imul(cx + 64, 4093) + (cz + 64);
    for (let n = 0; n < 3 && hash2(g.seed, key, 9100 + n * 17) < GROUP_CHANCE; n++) {
      let pick = hash2(g.seed, key, 9101 + n * 17) * total, kind = FAUNA_ORDER[0];
      for (const k of FAUNA_ORDER) { pick -= FAUNA_KINDS[k].weight; if (pick < 0) { kind = k; break; } }
      const ox = cx * 16 + Math.floor(hash2(g.seed, key, 9102 + n * 17) * 16), oz = cz * 16 + Math.floor(hash2(g.seed, key, 9103 + n * 17) * 16);
      for (let m = 0; m < GROUP_SIZE; m++) {
        const x = ox + Math.floor(hash2(g.seed, key, 9200 + n * 31 + m * 2) * (2 * GROUP_SPREAD + 1)) - GROUP_SPREAD, z = oz + Math.floor(hash2(g.seed, key, 9201 + n * 31 + m * 2) * (2 * GROUP_SPREAD + 1)) - GROUP_SPREAD;
        if (!g.inRegion(x, z)) continue;
        const top = g.column(x, z).top;
        if (top < SPAWN_MIN_Y || g.blockAt(x, top, z) !== T.GRASS || g.blockAt(x, top + 1, z) !== T.AIR || g.blockAt(x, top + 2, z) !== T.AIR) continue;
        out.push({ id: `f${cx}_${cz}_${n}_${m}`, kind, x, y: top + 1, z });
      }
    }
  }
  return out;
}

export type FaunaPhase = 'wander' | 'panic';
export interface Fauna {
  id: string;
  kind: FaunaKind;
  body: Body;
  /** Giro do modelo em torno de Y (`rotation.y`): o modelo olha para −Z com 0. Ver `faunaYaw`. */
  yaw: number;
  phase: FaunaPhase;
  /** Segundos na fase atual. */
  t: number;
  home: { x: number; z: number };
  goal: { x: number; z: number };
  pause: number;
  stuck: number;
  hp: number;
  /** Segundos desde o último golpe (recuo curto na pose). */
  hurt: number;
  /** De onde veio o golpe: a fuga corre no sentido contrário. */
  from: { x: number; z: number };
  clock: number;
  seed: number;
  /** Filhote (ADR 0125): metade da caixa e da vida, sem espólio, cresce em `grow` s. */
  baby: boolean;
  /** Segundos que faltam para o filhote virar adulto (0 num adulto). */
  grow: number;
  /** Segundos que faltam do modo de amor (0 = não está em amor). */
  love: number;
  /** Segundos de descanso depois de cruzar (0 = pode cruzar). */
  rest: number;
}

export const faunaYaw = (dx: number, dz: number): number => Math.atan2(-dx, -dz); // a frente do modelo é −Z

export function newFauna(sp: FaunaSpec, seed: number): Fauna {
  const hx = sp.x + 0.5, hz = sp.z + 0.5, salt = [...sp.id].reduce((a, ch) => (Math.imul(a, 31) + ch.charCodeAt(0)) >>> 0, 7);
  return { id: sp.id, kind: sp.kind, body: newBody(hx, sp.y, hz), yaw: hash2(seed, salt, 3) * Math.PI * 2, phase: 'wander', t: 0, home: { x: hx, z: hz }, goal: { x: hx, z: hz }, pause: 0.5 + 2 * hash2(seed, salt, 4), stuck: 0, hp: FAUNA_KINDS[sp.kind].hp, hurt: 99, from: { x: hx, z: hz }, clock: 0, seed: ((seed >>> 0) + salt) >>> 0, baby: false, grow: 0, love: 0, rest: 0 };
}

export const newFaunaFromSpecs = (specs: readonly FaunaSpec[], seed: number): Fauna[] => specs.map((sp) => newFauna(sp, seed));

function pickGoal(f: Fauna, vol: TitanVolume): { x: number; z: number } {
  const k0 = Math.floor(f.clock * 0.37) + 1, y = Math.floor(f.body.y + 0.01);
  for (let i = 0; i < 8; i++) {
    const a = hash2(f.seed, k0 + i * 31, 11) * Math.PI * 2, r = WANDER_RADIUS * (0.3 + 0.7 * hash2(f.seed, k0 + i * 31, 23));
    const x = f.home.x + Math.cos(a) * r, z = f.home.z + Math.sin(a) * r, cx = Math.floor(x), cz = Math.floor(z);
    if (isSolid(vol.get(cx, y - 1, cz)) && vol.get(cx, y - 1, cz) !== T.LAKE && vol.get(cx, y, cz) === T.AIR && vol.get(cx, y + 1, cz) === T.AIR) return { x, z };
  }
  return { x: f.body.x, z: f.body.z };
}

/** Um passo do animal: passeia em volta de `home` (anda, para e farejando outro ponto) ou, ferido, foge no sentido oposto ao do golpe. Devolve se está andando (som e pose). */
export function stepFauna(f: Fauna, vol: TitanVolume, dt: number): { moving: boolean } {
  const K = FAUNA_KINDS[f.kind];
  f.clock += dt; f.t += dt; f.hurt += dt;
  if (f.love > 0) f.love = Math.max(0, f.love - dt);
  if (f.rest > 0) f.rest = Math.max(0, f.rest - dt);
  if (f.baby) { f.grow -= dt; if (f.grow <= 0) { f.baby = false; f.grow = 0; f.hp = FAUNA_KINDS[f.kind].hp; } } // cresceu: vida de adulto
  const b = f.body;
  let dirX = 0, dirZ = 0, speed = 0;
  const walkTo = (tx: number, tz: number, mps: number): void => {
    const dx = tx - b.x, dz = tz - b.z, d = Math.hypot(dx, dz);
    if (d < 1e-6) return;
    dirX = dx / d; dirZ = dz / d; speed = mps / WALK_REF; f.yaw = faunaYaw(dirX, dirZ);
  };
  if (f.phase === 'panic') {
    if (f.t >= PANIC_S) { f.home = { x: b.x, z: b.z }; f.pause = 0.8; f.phase = 'wander'; f.t = 0; }
    else {
      const away = Math.atan2(b.z - f.from.z, b.x - f.from.x) + (hash2(f.seed, Math.floor(f.clock * 1.4), 41) - 0.5) * 1.2; // foge sem linha reta perfeita: desvia um pouco a cada ~0,7 s
      walkTo(b.x + Math.cos(away) * 4, b.z + Math.sin(away) * 4, K.walk * K.panic);
    }
  } else if (f.pause > 0) { f.pause -= dt; f.stuck = 0; }
  else if (Math.hypot(b.x - f.goal.x, b.z - f.goal.z) < 0.4 || f.stuck > 5) { f.pause = 1.5 + 3 * hash2(f.seed, Math.floor(f.clock), 5); f.goal = pickGoal(f, vol); f.stuck = 0; }
  else { walkTo(f.goal.x, f.goal.z, K.walk); f.stuck += dt; }
  stepBody(vol, b, { dirX: dirX * speed, dirZ: dirZ * speed, jump: false }, dt);
  return { moving: speed > 0 && Math.hypot(b.vx, b.vz) > 0.05 };
}

/** Golpe levado: tira vida, entra em fuga (de onde veio o golpe) e devolve se morreu. */
export function hurtFauna(f: Fauna, damage: number, fromX: number, fromZ: number): { dead: boolean } {
  f.hp = Math.max(0, f.hp - Math.max(0, damage));
  f.hurt = 0; f.phase = 'panic'; f.t = 0; f.from = { x: fromX, z: fromZ };
  return { dead: f.hp <= 0 };
}

/** Caixa de acerto da Wiki em volta do animal: centrada nos pés (x, z), de y a y + altura. */
export const faunaBox = (f: Fauna): { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number } => {
  const K = FAUNA_KINDS[f.kind], k = f.baby ? BABY_SCALE : 1, h = (K.width * k) / 2;
  return { x0: f.body.x - h, y0: f.body.y, z0: f.body.z - h, x1: f.body.x + h, y1: f.body.y + K.height * k, z1: f.body.z + h };
};

/**
 * Animal na mira: o raio do olhar contra a caixa de acerto de cada animal até `reach` m, escondido por bloco mais perto (`blockDist`); vence o mais perto. Sem ajuda de mira: a caixa da Wiki é a regra.
 */
export function faunaAim(list: readonly Fauna[], ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, reach: number, blockDist = Infinity): { index: number; dist: number } | null {
  let best: { index: number; dist: number } | null = null;
  list.forEach((f, index) => {
    const bx = faunaBox(f);
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

/** Espólio por espécie (Wiki): porco 1–3 carne; vaca 0–2 couro e 1–3 carne; ovelha 1 lã e 1–2 carneiro; galinha 0–2 penas e 1 frango. `roll` = qualquer inteiro estável do abate. */
export function faunaLoot(kind: FaunaKind, seed: number, roll: number, baby = false): Array<{ item: number; count: number }> {
  if (baby) return []; // o filhote não solta nada (Wiki)
  const r = (i: number, lo: number, hi: number): number => lo + Math.floor(hash2(seed, roll, 700 + i) * (hi - lo + 1));
  const out: Array<{ item: number; count: number }> = [];
  const add = (item: number, count: number): void => { if (count > 0) out.push({ item, count }); };
  if (kind === 'porco') add(Item.PORCO_CRU, r(0, 1, 3));
  else if (kind === 'vaca') { add(Item.COURO, r(0, 0, 2)); add(Item.BOVINA_CRUA, r(1, 1, 3)); }
  else if (kind === 'ovelha') { add(Item.LA, 1); add(Item.CARNEIRO_CRU, r(0, 1, 2)); }
  else { add(Item.PENA, r(0, 0, 2)); add(Item.FRANGO_CRU, 1); }
  return out;
}

/** Pose das partes (rad): pernas em diagonais, cabeça que abaixa e sobe, asas da galinha batendo na fuga e recuo curto ao levar um golpe. Pura do estado. */
export interface FaunaPose { legs: [number, number, number, number]; headPitch: number; headYaw: number; wing: number; bob: number }
export function faunaPose(f: Fauna, moving: boolean): FaunaPose {
  const c = f.clock, flinch = f.hurt < 0.3 ? 1 - f.hurt / 0.3 : 0, panic = f.phase === 'panic';
  const w = c * (panic ? 13 : 7), amp = moving ? (panic ? 0.9 : 0.55) : 0;
  const s = Math.sin(w) * amp, o = -s;
  return {
    legs: [s, o, o, s], // frente-e, trás-e, frente-d, trás-d: o par em diagonal anda junto
    headPitch: (moving ? 0 : 0.1 + Math.sin(c * 1.3 + f.seed) * 0.18) - 0.4 * flinch, // parado, pasta: a cabeça desce e sobe
    headYaw: Math.sin(c * 0.9 + f.seed) * (moving ? 0.1 : 0.25),
    wing: panic && f.kind === 'galinha' ? 0.9 + Math.sin(c * 30) * 0.5 : 0,
    bob: moving ? Math.abs(Math.sin(w)) * 0.02 : 0,
  };
}

/** Vida máxima do animal (o filhote tem a metade, arredondada para cima). */
export const maxHp = (f: Fauna): number => (f.baby ? Math.ceil(FAUNA_KINDS[f.kind].hp / 2) : FAUNA_KINDS[f.kind].hp);

/** Cria um filhote parado entre os pais. */
export function newBaby(a: Fauna, b: Fauna, n: number): Fauna {
  const x = (a.body.x + b.body.x) / 2, z = (a.body.z + b.body.z) / 2;
  const f = newFauna({ id: `${a.id}~${n}`, kind: a.kind, x: Math.floor(x), y: a.body.y, z: Math.floor(z) }, a.seed);
  f.body.x = x; f.body.z = z; f.body.y = Math.max(a.body.y, b.body.y);
  f.baby = true; f.grow = GROW_S; f.hp = maxHp(f);
  return f;
}

export type FeedResult = { ok: true; effect: 'love' | 'grow' } | { ok: false; reason: 'food' | 'love' | 'rest' | 'full' };
/** Alimenta o animal com `item`. Filhote: corta 10 % do que falta para crescer. Adulto: entra em amor, se não está em amor nem descansando. Só consome a comida quem devolve `ok`. */
export function feedFauna(f: Fauna, item: number): FeedResult {
  if (!isBreedFood(f.kind, item)) return { ok: false, reason: 'food' };
  if (f.baby) { f.grow = Math.max(0, f.grow * (1 - GROW_FEED)); return { ok: true, effect: 'grow' }; }
  if (f.love > 0) return { ok: false, reason: 'love' };
  if (f.rest > 0) return { ok: false, reason: 'rest' };
  f.love = LOVE_S;
  return { ok: true, effect: 'love' };
}

/**
 * Passo da reprodução da lista: quem está em amor procura o parceiro da mesma espécie mais perto (até `MATE_RANGE` m) e vai até ele; ao se encostarem (`MATE_TOUCH`) nasce o filhote, os dois saem do amor
 * e descansam. O filhote segue o adulto da espécie mais perto quando está a mais de 2,5 m. Devolve os recém-nascidos (já na lista); com `MAX_FAUNA` animais, não nasce mais ninguém.
 */
export function tickBreeding(list: Fauna[], counter: { n: number }): Fauna[] {
  const born: Fauna[] = [];
  const dist = (a: Fauna, b: Fauna): number => Math.hypot(a.body.x - b.body.x, a.body.z - b.body.z);
  for (const a of list) {
    if (a.baby || a.love <= 0 || a.phase === 'panic') continue;
    let mate: Fauna | null = null;
    for (const b of list) if (b !== a && !b.baby && b.kind === a.kind && b.love > 0 && b.phase !== 'panic' && Math.abs(b.body.y - a.body.y) < 2 && (!mate || dist(a, b) < dist(a, mate))) mate = b;
    if (!mate || dist(a, mate) > MATE_RANGE) continue;
    if (dist(a, mate) <= MATE_TOUCH) {
      if (list.length + born.length >= MAX_FAUNA) continue;
      const baby = newBaby(a, mate, counter.n++);
      a.love = 0; mate.love = 0; a.rest = BREED_COOLDOWN_S; mate.rest = BREED_COOLDOWN_S;
      born.push(baby);
    } else { a.goal = { x: mate.body.x, z: mate.body.z }; a.pause = 0; a.stuck = 0; }
  }
  for (const f of list) {
    if (!f.baby) continue;
    let adult: Fauna | null = null;
    for (const b of list) if (!b.baby && b.kind === f.kind && dist(f, b) <= 12 && (!adult || dist(f, b) < dist(f, adult))) adult = b;
    if (adult && dist(f, adult) > 2.5) { f.goal = { x: adult.body.x, z: adult.body.z }; f.pause = 0; f.stuck = 0; }
  }
  list.push(...born);
  return born;
}
