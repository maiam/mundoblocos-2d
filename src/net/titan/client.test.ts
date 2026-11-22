import { describe, expect, it } from 'vitest';
import { Item } from '../../titan/items';
import { T } from '../../titan/voxel';
import { TitanClient } from './client';
import { TitanLoopbackServer } from './loopback';

/** Cliente das salas do Titã (ADR 0104, fatia B): a sessão local espelha a sala; ações só valem com `applied`. */
const Y = 150;
const flush = async (): Promise<void> => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
async function setup() {
  const srv = new TitanLoopbackServer(() => 0.5), room = srv.rooms.get(101)!;
  const a0 = room.world.volume.gen.arrival, x = Math.floor(a0.x) + 6, z = Math.floor(a0.z) + 6;
  for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) { room.world.volume.set(x + dx, Y - 1, z + dz, T.DARK_ROCK); for (let yy = Y; yy < Y + 5; yy++) room.world.volume.set(x + dx, yy, z + dz, T.AIR); }
  room.tick(0);
  const ca = new TitanClient(srv.connect()), cb = new TitanClient(srv.connect());
  const pa = ca.connect('Ana', 101), pb = cb.connect('Beto', 101);
  const [sa] = await Promise.all([pa, pb]);
  const va = room.viewOf(ca.id)!;
  va.body.x = x + 0.5; va.body.y = Y; va.body.z = z + 2.5; // posição da Ana na sala
  sa.body.x = x + 0.5; sa.body.y = Y; sa.body.z = z + 2.5;
  va.inventory.add(Item.DARK_ROCK, 5); va.inventory.move([...Array(36).keys()].find((i) => va.inventory.get(i)?.item === Item.DARK_ROCK)!, 0);
  return { srv, room, ca, cb, x, z };
}

describe('cliente da sala do Titã', () => {
  it('entra, abre o mundo da sala e vê os outros jogadores; erro da sala rejeita a entrada', async () => {
    const { ca, cb, srv } = await setup();
    expect(ca.session.seed).toBe(20261122); expect(ca.remotes.size).toBe(1); expect(cb.remotes.size).toBe(1);
    const bad = new TitanClient(srv.connect());
    await expect(bad.connect('Ana', 101)).rejects.toThrow('nome');
    await expect(new TitanClient(srv.connect()).connect('Carla', 999)).rejects.toThrow('Sala');
  });
  it('colocar: não prevê; vale com `applied`; o outro aparelho recebe a edição e a bolsa da Ana é a da sala', async () => {
    const { ca, cb, room, x, z } = await setup();
    ca.session.selected = 0;
    const p = ca.place({ x, y: Y - 1, z, nx: 0, ny: 1, nz: 0 }, 0);
    expect(ca.session.volume.get(x, Y, z)).toBe(T.AIR); // sem previsão local
    await flush();
    expect(await p).toMatchObject({ ok: true });
    expect(room.world.volume.get(x, Y, z)).toBe(T.DARK_ROCK);
    expect(ca.session.volume.get(x, Y, z)).toBe(T.DARK_ROCK); expect(cb.session.volume.get(x, Y, z)).toBe(T.DARK_ROCK);
    expect(ca.session.inventory.total(Item.DARK_ROCK)).toBe(4); expect(cb.session.inventory.total(Item.DARK_ROCK)).toBe(0);
  });
  it('recusa: longe demais volta ok=false com a mensagem, sem mudar o mundo', async () => {
    const { ca, x, z } = await setup();
    const p = ca.place({ x: x + 60, y: Y - 1, z, nx: 0, ny: 1, nz: 0 }, 0);
    await flush();
    expect(await p).toMatchObject({ ok: false, msg: 'Longe demais' });
  });
  it('bolsa mexida na interface vai à sala uma vez; a da sala não volta como mexida', async () => {
    const { ca, room } = await setup();
    expect(ca.syncBag()).toBe(false);
    ca.session.inventory.add(Item.SAND, 2); // a interface mexe na bolsa (fabricar, mover…)
    expect(ca.syncBag()).toBe(true); expect(ca.syncBag()).toBe(false);
    await flush();
    expect(room.viewOf(ca.id)!.inventory.total(Item.SAND)).toBe(2);
  });
  it('`state` chega à sala e o outro aparelho vê o jogador mover', async () => {
    const { ca, cb, srv } = await setup();
    ca.session.body.x += 1; ca.sendState();
    await flush();
    srv.tick(0.2); await flush();
    expect(cb.remotes.get(ca.id)!.x).toBeCloseTo(ca.session.body.x, 6);
  });
});
