import { describe, expect, it } from 'vitest';
import { ROOMS, roomById } from './protocol';
import { Room } from './room';

describe('Santuário como seed de sala multiplayer', () => {
  it('mantém a Sala 1 e reserva uma seed exclusiva para o Santuário', () => {
    expect(roomById(1)).toMatchObject({ name: 'Sala 1', seed: 20261106, kind: 'normal' });
    const sanctuary = roomById(2)!;
    expect(sanctuary).toMatchObject({ name: 'Santuário', kind: 'sanctuary' });
    expect(sanctuary.seed).not.toBe(roomById(1)!.seed);
    expect(ROOMS.map(room => room.id)).toEqual([1, 2]);
  });

  it('usa o mesmo gerador procedural e preserva a cidade em seeds diferentes', () => {
    const normal = new Room(1, 'Sala 1', roomById(1)!.seed);
    const sanctuary = new Room(2, 'Santuário', roomById(2)!.seed);
    expect(sanctuary.world.town).toBeTruthy();
    expect(normal.world.town).toBeTruthy();
    expect(sanctuary.snapshot()).toMatchObject({ room: 2, seed: roomById(2)!.seed });
    expect(normal.restore(sanctuary.snapshot())).toBe(false);
  });
});
