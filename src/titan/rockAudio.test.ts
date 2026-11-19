import { afterEach, describe, expect, it, vi } from 'vitest';
import { isRockSound } from './breaking';
import { RockSoundSynthesizer } from './rockAudio';
import { T } from './voxel';

/** AudioContext de mentira: conta os nós criados e as partidas, sem som (o teste roda em Node). */
function installFakeAudio(state: AudioContextState = 'running'): { counts: Record<string, number>; resume: ReturnType<typeof vi.fn> } {
  const counts: Record<string, number> = { osc: 0, noise: 0, filter: 0, gain: 0, starts: 0 };
  const resume = vi.fn();
  const param = () => ({ value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
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

describe('som da rocha (ADR 0054)', () => {
  it('só a família da rocha soa: rocha escura, veio, laje e mesa; areia, gelo e brasa não', () => {
    for (const id of [T.DARK_ROCK, T.VEIN_ROCK, T.SLAB, T.WORKBENCH, T.WORKBENCH_90, T.WORKBENCH_180, T.WORKBENCH_270]) expect(isRockSound(id)).toBe(true);
    for (const id of [T.SAND, T.DAMP_SAND, T.FROST, T.VEIN_FROST, T.EMBER, T.LAKE, T.AIR, undefined]) expect(isRockSound(id)).toBe(false);
  });

  it('o golpe seco usa 1 oscilador e 1 rajada de ruído; a quebra usa 1 oscilador e 4 rajadas (0, 25 e 55 ms + corpo grave)', () => {
    const { counts } = installFakeAudio();
    const s = new RockSoundSynthesizer();
    s.playRockHit(0.5);
    expect(counts.osc).toBe(1); expect(counts.noise).toBe(1); expect(counts.starts).toBe(2);
    s.playRockBreak();
    expect(counts.osc).toBe(2); expect(counts.noise).toBe(5);
  });

  it('retoma o contexto suspenso dentro do gesto e reaproveita o mesmo contexto e o mesmo ruído', () => {
    const { resume } = installFakeAudio('suspended');
    const s = new RockSoundSynthesizer();
    expect(s.unlock()).toBe(true);
    expect(resume).toHaveBeenCalledTimes(1);
    s.playRockBreak(); s.playRockHit();
    expect(resume.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('sem Web Audio (ou com erro) tudo vira silêncio, sem lançar', () => {
    vi.stubGlobal('window', {});
    const s = new RockSoundSynthesizer();
    expect(s.unlock()).toBe(false);
    expect(() => { s.playRockHit(); s.playRockBreak(); }).not.toThrow();
  });
});
