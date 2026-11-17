import { describe, expect, it } from 'vitest';
import { Block, blockDef, FLOWER_BLOCKS } from './blocks';
import { WORLD_PROFILES } from './profiles';
import { RIO_CANAL, RIO_LAGO, rioPieceAt } from './rio';
import { landscapeFor, LANDSCAPE_HUT, LANDSCAPE_SEEDS } from './sanctuaryLandscape';
import { World } from './world';

const S = WORLD_PROFILES.santuario;
const SEED = 1835638650;
const MIN = -32, MAX = 31;

function build(seed = SEED): World {
  const w = new World(seed, S);
  for (let cx = -2; cx <= 1; cx++) for (let cy = -2; cy <= 1; cy++) w.loadChunk(cx, cy);
  return w;
}
const cells = function* (): Generator<[number, number]> {
  for (let y = MIN; y <= MAX; y++) for (let x = MIN; x <= MAX; x++) yield [x, y];
};
const inHut = (x: number, y: number): boolean => x >= LANDSCAPE_HUT.x && x < LANDSCAPE_HUT.x + LANDSCAPE_HUT.w && y >= LANDSCAPE_HUT.y && y < LANDSCAPE_HUT.y + LANDSCAPE_HUT.h;

describe('Paisagem fixa do Santuário (v0.93.148)', () => {
  it('só as seeds da lista têm paisagem; as outras seguem planas e vazias', () => {
    expect(LANDSCAPE_SEEDS.has(SEED)).toBe(true);
    expect(landscapeFor(7, Block.ISO_G_GRASS)).toBeNull();
    const flat = build(7);
    expect(flat.getLevel(5, 5, 0)).toBe(Block.ISO_STONE_BLOCK);
    expect(flat.getLevel(5, 5, 1)).toBe(Block.ISO_G_GRASS);
    expect(flat.getLevel(5, 5, 2)).toBe(Block.AIR);
  });

  it('é determinística (duas construções iguais) e a Deusa nasce numa clareira pisável', () => {
    const a = build(), b = build();
    for (const [x, y] of cells()) for (let l = 0; l < 5; l++) expect(a.getLevel(x, y, l)).toBe(b.getLevel(x, y, l));
    const [sx, sy] = a.findSpawn();
    expect(a.standHeight(sx, sy)).toBe(2);
    expect(a.getLevel(sx, sy, 2)).toBe(Block.AIR);
  });

  it('usa só blocos do Mundo (materiais, madeira, flores) e os já existentes no Santuário para água, árvore e arbustos', () => {
    const allowed = new Set<number>([
      Block.AIR, Block.GRASS, Block.DIRT, Block.SAND, Block.STONE, Block.STONE_COBBLE, Block.OAK_LOG, Block.OAK_PLANKS, Block.OAK_DOOR, Block.FENCE, Block.FENCE_GATE,
      RIO_CANAL, RIO_LAGO, Block.ISO_TREE, Block.ISO_BUSH_L, Block.ISO_BUSH_M, Block.ISO_BUSH_S, ...FLOWER_BLOCKS,
    ]);
    const w = build();
    const seen = new Set<number>();
    for (const [x, y] of cells()) for (let l = 0; l < 5; l++) {
      const id = w.getLevel(x, y, l);
      seen.add(id);
      expect(allowed.has(id), `id ${id} em ${x},${y},${l}`).toBe(true);
      if (id !== Block.AIR) expect(S.blocks).toContain(id);
    }
    for (const id of [Block.GRASS, Block.DIRT, Block.SAND, Block.STONE, Block.OAK_LOG, Block.OAK_PLANKS, Block.OAK_DOOR, Block.FENCE, RIO_CANAL, RIO_LAGO, Block.ISO_TREE]) expect(seen.has(id), `falta ${id}`).toBe(true);
    expect([...seen].some((id) => FLOWER_BLOCKS.includes(id))).toBe(true);
    expect([...seen].some((id) => id === Block.ISO_BUSH_L || id === Block.ISO_BUSH_M || id === Block.ISO_BUSH_S)).toBe(true);
  });

  it('relevo em até 3 alturas, com degraus de 1 (a Deusa sobe 1 cubo) fora da casa', () => {
    const w = build();
    for (const [x, y] of cells()) {
      if (inHut(x, y)) continue;
      const h = w.standHeight(x, y);
      if (h === null) continue; // árvore/arbusto sólido
      expect(h).toBeGreaterThanOrEqual(2);
      expect(h).toBeLessThanOrEqual(4); // colinas 3, passarelas 3, estacas do cais 4
      for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
        if (x + dx > MAX || y + dy > MAX || inHut(x + dx, y + dy)) continue;
        const o = w.standHeight(x + dx, y + dy);
        const post = w.getLevel(x, y, 3) === Block.OAK_LOG || w.getLevel(x + dx, y + dy, 3) === Block.OAK_LOG; // estaca do cais: obstáculo de propósito
        if (o !== null && !post) expect(Math.abs(o - h), `degrau em ${x},${y}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('objetos ficam em cima da pilha de cubos (nunca flutuando)', () => {
    const w = build();
    for (const [x, y] of cells()) {
      if (inHut(x, y)) continue;
      for (let l = 2; l < 5; l++) {
        const id = w.getLevel(x, y, l);
        if (id === Block.AIR || blockDef(id).shape === 'cube') continue;
        expect(blockDef(w.getLevel(x, y, l - 1)).shape, `objeto ${id} em ${x},${y},${l}`).toBe('cube');
      }
    }
  });

  it('rio ligado de uma nascente até o lago e lago grande: cada célula de canal é uma peça exata', () => {
    const w = build();
    let canal = 0, lago = 0;
    const get = (x: number, y: number, l: number): number => w.getLevel(x, y, l);
    for (const [x, y] of cells()) {
      const id = w.getLevel(x, y, 1);
      if (id === RIO_LAGO) lago++;
      if (id !== RIO_CANAL) continue;
      canal++;
      const sides = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => get(x + dx, y + dy, 1) === RIO_CANAL || get(x + dx, y + dy, 1) === RIO_LAGO);
      expect(sides.length, `canal isolado em ${x},${y}`).toBeGreaterThan(0);
      expect(['nascente_s', 'canal_ns', 'foz_lago'], `peça de ${x},${y}`).toContain(rioPieceAt((gx, gy, gl) => w.getLevel(gx, gy, gl), x, y, 1).key);
    }
    expect(canal).toBeGreaterThan(10);
    expect(lago).toBeGreaterThan(150);
  });

  it('casa de madeira: a porta abre e dá acesso ao interior sob o telhado', () => {
    const w = build();
    const dx = LANDSCAPE_HUT.x + 2, dy = LANDSCAPE_HUT.y + LANDSCAPE_HUT.h - 1;
    expect(w.isDoor(dx, dy)).toBe(true);
    expect(w.getLevel(dx - 1, dy, 2)).toBe(Block.OAK_PLANKS); // batentes
    expect(w.getLevel(dx + 1, dy, 2)).toBe(Block.OAK_PLANKS);
    expect(w.standHeight(dx, dy)).toBeNull(); // fechada
    expect(w.toggleDoor(dx, dy)).toBe(true);
    expect(w.standHeight(dx, dy)).toBe(2);
    expect(w.standHeight(dx, dy - 1)).toBe(2); // dentro da casa
    expect(w.getLevel(dx, dy - 1, 4)).toBe(Block.OAK_PLANKS); // telhado
  });
});
