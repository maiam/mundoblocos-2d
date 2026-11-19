import { describe, expect, it } from 'vitest';
import { LANTERN_PAD_TOUCH, LANTERN_SIZE, lanternBox, rayBox } from './lantern';
import { raycast } from './physics';
import { TitanVolume } from './volume';
import { TitanGenerator } from './generator';
import { T } from './voxel';

const vol = (): TitanVolume => new TitanVolume(new TitanGenerator(42));

describe('mira da lanterna 3D (ADR 0043)', () => {
  it('a caixa tem o tamanho do modelo e apoia no piso da célula', () => {
    const b = lanternBox(10, 70, -4);
    expect(b[3] - b[0]).toBeCloseTo(LANTERN_SIZE[0]); expect(b[4] - b[1]).toBeCloseTo(LANTERN_SIZE[1]); expect(b[1]).toBe(70);
    expect((b[0] + b[3]) / 2).toBeCloseTo(10.5);
  });
  it('rayBox devolve a face de entrada e ignora caixa atrás do olho', () => {
    const b = lanternBox(0, 0, 0);
    const h = rayBox(0.5, 0.3, 5, 0, 0, -1, b)!;
    expect(h.nz).toBe(1); expect(h.t).toBeCloseTo(5 - b[5]);
    expect(rayBox(0.5, 0.3, 5, 0, 0, 1, b)).toBeNull();
  });
  it('o raio atravessa a parte vazia da célula da lanterna e acerta o bloco atrás; a folga de toque aumenta a área', () => {
    const v = vol();
    const x = 10, y = 200, z = 10; // alto, longe do terreno gerado
    v.place(x, y, z, T.LANTERN); v.place(x, y, z - 3, T.DARK_ROCK);
    // rasante pela borda da célula (x + 0.2): fora da caixa do objeto
    const miss = raycast(v, x + 0.2, y + 0.3, z + 5, 0, 0, -1, 10, undefined, 0)!;
    expect(miss.z).toBe(z - 3); expect(miss.box).toBeUndefined();
    // com folga de toque (14 cm) a mesma linha já pega a lanterna
    const touch = raycast(v, x + 0.2, y + 0.3, z + 5, 0, 0, -1, 10, undefined, LANTERN_PAD_TOUCH)!;
    expect(touch.z).toBe(z); expect(touch.box).toBeDefined(); expect(touch.nz).toBe(1);
    // no centro, acerta mesmo sem folga
    expect(raycast(v, x + 0.5, y + 0.3, z + 5, 0, 0, -1, 10)!.z).toBe(z);
  });
});
