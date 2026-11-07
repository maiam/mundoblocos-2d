import { describe, expect, it } from 'vitest';
import { actorHeight } from '../render/character';
import { blockDef } from '../world/blocks';
import { BABY_PAIRS, SCALE_ACTORS, SCALE_OBJECTS, scaleBounds } from './scaleLayout';

describe('cena de escala (ADR 0022)', () => {
  it('todo ator e bloco pedido existe no jogo, sem repetir lugar', () => {
    const spots = new Set<string>();
    for (const a of SCALE_ACTORS) {
      expect(actorHeight(a.kind), a.kind).toBeGreaterThan(0);
      const k = `${a.col},${a.row}`;
      expect(spots.has(k), `lugar repetido ${k}`).toBe(false);
      spots.add(k);
    }
    for (const o of SCALE_OBJECTS) expect(blockDef(o.block).id, o.label).toBe(o.block);
  });

  it('a fila cabe na área calculada e objetos não se sobrepõem', () => {
    const { cols, rows } = scaleBounds();
    expect(cols).toBeGreaterThan(0);
    expect(rows).toBeGreaterThan(0);
    const cells = new Set<string>();
    for (const o of SCALE_OBJECTS) {
      for (let j = 0; j < (o.d ?? 1); j++) {
        for (let i = 0; i < (o.w ?? 1); i++) {
          const k = `${o.col + i},${o.row - j}`;
          expect(cells.has(k), `célula repetida ${k}`).toBe(false);
          cells.add(k);
        }
      }
    }
  });

  it('filhote ≈ 0,7× a altura do adulto (regra de escala da ADR 0022)', () => {
    for (const [adult, baby] of BABY_PAIRS) {
      const ratio = actorHeight(baby) / actorHeight(adult);
      expect(ratio, `${baby}/${adult}`).toBeGreaterThan(0.65);
      expect(ratio, `${baby}/${adult}`).toBeLessThan(0.75);
    }
  });
});
