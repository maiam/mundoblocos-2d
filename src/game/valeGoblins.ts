import { mulberry32 } from '../world/random';
import { valeGoblinCamps } from '../world/sanctuaryValeGoblin';
import type { World } from '../world/world';
import { Walker } from './walker';

/** O que o renderer precisa de cada goblin a cada quadro (posição dos pés em células, direção e pose; todas as misturas de 0 a 1, ver `GoblinPoseParams`). */
export interface GoblinView {
  id: number;
  x: number;
  y: number;
  /** Altura dos pés (células). */
  z: number;
  /** Giro em y (rad): a frente do modelo (+z) aponta para (sen yaw, cos yaw) em (x leste, y sul). */
  yaw: number;
  /** 0 parado … 1 em movimento (suave). */
  walk: number;
  /** 0 caminhada … 1 corrida. */
  run: number;
  /** Fase do ciclo de passada (rad), avança com a distância andada. */
  phase: number;
  sit: number;
  stoke: number;
  talk: number;
  /** Giro da cabeça em relação ao corpo (rad). */
  look: number;
  /** Postura de luta (0 … 1), golpe de adaga (progresso 0 … 1; −1 = sem golpe), defesa (0 … 1) e segundos desde o choque das adagas (−1 = sem faíscas). */
  fight: number;
  swing: number;
  parry: number;
  spark: number;
  /** Paleta de roupa (0 = a original do modelo; ver `GOBLIN_STYLES` no renderer). */
  style: number;
}

/** Paleta de roupa de cada posição do acampamento (0 = original): cerca de metade dos goblins veste a cor original e os outros usam uma de 4 paletas (`GOBLIN_STYLES` no renderer). */
const STYLE_OF = [0, 1, 0, 2, 0, 3, 4];

/** Quanto cada goblin se afasta do ponto de nascimento (células). */
const ROAM = 4;
const WALK_SPEED = 0.7;
const RUN_SPEED = 2.1;
/** Células andadas por ciclo de passada (caminhada e corrida): ver `WALK_CYCLE_CELLS`/`RUN_CYCLE_CELLS` no renderer. */
const WALK_CYCLE = 1.2;
const RUN_CYCLE = 2.3;
/** Distância da fogueira de onde o goblin a cutuca e distância de conversa entre dois goblins (células). */
const STOKE_DIST = 1.1;
const CHAT_DIST = 1.15;

/** Menor diferença de ângulos, em (−π, π]. */
function angleDiff(a: number, b: number): number {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}
const smooth = (cur: number, target: number, rate: number, dt: number): number => cur + (target - cur) * (1 - Math.exp(-rate * dt));

/** O que o goblin está fazendo. `walk` = indo a um ponto (para depois sentar, cutucar a fogueira ou conversar); `wait` = esperando um visitante que vem conversar. */
type Mode = 'idle' | 'walk' | 'sit' | 'stoke' | 'chat' | 'wait' | 'duel' | 'practice';
type Arrive = 'none' | 'sit' | 'stoke' | 'chat' | 'duel';
/** Duração de um golpe de treino (s) e instantes (fração) do impacto e da defesa: ver `SWING_*` no renderer. */
const SWING_TIME = 1.4;
const HIT = 0.5;
const DUEL_DIST = 1.3;

/**
 * Um goblin do Vale (v0.93.161; vida social na v0.93.165): vive em volta da fogueira. Parado olha para ela e espia em volta; de vez em quando caminha (às vezes corre) até um ponto a até
 * `ROAM` células do nascimento, senta no chão perto da fogueira, agacha para mexer nela ou vai conversar com um vizinho (os dois se viram, se alternam falando e ouvindo). Não sobe degraus
 * (`stepHeight` 0) e para se bater em algo. Estende `Walker`: a colisão com o mapa é sempre `World.standHeight`. Determinístico pelo sorteio da semente (sem `Math.random`).
 */
export class ValeGoblin extends Walker {
  yaw: number;
  phase = 0;
  /** Misturas de pose (suaves). */
  walkBlend = 0;
  runBlend = 0;
  sitBlend = 0;
  stokeBlend = 0;
  talkBlend = 0;
  fightBlend = 0;
  swing = -1;
  parry = 0;
  spark = -1;
  look = 0;
  mode: Mode = 'idle';
  /** Paleta de roupa (veja `STYLE_OF`). */
  style = 0;
  /** Os outros goblins (preenchido por `ValeGoblins`), para escolher com quem conversar e não lotar a fogueira. */
  crew: readonly ValeGoblin[] = [];
  private timer: number;
  private tx = 0;
  private ty = 0;
  private arrive: Arrive = 'none';
  private running = false;
  private speedNow = 0;
  private stuck = 0;
  private partner: ValeGoblin | null = null;
  private speaking = false;
  /** Quem puxou a conversa (a que veio caminhando) conduz a alternância de falas. */
  private leads = false;
  private speakTimer = 0;
  private lookTarget = 0;
  private lookTimer = 1;
  /** Relógio do treino (s): o de quem puxa o duelo vale para os dois; o de quem treina sozinho vale só para ele. */
  private fightClock = 0;
  private readonly rand: () => number;

  constructor(readonly id: number, readonly homeX: number, readonly homeY: number, readonly fireX: number, readonly fireY: number, seed: number) {
    super(homeX, homeY, { speed: WALK_SPEED, halfW: 0.2, halfD: 0.15, stepHeight: 0 });
    this.rand = mulberry32(seed ^ (id * 0x9e3779b1));
    this.yaw = Math.atan2(fireX - homeX, fireY - homeY);
    this.timer = 0.5 + this.rand() * 2.5;
  }

  get busy(): boolean { return this.mode !== 'idle' || this.sitBlend > 0.15 || this.stokeBlend > 0.15 || this.fightBlend > 0.15; }
  /** Com quem conversa ou duela agora (ou espera). */
  get mate(): ValeGoblin | null { return this.partner; }
  get chatting(): boolean { return this.mode === 'chat' || this.mode === 'wait' || this.mode === 'duel'; }

  /** O ponto (x, y) é pisável no mesmo nível e perto do nascimento? */
  private reachable(x: number, y: number, world: World, slack = 0.3): boolean {
    const h = world.standHeight(Math.floor(x), Math.floor(y));
    return h !== null && h === this.z && Math.hypot(x - this.homeX, y - this.homeY) <= ROAM + slack;
  }

  private goTo(x: number, y: number, arrive: Arrive, run: boolean): void {
    this.tx = x; this.ty = y; this.arrive = arrive; this.running = run; this.mode = 'walk'; this.stuck = 0;
  }

  /** Escolhe um destino pisável perto do nascimento; sem achar, fica parado mais um tempo. */
  private pickWander(world: World): boolean {
    for (let k = 0; k < 8; k++) {
      const a = this.rand() * Math.PI * 2, r = 1.2 + this.rand() * (ROAM - 1.2);
      const tx = this.homeX + Math.cos(a) * r, ty = this.homeY + Math.sin(a) * r;
      if (this.reachable(tx, ty, world, 0)) { this.goTo(tx, ty, 'none', r > 2.6 && this.rand() < 0.45); return true; }
    }
    return false;
  }

  /** Vai até o ponto da roda (perto do nascimento, de frente para a fogueira) e senta. */
  private pickSit(world: World): boolean {
    if (!this.reachable(this.homeX, this.homeY, world)) return false;
    this.goTo(this.homeX, this.homeY, 'sit', Math.hypot(this.homeX - this.x, this.homeY - this.y) > 3);
    return true;
  }

  /** Vai até a fogueira (a no máximo 1 goblin por vez) e agacha para mexer nela. */
  private pickStoke(world: World): boolean {
    if (this.crew.some((o) => o !== this && (o.mode === 'stoke' || (o.mode === 'walk' && o.arrive === 'stoke')))) return false;
    const dx = this.homeX - this.fireX, dy = this.homeY - this.fireY, d = Math.hypot(dx, dy) || 1;
    const tx = this.fireX + (dx / d) * STOKE_DIST, ty = this.fireY + (dy / d) * STOKE_DIST;
    if (!this.reachable(tx, ty, world)) return false;
    this.goTo(tx, ty, 'stoke', false);
    return true;
  }

  /** Chama um vizinho livre e perto para conversar: vai até ele; ele espera virado para cá. */
  private pickChat(world: World, kind: 'chat' | 'duel' = 'chat'): boolean {
    const dist = kind === 'duel' ? DUEL_DIST : CHAT_DIST;
    let best: ValeGoblin | null = null, bd = 7;
    for (const o of this.crew) {
      if (o === this || o.busy || o.partner) continue;
      const d = Math.hypot(o.x - this.x, o.y - this.y);
      if (d < bd && d > dist) { best = o; bd = d; }
    }
    if (!best) return false;
    const dx = this.x - best.x, dy = this.y - best.y, d = Math.hypot(dx, dy);
    const tx = best.x + (dx / d) * dist, ty = best.y + (dy / d) * dist;
    if (!this.reachable(tx, ty, world)) return false;
    this.partner = best; this.leads = true;
    best.partner = this; best.leads = false;
    best.mode = 'wait';
    best.timer = 14;
    this.goTo(tx, ty, kind, d > 3.5 && this.rand() < 0.3);
    return true;
  }

  /** Treina golpes sozinho, de frente para a fogueira. */
  private startPractice(): boolean {
    this.mode = 'practice'; this.timer = 3.5 + this.rand() * 3; this.fightClock = 0;
    return true;
  }

  private endChat(): void {
    const o = this.partner;
    this.partner = null;
    this.speaking = false;
    this.leads = false;
    if (this.mode === 'chat' || this.mode === 'wait' || this.mode === 'duel') { this.mode = 'idle'; this.timer = 1.5 + this.rand() * 3; }
    if (o && o.partner === this) o.endChat();
  }

  private decide(world: World): void {
    const r = this.rand();
    let done = false;
    if (r < 0.22) done = this.pickWander(world);
    else if (r < 0.40) done = this.pickSit(world);
    else if (r < 0.52) done = this.pickStoke(world);
    else if (r < 0.72) done = this.pickChat(world) || this.pickWander(world);
    else if (r < 0.88) done = this.pickChat(world, 'duel') || this.startPractice();
    else if (r < 0.96) done = this.startPractice();
    if (!done) this.timer = 1.2 + this.rand() * 2.5;
  }

  private turnToward(x: number, y: number, rate: number, dt: number): void {
    const d = angleDiff(Math.atan2(x - this.x, y - this.y), this.yaw);
    this.yaw += d * (1 - Math.exp(-rate * dt));
  }

  update(dt: number, world: World): void {
    let moved = 0;
    let targetSpeed = 0;
    let wantSit = 0, wantStoke = 0, wantTalk = 0, wantFight = 0;
    this.swing = -1; this.parry = 0; this.spark = -1;
    const fireYaw = (): void => this.turnToward(this.fireX, this.fireY, 4, dt);
    switch (this.mode) {
      case 'idle':
        fireYaw();
        this.timer -= dt;
        if (this.timer <= 0 && this.sitBlend < 0.2 && this.stokeBlend < 0.2) this.decide(world);
        break;
      case 'sit':
        wantSit = 1; fireYaw();
        this.timer -= dt;
        if (this.timer <= 0) { this.mode = 'idle'; this.timer = 0.9 + this.rand() * 1.5; }
        break;
      case 'stoke':
        wantStoke = 1; this.turnToward(this.fireX, this.fireY, 6, dt);
        this.timer -= dt;
        if (this.timer <= 0) { this.mode = 'idle'; this.timer = 0.9 + this.rand() * 2; }
        break;
      case 'wait':
        if (this.partner) this.turnToward(this.partner.x, this.partner.y, 5, dt);
        this.timer -= dt;
        if (this.timer <= 0 || !this.partner) this.endChat();
        break;
      case 'chat': {
        const o = this.partner;
        if (!o) { this.endChat(); break; }
        this.turnToward(o.x, o.y, 5, dt);
        this.timer -= dt;
        if (this.leads) {
          this.speakTimer -= dt;
          if (this.speakTimer <= 0) { this.speaking = !this.speaking; this.speakTimer = 1.8 + this.rand() * 2.2; }
        } else this.speaking = !o.speaking;
        wantTalk = this.speaking ? 1 : 0.3;
        if (this.timer <= 0) this.endChat();
        break;
      }
      case 'practice':
        wantFight = 1; fireYaw();
        this.fightClock += dt;
        this.swing = (this.fightClock % SWING_TIME) / SWING_TIME;
        this.timer -= dt;
        if (this.timer <= 0) { this.mode = 'idle'; this.timer = 1 + this.rand() * 2; }
        break;
      case 'duel': {
        const o = this.partner;
        if (!o) { this.endChat(); break; }
        wantFight = 1; this.turnToward(o.x, o.y, 6, dt);
        if (this.leads) this.fightClock += dt;
        const T = this.leads ? this.fightClock : o.fightClock;
        const k = Math.floor(T / SWING_TIME), u = T / SWING_TIME - k;
        const attacker = (k % 2 === 0) === this.leads;
        if (attacker) { this.swing = u; if (u >= HIT) this.spark = (u - HIT) * SWING_TIME; } else this.parry = Math.max(0, 1 - Math.abs(u - 0.55) / 0.2);
        this.timer -= dt;
        if (this.timer <= 0) this.endChat();
        break;
      }
      case 'walk': {
        const dx = this.tx - this.x, dy = this.ty - this.y;
        const dist = Math.hypot(dx, dy);
        const slow = Math.min(1, 0.35 + dist / 1.2); // freia ao chegar
        targetSpeed = (this.running ? RUN_SPEED : WALK_SPEED) * slow;
        if (dist < 0.2) {
          const a = this.arrive;
          this.mode = 'idle'; this.timer = 1.2 + this.rand() * 3; targetSpeed = 0;
          if (a === 'sit') { this.mode = 'sit'; this.timer = 7 + this.rand() * 10; }
          else if (a === 'stoke') { this.mode = 'stoke'; this.timer = 4 + this.rand() * 3.5; }
          else if (a === 'chat' && this.partner) {
            this.mode = 'chat'; this.timer = 6 + this.rand() * 6; this.speaking = true; this.speakTimer = 1.8 + this.rand() * 2;
            this.partner.mode = 'chat'; this.partner.timer = this.timer;
          } else if (a === 'duel' && this.partner) {
            this.mode = 'duel'; this.timer = 8 + this.rand() * 5; this.fightClock = 0;
            this.partner.mode = 'duel'; this.partner.timer = this.timer;
          } else if (a === 'chat' || a === 'duel') this.endChat();
          break;
        }
        this.spec.speed = this.speedNow = smooth(this.speedNow, targetSpeed, 5, dt);
        moved = this.move(dt, dx / dist, dy / dist, world);
        this.turnToward(this.tx, this.ty, this.running ? 9 : 7, dt);
        this.stuck = moved < this.speedNow * dt * 0.25 ? this.stuck + dt : 0;
        if (this.stuck > 0.6) { if (this.partner) this.endChat(); this.mode = 'idle'; this.timer = 0.8 + this.rand() * 2; }
        break;
      }
    }
    if (this.mode !== 'walk') {
      this.speedNow = smooth(this.speedNow, 0, 7, dt);
      this.spec.speed = Math.max(this.speedNow, 0.01);
      this.move(dt, 0, 0, world);
    }
    this.phase += (moved / (this.runBlend > 0.5 ? RUN_CYCLE : WALK_CYCLE)) * Math.PI * 2;
    const sp = this.speedNow;
    this.walkBlend = smooth(this.walkBlend, moved > 0 ? Math.min(1, sp / 0.55) : 0, 9, dt);
    this.runBlend = smooth(this.runBlend, sp > 1.0 ? Math.min(1, (sp - 1.0) / 0.8) : 0, 6, dt);
    this.sitBlend = smooth(this.sitBlend, wantSit, 3.2, dt);
    this.stokeBlend = smooth(this.stokeBlend, wantStoke, 3.2, dt);
    this.talkBlend = smooth(this.talkBlend, wantTalk, 5, dt);
    this.fightBlend = smooth(this.fightBlend, wantFight, 5, dt);
    // olhar: em conversa, para o parceiro (o corpo já está virado); no resto, espia em volta de vez em quando
    this.lookTimer -= dt;
    if (this.lookTimer <= 0) { this.lookTimer = 1.5 + this.rand() * 3.5; this.lookTarget = this.mode === 'idle' || this.mode === 'sit' ? (this.rand() - 0.5) * 1.6 : 0; }
    this.look = smooth(this.look, this.mode === 'walk' || this.mode === 'stoke' || this.chatting || this.mode === 'practice' ? 0 : this.lookTarget, 3, dt);
  }

  /** Empurra de leve (separação entre goblins). */
  nudge(ix: number, iy: number, dt: number, world: World): void {
    this.spec.speed = 0.5;
    this.move(dt, ix, iy, world);
  }

  view(): GoblinView {
    return {
      id: this.id, x: this.x, y: this.y, z: this.visualZ, yaw: this.yaw, walk: this.walkBlend, run: this.runBlend, phase: this.phase,
      sit: this.sitBlend, stoke: this.stokeBlend, talk: this.talkBlend, look: this.look,
      fight: this.fightBlend, swing: this.swing, parry: this.parry, spark: this.spark, style: this.style,
    };
  }
}

/** Os 28 goblins do Vale Goblin — 7 em volta de cada uma das 4 fogueiras (só no Santuário). Só andam os que estão em chunks carregados; cada acampamento vive por conta própria (conversa, duelo e fogueira só entre os 7 dele). */
export class ValeGoblins {
  readonly goblins: ValeGoblin[];
  private readonly list: GoblinView[] = [];

  constructor(world: World, seed = 0x60b11) {
    this.goblins = [];
    valeGoblinCamps().forEach((camp, ci) => {
      const crew = camp.homes.map(([x, y], k) => {
        const g = new ValeGoblin(this.goblins.length + k, x, y, camp.fire[0], camp.fire[1], seed);
        g.style = STYLE_OF[(ci * 3 + k) % STYLE_OF.length];
        g.z = world.standHeight(Math.floor(g.x), Math.floor(g.y)) ?? 0; // nascem em cima do chão do vale (o degrau 0 não os faria subir)
        g.visualZ = g.z / world.cubeLevels;
        return g;
      });
      for (const g of crew) g.crew = crew;
      this.goblins.push(...crew);
    });
  }

  private active(g: ValeGoblin, world: World): boolean {
    return !!world.getChunk(Math.floor(g.x / 16), Math.floor(g.y / 16));
  }

  update(dt: number, world: World): void {
    const on = this.goblins.filter((g) => this.active(g, world));
    for (const g of on) g.update(dt, world);
    // separação: dois goblins nunca ficam um dentro do outro (menos quem está conversando de frente ou sentado)
    for (let i = 0; i < on.length; i++) {
      for (let j = i + 1; j < on.length; j++) {
        const a = on[i], b = on[j];
        if ((a.chatting && b.chatting) || a.sitBlend > 0.5 || b.sitBlend > 0.5) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d >= 0.55) continue;
        const ux = d > 1e-3 ? dx / d : 1, uy = d > 1e-3 ? dy / d : 0;
        a.nudge(-ux, -uy, dt, world);
        b.nudge(ux, uy, dt, world);
      }
    }
  }

  /** Visões para o renderer (a lista é reaproveitada a cada chamada). */
  views(world: World): readonly GoblinView[] {
    this.list.length = 0;
    for (const g of this.goblins) if (this.active(g, world)) this.list.push(g.view());
    return this.list;
  }
}
