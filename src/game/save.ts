import { isOpenWorldMonster, type MonsterKind } from '../world/dungeon';
import { SUBDIV } from '../config';
import { rescaleCell, rescaleChunkRecords, rescaleExplored, rescaleFactor, rescaleHoles, rescaleXY } from '../world/subdiv';
import { BASE_STATS, HUNGER, MONSTER_STATS } from '../world/progression';
import type { StackId } from '../world/items';
import { Block, isRemovedStack } from '../world/blocks';
import { fromB64, toB64 } from '../net/b64';
import { startingGrid } from './hotbar';
import type { WorldId } from '../world/profiles';
import type { World } from '../world/world';
import { type Entities, HERO_BODIES, type HeroBody } from './entities';
import type { Inventory } from './inventory';
import { Monster } from './monster';
import type { Player } from './player';
import { Sheep } from './sheep';
import type { Facing } from './walker';
import type { Exploration } from './exploration';
import { type MemoryBook, sanitizeBook } from './npcBrain/memory';
import { Item } from '../world/items';
import { EMPTY_LOG, type MissionLog, sanitizeMissions } from './npcBrain/missions';
import { type QuestLog, sanitizeLog } from './npcBrain/quests';

/**
 * Salvamento automático no navegador (Fase 2). Salva só o que a seed não reconstrói:
 * chunks editados, personagem, inventário, ovelhas, monstros da dungeon e a hora do dia.
 * Estado do mundo continua tendo o `World` como fonte de verdade; aqui só se copia e se restaura.
 * Contas e mundos na nuvem dependem do backend do Orvalis (repositório separado, ADR 0015) — nada de backend aqui.
 */

/** Versão do formato; mudar ao alterar a estrutura (e migrar em `migrate`). */
export const SAVE_VERSION = 22;
/** Id da pilha da Moeda de Cobre (para migrar salvamentos antigos). */
const COPPER_COIN_ID = Item.COPPER_COIN;

export interface SaveData {
  v: number;
  /** Memória dos NPCs (v18, ADR 0034 nível 3): conversas e compras por morador. */
  npcMemory: MemoryBook;
  /** Missões dos NPCs (v19, ADR 0034): em andamento ou concluídas. */
  quests: QuestLog;
  /** Corrente de missões do Capítulo 1 (v20, ADR 0034). */
  missions: MissionLog;
  /** Carteira (v21): saldo em Moedas de Cobre; antes as moedas eram uma pilha da bolsa. */
  coins: number;
  /** Subdivisão da grade em que o mundo foi salvo (v16, ADR 0032): 1 = antiga; 2 = células de metade do lado. */
  sub: number;
  world: WorldId;
  seed: number;
  savedAt: number;
  time: number;
  selected: number | null;
  player: { x: number; y: number; z: number; hp: number; facing: Facing; hunger: number };
  /** Personagem pronto (Heroína, Herói, Hood, Gino, Mila ou Grewn). */
  body: HeroBody;
  /** Névoa do minimapa: células já descobertas, por chunk (bits em base64). */
  explored: Array<{ cx: number; cy: number; bits: string }>;
  /** Última tenda colocada (ponto de renascer). */
  tent: [number, number] | null;
  /** Conteúdo dos baús (27 espaços cada). */
  chests: Array<{ x: number; y: number; slots: Array<{ item: string; count: number } | null> }>;
  /** Tudo que a heroína carrega (itens, materiais coletados, ferramentas). */
  inventory: Partial<Record<StackId, number>>;
  /** Grade de 8 espaços (mundo com coleta); null = grade fixa do perfil. */
  hotbar: (StackId | null)[] | null;
  /** Chunks editados: chão e níveis em base64. */
  chunks: Array<{ cx: number; cy: number; ground: string; levels: string[] }>;
  /** Buracos (chão quebrado sem bloco) e há quantos segundos estão assim: `[x, y, segundos]` (v11). */
  holes: Array<[number, number, number]>;
  sheep: Array<{ x: number; y: number; homeX: number; homeY: number; baby: boolean; age: number; love: number; cooldown: number }>;
  /** Monstros vivos e renascimentos pendentes (null = mundo sem dungeon). */
  dungeon: {
    monsters: Array<{ kind: MonsterKind; x: number; y: number; homeX: number; homeY: number; hp: number }>;
    respawns: Array<{ kind: MonsterKind; x: number; y: number; timer: number }>;
  } | null;
}

export interface GameState {
  world: World;
  player: Player;
  entities: Entities;
  inventory: Inventory;
  time: number;
  selected: number | null;
  /** Layout da grade dinâmica (null = grade fixa). */
  hotbar: (StackId | null)[] | null;
  /** Névoa do minimapa (ausente = mundo sem minimapa). */
  exploration?: Exploration;
}


/** Fotografa o estado atual da sessão. */
export function captureSave(s: GameState): SaveData {
  const p = s.player;
  return {
    v: SAVE_VERSION,
    npcMemory: s.entities.memory,
    quests: s.entities.quests,
    missions: s.entities.missions,
    coins: s.inventory.wallet.copper,
    sub: SUBDIV,
    world: s.world.profile.id,
    seed: s.world.seed,
    savedAt: Date.now(),
    time: s.time,
    selected: s.selected,
    player: { x: p.x, y: p.y, z: p.z, hp: p.hp, facing: p.facing, hunger: Math.round(p.hunger * 10) / 10 },
    body: s.entities.body,
    explored: s.exploration?.toSave() ?? [],
    tent: s.world.tent,
    chests: [...s.world.chests.entries()].map(([k, slots]) => {
      const [x, y] = k.split(',').map(Number);
      return { x, y, slots };
    }),
    inventory: Object.fromEntries(s.inventory.entries()),
    hotbar: s.hotbar,
    chunks: s.world.modifiedChunks().map((c) => ({ cx: c.cx, cy: c.cy, ground: toB64(c.ground), levels: c.levels.map(toB64) })),
    holes: s.world.holeAges(),
    sheep: s.entities.npcs.map((o) => ({
      x: o.x, y: o.y, homeX: o.homeX, homeY: o.homeY, baby: o.baby, age: o.age, love: o.love, cooldown: o.cooldown,
    })),
    dungeon: s.world.dungeon
      ? {
        monsters: s.entities.monsters.filter((m) => !isOpenWorldMonster(m.kind)).map((m) => ({ kind: m.kind, x: m.x, y: m.y, homeX: m.homeX, homeY: m.homeY, hp: m.hp })),
        respawns: s.entities.respawns.filter((r) => !isOpenWorldMonster(r.kind)).map((r) => ({ kind: r.kind, x: r.x, y: r.y, timer: r.timer })),
      }
      : null,
  };
}

/**
 * Converte salvamentos antigos para a versão atual (null = incompatível, começa do zero).
 * v1 → v2 (Fase 3, coleta de materiais): o inventário ganha as ferramentas e 1 porta (materiais eram infinitos e
 * não havia o que salvar deles) e a grade volta ao layout inicial.
 */
export function migrate(raw: unknown): SaveData | null {
  let d = raw as (SaveData & { v: number }) | null;
  if (!d || typeof d !== 'object') return null;
  d = upToV4(d);
  if (!d) return null;
  // v4 → v5 (Fase P, vida e dano com números): vida da heroína de meios corações (máx. 10) para pontos, e vida dos
  // monstros de golpes para pontos — na mesma proporção.
  if (d.v === 4) {
    const OLD_MONSTER_HP: Partial<Record<MonsterKind, number>> = { 'spider-small': 2, 'spider-big': 4, 'spider-boss': 14 };
    d = {
      ...d, v: 5,
      player: { ...d.player, hp: Math.round((d.player.hp / 10) * BASE_STATS.maxHp) },
      dungeon: d.dungeon && {
        ...d.dungeon,
        monsters: d.dungeon.monsters.map((m) => ({
          ...m, hp: Math.max(1, Math.round((m.hp / (OLD_MONSTER_HP[m.kind] ?? 1)) * MONSTER_STATS[m.kind].hp)),
        })),
      },
    };
  }
  // v5 → v6 (tela de entrada): aparência do personagem; quem já jogava continua com a heroína.
  if (d.v === 5) d = { ...d, v: 6, look: null } as typeof d;
  // v6 → v7 (minimapa): nada descoberto ainda; o Game revela a área em volta ao abrir.
  if (d.v === 6) d = { ...d, v: 7, explored: [] };
  // v7 → v8 (covil isolado, ADR 0019): o labirinto mudou de lugar — as aranhas voltam completas (posições antigas não
  // valem mais). Quem salvou dentro do covil antigo fica onde estava, agora terreno comum (o Game desprende se preciso).
  if (d.v === 7) d = { ...d, v: 8, dungeon: null };
  // v8 → v9 (comida, Fase P entrega 4): barra de fome — quem já jogava começa satisfeito.
  if (d.v === 8) d = { ...d, v: 9, player: { ...d.player, hunger: HUNGER.max } };
  // v9 → v10 (Herói): personagem pronto escolhido na tela de personagem; quem já jogava continua com a Heroína.
  if (d.v === 9) d = { ...d, v: 10, body: 'heroine' };
  // v10 → v11 (chão que se refaz): buracos já abertos começam a contar o dia do zero.
  if (d.v === 10) d = { ...d, v: 11, holes: [] };
  // v11 → v12 (o chibi modular saiu, v0.92.0): o campo `look` some; quem tinha o chibi continua com o personagem pronto salvo (`body`).
  if (d.v === 11) { const { look: _look, ...rest } = d as SaveData & { look?: unknown }; d = { ...rest, v: 12 }; }
  // v12 → v15 (o mármore V2/V3 saiu, v0.93.28): os campos de ordem de colocação e de bases V3 somem; o Mármore Celestial
  // já colocado continua como cubo comum (a célula norte virtual das bases V3 deixa de existir).
  if (d.v === 12 || d.v === 13 || d.v === 14) {
    const { marblePlacements: _p, marbleV3Bases: _b, ...rest } = d as SaveData & { marblePlacements?: unknown; marbleV3Bases?: unknown };
    d = { ...rest, v: 15 };
  }
  // v15 → v16 (grade fina, ADR 0032): o salvamento passa a dizer em que grade foi feito; os antigos são da grade 1.
  if (d.v === 15) d = { ...d, v: 16, sub: 1 };
  // v16 → v17 (blocos de 1/4, ADR 0033): a altura de apoio `z` do Mundo passa de cubos para blocos de 1/4 (× 4); os chunks no formato antigo
  // (2 níveis) são convertidos ao carregar (`World.restoreChunk`), cada cubo virando 4 blocos com a mesma altura.
  if (d.v === 16) d = { ...d, v: 17, player: { ...d.player, z: d.world === 'santuario' ? d.player.z : d.player.z * 4 } };
  // v17 → v18 (memória dos NPCs, ADR 0034): ninguém conhece a jogadora ainda.
  if (d.v === 17) d = { ...d, v: 18, npcMemory: {} };
  // v18 → v19 (missões dos NPCs, ADR 0034): nenhuma missão aceita ainda.
  if (d.v === 18) d = { ...d, v: 19, quests: {} };
  // v19 → v20 (missões do Capítulo 1, ADR 0034): nenhuma missão cumprida ainda.
  if (d.v === 19) d = { ...d, v: 20, missions: EMPTY_LOG() };
  // v20 → v21 (carteira no painel do personagem): as moedas da bolsa viram o saldo da carteira.
  if (d.v === 20) {
    const inv = { ...(d.inventory as Record<string, number>) };
    const coins = inv[COPPER_COIN_ID] ?? 0;
    delete inv[COPPER_COIN_ID];
    d = { ...d, v: 21, inventory: inv, coins };
  }
  // v21 → v22 (Santuário em camadas, ADR 0036, v0.93.143): o terreno do Santuário passa a nascer com 2 camadas de cubo (pedra e grama) e os objetos ficam em cima
  // delas; o que foi salvo no terreno plano e vazio de antes não serve mais — o Santuário recomeça (o Mundo principal segue igual).
  if (d.v === 21) {
    if (d.world === 'santuario') return null;
    d = { ...d, v: 22 };
  }
  return d.v === SAVE_VERSION ? withoutRemovedBlocks(d) : null;
}

/**
 * Converte um salvamento para a grade `to` (só aumenta: 1 → 2): chunks, névoa, buracos, tenda, baús, jogador, ovelhas e monstros do
 * covil acompanham (`world/subdiv.ts`). Mesma grade devolve o próprio salvamento; grade mais fina que `to` é erro.
 */
export function rescaleSave(d: SaveData, to: number): SaveData {
  const f = rescaleFactor(d.sub ?? 1, to);
  if (f === 1) return d;
  const pt = <T extends { x: number; y: number }>(o: T): T => { const [x, y] = rescaleXY(o.x, o.y, f); return { ...o, x, y }; };
  const home = <T extends { x: number; y: number; homeX: number; homeY: number }>(o: T): T => {
    const [x, y] = rescaleXY(o.x, o.y, f);
    const [homeX, homeY] = rescaleXY(o.homeX, o.homeY, f);
    return { ...o, x, y, homeX, homeY };
  };
  return {
    ...d,
    sub: to,
    player: pt(d.player),
    explored: rescaleExplored(d.explored ?? [], f),
    tent: d.tent ? rescaleCell(d.tent[0], d.tent[1], f) : null,
    chests: (d.chests ?? []).map((c) => { const [x, y] = rescaleCell(c.x, c.y, f); return { ...c, x, y }; }),
    chunks: rescaleChunkRecords(d.chunks, f),
    holes: rescaleHoles(d.holes ?? [], f),
    sheep: d.sheep.map(home),
    dungeon: d.dungeon && { monsters: d.dungeon.monsters.map(home), respawns: d.dungeon.respawns.map(pt) },
  };
}

/** Tira do salvamento o que é de bloco que saiu do jogo (antigas paredes): pilhas da bolsa, da grade e dos baús. */
function withoutRemovedBlocks(d: SaveData): SaveData {
  return {
    ...d,
    inventory: Object.fromEntries(Object.entries(d.inventory).filter(([k]) => !isRemovedStack(k))),
    hotbar: d.hotbar && d.hotbar.map((s) => (s !== null && isRemovedStack(s) ? null : s)),
    chests: d.chests && d.chests.map((c) => ({ ...c, slots: c.slots.map((s) => (s && isRemovedStack(s.item) ? null : s)) })),
  };
}

/** Migrações antigas até o formato v4. */
function upToV4(d: SaveData & { v: number }): SaveData & { v: number } {
  if (d.v === 1) {
    const inventory: Partial<Record<StackId, number>> = { ...d.inventory };
    if (d.world === 'principal') {
      for (const t of ['sword', 'hoe', 'pickaxe', 'shovel', 'axe']) inventory[`tool:${t}`] = 1;
      inventory[`block:${Block.OAK_DOOR}`] = 1;
    }
    return { ...d, v: 4, inventory, hotbar: d.world === 'principal' ? startingGrid() : null, selected: null, tent: null, chests: [] };
  }
  // v2 → v3: grade da mão com 9 espaços (o 9º vazio) e tenda.
  if (d.v === 2) return { ...d, v: 4, hotbar: d.hotbar ? [...d.hotbar.slice(0, 8), null] : null, tent: null, chests: [] };
  // v3 → v4: baús.
  if (d.v === 3) return { ...d, v: 4, chests: [] };
  return d;
}

/**
 * Restaura um salvamento na sessão recém-criada (mesma seed e mundo). Devolve a hora do dia, o espaço
 * selecionado e quantos blocos do 3º nível (aposentado) foram descartados, para o Game aplicar/avisar. Ignora
 * silenciosamente o que não se aplica (ex.: dungeon ausente).
 */
export function applySave(d: SaveData, s: GameState, rand: () => number = Math.random): { time: number; selected: number | null; droppedBlocks: number } {
  let droppedBlocks = 0;
  for (const c of d.chunks) droppedBlocks += s.world.restoreChunk(c.cx, c.cy, fromB64(c.ground), c.levels.map(fromB64));
  s.world.settleWater(); // buracos vizinhos de água voltam a encher
  s.world.loadHoleAges(d.holes); // e os demais continuam contando o dia
  s.world.tent = d.tent ?? null;
  // Baús que não existem mais no mapa (ex.: salvamento antigo com um baú onde hoje é a cidade) são descartados.
  for (const c of d.chests ?? []) if (s.world.surfaceObject(c.x, c.y) === Block.CHEST) s.world.chests.set(`${c.x},${c.y}`, c.slots);
  const p = s.player;
  p.x = d.player.x;
  p.y = d.player.y;
  // Old saves may place the character on the now-retired third stack layer.
  p.z = Math.max(0, Math.min(s.world.maxStack, d.player.z));
  // (e nunca acima do chão sob os pés: o visualZ nasce coerente)
  p.z = Math.min(p.z, Math.max(0, s.world.standHeight(Math.floor(p.x), Math.floor(p.y)) ?? 0));
  p.visualZ = p.z / s.world.cubeLevels;
  p.hp = Math.min(p.maxHp, Math.max(1, d.player.hp));
  p.facing = d.player.facing;
  p.hunger = Math.min(HUNGER.max, Math.max(0, d.player.hunger ?? HUNGER.max));
  s.entities.body = HERO_BODIES.includes(d.body) ? d.body : 'heroine';
  s.entities.memory = sanitizeBook(d.npcMemory);
  s.entities.quests = sanitizeLog(d.quests);
  s.entities.missions = sanitizeMissions(d.missions);
  s.exploration?.load(d.explored);
  s.inventory.replaceAll(d.inventory);
  if (typeof d.coins === 'number') s.inventory.wallet.set(d.coins); // saldo salvo (v21)
  const e = s.entities;
  e.npcs.splice(0, e.npcs.length, ...d.sheep.map((o) => {
    const sheep = new Sheep(o.x, o.y, o.homeX, o.homeY, rand, o.baby);
    sheep.age = o.age;
    sheep.love = o.love;
    sheep.cooldown = o.cooldown;
    return sheep;
  }));
  const dg = s.world.dungeon;
  if (dg && d.dungeon) {
    const bounds = (k: MonsterKind) => (k === 'spider-boss' ? dg.bossRoom : dg.interior);
    // Os lobos não vão para o salvamento (voltam todos, pela seed, ao carregar): só as aranhas do covil são trocadas.
    const openMonsters = e.monsters.filter((m) => isOpenWorldMonster(m.kind));
    e.monsters.splice(0, e.monsters.length, ...openMonsters, ...d.dungeon.monsters.filter((m) => !isOpenWorldMonster(m.kind)).map((m) => {
      const mon = new Monster(m.kind, m.x, m.y, bounds(m.kind), rand, m.homeX, m.homeY);
      mon.hp = Math.min(mon.maxHp, Math.max(1, m.hp));
      return mon;
    }));
    e.respawns.splice(0, e.respawns.length, ...e.respawns.filter((r) => isOpenWorldMonster(r.kind)), ...d.dungeon.respawns.filter((r) => !isOpenWorldMonster(r.kind)).map((r) => ({ ...r, bounds: bounds(r.kind) })));
  }
  e.reconcileGoblinCamps(s.world);
  e.settleAll(s.world);
  // Salvamento de antes da correção da tenda: heroína presa dentro de um objeto → vai para a célula livre mais perto.
  if (p.isStuck(s.world)) {
    const [fx, fy] = s.world.nearestWalkable(Math.floor(p.x), Math.floor(p.y), 20);
    p.x = fx + 0.5;
    p.y = fy + 0.6;
    p.z = p.visualZ = 0;
  }
  return { time: d.time, selected: d.selected, droppedBlocks };
}

/** Armazenamento no navegador: um salvamento por mundo e seed + ponteiro para a última seed jogada. */
export class SaveStore {
  constructor(private readonly world: WorldId, private readonly storage: Storage | null = safeStorage()) {}

  private key(seed: number): string {
    // Prefixo do nome antigo (MundoBlocos) mantido de propósito: trocar apagaria os salvamentos existentes.
    return `mundoblocos:save:${this.world}:${seed}`;
  }

  private get lastKey(): string {
    return `mundoblocos:last:${this.world}`;
  }

  /** O navegador permite salvar? (aba anônima/Artifact podem bloquear: o jogo segue sem salvar). */
  get available(): boolean {
    return !!this.storage;
  }

  lastSeed(): number | null {
    try {
      const v = this.storage?.getItem(this.lastKey);
      return v === null || v === undefined ? null : Number(v);
    } catch {
      return null;
    }
  }

  /** Sementes cujo arquivo é de uma grade mais fina que a deste jogo (ex.: aba antiga): não se abre nem se sobrescreve. */
  private readonly blocked = new Set<number>();

  load(seed: number): SaveData | null {
    try {
      const raw = this.storage?.getItem(this.key(seed));
      let d = raw ? migrate(JSON.parse(raw)) : null;
      if (!d || d.seed !== seed || d.world !== this.world) return null;
      const sub = d.sub ?? 1;
      if (sub > SUBDIV) { this.blocked.add(seed); return null; }
      if (sub < SUBDIV) {
        // Grade nova (ADR 0032): guarda uma cópia do arquivo antigo (uma vez) e converte; o jogo regrava na grade nova.
        try {
          const backup = `${this.key(seed)}:grade-${sub}`;
          if (this.storage && raw && !this.storage.getItem(backup)) this.storage.setItem(backup, raw);
        } catch { /* sem espaço para a cópia: o arquivo antigo continua lá até o jogo regravar */ }
        d = rescaleSave(d, SUBDIV);
      }
      return d;
    } catch {
      return null;
    }
  }

  /** Grava; false se não deu (cota cheia, bloqueado). */
  save(d: SaveData): boolean {
    if (this.blocked.has(d.seed)) return false;
    try {
      this.storage?.setItem(this.key(d.seed), JSON.stringify(d));
      this.storage?.setItem(this.lastKey, String(d.seed));
      return !!this.storage;
    } catch {
      return false;
    }
  }

  clear(seed: number): void {
    try {
      this.storage?.removeItem(this.key(seed));
    } catch {
      /* sem armazenamento: nada a apagar */
    }
  }
}

function safeStorage(): Storage | null {
  try {
    const s = globalThis.localStorage;
    if (!s) return null;
    const k = '__mundoblocos_test__';
    s.setItem(k, '1');
    s.removeItem(k);
    return s;
  } catch {
    return null;
  }
}
