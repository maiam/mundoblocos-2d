import { describe, expect, it } from 'vitest';
import { newFarejador } from '../../titan/creature';
import { Item } from '../../titan/items';
import { isNightTime } from '../../titan/sky';
import { MAX_HEALTH } from '../../titan/vitals';
import { T } from '../../titan/voxel';
import { TITAN_PROTOCOL_VERSION, parseTitanClientMessage, type TitanServerMessage } from './protocol';
import { TitanRoom, type TitanOutgoing } from './room';

/** Sobrevivência compartilhada nas salas do Titã (ADR 0104, fatia C): baús, braseiros, Farejadores, morte e a noite com todos na cama. */
const Y = 150;
const room = (): TitanRoom => new TitanRoom(101, 'Titã 1', 20261122, () => 0.5);
const hello = (name: string) => ({ t: 'hello' as const, v: TITAN_PROTOCOL_VERSION, name, room: 101 });
const floorAt = (r: TitanRoom) => {
  const a = r.world.volume.gen.arrival, x = Math.floor(a.x) + 6, z = Math.floor(a.z) + 6;
  for (let dx = -6; dx <= 6; dx++) for (let dz = -6; dz <= 6; dz++) { r.world.volume.set(x + dx, Y - 1, z + dz, T.DARK_ROCK); for (let yy = Y; yy < Y + 5; yy++) r.world.volume.set(x + dx, yy, z + dz, T.AIR); }
  r.world.creatures.length = 0; // sem bichos do bioma: o teste põe os seus
  r.tick(0);
  return { x, z };
};
const at = (r: TitanRoom, id: number, x: number, z: number, v?: { health: number; hunger: number; saturation: number; air: number }): void => { r.handle(id, { t: 'state', s: { x: x + 0.5, y: Y, z: z + 0.5, yaw: 0, pitch: 0, sel: 0 }, ...(v ? { v } : {}) }); };
const give = (r: TitanRoom, id: number, item: number, n = 5): void => { const v = r.viewOf(id)!; v.inventory.add(item, n); const k = [...Array(36).keys()].find((i) => v.inventory.get(i)?.item === item)!; v.inventory.move(k, 0); v.selected = 0; };
const ap = (out: TitanOutgoing[]) => out.find((o) => o.msg.t === 'applied')!.msg as Extract<TitanServerMessage, { t: 'applied' }>;
const kinds = (out: TitanOutgoing[]): string[] => out.map((o) => o.msg.t);
const put = (r: TitanRoom, id: number, x: number, z: number, item: number): void => { give(r, id, item, 1); r.handle(id, { t: 'act', seq: 1, a: { k: 'place', hit: { x, y: Y - 1, z, nx: 0, ny: 1, nz: 0 }, slot: 0 } }); };

describe('sala do Titã: baús e braseiros compartilhados', () => {
  it('um guarda no baú, o outro tira: o baú é do mundo e os dois recebem o novo conteúdo', () => {
    const r = room(), { x, z } = floorAt(r), a = r.join(hello('Ana')).id!, b = r.join(hello('Beto')).id!;
    at(r, a, x, z + 2); at(r, b, x + 1, z + 2);
    put(r, a, x, z, Item.BAU);
    expect(r.world.volume.get(x, Y, z)).toBeGreaterThanOrEqual(T.CHEST);
    give(r, a, Item.DARK_ROCK, 3);
    const k = [...Array(36).keys()].find((i) => r.viewOf(a)!.inventory.get(i)?.item === Item.DARK_ROCK)!;
    const o1 = r.handle(a, { t: 'act', seq: 2, a: { k: 'chest', x, y: Y, z, op: 'in', slot: k } });
    expect(ap(o1).ok).toBe(true); expect(kinds(o1)).toContain('chest');
    expect(r.viewOf(a)!.inventory.total(Item.DARK_ROCK)).toBe(0);
    const o2 = r.handle(b, { t: 'act', seq: 1, a: { k: 'chest', x, y: Y, z, op: 'out', i: 0 } });
    expect(ap(o2).ok).toBe(true);
    expect(r.viewOf(b)!.inventory.total(Item.DARK_ROCK)).toBe(3);
  });
  it('braseiro: levar combustível; o estado de todos os braseiros chega por `furnaces` e a cada segundo', () => {
    const r = room(), { x, z } = floorAt(r), a = r.join(hello('Ana')).id!;
    at(r, a, x, z + 2); put(r, a, x, z, Item.BRAZIER);
    give(r, a, Item.EMBER, 2);
    const k = [...Array(36).keys()].find((i) => r.viewOf(a)!.inventory.get(i)?.item === Item.EMBER)!;
    const out = r.handle(a, { t: 'act', seq: 2, a: { k: 'furnace', x, y: Y, z, op: 'in', kind: 'fuel', slot: k } });
    expect(ap(out).ok).toBe(true); expect(kinds(out)).toContain('furnaces');
    expect(r.world.furnaces.size).toBe(1);
    expect(kinds(r.tick(1.1))).toContain('furnaces');
  });
});

describe('sala do Titã: Farejadores', () => {
  it('a sala os simula e manda a lista; golpe tira vida, tem pausa e alcance; abate solta espólio e agenda a volta', () => {
    const r = room(), { x, z } = floorAt(r), a = r.join(hello('Ana')).id!;
    at(r, a, x, z);
    const f = newFarejador('pequeno', { x: x + 1.5, y: Y, z: z + 0.5 }, 1, 'p0'); f.body.x = x + 1.5; f.body.y = Y; f.body.z = z + 0.5; f.hp = 3; f.phase = 'stunned'; f.t = 0;
    r.world.creatures.push(f);
    const out = r.tick(0.1);
    const list = out.find((o) => o.msg.t === 'creatures')!.msg as Extract<TitanServerMessage, { t: 'creatures' }>;
    expect(list.list.map((c) => c.id)).toEqual(['p0']);
    const hit = r.handle(a, { t: 'act', seq: 3, a: { k: 'strike', id: 'p0' } });
    expect(ap(hit).ok).toBe(true); expect(f.hp).toBeLessThan(3);
    expect(ap(r.handle(a, { t: 'act', seq: 4, a: { k: 'strike', id: 'p0' } })).ok).toBe(false); // pausa de 0,6 s
    r.tick(1); f.body.x = x + 20; // longe demais
    expect(ap(r.handle(a, { t: 'act', seq: 5, a: { k: 'strike', id: 'p0' } }))).toMatchObject({ ok: false, msg: 'Longe demais' });
    f.body.x = x + 1.5; f.hp = 1; r.tick(1);
    const kill = r.handle(a, { t: 'act', seq: 6, a: { k: 'strike', id: 'p0' } });
    expect(ap(kill).ok).toBe(true); expect(r.world.creatures.some((c) => c.id === 'p0')).toBe(false);
    expect(r.world.respawn.has('p0')).toBe(true); expect(kinds(kill)).toContain('drops');
  });
  it('quem é investido recebe `hurt` só ele', () => {
    const r = room(), { x, z } = floorAt(r), a = r.join(hello('Ana')).id!, b = r.join(hello('Beto')).id!;
    at(r, a, x, z); at(r, b, x + 5, z + 5);
    const f = newFarejador('grande', { x: x + 1, y: Y, z: z + 0.5 }, 1, 'g0'); f.body.x = x + 1; f.body.y = Y; f.body.z = z + 0.5; f.phase = 'charge'; f.t = 0;
    r.world.creatures.push(f);
    const got: TitanOutgoing[] = [];
    for (let i = 0; i < 60; i++) { got.push(...r.tick(0.05)); at(r, a, x, z); if (got.some((o) => o.msg.t === 'hurt')) break; }
    const hurt = got.filter((o) => o.msg.t === 'hurt');
    expect(hurt.length).toBeGreaterThan(0); expect(hurt.every((o) => o.to === a)).toBe(true);
  });
});

describe('sala do Titã: morte e noite', () => {
  it('morrer: só com a vida zerada no último state; solta as pilhas, renasce e manda o renascer', () => {
    const r = room(), { x, z } = floorAt(r), a = r.join(hello('Ana')).id!;
    at(r, a, x, z); give(r, a, Item.DARK_ROCK, 4);
    expect(ap(r.handle(a, { t: 'act', seq: 1, a: { k: 'die' } })).ok).toBe(false);
    at(r, a, x, z, { health: 0, hunger: 10, saturation: 0, air: 15 });
    const out = r.handle(a, { t: 'act', seq: 2, a: { k: 'die' } });
    expect(ap(out).ok).toBe(true);
    const re = out.find((o) => o.msg.t === 'respawn')!.msg as Extract<TitanServerMessage, { t: 'respawn' }>;
    expect(re.vitals.health).toBe(MAX_HEALTH);
    expect(r.viewOf(a)!.inventory.total(Item.DARK_ROCK)).toBe(0);
    expect([...r.world.drops.values()].some((d) => d.item === Item.DARK_ROCK)).toBe(true);
    expect(kinds(out)).toContain('drops');
  });
  it('a noite só passa com todos na cama; sair da cama desfaz o voto', () => {
    const r = room(), { x, z } = floorAt(r), a = r.join(hello('Ana')).id!, b = r.join(hello('Beto')).id!;
    at(r, a, x, z + 3); at(r, b, x + 3, z + 3);
    put(r, a, x, z, Item.CAMA); put(r, a, x + 2, z - 3, Item.CAMA);
    r.world.time = 0.9; expect(isNightTime(r.world.time)).toBe(true);
    const bed1 = { x, y: Y, z }, bed2 = { x: x + 2, y: Y, z: z - 3 };
    const o1 = r.handle(a, { t: 'act', seq: 1, a: { k: 'use', ...bed1 } });
    expect(ap(o1).msg).toContain('1 de 2'); expect(isNightTime(r.world.time)).toBe(true);
    at(r, b, x + 2.5, z - 2); // Beto perto da cama dele
    const o2 = r.handle(b, { t: 'act', seq: 1, a: { k: 'use', ...bed2 } });
    expect(isNightTime(r.world.time)).toBe(false);
    expect(kinds(r.tick(0.1))).toContain('time'); expect(ap(o2).ok).toBe(true);
  });
  it('o analisador aceita as ações novas e rejeita as malformadas', () => {
    const ok = (a: unknown): boolean => parseTitanClientMessage(JSON.stringify({ t: 'act', seq: 1, a })) !== null;
    expect(ok({ k: 'chest', x: 1, y: 2, z: 3, op: 'in', slot: 4 })).toBe(true);
    expect(ok({ k: 'chest', x: 1, y: 2, z: 3, op: 'out', i: 30 })).toBe(false);
    expect(ok({ k: 'furnace', x: 1, y: 2, z: 3, op: 'in', kind: 'output', slot: 1 })).toBe(false);
    expect(ok({ k: 'furnace', x: 1, y: 2, z: 3, op: 'out', kind: 'output' })).toBe(true);
    expect(ok({ k: 'strike', id: 'g0' })).toBe(true); expect(ok({ k: 'die' })).toBe(true);
    expect(parseTitanClientMessage(JSON.stringify({ t: 'state', s: { x: 1, y: 2, z: 3, yaw: 0, pitch: 0, sel: 0 }, v: { health: 'x' } }))).toBeNull();
  });
});
