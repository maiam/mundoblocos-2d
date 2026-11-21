import { describe, expect, it } from 'vitest';
import { LID_OPEN_ANGLE, LID_RATE, lidIdle, stepLid } from './lid';
import { SLEEP_APPLY_MS, SLEEP_CONTROL_MS, SLEEP_TOTAL_MS, sleepVeil } from './sleep';

describe('tampa do baú (ADR 0093)', () => {
  it('abre e fecha sem passar do alvo e limita o passo de um quadro perdido', () => {
    let a = 0;
    a = stepLid(a, true, 0.1); expect(a).toBeCloseTo(LID_RATE * 0.1);
    for (let i = 0; i < 100; i++) a = stepLid(a, true, 0.05);
    expect(a).toBe(LID_OPEN_ANGLE); expect(lidIdle(a, true)).toBe(true);
    expect(stepLid(0, true, 5)).toBeCloseTo(LID_RATE * 0.25); // dt limitado a 0,25 s
    for (let i = 0; i < 100; i++) a = stepLid(a, false, 0.05);
    expect(a).toBe(0); expect(lidIdle(a, false)).toBe(true); expect(lidIdle(0.5, false)).toBe(false); expect(lidIdle(0.5, true)).toBe(false);
  });
  it('a abertura é de uns 109° e leva cerca de 0,35 s', () => {
    expect(LID_OPEN_ANGLE).toBeGreaterThan(1.7); expect(LID_OPEN_ANGLE).toBeLessThan(2.1);
    expect(LID_OPEN_ANGLE / LID_RATE).toBeLessThan(0.5);
  });
});

describe('véu do sono (ADR 0093)', () => {
  it('escurece, a noite passa com a tela preta e o véu clareia; o controle volta antes do fim', () => {
    expect(sleepVeil(0)).toBe(0); expect(sleepVeil(-5)).toBe(0);
    expect(sleepVeil(SLEEP_APPLY_MS)).toBe(1); expect(sleepVeil(SLEEP_APPLY_MS + 200)).toBe(1);
    expect(sleepVeil(SLEEP_APPLY_MS / 2)).toBeGreaterThan(0); expect(sleepVeil(SLEEP_APPLY_MS / 2)).toBeLessThan(1);
    expect(sleepVeil(SLEEP_TOTAL_MS)).toBe(0); expect(sleepVeil(SLEEP_TOTAL_MS + 100)).toBe(0);
    expect(SLEEP_CONTROL_MS).toBeLessThan(SLEEP_TOTAL_MS); expect(SLEEP_CONTROL_MS).toBeGreaterThan(SLEEP_APPLY_MS);
    let prev = 1; for (let t = SLEEP_APPLY_MS + 350; t <= SLEEP_TOTAL_MS; t += 50) { const v = sleepVeil(t); expect(v).toBeLessThanOrEqual(prev); prev = v; } // só desce
  });
});
