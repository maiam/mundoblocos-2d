import { describe, expect, it } from 'vitest';
import { Block } from '../world/blocks';
import { applyAction, parseAction } from '../world/actions';
import { mulberry32 } from '../world/random';
import { World } from '../world/world';
import { LoopbackServer } from './loopback';
import { MAX_PLAYERS, normalizeRoomCode, parseClientMessage, PROTOCOL_VERSION, sanitizeName } from './protocol';
import { NetSession } from './session';

const flush = () => new Promise((r) => setTimeout(r, 0));

/** Cria uma sessão ligada ao servidor de teste e, no welcome, um World com a seed da sala. */
function client(server: LoopbackServer) {
  const s = new NetSession(server.connect());
  const box: { world: World | null } = { world: null };
  s.onWelcome = (seed) => { box.world = new World(seed); s.attach(box.world); };
  return { s, box };
}

describe('Multiplayer — protocolo e sala (ADR 0016)', () => {
  it('código de convite e nome de convidado', () => {
    expect(normalizeRoomCode('ab-cd 23')).toBe('ABCD23');
    expect(normalizeRoomCode('ABCD1O')).toBeNull(); // 1 e O ficam de fora (confundíveis)
    expect(normalizeRoomCode('ABC')).toBeNull();
    expect(sanitizeName('  Ana   Clara ')).toBe('Ana Clara');
    expect(sanitizeName('Zé_2')).toBe('Zé_2');
    expect(sanitizeName('a')).toBeNull();
    expect(sanitizeName('<script>')).toBeNull();
    expect(sanitizeName('x'.repeat(17))).toBeNull();
  });

  it('mensagens malformadas viram null (nunca exceção)', () => {
    for (const t of ['', '{', 'null', '[]', '{"t":"action","seq":1,"a":{"kind":"place","x":1,"y":2,"block":9999}}',
      '{"t":"action","seq":1,"a":{"kind":"break","x":1.5,"y":2,"tool":null}}', '{"t":"state","s":{"x":1,"y":2,"facing":"norte","moving":true}}',
      '{"t":"hello","v":1}']) expect(parseClientMessage(t)).toBeNull();
    expect(parseAction({ kind: 'break', x: 1, y: 2, tool: 'sword' })).toEqual({ kind: 'break', x: 1, y: 2, tool: 'sword' });
  });

  it('dois convidados na mesma sala veem as mesmas edições, inclusive quem chega depois', async () => {
    const server = new LoopbackServer(mulberry32(7));
    const a = client(server);
    a.s.join('Ana');
    await flush();
    expect(a.s.room).toMatch(/^[A-Z2-9]{6}$/);
    const b = client(server);
    b.s.join('Beto', a.s.room!.toLowerCase());
    await flush();
    expect(b.s.seed).toBe(a.s.seed);
    expect([...a.s.others.values()].map((p) => p.name)).toEqual(['Beto']);
    expect([...b.s.others.values()].map((p) => p.name)).toEqual(['Ana']);

    // Ana coloca uma pedra fora da cidade: vale para os dois (e para o mundo da sala).
    const room = server.rooms.get(a.s.room!)!;
    const [x, y] = room.world.outsideGate();
    let spot: [number, number] = [x, y];
    for (let k = 1; k < 200 && !room.world.canPlace(...spot, Block.STONE); k++) spot = [x + (k % 15) - 7, y + 2 + Math.floor(k / 15)];
    expect(room.world.canPlace(...spot, Block.STONE)).toBe(true);
    // O jogo aplica na hora e só informa (o servidor confere e repassa).
    const place = { kind: 'place' as const, x: spot[0], y: spot[1], block: Block.STONE };
    expect(applyAction(a.box.world!, place)).toBe(true);
    a.s.sent(place);
    await flush();
    for (const w of [room.world, a.box.world!, b.box.world!]) expect(w.getObject(...spot)).toBe(Block.STONE);

    // Quem entra depois recebe as edições já feitas.
    const c = client(server);
    c.s.join('Caio', a.s.room!);
    await flush();
    expect(c.box.world!.getObject(...spot)).toBe(Block.STONE);

    // Posição de Ana chega aos outros.
    a.s.sendState({ x: 1.5, y: 2.5, facing: 'left', moving: true });
    await flush();
    expect(b.s.others.get(a.s.you!)?.state).toEqual({ x: 1.5, y: 2.5, facing: 'left', moving: true });

    // Saiu: some para os outros.
    a.s.leave();
    await flush();
    expect(b.s.others.has(a.s.you!)).toBe(false);
  });

  it('o servidor recusa o que as regras do World não permitem (cidade protegida) e só avisa quem tentou', async () => {
    const server = new LoopbackServer(mulberry32(3));
    const a = client(server);
    a.s.join('Ana');
    await flush();
    const b = client(server);
    b.s.join('Bia', a.s.room!);
    await flush();
    const room = server.rooms.get(a.s.room!)!;
    const [sx, sy] = room.world.town!.start;
    const rejected: unknown[] = [];
    a.s.onRejected = (act) => rejected.push(act);
    a.s.sent({ kind: 'break', x: sx, y: sy, tool: 'pickaxe' });
    await flush();
    expect(rejected).toHaveLength(1);
    expect(room.edits).toHaveLength(0);
    expect(b.box.world!.getGround(sx, sy)).toBe(room.world.getGround(sx, sy));
  });

  it('entrada recusada: versão, nome, sala inexistente e sala cheia', async () => {
    const server = new LoopbackServer(mulberry32(5));
    const old = new NetSession(server.connect());
    (old as unknown as { send: (m: unknown) => void }).send({ t: 'hello', v: PROTOCOL_VERSION + 1, name: 'Ana' });
    const badName = client(server);
    badName.s.join('?');
    const noRoom = client(server);
    noRoom.s.join('Ana', 'ZZZZZZ');
    await flush();
    expect(old.error).toMatch(/Versão/);
    expect(badName.s.error).toMatch(/Nome/);
    expect(noRoom.s.error).toMatch(/Sala não encontrada/);
    const host = client(server);
    host.s.join('Ana');
    await flush();
    for (let i = 1; i < MAX_PLAYERS; i++) client(server).s.join(`P${i}`, host.s.room!);
    await flush();
    const extra = client(server);
    extra.s.join('Extra', host.s.room!);
    await flush();
    expect(extra.s.error).toMatch(/cheia/);
  });
});
