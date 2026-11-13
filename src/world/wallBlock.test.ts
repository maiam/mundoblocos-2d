import { describe, expect, it } from 'vitest';
import { Block, blockDef, isWall, WALL_BLOCKS } from './blocks';
import { WORLD_PROFILES } from './profiles';
import { CAP_E, CAP_W } from './walls';
import { World } from './world';

/** Mundo principal com as paredes liberadas no perfil (elas ainda não estão em nenhum perfil: sem arte nem receita). */
function worldWithWalls(seed = 7): World {
  const p = WORLD_PROFILES.principal;
  return new World(seed, { ...p, blocks: [...p.blocks, ...WALL_BLOCKS] });
}

/** Uma célula livre e firme fora da cidade, e as vizinhas (x+1, x+2) também livres na mesma linha. */
function freeRun(w: World): [number, number] {
  const [gx, gy] = w.outsideGate();
  for (let dy = 3; dy < 40; dy++) {
    for (let dx = -10; dx < 10; dx++) {
      const x = gx + dx;
      const y = gy + dy;
      if ([0, 1, 2].every((i) => w.placementLevel(x + i, y, Block.WALL_PLANKS) === 0)) return [x, y];
    }
  }
  throw new Error('sem trecho livre');
}

describe('bloco parede (W2, ADR 0027)', () => {
  it('as paredes são blocos de forma wall, sólidos, de nível único', () => {
    for (const id of WALL_BLOCKS) {
      expect(isWall(id)).toBe(true);
      expect(blockDef(id).solid).toBe(true);
      expect(blockDef(id).layer).toBe('object');
    }
    expect(isWall(Block.OAK_PLANKS)).toBe(false);
    expect(blockDef(Block.WALL_PLANKS).organic).toBe('wood'); // o machado quebra
    expect(blockDef(Block.WALL_STONE).stone).toBe(true);
  });

  it('coloca no nível 0, bloqueia a passagem e não é degrau', () => {
    const w = worldWithWalls();
    const [x, y] = freeRun(w);
    expect(w.placeBlock(x, y, Block.WALL_PLANKS)).toBe(true);
    expect(w.getLevel(x, y, 0)).toBe(Block.WALL_PLANKS);
    expect(w.getLevel(x, y, 1)).toBe(Block.AIR);
    expect(w.isWallAt(x, y)).toBe(true);
    expect(w.standHeight(x, y)).toBeNull(); // não dá para pisar nem subir
  });

  it('não empilha: nada vai por cima da parede, e parede não vai por cima de cubo', () => {
    const w = worldWithWalls();
    const [x, y] = freeRun(w);
    w.placeBlock(x, y, Block.WALL_STONE);
    expect(w.placementLevel(x, y, Block.OAK_PLANKS)).toBeNull();
    expect(w.placementLevel(x, y, Block.WALL_PLANKS)).toBeNull();
    w.placeBlock(x + 1, y, Block.OAK_PLANKS);
    expect(w.placementLevel(x + 1, y, Block.WALL_PLANKS)).toBeNull();
  });

  it('a peça de autotile segue os vizinhos (materiais diferentes conectam)', () => {
    const w = worldWithWalls();
    const [x, y] = freeRun(w);
    w.placeBlock(x, y, Block.WALL_PLANKS);
    w.placeBlock(x + 1, y, Block.WALL_STONE);
    w.placeBlock(x + 2, y, Block.WALL_PLANKS);
    expect(w.wallPieceAt(x, y)?.front).toBe('left');
    expect(w.wallPieceAt(x + 1, y)).toEqual({ front: 'mid', cap: CAP_E | CAP_W, inner: 0 });
    expect(w.wallPieceAt(x + 2, y)?.front).toBe('right');
    expect(w.wallPieceAt(x + 5, y)).toBeNull(); // célula sem parede
  });

  it('quebrar devolve o bloco e a vizinha recalcula a peça', () => {
    const w = worldWithWalls();
    const [x, y] = freeRun(w);
    w.placeBlock(x, y, Block.WALL_PLANKS);
    w.placeBlock(x + 1, y, Block.WALL_PLANKS);
    expect(w.wallPieceAt(x, y)?.front).toBe('left');
    expect(w.breakBlock(x + 1, y)).toBe(Block.WALL_PLANKS);
    expect(w.wallPieceAt(x, y)).toEqual({ front: 'single', cap: 0, inner: 0 });
  });

  it('sobrevive a salvar e restaurar o chunk', () => {
    const a = worldWithWalls();
    const [x, y] = freeRun(a);
    a.placeBlock(x, y, Block.WALL_STONE);
    const b = worldWithWalls();
    for (const c of a.modifiedChunks()) b.restoreChunk(c.cx, c.cy, c.ground, c.levels);
    expect(b.getObject(x, y)).toBe(Block.WALL_STONE);
    expect(b.isWallAt(x, y)).toBe(true);
  });

  it('o mundo principal aceita paredes desde a W5 (v0.93.56)', () => {
    const w = new World(7);
    const [x, y] = w.outsideGate();
    expect(w.placeBlock(x + 3, y + 4, Block.WALL_PLANKS)).toBe(true);
    expect(w.isWallAt(x + 3, y + 4)).toBe(true);
    expect(w.breakBlock(x + 3, y + 4)).toBe(Block.WALL_PLANKS);
  });
});
