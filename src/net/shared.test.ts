import { describe, expect, it } from 'vitest';
import { DAY_LENGTH_S } from '../config';
import { applyAction } from '../world/actions';
import { Block, cropStage, isCrop } from '../world/blocks';
import { mulberry32 } from '../world/random';
import { World } from '../world/world';
import { LoopbackServer } from './loopback';
import { ROOM_START_TIME } from './room';
import { NetSession } from './session';

const flush = () => new Promise((r) => setTimeout(r, 0));

function client(server: LoopbackServer) {
  const s = new NetSession(server.connect());
  const box: { world: World | null } = { world: null };
  s.onWelcome = (seed) => { box.world = new World(seed); s.attach(box.world); };
  return { s, box };
}

describe('Sala compartilhada — mesmo horário e mesmo crescimento (Etapa 1)', () => {
  it('a hora é da sala: quem entra recebe a hora atual e todos recebem a sincronização', async () => {
    const server = new LoopbackServer(mulberry32(3));
    const a = client(server);
    a.s.join('Ana');
    await flush();
    expect(a.s.time).toBeCloseTo(ROOM_START_TIME);
    server.tick(DAY_LENGTH_S / 4); // um quarto de dia
    await flush();
    const b = client(server);
    b.s.join('Beto', a.s.room!);
    await flush();
    expect(b.s.time).toBeCloseTo(ROOM_START_TIME + 0.25);
    let synced: number | null = null;
    b.s.onTime = (t) => { synced = t; };
    server.tick(31);
    await flush();
    expect(synced).not.toBeNull();
    expect(a.s.time).toBeCloseTo(b.s.time!);
  });

  it('plantas crescem pela sala: todos veem o mesmo estágio, inclusive quem entra depois', async () => {
    const server = new LoopbackServer(mulberry32(5));
    const a = client(server);
    a.s.join('Ana');
    await flush();
    const room = server.rooms.get(a.s.room!)!;
    // Ana ara e planta trigo fora da cidade (aplica na hora e informa).
    const w = a.box.world!;
    const [gx, gy] = w.outsideGate();
    let spot: [number, number] | null = null;
    for (let k = 0; k < 400 && !spot; k++) {
      const c: [number, number] = [gx - 10 + (k % 20), gy + 3 + Math.floor(k / 20)];
      if (w.canTill(...c) && room.world.canTill(...c)) spot = c;
    }
    expect(spot).not.toBeNull();
    for (const act of [{ kind: 'till' as const, x: spot![0], y: spot![1] }, { kind: 'plant' as const, x: spot![0], y: spot![1] }]) {
      expect(applyAction(w, act)).toBe(true);
      a.s.sent(act);
    }
    await flush();
    expect(isCrop(room.world.getObject(...spot!))).toBe(true);
    // O tempo passa só no servidor: o aparelho não cresce sozinho, recebe o crescimento.
    for (let i = 0; i < 600; i++) server.tick(1);
    await flush();
    const stage = cropStage(room.world.getObject(...spot!));
    expect(stage).toBeGreaterThan(0);
    expect(w.getObject(...spot!)).toBe(room.world.getObject(...spot!));
    // Quem entra depois vê o mesmo estágio.
    const c = client(server);
    c.s.join('Caio', a.s.room!);
    await flush();
    expect(c.box.world!.getObject(...spot!)).toBe(room.world.getObject(...spot!));
    // Colhida (quebrada) depois de crescer: quem entra ainda depois não vê a planta voltar.
    const brk = { kind: 'break' as const, x: spot![0], y: spot![1], tool: null };
    expect(applyAction(w, brk)).toBe(true);
    a.s.sent(brk);
    await flush();
    const d = client(server);
    d.s.join('Duda', a.s.room!);
    await flush();
    expect(isCrop(d.box.world!.getObject(...spot!))).toBe(false);
    expect(Block.AIR).toBe(0);
  });
});
