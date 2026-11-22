import { describe, expect, it } from 'vitest';
import { Item } from '../../titan/items';
import { T, doorId, isDoorOpen } from '../../titan/voxel';
import { TitanLoopbackServer } from './loopback';
import { parseTitanClientMessage, TITAN_MAX_PLAYERS, TITAN_PROTOCOL_VERSION, type TitanServerMessage } from './protocol';
import { TitanRoom } from './room';

/** Salas do Titã (ADR 0104): visões por jogador sobre um mundo compartilhado, ações autoritativas, repasse de edições, snapshot. */
const Y = 150;
const room = (): TitanRoom => new TitanRoom(101, 'Titã 1', 20261122, () => 0.5);
const hello = (name: string, v = TITAN_PROTOCOL_VERSION) => ({ t: 'hello' as const, v, name, room: 101 });
const floorAt = (r: TitanRoom) => {
  const a = r.world.volume.gen.arrival, x = Math.floor(a.x) + 6, z = Math.floor(a.z) + 6;
  for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) { r.world.volume.set(x + dx, Y - 1, z + dz, T.DARK_ROCK); for (let yy = Y; yy < Y + 5; yy++) r.world.volume.set(x + dx, yy, z + dz, T.AIR); }
  r.tick(0); // as edições do cenário já estão no mundo: esvazia o que seria repassado
  return { x, z };
};
const stand = (r: TitanRoom, id: number, x: number, z: number): void => { r.handle(id, { t: 'state', s: { x: x + 0.5, y: Y, z: z + 2.5, yaw: 0, pitch: 0, sel: 0 } }); };
const give = (r: TitanRoom, id: number, item: number, n = 5): void => { const v = r.viewOf(id)!; v.inventory.add(item, n); const k = [...Array(36).keys()].find((i) => v.inventory.get(i)?.item === item)!; v.inventory.move(k, 0); v.selected = 0; };
const kinds = (out: Array<{ msg: TitanServerMessage }>): string[] => out.map((o) => o.msg.t);

describe('sala do Titã: entrar e sair', () => {
  it('welcome traz o cabeçalho da seed; os outros recebem joined; sair avisa todos', () => {
    const r = room(), a = r.join(hello('Ana')), b = r.join(hello('Beto'));
    const w = a.out[0].msg;
    expect(w.t === 'welcome' && w.header.seed === 20261122 && w.header.world === 'titan').toBe(true);
    expect(kinds(b.out)).toEqual(['welcome', 'joined']);
    expect(b.out[0].msg.t === 'welcome' && b.out[0].msg.players.map((p) => p.name)).toEqual(['Ana']);
    expect(r.leave(a.id!)).toEqual([{ to: 'all', msg: { t: 'left', id: a.id } }]);
  });
  it('recusa versão diferente, nome inválido ou repetido e sala cheia', () => {
    const r = room();
    expect((r.join(hello('Ana', 99)).out[0].msg as { code: string }).code).toBe('version');
    expect((r.join(hello('x')).out[0].msg as { code: string }).code).toBe('name');
    r.join(hello('Ana'));
    expect((r.join(hello('ana')).out[0].msg as { code: string }).code).toBe('name');
    for (let i = 1; i < TITAN_MAX_PLAYERS; i++) r.join(hello(`Jogador${i}`));
    expect((r.join(hello('Ultimo')).out[0].msg as { code: string }).code).toBe('full');
  });
  it('o analisador rejeita lixo e valida os campos', () => {
    expect(parseTitanClientMessage('{"t":"state","s":{"x":1,"y":2,"z":3,"yaw":0,"pitch":0,"sel":99}}')).toBeNull();
    expect(parseTitanClientMessage('{"t":"act","seq":1,"a":{"k":"place","hit":{"x":1,"y":2,"z":3,"nx":0,"ny":5,"nz":0},"slot":0}}')).toBeNull();
    expect(parseTitanClientMessage('{"t":"act","seq":1,"a":{"k":"place","hit":{"x":1,"y":2,"z":3,"nx":0,"ny":1,"nz":0},"slot":0}}')).not.toBeNull();
    expect(parseTitanClientMessage('não é json')).toBeNull();
  });
});

describe('sala do Titã: ações de mundo', () => {
  it('colocar: aplica na bolsa do jogador, repassa a edição a todos; longe demais é recusado', () => {
    const r = room(), { x, z } = floorAt(r), a = r.join(hello('Ana')).id!, b = r.join(hello('Beto')).id!;
    stand(r, a, x, z); give(r, a, Item.DARK_ROCK);
    const out = r.handle(a, { t: 'act', seq: 7, a: { k: 'place', hit: { x, y: Y - 1, z, nx: 0, ny: 1, nz: 0 }, slot: 0 } });
    const ap = out.find((o) => o.msg.t === 'applied')!.msg as Extract<TitanServerMessage, { t: 'applied' }>;
    expect(ap.seq).toBe(7); expect(ap.ok).toBe(true);
    expect(r.world.volume.get(x, Y, z)).toBe(T.DARK_ROCK);
    expect(out.find((o) => o.msg.t === 'edits')).toMatchObject({ to: 'all', msg: { cells: [[x, Y, z, T.DARK_ROCK]] } });
    expect(r.viewOf(a)!.inventory.total(Item.DARK_ROCK)).toBe(4);
    expect(r.viewOf(b)!.inventory.total(Item.DARK_ROCK)).toBe(0); // a bolsa é de cada um
    const far = r.handle(a, { t: 'act', seq: 8, a: { k: 'place', hit: { x: x + 40, y: Y - 1, z, nx: 0, ny: 1, nz: 0 }, slot: 0 } });
    expect(far.find((o) => o.msg.t === 'applied')!.msg).toMatchObject({ ok: false, msg: 'Longe demais' });
    expect(r.world.volume.get(x + 40, Y, z)).not.toBe(T.DARK_ROCK);
  });
  it('quebrar solta o item; o tick o recolhe para a bolsa de quem está perto e avisa só ele', () => {
    const r = room(), { x, z } = floorAt(r), a = r.join(hello('Ana')).id!, b = r.join(hello('Beto')).id!;
    r.world.volume.set(x, Y, z, T.DARK_ROCK);
    stand(r, a, x, z); r.handle(b, { t: 'state', s: { x: x + 3.5, y: Y, z: z + 3.5, yaw: 0, pitch: 0, sel: 0 } });
    const out = r.handle(a, { t: 'act', seq: 1, a: { k: 'break', hit: { x, y: Y, z, nx: 0, ny: 1, nz: 0 } } });
    expect(out.find((o) => o.msg.t === 'applied')!.msg).toMatchObject({ ok: true });
    expect(r.world.volume.get(x, Y, z)).toBe(T.AIR);
    expect(kinds(out)).toContain('drops');
    let got: Array<{ to: unknown; msg: TitanServerMessage }> = [];
    r.viewOf(a)!.body.x = x + 0.5; r.viewOf(a)!.body.z = z + 0.5;
    for (let i = 0; i < 40; i++) got = got.concat(r.tick(0.1));
    expect(r.viewOf(a)!.inventory.total(Item.DARK_ROCK)).toBe(1);
    expect(got.filter((o) => o.msg.t === 'bag').map((o) => o.to)).toEqual([a]);
  });
  it('porta: colocar (duas células), abrir por `use` e o estado vai a todos', () => {
    const r = room(), { x, z } = floorAt(r), a = r.join(hello('Ana')).id!;
    stand(r, a, x, z); give(r, a, Item.PORTA_JUNCO);
    r.handle(a, { t: 'act', seq: 1, a: { k: 'place', hit: { x, y: Y - 1, z, nx: 0, ny: 1, nz: 0 }, slot: 0 } });
    expect(r.world.volume.get(x, Y + 1, z)).toBe(doorId(0, false, false, true));
    const out = r.handle(a, { t: 'act', seq: 2, a: { k: 'use', x, y: Y, z } });
    expect(isDoorOpen(r.world.volume.get(x, Y, z))).toBe(true);
    expect(out.find((o) => o.msg.t === 'applied')!.msg).toMatchObject({ ok: true, open: true });
    expect((out.find((o) => o.msg.t === 'edits')!.msg as { cells: unknown[] }).cells).toHaveLength(2);
  });
  it('o relógio e as revisões são do mundo: uma ação de uma visão não cria cópia divergente', () => {
    const r = room(), a = r.join(hello('Ana')).id!, v = r.viewOf(a)!;
    const before = r.world.time;
    r.tick(60);
    expect(v.time).toBeCloseTo(r.world.time, 9); expect(r.world.time).not.toBe(before);
    v.dropsRev++; expect(r.world.dropsRev).toBe(v.dropsRev);
  });
});

describe('sala do Titã: snapshot e loopback', () => {
  it('snapshot/restore: o mundo editado e a bolsa por nome sobrevivem', () => {
    const r = room(), { x, z } = floorAt(r), a = r.join(hello('Ana')).id!;
    stand(r, a, x, z); give(r, a, Item.DARK_ROCK);
    r.handle(a, { t: 'act', seq: 1, a: { k: 'place', hit: { x, y: Y - 1, z, nx: 0, ny: 1, nz: 0 }, slot: 0 } });
    const snap = JSON.parse(JSON.stringify(r.snapshot()));
    const r2 = room();
    expect(r2.restore(snap)).toBe(true);
    expect(r2.world.volume.get(x, Y, z)).toBe(T.DARK_ROCK);
    const j = r2.join(hello('ana'));
    expect(r2.viewOf(j.id!)!.inventory.total(Item.DARK_ROCK)).toBe(4);
    expect(room().restore({ ...snap, header: { ...snap.header, seed: 1 } })).toBe(false);
  });
  it('dois aparelhos pelo loopback: o segundo vê a construção do primeiro', async () => {
    const srv = new TitanLoopbackServer(() => 0.5), room1 = srv.rooms.get(101)!;
    const { x, z } = floorAt(room1);
    const seen: TitanServerMessage[] = [];
    const t1 = srv.connect(), t2 = srv.connect();
    t2.onMessage = (m) => seen.push(m);
    t1.send(JSON.stringify(hello('Ana'))); t2.send(JSON.stringify(hello('Beto')));
    await Promise.resolve();
    const aId = [...room1.playerNames()].indexOf('Ana') + 1; // ids 1 e 2 na ordem de entrada
    room1.handle(aId, { t: 'state', s: { x: x + 0.5, y: Y, z: z + 2.5, yaw: 0, pitch: 0, sel: 0 } }); give(room1, aId, Item.DARK_ROCK);
    t1.send(JSON.stringify({ t: 'act', seq: 1, a: { k: 'place', hit: { x, y: Y - 1, z, nx: 0, ny: 1, nz: 0 }, slot: 0 } }));
    await Promise.resolve(); await Promise.resolve();
    expect(seen.some((m) => m.t === 'edits' && m.cells.some((c) => c[0] === x && c[1] === Y && c[3] === T.DARK_ROCK))).toBe(true);
  });
  it('`size` e `dirty` para o servidor: grava só o que mudou, e `snapshot` limpa a marca', () => {
    const r = room();
    expect(r.size).toBe(0); expect(r.dirty).toBe(false);
    const a = r.join(hello('Ana')).id!;
    expect(r.size).toBe(1); expect(r.dirty).toBe(false); // entrar não muda o que vai para o arquivo
    r.leave(a);
    expect(r.dirty).toBe(true); r.snapshot(); expect(r.dirty).toBe(false);
    expect(r.restore(JSON.parse(JSON.stringify(r.snapshot())))).toBe(true); expect(r.dirty).toBe(false);
  });
});
