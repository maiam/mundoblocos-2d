import { describe, expect, it } from 'vitest';
import { Block } from '../world/blocks';
import { World } from '../world/world';
import { WORLD_PROFILES } from '../world/profiles';
import { constructionLabPlan, labWireframePositions, resetAndBuildLab } from './constructionLab';

describe('Laboratório de Construção 3D', () => {
  it('gera layout estável com pilhas 1–3, parede, 5×5 e 10×10', () => {
    const a = constructionLabPlan(-44, -12);
    const b = constructionLabPlan(-44, -12);
    expect(a).toEqual(b);
    expect(a).toHaveLength(136);
    expect(a.reduce((sum, cell) => sum + cell.height, 0)).toBe(172);
    expect(a.filter((cell) => cell.section === 'pilhas').map((cell) => cell.height)).toEqual([1, 2, 3]);
    expect(a.filter((cell) => cell.section === 'parede')).toHaveLength(8);
    expect(a.filter((cell) => cell.section === 'plataforma5')).toHaveLength(25);
    expect(a.filter((cell) => cell.section === 'plataforma10')).toHaveLength(100);
    const keys = new Set(a.map((cell) => cell.x + ',' + cell.y));
    expect(keys.size).toBe(a.length);
    expect(keys.has('-40,-7')).toBe(false); // Porta da parede
  });

  it('edita apenas os níveis de objetos e pode recriar o laboratório após remover blocos', () => {
    const world = new World(123, WORLD_PROFILES.santuario);
    const cells = constructionLabPlan(-44, -12);
    const beforeGround = world.getGround(-44, -12);
    const first = resetAndBuildLab(world, cells, Block.CLOUD_SOLID);
    expect(first.failed).toBe(0);
    expect(first.placed).toBe(172);
    expect(world.stackHeight(-43, -11)).toBe(1);
    expect(world.stackHeight(-40, -11)).toBe(2);
    expect(world.stackHeight(-37, -11)).toBe(3);
    expect(world.getGround(-44, -12)).toBe(beforeGround);
    expect(labWireframePositions(world, cells).length).toBe(172 * 12 * 2 * 3);
    expect(world.breakBlock(-37, -11)).toBe(Block.CLOUD_SOLID);
    expect(world.stackHeight(-37, -11)).toBe(2);
    const second = resetAndBuildLab(world, cells, Block.CLOUD_SOLID);
    expect(second.failed).toBe(0);
    expect(world.stackHeight(-37, -11)).toBe(3);
  });
});
