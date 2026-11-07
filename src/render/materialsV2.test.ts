import { describe, expect, it } from 'vitest';
import manifest from '../assets/materials-v2.json';
import { blocksV2FromSearch, V2_BLOCKS } from './materialsV2';

describe('Padrão de Materiais V2 (ADR 0022)', () => {
  it('manifesto gerado bate com a geometria: topo 64, frentes 32/36 no atlas 2×', () => {
    expect(manifest.cell).toBe(64);
    expect(manifest.rows.top[1]).toBe(64);
    expect(manifest.rows.f16[1]).toBe(32);
    expect(manifest.rows.f18[1]).toBe(36);
    expect(manifest.rows.o16[1]).toBe(32);
    expect(manifest.rows.o18[1]).toBe(36);
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
