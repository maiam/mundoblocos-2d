/**
 * Som da rocha do Titã (ADR 0054), **sintetizado na hora** com a Web Audio API: nenhum arquivo de áudio, latência zero e uma pequena variação aleatória a cada golpe.
 * Só navegador (usa `AudioContext`); sem suporte ou bloqueado, tudo é silêncio — nunca lança erro para o jogo.
 *
 * Camadas: pancada grave (oscilador que cai de ~140 Hz para ~40 Hz em ~55 ms), estalo de atrito (ruído em banda 1,2–2,8 kHz, curto) e, ao quebrar, estilhaços
 * defasados (0, 25 e 55 ms) e o corpo grave do desmoronamento (ruído passa-baixa em ~260 Hz). O ruído branco de 1 s é gerado uma vez e reaproveitado.
 * iOS/Safari só liberam o som dentro de um gesto: `unlock()` cria e retoma o contexto no primeiro toque/tecla (ver `titanGame.ts`).
 */
export const HIT_INTERVAL_MS = 250; // golpe seco durante as rachaduras
const MASTER_VOLUME = 0.6; // margem para vários golpes seguidos sem estourar

type AudioCtor = typeof AudioContext;

export class RockSoundSynthesizer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private failed = false;

  /** Cria (uma vez) e retoma o contexto. Chame de dentro de um gesto do jogador. Devolve se há som disponível. */
  unlock(): boolean {
    if (this.failed) return false;
    try {
      if (!this.ctx) {
        const Ctor: AudioCtor | undefined = typeof window === 'undefined' ? undefined : window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
        if (!Ctor) { this.failed = true; return false; }
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = MASTER_VOLUME;
        this.master.connect(this.ctx.destination);
        const rate = this.ctx.sampleRate;
        const buffer = this.ctx.createBuffer(1, rate, rate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < rate; i++) data[i] = Math.random() * 2 - 1;
        this.noise = buffer;
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return true;
    } catch {
      this.failed = true; // navegador sem áudio ou bloqueado: o jogo segue mudo
      return false;
    }
  }

  /** Golpe seco enquanto as rachaduras progridem. `progress` 0–1 sobe um pouco o tom conforme a pedra cede. */
  playRockHit(progress = 0): void {
    if (!this.unlock() || !this.ctx || !this.master) return;
    try {
      const ctx = this.ctx, now = ctx.currentTime, jitter = 0.9 + Math.random() * 0.2;
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime((130 + Math.min(1, Math.max(0, progress)) * 45) * jitter, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.055);
      g.gain.setValueAtTime(0.35, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(g).connect(this.master);
      osc.start(now);
      osc.stop(now + 0.065);
      this.burst(now, 0.05, 1800 * jitter, 2.2, 0.22);
    } catch { /* sem som */ }
  }

  /** Rocha se partindo ao concluir a quebra. */
  playRockBreak(): void {
    if (!this.unlock() || !this.ctx || !this.master) return;
    try {
      const ctx = this.ctx, now = ctx.currentTime, jitter = 0.88 + Math.random() * 0.24;
      const osc = ctx.createOscillator(), low = ctx.createBiquadFilter(), g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(145 * jitter, now);
      osc.frequency.exponentialRampToValueAtTime(34, now + 0.11);
      low.type = 'lowpass';
      low.frequency.setValueAtTime(420, now);
      g.gain.setValueAtTime(0.45, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(low).connect(g).connect(this.master);
      osc.start(now);
      osc.stop(now + 0.13);
      this.burst(now, 0.14, 1650 * jitter, 1.4, 0.45);
      this.burst(now + 0.025, 0.09, 2400 * jitter, 2.5, 0.28);
      this.burst(now + 0.055, 0.11, 1100 * jitter, 1.8, 0.24);
      this.burst(now, 0.22, 260, 0.9, 0.4, 'lowpass');
    } catch { /* sem som */ }
  }

  /** Rajada de ruído filtrado com decaimento exponencial, a partir de um ponto aleatório do ruído (nunca soa igual). */
  private burst(start: number, duration: number, freq: number, q: number, volume: number, type: BiquadFilterType = 'bandpass'): void {
    if (!this.ctx || !this.master || !this.noise) return;
    const src = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    src.buffer = this.noise;
    filter.type = type;
    filter.frequency.setValueAtTime(freq, start);
    filter.Q.setValueAtTime(q, start);
    g.gain.setValueAtTime(volume, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + duration);
    src.connect(filter).connect(g).connect(this.master);
    src.start(start, Math.random() * 0.5, duration + 0.02);
  }
}

export const rockAudio = new RockSoundSynthesizer();
