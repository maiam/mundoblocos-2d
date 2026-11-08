import { describe, expect, it } from 'vitest';
import { DAY_LENGTH_S } from '../config';
import { Entities } from '../game/entities';
import { Exploration } from '../game/exploration';
import { Inventory } from '../game/inventory';
import { Player } from '../game/player';
import { applySave, captureSave, migrate, SAVE_VERSION } from '../game/save';
import { PROTOCOL_VERSION } from '../net/protocol';
import { Room } from '../net/room';
import { Block } from './blocks';
import { mulberry32 } from './random';
import { World } from './world';

/** Célula de chão firme (sem objeto, fora de áreas protegidas) com 4 vizinhos de chão firme, longe de água. */
function inland(w: World): [number, number] {
  const [sx, sy] = w.outsideGate();
  const solid = (x: number, y: number) => {
    const g = w.getGround(x, y);
    return g !== Block.WATER && g !== Block.HOLE && w.getObject(x, y) === Block.AIR && !w.isProtected(x, y);
  };
  for (let r = 3; r < 200; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const [x, y] = [sx + dx, sy + dy];
        let ok = true;
        for (let ox = -2; ox <= 2 && ok; ox++) for (let oy = -2; oy <= 2 && ok; oy++) ok = solid(x + ox, y + oy);
        if (ok) return [x, y];
      }
    }
  }
  throw new Error('sem chão firme perto do spawn');
}

const neighbours = (w: World, x: number, y: number) => [[0, -1], [1, 0], [0, 1], [-1, 0]].map(([dx, dy]) => w.getGround(x + dx, y + dy));
/** Passa `s` segundos do mundo em passos de 1 s (sem crescimento de planta: `rand` = 1). */
const pass = (w: World, s: number, onGrow?: (x: number, y: number, id: number) => void) => { for (let t = 0; t < s; t++) w.tick(1, () => 1, true, onGrow); };

describe('Chão quebrado se refaz depois de um dia inteiro', () => {
  it('buraco sem bloco: continua buraco até completar um dia e então ganha o chão de um vizinho', () => {
    const w = new World(42);
    const [x, y] = inland(w);
    const around = neighbours(w, x, y);
    expect(w.breakBlock(x, y)).not.toBeNull();
    expect(w.getGround(x, y)).toBe(Block.HOLE);
    expect(w.holeCount).toBe(1);
    pass(w, DAY_LENGTH_S - 2);
    expect(w.getGround(x, y)).toBe(Block.HOLE); // ainda não faz um dia inteiro
    pass(w, 4);
    const g = w.getGround(x, y);
    expect(g).not.toBe(Block.HOLE);
    expect(around).toContain(g); // igual a um vizinho
    expect(w.holeCount).toBe(0);
  });

  it('é determinístico: a mesma seed e o mesmo buraco ganham sempre o mesmo chão; o chão novo é de bloco (não água)', () => {
    const a = new World(42);
    const b = new World(42);
    const [x, y] = inland(a);
    a.breakBlock(x, y);
    b.breakBlock(x, y);
    pass(a, DAY_LENGTH_S + 2);
    pass(b, DAY_LENGTH_S + 2);
    expect(a.getGround(x, y)).toBe(b.getGround(x, y));
    expect(a.getGround(x, y)).not.toBe(Block.WATER);
  });

  it('tapar o buraco antes (bloco colocado) para a contagem; e o aviso `onGrow` leva a célula e o chão novo', () => {
    const w = new World(42);
    const [x, y] = inland(w);
    w.breakBlock(x, y);
    pass(w, DAY_LENGTH_S - 10);
    expect(w.placeBlock(x, y, Block.SAND)).toBe(true); // tapa: o chão vira o do bloco
    expect(w.holeCount).toBe(0);
    pass(w, 30);
    expect(w.getGround(x, y)).toBe(Block.SAND);

    const w2 = new World(42);
    w2.breakBlock(x, y);
    const fills: Array<[number, number, number]> = [];
    pass(w2, DAY_LENGTH_S + 2, (cx, cy, id) => fills.push([cx, cy, id]));
    expect(fills).toEqual([[x, y, w2.getGround(x, y)]]);
  });

  it('o aparelho na sala (sem decidir crescimento) aplica o que a sala avisou, só em buraco', () => {
    const server = new World(42);
    const client = new World(42);
    const [x, y] = inland(server);
    server.breakBlock(x, y);
    client.breakBlock(x, y);
    const fills: Array<[number, number, number]> = [];
    pass(server, DAY_LENGTH_S + 2, (cx, cy, id) => fills.push([cx, cy, id]));
    pass(client, DAY_LENGTH_S + 2); // grow=true por padrão aqui; abaixo simula quem não decide:
    const passive = new World(42);
    passive.breakBlock(x, y);
    for (let t = 0; t < DAY_LENGTH_S + 2; t++) passive.tick(1, () => 1, false);
    expect(passive.getGround(x, y)).toBe(Block.HOLE); // sem decidir, não preenche sozinho
    expect(passive.applyGrowth(fills[0][0], fills[0][1], fills[0][2])).toBe(true);
    expect(passive.getGround(x, y)).toBe(server.getGround(x, y));
    expect(passive.applyGrowth(x + 1, y, Block.SAND)).toBe(false); // célula que não é buraco: ignora
    expect(client.getGround(x, y)).toBe(server.getGround(x, y));
  });

  it('as idades dos buracos vão para o salvamento e voltam: o dia continua de onde parou', () => {
    const a = new World(42);
    const [x, y] = inland(a);
    a.breakBlock(x, y);
    pass(a, 100);
    expect(a.holeAges()).toEqual([[x, y, 100]]);
    const player = new Player(1, 1);
    const entities = new Entities(player, mulberry32(1));
    const data = captureSave({ world: a, player, entities, inventory: new Inventory(), exploration: new Exploration(), time: 0.5, selected: null, hotbar: null });
    expect(data.holes).toEqual([[x, y, 100]]);
    const b = new World(42);
    const sessionB = { world: b, player: new Player(1, 1), entities: new Entities(new Player(1, 1), mulberry32(1)), inventory: new Inventory() };
    applySave(migrate(JSON.parse(JSON.stringify(data)))!, sessionB as never);
    expect(b.holeAges()).toEqual([[x, y, 100]]);
    pass(b, DAY_LENGTH_S - 100 - 2);
    expect(b.getGround(x, y)).toBe(Block.HOLE);
    pass(b, 4);
    expect(b.getGround(x, y)).not.toBe(Block.HOLE);
  });

  it('salvamento antigo (v10) ganha a lista de buracos vazia', () => {
    const w = new World(42);
    const player = new Player(1, 1);
    const entities = new Entities(player, mulberry32(1));
    const d = captureSave({ world: w, player, entities, inventory: new Inventory(), exploration: new Exploration(), time: 0.5, selected: null, hotbar: null });
    const old = { ...d, v: 10 } as Record<string, unknown>;
    delete old.holes;
    const m = migrate(old)!;
    expect(m.v).toBe(SAVE_VERSION);
    expect(m.holes).toEqual([]);
  });

  it('sala: quem decide é a sala — o buraco se refaz, a célula vai no aviso de crescimento e as idades vão para o disco', () => {
    const room = new Room(1, 'Sala 1', 20261108, mulberry32(5));
    room.join({ t: 'hello', v: PROTOCOL_VERSION, name: 'Ana', room: 1 }); // sem ninguém a sala não manda nada
    const [x, y] = inland(room.world);
    room.world.breakBlock(x, y);
    const grown: number[][] = [];
    for (let t = 0; t < DAY_LENGTH_S + 3; t++) {
      for (const o of room.tick(1)) if (o.msg.t === 'grow') grown.push(...o.msg.cells);
    }
    expect(grown.some(([gx, gy, id]) => gx === x && gy === y && id === room.world.getGround(x, y))).toBe(true);
    expect(room.world.getGround(x, y)).not.toBe(Block.HOLE);
    // buraco novo: a idade entra no snapshot e volta no restore
    room.world.breakBlock(x + 1, y);
    for (let t = 0; t < 50; t++) room.tick(1);
    const snap = JSON.parse(JSON.stringify(room.snapshot()));
    expect(snap.holes).toEqual([[x + 1, y, expect.any(Number)]]);
    const back = new Room(1, 'Sala 1', 20261108, mulberry32(9));
    expect(back.restore(snap)).toBe(true);
    expect(back.world.holeAges()).toEqual(snap.holes);
  });
});
