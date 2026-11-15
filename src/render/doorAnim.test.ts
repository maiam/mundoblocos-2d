import { describe, expect, it } from 'vitest';
import { DOOR_ANIM_S, DoorAnimator, doorFrame, doorKey } from './doorAnim';

describe('animação da porta (a mesma do 2D e do 3D)', () => {
  it('abrindo: quadros 0..3; fechando: 4..7; no fim, aberta = 3 e fechada = 0', () => {
    expect([0, 0.26, 0.51, 0.76].map((t) => doorFrame(true, t))).toEqual([0, 1, 2, 3]);
    expect([0, 0.26, 0.51, 0.76].map((t) => doorFrame(false, t))).toEqual([4, 5, 6, 7]);
    expect(doorFrame(true, 1)).toBe(3);
    expect(doorFrame(false, 1)).toBe(0);
    expect(doorFrame(true, Infinity)).toBe(3);
    expect(doorFrame(false, Infinity)).toBe(0);
  });

  it('primeira vez vista: sem animação; ao mudar de estado anima por DOOR_ANIM_S e assenta', () => {
    const a = new DoorAnimator();
    const k = doorKey(3, 4);
    expect(a.frameFor(k, false, 10)).toBe(0); // já estava fechada
    expect(a.animating(k, 10)).toBe(false);
    expect(a.frameFor(k, true, 20)).toBe(0);  // acabou de abrir: começa no quadro 0
    expect(a.animating(k, 20.1)).toBe(true);
    expect(a.frameFor(k, true, 20 + DOOR_ANIM_S * 0.6)).toBe(2);
    expect(a.frameFor(k, true, 20 + DOOR_ANIM_S + 0.01)).toBe(3);
    expect(a.animating(k, 21)).toBe(false);
    expect(a.frameFor(k, false, 30)).toBe(4);  // fechando
    expect(a.frameFor(k, false, 31)).toBe(0);
  });

  it('portas diferentes não se misturam; a chave é única por célula', () => {
    expect(doorKey(1, 2)).not.toBe(doorKey(2, 1));
    const a = new DoorAnimator();
    a.frameFor(doorKey(1, 1), false, 0);
    a.frameFor(doorKey(2, 2), false, 0);
    a.frameFor(doorKey(1, 1), true, 5);
    expect(a.animating(doorKey(1, 1), 5.05)).toBe(true);
    expect(a.animating(doorKey(2, 2), 5.05)).toBe(false);
  });
});

describe('porteira (5 quadros por sentido)', () => {
  it('abre 0..4, fecha 5..9', () => {
    expect([0, 0.2, 0.4, 0.6, 0.8].map((t) => doorFrame(true, t, 5))).toEqual([0, 1, 2, 3, 4]);
    expect([0, 0.2, 0.4, 0.6, 0.8].map((t) => doorFrame(false, t, 5))).toEqual([5, 6, 7, 8, 9]);
    expect(doorFrame(true, 1, 5)).toBe(4);
    expect(doorFrame(false, 1, 5)).toBe(0);
  });
});
