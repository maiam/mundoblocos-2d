import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE } from '../config';
import { Block, blockDef, MATERIALS } from './blocks';
import { toChunk, toLocal } from './coords';
import { WorldGenerator } from './generator';
import { World } from './world';

const N = CHUNK_SIZE * CHUNK_SIZE;

describe('coords', () => {
  it('converte negativos corretamente', () => {
    expect(toChunk(-1)).toBe(-1);
    expect(toLocal(-1)).toBe(CHUNK_SIZE - 1);
    expect(toChunk(16)).toBe(1);
    expect(toLocal(16)).toBe(0);
    expect(toChunk(-16)).toBe(-1);
    expect(toLocal(-17)).toBe(15);
  });
});

describe('WorldGenerator', () => {
  it('é determinístico para a mesma seed', () => {
    const a = new WorldGenerator(1234);
    const b = new WorldGenerator(1234);
    for (const [cx, cy] of [[0, 0], [-3, 1], [7, -1], [-40, 4]]) {
      const ga = new Uint8Array(N), oa = new Uint8Array(N), ua = new Uint8Array(N);
      const gb = new Uint8Array(N), ob = new Uint8Array(N), ub = new Uint8Array(N);
      a.generateChunk(cx, cy, ga, oa, ua);
      b.generateChunk(cx, cy, gb, ob, ub);
      expect(Array.from(ua)).toEqual(Array.from(ub));
      expect(Array.from(ga)).toEqual(Array.from(gb));
      expect(Array.from(oa)).toEqual(Array.from(ob));
    }
  });

  it('seeds diferentes geram mundos diferentes', () => {
    const a = new WorldGenerator(1);
    const b = new WorldGenerator(2);
    let diff = 0;
    for (let x = 0; x < 200; x++) if (a.groundAt(x, x) !== b.groundAt(x, x) || a.objectAt(x, x) !== b.objectAt(x, x)) diff++;
    expect(diff).toBeGreaterThan(30);
  });

  it('chunk gerado bate com groundAt/objectAt (bordas contínuas)', () => {
    const g = new WorldGenerator(99);
    const ground = new Uint8Array(N);
    const objects = new Uint8Array(N);
    const upper = new Uint8Array(N);
    g.generateChunk(-2, 3, ground, objects, upper);
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        expect(ground[ly * CHUNK_SIZE + lx]).toBe(g.groundAt(-32 + lx, 48 + ly));
        expect(objects[ly * CHUNK_SIZE + lx]).toBe(g.objectAt(-32 + lx, 48 + ly));
        expect(upper[ly * CHUNK_SIZE + lx]).toBe(g.upperAt(-32 + lx, 48 + ly));
      }
    }
  });

  it('respeita camadas: chão no chão, objetos nos objetos, nada sobre água', () => {
    const g = new WorldGenerator(5);
    for (let y = -60; y < 60; y += 3) {
      for (let x = -60; x < 60; x += 3) {
        const ground = blockDef(g.groundAt(x, y));
        const obj = blockDef(g.objectAt(x, y));
        // Chão: água/buraco ou um material da prancha (mesmo id do cubo).
        expect(ground.layer === 'ground' || MATERIALS.includes(ground.id)).toBe(true);
        expect(obj.layer).toBe('object');
        if (ground.liquid) expect(obj.id).toBe(Block.AIR);
        // Nível 1 só existe sobre cubo.
        if (g.upperAt(x, y) !== Block.AIR) expect(obj.shape).toBe('cube');
      }
    }
  });

  it('mundo da Cidade 1: só florestas (campos e sakura), água e árvores — sem deserto', () => {
    const g = new WorldGenerator(42);
    const biomes = new Set<string>();
    let water = 0, trees = 0;
    for (let y = -6000; y < 6000; y += 60) {
      for (let x = -6000; x < 6000; x += 60) {
        biomes.add(g.biomeAt(x, y).key);
        if (blockDef(g.groundAt(x, y)).liquid) water++;
        if (blockDef(g.objectAt(x, y)).shape === 'tree') trees++;
      }
    }
    expect([...biomes].sort()).toEqual(['meadow', 'sakura']);
    expect(water).toBeGreaterThan(0);
    expect(trees).toBeGreaterThan(0);
  });
});

describe('World', () => {
  it('spawn é andável e cercado de células andáveis', () => {
    for (const seed of [1, 7, 42, 2024]) {
      const w = new World(seed);
      const [x, y] = w.findSpawn();
      expect(w.isWalkable(x, y)).toBe(true);
      expect(w.isWalkable(x + 1, y) && w.isWalkable(x, y + 1)).toBe(true);
    }
  });

  it('coloca e quebra objetos, marcando o chunk como modificado', () => {
    const w = new World(7);
    const [x, y] = w.outsideGate();
    expect(w.placeBlock(x, y, Block.OAK_LOG)).toBe(true);
    expect(w.getObject(x, y)).toBe(Block.OAK_LOG);
    expect(w.isWalkable(x, y)).toBe(false);
    expect(w.getChunk(toChunk(x), toChunk(y))!.modified).toBe(true);
    expect(w.placeBlock(x, y, Block.FLOWER)).toBe(false);
    expect(w.breakBlock(x, y)).toBe(Block.OAK_LOG);
    expect(w.isWalkable(x, y)).toBe(true);
  });

  it('ignora nível 3 de chunks de um salvamento antigo sem perder os dois primeiros', () => {
    const w = new World(7);
    const [x,y] = w.outsideGate();
    const size = CHUNK_SIZE * CHUNK_SIZE;
    const index = toLocal(y) * CHUNK_SIZE + toLocal(x);
    const layers = [new Uint8Array(size),new Uint8Array(size),new Uint8Array(size)];
    layers.forEach(layer=>{layer[index] = Block.STONE_BRICK;});
    const ground = new Uint8Array(size).fill(Block.GRASS);
    w.restoreChunk(toChunk(x),toChunk(y),ground,layers);
    expect(w.getObject(x,y)).toBe(Block.STONE_BRICK);
    expect(w.getLevel(x,y,1)).toBe(Block.STONE_BRICK);
    expect(w.getLevel(x,y,2)).toBe(Block.AIR);
    expect(w.stackHeight(x,y)).toBe(2);
    expect(w.topBlock(x,y)).toEqual({id:Block.STONE_BRICK,level:1});
  });

  it('empilha no máximo 2 cubos e quebra de cima para baixo', () => {
    const w = new World(7);
    const [x, y] = w.outsideGate();
    expect(w.placeBlock(x, y, Block.STONE)).toBe(true);
    expect(w.placeBlock(x, y, Block.OAK_LOG)).toBe(true);
    expect(w.placeBlock(x, y, Block.SAND)).toBe(false);
    expect(w.stackHeight(x, y)).toBe(2);
    expect(w.standHeight(x, y)).toBe(2);
    expect(w.topBlock(x, y)).toEqual({ id: Block.OAK_LOG, level: 1 });
    expect(w.getLevel(x, y, 2)).toBe(Block.AIR);
    expect(w.placeBlock(x, y, Block.OAK_PLANKS)).toBe(false);
    expect(w.breakBlock(x, y)).toBe(Block.OAK_LOG);
    expect(w.stackHeight(x, y)).toBe(1);
    expect(w.breakBlock(x, y)).toBe(Block.STONE);
    expect(w.standHeight(x, y)).toBe(0);
  });

  it('enfeites só no chão e nada empilha sobre enfeite/árvore', () => {
    const w = new World(7);
    const [x, y] = w.outsideGate();
    expect(w.placeBlock(x, y, Block.STONE)).toBe(true);
    expect(w.placeBlock(x, y, Block.FLOWER)).toBe(false); // enfeite não é bloco de construção
    w.breakBlock(x, y);
    w.setObject(x, y, Block.FLOWER); // flor natural
    expect(w.placeBlock(x, y, Block.STONE)).toBe(true); // substitui o enfeite no nível 0
    expect(w.stackHeight(x, y)).toBe(1);
    w.setObject(x + 1, y, Block.OAK_TREE);
    expect(w.placeBlock(x + 1, y, Block.STONE)).toBe(false);
    expect(w.standHeight(x + 1, y)).toBeNull();
  });

  it('quebrar célula vazia cava o chão; buraco só aceita cubo, que vira piso', () => {
    const w = new World(7);
    const [x, y] = w.outsideGate();
    while (w.topBlock(x, y)) w.breakBlock(x, y); // tira enfeite, se houver
    const original = w.getGround(x, y);
    expect(w.breakTarget(x, y)).toBe('ground');
    expect(w.breakBlock(x, y)).toBe(original);
    expect(w.getGround(x, y)).toBe(Block.HOLE);
    expect(w.standHeight(x, y)).toBeNull(); // ninguém pisa no buraco
    expect(w.canBreak(x, y)).toBe(false);
    expect(w.placeBlock(x, y, Block.FLOWER)).toBe(false); // só blocos novos
    expect(w.placementLevel(x, y, Block.STONE)).toBe('ground');
    expect(w.placeBlock(x, y, Block.STONE)).toBe(true);
    expect(w.getGround(x, y)).toBe(Block.STONE);
    expect(w.getObject(x, y)).toBe(Block.AIR);
    expect(w.standHeight(x, y)).toBe(0); // piso nivelado
    expect(w.placeBlock(x, y, Block.OAK_LOG)).toBe(true); // e aceita cubo por cima
    expect(w.stackHeight(x, y)).toBe(1);
    w.breakBlock(x, y);
    expect(w.breakBlock(x, y)).toBe(Block.STONE); // quebrar o piso reabre o buraco
    expect(w.getGround(x, y)).toBe(Block.HOLE);
  });

  it('não cava o chão sob um objeto nem quebra água', () => {
    const w = new World(42);
    const [x, y] = w.outsideGate();
    while (w.topBlock(x, y)) w.breakBlock(x, y);
    w.placeBlock(x, y, Block.STONE);
    expect(w.breakTarget(x, y)).toBe('object');
    let found = false, wx = 0, wy = 0;
    for (let i = 0; i < 4000 && !found; i++) {
      wx = (i % 200) - 100; wy = Math.floor(i / 200) * 7 - 70;
      found = blockDef(w.getGround(wx, wy)).liquid;
    }
    expect(found).toBe(true);
    expect(w.canBreak(wx, wy)).toBe(false);
  });

  it('sobre água só Terra/Pedra/Tora (substituem); nada de itens não colocáveis', () => {
    const w = new World(42);
    let wx = 0, wy = 0, found = false;
    for (let i = 0; i < 4000 && !found; i++) {
      wx = (i % 200) - 100; wy = Math.floor(i / 200) * 7 - 70;
      found = blockDef(w.getGround(wx, wy)).liquid;
    }
    expect(found).toBe(true);
    expect(w.isWalkable(wx, wy)).toBe(false);
    expect(w.placeBlock(wx, wy, Block.SAND)).toBe(false); // areia não substitui água (ver water.test.ts)
    const [sx, sy] = w.outsideGate();
    expect(w.placeBlock(sx, sy, Block.OAK_TREE)).toBe(false);
  });

  it('chunks modificados não são descarregados', () => {
    const w = new World(3);
    w.loadChunk(0, 0);
    w.loadChunk(50, 0);
    w.setObject(50 * CHUNK_SIZE, 0, Block.OAK_LOG);
    w.loadChunk(60, 0);
    const removed = w.unloadFar({ cx0: 0, cy0: 0, cx1: 0, cy1: 0 });
    expect(removed).toContain('60,0');
    expect(removed).not.toContain('50,0');
  });

  it('ensureChunks respeita o orçamento por frame', () => {
    const w = new World(3);
    const rect = { cx0: -2, cy0: -2, cx1: 2, cy1: 2 };
    expect(w.ensureChunks(rect, 4)).toBe(4);
    while (w.ensureChunks(rect, 4) > 0);
    expect(w.loadedCount).toBe(25);
  });
});
