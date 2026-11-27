import { describe, expect, it } from 'vitest';
import { Item } from '../../titan/items';
import { T } from '../../titan/voxel';
import { TitanClient } from './client';
import { TitanLoopbackServer } from './loopback';
import { TITAN_PROTOCOL_VERSION, TITAN_ROOMS, titanRoomById, titanRoomsOf, type TitanServerMessage } from './protocol';
import { TitanRoom } from './room';

/** Orvalis em sala (ADR 0138): a sala 102 usa o gerador e as regras do Orvalis; entrega A = sala básica; entrega B = fauna de fazenda (`salaFauna.test.ts`); entrega C = pesca e botes (`salaPescaBotes.test.ts`). */
const Y = 150;
const orv = (): TitanRoom => new TitanRoom(102, 'Orvalis 1', 20261127, () => 0.5, 'orvalis');
const hello = (name: string) => ({ t: 'hello' as const, v: TITAN_PROTOCOL_VERSION, name, room: 102 });
const flush = async (): Promise<void> => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
const floorAt = (r: TitanRoom) => {
  const a = r.world.volume.gen.arrival, x = Math.floor(a.x) + 6, z = Math.floor(a.z) + 6;
  for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) { r.world.volume.set(x + dx, Y - 1, z + dz, T.STONE); for (let yy = Y; yy < Y + 5; yy++) r.world.volume.set(x + dx, yy, z + dz, T.AIR); }
  r.tick(0);
  return { x, z };
};
const give = (r: TitanRoom, id: number, item: number, n = 5): number => { const v = r.viewOf(id)!; v.inventory.add(item, n); const k = [...Array(36).keys()].find((i) => v.inventory.get(i)?.item === item)!; v.inventory.move(k, 0); return 0; };
const stand = (r: TitanRoom, id: number, x: number, z: number): void => { r.handle(id, { t: 'state', s: { x: x + 0.5, y: Y, z: z + 2.5, yaw: 0, pitch: 0, sel: 0 } }); };
const applied = (out: Array<{ msg: TitanServerMessage }>) => out.find((o) => o.msg.t === 'applied')!.msg as Extract<TitanServerMessage, { t: 'applied' }>;

describe('sala do Orvalis (ADR 0138)', () => {
  it('as salas são por mundo: 101 do Titã e 102 do Orvalis (seed 20261127)', () => {
    expect(titanRoomsOf('titan').map((r) => r.id)).toEqual([101]); expect(titanRoomsOf('orvalis').map((r) => r.id)).toEqual([102]);
    expect(titanRoomById(102)).toMatchObject({ name: 'Orvalis 1', seed: 20261127, world: 'orvalis' }); expect(TITAN_ROOMS.every((r) => r.world)).toBe(true);
  });
  it('o welcome traz o mundo do Orvalis (sem a fauna, que vem pela mensagem `fauna`); o Titã segue com o dele', () => {
    const r = orv(), a = r.join(hello('Ana')), w = a.out[0].msg;
    expect(w.t === 'welcome' && w.header.world === 'orvalis' && w.header.seed === 20261127 && w.header.generatorVersion >= 6).toBe(true);
    expect(r.world.volume.gen.world).toBe('orvalis'); expect(r.world.fauna.length).toBeGreaterThan(0); expect(w.t === 'welcome' && w.header.fauna).toBeUndefined();
    expect(new TitanRoom(101, 'Titã 1', 20261122, () => 0.5).world.volume.gen.world).toBe('titan');
  });
  it('colocar e quebrar valem como no aparelho e repassam a edição a todos', () => {
    const r = orv(), { x, z } = floorAt(r), a = r.join(hello('Ana')).id!, b = r.join(hello('Beto')).id!;
    stand(r, a, x, z); give(r, a, Item.STONE);
    const out = r.handle(a, { t: 'act', seq: 1, a: { k: 'place', hit: { x, y: Y - 1, z, nx: 0, ny: 1, nz: 0 }, slot: 0 } });
    expect(applied(out).ok).toBe(true); expect(r.world.volume.get(x, Y, z)).toBe(T.STONE);
    expect(out.find((o) => o.msg.t === 'edits')).toMatchObject({ to: 'all', msg: { cells: [[x, Y, z, T.STONE]] } });
    expect(r.viewOf(b)!.inventory.total(Item.STONE)).toBe(0);
  });
  it('o bloco de coral vivo sem água morre também na sala', () => {
    const r = orv(), { x, z } = floorAt(r);
    r.world.volume.set(x, Y + 2, z, T.CORAL_BLOCK); r.world.coralWatch.set('c', { x, y: Y + 2, z, t: 1 });
    r.tick(0.5); expect(r.world.volume.get(x, Y + 2, z)).toBe(T.CORAL_BLOCK);
    const out = r.tick(0.6);
    expect(r.world.volume.get(x, Y + 2, z)).toBe(T.CORAL_BLOCK + 5); expect(out.some((o) => o.msg.t === 'edits')).toBe(true);
  });
  it('snapshot e restore voltam ao mesmo mundo; o arquivo de outro mundo é recusado', () => {
    const r = orv(), { x, z } = floorAt(r), a = r.join(hello('Ana')).id!;
    stand(r, a, x, z); give(r, a, Item.STONE);
    r.handle(a, { t: 'act', seq: 1, a: { k: 'place', hit: { x, y: Y - 1, z, nx: 0, ny: 1, nz: 0 }, slot: 0 } });
    const snap = JSON.parse(JSON.stringify(r.snapshot()));
    const r2 = orv();
    expect(r2.restore(snap)).toBe(true); expect(r2.world.volume.get(x, Y, z)).toBe(T.STONE); expect(r2.world.volume.gen.world).toBe('orvalis'); expect(r2.world.fauna.length).toBe(r.world.fauna.length);
    expect(new TitanRoom(102, 'x', 20261127, () => 0.5, 'titan').restore(snap)).toBe(false); // sala do Titã não abre arquivo do Orvalis
    expect(new TitanRoom(101, 'Titã 1', 20261122, () => 0.5).restore(JSON.parse(JSON.stringify(new TitanRoom(101, 'Titã 1', 20261122, () => 0.5).snapshot())))).toBe(true); // o Titã segue igual
  });
  it('o cliente entra na sala 102 e abre a sessão do Orvalis, sem botes locais e com a fauna só pelo fluxo da sala', async () => {
    const srv = new TitanLoopbackServer(() => 0.5);
    const c = new TitanClient(srv.connect()), s = await c.connect('Ana', 102);
    await flush();
    expect(s.volume.gen.world).toBe('orvalis'); expect(s.seed).toBe(20261127); expect(s.fauna).toEqual([]); expect(s.boats).toEqual([]);
    expect(s.volume.get(Math.floor(s.body.x), Math.floor(s.body.y) - 1, Math.floor(s.body.z))).not.toBe(T.AIR);
  });
});
