import { describe, expect, it } from 'vitest';
import { chunkCount, resolveWorldId, WORLD_PROFILES } from './profiles';

describe('Perfis de mundo', () => {
  it('o padrão é o Orvalis 3D; o Titã só por ?mundo=titan; o Santuário não existe mais (ADR 0115)', () => {
    expect(resolveWorldId('localhost', '')).toBe('orvalis3d');
    expect(resolveWorldId('localhost', '?mundo=orvalis3d')).toBe('orvalis3d');
    expect(resolveWorldId('localhost', '?mundo=titan')).toBe('titan'); // o Titã só por ?mundo=titan
    expect(resolveWorldId('titan.orvalis.pensamentos.online', '')).toBe('orvalis3d'); // nunca por subdomínio
    expect(resolveWorldId('santuario.orvalis.pensamentos.online', '')).toBe('orvalis3d'); // o subdomínio do Santuário saiu
    expect(resolveWorldId('localhost', '?mundo=santuario')).toBe('orvalis3d');
    expect(resolveWorldId('localhost', '?mundo=xyz')).toBe('orvalis3d');
    expect(resolveWorldId('localhost', '?mundo=principal')).toBe('principal'); // o 2.5D segue acessível só até sair (ADR 0115, etapa 3)
    expect(resolveWorldId('qualquer.host.com', '', 'titan')).toBe('titan'); // build fixo
    expect(resolveWorldId('qualquer.host.com', '', 'santuario')).toBe('orvalis3d');
  });

  it('o Mundo principal 2.5D é ilimitado', () => {
    expect(chunkCount(WORLD_PROFILES.principal.bounds)).toBeNull();
    expect('santuario' in WORLD_PROFILES).toBe(false);
  });
});
