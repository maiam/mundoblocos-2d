import { describe, expect, it } from 'vitest';
import { goddessIsoKind } from './entities';
import { TOOL_ORDER, TOOLS } from '../world/items';

describe('Deusa isométrica — folha por estado', () => {
  it('sem ferramenta: caminhada andando, idle parada', () => {
    expect(goddessIsoKind(null, null, false, true)).toBe('goddess-iso');
    expect(goddessIsoKind(null, null, false, false)).toBe('goddess-iso-idle');
  });
  it('com ferramenta na mão: a caminhada dela (parada usa o 1º quadro da mesma folha)', () => {
    for (const t of TOOL_ORDER) {
      expect(goddessIsoKind(t, null, false, true)).toBe(`goddess-iso-${t}`);
      expect(goddessIsoKind(t, null, false, false)).toBe(`goddess-iso-${t}`);
    }
  });
  it('golpando: a folha de golpe da ferramenta', () => {
    for (const t of TOOL_ORDER.filter((x) => TOOLS[x].swings)) {
      expect(goddessIsoKind(t, t, true, false)).toBe(`goddess-iso-${t}-attack`);
    }
  });
});
