import { SUBDIV } from '../config';
import { describe, expect, it } from 'vitest';
import { RESIDENTS_TOWN } from '../game/entities';
import { MERCHANT } from '../game/npcs';
import { mulberry32 } from '../world/random';
import { type Outgoing, Room } from './room';
import { type MobState, PROTOCOL_VERSION, type ServerMessage } from './protocol';

function setup(names: string[]) {
  const room = new Room(1, 'Sala 1', 20261106, mulberry32(5));
  const ids = names.map((name) => room.join({ t: 'hello', v: PROTOCOL_VERSION, sub: SUBDIV, name, room: 1 }).id!);
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
const npcs = (list: MobState[]) => list.filter((m) => m.k.startsWith('npc-'));

describe('Sala: moradores da cidade e da vila (v26, ADR 0034)', () => {
  it('a sala simula os 16 nomeados e os sorteados e manda a cada jogador só os que estão perto', () => {
    const { room, ids, at } = setup(['Ana', 'Beto']);
    expect(room.entities.villagers.filter((v) => !v.resident)).toHaveLength(16);
    expect(room.entities.villagers.filter((v) => v.resident).length).toBeGreaterThanOrEqual(RESIDENTS_TOWN);
    const [sx, sy] = room.world.town!.start;
    at(ids[0], sx + 0.5, sy + 0.6);
    const d = room.world.dungeon!;
    at(ids[1], d.area.x1 + 60, d.area.y1 + 60);
    const out = run(room, 1);
    const forAna = of(out, 'mobs').filter((o) => o.to === ids[0]).at(-1)!.msg.list;
    const forBeto = of(out, 'mobs').filter((o) => o.to === ids[1]).at(-1)!.msg.list;
    expect(npcs(forAna).length).toBeGreaterThan(0);
    expect(npcs(forAna).every((m) => Math.abs(m.x - (sx + 0.5)) <= 22)).toBe(true);
    expect(npcs(forBeto)).toHaveLength(0);
  });

  it('sorteado vai com o id (u); a rotina segue a hora da sala: o Bento dorme de madrugada e some da lista', () => {
    const { room, ids, at } = setup(['Ana']);
    const bento = room.entities.villagers.find((v) => v.npc === MERCHANT)!;
    at(ids[0], bento.x, bento.y + 3);
    room.time = 12 / 24;
    let list = of(run(room, 1), 'mobs').at(-1)!.msg.list;
    expect(list.some((m) => m.k === 'npc-bento')).toBe(true);
    room.time = 2 / 24; // madrugada
    list = of(run(room, 40), 'mobs').at(-1)!.msg.list;
    expect(list.some((m) => m.k === 'npc-bento')).toBe(false);
    const res = room.entities.villagers.find((v) => v.resident)!;
    at(ids[0], res.x, res.y + 2);
    list = of(run(room, 0.5), 'mobs').at(-1)!.msg.list;
    expect(list.some((m) => m.u === res.resident!.id)).toBe(true);
  });

  it('conversa segura o morador parado para todos e solta ao terminar (ou ao sair)', () => {
    const { room, ids, at } = setup(['Ana']);
    const v = room.entities.villagers.find((x) => !x.role)!;
    at(ids[0], v.x, v.y + 1);
    const id = of(run(room, 0.3), 'mobs').at(-1)!.msg.list.find((m) => m.k === `npc-${v.npc}`)!.i;
    room.handle(ids[0], { t: 'talk', id, on: true });
    expect(v.talking).toBe(true);
    const x0 = v.x, y0 = v.y;
    run(room, 5);
    expect(Math.hypot(v.x - x0, v.y - y0)).toBeLessThan(0.05);
    room.handle(ids[0], { t: 'talk', id, on: false });
    expect(v.talking).toBe(false);
    room.handle(ids[0], { t: 'talk', id, on: true });
    room.leave(ids[0]);
    expect(v.talking).toBe(false);
  });

  it('acompanhar: um jogador por vez; os outros ouvem "ocupado"; o dono o leva embora e ao sair ele volta', () => {
    const { room, ids, at } = setup(['Ana', 'Beto']);
    const v = room.entities.villagers.find((x) => x.npc === 'silvano')!;
    at(ids[0], v.x, v.y + 1);
    at(ids[1], v.x + 1, v.y + 1);
    const id = of(run(room, 0.3), 'mobs').at(-1)!.msg.list.find((m) => m.k === 'npc-silvano')!.i;
    let out = room.handle(ids[0], { t: 'escort', id, on: true });
    expect(of(out, 'escort')[0].msg.ok).toBe(true);
    out = room.handle(ids[1], { t: 'escort', id, on: true });
    expect(of(out, 'escort')[0]).toMatchObject({ to: ids[1], msg: { ok: false } });
    // a Ana anda e ele a segue; a lista traz quem ele acompanha (g)
    for (let i = 0; i < 100; i++) { at(ids[0], v.x + 8 + i * 0.05, v.y + 1); room.tick(0.1); }
    const g = of(run(room, 0.2), 'mobs').find((o) => o.to === ids[0])!.msg.list.find((m) => m.k === 'npc-silvano');
    expect(g?.g).toBe(ids[0]);
    room.leave(ids[0]);
    expect(v.leader).toBeNull();
    // ainda voltando ao posto: ocupado; chegando em casa, fica livre e o Beto consegue
    for (let i = 0; i < 900 && v.escorting; i++) { at(ids[1], v.x, v.y + 1); room.tick(0.1); }
    expect(v.escorting).toBe(false);
    at(ids[1], v.x, v.y + 1);
    out = room.handle(ids[1], { t: 'escort', id, on: true });
    expect(of(out, 'escort')[0].msg.ok).toBe(true);
  });
});

describe('sala + espelho juntos (v26)', () => {
  it('o aparelho recebe os moradores pela rede (JSON), conversa segura o morador na sala e a missão pede acompanhante', async () => {
    const { CreatureMirror } = await import('../game/creatureMirror');
    const { Entities } = await import('../game/entities');
    const { Player } = await import('../game/player');
    const { room, ids, at } = setup(['Ana']);
    const silvano = room.entities.villagers.find((v) => v.npc === 'silvano')!;
    at(ids[0], silvano.x, silvano.y + 1.5);
    const client = new Entities(new Player(silvano.x, silvano.y + 1.5), mulberry32(2));
    client.remote = true;
    const mirror = new CreatureMirror(client, room.world);
    mirror.onTalk = (id, on) => { room.handle(ids[0], { t: 'talk', id, on }); };
    const deliver = (out: Outgoing[]) => {
      for (const o of of(out, 'mobs')) if (o.to === ids[0]) mirror.apply((JSON.parse(JSON.stringify(o.msg)) as typeof o.msg).list);
    };
    deliver(run(room, 0.3));
    const mine = client.villagers.find((v) => v.npc === 'silvano')!;
    expect(mine).toBeTruthy();
    expect(client.villagers.length).toBeGreaterThan(1);
    mine.conversation(); // no aparelho: toca no morador
    expect(silvano.talking).toBe(true); // a sala o segurou
    mine.release();
    expect(silvano.talking).toBe(false);
    const sid = mirror.idOf(mine)!;
    expect(of(room.handle(ids[0], { t: 'escort', id: sid, on: true }), 'escort')[0].msg.ok).toBe(true);
    deliver(run(room, 0.3));
    expect(client.villagers.find((v) => v.npc === 'silvano')!.escortedBy).toBe(ids[0]);
  });
});
