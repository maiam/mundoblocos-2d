import { describe, expect, it } from 'vitest';
import { Block } from './blocks';
import { inRect } from './dungeon';
import { INTERIOR_DEFS, interiorFloor } from './interiors';
import { World } from './world';

describe('Interiores (ADR 0014)', () => {
  it('a Ferraria tem cômodo: porta na rua diante da Ferraria, entrada e capacho andáveis', () => {
    const w = new World(42);
    const room = w.interiors.find((l) => l.def.id === 'smithy')!;
    const smithy = w.town!.buildings.find((b) => b.id === Block.SMITHY)!;
    expect(room.outside).toEqual(smithy.door);
    expect(w.interiorEntrance(...smithy.door!)).toBe(room);
    expect(w.isWalkable(...room.entry)).toBe(true);
    expect(w.isWalkable(...room.exit)).toBe(true);
    expect(w.interiorAt(...room.entry)).toBe(room);
    expect(w.interiorAt(...w.town!.start)).toBeNull();
  });

  it('mapas retangulares, com um único capacho, e o mapa lógico manda em onde se anda', () => {
    for (const d of INTERIOR_DEFS) {
      expect(new Set(d.map.map((r) => r.length)).size).toBe(1);
      expect(d.map.join('').split('E')).toHaveLength(2);
    }
    const w = new World(7);
    const room = w.interiors[0];
    for (let y = room.area.y0; y <= room.area.y1; y++) {
      for (let x = room.area.x0; x <= room.area.x1; x++) expect(w.isWalkable(x, y)).toBe(interiorFloor(room, x, y));
    }
  });

  it('cômodo fechado: da entrada não se sai andando (só pelo capacho); tudo protegido', () => {
    const w = new World(3);
    const room = w.interiors[0];
    const seen = new Set<string>([room.entry.join()]);
    const q: Array<[number, number]> = [room.entry];
    while (q.length) {
      const [x, y] = q.pop()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n: [number, number] = [x + dx, y + dy];
        if (seen.has(n.join()) || !w.isWalkable(...n)) continue;
        seen.add(n.join());
        q.push(n);
      }
    }
    for (const k of seen) expect(inRect(room.area, ...(k.split(',').map(Number) as [number, number]))).toBe(true);
    expect(seen.has(room.exit.join())).toBe(true);
    expect(seen.has(room.keeper!.at.join())).toBe(true);
    expect(w.isProtected(...room.entry)).toBe(true);
    expect(w.breakBlock(...room.entry)).toBeNull();
    expect(w.canPlace(...room.entry, Block.STONE)).toBe(false);
  });

  it('igual em toda seed e sem interiores fora do mundo com cidade', () => {
    expect(new World(1).interiors[0].area).toEqual(new World(999).interiors[0].area);
  });
});
