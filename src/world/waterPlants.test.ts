import { describe, expect, it } from 'vitest';
import { Block, blockDef, isWaterPlant } from './blocks';
import { WorldGenerator } from './generator';
import { World } from './world';

describe('Vitórias-régias (v0.93.92)', () => {
  it('só nascem sobre água, pela seed (iguais nas duas chamadas), com a área toda de água; existem comuns e gigantes', () => {
    const g = new WorldGenerator(42), g2 = new WorldGenerator(42);
    let lily = 0, vic = 0;
    for (let y = -400; y < 400; y++) for (let x = -400; x < 400; x++) {
      const c = g.cellAt(x, y);
      if (!isWaterPlant(c.object)) continue;
      expect(c.ground).toBe(Block.WATER);
      expect(g2.cellAt(x, y).object).toBe(c.object);
      const [w, h] = c.object === Block.VICTORIA ? [4, 3] : [2, 2];
      for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) expect(g.cellAt(x + dx, y - dy).ground, `área ${x},${y}`).toBe(Block.WATER);
      if (c.object === Block.VICTORIA) vic++; else lily++;
    }
    expect(lily).toBeGreaterThan(50);
    expect(vic).toBeGreaterThan(5);
    expect(lily).toBeGreaterThan(vic); // as gigantes são mais raras
  });

  it('não bloqueiam, não se quebram nem se colocam, e a água delas continua "líquida"', () => {
    for (const id of [Block.WATER_LILY, Block.VICTORIA]) {
      const d = blockDef(id);
      expect(d.solid).toBe(false);
      expect(d.breakable).toBe(false);
      expect(d.placeable).toBe(false);
    }
    const w = new World(42);
    let found: [number, number] | null = null;
    for (let y = -400; y < 400 && !found; y++) for (let x = -400; x < 400 && !found; x++) if (w.getObject(x, y) === Block.WATER_LILY) found = [x, y];
    expect(found).not.toBeNull();
    const [x, y] = found!;
    expect(w.getGround(x, y)).toBe(Block.WATER);
    expect(w.canBreak(x, y)).toBe(false);
    expect(w.canPlace(x, y, Block.WATER)).toBe(false); // água não se coloca sobre a planta
  });

  it('encher a água sob a planta (Pedra sobre a água) tira a vitória-régia que cobria a célula', () => {
    const w = new World(42);
    const [ax, ay] = (() => { for (let y = -400; y < 400; y++) for (let x = -400; x < 400; x++) if (w.getObject(x, y) === Block.VICTORIA) return [x, y]; return [0, 0]; })();
    expect(w.getObject(ax, ay)).toBe(Block.VICTORIA);
    // a célula do meio da gigante (2 à direita, 1 acima da âncora) é coberta pelo desenho
    expect(w.canPlace(ax + 2, ay - 1, Block.STONE)).toBe(true);
    expect(w.placeBlock(ax + 2, ay - 1, Block.STONE)).toBe(true);
    expect(w.getObject(ax, ay)).toBe(Block.AIR);
  });

  it('a cidade e a vila não deixam planta flutuante sobre a grama do anel de terra firme', () => {
    const w = new World(42);
    const bad: string[] = [];
    for (const area of [w.town!.area, w.village?.area].filter(Boolean) as Array<{ x0: number; y0: number; x1: number; y1: number }>) {
      for (let y = area.y0 - 8; y <= area.y1 + 8; y++) for (let x = area.x0 - 8; x <= area.x1 + 8; x++) {
        if (isWaterPlant(w.getObject(x, y)) && w.getGround(x, y) !== Block.WATER) bad.push(`${x},${y}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
