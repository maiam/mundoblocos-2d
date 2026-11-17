import { describe, expect, it } from 'vitest';
import { Block } from './blocks';
import { WORLD_PROFILES } from './profiles';
import { World } from './world';

const S = { ...WORLD_PROFILES.santuario, terrain: { kind: 'flat' as const, ground: Block.ISO_G_GRASS } }; // sem as camadas de terreno: os níveis contam do chão

describe('colocar na face (vista isométrica, ADR 0036)', () => {
  it('coloca no nível pedido sem cubo embaixo (bloco flutuante)', () => {
    const w = new World(1, S);
    const [x, y] = w.findSpawn();
    expect(w.placeBlockAt(x + 3, y, Block.ISO_G_STONE, 2)).toBe(true);
    expect(w.getLevel(x + 3, y, 2)).toBe(Block.ISO_G_STONE);
    expect(w.getLevel(x + 3, y, 1)).toBe(Block.AIR);
    expect(w.topBlock(x + 3, y)).toMatchObject({ id: Block.ISO_G_STONE, level: 2 });
  });

  it('o nível 0 segue as regras de sempre e o ocupado/além do limite é recusado', () => {
    const w = new World(1, S);
    const [x, y] = w.findSpawn();
    expect(w.placeBlockAt(x, y, Block.ISO_G_DIRT, 0)).toBe(true);
    expect(w.getObject(x, y)).toBe(Block.ISO_G_DIRT);
    expect(w.canPlaceAt(x, y, Block.ISO_G_DIRT, 0)).toBe(false); // nível 0 ocupado: o chão já tem cubo
    expect(w.placeBlockAt(x + 1, y, Block.ISO_G_STONE, 2)).toBe(true);
    expect(w.canPlaceAt(x + 1, y, Block.ISO_G_STONE, 2)).toBe(false); // ocupado
    expect(w.canPlaceAt(x + 1, y, Block.ISO_G_STONE, w.maxStack)).toBe(false); // além do limite
    expect(w.canPlaceAt(x + 1, y, Block.ISO_G_STONE, -1)).toBe(false);
  });

  it('só cubos do perfil, e nada fora dos limites', () => {
    const w = new World(1, S);
    const [x, y] = w.findSpawn();
    expect(w.canPlaceAt(x, y, Block.OAK_DOOR, 1)).toBe(false); // não é cubo
    expect(w.canPlaceAt(x, y, Block.WALL_STONE, 1)).toBe(false); // fora do perfil
    expect(w.canPlaceAt(10_000, 10_000, Block.ISO_G_STONE, 1)).toBe(false);
  });

  it('empilhar em cima continua preenchendo o vão e quebrar tira o de cima', () => {
    const w = new World(1, S);
    const [x, y] = w.findSpawn();
    w.placeBlock(x, y, Block.ISO_G_DIRT); // nível 0
    w.placeBlockAt(x, y, Block.ISO_G_STONE, 3); // flutuando (níveis 1 e 2 vazios)
    expect(w.stackHeight(x, y)).toBe(1); // a pilha contígua termina no nível 0
    expect(w.placeBlock(x, y, Block.ISO_G_GRASS)).toBe(true); // empilha no vão (nível 1)
    expect(w.getLevel(x, y, 1)).toBe(Block.ISO_G_GRASS);
    expect(w.breakBlock(x, y)).toBe(Block.ISO_G_STONE); // o topo real (nível 3) sai primeiro
  });
});

describe('conjunto isométrico — objetos grandes e enfeites (ADR 0036)', () => {
  it('a Casa de Feira ocupa 12 × 12, bloqueia e cai inteira ao quebrar qualquer parte', () => {
    const w = new World(1, S);
    const [x, y] = [-20, 20];
    expect(w.placeBlock(x, y, Block.ISO_HOUSE)).toBe(true);
    for (const [dx, dy] of [[0, 0], [5, 5], [11, 11], [11, 0], [0, 11]]) {
      expect(w.getObject(x + dx, y - dy)).toBe(dx === 0 && dy === 0 ? Block.ISO_HOUSE : Block.ISO_HOUSE_PART);
      expect(w.standHeight(x + dx, y - dy)).toBeNull(); // sólida
    }
    expect(w.bigAnchor(Block.ISO_HOUSE, x + 11, y - 11)).toEqual([x, y]);
    expect(w.canPlace(x + 4, y - 4, Block.ISO_HOUSE)).toBe(false); // não sobrepõe
    expect(w.breakBlock(x + 7, y - 3)).toBe(Block.ISO_HOUSE);
    for (let dx = 0; dx < 12; dx++) for (let dy = 0; dy < 12; dy++) expect(w.getObject(x + dx, y - dy)).toBe(Block.AIR);
  });

  it('a Barraca ocupa 3 × 3 e cai inteira; a árvore ocupa só a célula do tronco', () => {
    const w = new World(1, S);
    expect(w.placeBlock(0, 0, Block.ISO_STALL)).toBe(true);
    expect(w.getObject(2, -2)).toBe(Block.ISO_STALL_PART);
    expect(w.breakBlock(1, -1)).toBe(Block.ISO_STALL);
    expect(w.getObject(0, 0)).toBe(Block.AIR);
    expect(w.footprint(Block.ISO_TREE, 4, 4)).toEqual([[4, 4]]);
    expect(w.footprintAnchors(Block.ISO_STALL, 5, 5)).toHaveLength(9);
    expect(w.footprintAnchors(Block.ISO_HOUSE, 5, 5)).toHaveLength(144);
  });

  it('a casa só entra com as 144 células livres e dentro dos limites', () => {
    const w = new World(1, S);
    w.placeBlock(0, 0, Block.ISO_BARREL);
    expect(w.canPlace(-3, 5, Block.ISO_HOUSE)).toBe(false); // cobriria o barril
    expect(w.canPlace(-30, 30, Block.ISO_HOUSE)).toBe(true);
    expect(w.canPlace(25, 0, Block.ISO_HOUSE)).toBe(false); // sairia pelo limite leste (x até 36 > 31)
  });

  it('enfeites (capim, flores, pedrinhas) deixam andar por cima; árvore e barril bloqueiam', () => {
    const w = new World(1, S);
    w.placeBlock(3, 3, Block.ISO_DAISIES);
    w.placeBlock(4, 3, Block.ISO_TREE);
    expect(w.standHeight(3, 3)).toBe(0);
    expect(w.standHeight(4, 3)).toBeNull();
    expect(w.canPlace(3, 3, Block.ISO_BARREL)).toBe(true); // o enfeite é substituído
  });
});
