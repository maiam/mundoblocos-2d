import { describe, expect, it } from 'vitest';
import { TitanGenerator } from './generator';
import { newBody, stepBody } from './physics';
import { TitanVolume } from './volume';
import { T } from './voxel';

const FLAT_Y = 200; // alto, longe do terreno: um piso de rocha de teste
function arena(): TitanVolume {
  const v = new TitanVolume(new TitanGenerator(42));
  for (let x = 4; x <= 20; x++) for (let z = 4; z <= 20; z++) v.place(x, FLAT_Y - 1, z, T.DARK_ROCK); // piso: topo em FLAT_Y
  return v;
}
const walk = (v: TitanVolume, b: ReturnType<typeof newBody>, dirX: number, dirZ: number, secs: number, jump = false): void => { for (let k = 0; k < secs * 40; k++) stepBody(v, b, { dirX, dirZ, jump }, 1 / 40); };
/** Platô de 1 bloco de altura: x de `x0` a `x1`, z de `z0` a `z1` (grande o bastante para o corpo seguir andando em cima). */
const plateau = (v: TitanVolume, x0: number, x1: number, z0: number, z1: number, h = 1): void => { for (let y = 0; y < h; y++) for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) v.place(x, FLAT_Y + y, z, T.DARK_ROCK); };
const settle = (v: TitanVolume, b: ReturnType<typeof newBody>): void => walk(v, b, 0, 0, 0.4);

describe('salto automático (ADR 0055)', () => {
  it('andando contra um degrau de 1 bloco, o corpo pula sozinho e sobe se continua andando', () => {
    const v = arena();
    plateau(v, 10, 16, 4, 14);
    const b = newBody(7.5, FLAT_Y, 8.5); settle(v, b);
    walk(v, b, 1, 0, 1.6); // para +x, sem apertar o botão de pular
    expect(b.y).toBeCloseTo(FLAT_Y + 1, 3); // em cima do degrau
    expect(b.x).toBeGreaterThan(10); // e seguiu andando
  });

  it('funciona nos quatro lados', () => {
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const v = arena();
      plateau(v, dx > 0 ? 11 : dx < 0 ? 5 : 4, dx > 0 ? 16 : dx < 0 ? 9 : 16, dz > 0 ? 11 : dz < 0 ? 5 : 4, dz > 0 ? 16 : dz < 0 ? 9 : 16);
      const b = newBody(10.5 - dx * 3, FLAT_Y, 10.5 - dz * 3); settle(v, b);
      walk(v, b, dx, dz, 1.2);
      expect(b.y, `${dx},${dz}`).toBeCloseTo(FLAT_Y + 1, 3);
    }
  });

  it('parede de 2 blocos barra: sem espaço no segundo bloco não há salto', () => {
    const v = arena();
    plateau(v, 10, 16, 4, 14, 2);
    const b = newBody(7.5, FLAT_Y, 8.5); settle(v, b);
    walk(v, b, 1, 0, 1.6);
    expect(b.y).toBeCloseTo(FLAT_Y, 3);
    expect(b.x).toBeLessThan(10 - 0.3 + 0.01);
  });

  it('teto baixo sobre o degrau (sem espaço para o corpo em cima) não pula', () => {
    const v = arena();
    plateau(v, 10, 16, 4, 14); plateau(v, 10, 16, 4, 14, 1); for (let x = 10; x <= 16; x++) for (let z = 4; z <= 14; z++) v.place(x, FLAT_Y + 2, z, T.DARK_ROCK); // sobra 1 m sobre o degrau: o corpo de 1,8 m não cabe
    const b = newBody(7.5, FLAT_Y, 8.5); settle(v, b);
    walk(v, b, 1, 0, 1.6);
    expect(b.y).toBeCloseTo(FLAT_Y, 3);
  });

  it('parado, de costas ou raspando na parede de lado não pula; o botão de pular continua valendo', () => {
    const v = arena();
    plateau(v, 10, 16, 4, 14);
    const parado = newBody(9.5, FLAT_Y, 8.5); settle(v, parado); walk(v, parado, 0, 0, 1);
    expect(parado.y).toBeCloseTo(FLAT_Y, 3); // encostado, sem andar
    const costas = newBody(7.5, FLAT_Y, 8.5); settle(v, costas); walk(v, costas, -1, 0, 0.5);
    expect(costas.y).toBeCloseTo(FLAT_Y, 3);
    // andando em z ao longo da face do bloco (quase só de lado): a componente contra o bloco é pequena
    const raspa = newBody(9.62, FLAT_Y, 6.5); settle(v, raspa);
    for (let k = 0; k < 60; k++) stepBody(v, raspa, { dirX: 0.1, dirZ: 0.99, jump: false }, 1 / 40);
    expect(raspa.y).toBeCloseTo(FLAT_Y, 3);
    const manual = newBody(7.5, FLAT_Y, 8.5); settle(v, manual); walk(v, manual, 1, 0, 0.4, true); // pulo manual segue funcionando
    expect(manual.y).toBeGreaterThan(FLAT_Y + 0.2);
  });

  it('não pula na água nem no ar, e não repete o pulo enquanto está subindo', () => {
    const v = arena();
    plateau(v, 10, 16, 4, 14);
    const b = newBody(7.5, FLAT_Y + 3, 8.5); // no ar
    walk(v, b, 1, 0, 0.1);
    expect(b.y).toBeLessThan(FLAT_Y + 3); // caindo, não subindo
    const c = newBody(8.4, FLAT_Y, 8.5); settle(v, c);
    walk(v, c, 1, 0, 1.5);
    expect(c.y).toBeCloseTo(FLAT_Y + 1, 3); // um degrau só: não "escada" para cima
  });
});
