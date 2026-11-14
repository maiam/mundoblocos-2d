import { describe, expect, it } from 'vitest';
import type { PlayerInfo } from '../net/protocol';
import { World } from '../world/world';
import { INTERP_DELAY, RemotePlayers, sampleAt } from './remotePlayers';

describe('Outros jogadores: interpolação entre amostras (v0.93.69)', () => {
  it('sampleAt interpola entre as duas amostras que cercam o instante e extrapola pouco depois da última', () => {
    const buf = [{ t: 0, x: 0, y: 0 }, { t: 0.1, x: 1, y: 0 }, { t: 0.2, x: 2, y: 2 }];
    expect(sampleAt([], 1)).toBeNull();
    expect(sampleAt(buf, -1)).toEqual({ x: 0, y: 0 }); // antes da primeira: fica nela
    expect(sampleAt(buf, 0.05)!.x).toBeCloseTo(0.5);
    expect(sampleAt(buf, 0.15)!.x).toBeCloseTo(1.5);
    expect(sampleAt(buf, 0.15)!.y).toBeCloseTo(1);
    // Depois da última: segue a velocidade (10 células/s em x) por até 0,12 s e para.
    expect(sampleAt(buf, 0.25)!.x).toBeCloseTo(2.5);
    expect(sampleAt(buf, 5)!.x).toBeCloseTo(2 + 10 * 0.12);
    expect(sampleAt([{ t: 0, x: 3, y: 4 }], 9)).toEqual({ x: 3, y: 4 }); // uma amostra só
  });

  it('com posições chegando a 10 Hz o desenho anda suave a 60 quadros (sem degraus) e atrasa ~INTERP_DELAY', () => {
    const world = new World(42);
    const rp = new RemotePlayers();
    const info = (x: number): Map<number, PlayerInfo> => new Map([[1, { id: 1, name: 'Ana', appearance: {}, state: { x, y: 10, facing: 'right', moving: true } } as unknown as PlayerInfo]]);
    const speed = 4; // células por segundo
    const dt = 1 / 60;
    let t = 0, last = 0;
    const deltas: number[] = [];
    let drawn = 0;
    for (let f = 0; f < 120; f++) {
      t += dt;
      // A rede entrega a posição a cada 0,1 s (degrau): a posição real é speed × t no instante do envio.
      const sent = Math.floor(t * 10) / 10;
      rp.sync(info(5 + speed * sent));
      rp.update(dt, world);
      drawn = rp.actors[0].x;
      if (f > 40) deltas.push(drawn - last);
      last = drawn;
    }
    const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    expect(mean).toBeGreaterThan(speed * dt * 0.9);
    expect(mean).toBeLessThan(speed * dt * 1.1);
    // Suave: nenhum quadro foge muito da média (a suavização exponencial antiga andava em degraus de 10 Hz).
    for (const d of deltas) expect(Math.abs(d - mean)).toBeLessThan(mean * 0.35);
    // Atraso: o desenhado está em ~INTERP_DELAY atrás da posição real; atrás da última enviada (que já é de até 0,1 s antes) sobra INTERP_DELAY − 0,1…0.
    const lag = 5 + speed * (Math.floor(t * 10) / 10) - drawn;
    expect(lag).toBeGreaterThan(speed * (INTERP_DELAY - 0.1) * 0.8);
    expect(lag).toBeLessThan(speed * INTERP_DELAY * 1.1);
  });

  it('um salto grande (entrou num interior, renasceu) teletransporta em vez de deslizar', () => {
    const world = new World(42);
    const rp = new RemotePlayers();
    const info = (x: number, y: number): Map<number, PlayerInfo> => new Map([[1, { id: 1, name: 'Ana', appearance: {}, state: { x, y, facing: 'down', moving: false } } as unknown as PlayerInfo]]);
    rp.sync(info(5, 5));
    for (let i = 0; i < 20; i++) rp.update(1 / 60, world);
    rp.sync(info(80, 90));
    for (let i = 0; i < 12; i++) rp.update(1 / 60, world); // > INTERP_DELAY
    const a = rp.actors[0];
    expect(Math.hypot(a.x - 80, a.y - 90)).toBeLessThan(0.5);
  });
});
