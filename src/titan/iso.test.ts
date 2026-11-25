import { describe, expect, it } from 'vitest';
import { angleDelta, ISO_DISTANCE, ISO_PX_PER_BLOCK, ISO_RAY_MAX, ISO_REACH, isoCamera, isoQuarterOf, isoRay, isoYawOf, stepIsoYaw, type Vec3 } from './iso';
import { raycast } from './physics';
import { TexturesGen } from './texturas';
import { TitanVolume } from './volume';

const proj = (cam: ReturnType<typeof isoCamera>, v: Vec3): [number, number] => [(v[0] * cam.right[0] + v[1] * cam.right[1] + v[2] * cam.right[2]) * ISO_PX_PER_BLOCK, (v[0] * cam.up[0] + v[1] * cam.up[1] + v[2] * cam.up[2]) * ISO_PX_PER_BLOCK];

describe('vista isométrica 2:1 (ADR 0106)', () => {
  it('nas 4 vistas de 90° o topo do bloco é um losango 2:1 de 16 × 8 px e a aresta vertical mede ~9,8 px', () => {
    for (let q = 0; q < 4; q++) {
      const cam = isoCamera([0, 0, 0], isoYawOf(q), 800, 400, false);
      const [ax, ay] = proj(cam, [1, 0, 0]), [bx, by] = proj(cam, [0, 0, 1]), [vx, vy] = proj(cam, [0, 1, 0]);
      const xs = [0, ax, bx, ax + bx], ys = [0, ay, by, ay + by];
      expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(16, 6);
      expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(8, 6);
      expect(vx).toBeCloseTo(0, 6); expect(vy).toBeCloseTo(ISO_PX_PER_BLOCK * Math.cos(Math.PI / 6), 6);
    }
  });

  it('a câmera olha para o alvo, de longe e de cima, com o volume visível dado pelo tamanho da tela', () => {
    const cam = isoCamera([10, 70, -5], isoYawOf(0), 640, 360, false);
    const to: Vec3 = [10 - cam.pos[0], 70 - cam.pos[1], -5 - cam.pos[2]];
    expect(Math.hypot(...to)).toBeCloseTo(ISO_DISTANCE, 6);
    expect(cam.pos[1]).toBeGreaterThan(70 + ISO_DISTANCE * 0.49);
    expect(cam.halfW).toBeCloseTo(320 / ISO_PX_PER_BLOCK, 9); expect(cam.halfH).toBeCloseTo(180 / ISO_PX_PER_BLOCK, 9);
  });

  it('prende o alvo à grade de pixels: a posição da câmera na tela é sempre múltipla de 1 px, e um deslocamento mínimo move 0 ou 1 px', () => {
    const k = ISO_PX_PER_BLOCK, along = (c: ReturnType<typeof isoCamera>, v: Vec3): number => c.pos[0] * v[0] + c.pos[1] * v[1] + c.pos[2] * v[2];
    for (const t of [[0.01, 70, 0.02], [13.37, 64.9, -8.61], [-40.2, 90.1, 33.3]] as Vec3[]) for (let q = 0; q < 4; q++) {
      const c = isoCamera(t, isoYawOf(q), 800, 400);
      for (const axis of [c.right, c.up]) expect(along(c, axis) * k - Math.round(along(c, axis) * k)).toBeCloseTo(0, 5);
      const d = isoCamera([t[0] + 1e-6, t[1], t[2]], isoYawOf(q), 800, 400), step = Math.hypot(d.pos[0] - c.pos[0], d.pos[1] - c.pos[1], d.pos[2] - c.pos[2]);
      expect(step < 1e-9 || Math.abs(step - 1 / k) < 1e-6 || step < 2 / k).toBe(true);
    }
  });

  it('as vistas: quarto ↔ giro, e a transição pelo caminho mais curto encaixa no destino', () => {
    for (const q of [-3, -1, 0, 1, 2, 5]) expect(isoQuarterOf(isoYawOf(q))).toBe(q);
    expect(isoQuarterOf(0.1)).toBe(0); expect(isoQuarterOf(isoYawOf(2) + 0.3)).toBe(2);
    expect(angleDelta(0.1, Math.PI * 2 - 0.1)).toBeCloseTo(-0.2, 9);
    let y = isoYawOf(0); const goal = isoYawOf(1);
    for (let i = 0; i < 60; i++) y = stepIsoYaw(y, goal, 1 / 60);
    expect(y).toBe(goal);
  });

  it('o raio do centro da tela passa pelo jogador e o raio do canto é paralelo, deslocado na tela', () => {
    const target: Vec3 = [3.5, 64.9, 2.5], cam = isoCamera(target, isoYawOf(2), 800, 400, false);
    const r0 = isoRay(cam, 0, 0), r1 = isoRay(cam, 1, 1);
    expect(r1.dir).toEqual(r0.dir);
    // distância do alvo ao raio central ≈ 0
    const t = (target[0] - r0.origin[0]) * r0.dir[0] + (target[1] - r0.origin[1]) * r0.dir[1] + (target[2] - r0.origin[2]) * r0.dir[2];
    const px = r0.origin[0] + r0.dir[0] * t - target[0], py = r0.origin[1] + r0.dir[1] * t - target[1], pz = r0.origin[2] + r0.dir[2] * t - target[2];
    expect(Math.hypot(px, py, pz)).toBeLessThan(1e-9);
    expect(t).toBeGreaterThan(0); expect(t).toBeLessThan(ISO_RAY_MAX);
  });

  it('clicar no bloco que se vê acerta esse bloco: o raio do pixel de um bloco de 1 m cai no próprio bloco', () => {
    const vol = new TitanVolume(new TexturesGen(1));
    vol.set(10, 64, 10, 3); vol.set(10, 65, 10, 3); // uma coluna de 2 blocos sobre o piso (Y = 63)
    for (let q = 0; q < 4; q++) {
      const cam = isoCamera([10.5, 65.9, 10.5], isoYawOf(q), 800, 400, false); // jogador "dentro" da coluna: o alvo é o centro de cima
      // o centro do topo da coluna (10,5; 66; 10,5) projeta no centro da tela, deslocado de 0,1 bloco para cima do alvo
      const aim = isoRay(cam, 0, 0), hit = raycast(vol, aim.origin[0], aim.origin[1], aim.origin[2], aim.dir[0], aim.dir[1], aim.dir[2], ISO_RAY_MAX, { at: () => null }, 0.14, false);
      expect(hit).not.toBeNull();
      expect([hit!.x, hit!.z]).toEqual([10, 10]);
      expect(hit!.y).toBe(65);
    }
    expect(ISO_REACH).toBe(6);
  });
});
