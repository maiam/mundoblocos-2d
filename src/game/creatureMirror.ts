import { FACING_ORDER, type MobState } from '../net/protocol';
import type { MonsterKind } from '../world/dungeon';
import type { World } from '../world/world';
import type { Breeder } from './breeder';
import type { Entities } from './entities';
import { FarmAnimal, type FarmKind } from './horse';
import { GOBLIN_VISUALS, hasPoses, Monster, MONSTERS } from './monster';
import { Sheep } from './sheep';

/** Acima disso (células) o bicho é teleportado em vez de deslizar (voltou a ficar perto, renasceu…). */
const SNAP = 6;
const FARM_KINDS = new Set<string>(['horse', 'cow', 'chicken']);

interface Mirrored {
  obj: Breeder | Monster;
  tx: number;
  ty: number;
  baby: boolean;
}

/**
 * Espelho dos bichos da sala (multiplayer, Etapa 3): no aparelho dentro da sala, animais e monstros são os da sala,
 * que roda as regras (`Room` + `Entities`). Aqui os mesmos objetos (`Sheep`, `FarmAnimal`, `Monster`) ficam nas listas
 * das `Entities` (em modo `remote`, sem simulação), só seguindo a posição que a sala manda, suavizada — assim colisão,
 * toque, alvo do golpe e anel de comida funcionam como no jogo sozinho. Mortes e coraçõezinhos vêm como efeitos.
 */
export class CreatureMirror {
  private readonly byId = new Map<number, Mirrored>();
  private readonly ids = new WeakMap<object, number>();

  constructor(private readonly entities: Entities, private readonly world: World) {}

  /** Id na sala de um animal espelhado (para dar comida), ou null. */
  idOf(o: object): number | null {
    return this.ids.get(o) ?? null;
  }

  /** Nova lista da sala: cria quem chegou perto, atualiza o alvo dos que já estavam e tira quem sumiu. */
  apply(list: MobState[]): void {
    const seen = new Set<number>();
    const e = this.entities;
    e.dying.length = 0;
    const hearts = [];
    for (const m of list) {
      const facing = FACING_ORDER[m.f] ?? 'down';
      if (m.i === 0) {
        if (m.k === 'love-hearts') {
          hearts.push({ kind: 'love-hearts' as const, x: m.x, y: m.y, visualZ: 0, facing, moving: false, walkTime: 0, frame: m.r, scale: m.s });
        } else if (m.k in MONSTERS && m.d !== undefined) {
          e.dying.push({ kind: m.k as MonsterKind, x: m.x, y: m.y, facing, t: m.d });
        }
        continue;
      }
      seen.add(m.i);
      let r = this.byId.get(m.i);
      if (r && r.baby !== !!m.b) {
        this.remove(m.i); // cresceu: o corpo de adulto é outro
        r = undefined;
      }
      if (!r) {
        const obj = this.create(m);
        if (!obj) continue;
        r = { obj, tx: m.x, ty: m.y, baby: !!m.b };
        this.byId.set(m.i, r);
        this.ids.set(obj, m.i);
      }
      r.tx = m.x;
      r.ty = m.y;
      const o = r.obj;
      o.facing = facing;
      o.moving = !!m.m;
      if (o instanceof Monster) {
        o.hp = m.p !== undefined ? m.p * o.maxHp : o.maxHp;
        o.hurt = m.h ? 0.2 : 0;
        if (hasPoses(o.kind)) {
          o.presentationState = GOBLIN_VISUALS[m.v ?? -1] ?? null;
          o.presentationFrame = m.r ?? null;
        }
      } else {
        // Só o que o aparelho precisa: coração (apaixonado) e se come agora (anel de comida, `canEat`).
        o.love = m.l ? 1 : 0;
        o.cooldown = !m.e && !m.l ? 1 : 0;
        o.courtship = 0;
      }
    }
    e.extra = hearts;
    for (const id of [...this.byId.keys()]) if (!seen.has(id)) this.remove(id);
  }

  /** Desliza cada bicho até a posição da sala. */
  update(dt: number): void {
    const k = 1 - Math.exp(-12 * dt);
    for (const r of this.byId.values()) {
      const o = r.obj;
      if (Math.hypot(r.tx - o.x, r.ty - o.y) > SNAP) { o.x = r.tx; o.y = r.ty; } else { o.x += (r.tx - o.x) * k; o.y += (r.ty - o.y) * k; }
      o.walkTime = o.moving ? o.walkTime + dt : 0;
    }
  }

  private create(m: MobState): Breeder | Monster | null {
    const e = this.entities;
    if (m.k === 'sheep') {
      const s = new Sheep(m.x, m.y, m.x, m.y, Math.random, !!m.b);
      e.npcs.push(s);
      return s;
    }
    if (FARM_KINDS.has(m.k)) {
      const a = new FarmAnimal(m.k as FarmKind, m.x, m.y, Math.random, !!m.b);
      e.horses.push(a);
      return a;
    }
    if (m.k in MONSTERS) {
      const d = this.world.dungeon;
      const bounds = d ? d.interior : { x0: m.x - 1e6, y0: m.y - 1e6, x1: m.x + 1e6, y1: m.y + 1e6 };
      const mon = new Monster(m.k as MonsterKind, m.x, m.y, bounds);
      e.monsters.push(mon);
      return mon;
    }
    return null;
  }

  private remove(id: number): void {
    const r = this.byId.get(id);
    if (!r) return;
    this.byId.delete(id);
    const e = this.entities;
    const list: Array<Breeder | Monster> = r.obj instanceof Monster ? e.monsters : r.obj instanceof FarmAnimal ? e.horses : e.npcs;
    const i = list.indexOf(r.obj);
    if (i >= 0) list.splice(i, 1);
  }
}
