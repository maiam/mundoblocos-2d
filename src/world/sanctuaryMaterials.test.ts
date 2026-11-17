import { describe, expect, it } from 'vitest';
import { Block, ISO_BLOCKS } from './blocks';
import { WORLD_PROFILES } from './profiles';
import { V2_BLOCKS } from '../render/materialsV2';
import { CAMERA_OPTION_2, SANCTUARY_DEFAULT_CAMERA } from '../render/sanctuaryCameraJoystick';

describe('Santuário — comparação de câmera e materiais', () => {
  it('disponibiliza as 26 peças do conjunto isométrico (4 cubos, 16 objetos e 6 cercas/portões), em ordem exata', () => {
    expect(WORLD_PROFILES.santuario.blocks).toEqual(ISO_BLOCKS);
    expect(ISO_BLOCKS).toHaveLength(26);
    expect(new Set(ISO_BLOCKS).size).toBe(26);
  });

  it('a Terra Arada tem topo próprio e laterais de terra', () => {
    expect(V2_BLOCKS[Block.DIRT]).toMatchObject({ top: 'terra', front: 'terra' });
    expect(V2_BLOCKS[Block.TILLED]).toMatchObject({ top: 'arada', front: 'terra' });
  });

  it('aplica os valores padrão de câmera definidos para o novo laboratório', () => {
    expect(SANCTUARY_DEFAULT_CAMERA).toEqual({
      azimuthDeg: 35, elevationDeg: 50, zoom: 0.95, blockHeight: 0.5, cellSize: 0.8,
    });
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
