import type { MonsterKind } from '../world/dungeon';
import type { ItemId } from '../world/items';
import type { WorldId } from '../world/profiles';
import type { World } from '../world/world';
import type { Entities } from './entities';
import type { Inventory } from './inventory';
import { Monster } from './monster';
import type { Player } from './player';
import { Sheep } from './sheep';
import type { Facing } from './walker';

/**
 * Salvamento automático no navegador (Fase 2). Salva só o que a seed não reconstrói:
 * chunks editados, personagem, inventário, ovelhas, monstros da dungeon e a hora do dia.
 * Estado do mundo continua tendo o `World` como fonte de verdade; aqui só se copia e se restaura.
 * Contas e mundos na nuvem dependem do core (`core.maiamapps.com.br`) — nada de backend aqui.
 */

/** Versão do formato; mudar ao alterar a estrutura (e migrar em `migrate`). */
export const SAVE_VERSION = 1;

export interface SaveData {
  v: number;
  world: WorldId;
  seed: number;
  savedAt: number;
  time: number;
  selected: number | null;
  player: { x: number; y: number; z: number; hp: number; facing: Facing };
  inventory: Partial<Record<ItemId, number>>;
  /** Chunks editados: chão e níveis em base64. */
  chunks: Array<{ cx: number; cy: number; ground: string; levels: string[] }>;
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
}

const toB64 = (a: Uint8Array): string => {
  let s = '';
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return btoa(s);
};
const fromB64 = (s: string): Uint8Array => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

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
    player: { x: p.x, y: p.y, z: p.z, hp: p.hp, facing: p.facing },
    inventory: Object.fromEntries(s.inventory.entries()),
    chunks: s.world.modifiedChunks().map((c) => ({ cx: c.cx, cy: c.cy, ground: toB64(c.ground), levels: c.levels.map(toB64) })),
    sheep: s.entities.npcs.map((o) => ({
      x: o.x, y: o.y, homeX: o.homeX, homeY: o.homeY, baby: o.baby, age: o.age, love: o.love, cooldown: o.cooldown,
    })),
    dungeon: s.world.dungeon
      ? {
        monsters: s.entities.monsters.map((m) => ({ kind: m.kind, x: m.x, y: m.y, homeX: m.homeX, homeY: m.homeY, hp: m.hp })),
        respawns: s.entities.respawns.map((r) => ({ kind: r.kind, x: r.x, y: r.y, timer: r.timer })),
      }
      : null,
  };
}

/** Converte salvamentos antigos para a versão atual (null = incompatível, começa do zero). */
export function migrate(raw: unknown): SaveData | null {
  const d = raw as SaveData | null;
  if (!d || typeof d !== 'object' || d.v !== SAVE_VERSION) return null;
  return d;
}

/**
 * Restaura um salvamento na sessão recém-criada (mesma seed e mundo). Devolve a hora do dia e o espaço
 * selecionado para o Game aplicar. Ignora silenciosamente o que não se aplica (ex.: dungeon ausente).
 */
export function applySave(d: SaveData, s: GameState, rand: () => number = Math.random): { time: number; selected: number | null } {
  for (const c of d.chunks) s.world.restoreChunk(c.cx, c.cy, fromB64(c.ground), c.levels.map(fromB64));
  const p = s.player;
  p.x = d.player.x;
  p.y = d.player.y;
  p.z = p.visualZ = d.player.z;
  p.hp = Math.max(1, d.player.hp);
  p.facing = d.player.facing;
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
    e.monsters.splice(0, e.monsters.length, ...d.dungeon.monsters.map((m) => {
      const mon = new Monster(m.kind, m.x, m.y, bounds(m.kind), rand, m.homeX, m.homeY);
      mon.hp = Math.min(mon.maxHp, Math.max(1, m.hp));
      return mon;
    }));
    e.respawns.splice(0, e.respawns.length, ...d.dungeon.respawns.map((r) => ({ ...r, bounds: bounds(r.kind) })));
  }
  e.settleAll(s.world);
  return { time: d.time, selected: d.selected };
}

/** Armazenamento no navegador: um salvamento por mundo e seed + ponteiro para a última seed jogada. */
export class SaveStore {
  constructor(private readonly world: WorldId, private readonly storage: Storage | null = safeStorage()) {}

  private key(seed: number): string {
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
