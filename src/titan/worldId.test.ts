import { describe, expect, it } from 'vitest';
import { resolveWorldId } from './worldId';

describe('escolha do mundo (ADR 0115)', () => {
  it('o padrão é o Orvalis 3D; o Titã só por ?mundo=titan', () => {
    expect(resolveWorldId('')).toBe('orvalis3d');
    expect(resolveWorldId('?mundo=orvalis3d')).toBe('orvalis3d');
    expect(resolveWorldId('?mundo=titan')).toBe('titan');
    expect(resolveWorldId('?mundo=TITAN')).toBe('titan');
  });
  it('mundos que saíram ou desconhecidos caem no Orvalis 3D', () => {
    for (const m of ['principal', 'santuario', 'xyz', '']) expect(resolveWorldId(`?mundo=${m}`)).toBe('orvalis3d');
  });
  it('o build fixo (VITE_WORLD) vale mais que o parâmetro e só aceita mundos que existem', () => {
    expect(resolveWorldId('?mundo=titan', 'orvalis3d')).toBe('orvalis3d');
    expect(resolveWorldId('', 'titan')).toBe('titan');
    expect(resolveWorldId('', 'santuario')).toBe('orvalis3d');
  });
});
