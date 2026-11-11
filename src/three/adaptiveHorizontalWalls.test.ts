import { describe, expect, it } from 'vitest';
import { FreeBuildFive } from './freeBuildFive';
import {
  adjacentFreeBuildCell, buildHorizontalWallDemo, horizontalWallShape,
  HORIZONTAL_WALL_THICKNESS,
} from './adaptiveHorizontalWalls';

const shape = (ed: FreeBuildFive, x: number, y: number, z = 0, enabled = true) => {
  const cell = ed.get(x, y, z);
  if (!cell) throw Error('Faltou bloco no teste');
  return horizontalWallShape(ed, cell, enabled);
};

describe('Santuário — paredes horizontais adaptativas (experimental)', () => {
  it('keeps one/two cubes thick, turns only interiors of horizontal runs 3–5 into panels', () => {
    for (const length of [1, 2, 3, 4, 5]) {
      const ed = new FreeBuildFive();
      for (let x = 0; x < length; x++) ed.set(33 + x, 10, 0, 84);
      for (let x = 0; x < length; x++) {
        const expected = x > 0 && x < length - 1 ? 'thin' : 'solid';
        expect(shape(ed, 33 + x, 10)).toBe(expected);
      }
    }
    expect(HORIZONTAL_WALL_THICKNESS).toBe(0.25);
  });

  it('never thins a filled 2×2 / 3×3 or a vertical run', () => {
    for (const n of [2, 3]) {
      const ed = new FreeBuildFive();
      for (let y = 10; y < 10 + n; y++) for (let x = 33; x < 33 + n; x++)
        ed.set(x, y, 0, 84);
      for (const cell of ed.list()) expect(shape(ed, cell.x, cell.y)).toBe('solid');
    }
    const vertical = new FreeBuildFive();
    for (let y = 10; y < 14; y++) vertical.set(33, y, 0, 84);
    for (const cell of vertical.list()) expect(shape(vertical, cell.x, cell.y)).toBe('solid');
  });

  it('perpendicular neighbors prevent thinning only at the affected cell', () => {
    const ed = new FreeBuildFive();
    for (let x = 33; x < 38; x++) ed.set(x, 14, 0, 84);
    expect(shape(ed, 35, 14)).toBe('thin');
    ed.set(35, 13, 0, 84);
    expect(shape(ed, 35, 14)).toBe('solid');
    expect(shape(ed, 34, 14)).toBe('thin');
    expect(shape(ed, 36, 14)).toBe('thin');
    ed.remove(35, 13, 0);
    expect(shape(ed, 35, 14)).toBe('thin');
  });

  it('keeps clouds, unlike materials, disabled mode and separate levels solid', () => {
    const ed = new FreeBuildFive();
    for (let x = 33; x <= 35; x++) ed.set(x, 10, 0, 80);
    expect(shape(ed, 34, 10)).toBe('solid');
    for (let x = 33; x <= 35; x++) ed.set(x, 12, 1, 84);
    expect(shape(ed, 34, 12, 1)).toBe('thin');
    expect(shape(ed, 34, 12, 1, false)).toBe('solid');
    ed.set(33, 13, 0, 82);
    ed.set(34, 13, 0, 83);
    ed.set(35, 13, 0, 82);
    expect(shape(ed, 34, 13)).toBe('solid');
  });

  it('a removed end restores its neighboring panel to a solid column', () => {
    const ed = new FreeBuildFive();
    for (let x = 33; x <= 35; x++) ed.set(x, 14, 0, 84);
    expect(shape(ed, 34, 14)).toBe('thin');
    ed.remove(35, 14, 0);
    expect(shape(ed, 34, 14)).toBe('solid');
    expect(ed.size).toBe(2);
  });

  it('recreates demo runs and masses in the editor bounds, without saving', () => {
    const ed = new FreeBuildFive();
    buildHorizontalWallDemo(ed);
    expect(ed.size).toBe(3 + 4 + 5 + 4 + 9);
    expect(shape(ed, 34, 10)).toBe('thin');
    expect(shape(ed, 34, 12)).toBe('thin');
    expect(shape(ed, 36, 14)).toBe('thin');
    expect(shape(ed, 40, 10)).toBe('solid');
    expect(shape(ed, 44, 15)).toBe('solid');
    for (const cell of ed.list()) expect(ed.contains(cell.x, cell.y)).toBe(true);
  });

  it('selects by the source voxel, even if its thin front is recessed', () => {
    const source = { x: 35, y: 15, z: 2 };
    expect(adjacentFreeBuildCell(source, {x:0,y:0,z:1}, true))
      .toEqual(source);
    expect(adjacentFreeBuildCell(source, {x:0,y:0,z:-1}, false))
      .toEqual({x:35,y:14,z:2});
    expect(adjacentFreeBuildCell(source, {x:1,y:0,z:0}, false))
      .toEqual({x:36,y:15,z:2});
    expect(adjacentFreeBuildCell(source, {x:0,y:1,z:0}, false))
      .toEqual({x:35,y:15,z:3});
    expect(adjacentFreeBuildCell(source, {x:0,y:-1,z:0}, false))
      .toEqual({x:35,y:15,z:1});
  });
});
