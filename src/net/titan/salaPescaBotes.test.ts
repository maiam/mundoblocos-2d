import { describe, expect, it } from 'vitest';
import { BOAT_MAX_SPEED, BOAT_Y, boatSeat } from '../../titan/boat';
import { Item } from '../../titan/items';
import { LAKE_LAST_Y, T } from '../../titan/voxel';
import { TitanClient } from './client';
import { TitanLoopbackServer } from './loopback';
import { TITAN_PROTOCOL_VERSION, parseTitanClientMessage, type TitanServerMessage } from './protocol';
import { TitanRoom } from './room';

/** Pesca e botes na sala do Orvalis (ADR 0138, entrega C): a boia é de cada jogador, o bote é compartilhado e o piloto manda a posição, que a sala confere. */
const orv = (): TitanRoom => new TitanRoom(102, 'Orvalis 1', 20261127, () => 0.5, 'orvalis');
const hello = (name: string) => ({ t: 'hello' as const, v: TITAN_PROTOCOL_VERSION, name, room: 102 });
const flush = async (): Promise<void> => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
/** Lagoa de 21 × 21 (superfície em Y = 64) ao lado da chegada, cercada de pedra; devolve o centro. */
function lagoon(r: TitanRoom) {
  const a = r.world.volume.gen.arrival, cx = Math.floor(a.x) + 8, cz = Math.floor(a.z) + 8, v = r.world.volume;
  for (let dx = -11; dx <= 11; dx++) for (let dz = -11; dz <= 11; dz++) for (let y = 56; y <= 70; y++) {
    const rim = Math.abs(dx) === 11 || Math.abs(dz) === 11;
    v.set(cx + dx, y, cz + dz, y < 58 ? T.STONE : rim ? (y <= 66 ? T.STONE : T.AIR) : y <= LAKE_LAST_Y ? T.LAKE : T.AIR);
  }
  r.tick(0);
  return { cx, cz };
}
const give = (r: TitanRoom, id: number, item: number, n = 1): number => { const v = r.viewOf(id)!; v.inventory.add(item, n); const k = [...Array(36).keys()].find((i) => v.inventory.get(i)?.item === item)!; v.inventory.move(k, 0); return 0; };
const stand = (r: TitanRoom, id: number, x: number, y: number, z: number): void => { r.handle(id, { t: 'state', s: { x, y, z, yaw: 0, pitch: 0, sel: 0 } }); };
const of = <T extends TitanServerMessage['t']>(out: Array<{ to: unknown; msg: TitanServerMessage }>, t: T) => out.filter((o) => o.msg.t === t) as Array<{ to: unknown; msg: Extract<TitanServerMessage, { t: T }> }>;
const act = (r: TitanRoom, id: number, seq: number, a: Parameters<TitanRoom['handle']>[1] extends infer M ? M extends { t: 'act'; a: infer A } ? A : never : never) => r.handle(id, { t: 'act', seq, a });
const applied = (out: Array<{ to: unknown; msg: TitanServerMessage }>) => of(out, 'applied')[0].msg;

describe('pesca na sala (ADR 0138, entrega C)', () => {
  it('lançar, esperar a fisgada, recolher: a boia é só do dono e o peixe vem pela sala', () => {
    const r = orv(), { cx, cz } = lagoon(r), a = r.join(hello('Ana')).id!, b = r.join(hello('Beto')).id!;
    stand(r, a, cx + 0.5, 66, cz + 2.5); stand(r, b, cx + 6.5, 66, cz + 6.5); give(r, a, Item.VARA_PESCA);
    const hit = { x: cx, y: LAKE_LAST_Y, z: cz, nx: 0, ny: 1, nz: 0 };
    const cast = act(r, a, 1, { k: 'place', hit, slot: 0 });
    expect(applied(cast).ok).toBe(true);
    const bob = of(cast, 'bobber'); expect(bob).toHaveLength(1); expect(bob[0].to).toBe(a); expect(bob[0].msg.b).toMatchObject({ x: cx, y: LAKE_LAST_Y + 1, z: cz, bite: 0 });
    expect(r.viewOf(b)!.fishing).toBeNull(); // o outro jogador não tem boia
    let bite: ReturnType<typeof of<'bobber'>>[number] | undefined;
    for (let i = 0; i < 400 && !bite; i++) bite = of(r.tick(0.1), 'bobber').find((o) => o.msg.e === 'bite');
    expect(bite?.to).toBe(a); expect(bite?.msg.b?.bite).toBe(1);
    const reel = act(r, a, 2, { k: 'place', hit, slot: 0 });
    expect(applied(reel)).toMatchObject({ ok: true }); expect(applied(reel).msg).toMatch(/Pescou/);
    expect(of(reel, 'bobber')[0].msg.b).toBeNull(); expect(r.viewOf(a)!.fishing).toBeNull();
    expect(r.viewOf(a)!.inventory.get(0)?.wear).toBe(1);
    const fish = [Item.BACALHAU_CRU, Item.SALMAO_CRU, Item.BAIACU, Item.PEIXE_TROPICAL].reduce((n, i) => n + r.viewOf(a)!.inventory.total(i), 0);
    expect(fish).toBe(1);
  });
  it('a linha se solta se o jogador se afasta, e só ele é avisado', () => {
    const r = orv(), { cx, cz } = lagoon(r), a = r.join(hello('Ana')).id!;
    stand(r, a, cx + 0.5, 66, cz + 2.5); give(r, a, Item.VARA_PESCA);
    act(r, a, 1, { k: 'place', hit: { x: cx, y: LAKE_LAST_Y, z: cz, nx: 0, ny: 1, nz: 0 }, slot: 0 });
    stand(r, a, cx + 0.5, 66, cz + 60);
    const out = r.tick(0.1), lost = of(out, 'bobber')[0];
    expect(lost.to).toBe(a); expect(lost.msg).toMatchObject({ b: null, e: 'lost' }); expect(r.viewOf(a)!.fishing).toBeNull();
  });
});

describe('botes na sala (ADR 0138, entrega C)', () => {
  it('o analisador aceita `boat`, `mountBoat` e `dismountBoat` só com dados válidos', () => {
    expect(parseTitanClientMessage(JSON.stringify({ t: 'boat', b: { x: 1.5, z: -2, r: 0.3 } }))).not.toBeNull();
    expect(parseTitanClientMessage(JSON.stringify({ t: 'boat', b: { x: 'a', z: 0, r: 0 } }))).toBeNull();
    expect(parseTitanClientMessage(JSON.stringify({ t: 'act', seq: 1, a: { k: 'mountBoat', id: 'boat:0' } }))).not.toBeNull();
    expect(parseTitanClientMessage(JSON.stringify({ t: 'act', seq: 1, a: { k: 'mountBoat' } }))).toBeNull();
    expect(parseTitanClientMessage(JSON.stringify({ t: 'act', seq: 1, a: { k: 'dismountBoat' } }))).not.toBeNull();
  });
  it('colocar manda a lista a todos; embarcar prende um piloto; outro não embarca nem recolhe; o piloto é conferido', () => {
    const r = orv(), { cx, cz } = lagoon(r), a = r.join(hello('Ana')).id!, b = r.join(hello('Beto')).id!;
    stand(r, a, cx + 0.5, 66, cz + 4.5); stand(r, b, cx + 2.5, 66, cz + 4.5); give(r, a, Item.BOTE_CARVALHO);
    const put = act(r, a, 1, { k: 'place', hit: { x: cx, y: LAKE_LAST_Y, z: cz, nx: 0, ny: 1, nz: 0 }, slot: 0 });
    expect(applied(put).ok).toBe(true);
    const list = of(put, 'boats')[0]; expect(list.to).toBe('all'); expect(list.msg.list).toEqual([{ id: 'boat:0', k: 0, x: cx + 0.5, y: BOAT_Y, z: cz + 0.5, r: 0, d: 0 }]);
    expect(applied(act(r, a, 2, { k: 'mountBoat', id: 'boat:0' })).ok).toBe(true);
    expect(r.world.boats).toHaveLength(1); expect(r.viewOf(a)!.boatRide?.id).toBe('boat:0'); expect(r.viewOf(b)!.boatRide).toBeNull(); // a bordo é de cada jogador
    expect(applied(act(r, b, 1, { k: 'mountBoat', id: 'boat:0' }))).toMatchObject({ ok: false, msg: 'Bote ocupado' });
    expect(applied(act(r, b, 2, { k: 'break', hit: { x: cx, y: 63, z: cz, nx: 0, ny: 1, nz: 0, item: 'bt:boat:0' } }))).toMatchObject({ ok: false, msg: 'Há alguém a bordo' });
    expect(r.world.boats[0]).toMatchObject({ x: cx + 0.5, z: cz + 0.5 });
    // o piloto manda uma posição razoável: aceita, o corpo segue o assento e todos recebem a lista
    r.tick(0.1); r.handle(a, { t: 'boat', b: { x: cx + 0.5, z: cz - 0.2, r: 0.1 } });
    expect(r.world.boats[0]).toMatchObject({ z: cz - 0.2, yaw: 0.1 }); expect(r.viewOf(a)!.body.z).toBeCloseTo(boatSeat(r.world.boats[0]).z, 5);
    const moved = of(r.tick(0.1), 'boats')[0]; expect(moved.msg.list[0]).toMatchObject({ z: cz - 0.2, d: a });
    // rápido demais ou em terra: recusado, e a lista certa volta no próximo tick
    r.tick(0.1); r.handle(a, { t: 'boat', b: { x: cx + 0.5, z: cz - 9, r: 0 } });
    expect(r.world.boats[0].z).toBeCloseTo(cz - 0.2, 5);
    r.tick(0.1); r.handle(a, { t: 'boat', b: { x: cx + 0.5, z: cz - 0.2 - BOAT_MAX_SPEED * 0.5, r: 0 } });
    expect(r.world.boats[0].z).toBeCloseTo(cz - 0.2, 5); // 4 m em 0,1 s passa do limite
    expect(of(r.tick(0.1), 'boats')[0].msg.list[0].z).toBeCloseTo(cz - 0.2, 1);
    // desembarcar solta o bote; outro jogador o recolhe como item
    expect(applied(act(r, a, 3, { k: 'dismountBoat' })).ok).toBe(true); expect(r.viewOf(a)!.boatRide).toBeNull();
    stand(r, b, cx + 0.5, 66, cz + 3);
    const pick = act(r, b, 3, { k: 'break', hit: { x: cx, y: 63, z: cz, nx: 0, ny: 1, nz: 0, item: 'bt:boat:0' } });
    expect(applied(pick).ok).toBe(true); expect(r.world.boats).toHaveLength(0); expect(r.viewOf(b)!.inventory.total(Item.BOTE_CARVALHO)).toBe(1);
    expect(of(pick, 'boats')[0].msg.list).toEqual([]);
  });
  it('quem sai da sala desce do bote (o bote fica); os botes vão ao snapshot e voltam', () => {
    const r = orv(), { cx, cz } = lagoon(r), a = r.join(hello('Ana')).id!;
    stand(r, a, cx + 0.5, 66, cz + 4.5); give(r, a, Item.BOTE_BETULA);
    act(r, a, 1, { k: 'place', hit: { x: cx, y: LAKE_LAST_Y, z: cz, nx: 0, ny: 1, nz: 0 }, slot: 0 }); act(r, a, 2, { k: 'mountBoat', id: 'boat:0' });
    r.leave(a); expect(r.world.boats).toHaveLength(1);
    const snap = JSON.parse(JSON.stringify(r.snapshot()));
    expect(snap.header.boats).toEqual([{ k: 1, x: cx + 0.5, y: BOAT_Y, z: cz + 0.5, r: 0 }]);
    const r2 = orv(); expect(r2.restore(snap)).toBe(true);
    expect(r2.world.boats).toEqual([{ id: 'boat:0', kind: 1, x: cx + 0.5, y: BOAT_Y, z: cz + 0.5, yaw: 0 }]);
  });
  it('os clientes: um coloca e pilota, o outro vê o bote andar pela sala', async () => {
    const srv = new TitanLoopbackServer(() => 0.5), room = srv.rooms.get(102)!, { cx, cz } = lagoon(room);
    const ca = new TitanClient(srv.connect()), cb = new TitanClient(srv.connect());
    const [sa, sb] = await Promise.all([ca.connect('Ana', 102), cb.connect('Beto', 102)]);
    await flush();
    const va = room.viewOf(ca.id)!; va.body.x = cx + 0.5; va.body.y = 66; va.body.z = cz + 4.5; sa.body.x = cx + 0.5; sa.body.y = 66; sa.body.z = cz + 4.5;
    give(room, ca.id, Item.BOTE_CEREJEIRA); sa.inventory.add(Item.BOTE_CEREJEIRA, 1);
    expect((await ca.place({ x: cx, y: LAKE_LAST_Y, z: cz, nx: 0, ny: 1, nz: 0 }, 0)).ok).toBe(true);
    await flush();
    expect(sa.boats.map((x) => x.id)).toEqual(['boat:0']); expect(sb.boats[0]).toMatchObject({ kind: 2, x: cx + 0.5, z: cz + 0.5 });
    expect((await ca.mountBoat('boat:0')).ok).toBe(true); sa.boatRide = { id: 'boat:0', speed: 0 };
    srv.tick(0.1); sa.boats[0].z -= 0.3; sa.boats[0].yaw = 0.2; ca.sendBoat(); srv.tick(0.1); await flush();
    expect(room.world.boats[0].z).toBeCloseTo(cz + 0.5 - 0.3, 3); expect(sb.boats[0].z).toBeCloseTo(cz + 0.5 - 0.3, 1); expect(sb.boats[0].yaw).toBeCloseTo(0.2, 1);
    expect(sa.boats[0].z).toBeCloseTo(cz + 0.5 - 0.3, 3); // o piloto segue a posição local
  });
});
