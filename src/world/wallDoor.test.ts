import { describe, expect, it } from 'vitest';
import { Block, blockDef, isOpen, isOpenable, isWallDoor, isWallLike, toggled, WALL_DOOR_BLOCKS, WALL_BLOCKS } from './blocks';
import { WORLD_PROFILES } from './profiles';
import { CAP_E, CAP_W } from './walls';
import { applyAction } from './actions';
import { World } from './world';

function worldWithWalls(seed = 7): World {
  const p = WORLD_PROFILES.principal;
  return new World(seed, { ...p, blocks: [...p.blocks, ...WALL_BLOCKS, ...WALL_DOOR_BLOCKS] });
}

/** Trecho livre de 5 × 3 células fora da cidade (linha de baixo livre para a frente). */
function freeArea(w: World): [number, number] {
  const [gx, gy] = w.outsideGate();
  for (let dy = 4; dy < 60; dy++) for (let dx = -12; dx < 12; dx++) {
    const x = gx + dx, y = gy + dy;
    let ok = true;
    for (let j = -1; j <= 1 && ok; j++) for (let i = 0; i < 5 && ok; i++) ok = w.placementLevel(x + i, y + j, Block.WALL_PLANKS) === 0;
    if (ok) return [x, y];
  }
  throw new Error('sem área livre');
}

describe('porta de parede (ADR 0027)', () => {
  it('blocos: forma wall-door, fechada sólida e aberta passável; conta como parede para o autotile', () => {
    expect(isWallDoor(Block.WALL_DOOR_PLANKS)).toBe(true);
    expect(isWallDoor(Block.WALL_PLANKS)).toBe(false);
    expect(blockDef(Block.WALL_DOOR_PLANKS).solid).toBe(true);
    expect(blockDef(Block.WALL_DOOR_PLANKS_OPEN).solid).toBe(false);
    expect(blockDef(Block.WALL_DOOR_PLANKS_OPEN).placeable).toBe(false); // a hotbar coloca a fechada
    expect(isWallLike(Block.WALL_DOOR_PLANKS)).toBe(true);
    expect(isWallLike(Block.OAK_DOOR)).toBe(false); // a porta de cubos antiga segue à parte
  });

  it('abre e fecha pelo mesmo mecanismo da porta comum', () => {
    expect(isOpenable(Block.WALL_DOOR_PLANKS)).toBe(true);
    expect(toggled(Block.WALL_DOOR_PLANKS)).toBe(Block.WALL_DOOR_PLANKS_OPEN);
    expect(toggled(Block.WALL_DOOR_PLANKS_OPEN)).toBe(Block.WALL_DOOR_PLANKS);
    expect(isOpen(Block.WALL_DOOR_PLANKS_OPEN)).toBe(true);
    expect(isOpen(Block.WALL_DOOR_PLANKS)).toBe(false);
  });

  it('só se coloca entre duas paredes, na fileira, sem parede ao norte nem ao sul', () => {
    const w = worldWithWalls();
    const [x, y] = freeArea(w);
    expect(w.placementLevel(x + 1, y, Block.WALL_DOOR_PLANKS)).toBeNull();        // sem paredes ao lado
    w.placeBlock(x, y, Block.WALL_PLANKS);
    expect(w.placementLevel(x + 1, y, Block.WALL_DOOR_PLANKS)).toBeNull();        // só um lado
    w.placeBlock(x + 2, y, Block.WALL_PLANKS);
    expect(w.placementLevel(x + 1, y, Block.WALL_DOOR_PLANKS)).toBe(0);           // entre duas: ok
    w.placeBlock(x + 1, y - 1, Block.WALL_PLANKS);                                // parede ao norte
    expect(w.placementLevel(x + 1, y, Block.WALL_DOOR_PLANKS)).toBeNull();
    w.breakBlock(x + 1, y - 1);
    w.placeBlock(x + 1, y + 1, Block.WALL_PLANKS);                                // parede ao sul
    expect(w.placementLevel(x + 1, y, Block.WALL_DOOR_PLANKS)).toBeNull();
  });

  it('uma porta não serve de batente de outra porta (nada de portas coladas)', () => {
    const w = worldWithWalls();
    const [x, y] = freeArea(w);
    for (const dx of [0, 2, 4]) w.placeBlock(x + dx, y, Block.WALL_PLANKS);
    expect(w.placeBlock(x + 1, y, Block.WALL_DOOR_PLANKS)).toBe(true);
    expect(w.placementLevel(x + 3, y, Block.WALL_DOOR_PLANKS)).toBe(0);           // outra, com parede comum de cada lado
    w.placeBlock(x + 3, y, Block.WALL_DOOR_PLANKS);
    w.breakBlock(x + 2, y);                                                       // sem a parede do meio, a porta não tem batente
    expect(w.placementLevel(x + 2, y, Block.WALL_DOOR_PLANKS)).toBeNull();
  });

  it('fechada bloqueia; aberta deixa passar; o autotile trata a porta como parede (a tampa continua)', () => {
    const w = worldWithWalls();
    const [x, y] = freeArea(w);
    for (const dx of [0, 2]) w.placeBlock(x + dx, y, Block.WALL_PLANKS);
    w.placeBlock(x + 1, y, Block.WALL_DOOR_PLANKS);
    expect(w.standHeight(x + 1, y)).toBeNull();
    expect(w.wallPieceAt(x + 1, y)).toEqual({ front: 'mid', cap: CAP_E | CAP_W, inner: 0 });
    expect(w.wallPieceAt(x, y)?.front).toBe('left'); // a parede da ponta enxerga a porta como parede
    expect(w.toggleDoor(x + 1, y)).toBe(true);
    expect(w.getObject(x + 1, y)).toBe(Block.WALL_DOOR_PLANKS_OPEN);
    expect(w.standHeight(x + 1, y)).toBe(0);
    expect(w.isWallAt(x + 1, y)).toBe(true);        // aberta, a verga (tampa) continua
    expect(w.toggleDoor(x + 1, y)).toBe(true);
    expect(w.standHeight(x + 1, y)).toBeNull();
  });

  it('a ação de rede (door) funciona e a porta sobrevive a salvar/restaurar', () => {
    const a = worldWithWalls();
    const [x, y] = freeArea(a);
    for (const dx of [0, 2]) a.placeBlock(x + dx, y, Block.WALL_PLANKS);
    a.placeBlock(x + 1, y, Block.WALL_DOOR_PLANKS);
    expect(applyAction(a, { kind: 'door', x: x + 1, y })).toBe(true);
    expect(a.getObject(x + 1, y)).toBe(Block.WALL_DOOR_PLANKS_OPEN);
    const b = worldWithWalls();
    for (const c of a.modifiedChunks()) b.restoreChunk(c.cx, c.cy, c.ground, c.levels);
    expect(b.getObject(x + 1, y)).toBe(Block.WALL_DOOR_PLANKS_OPEN);
  });

  it('quebrar a porta devolve o bloco (a fechada) e a vizinha recalcula', () => {
    const w = worldWithWalls();
    const [x, y] = freeArea(w);
    for (const dx of [0, 2]) w.placeBlock(x + dx, y, Block.WALL_PLANKS);
    w.placeBlock(x + 1, y, Block.WALL_DOOR_PLANKS);
    expect(w.breakBlock(x + 1, y)).toBe(Block.WALL_DOOR_PLANKS);
    expect(w.wallPieceAt(x, y)).toEqual({ front: 'single', cap: 0, inner: 0 });
  });
});
