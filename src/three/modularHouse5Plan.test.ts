import { describe, expect, it } from 'vitest';
import { Player } from '../game/player';
import { sanctuaryV2Plan } from './sanctuaryV2Plan';
import { makeV2Heightfield } from './sanctuaryV2Collision';
import { HOUSE5, HOUSE5_STAIRS, houseSupportLevel, houseFloorName, makeHouseNavigation } from './modularHouse5Plan';

const x0 = -48, y0 = -16;
const base = makeV2Heightfield(sanctuaryV2Plan(), x0, y0);

describe('Casa celestial 5×5 — pavimentos e escada', () => {
  it('defines footprint, south entrance, four rising steps and layer-dependent support', () => {
    expect(HOUSE5.size).toBe(5);
    expect(HOUSE5_STAIRS.map(s => s.height)).toEqual([1, 2, 3, 4]);
    expect(houseSupportLevel(72, 29, 0)).toBe(0);
    expect(houseSupportLevel(70, 27, 0)).toBeNull();
    expect(houseSupportLevel(73, 27, 0)).toBe(0);
    expect(houseSupportLevel(73, 27, 4)).toBe(4);
    expect(houseSupportLevel(73, 27, 2)).toBe(0);
    expect(houseSupportLevel(73, 27, 3)).toBe(4);
    expect(houseSupportLevel(71, 28, 0)).toBe(1);
    expect(houseSupportLevel(71, 27, 1)).toBe(2);
    expect(houseSupportLevel(71, 26, 2)).toBe(3);
    expect(houseSupportLevel(72, 26, 3)).toBe(4);
    expect(houseSupportLevel(69, 27, 3)).toBeUndefined();
    expect(houseFloorName(4, 73.5, 27.5)).toBe('2º pavimento');
    expect(houseFloorName(0, 73.5, 27.5)).toBe('Térreo');
  });

  it('walks inside, climbs from level zero to the upper floor, returns down and exits', () => {
    const player = new Player(x0 + HOUSE5.visit[0], y0 + HOUSE5.visit[1]);
    const nav = makeHouseNavigation(base, x0, y0, () => player.z);
    const world = nav.walkerWorld;
    const go = (localX: number, localY: number) => {
      const tx = x0 + localX, ty = y0 + localY;
      for (let k = 0; k < 240 && Math.hypot(tx - player.x, ty - player.y) > 0.07; k++) {
        const dx = tx - player.x, dy = ty - player.y;
        const norm = Math.hypot(dx, dy);
        player.move(1 / 60, dx / norm, dy / norm, world);
      }
      expect(Math.hypot(tx - player.x, ty - player.y)).toBeLessThan(0.12);
    };
    go(72.5, 29.5); expect(player.z).toBe(0); // Door, one ground level
    go(72.5, 28.5); expect(player.z).toBe(0);
    go(71.5, 28.5); expect(player.z).toBe(1);
    go(71.5, 27.5); expect(player.z).toBe(2);
    go(71.5, 26.5); expect(player.z).toBe(3);
    go(72.5, 26.5); expect(player.z).toBe(4);
    go(73.5, 26.5); expect(player.z).toBe(4); // Upstairs
    go(72.5, 26.5);
    go(71.5, 26.5); expect(player.z).toBe(3);
    go(71.5, 27.5); expect(player.z).toBe(2);
    go(71.5, 28.5); expect(player.z).toBe(1);
    go(72.5, 28.5); expect(player.z).toBe(0);
    go(72.5, 29.5);
    go(72.5, 30.5); expect(player.z).toBe(0);
  });

  it('never permits walking through a solid external wall, at either level', () => {
    const player = new Player(x0 + 69.5, y0 + 27.5);
    const w = makeHouseNavigation(base, x0, y0, () => player.z).walkerWorld;
    for (let k = 0; k < 80; k++) player.move(1 / 60, 1, 0, w);
    expect(player.x).toBeLessThan(x0 + 70);
    expect(player.z).toBe(0);
    player.respawn(x0 + 73.5, y0 + 26.5);
    player.z = player.visualZ = 4;
    for (let k = 0; k < 80; k++) player.move(1 / 60, 1, 0, w);
    expect(player.x).toBeLessThan(x0 + 74);
    expect(player.z).toBe(4);
  });
});
