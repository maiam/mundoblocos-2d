import { SUBDIV } from '../config';
import { describe, expect, it } from 'vitest';
import { Block } from '../world/blocks';
import { mulberry32 } from '../world/random';
import { type Outgoing, Room } from './room';
import { PROTOCOL_VERSION, ROOM_RULES, ROOMS, roomById, roomRules, type ServerMessage } from './protocol';

const of = <T extends ServerMessage['t']>(out: Outgoing[], t: T) =>
  out.filter((o) => o.msg.t === t) as Array<{ to: Outgoing['to']; msg: Extract<ServerMessage, { t: T }> }>;

function join(room: Room, name: string): number {
  const r = room.join({ t: 'hello', v: PROTOCOL_VERSION, sub: SUBDIV, name, room: room.id });
  if (r.id === null) throw new Error(`não entrou: ${JSON.stringify(r.out)}`);
  return r.id;
}
const at = (room: Room, id: number, x: number, y: number) => room.handle(id, { t: 'state', s: { x, y, facing: 'down', moving: false } });

describe('Santuário como sala multiplayer (SPEC v1.0)', () => {
  it('Sala 1 e Santuário: seeds distintas e a Sala 1 inalterada', () => {
    expect(roomById(1)).toMatchObject({ name: 'Sala 1', seed: 20261106, kind: 'normal' });
    expect(roomById(2)).toMatchObject({ name: 'Santuário', seed: 20261115, kind: 'sanctuary' });
    expect(ROOMS.map((r) => r.id)).toEqual([1, 2]);
    expect(new Set(ROOMS.map((r) => r.seed)).size).toBe(ROOMS.length);
  });

  it('as regras ficam num lugar só: Sala 1 = sobrevivência (sem câmeras extra); Santuário = criativo; a cidade é protegida nas duas', () => {
    expect(roomRules(1)).toBe(ROOM_RULES.normal);
    expect(roomRules(2)).toBe(ROOM_RULES.sanctuary);
    expect(roomRules(99)).toBe(ROOM_RULES.normal); // sala desconhecida = a mais restrita
    expect(ROOM_RULES.normal).toMatchObject({ mode: 'survival', infiniteBlocks: false, collectBlockDrops: true, allowCameraModes: false, protectTown: true });
    expect(ROOM_RULES.sanctuary).toMatchObject({ mode: 'creative', infiniteBlocks: true, collectBlockDrops: false, allowCameraModes: true, protectTown: true });
    expect(new Room(1, 'Sala 1', roomById(1)!.seed).rules).toBe(ROOM_RULES.normal);
    expect(new Room(2, 'Santuário', roomById(2)!.seed).rules).toBe(ROOM_RULES.sanctuary);
  });

  it('mesmo gerador procedural e a Cidade do Despertar nas duas salas; snapshot de outra sala ou seed não é restaurado', () => {
    const normal = new Room(1, 'Sala 1', roomById(1)!.seed);
    const sanctuary = new Room(2, 'Santuário', roomById(2)!.seed);
    expect(sanctuary.world.town).toBeTruthy();
    expect(normal.world.town!.area).toEqual(sanctuary.world.town!.area); // a cidade é a mesma em toda seed
    expect(sanctuary.world.dungeon).toBeTruthy();
    expect(sanctuary.snapshot()).toMatchObject({ room: 2, seed: roomById(2)!.seed });
    expect(normal.restore(sanctuary.snapshot())).toBe(false);
    expect(sanctuary.restore(normal.snapshot())).toBe(false);
    expect(new Room(2, 'Santuário', 12345).restore(sanctuary.snapshot())).toBe(false); // mesma sala, outra seed
  });

  it('quebrar bloco: no Santuário não solta material; na Sala 1 solta (a regra de sobrevivência não muda)', () => {
    const drops = (room: Room): number => {
      const id = join(room, 'Ana');
      const [gx, gy] = room.world.outsideGate();
      const x = gx + 3 * SUBDIV, y = gy + 2 * SUBDIV;
      at(room, id, x + 0.5, y + 1.5);
      // coloca um cubo de pedra e o quebra com a mão
      room.handle(id, { t: 'action', seq: 1, a: { kind: 'place', x, y, block: Block.STONE } });
      expect(room.world.getObject(x, y)).toBe(Block.STONE);
      const out = room.handle(id, { t: 'action', seq: 2, a: { kind: 'break', x, y, tool: null } });
      return of(out, 'drops').reduce((n, o) => n + o.msg.list.length, 0);
    };
    expect(drops(new Room(2, 'Santuário', roomById(2)!.seed, mulberry32(1)))).toBe(0);
    expect(drops(new Room(1, 'Sala 1', roomById(1)!.seed, mulberry32(1)))).toBeGreaterThan(0);
  });

  it('a Cidade do Despertar é protegida: nada se coloca nem se quebra ali, nas duas salas', () => {
    for (const def of ROOMS) {
      const room = new Room(def.id, def.name, def.seed);
      const id = join(room, 'Ana');
      const [sx, sy] = room.world.town!.start;
      at(room, id, sx + 0.5, sy + 0.6);
      const out = room.handle(id, { t: 'action', seq: 1, a: { kind: 'place', x: sx, y: sy, block: Block.STONE } });
      expect(of(out, 'rejected')).toHaveLength(1);
      expect(room.world.getObject(sx, sy)).not.toBe(Block.STONE);
    }
  });

  it('dois jogadores constroem juntos: A coloca, B vê e remove, A vê; ao reiniciar (snapshot) o estado volta; a Sala 1 não muda', () => {
    const sanct = roomById(2)!;
    const room = new Room(2, sanct.name, sanct.seed, mulberry32(3));
    const other = new Room(1, 'Sala 1', roomById(1)!.seed, mulberry32(3));
    const a = join(room, 'Ana');
    const b = join(room, 'Beto');
    const [gx, gy] = room.world.outsideGate();
    const x = gx + 4 * SUBDIV, y = gy + 3 * SUBDIV;
    at(room, a, x + 0.5, y + 1.5);
    at(room, b, x + 1.5, y + 1.5);
    const placed = room.handle(a, { t: 'action', seq: 1, a: { kind: 'place', x, y, block: Block.STONE } });
    const toAll = of(placed, 'applied').find((o) => o.to === 'all')!;
    expect(toAll.msg).toMatchObject({ by: a, action: { kind: 'place', x, y, block: Block.STONE } }); // todos (B inclusive) recebem
    expect(room.world.getObject(x, y)).toBe(Block.STONE);
    // reinício do servidor: nova sala com o snapshot
    const snap = JSON.parse(JSON.stringify(room.snapshot()));
    const reborn = new Room(2, sanct.name, sanct.seed);
    expect(reborn.restore(snap)).toBe(true);
    expect(reborn.world.getObject(x, y)).toBe(Block.STONE);
    expect(other.world.getObject(x, y)).not.toBe(Block.STONE); // a Sala 1 nunca vê a obra do Santuário
    // B remove; A recebe a remoção
    const removed = room.handle(b, { t: 'action', seq: 1, a: { kind: 'break', x, y, tool: null } });
    expect(of(removed, 'applied').find((o) => o.to === 'all')!.msg).toMatchObject({ by: b, action: { kind: 'break', x, y } });
    expect(room.world.getObject(x, y)).toBe(Block.AIR);
  });
});

describe('o Santuário é da página do Santuário, com a Deusa (correção v0.93.124)', () => {
  it('o mundo normal só lista as salas de sobrevivência; o Santuário só lista a sua', async () => {
    const { roomsForWorld } = await import('./protocol');
    expect(roomsForWorld('principal').map((r) => r.id)).toEqual([1]);
    expect(roomsForWorld('santuario').map((r) => r.id)).toEqual([2]);
    expect(roomsForWorld('qualquer')).toEqual(roomsForWorld('principal')); // desconhecido = a mais restrita (sem o Santuário)
  });

  it('a sala decide a aparência: no Santuário só a Deusa entra (mesmo que o cliente peça outra); na Sala 1 a Deusa vira a heroína', () => {
    const sanct = new Room(2, 'Santuário', roomById(2)!.seed);
    const normal = new Room(1, 'Sala 1', roomById(1)!.seed);
    expect(ROOM_RULES.sanctuary.goddessOnly).toBe(true);
    expect(ROOM_RULES.normal.goddessOnly).toBe(false);
    const hero = sanct.join({ t: 'hello', v: PROTOCOL_VERSION, sub: SUBDIV, name: 'Ana', room: 2, appearance: { body: 'hero' } });
    const welcome = of(hero.out, 'welcome')[0].msg as unknown as { others?: unknown[] };
    expect(welcome).toBeTruthy();
    const goddess = normal.join({ t: 'hello', v: PROTOCOL_VERSION, sub: SUBDIV, name: 'Beto', room: 1, appearance: { body: 'heroine', goddess: true } });
    const a = join(sanct, 'Caio');
    const info = (room: Room, id: number) => (room as unknown as { players: Map<number, { appearance: unknown }> }).players.get(id)!.appearance;
    expect(info(sanct, hero.id!)).toEqual({ body: 'hero', goddess: true });
    expect(info(normal, goddess.id!)).toEqual({ body: 'heroine' });
    expect(a).toBeGreaterThan(0);
  });
});
