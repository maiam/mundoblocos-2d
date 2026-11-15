import { SUBDIV } from '../config';
import { describe, expect, it } from 'vitest';
import { applyAction } from '../world/actions';
import { Block } from '../world/blocks';
import { mulberry32 } from '../world/random';
import { World } from '../world/world';
import { LoopbackServer } from './loopback';
import { parseAppearance, parseState, type PlayerInfo, PROTOCOL_VERSION, ROOMS } from './protocol';
import { Room, ROOM_SNAPSHOT_VERSION, rescaleRoomSnapshot } from './room';
import { NetSession } from './session';
import { RemotePlayers } from '../game/remotePlayers';

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
    const j = r.join({ t: 'hello', v: PROTOCOL_VERSION, sub: SUBDIV, name: 'Ana', room: 1 });
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
    const w = back.join({ t: 'hello', v: PROTOCOL_VERSION, sub: SUBDIV, name: 'ana', room: 1 });
    const welcome = w.out[0].msg as { t: 'welcome'; bag: unknown };
    expect(welcome.bag).toEqual({ inventory: { apple: 2 }, hotbar: null, x: 1, y: 2 });
    // Arquivo de outra sala/seed não é aplicado.
    expect(new Room(1, 'Sala 1', 123).restore(snap)).toBe(false);
  });

  it('cada um aparece para os outros com o personagem que escolheu (Herói, Mila)', async () => {
    const server = new LoopbackServer(mulberry32(6));
    const a = client(server);
    a.s.join('Ana', 1, { body: 'hero' });
    await flush();
    const b = client(server);
    b.s.join('Bia', 1, { body: 'mila' });
    await flush();
    expect([...b.s.others.values()][0].appearance).toEqual({ body: 'hero' });
    expect([...a.s.others.values()][0].appearance).toEqual({ body: 'mila' });
    // Aparência estranha (ou o campo antigo `look`, do chibi que saiu) vinda da rede vira só o personagem pronto / a padrão.
    const c = client(server);
    (c.s as unknown as { send: (m: unknown) => void }).send({ t: 'hello', v: PROTOCOL_VERSION, sub: SUBDIV, name: 'Caio', room: 1, appearance: { body: 'dragão', look: { cabelo: 'x' } } });
    await flush();
    const caio = [...a.s.others.values()].find((p) => p.name === 'Caio')!;
    expect(caio.appearance).toEqual({ body: 'heroine' });
  });
});

describe('Aparência na rede: personagens prontos', () => {
  it('Heroína, Herói, Hood, Gino e Mila passam; o resto vira a Heroína', () => {
    expect(parseAppearance({ body: 'hood', look: null })).toEqual({ body: 'hood' });
    expect(parseAppearance({ body: 'gino' }).body).toBe('gino');
    expect(parseAppearance({ body: 'mila' }).body).toBe('mila');
    expect(parseAppearance({ body: 'hero' }).body).toBe('hero');
    expect(parseAppearance({ body: 'dragão' }).body).toBe('heroine');
  });
});

describe('Estado na rede: ferramenta e golpe', () => {
  it('ferramenta conhecida e número de golpes passam; o resto é ignorado', () => {
    const base = { x: 1, y: 2, facing: 'left', moving: false };
    expect(parseState({ ...base, tool: 'sword', swing: 3 })).toEqual({ ...base, tool: 'sword', swing: 3 });
    expect(parseState({ ...base, tool: 'lança', swing: -1 })).toEqual(base);
  });

  it('o boneco do outro mostra a ferramenta e toca o golpe quando o número muda', () => {
    const others = new Map<number, PlayerInfo>([[2, { id: 2, name: 'Ana', appearance: { body: 'hood' }, state: { x: 5, y: 5, facing: 'down', moving: false, tool: 'axe' } }]]);
    const r = new RemotePlayers();
    r.sync(others);
    expect(r.actors[0].kind).toBe('hood-axe');
    others.get(2)!.state!.swing = 1;
    r.sync(others);
    expect(r.actors[0].kind).toBe('hood-axe-attack');
    expect(r.actors[0].frame).toBe(0);
    r.update(1, new World(7));
    expect(r.actors[0].kind).toBe('hood-axe'); // o golpe acabou
  });
});

describe('Grade fina na sala (ADR 0032, F6)', () => {
  it('a fotografia diz a grade (sub) e a versão; entrada com outra grade é recusada', async () => {
    const r = new Room(1, 'Sala 1', 123);
    const snap = r.snapshot();
    expect(snap.v).toBe(ROOM_SNAPSHOT_VERSION);
    expect(snap.sub).toBe(SUBDIV);
    const server = new LoopbackServer(mulberry32(9));
    const wrong = new NetSession(server.connect());
    (wrong as unknown as { send: (m: unknown) => void }).send({ t: 'hello', v: PROTOCOL_VERSION, sub: SUBDIV + 1, name: 'Ana', room: 1 });
    await flush();
    expect(wrong.error).toMatch(/Versão/);
    const ok = client(server);
    ok.s.join('Bia', 1);
    await flush();
    expect(ok.s.error ?? '').toBe('');
    expect(ok.s.seed).toBe(ROOMS[0].seed);
  });

  it('fotografia de arquivo antigo (sem sub) vale como grade 1; a de uma grade mais fina não abre aqui', () => {
    const r = new Room(1, 'Sala 1', 123);
    const old = JSON.parse(JSON.stringify(r.snapshot()));
    delete old.sub;
    old.v = 4;
    expect(new Room(1, 'Sala 1', 123).restore(old)).toBe(true);
    const fine = JSON.parse(JSON.stringify(r.snapshot()));
    fine.sub = SUBDIV + 1;
    expect(new Room(1, 'Sala 1', 123).restore(fine)).toBe(false);
  });

  it('rescaleRoomSnapshot converte chunks, baús, bichos e buracos; as bolsas ficam', () => {
    const snap = {
      v: ROOM_SNAPSHOT_VERSION, room: 1, seed: 123, time: 0.5, savedAt: 1, sub: 1,
      chunks: [], bags: { ana: { hotbar: [], items: {} } as never }, chests: { '3,-2': [] as never },
      animals: [{ k: 'cow' as const, x: 4.5, y: 6.5, baby: false, age: 0, hx: 4.5, hy: 6.5 }],
      holes: [[1, 1, 30] as [number, number, number]],
    };
    const out = rescaleRoomSnapshot(snap, 2);
    expect(out.sub).toBe(2);
    expect(Object.keys(out.chests)).toEqual(['6,-3']);
    expect(out.animals![0]).toMatchObject({ x: 9, y: 13, hx: 9, hy: 13 });
    expect(out.holes).toHaveLength(4);
    expect(out.bags).toBe(snap.bags);
    expect(rescaleRoomSnapshot(snap, 1)).toBe(snap);
    expect(() => rescaleRoomSnapshot({ ...snap, sub: 2 }, 1)).toThrow();
  });
});

describe.runIf(SUBDIV === 2)('Migração dos animais da vila na sala (v0.93.106, snapshot 7)', () => {
  it('sala gravada com as contagens antigas (v6) volta com 3 de cada na vila e sem o cavalo do campo; a gravação nova já é v7', () => {
    const fresh = new Room(1, 'Sala 1', 123);
    const base = JSON.parse(JSON.stringify(fresh.snapshot())) as ReturnType<Room['snapshot']>;
    const by = (k: string) => base.animals!.filter((a) => a.k === k);
    const clone = (a: (typeof base.animals extends (infer T)[] | undefined ? T : never), dx: number) => ({ ...a, x: a.x + dx, hx: a.hx + dx });
    // contagens de antes: ovelhas 4, vacas 2, galinhas 4, capivaras 3, e UM cavalo no campo diante do portão
    const [gx, gy] = fresh.world.outsideGate();
    const old = [
      ...by('sheep'), clone(by('sheep')[0], 1),
      ...by('cow').slice(0, 2),
      ...by('chicken'), clone(by('chicken')[0], 1),
      ...by('capybara'),
      { k: 'horse' as const, x: gx + 9.5, y: gy + 10.5, baby: false, age: 0, hx: gx + 9.5, hy: gy + 10.5 },
    ];
    expect(old.filter((a) => a.k === 'sheep')).toHaveLength(4);
    const v6 = { ...base, v: 6, animals: old };
    const room = new Room(1, 'Sala 1', 123);
    expect(room.restore(v6 as never)).toBe(true);
    const village = room.world.village!;
    const count = (k: string) => room.entities.animals.filter((a) => a.species === k).length;
    for (const k of ['sheep', 'cow', 'chicken', 'capybara', 'horse']) expect(count(k), k).toBe(3);
    for (const a of room.entities.animals.filter((b) => b.species === 'horse')) {
      expect(a.x).toBeGreaterThanOrEqual(village.area.x0);
      expect(a.x).toBeLessThan(village.area.x0 + 48);
      expect(a.y).toBeGreaterThanOrEqual(village.area.y0);
      expect(a.y).toBeLessThan(village.area.y0 + 48);
    }
    expect(room.dirty).toBe(true); // regrava já na v7
    expect(room.snapshot().v).toBe(7);
    // a v7 não é mexida: restaurar a gravação nova não muda nada
    const again = new Room(1, 'Sala 1', 123);
    again.restore(JSON.parse(JSON.stringify(room.snapshot())));
    for (const k of ['sheep', 'cow', 'chicken', 'capybara', 'horse']) expect(again.entities.animals.filter((a) => a.species === k).length, k).toBe(3);
    expect(again.dirty).toBe(false);
  });
});
