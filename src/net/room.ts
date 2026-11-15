import { DAY_LENGTH_S, SUBDIV } from '../config';
import { type AnimalSave, Entities } from '../game/entities';
import { Player } from '../game/player';
import { GOBLIN_VISUALS, hasPoses } from '../game/monster';
import { Sheep } from '../game/sheep';
import type { Villager } from '../game/villager';
import { applyAction } from '../world/actions';
import { Block } from '../world/blocks';
import { toChunk } from '../world/coords';
import { ANIMAL_PRODUCE, breakDrops, type Drop, type ItemId, ITEMS, monsterDrops, pickDrops, type StackId } from '../world/items';
import { rescaleCellKey, rescaleChunkRecords, rescaleFactor, rescaleHoles, rescaleXY } from '../world/subdiv';
import { CHEST_SLOTS, World } from '../world/world';
import { fromB64, toB64 } from './b64';
import {
  type Applied, type ClientMessage, DEFAULT_APPEARANCE, type Grown, MAX_PLAYERS, type PlayerInfo, PROTOCOL_VERSION, type RoomBag, type RoomChunk,
  type ChestSlotsMsg, FACING_ORDER, type MobState, type RoomDrop, sanitizeName, type ServerMessage,
} from './protocol';

/** Mensagem a entregar: a um jogador, a todos, ou a todos menos um. */
export type Outgoing = { to: number | 'all' | { except: number }; msg: ServerMessage };

/** Hora do dia em que uma sala nova abre (manhã, como o jogo sozinho). */
export const ROOM_START_TIME = 0.31;
/** De quanto em quanto tempo a sala manda a hora a todos (s): corrige a diferença dos relógios dos aparelhos. */
export const TIME_SYNC_SECONDS = 30;
/** Versão do arquivo da sala no servidor (`RoomSnapshot`): 2 = baús; 3 = animais; 6 = blocos de 1/4 (4 níveis por célula; as v1–v5 têm cubos inteiros e convertem ao abrir, ADR 0033); 7 = 3 de cada animal na vila (a v6 ou menos é ajustada ao abrir, `reconcileVillageAnimals`). */
export const ROOM_SNAPSHOT_VERSION = 7;
/** Quanto tempo um item fica no chão da sala (s), como no jogo sozinho. */
export const DROP_LIFETIME = 300;
/** Distância máxima (células) entre o jogador e o item para pegar. */
const TAKE_REACH = 3;
/** De quanto em quanto tempo a sala manda os bichos perto de cada jogador (s). */
export const MOBS_EVERY = 0.1;
/** Raio (células) dos bichos mandados a cada jogador (um pouco além da tela). */
export const MOBS_RADIUS = 22;
/** Passo máximo da simulação dos bichos (s): servidor atrasado roda em passos curtos, sem atravessar paredes. */
const CREATURE_STEP = 0.1;
/** Raio (células) do mundo carregado em volta de cada jogador, para os bichos andarem por ali. */
const LOAD_RADIUS = 28;
/** Distância máxima (células) para dar comida a um animal. */
const FEED_REACH = 3;
/** Alcance (células) para conversar com um morador ou pedir que ele acompanhe (as lojas atendem do outro lado do balcão). */
export const TALK_REACH = 8;
/** Conversa aberta há mais que isto (s) solta o morador mesmo sem o aviso do jogador (fechou o jogo, caiu a rede). */
const TALK_MAX_SECONDS = 120;
const round2 = (v: number) => Math.round(v * 100) / 100;

/** O que o servidor grava em disco de uma sala: mundo (chunks editados), hora e bolsas por nome. */
export interface RoomSnapshot {
  v: number;
  room: number;
  seed: number;
  time: number;
  savedAt: number;
  chunks: RoomChunk[];
  bags: Record<string, RoomBag>;
  /** Conteúdo dos baús ("x,y" → espaços). */
  chests: Record<string, ChestSlotsMsg>;
  /** Animais da sala (v3): filhotes e crias ficam. Monstros não: renascem pela seed. */
  animals?: AnimalSave[];
  /** Buracos e há quantos segundos estão sem bloco (v4): `[x, y, segundos]`; ao fazer um dia inteiro ganham um chão vizinho. */
  holes?: Array<[number, number, number]>;
  /** Subdivisão da grade em que a sala foi gravada (v5, ADR 0032); ausente = 1. */
  sub?: number;
}

/**
 * A fotografia da sala na grade `to` (só aumenta: 1 → 2; `world/subdiv.ts`): chunks, baús, bichos e buracos acompanham; as bolsas não
 * mudam. Mesma grade devolve a própria fotografia; mais fina que `to` é erro.
 */
export function rescaleRoomSnapshot(s: RoomSnapshot, to: number): RoomSnapshot {
  const f = rescaleFactor(s.sub ?? 1, to);
  if (f === 1) return s;
  return {
    ...s,
    sub: to,
    chunks: rescaleChunkRecords(s.chunks ?? [], f),
    chests: Object.fromEntries(Object.entries(s.chests ?? {}).map(([k, v]) => [rescaleCellKey(k, f), v])),
    animals: s.animals?.map((a) => {
      const [x, y] = rescaleXY(a.x, a.y, f);
      const [hx, hy] = rescaleXY(a.hx, a.hy, f);
      return { ...a, x, y, hx, hy };
    }),
    holes: s.holes && rescaleHoles(s.holes, f),
  };
}

/** Chave da bolsa: o nome sem diferença de maiúsculas (Ana = ana). */
const bagKey = (name: string) => name.toLocaleLowerCase('pt-BR');

/**
 * Sala fixa (ADR 0016 + ADR 0020): um mundo autoritativo e compartilhado (`World` com a seed da sala), aberto a até
 * `MAX_PLAYERS` jogadores ao mesmo tempo, que entram e saem quando quiserem. Tudo o que muda no mundo fica na sala (e
 * vai para o disco pelo servidor, `snapshot`/`restore`); a bolsa de cada um fica guardada pelo nome.
 * Puro — sem rede nem relógio: recebe mensagens já lidas e devolve o que enviar; o servidor chama `tick(dt)`.
 */
export class Room {
  readonly world: World;
  private readonly players = new Map<number, PlayerInfo>();
  private nextId = 1;
  /** Hora do dia da sala (0..1): a mesma para todos os jogadores. */
  time = ROOM_START_TIME;
  /** Bolsas guardadas por nome (minúsculas). */
  private readonly bags = new Map<string, RoomBag>();
  private syncTimer = TIME_SYNC_SECONDS;
  /** Itens no chão da sala (com a hora em que caíram, em segundos de sala). */
  private readonly drops = new Map<number, RoomDrop & { born: number }>();
  private nextDropId = 1;
  private clock = 0;
  /** Algo mudou desde o último `snapshot` (o servidor só grava quando há o que gravar). */
  dirty = false;
  /** Blocos do 3º nível (aposentado) descartados no último `restore`; o servidor registra no log. */
  droppedOnRestore = 0;
  /**
   * Bichos da sala (Etapa 3): as mesmas `Entities` do jogo, sem personagem; cada jogador é um avatar na posição que
   * manda. Os animais e monstros nascem pela seed; não vão para o disco (renascem se o servidor reiniciar).
   */
  readonly entities: Entities;
  private readonly avatars = new Map<number, Player>();
  /** Quem está golpeando agora (para dar a morte a quem abateu). */
  private striker: number | null = null;
  private readonly mobIds = new WeakMap<object, number>();
  private nextMobId = 1;
  private mobTimer = 0;
  private growTimer = 0;
  /** Mensagens geradas pela simulação dos bichos (mordidas, números de dano, espólios), entregues no próximo retorno. */
  private pending: Outgoing[] = [];
  private hits: Array<[number, number, number, 0 | 1]> = [];

  constructor(readonly id: number, readonly name: string, readonly seed: number, private readonly rand: () => number = Math.random) {
    this.world = new World(seed);
    this.entities = new Entities(null, rand);
    const e = this.entities;
    e.onMonsterKilled = (m) => {
      if (this.striker !== null) this.pending.push({ to: this.striker, msg: { t: 'killed', k: m.kind } }); // quem abateu conta a morte (missões)
      const list = this.spawnDrops(m.x, m.y + 0.2, monsterDrops(m.kind, rand));
      if (list.length) this.pending.push({ to: 'all', msg: { t: 'drops', list } });
    };
    e.onDamage = (x, y, hit, target) => {
      if (target === 'enemy') this.hits.push([round2(x), round2(y), hit.amount, hit.crit ? 1 : 0]);
    };
    e.onBite = (target, m) => {
      for (const [pid, av] of this.avatars) {
        if (av === target) this.pending.push({ to: pid, msg: { t: 'bite', k: m.kind, x: round2(m.x), y: round2(m.y) } });
      }
    };
    // Campo dos animais e covil carregados antes de os bichos nascerem (o mundo do servidor só carrega o que se usa).
    const [gx, gy] = this.world.outsideGate();
    this.loadAround(gx, gy + 6, 24);
    const d = this.world.dungeon;
    if (d) this.loadRect(d.area.x0, d.area.y0, d.area.x1, d.area.y1);
    e.spawnWildlife(this.world, true);
    // Moradores (v26, ADR 0034): a sala os simula para todos (rotina, passeio, sorteados); conversa/loja/missão seguem no aparelho de cada um.
    this.loadPeopleAreas();
    e.spawnVillagers(this.world);
    e.spawnResidents(this.world);
  }

  /** Gera os chunks onde os moradores nascem e andam: a cidade, os cômodos (balcões) e a vila. */
  private loadPeopleAreas(): void {
    const w = this.world;
    if (w.town) this.loadRect(w.town.area.x0, w.town.area.y0, w.town.area.x1, w.town.area.y1);
    for (const l of w.interiors) this.loadRect(l.area.x0, l.area.y0, l.area.x1, l.area.y1);
    if (w.village) this.loadRect(w.village.area.x0, w.village.area.y0, w.village.area.x1, w.village.area.y1);
  }

  /** Carrega (gera) os chunks em volta de (x, y). */
  private loadAround(x: number, y: number, r: number): void {
    this.loadRect(x - r, y - r, x + r, y + r);
  }

  private loadRect(x0: number, y0: number, x1: number, y1: number): void {
    for (let cy = toChunk(Math.floor(y0)); cy <= toChunk(Math.floor(y1)); cy++) {
      for (let cx = toChunk(Math.floor(x0)); cx <= toChunk(Math.floor(x1)); cx++) if (!this.world.getChunk(cx, cy)) this.world.loadChunk(cx, cy);
    }
  }

  get size(): number {
    return this.players.size;
  }

  /** Pedido de entrada. Retorna o id do novo jogador e o que enviar (ou só um erro, para quem pediu). */
  join(hello: Extract<ClientMessage, { t: 'hello' }>): { id: number | null; out: Outgoing[] } {
    const fail = (code: Extract<ServerMessage, { t: 'error' }>['code'], message: string) => ({ id: null, out: [{ to: 0, msg: { t: 'error' as const, code, message } }] });
    if (hello.v !== PROTOCOL_VERSION || (hello.sub ?? 1) !== SUBDIV) return fail('version', 'Versão do jogo diferente da do servidor: recarregue a página.');
    const name = sanitizeName(hello.name);
    if (!name) return fail('name', 'Nome inválido: use de 2 a 16 letras ou números.');
    if (this.players.size >= MAX_PLAYERS) return fail('full', `${this.name} cheia (máximo ${MAX_PLAYERS} jogadores). Tente daqui a pouco.`);
    // A bolsa é guardada pelo nome: dois ao mesmo tempo com o mesmo nome dividiriam a bolsa.
    if ([...this.players.values()].some((p) => bagKey(p.name) === bagKey(name))) return fail('name', `Já tem alguém com o nome ${name} na sala: escolha outro.`);
    const id = this.nextId++;
    const player: PlayerInfo = { id, name, state: null, appearance: hello.appearance ?? DEFAULT_APPEARANCE };
    const others = [...this.players.values()];
    this.players.set(id, player);
    return {
      id,
      out: [
        {
          to: id,
          msg: {
            t: 'welcome', you: id, room: this.id, roomName: this.name, seed: this.seed, players: others,
            chunks: this.chunks(), time: this.time, bag: this.bags.get(bagKey(name)) ?? null,
            drops: [...this.drops.values()].map(({ id, item, x, y }) => ({ id, item, x, y })), chests: this.chestList(),
          },
        },
        { to: { except: id }, msg: { t: 'joined', player } },
      ],
    };
  }

  leave(id: number): Outgoing[] {
    if (!this.players.delete(id)) return [];
    this.releasePlayerVillagers(id); // antes de tirar o avatar: solta a conversa e manda quem o acompanhava de volta ao posto
    const av = this.avatars.get(id);
    if (av) {
      this.avatars.delete(id);
      this.entities.avatars.splice(this.entities.avatars.indexOf(av), 1);
    }
    return [{ to: 'all', msg: { t: 'left', id } }];
  }

  /** Moradores presos numa conversa (jogador → morador, quando começou) e quem tem uma conversa aberta há tempo demais é solto. */
  private readonly talks = new Map<number, { v: Villager; since: number }>();

  private releaseTalk(id: number): void {
    const t = this.talks.get(id);
    if (!t) return;
    this.talks.delete(id);
    if (![...this.talks.values()].some((o) => o.v === t.v)) t.v.freeze(false);
  }

  private releaseStaleTalks(): void {
    for (const [pid, t] of this.talks) if (this.clock - t.since > TALK_MAX_SECONDS) this.releaseTalk(pid);
  }

  /** O jogador saiu: solta a conversa dele e os moradores que o acompanhavam voltam ao posto. */
  private releasePlayerVillagers(id: number): void {
    this.releaseTalk(id);
    const av = this.avatars.get(id);
    for (const v of this.entities.villagers) {
      if (av && v.leader === av) { v.setCompanion(false); v.leader = null; }
    }
  }

  private villagerById(id: number): Villager | null {
    return this.entities.villagers.find((v) => this.mobIds.get(v) === id) ?? null;
  }

  private playerIdOf(av: object | null): number {
    if (av) for (const [pid, a] of this.avatars) if (a === av) return pid;
    return 0;
  }

  /** Mensagem de um jogador já na sala. Ações passam pelas regras do `World`; recusadas voltam só para quem mandou. */
  handle(id: number, m: ClientMessage): Outgoing[] {
    const p = this.players.get(id);
    if (!p) return [];
    if (m.t === 'state') {
      p.state = m.s;
      let av = this.avatars.get(id);
      if (!av) {
        av = new Player(m.s.x, m.s.y);
        this.avatars.set(id, av);
        this.entities.avatars.push(av);
      }
      av.x = m.s.x;
      av.y = m.s.y;
      av.facing = m.s.facing;
      av.moving = m.s.moving;
      return [{ to: { except: id }, msg: { t: 'state', id, s: m.s } }];
    }
    if (m.t === 'strike') {
      // A sala calcula o acerto com a posição que o jogador mandou: dano, recuo, morte e espólio valem para todos.
      const av = this.avatars.get(id);
      if (!av) return [];
      av.facing = m.facing;
      this.striker = id;
      try { this.entities.strikeFrom(av, m.facing, m.attack, this.world); } finally { this.striker = null; }
      return this.flush();
    }
    if (m.t === 'talk' || m.t === 'escort') {
      const av = this.avatars.get(id);
      const v = av ? this.villagerById(m.id) : null;
      if (!av || !v) return [];
      const close = Math.hypot(v.x - av.x, v.y - av.y) <= TALK_REACH;
      if (m.t === 'talk') {
        this.releaseTalk(id);
        if (m.on && close) { v.freeze(true); v.faceTo(av.x, av.y); this.talks.set(id, { v, since: this.clock }); }
        return [];
      }
      if (!m.on) { if (v.leader === av) { v.setCompanion(false); v.leader = null; } return []; }
      if (v.escorting && v.leader !== av) return [{ to: id, msg: { t: 'escort', id: m.id, ok: false } }]; // já está com outro jogador
      if (!close && v.leader !== av) return [{ to: id, msg: { t: 'escort', id: m.id, ok: false } }];
      v.leader = av;
      v.setCompanion(true);
      return [{ to: id, msg: { t: 'escort', id: m.id, ok: true } }];
    }
    if (m.t === 'feed') {
      const av = this.avatars.get(id);
      if (!av || !(m.item in ITEMS)) return [];
      const item = m.item as ItemId;
      const animal = this.entities.animals.find((a) => this.mobIds.get(a) === m.id);
      if (!animal || Math.hypot(animal.x - av.x, animal.y - av.y) > FEED_REACH || !animal.eats(item) || !animal.feed(av)) return [];
      const out: Outgoing[] = [{ to: id, msg: { t: 'fed', id: m.id, item } }];
      // O animal segue quem deu (o avatar) e solta o produto dele no chão da sala (vaca: leite; galinha: ovo).
      const product = ANIMAL_PRODUCE[animal.species];
      const list = product ? this.spawnDrops(animal.x, animal.y + 0.3, [{ item: product, count: 1 }]) : [];
      if (list.length) out.push({ to: 'all', msg: { t: 'drops', list } });
      return out;
    }
    if (m.t === 'bag') {
      this.bags.set(bagKey(p.name), m.bag);
      this.dirty = true;
      return [];
    }
    if (m.t === 'action') {
      const a = m.a;
      // O que vai cair no chão é decidido aqui (a sala manda nos itens): lido antes de a ação mudar o mapa.
      const breaking = a.kind === 'break' ? this.world.breakTargetId(a.x, a.y) : null;
      const chestLoot: Drop[] = a.kind === 'break'
        ? (this.world.chestAt(a.x, a.y) ?? []).filter((c) => c !== null).map((c) => ({ item: c!.item as StackId, count: c!.count }))
        : [];
      const wasChest = a.kind === 'break' && this.world.getObject(a.x, a.y) === Block.CHEST;
      if (!applyAction(this.world, a)) return [{ to: id, msg: { t: 'rejected', seq: m.seq } }];
      this.dirty = true;
      const applied: Applied = { by: id, action: a };
      const out: Outgoing[] = [{ to: 'all', msg: { t: 'applied', ...applied } }];
      let loot: Drop[] = [];
      if (a.kind === 'break' && breaking !== null) {
        loot = [...(wasChest ? chestLoot : []), ...breakDrops(a.tool, breaking, this.world.profile.collectBlocks, this.rand, { seed: this.world.seed, x: a.x, y: a.y })];
      }
      if (a.kind === 'pick') loot = pickDrops(this.rand);
      const list = this.spawnDrops(a.x + 0.5, a.y + 0.7, loot);
      if (list.length) out.push({ to: 'all', msg: { t: 'drops', list } });
      return out;
    }
    if (m.t === 'take') {
      const d = this.drops.get(m.id);
      const s = p.state;
      // Quem pede primeiro leva (o segundo pedido não acha mais o item); só perto do item.
      if (!d || !s || Math.hypot(s.x - d.x, s.y - d.y) > TAKE_REACH) return [];
      this.drops.delete(m.id);
      return [{ to: 'all', msg: { t: 'taken', id: m.id, by: id } }];
    }
    if (m.t === 'chest') {
      // Baú existe nesta célula: o conteúdo novo vale para todos (o último a mexer vence).
      if (this.world.getObject(m.x, m.y) !== Block.CHEST || m.slots.length !== CHEST_SLOTS) return [];
      this.world.chests.set(`${m.x},${m.y}`, m.slots.map((s) => (s ? { ...s } : null)));
      this.dirty = true;
      return [{ to: { except: id }, msg: { t: 'chest', x: m.x, y: m.y, slots: m.slots } }];
    }
    return [];
  }

  /**
   * Passa o tempo da sala (o servidor chama ~1×/s, com gente ou sem): avança a hora e faz plantas e árvores crescerem
   * (a sala decide; os aparelhos só aplicam). Com jogadores, manda o crescimento e, de tempos em tempos, a hora.
   */
  tick(dt: number): Outgoing[] {
    this.time = (this.time + dt / DAY_LENGTH_S) % 1;
    this.clock += dt;
    for (const [k, d] of this.drops) if (this.clock - d.born > DROP_LIFETIME) this.drops.delete(k); // os aparelhos somem sozinhos também
    const out: Outgoing[] = [];
    // Plantas: de segundo em segundo (o servidor chama `tick` ~10×/s por causa dos bichos).
    this.growTimer += dt;
    if (this.growTimer >= 1) {
      const cells: Grown[] = [];
      this.world.tick(this.growTimer, this.rand, true, (x, y, id) => cells.push([x, y, id]));
      this.growTimer = 0;
      if (cells.length) {
        this.dirty = true;
        out.push({ to: 'all', msg: { t: 'grow', cells } });
      }
    }
    // Bichos: só com gente na sala (sem ninguém, ficam parados onde estão). Andaram: a sala tem o que gravar.
    if (this.players.size) {
      this.dirty = true;
      for (const av of this.avatars.values()) this.loadAround(av.x, av.y, LOAD_RADIUS);
      this.entities.time = this.time; // a rotina dos moradores segue a hora da sala
      this.releaseStaleTalks();
      for (let left = dt; left > 1e-6; left -= CREATURE_STEP) this.entities.update(Math.min(CREATURE_STEP, left), this.world);
      out.push(...this.flush());
      this.mobTimer -= dt;
      if (this.mobTimer <= 0) {
        this.mobTimer = MOBS_EVERY;
        for (const [pid, av] of this.avatars) out.push({ to: pid, msg: { t: 'mobs', list: this.mobsNear(av.x, av.y) } });
      }
    }
    this.syncTimer -= dt;
    if (this.syncTimer <= 0) {
      this.syncTimer = TIME_SYNC_SECONDS;
      out.push({ to: 'all', msg: { t: 'time', time: this.time } });
    }
    return this.players.size ? out : [];
  }

  /** Mensagens que a simulação dos bichos gerou (mordidas, espólios e números de dano). */
  private flush(): Outgoing[] {
    const out = this.pending;
    this.pending = [];
    if (this.hits.length) {
      out.push({ to: 'all', msg: { t: 'hits', list: this.hits } });
      this.hits = [];
    }
    return out;
  }

  private mobId(o: object): number {
    let id = this.mobIds.get(o);
    if (id === undefined) {
      id = this.nextMobId++;
      this.mobIds.set(o, id);
    }
    return id;
  }

  /** Bichos (e efeitos: mortes e coraçõezinhos) a até `MOBS_RADIUS` de (x, y), no formato curto da rede. */
  mobsNear(x: number, y: number): MobState[] {
    const near = (o: { x: number; y: number }) => Math.abs(o.x - x) <= MOBS_RADIUS && Math.abs(o.y - y) <= MOBS_RADIUS;
    const list: MobState[] = [];
    const e = this.entities;
    for (const a of e.animals) {
      if (!near(a)) continue;
      const s: MobState = { i: this.mobId(a), k: a instanceof Sheep ? 'sheep' : a.species, x: round2(a.x), y: round2(a.y), f: FACING_ORDER.indexOf(a.facing) };
      if (a.moving) s.m = 1;
      if (a.baby) s.b = 1;
      if (a.inLove && a.courtship <= 0) s.l = 1;
      if (a.canEat) s.e = 1;
      list.push(s);
    }
    for (const v of e.villagers) {
      if (v.hidden || !near(v)) continue; // quem dorme sai da lista (o espelho some com ele)
      const s: MobState = { i: this.mobId(v), k: `npc-${v.npc}`, x: round2(v.x), y: round2(v.y), f: FACING_ORDER.indexOf(v.facing) };
      if (v.moving) s.m = 1;
      if (v.resident) s.u = v.resident.id;
      if (v.fade > 0) s.a = round2(v.fade);
      const g = this.playerIdOf(v.leader as object | null);
      if (g) s.g = g;
      list.push(s);
    }
    for (const m of e.monsters) {
      if (!near(m)) continue;
      const s: MobState = { i: this.mobId(m), k: m.kind, x: round2(m.x), y: round2(m.y), f: FACING_ORDER.indexOf(m.facing) };
      if (m.moving) s.m = 1;
      if (m.hp < m.maxHp) s.p = round2(Math.max(0, m.hp / m.maxHp));
      if (m.hurt > 0) s.h = 1;
      if (hasPoses(m.kind)) {
        s.v = GOBLIN_VISUALS.indexOf(m.visualState);
        s.r = m.visualFrame;
      }
      list.push(s);
    }
    for (const d of e.dying) {
      if (near(d)) list.push({ i: 0, k: d.kind, x: round2(d.x), y: round2(d.y), f: FACING_ORDER.indexOf(d.facing), d: round2(d.t) });
    }
    for (const a of e.actors) {
      if (a.kind === 'love-hearts' && near(a)) list.push({ i: 0, k: a.kind, x: round2(a.x), y: round2(a.y), f: 0, r: a.frame, s: a.scale });
    }
    return list;
  }

  /** Itens no chão: um por unidade, espalhados um pouco em volta de (x, y) (como `Drops.spawn` no jogo). */
  private spawnDrops(x: number, y: number, loot: Drop[]): RoomDrop[] {
    const list: RoomDrop[] = [];
    for (const d of loot) {
      for (let i = 0; i < d.count; i++) {
        const drop = { id: this.nextDropId++, item: d.item, x: x + (this.rand() - 0.5) * 0.6, y: y + (this.rand() - 0.5) * 0.4 };
        this.drops.set(drop.id, { ...drop, born: this.clock });
        list.push(drop);
      }
    }
    return list;
  }

  /** Baús da sala com conteúdo (os vazios nascem vazios em qualquer aparelho). */
  private chestList(): Array<{ x: number; y: number; slots: ChestSlotsMsg }> {
    return [...this.world.chests.entries()].map(([k, slots]) => {
      const [x, y] = k.split(',').map(Number);
      return { x, y, slots };
    });
  }

  /** Mundo da sala como está: os chunks editados (o resto vem da seed). */
  private chunks(): RoomChunk[] {
    return this.world.modifiedChunks().map((c) => ({ cx: c.cx, cy: c.cy, ground: toB64(c.ground), levels: c.levels.map(toB64) }));
  }

  /** Fotografia para o disco (o servidor grava quando `dirty`). */
  snapshot(): RoomSnapshot {
    this.dirty = false;
    return {
      v: ROOM_SNAPSHOT_VERSION, room: this.id, seed: this.seed, time: this.time, savedAt: Date.now(),
      chunks: this.chunks(), bags: Object.fromEntries(this.bags),
      chests: Object.fromEntries(this.world.chests),
      animals: this.entities.saveAnimals(),
      holes: this.world.holeAges(),
      sub: SUBDIV,
    };
  }

  /** Recarrega o que o servidor gravou (só se for desta sala e desta seed; senão, a sala começa do zero). */
  restore(snap: RoomSnapshot): boolean {
    // v1 (sem baús) ainda vale: o mundo e as bolsas voltam; os baús ficam vazios.
    if (!snap || ![1, 2, 3, 4, 5, 6, ROOM_SNAPSHOT_VERSION].includes(snap.v) || snap.room !== this.id || snap.seed !== this.seed) return false;
    // Gravada numa grade mais fina que a deste pacote: não se abre (e o servidor guarda cópia antes de regravar); mais grossa: converte.
    if ((snap.sub ?? 1) > SUBDIV) return false;
    const s = rescaleRoomSnapshot(snap, SUBDIV);
    let dropped = 0;
    for (const c of s.chunks) dropped += this.world.restoreChunk(c.cx, c.cy, fromB64(c.ground), c.levels.map(fromB64));
    this.droppedOnRestore = dropped;
    this.world.settleWater();
    this.world.loadHoleAges(s.holes);
    if (Number.isFinite(s.time)) this.time = ((s.time % 1) + 1) % 1;
    for (const [k, bag] of Object.entries(s.bags ?? {})) this.bags.set(k, bag);
    for (const [k, slots] of Object.entries(s.chests ?? {})) {
      const [x, y] = k.split(',').map(Number);
      if (this.world.getObject(x, y) === Block.CHEST && Array.isArray(slots) && slots.length === CHEST_SLOTS) this.world.chests.set(k, slots);
    }
    // Animais (v3): sem a lista (arquivo antigo), ficam os nascidos pela seed.
    if (Array.isArray(s.animals)) {
      for (const a of s.animals) if (Number.isFinite(a?.x) && Number.isFinite(a?.y) && Math.abs(a.x) + Math.abs(a.y) < 2 ** 30) this.loadAround(a.x, a.y, 4);
      this.entities.restoreAnimals(s.animals, this.world);
      // Salas gravadas antes da v0.93.106 (snapshot < 7): a vila passa a ter 3 de cada animal (e o cavalo do campo sai); regrava na próxima.
      if (snap.v < 7) {
        const fix = this.entities.reconcileVillageAnimals(this.world);
        if (fix.removed > 0 || fix.spawned > 0) this.dirty = true;
      }
    }
    // Player-edited chunks can replace a generated campfire from this seed.
    // Never keep a camp of goblins around an absent fire after restoring.
    this.entities.reconcileGoblinCamps(this.world);
    this.dirty = this.dirty || dropped > 0; // descartou algo ou migrou a vila: a próxima gravação já grava a sala limpa
    return true;
  }
}
