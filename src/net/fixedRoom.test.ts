import { describe, expect, it } from 'vitest';
import { applyAction } from '../world/actions';
import { Block } from '../world/blocks';
import { mulberry32 } from '../world/random';
import { World } from '../world/world';
import { LoopbackServer } from './loopback';
import { parseAppearance, PROTOCOL_VERSION, ROOMS } from './protocol';
import { Room } from './room';
import { NetSession } from './session';

const flush = () => new Promise((r) => setTimeout(r, 0));

function client(server: LoopbackServer) {
  const s = new NetSession(server.connect());
  const box: { world: World | null } = { world: null };
  s.onWelcome = (seed) => { box.world = new World(seed); s.attach(box.world); };
  return { s, box };
}

/** Célula livre fora da cidade onde dá para colocar pedra. */
function freeSpot(w: World): [number, number] {
  const [x, y] = w.outsideGate();
  for (let k = 0; k < 400; k++) {
    const c: [number, number] = [x - 7 + (k % 15), y + 2 + Math.floor(k / 15)];
    if (w.canPlace(...c, Block.STONE)) return c;
  }
  throw new Error('sem lugar');
}

describe('Sala fixa (mundo compartilhado salvo no servidor)', () => {
  it('o mundo continua depois que todos saem e quem entra depois vê tudo (sem convite: entra pelo número)', async () => {
    const server = new LoopbackServer(mulberry32(2));
    const a = client(server);
    a.s.join('Ana', 1);
    await flush();
    expect(a.s.seed).toBe(ROOMS[0].seed);
    const spot = freeSpot(a.box.world!);
    const place = { kind: 'place' as const, x: spot[0], y: spot[1], block: Block.STONE };
    expect(applyAction(a.box.world!, place)).toBe(true);
    a.s.sent(place);
    await flush();
    a.s.leave();
    await flush();
    expect(server.rooms.get(1)!.size).toBe(0);
    const b = client(server);
    b.s.join('Beto', 1);
    await flush();
    expect(b.box.world!.getObject(...spot)).toBe(Block.STONE);
  });

  it('a bolsa fica guardada pelo nome e volta na próxima entrada (com a posição)', async () => {
    const server = new LoopbackServer(mulberry32(4));
    const a = client(server);
    a.s.join('Ana', 1);
    await flush();
    expect(a.s.bag).toBeNull(); // primeira vez
    a.s.sendBag({ inventory: { wheat: 7, 'block:27': 3 }, hotbar: ['block:27', null], x: 12.5, y: 40.5 });
    await flush();
    a.s.leave();
    await flush();
    const again = client(server);
    again.s.join('ANA', 1); // o nome vale sem diferença de maiúsculas
    await flush();
    expect(again.s.bag).toEqual({ inventory: { wheat: 7, 'block:27': 3 }, hotbar: ['block:27', null], x: 12.5, y: 40.5 });
    const other = client(server);
    other.s.join('Beto', 1);
    await flush();
    expect(other.s.bag).toBeNull(); // cada um com a sua
  });

  it('o servidor grava e recarrega a sala: mundo, hora e bolsas', () => {
    const r = new Room(1, 'Sala 1', ROOMS[0].seed, mulberry32(1));
    const j = r.join({ t: 'hello', v: PROTOCOL_VERSION, name: 'Ana', room: 1 });
    const spot = freeSpot(r.world);
    r.handle(j.id!, { t: 'action', seq: 1, a: { kind: 'place', x: spot[0], y: spot[1], block: Block.STONE } });
    r.handle(j.id!, { t: 'bag', bag: { inventory: { apple: 2 }, hotbar: null, x: 1, y: 2 } });
    r.tick(100);
    expect(r.dirty).toBe(true);
    const snap = JSON.parse(JSON.stringify(r.snapshot()));
    expect(r.dirty).toBe(false);
    const back = new Room(1, 'Sala 1', ROOMS[0].seed);
    expect(back.restore(snap)).toBe(true);
    expect(back.world.getObject(...spot)).toBe(Block.STONE);
    expect(back.time).toBeCloseTo(r.time);
    const w = back.join({ t: 'hello', v: PROTOCOL_VERSION, name: 'ana', room: 1 });
    const welcome = w.out[0].msg as { t: 'welcome'; bag: unknown };
    expect(welcome.bag).toEqual({ inventory: { apple: 2 }, hotbar: null, x: 1, y: 2 });
    // Arquivo de outra sala/seed não é aplicado.
    expect(new Room(1, 'Sala 1', 123).restore(snap)).toBe(false);
  });

  it('cada um aparece para os outros com o personagem que escolheu (Herói, chibi com peças)', async () => {
    const server = new LoopbackServer(mulberry32(6));
    const a = client(server);
    a.s.join('Ana', 1, { body: 'hero', look: null });
    await flush();
    const b = client(server);
    b.s.join('Bia', 1, { body: 'heroine', look: { cabelo: 'curto-castanho', tronco: 'blusa-ocre' } });
    await flush();
    expect([...b.s.others.values()][0].appearance).toEqual({ body: 'hero', look: null });
    expect([...a.s.others.values()][0].appearance.look).toEqual({ cabelo: 'curto-castanho', tronco: 'blusa-ocre' });
    // Aparência estranha vinda da rede vira a padrão.
    const c = client(server);
    (c.s as unknown as { send: (m: unknown) => void }).send({ t: 'hello', v: PROTOCOL_VERSION, name: 'Caio', room: 1, appearance: { body: 'dragão', look: { '<x>': 1 } } });
    await flush();
    const caio = [...a.s.others.values()].find((p) => p.name === 'Caio')!;
    expect(caio.appearance).toEqual({ body: 'heroine', look: null });
  });
});

describe('Aparência na rede: personagens prontos', () => {
  it('Heroína, Herói e Hood passam; o resto vira a Heroína', () => {
    expect(parseAppearance({ body: 'hood', look: null })).toEqual({ body: 'hood', look: null });
    expect(parseAppearance({ body: 'hero' }).body).toBe('hero');
    expect(parseAppearance({ body: 'dragão' }).body).toBe('heroine');
  });
});
