import { describe, expect, it } from 'vitest';
import manifest from '../assets/materials-v2.json';
import { CUBE_FRONT, TILE } from '../config';
import { TEX_RES } from './textures';
import { blocksV2FromSearch, V2_BLOCKS } from './materialsV2';

describe('Padrão de Materiais V2 (ADR 0023)', () => {
  it('manifesto gerado bate com a geometria do motor: topo T×T e frente T×CUBE_FRONT no atlas 2×', () => {
    expect(manifest.cell).toBe(TILE * TEX_RES);
    expect(manifest.rows.top[1]).toBe(TILE * TEX_RES);
    expect(manifest.rows.front[1]).toBe(CUBE_FRONT * TEX_RES);
    expect(manifest.rows.overlay[1]).toBe(CUBE_FRONT * TEX_RES);
  });

  it('todo bloco-piloto aponta para materiais que existem no atlas', () => {
    for (const b of Object.values(V2_BLOCKS)) {
      expect(manifest.materials).toContain(b!.top);
      expect(manifest.materials).toContain(b!.front);
      if (b!.overlay) expect(manifest.overlay).toContain(b!.overlay);
    }
  });

  it('a chave só liga com ?blocos=v2', () => {
    expect(blocksV2FromSearch('?seed=1')).toBe(false);
    expect(blocksV2FromSearch('?blocos=v2&seed=1')).toBe(true);
    expect(blocksV2FromSearch('?blocos=v1')).toBe(false);
  });
});
