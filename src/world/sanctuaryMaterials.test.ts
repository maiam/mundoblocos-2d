import { describe, expect, it } from 'vitest';
import { Block } from './blocks';
import { WORLD_PROFILES } from './profiles';
import { V2_BLOCKS } from '../render/materialsV2';
import { CAMERA_OPTION_2 } from '../render/sanctuaryCameraJoystick';

describe('Santuário — comparação de câmera e materiais', () => {
  it('mantém Água Cristalina e disponibiliza Terra e Terra Arada sem IDs duplicados', () => {
    const blocks = WORLD_PROFILES.santuario.blocks;
    expect(blocks).toContain(Block.WATER_CRYSTAL);
    expect(blocks).toContain(Block.DIRT);
    expect(blocks).toContain(Block.TILLED);
    expect(blocks.length).toBe(new Set(blocks).size);
  });

  it('a Terra Arada tem topo próprio e laterais de terra', () => {
    expect(V2_BLOCKS[Block.DIRT]).toMatchObject({ top: 'terra', front: 'terra' });
    expect(V2_BLOCKS[Block.TILLED]).toMatchObject({ top: 'arada', front: 'terra' });
  });

  it('o preset 2 mantém os parâmetros da comparação', () => {
    expect(CAMERA_OPTION_2).toEqual({
      azimuthDeg: 36,
      elevationDeg: 40,
      zoom: 1.91,
      blockHeight: 0.5,
      cellSize: 0.5,
    });
  });
});
