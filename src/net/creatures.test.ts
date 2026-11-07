import { describe, expect, it } from 'vitest';
import { Item } from '../world/items';
import { mulberry32 } from '../world/random';
import { type Outgoing, Room } from './room';
import { type MobState, PROTOCOL_VERSION, type ServerMessage } from './protocol';

/** Sala com jogadores parados em (x, y). */
function setup(names: string[]) {
  const room = new Room(1, 'Sala 1', 20261106, mulberry32(5));
  const ids = names.map((name) => room.join({ t: 'hello', v: PROTOCOL_VERSION, name, room: 1 }).id!);
  const at = (id: number, x: number, y: number) => room.handle(id, { t: 'state', s: { x, y, facing: 'down', moving: false } });
  return { room, ids, at };
}

const of = <T extends ServerMessage['t']>(out: Outgoing[], t: T) =>
  out.filter((o) => o.msg.t === t) as Array<{ to: Outgoing['to']; msg: Extract<ServerMessage, { t: T }> }>;

function run(room: Room, seconds: number): Outgoing[] {
  const out: Outgoing[] = [];
  for (let t = 0; t < seconds; t += 0.1) out.push(...room.tick(0.1));
  return out;
}

describe('Sala: bichos compartilhados (Etapa 3)', () => {
  it('a sala roda animais e monstros e manda a cada jogador só os que estão perto', () => {
    const { room, ids, at } = setup(['Ana', 'Beto']);
    const [gx, gy] = room.world.outsideGate();
    at(ids[0], gx + 0.5, gy + 6.5); // no campo dos animais
    const d = room.world.dungeon!;
    at(ids[1], d.area.x1 + 60, d.area.y1 + 60); // longe de tudo
    const out = run(room, 1);
    const mobs = of(out, 'mobs');
    const forAna = mobs.filter((o) => o.to === ids[0]).at(-1)!.msg.list;
    const forBeto = mobs.filter((o) => o.to === ids[1]).at(-1)!.msg.list;
    expect(forAna.some((m) => m.k === 'sheep')).toBe(true);
    expect(forAna.every((m: MobState) => Math.abs(m.x - (gx + 0.5)) <= 22)).toBe(true);
    expect(forBeto).toHaveLength(0);
    expect(mobs.filter((o) => o.to === ids[0]).length).toBeGreaterThanOrEqual(9); // ~10×/s
  });

  it('monstro encostado morde só o jogador encostado (o dano é do aparelho dele)', () => {
    const { room, ids, at } = setup(['Ana', 'Beto']);
    const m = room.entities.monsters.find((x) => x.kind === 'spider-small')!;
    const [gx, gy] = room.world.outsideGate();
    at(ids[1], gx + 0.5, gy + 6.5);
    let bites: ReturnType<typeof of<'bite'>> = [];
    for (let t = 0; t < 8 && bites.length === 0; t += 0.1) {
      at(ids[0], m.x + 0.6, m.y); // fica grudada na aranha
      bites = of(room.tick(0.1), 'bite');
    }
    expect(bites.length).toBeGreaterThan(0);
    expect(bites.every((b) => b.to === ids[0])).toBe(true);
    expect(bites[0].msg.k).toBe('spider-small');
  });

  it('golpe é calculado pela sala: dano para todos verem, morte e espólio no chão da sala', () => {
    const { room, ids, at } = setup(['Ana', 'Beto']);
    const m = room.entities.monsters.find((x) => x.kind === 'spider-big')!;
    at(ids[0], m.x, m.y - 0.9);
    const out = room.handle(ids[0], { t: 'strike', facing: 'down', attack: 1000 });
    const hits = of(out, 'hits');
    expect(hits).toHaveLength(1);
    expect(hits[0].to).toBe('all');
    expect(hits[0].msg.list[0][2]).toBeGreaterThan(0);
    expect(room.entities.monsters).not.toContain(m);
    const drops = of(out, 'drops');
    expect(drops[0].msg.list.some((d) => d.item === Item.SILK)).toBe(true);
    // A morte aparece para quem está perto (efeito sem id).
    const list = room.mobsNear(m.x, m.y);
    expect(list.some((x) => x.i === 0 && x.k === 'spider-big' && x.d !== undefined)).toBe(true);
  });

  it('dar comida: a sala decide se o animal come; só quem deu perde o item', () => {
    const { room, ids, at } = setup(['Ana']);
    const sheep = room.entities.animals.find((a) => a.species === 'sheep' && !a.baby)!;
    at(ids[0], sheep.x, sheep.y + 1);
    const list = room.mobsNear(sheep.x, sheep.y);
    const id = list.find((x) => x.x === Math.round(sheep.x * 100) / 100 && x.k === 'sheep')!.i;
    expect(room.handle(ids[0], { t: 'feed', id, item: Item.CARROT })).toEqual([]); // ovelha não come cenoura
    const fed = of(room.handle(ids[0], { t: 'feed', id, item: Item.WHEAT }), 'fed');
    expect(fed).toEqual([{ to: ids[0], msg: { t: 'fed', id, item: Item.WHEAT } }]);
    expect(sheep.inLove).toBe(true);
    expect(room.handle(ids[0], { t: 'feed', id, item: Item.WHEAT })).toEqual([]); // já apaixonada
    expect(room.handle(ids[0], { t: 'feed', id, item: 'nada' })).toEqual([]);
  });
});
