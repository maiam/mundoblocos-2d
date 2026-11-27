import { describe, expect, it } from 'vitest';
import { FAUNA_KINDS, GROW_S } from '../../titan/fauna';
import { Item } from '../../titan/items';
import { TitanClient } from './client';
import { TitanLoopbackServer } from './loopback';
import { TITAN_PROTOCOL_VERSION, parseTitanClientMessage, type TitanServerMessage } from './protocol';
import { TITAN_FAUNA_EVERY, TitanRoom } from './room';

/** Fauna de fazenda na sala do Orvalis (ADR 0138, entrega B): o servidor simula, manda aos jogadores de perto e recebe golpes e comida por ação. */
const orv = (): TitanRoom => new TitanRoom(102, 'Orvalis 1', 20261127, () => 0.5, 'orvalis');
const hello = (name: string) => ({ t: 'hello' as const, v: TITAN_PROTOCOL_VERSION, name, room: 102 });
const flush = async (): Promise<void> => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
const applied = (out: Array<{ msg: TitanServerMessage }>) => out.find((o) => o.msg.t === 'applied')!.msg as Extract<TitanServerMessage, { t: 'applied' }>;
/** Põe o jogador ao lado do animal mais perto da chegada e devolve o animal. */
function stage(r: TitanRoom) {
  const f = r.world.fauna.slice().sort((a, b) => Math.hypot(a.body.x - r.world.volume.gen.arrival.x, a.body.z - r.world.volume.gen.arrival.z) - Math.hypot(b.body.x - r.world.volume.gen.arrival.x, b.body.z - r.world.volume.gen.arrival.z))[0];
  const id = r.join(hello('Ana')).id!;
  r.handle(id, { t: 'state', s: { x: f.body.x + 1.2, y: f.body.y, z: f.body.z, yaw: 0, pitch: 0, sel: 0 } });
  return { id, f };
}
const give = (r: TitanRoom, id: number, item: number, n = 5): void => { const v = r.viewOf(id)!; v.inventory.add(item, n); const k = [...Array(36).keys()].find((i) => v.inventory.get(i)?.item === item)!; v.inventory.move(k, 0); };

describe('fauna na sala do Orvalis (ADR 0138)', () => {
  it('o protocolo é pelo menos o 4 e o analisador aceita as duas ações novas, só com id válido', () => {
    expect(TITAN_PROTOCOL_VERSION).toBeGreaterThanOrEqual(4);
    for (const k of ['strikeFauna', 'feedFauna']) {
      expect(parseTitanClientMessage(JSON.stringify({ t: 'act', seq: 1, a: { k, id: 'f1' } }))).not.toBeNull();
      expect(parseTitanClientMessage(JSON.stringify({ t: 'act', seq: 1, a: { k, id: '' } }))).toBeNull();
      expect(parseTitanClientMessage(JSON.stringify({ t: 'act', seq: 1, a: { k } }))).toBeNull();
    }
  });
  it('a sala nasce com a fauna da seed e manda a quem está perto os animais mais próximos, só deles', () => {
    const r = orv(); stage(r);
    expect(r.world.fauna.length).toBeGreaterThan(0);
    const out = r.tick(TITAN_FAUNA_EVERY + 0.01), m = out.find((o) => o.msg.t === 'fauna')!.msg as Extract<TitanServerMessage, { t: 'fauna' }>;
    expect(m.list.length).toBeGreaterThan(0); expect(m.list.length).toBeLessThanOrEqual(40);
    expect(m.list.every((w) => w.k in FAUNA_KINDS && Number.isFinite(w.x) && w.hp > 0)).toBe(true);
    expect(out.find((o) => o.msg.t === 'fauna')!.to).toBeTypeOf('number'); // mandado ao jogador, não a todos
  });
  it('sem jogador a fauna não anda; com jogador por perto, ela passeia', () => {
    const r = orv(), a = r.world.fauna.map((f) => `${f.body.x.toFixed(3)},${f.body.z.toFixed(3)}`);
    r.tick(5); expect(r.world.fauna.map((f) => `${f.body.x.toFixed(3)},${f.body.z.toFixed(3)}`)).toEqual(a);
    stage(r);
    for (let i = 0; i < 100; i++) r.tick(0.1);
    expect(r.world.fauna.map((f) => `${f.body.x.toFixed(3)},${f.body.z.toFixed(3)}`)).not.toEqual(a);
  });
  it('golpe por ação: alcance, pausa, vida e abate com espólio no chão da sala', () => {
    const r = orv(), { id, f } = stage(r), far = r.join(hello('Beto')).id!;
    r.handle(far, { t: 'state', s: { x: f.body.x + 40, y: f.body.y, z: f.body.z, yaw: 0, pitch: 0, sel: 0 } });
    expect(applied(r.handle(far, { t: 'act', seq: 1, a: { k: 'strikeFauna', id: f.id } }))).toMatchObject({ ok: false, msg: 'Longe demais' });
    r.tick(1);
    const hp0 = f.hp, ap = applied(r.handle(id, { t: 'act', seq: 1, a: { k: 'strikeFauna', id: f.id } }));
    expect(ap.ok).toBe(true); expect(f.hp).toBeLessThan(hp0); expect(f.phase).toBe('panic');
    expect(applied(r.handle(id, { t: 'act', seq: 2, a: { k: 'strikeFauna', id: f.id } })).ok).toBe(false); // dentro da pausa de 0,6 s
    let killed = false;
    for (let i = 0; i < 20 && !killed; i++) { r.tick(0.7); const out = r.handle(id, { t: 'act', seq: 3 + i, a: { k: 'strikeFauna', id: f.id } }); killed = !r.world.fauna.includes(f); void out; }
    expect(killed).toBe(true); expect(r.world.drops.size).toBeGreaterThan(0); // o abate soltou o espólio na sala
    expect(applied(r.handle(id, { t: 'act', seq: 99, a: { k: 'strikeFauna', id: f.id } })).ok).toBe(false); // já não existe
  });
  it('alimentar por ação: só com a comida da espécie e só gasta se tem efeito', () => {
    const r = orv(), { id, f } = stage(r);
    const food = { porco: Item.CENOURA, vaca: Item.TRIGO, ovelha: Item.TRIGO, galinha: Item.SEMENTE_TRIGO }[f.kind];
    give(r, id, Item.PEDRA_LISA, 2);
    expect(applied(r.handle(id, { t: 'act', seq: 1, a: { k: 'feedFauna', id: f.id } })).ok).toBe(false); // pedra não é comida
    give(r, id, food, 3);
    const ap = applied(r.handle(id, { t: 'act', seq: 2, a: { k: 'feedFauna', id: f.id } }));
    expect(ap.ok).toBe(true); expect(f.baby ? f.grow < GROW_S : f.love > 0).toBe(true); expect(r.viewOf(id)!.inventory.total(food)).toBe(2);
  });
  it('snapshot e restore guardam a fauna da sala; o arquivo da entrega A (sem a marca) volta à fauna da seed', () => {
    const r = orv(); stage(r);
    const f0 = r.world.fauna[0]; f0.hp = 1;
    const snap = JSON.parse(JSON.stringify(r.snapshot()));
    expect(snap.fauna).toBe(1);
    const r2 = orv(); expect(r2.restore(snap)).toBe(true); expect(r2.world.fauna.find((f) => f.id === f0.id)?.hp).toBe(1); expect(r2.world.fauna.length).toBe(r.world.fauna.length);
    const old = JSON.parse(JSON.stringify(snap)); delete old.fauna; old.header.fauna = []; // como a sala 102 da entrega A gravou
    const r3 = orv(); expect(r3.restore(old)).toBe(true); expect(r3.world.fauna.length).toBeGreaterThan(0);
  });
  it('o cliente espelha a fauna da sala, manda o golpe e vê o abate', async () => {
    const srv = new TitanLoopbackServer(() => 0.5), room = srv.rooms.get(102)!;
    const f = room.world.fauna.slice().sort((a, b) => Math.hypot(a.body.x - room.world.volume.gen.arrival.x, a.body.z - room.world.volume.gen.arrival.z) - Math.hypot(b.body.x - room.world.volume.gen.arrival.x, b.body.z - room.world.volume.gen.arrival.z))[0];
    const c = new TitanClient(srv.connect()), s = await c.connect('Ana', 102);
    await flush();
    expect(s.fauna).toEqual([]); // o welcome não traz a fauna
    const v = room.viewOf(c.id)!; v.body.x = f.body.x + 1.2; v.body.y = f.body.y; v.body.z = f.body.z;
    for (let i = 0; i < 5; i++) srv.tick(0.1);
    await flush();
    const mine = c.session.fauna.find((e) => e.id === f.id)!;
    expect(c.session.fauna.length).toBeGreaterThan(0); expect(mine).toBeTruthy(); expect(mine.kind).toBe(f.kind); expect(Math.abs(mine.body.x - f.body.x)).toBeLessThan(0.05);
    const hp0 = f.hp; const r = await c.strikeFauna(f.id); expect(r.ok).toBe(true); expect(f.hp).toBeLessThan(hp0);
    for (let i = 0; i < 5; i++) srv.tick(0.1);
    await flush();
    expect(c.session.fauna.find((e) => e.id === f.id)?.hp).toBe(f.hp);
  });
});
