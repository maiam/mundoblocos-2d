import { describe, expect, it } from 'vitest';
import { Block } from '../world/blocks';
import { blockStack } from '../world/items';
import { mulberry32 } from '../world/random';
import { World } from '../world/world';
import { Drops } from '../game/drops';
import { Inventory } from '../game/inventory';
import { Player } from '../game/player';
import { LoopbackServer } from './loopback';
import { PROTOCOL_VERSION, ROOMS } from './protocol';
import { Room } from './room';
import { NetSession } from './session';

const flush = () => new Promise((r) => setTimeout(r, 0));

function client(server: LoopbackServer) {
  const s = new NetSession(server.connect());
  const box: { world: World | null } = { world: null };
  s.onWelcome = (seed) => { box.world = new World(seed); s.attach(box.world); };
  return { s, box };
}

function freeSpot(w: World): [number, number] {
  const [x, y] = w.outsideGate();
  for (let k = 0; k < 400; k++) {
    const c: [number, number] = [x - 7 + (k % 15), y + 2 + Math.floor(k / 15)];
    if (w.canPlace(...c, Block.OAK_PLANKS)) return c;
  }
  throw new Error('sem lugar');
}

describe('Sala: itens no chão e baús compartilhados (Etapa 2)', () => {
  it('quebrar faz a sala criar os itens para todos; quem pede primeiro leva', async () => {
    const server = new LoopbackServer(mulberry32(3));
    const a = client(server);
    a.s.join('Ana', 1);
    await flush();
    const b = client(server);
    b.s.join('Beto', 1);
    await flush();
    const room = server.rooms.get(1)!;
    const spot = freeSpot(room.world);
    // Ana coloca e quebra uma tábua (com coleta, a tábua cai no chão).
    for (const act of [
      { kind: 'place' as const, x: spot[0], y: spot[1], block: Block.OAK_PLANKS },
      { kind: 'break' as const, x: spot[0], y: spot[1], tool: null },
    ]) a.s.sent(act);
    const seenA: number[] = [];
    const seenB: number[] = [];
    a.s.onDrops = (l) => seenA.push(...l.map((d) => d.id));
    b.s.onDrops = (l) => seenB.push(...l.map((d) => d.id));
    await flush();
    expect(seenA.length).toBeGreaterThan(0);
    expect(seenB).toEqual(seenA);
    // Os dois perto do item; os dois pedem; só um leva.
    const id = seenA[0];
    for (const c of [a, b]) c.s.sendState({ x: spot[0] + 0.5, y: spot[1] + 0.7, facing: 'down', moving: false });
    await flush();
    const got: Array<[string, boolean]> = [];
    a.s.onTaken = (i, mine) => { if (i === id) got.push(['Ana', mine]); };
    b.s.onTaken = (i, mine) => { if (i === id) got.push(['Beto', mine]); };
    a.s.take(id);
    b.s.take(id);
    await flush();
    expect(got).toEqual([['Ana', true], ['Beto', false]]);
    // Quem entra depois só vê o que sobrou.
    const c = client(server);
    c.s.join('Caio', 1);
    await flush();
    expect(c.s.drops.map((d) => d.id)).not.toContain(id);
  });

  it('o jogo só põe na bolsa o item que a sala confirmou', () => {
    const drops = new Drops();
    const claims: number[] = [];
    drops.claim = (i) => claims.push(i);
    const p = new Player(0.5, 0.5);
    const inv = new Inventory({});
    drops.addShared([{ id: 7, item: 'wheat', x: 0.5, y: 0.5 }]);
    for (let i = 0; i < 60; i++) drops.update(1 / 30, p, inv);
    expect(claims).toEqual([7]);
    expect(inv.count('wheat')).toBe(0);
    expect(drops.resolveClaim(7, true)).toBe('wheat');
  });

  it('baú: o conteúdo vai para todos, volta para quem entra depois e fica salvo na sala', async () => {
    const server = new LoopbackServer(mulberry32(5));
    const a = client(server);
    a.s.join('Ana', 1);
    await flush();
    const room = server.rooms.get(1)!;
    const spot = freeSpot(room.world);
    a.s.sent({ kind: 'place', x: spot[0], y: spot[1], block: Block.CHEST });
    await flush();
    const b = client(server);
    b.s.join('Beto', 1);
    await flush();
    let changed = 0;
    b.s.onChest = () => changed++;
    const slots = Array(27).fill(null);
    slots[0] = { item: 'wheat', count: 5 };
    slots[3] = { item: blockStack(Block.OAK_PLANKS), count: 2 };
    a.s.sendChest(spot[0], spot[1], slots);
    await flush();
    expect(changed).toBe(1);
    expect(b.box.world!.chestAt(...spot)![0]).toEqual({ item: 'wheat', count: 5 });
    const c = client(server);
    c.s.join('Caio', 1);
    await flush();
    expect(c.box.world!.chestAt(...spot)![3]).toEqual({ item: blockStack(Block.OAK_PLANKS), count: 2 });
    // Fotografia da sala guarda o baú.
    const back = new Room(1, 'Sala 1', ROOMS[0].seed);
    expect(back.restore(JSON.parse(JSON.stringify(room.snapshot())))).toBe(true);
    expect(back.world.chestAt(...spot)![0]).toEqual({ item: 'wheat', count: 5 });
    // Baú quebrado: o conteúdo cai no chão da sala.
    let loot: string[] = [];
    a.s.onDrops = (l) => { loot = l.map((d) => d.item); };
    a.s.sent({ kind: 'break', x: spot[0], y: spot[1], tool: null });
    await flush();
    expect(loot.filter((i) => i === 'wheat')).toHaveLength(5);
    expect(PROTOCOL_VERSION).toBe(10);
  });
});
