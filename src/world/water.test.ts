import { describe, expect, it } from 'vitest';
import { Block } from './blocks';
import { FLOW_SECONDS, World } from './world';

/** Margem de lago: célula de terra firme (grama/terra/areia) com água a oeste e mais 4 células de terra a leste. */
function shore(w: World): [number, number] {
  const [sx, sy] = w.findSpawn();
  const land = (x: number, y: number) => {
    const g = w.getGround(x, y);
    return g !== Block.WATER && g !== Block.HOLE && !w.isProtected(x, y) && w.getObject(x, y) === Block.AIR;
  };
  for (let r = 0; r < 200; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const [x, y] = [sx + dx, sy + dy];
        // Água só a oeste da 1ª célula; a vala (x..x+4) e seus vizinhos de cima/baixo são terra firme.
        const dry = (cx: number, cy: number) => w.getGround(cx, cy) !== Block.WATER;
        if (w.getGround(x - 1, y) === Block.WATER && [0, 1, 2, 3, 4].every((k) => land(x + k, y) && dry(x + k, y - 1) && dry(x + k, y + 1))
          && dry(x + 5, y)) return [x, y];
      }
    }
  }
  throw new Error('sem margem de água perto do spawn');
}

const run = (w: World, s: number) => { for (let t = 0; t < s; t += 0.05) w.tick(0.05, () => 1); };

describe('Água', () => {
  it('não quebra; todo tipo de terra, Pedra, Tora ou Tábua a substituem (viram chão); outros blocos não', () => {
    const w = new World(42);
    const [x, y] = shore(w);
    const [wx, wy] = [x - 1, y];
    expect(w.canBreak(wx, wy)).toBe(false);
    expect(w.breakBlock(wx, wy)).toBeNull();
    expect(w.canPlace(wx, wy, Block.SAND)).toBe(false);
    for (const id of [Block.DIRT, Block.GRASS, Block.TILLED, Block.PATH, Block.STONE, Block.OAK_LOG, Block.OAK_PLANKS]) {
      expect(w.canPlace(wx, wy, id)).toBe(true);
    }
    expect(w.placeBlock(wx, wy, Block.STONE)).toBe(true);
    expect(w.getGround(wx, wy)).toBe(Block.STONE);
    expect(w.standHeight(wx, wy)).toBe(0); // vira chão pisável
  });

  it('buraco vizinho de água enche sozinho (vindo do lado da água) e a vala enche em cadeia', () => {
    const w = new World(42);
    const [x, y] = shore(w);
    // Cava uma vala de 3 a partir da margem: x, x+1, x+2.
    for (let k = 0; k < 3; k++) expect(w.breakBlock(x + k, y)).not.toBeNull();
    const first = [...w.waterFlows()];
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({ x, y, from: 'west' });
    expect(w.getGround(x + 1, y)).toBe(Block.HOLE); // ainda não: só depois do primeiro encher
    run(w, FLOW_SECONDS + 0.1);
    expect(w.getGround(x, y)).toBe(Block.WATER);
    expect([...w.waterFlows()].map((f) => [f.x, f.from])).toEqual([[x + 1, 'west']]);
    run(w, FLOW_SECONDS * 2 + 0.2);
    expect([x, x + 1, x + 2].map((cx) => w.getGround(cx, y))).toEqual([Block.WATER, Block.WATER, Block.WATER]);
    expect(w.getGround(x + 3, y)).not.toBe(Block.WATER); // terra firme não é inundada
    expect([...w.waterFlows()]).toHaveLength(0);
  });

  it('buraco tapado antes de encher desiste; buraco sem água vizinha não enche', () => {
    const w = new World(42);
    const [x, y] = shore(w);
    w.breakBlock(x, y);
    expect(w.placeBlock(x, y, Block.DIRT)).toBe(true); // tapa
    run(w, FLOW_SECONDS + 0.1);
    expect(w.getGround(x, y)).toBe(Block.DIRT);
    w.breakBlock(x + 3, y); // longe da água
    expect([...w.waterFlows()]).toHaveLength(0);
    run(w, 2);
    expect(w.getGround(x + 3, y)).toBe(Block.HOLE);
  });

  it('ao carregar um salvamento, buracos vizinhos de água voltam a encher', () => {
    const a = new World(42);
    const [x, y] = shore(a);
    a.breakBlock(x, y);
    const c = a.modifiedChunks().find((ch) => ch.cx === Math.floor(x / 16) && ch.cy === Math.floor(y / 16))!;
    const b = new World(42);
    b.restoreChunk(c.cx, c.cy, c.ground, c.levels);
    expect([...b.waterFlows()]).toHaveLength(0);
    b.settleWater();
    expect([...b.waterFlows()]).toHaveLength(1);
    run(b, FLOW_SECONDS + 0.1);
    expect(b.getGround(x, y)).toBe(Block.WATER);
  });
});
