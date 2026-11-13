import { describe, expect, it } from 'vitest';
import { Block, CELESTIAL_BLOCKS, WALL_BLOCKS } from '../../world/blocks';
import pack from './santuario';

const APPROVED = [
  Block.CLOUD_SOLID, Block.CLOUD_ETHEREAL,
  Block.MARBLE_CELESTIAL, Block.MARBLE_ORNATE,
  Block.STONE_CELESTIAL, Block.STONE_GOLDEN,
] as const;

describe('Santuário oficial — seis texturas aprovadas', () => {
  it('associa cada ID 80–85 a uma imagem própria importada para o pacote oficial', () => {
    expect(APPROVED).toEqual([80, 81, 82, 83, 84, 85]);
    const urls = APPROVED.map(id => pack.celestialSurfaces?.[id]);
    expect(urls.every(u => typeof u === 'string' && u.length > 0)).toBe(true);
    expect(new Set(urls).size).toBe(6);
    for (const id of APPROVED) {
      expect(pack.celestialIcons[id]).toBe(pack.celestialSurfaces?.[id]);
    }
  });

  it('mantém os outros 12 blocos no atlas anterior, sem mudá-los', () => {
    const legacy = CELESTIAL_BLOCKS.filter(id => !APPROVED.includes(id as typeof APPROVED[number]));
    expect(legacy).toHaveLength(12);
    expect(pack.celestialAtlas).toBeTruthy();
    for (const id of legacy) {
      expect(pack.celestialSurfaces?.[id]).toBeUndefined();
      expect(pack.celestialIcons[id]).toBeTruthy();
    }
  });
});

describe('Santuário — ícones das paredes', () => {
  it('as duas paredes têm ícone de arte; a porta de parede segue provisória', () => {
    for (const id of WALL_BLOCKS) expect(pack.celestialIcons[id]).toBeTruthy();
    expect(pack.celestialIcons[Block.WALL_DOOR_PLANKS]).toBeUndefined();
  });
});
