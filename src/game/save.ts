import { isOpenWorldMonster, type MonsterKind } from '../world/dungeon';
import { MAX_STACK } from '../config';
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

/**
 * Salvamento automático no navegador (Fase 2). Salva só o que a seed não reconstrói:
 * chunks editados, personagem, inventário, ovelhas, monstros da dungeon e a hora do dia.
 * Estado do mundo continua tendo o `World` como fonte de verdade; aqui só se copia e se restaura.
 * Contas e mundos na nuvem dependem do backend do Orvalis (repositório separado, ADR 0015) — nada de backend aqui.
 */

/** Versão do formato; mudar ao alterar a estrutura (e migrar em `migrate`). */
export const SAVE_VERSION = 14;

export interface SaveData {
  v: number;
  world: WorldId;
  seed: number;
  savedAt: number;
  time: number;
  selected: number | null;
  player: { x: number; y: number; z: number; hp: number; facing: Facing; hunger: number };
  /** Personagem pronto (Heroína, Herói, Hood, Gino ou Mila). */
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
  /** Ordem das paredes de mármore do Santuário: [x, y, sequência] (v13). */
  marblePlacements: Array<[number, number, number]>;
  /** Bases do mármore com ocupação física de duas células (v14). */
  marbleV3Bases: Array<[number, number]>;
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
    marblePlacements: s.world.marblePlacementOrders(),
    marbleV3Bases: s.world.marbleV3PlacementBases(),
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
  // v12 → v13: saves antigos não conhecem a ordem das paredes e preservam a geometria anterior.
  if (d.v === 12) d = { ...d, v: 13, marblePlacements: [] };
  // v13 → v14: preservar painéis antigos em V2; somente novas bases usam V3.
  if (d.v === 13) d = { ...d, v: 14, marbleV3Bases: [] };
  return d.v === SAVE_VERSION ? withoutRemovedBlocks(d) : null;
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
 * Restaura um salvamento na sessão recém-criada (mesma seed e mundo). Devolve a hora do dia e o espaço
 * selecionado para o Game aplicar. Ignora silenciosamente o que não se aplica (ex.: dungeon ausente).
 */
export function applySave(d: SaveData, s: GameState, rand: () => number = Math.random): { time: number; selected: number | null } {
  for (const c of d.chunks) s.world.restoreChunk(c.cx, c.cy, fromB64(c.ground), c.levels.map(fromB64));
  s.world.settleWater(); // buracos vizinhos de água voltam a encher
  s.world.loadHoleAges(d.holes); // e os demais continuam contando o dia
  s.world.loadMarblePlacementOrders(d.marblePlacements); // ordem das paredes adaptativas
  s.world.loadMarbleV3PlacementBases(d.marbleV3Bases); // bases físicas V3, sem células duplicadas
  s.world.tent = d.tent ?? null;
  // Baús que não existem mais no mapa (ex.: salvamento antigo com um baú onde hoje é a cidade) são descartados.
  for (const c of d.chests ?? []) if (s.world.getObject(c.x, c.y) === Block.CHEST) s.world.chests.set(`${c.x},${c.y}`, c.slots);
  const p = s.player;
  p.x = d.player.x;
  p.y = d.player.y;
  // Old saves may place the character on the now-retired third stack layer.
  p.z = p.visualZ = Math.max(0, Math.min(MAX_STACK, d.player.z));
  p.hp = Math.min(p.maxHp, Math.max(1, d.player.hp));
  p.facing = d.player.facing;
  p.hunger = Math.min(HUNGER.max, Math.max(0, d.player.hunger ?? HUNGER.max));
  s.entities.body = HERO_BODIES.includes(d.body) ? d.body : 'heroine';
  s.exploration?.load(d.explored);
  s.inventory.replaceAll(d.inventory);
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
  return { time: d.time, selected: d.selected };
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

  load(seed: number): SaveData | null {
    try {
      const raw = this.storage?.getItem(this.key(seed));
      const d = raw ? migrate(JSON.parse(raw)) : null;
      return d && d.seed === seed && d.world === this.world ? d : null;
    } catch {
      return null;
    }
  }

  /** Grava; false se não deu (cota cheia, bloqueado). */
  save(d: SaveData): boolean {
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
