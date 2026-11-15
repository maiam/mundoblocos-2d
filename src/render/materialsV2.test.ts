import { describe, expect, it } from 'vitest';
import manifest from '../assets/materials-v2.json';
import { CUBE_FRONT, TILE } from '../config';
import { Block } from '../world/blocks';
import { TRANSITION_PIECES } from './transitions';
import { TEX_RES } from './textures';
import { blocksV2FromSearch, V2_BLOCKS } from './materialsV2';

describe('Padrão de Materiais V2 (ADR 0023)', () => {
  it('manifesto gerado bate com a geometria do motor: topo T×T, franja T×CUBE_FRONT, frente inteira para fatiar', () => {
    expect(manifest.cell).toBe(TILE * TEX_RES);
    expect(manifest.rows.top[1]).toBe(TILE * TEX_RES);
    expect(manifest.rows.overlay[1]).toBe(CUBE_FRONT * TEX_RES);
    // A frente é a textura inteira (seamless); cada nível lê uma fatia de CUBE_FRONT × TEX_RES.
    expect(manifest.rows.front[1]).toBe(TILE * TEX_RES);
    expect(manifest.rows.front[1]).toBeGreaterThanOrEqual(CUBE_FRONT * TEX_RES);
  });

  it('todo bloco-piloto aponta para materiais que existem no atlas', () => {
    for (const b of Object.values(V2_BLOCKS)) {
      expect(manifest.materials).toContain(b!.top);
      expect(manifest.materials).toContain(b!.front);
      if (b!.overlay) expect(manifest.overlay).toContain(b!.overlay);
    }
  });

  it('Terra Arada e Caminho de Terra têm frente de terra e a franja do próprio topo; a Grama tem topo e face próprios, sem franja', () => {
    for (const id of [Block.TILLED, Block.PATH]) {
      const b = V2_BLOCKS[id]!;
      expect(b.front).toBe('terra');
      expect(b.overlay).toBe(b.top);
    }
    expect(V2_BLOCKS[Block.GRASS]).toEqual({ top: 'grama', front: 'grama' });
  });

  it('o V2 é o padrão; só ?blocos=legado volta ao atlas antigo', () => {
    expect(blocksV2FromSearch('?seed=1')).toBe(true);
    expect(blocksV2FromSearch('?blocos=v2&seed=1')).toBe(true);
    expect(blocksV2FromSearch('?blocos=legado')).toBe(false);
  });

  it('atlas de formas: uma por par, oito peças na ordem de TRANSITION_PIECES', () => {
    expect(manifest.masks!.order).toEqual([...TRANSITION_PIECES]);
    expect(manifest.masks!.cell).toBe(TILE * TEX_RES);
    expect(manifest.masks!.shapes).toEqual(['agua-areia', 'agua-caminho', 'agua-grama', 'agua-terra', 'areia-terra', 'grama-areia', 'grama-caminho', 'grama-terra']);
  });
});
