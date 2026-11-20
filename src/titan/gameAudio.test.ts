import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameSoundSynthesizer } from './gameAudio';

/** AudioContext de mentira: conta os nós criados e as partidas, sem som (o teste roda em Node). */
function installFakeAudio(state: AudioContextState = 'running'): { counts: Record<string, number>; resume: ReturnType<typeof vi.fn> } {
  const counts: Record<string, number> = { osc: 0, noise: 0, filter: 0, gain: 0, starts: 0 };
  const resume = vi.fn();
  const param = () => ({ value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() });
  const node = (kind: string, extra: object = {}) => { counts[kind]++; const n: Record<string, unknown> = { ...extra, connect: (to: unknown) => to, start: () => { counts.starts++; }, stop: vi.fn() }; return n; };
  class FakeCtx {
    state = state; sampleRate = 8000; currentTime = 0; destination = {};
    resume = resume;
    createGain() { return node('gain', { gain: param() }); }
    createOscillator() { return node('osc', { frequency: param(), type: '' }); }
    createBiquadFilter() { return node('filter', { frequency: param(), Q: param(), type: '' }); }
    createBufferSource() { return node('noise', { buffer: null }); }
    createBuffer(_c: number, n: number) { return { getChannelData: () => new Float32Array(n) }; }
  }
  vi.stubGlobal('window', { AudioContext: FakeCtx });
  return { counts, resume };
}

afterEach(() => vi.unstubAllGlobals());

describe('sintetizador de som (ADR 0054)', () => {
  it('rocha: o golpe seco usa 1 oscilador e 1 rajada; a quebra usa 1 oscilador e 4 rajadas (0, 25 e 55 ms + corpo grave)', () => {
    const { counts } = installFakeAudio();
    const s = new GameSoundSynthesizer();
    s.playHit('rock', 0.5);
    expect(counts.osc).toBe(1); expect(counts.noise).toBe(1);
    s.playBreak('rock');
    expect(counts.osc).toBe(2); expect(counts.noise).toBe(5);
  });

  it('areia e gelo têm quebra própria (areia: 2 rajadas + 1 tom; gelo: 2 rajadas + 3 "tins") e todo som cria nós e os dispara', () => {
    const { counts } = installFakeAudio();
    const s = new GameSoundSynthesizer();
    s.playBreak('sand');
    expect(counts.noise).toBe(2); expect(counts.osc).toBe(1);
    s.playBreak('ice');
    expect(counts.noise).toBe(4); expect(counts.osc).toBe(4);
    const antes = counts.starts;
    for (const m of ['rock', 'sand', 'ice'] as const) { s.playHit(m, 1); s.playBlockPlace(m); s.playFootstep(m); }
    s.playLanternPlace(); s.playLanternPickup(); s.playItemPickup();
    expect(counts.starts).toBeGreaterThan(antes + 20);
  });

  it('retoma o contexto suspenso dentro do gesto', () => {
    const { resume } = installFakeAudio('suspended');
    const s = new GameSoundSynthesizer();
    expect(s.unlock()).toBe(true);
    expect(resume).toHaveBeenCalledTimes(1);
  });

  it('mudo não cria nem toca nada; ao ligar de novo, volta a soar', () => {
    const { counts } = installFakeAudio();
    const s = new GameSoundSynthesizer();
    s.muted = true;
    s.playRockBreak(); s.playFootstep('rock');
    expect(counts.starts).toBe(0);
    s.muted = false;
    s.playItemPickup();
    expect(counts.osc).toBe(1);
  });

  it('sem Web Audio tudo vira silêncio, sem lançar', () => {
    vi.stubGlobal('window', {});
    const s = new GameSoundSynthesizer();
    expect(s.unlock()).toBe(false);
    expect(() => { s.playHit('rock'); s.playBreak('ice'); s.playBlockPlace('sand'); s.playFootstep('ice'); s.playLanternPlace(); s.playItemPickup(); }).not.toThrow();
  });
});
