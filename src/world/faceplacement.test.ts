import { describe, expect, it } from 'vitest';
import { Block } from './blocks';
import { WORLD_PROFILES } from './profiles';
import { World } from './world';

const S = WORLD_PROFILES.santuario;

describe('colocar na face (vista isométrica, ADR 0036)', () => {
  it('coloca no nível pedido sem cubo embaixo (bloco flutuante)', () => {
    const w = new World(1, S);
    const [x, y] = w.findSpawn();
    expect(w.placeBlockAt(x + 3, y, Block.STONE, 2)).toBe(true);
    expect(w.getLevel(x + 3, y, 2)).toBe(Block.STONE);
    expect(w.getLevel(x + 3, y, 1)).toBe(Block.AIR);
    expect(w.topBlock(x + 3, y)).toMatchObject({ id: Block.STONE, level: 2 });
  });

  it('o nível 0 segue as regras de sempre e o ocupado/além do limite é recusado', () => {
    const w = new World(1, S);
    const [x, y] = w.findSpawn();
    expect(w.placeBlockAt(x, y, Block.DIRT, 0)).toBe(true);
    expect(w.getObject(x, y)).toBe(Block.DIRT);
    expect(w.canPlaceAt(x, y, Block.DIRT, 0)).toBe(false); // nível 0 ocupado: o chão já tem cubo
    expect(w.placeBlockAt(x + 1, y, Block.STONE, 2)).toBe(true);
    expect(w.canPlaceAt(x + 1, y, Block.STONE, 2)).toBe(false); // ocupado
    expect(w.canPlaceAt(x + 1, y, Block.STONE, w.maxStack)).toBe(false); // além do limite
    expect(w.canPlaceAt(x + 1, y, Block.STONE, -1)).toBe(false);
  });

  it('só cubos do perfil, e nada fora dos limites', () => {
    const w = new World(1, S);
    const [x, y] = w.findSpawn();
    expect(w.canPlaceAt(x, y, Block.OAK_DOOR, 1)).toBe(false); // não é cubo
    expect(w.canPlaceAt(x, y, Block.MARBLE_ORNATE, 1)).toBe(false); // fora do perfil
    expect(w.canPlaceAt(10_000, 10_000, Block.STONE, 1)).toBe(false);
  });

  it('empilhar em cima continua preenchendo o vão e quebrar tira o de cima', () => {
    const w = new World(1, S);
    const [x, y] = w.findSpawn();
    w.placeBlock(x, y, Block.DIRT); // nível 0
    w.placeBlockAt(x, y, Block.STONE, 3); // flutuando (níveis 1 e 2 vazios)
    expect(w.stackHeight(x, y)).toBe(1); // a pilha contígua termina no nível 0
    expect(w.placeBlock(x, y, Block.SAND)).toBe(true); // empilha no vão (nível 1)
    expect(w.getLevel(x, y, 1)).toBe(Block.SAND);
    expect(w.breakBlock(x, y)).toBe(Block.STONE); // o topo real (nível 3) sai primeiro
  });
});
