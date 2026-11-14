import { describe, expect, it } from 'vitest';
import { Block } from '../world/blocks';
import { SANCTUARY_CUBE_IDS } from './celestialArt';
import { SANCTUARY_GRASS_PANELS_URI } from './sanctuaryGrassPanelsAsset';

describe('Santuário — grama atualizada em três faces', () => {
  it('inclui o atlas fornecido com topo, transição e base sem alterar os outros blocos', () => {
    expect(SANCTUARY_CUBE_IDS).toContain(Block.GRASS);
    const prefix = 'data:image/webp;base64,';
    expect(SANCTUARY_GRASS_PANELS_URI.startsWith(prefix)).toBe(true);
    const bytes = atob(SANCTUARY_GRASS_PANELS_URI.slice(prefix.length));
    expect(bytes.length).toBeGreaterThan(5000);
    expect(bytes.slice(0, 4)).toBe('RIFF');
    expect(bytes.slice(8, 12)).toBe('WEBP');
    const size = bytes.charCodeAt(4) | (bytes.charCodeAt(5) << 8)
      | (bytes.charCodeAt(6) << 16) | (bytes.charCodeAt(7) << 24);
    expect(size + 8).toBe(bytes.length);
  });
});
