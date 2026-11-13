import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE } from '../config';
import { fromB64, toB64 } from '../net/b64';
import { Block } from './blocks';
import {
  rescaleCell, rescaleCellKey, rescaleChunk, rescaleChunkRecords, rescaleExplored, rescaleFactor, rescaleHoles, repeatsWhenRescaled, rescaleXY,
} from './subdiv';

const N = CHUNK_SIZE * CHUNK_SIZE;
const at = (lx: number, ly: number): number => ly * CHUNK_SIZE + lx;

function sample(cx = 0, cy = 0) {
  const ground = new Uint8Array(N).fill(Block.GRASS);
  const l0 = new Uint8Array(N);
  const l1 = new Uint8Array(N);
  ground[at(1, 1)] = Block.DIRT;
  l0[at(2, 3)] = Block.STONE; // cubo (contínuo)
  l1[at(2, 3)] = Block.STONE; // 2º nível
  l0[at(5, 5)] = Block.CHEST; // objeto único
  l0[at(7, 2)] = Block.OAK_TREE; // árvore: única
  l0[at(9, 9)] = Block.OAK_DOOR; // porta: contínua
  l0[at(10, 4)] = Block.FENCE; // cerca: contínua
  return { cx, cy, ground, levels: [l0, l1] };
}

/** Procura num conjunto de chunks a célula global (gx, gy). */
function cell(chunks: ReturnType<typeof rescaleChunk>, gx: number, gy: number, level: number): number {
  const cx = Math.floor(gx / CHUNK_SIZE), cy = Math.floor(gy / CHUNK_SIZE);
  const c = chunks.find((k) => k.cx === cx && k.cy === cy)!;
  return c.levels[level][(gy - cy * CHUNK_SIZE) * CHUNK_SIZE + (gx - cx * CHUNK_SIZE)];
}

describe('Migração da grade fina (ADR 0032, F6): world/subdiv', () => {
  it('fator: inteiro e só para aumentar; 1 → 1 não muda nada', () => {
    expect(rescaleFactor(1, 2)).toBe(2);
    expect(rescaleFactor(2, 2)).toBe(1);
    expect(() => rescaleFactor(2, 1)).toThrow();
    expect(() => rescaleFactor(2, 3)).toThrow();
    const c = sample();
    expect(rescaleChunk(c, 1)).toEqual([c]);
  });

  it('contínuos repetem (cubos, portas, cercas, ar); soltos ficam num canto só', () => {
    expect(repeatsWhenRescaled(Block.AIR)).toBe(true);
    for (const id of [Block.STONE, Block.OAK_DOOR, Block.FENCE, Block.WALL_PLANKS, Block.WALL_DOOR_PLANKS, Block.WHEAT_0]) expect(repeatsWhenRescaled(id)).toBe(true);
    for (const id of [Block.CHEST, Block.OAK_TREE, Block.CAMPFIRE, Block.FLOWER, Block.CHAIR]) expect(repeatsWhenRescaled(id)).toBe(false);
  });

  it('um chunk antigo vira 4 chunks novos com 32 × 32 células cobrindo a mesma área', () => {
    const out = rescaleChunk(sample(1, -2), 2);
    expect(out.map((c) => `${c.cx},${c.cy}`).sort()).toEqual(['2,-3', '2,-4', '3,-3', '3,-4']);
    for (const c of out) { expect(c.ground).toHaveLength(N); expect(c.levels).toHaveLength(2); }
  });

  it('chão e cubos (dois níveis) repetem nas 4 células; o baú e a árvore ficam só na do canto inferior esquerdo', () => {
    const out = rescaleChunk(sample(), 2);
    // célula antiga (1,1) de terra → novas (2..3, 2..3)
    for (const [x, y] of [[2, 2], [3, 2], [2, 3], [3, 3]]) expect(out.find((c) => c.cx === 0 && c.cy === 0)!.ground[at(x, y)]).toBe(Block.DIRT);
    // cubo em (2,3) → novas (4..5, 6..7), nos dois níveis
    for (const [x, y] of [[4, 6], [5, 6], [4, 7], [5, 7]]) for (const k of [0, 1]) expect(cell(out, x, y, k)).toBe(Block.STONE);
    // baú em (5,5) → só a nova (10, 11) (x*2, y*2+1)
    const chest = [[10, 10], [11, 10], [10, 11], [11, 11]].map(([x, y]) => cell(out, x, y, 0));
    expect(chest).toEqual([Block.AIR, Block.AIR, Block.CHEST, Block.AIR]);
    // árvore em (7,2) → só a nova (14, 5)
    expect(cell(out, 14, 5, 0)).toBe(Block.OAK_TREE);
    expect(cell(out, 14, 4, 0) + cell(out, 15, 4, 0) + cell(out, 15, 5, 0)).toBe(0);
    // porta (9,9) e cerca (10,4) repetem
    for (const [x, y] of [[18, 18], [19, 18], [18, 19], [19, 19]]) expect(cell(out, x, y, 0)).toBe(Block.OAK_DOOR);
    for (const [x, y] of [[20, 8], [21, 8], [20, 9], [21, 9]]) expect(cell(out, x, y, 0)).toBe(Block.FENCE);
  });

  it('a contagem de objetos únicos se conserva (nada some nem se multiplica)', () => {
    const c = sample();
    const count = (chunks: ReturnType<typeof rescaleChunk>, id: number) => chunks.reduce((n, k) => n + k.levels[0].filter((v) => v === id).length, 0);
    const out = rescaleChunk(c, 2);
    expect(count(out, Block.CHEST)).toBe(1);
    expect(count(out, Block.OAK_TREE)).toBe(1);
    expect(count(out, Block.STONE)).toBe(4);
  });

  it('em base64 (salvamento e arquivo da sala) dá o mesmo resultado', () => {
    const c = sample(2, 3);
    const rec = [{ cx: c.cx, cy: c.cy, ground: toB64(c.ground), levels: c.levels.map(toB64) }];
    const viaText = rescaleChunkRecords(rec, 2).map((r) => ({ cx: r.cx, cy: r.cy, ground: fromB64(r.ground), levels: r.levels.map(fromB64) }));
    const direct = rescaleChunk(c, 2);
    expect(viaText).toHaveLength(direct.length);
    for (const d of direct) {
      const v = viaText.find((x) => x.cx === d.cx && x.cy === d.cy)!;
      expect([...v.ground]).toEqual([...d.ground]);
      d.levels.forEach((l, i) => expect([...v.levels[i]]).toEqual([...l]));
    }
  });

  it('pontos: contínuos × f; células únicas vão para o canto inferior esquerdo; buracos viram f × f', () => {
    expect(rescaleXY(3.5, -2.25, 2)).toEqual([7, -4.5]);
    expect(rescaleCell(3, -2, 2)).toEqual([6, -3]);
    expect(rescaleCellKey('3,-2', 2)).toBe('6,-3');
    const holes = rescaleHoles([[1, 1, 30]], 2);
    expect(holes).toHaveLength(4);
    expect(holes).toContainEqual([2, 2, 30]);
    expect(holes).toContainEqual([3, 3, 30]);
  });

  it('a névoa do minimapa: cada célula descoberta vira 4', () => {
    const bits = new Uint8Array(N / 8);
    const set = (lx: number, ly: number) => { const i = at(lx, ly); bits[i >> 3] |= 1 << (i & 7); };
    set(0, 0); set(15, 15);
    const out = rescaleExplored([{ cx: 0, cy: 0, bits: toB64(bits) }], 2);
    const total = out.reduce((n, c) => n + [...fromB64(c.bits)].reduce((m, b) => m + b.toString(2).replace(/0/g, '').length, 0), 0);
    expect(total).toBe(8); // 2 células × 4
    expect(out.map((c) => `${c.cx},${c.cy}`).sort()).toEqual(['0,0', '1,1']);
  });
});
