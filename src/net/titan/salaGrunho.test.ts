import { describe, expect, it } from 'vitest';
import { GRUNHO, grunhoAlive } from '../../titan/grunho';
import { TitanClient } from './client';
import { TitanLoopbackServer } from './loopback';
import { TITAN_PROTOCOL_VERSION, parseTitanClientMessage, type TitanServerMessage } from './protocol';
import { TITAN_GRUNHO_EVERY, TitanRoom } from './room';

/** Grunho na sala 102 (ADR 0147): o servidor simula, manda aos jogadores de perto, aplica o golpe do jogador e avisa quem apanha. */
const costa = (): TitanRoom => new TitanRoom(102, 'Orvalis 1', 128064, () => 0.5, 'orvalis', 'costa');
const hello = (name: string) => ({ t: 'hello' as const, v: TITAN_PROTOCOL_VERSION, name, room: 102 });
const flush = async (): Promise<void> => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
const applied = (out: Array<{ msg: TitanServerMessage }>) => out.find((o) => o.msg.t === 'applied')!.msg as Extract<TitanServerMessage, { t: 'applied' }>;
const at = (r: TitanRoom, id: number, x: number, y: number, z: number): void => { r.handle(id, { t: 'state', s: { x, y, z, yaw: 0, pitch: 0, sel: 0 } }); };

describe('Grunho na sala do Orvalis (ADR 0147)', () => {
  it('o protocolo é o 8 e o analisador aceita `strikeGrunho` só com id válido', () => {
    expect(TITAN_PROTOCOL_VERSION).toBe(8);
    expect(parseTitanClientMessage(JSON.stringify({ t: 'act', seq: 1, a: { k: 'strikeGrunho', id: 'g:oeste:0' } }))).not.toBeNull();
    expect(parseTitanClientMessage(JSON.stringify({ t: 'act', seq: 1, a: { k: 'strikeGrunho', id: '' } }))).toBeNull();
    expect(parseTitanClientMessage(JSON.stringify({ t: 'act', seq: 1, a: { k: 'strikeGrunho' } }))).toBeNull();
  });

  it('a sala 102 nasce com 48 goblins (4 acampamentos de 12); a sala 101 e a partida individual, nenhum', () => {
    const r = costa(); expect(r.world.grunhos).toHaveLength(48); expect(new Set(r.world.grunhos.map((g) => g.id)).size).toBe(48);
    expect(new TitanRoom(102, 'x', 20261127, () => 0.5, 'orvalis').world.grunhos).toHaveLength(0);
    expect(new TitanRoom(101, 'y', 1, () => 0.5).world.grunhos).toHaveLength(0);
  });

  it('sem jogador os goblins ficam parados; quem chega perto recebe os mais próximos (até 40) e só eles', () => {
    const r = costa(), a = r.world.grunhos.map((g) => `${g.body.x.toFixed(3)},${g.body.z.toFixed(3)}`);
    r.tick(5); expect(r.world.grunhos.map((g) => `${g.body.x.toFixed(3)},${g.body.z.toFixed(3)}`)).toEqual(a);
    const id = r.join(hello('Ana')).id!, g0 = r.world.grunhos[0], camp = g0.camp;
    at(r, id, camp.x + 14, g0.body.y, camp.z); // a 14 m da fogueira, fora do aviso
    const out = r.tick(TITAN_GRUNHO_EVERY + 0.01), m = out.find((o) => o.msg.t === 'grunhos')!.msg as Extract<TitanServerMessage, { t: 'grunhos' }>;
    expect(m.list.length).toBeGreaterThan(0); expect(m.list.length).toBeLessThanOrEqual(40);
    expect(m.list.every((w) => w.hp > 0 && Number.isFinite(w.x) && ['wander', 'chase', 'return'].includes(w.ph))).toBe(true);
    expect(out.find((o) => o.msg.t === 'grunhos')!.to).toBeTypeOf('number'); // ao jogador, não a todos
  });

  it('o goblin avisa a 12 m, persegue e acerta: o jogador recebe `hurt` do tipo grunho com 3 de dano', () => {
    const r = costa(), id = r.join(hello('Ana')).id!, g = r.world.grunhos[0];
    const px = g.body.x + 8, py = g.body.y, pz = g.body.z;
    at(r, id, px, py, pz);
    const got: Array<{ msg: TitanServerMessage }> = [];
    for (let i = 0; i < 160; i++) { got.push(...r.tick(0.05)); at(r, id, px - Math.min(7, i * 0.2), py, pz); if (got.some((o) => o.msg.t === 'hurt')) break; } // o jogador anda ao encontro do goblin (a mira de 12 m e o golpe)
    expect(g.phase).toBe('chase');
    const hurt = got.filter((o) => o.msg.t === 'hurt').map((o) => o.msg as Extract<TitanServerMessage, { t: 'hurt' }>);
    expect(hurt.length).toBeGreaterThan(0); expect(hurt[0]).toMatchObject({ damage: GRUNHO.damage, kind: 'grunho' });
  });

  it('golpe por ação: alcance, pausa, vida e abate (o goblin some da lista e volta em 10 min)', () => {
    const r = costa(), id = r.join(hello('Ana')).id!, far = r.join(hello('Beto')).id!, g = r.world.grunhos[0];
    at(r, id, g.body.x + 1.2, g.body.y, g.body.z); at(r, far, g.body.x + 40, g.body.y, g.body.z);
    expect(applied(r.handle(far, { t: 'act', seq: 1, a: { k: 'strikeGrunho', id: g.id } }))).toMatchObject({ ok: false, msg: 'Longe demais' });
    const hp0 = g.hp, ap = applied(r.handle(id, { t: 'act', seq: 1, a: { k: 'strikeGrunho', id: g.id } }));
    expect(ap.ok).toBe(true); expect(g.hp).toBeLessThan(hp0); expect(g.target).toBe(String(id));
    expect(applied(r.handle(id, { t: 'act', seq: 2, a: { k: 'strikeGrunho', id: g.id } })).ok).toBe(false); // dentro da pausa
    g.hp = 1; r.tick(0.7);
    const out = r.handle(id, { t: 'act', seq: 3, a: { k: 'strikeGrunho', id: g.id } });
    expect(applied(out).ok).toBe(true); expect(grunhoAlive(g)).toBe(false);
    r.tick(TITAN_GRUNHO_EVERY + 0.01); const m = r.tick(TITAN_GRUNHO_EVERY + 0.01).find((o) => o.msg.t === 'grunhos');
    expect(!m || !(m.msg as Extract<TitanServerMessage, { t: 'grunhos' }>).list.some((w) => w.id === g.id)).toBe(true);
    expect(applied(r.handle(id, { t: 'act', seq: 4, a: { k: 'strikeGrunho', id: g.id } })).ok).toBe(false); // já abatido
  });

  it('o cliente espelha os goblins de perto (o welcome não os traz), manda o golpe e vê a vida', async () => {
    const srv = new TitanLoopbackServer(() => 0.5), room = srv.rooms.get(102)!, g = room.world.grunhos[0];
    const c = new TitanClient(srv.connect()), s = await c.connect('Ana', 102);
    await flush();
    expect(s.grunhos).toEqual([]);
    const v = room.viewOf(c.id)!; v.body.x = g.body.x + 1.2; v.body.y = g.body.y; v.body.z = g.body.z;
    for (let i = 0; i < 5; i++) srv.tick(0.1);
    await flush();
    const mine = c.session.grunhos.find((e) => e.id === g.id)!;
    expect(c.session.grunhos.length).toBeGreaterThan(0); expect(mine).toBeTruthy(); expect(Math.abs(mine.body.x - g.body.x)).toBeLessThan(0.05);
    const hp0 = g.hp, r = await c.strikeGrunho(g.id); expect(r.ok).toBe(true); expect(g.hp).toBeLessThan(hp0);
    for (let i = 0; i < 5; i++) srv.tick(0.1);
    await flush();
    expect(c.session.grunhos.find((e) => e.id === g.id)?.hp).toBe(g.hp);
  });
});
