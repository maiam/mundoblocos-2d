import { describe, expect, it } from 'vitest';
import { Block, isWheat, WHEAT_STAGES, wheatId, wheatStage } from './blocks';
import { dropsFor, Item } from './items';
import { World } from './world';

function clearCell(w: World, x: number, y: number) {
  while (w.topBlock(x, y)) w.breakBlock(x, y);
}

/** Célula de grama (terra plantável) andável perto do spawn. */
function soil(w: World): [number, number] {
  const [sx, sy] = w.outsideGate();
  for (let r = 0; r < 30; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = sx + dx, y = sy + dy;
        if (w.getGround(x, y) === Block.GRASS && w.getGround(x + 1, y) === Block.GRASS && w.isWalkable(x, y)) return [x, y];
      }
    }
  }
  throw new Error('sem grama perto do spawn');
}

describe('Trigo', () => {
  it('semente só vai em Terra Arada; a enxada ara terra e grama', () => {
    const w = new World(7);
    const [x, y] = soil(w);
    clearCell(w, x, y);
    expect(w.getGround(x, y)).toBe(Block.GRASS);
    expect(w.canPlant(x, y)).toBe(false); // grama não aceita semente
    expect(w.canTill(x, y)).toBe(true);
    expect(w.till(x, y)).toBe(true);
    expect(w.getGround(x, y)).toBe(Block.TILLED);
    expect(w.canTill(x, y)).toBe(false); // já arada
    expect(w.canPlant(x, y)).toBe(true);
    expect(w.plant(x, y)).toBe(true);
    expect(w.getObject(x, y)).toBe(Block.WHEAT_0);
    expect(w.canPlant(x, y)).toBe(false); // já plantado
    expect(w.placeBlock(x, y, Block.STONE)).toBe(false); // nada por cima da plantação
    expect(w.standHeight(x, y)).toBe(0); // dá para andar entre as plantas
    clearCell(w, x + 1, y);
    w.placeBlock(x + 1, y, Block.STONE);
    expect(w.canTill(x + 1, y)).toBe(false); // cubo ocupando
    expect(w.canPlant(x + 1, y)).toBe(false);
    // Terra (sem grama) também pode ser arada; enfeite em cima é removido.
    w.breakBlock(x + 1, y);
    w.breakBlock(x + 1, y); // vira buraco
    w.placeBlock(x + 1, y, Block.DIRT); // piso de terra
    w.setObject(x + 1, y, Block.FLOWER);
    expect(w.till(x + 1, y)).toBe(true);
    expect(w.getObject(x + 1, y)).toBe(Block.AIR);
    expect(w.getGround(x + 1, y)).toBe(Block.TILLED);
  });

  it('não ara nem planta em areia, pedra, piso de madeira nem buraco', () => {
    const w = new World(42);
    let sand: [number, number] | null = null;
    for (let i = 0; i < 6000 && !sand; i++) {
      const x = (i % 120) - 60, y = Math.floor(i / 120) - 25;
      if (w.getGround(x, y) === Block.SAND && w.getObject(x, y) === Block.AIR) sand = [x, y];
    }
    expect(sand).not.toBeNull();
    expect(w.canPlant(...sand!)).toBe(false);
    expect(w.canTill(...sand!)).toBe(false);
    const [x, y] = soil(w);
    clearCell(w, x, y);
    w.breakBlock(x, y); // buraco
    expect(w.canPlant(x, y)).toBe(false);
    expect(w.canTill(x, y)).toBe(false);
    w.placeBlock(x, y, Block.OAK_PLANKS); // piso de tábuas
    expect(w.canPlant(x, y)).toBe(false);
    expect(w.canTill(x, y)).toBe(false);
  });

  it('cresce com o tempo até maduro e para', () => {
    const w = new World(7);
    const [x, y] = soil(w);
    clearCell(w, x, y);
    w.till(x, y);
    w.plant(x, y);
    expect(w.cropCount).toBe(1);
    for (let i = 0; i < 40; i++) w.tick(10, () => 0); // rand 0 → sempre avança
    expect(w.getObject(x, y)).toBe(wheatId(WHEAT_STAGES - 1));
    w.tick(10, () => 0);
    expect(wheatStage(w.getObject(x, y))).toBe(WHEAT_STAGES - 1);
  });

  it('sem sorte não cresce; colhido sai da lista de plantações', () => {
    const w = new World(7);
    const [x, y] = soil(w);
    clearCell(w, x, y);
    w.till(x, y);
    w.plant(x, y);
    w.tick(1, () => 0.99);
    expect(w.getObject(x, y)).toBe(Block.WHEAT_0);
    expect(isWheat(w.breakBlock(x, y)!)).toBe(true);
    expect(w.cropCount).toBe(0);
  });

  it('colheita: maduro dá trigo + 1–2 sementes; verde devolve a semente', () => {
    expect(dropsFor(Block.WHEAT_15, () => 0.9)).toEqual([
      { item: Item.WHEAT, count: 1 },
      { item: Item.WHEAT_SEED, count: 1 },
    ]);
    expect(dropsFor(Block.WHEAT_15, () => 0.1)[1].count).toBe(2);
    expect(dropsFor(wheatId(7))).toEqual([{ item: Item.WHEAT_SEED, count: 1 }]);
    expect(dropsFor(Block.STONE)).toEqual([]);
  });
});
