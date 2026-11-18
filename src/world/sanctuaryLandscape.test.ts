import { describe, expect, it } from 'vitest';
import { Block, blockDef, cropId, FLOWER_BLOCKS, ISO_TREE_IDS } from './blocks';
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
  it('a paisagem é única (v0.93.152): qualquer seed abre igual à 1835638650 (a seed só distingue os salvamentos)', () => {
    expect(LANDSCAPE_SEEDS.has(SEED)).toBe(true);
    expect(landscapeFor(7, Block.ISO_G_GRASS)).not.toBeNull();
    const a = build(SEED), b = build(7);
    for (const [x, y] of cells()) for (let l = 0; l < 5; l++) expect(b.getLevel(x, y, l)).toBe(a.getLevel(x, y, l));
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
      RIO_CANAL, RIO_LAGO, Block.ISO_TREE, ...ISO_TREE_IDS, Block.ISO_BUSH_L, Block.ISO_BUSH_M, Block.ISO_BUSH_S, ...FLOWER_BLOCKS,
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

describe('Fazenda do Santuário (heightmap, v0.93.152)', () => {
  const FX0 = 32, FY0 = -32; // a Fazenda ocupa as colunas 32..95 e as linhas -32..31 (mais 4 × 4 chunks a leste)
  const farm = (): World => {
    const w = new World(11, S);
    for (let cx = 2; cx <= 5; cx++) for (let cy = -2; cy <= 1; cy++) w.loadChunk(cx, cy);
    return w;
  };

  it('tem 376 células de água (pincel Lago) e a planície do pátio e das plantações no nível 2', () => {
    const w = farm();
    let water = 0;
    for (let r = 0; r < 64; r++) for (let c = 0; c < 64; c++) {
      for (let l = 0; l < 8; l++) if (w.getLevel(FX0 + c, FY0 + r, l) === RIO_LAGO) { water++; break; } // (sob as tábuas da ponte também conta)
    }
    expect(water).toBe(376);
    for (const [c, r] of [[0, 40], [10, 30], [25, 50], [63, 60]] as const) expect(w.stackHeight(FX0 + c, FY0 + r)).toBe(2);
  });

  it('os patamares do norte sobem até 7 e o jogador consegue subir: vizinhos secos diferem no máximo 1 nível', () => {
    const w = farm();
    let max = 0;
    for (let y = FY0; y < FY0 + 64; y++) for (let x = FX0; x < FX0 + 64; x++) {
      const h = w.stackHeight(x, y);
      max = Math.max(max, h);
      for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
        const nx = x + dx, ny = y + dy;
        if (nx >= FX0 + 64 || ny >= FY0 + 64) continue;
        const a = w.topBlock(x, y), b = w.topBlock(nx, ny);
        if (!a || !b || a.id === RIO_LAGO || b.id === RIO_LAGO || a.id === Block.OAK_PLANKS || b.id === Block.OAK_PLANKS) continue; // água e ponte à parte
        if (blockDef(a.id).solid || blockDef(b.id).solid) continue;
        expect(Math.abs(w.stackHeight(nx, ny) - h)).toBeLessThanOrEqual(1);
      }
    }
    expect(max).toBe(7);
  });

  it('plantações cercadas: Terra Arada com a cultura madura; o talhão preparado só com Terra Arada', () => {
    const w = farm();
    const A = { milho: [5, 35], horta: [5, 45], talhao: [5, 55] } as const;
    const at = (c: number, r: number) => [FX0 + c, FY0 + r] as const;
    const [mx, my] = at(...A.milho);
    expect(w.getLevel(mx, my, 1)).toBe(Block.TILLED);
    expect(w.surfaceObject(mx, my)).toBe(cropId('wheat', 15));
    const [tx, ty] = at(...A.talhao);
    expect(w.getLevel(tx, ty, 1)).toBe(Block.TILLED);
    expect(w.surfaceObject(tx, ty)).toBe(Block.AIR);
    const [hx, hy] = at(...A.horta);
    expect(w.getLevel(hx, hy, 1)).toBe(Block.TILLED);
  });

  it('é determinística e chunks fora dos limites continuam sem terreno', () => {
    const a = farm(), b = farm();
    for (let y = FY0; y < FY0 + 64; y += 3) for (let x = FX0; x < FX0 + 64; x += 3) for (let l = 0; l < 8; l++) expect(a.getLevel(x, y, l)).toBe(b.getLevel(x, y, l));
    expect(a.inBounds(160, 0)).toBe(false); // o Vale Goblin termina em x = 159
    expect(a.inBounds(159, 31)).toBe(true);
  });
});

