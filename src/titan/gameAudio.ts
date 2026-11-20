import type { SurfaceMaterial } from './sounds';

/**
 * Som do Titã (ADR 0054), **sintetizado na hora** com a Web Audio API: nenhum arquivo de áudio, latência zero e variação aleatória a cada evento.
 * Só navegador (usa `AudioContext`); sem suporte ou bloqueado, tudo é silêncio — nunca lança erro para o jogo.
 * Cobre rocha, areia e gelo (golpe seco e quebra), colocar bloco (por material), lanterna (colocar e recolher), coleta de item e passos por superfície.
 * O ruído branco de 1 s é gerado uma vez e reaproveitado; um ganho mestre (0,6) evita estourar com vários sons seguidos.
 * iOS/Safari só liberam o som dentro de um gesto: `unlock()` cria e retoma o contexto no primeiro toque/tecla (ver `titanGame.ts`). `muted` silencia tudo.
 */
export const HIT_INTERVAL_MS = 250; // golpe seco durante as rachaduras
const MASTER_VOLUME = 0.6;

type AudioCtor = typeof AudioContext;

export class GameSoundSynthesizer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private failed = false;
  /** Silenciado pelo jogador (botão do menu). */
  muted = false;

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

  /** Prepara um som: devolve o instante inicial, ou `null` se estiver mudo/sem áudio. Todo som passa por aqui e por um `try` (nunca quebra o jogo). */
  private begin(): number | null {
    if (this.muted || !this.unlock() || !this.ctx) return null;
    return this.ctx.currentTime;
  }
  private safe(fn: (now: number) => void): void {
    const now = this.begin();
    if (now === null) return;
    try { fn(now); } catch { /* sem som */ }
  }

  // ---- Despacho por material ----
  playHit(material: SurfaceMaterial, progress = 0): void {
    if (material === 'sand') this.playSandHit(progress); else if (material === 'ice') this.playIceHit(progress); else this.playRockHit(progress);
  }
  playBreak(material: SurfaceMaterial): void {
    if (material === 'sand') this.playSandBreak(); else if (material === 'ice') this.playIceBreak(); else this.playRockBreak();
  }

  // ---- Rocha ----
  playRockHit(progress = 0): void {
    this.safe((now) => {
      const j = 0.9 + Math.random() * 0.2;
      this.tone(now, (130 + clamp01(progress) * 45) * j, 42, 0.055, 'triangle', 0.35);
      this.burst(now, 0.05, 1800 * j, 2.2, 0.22);
    });
  }
  playRockBreak(): void {
    this.safe((now) => {
      const j = 0.88 + Math.random() * 0.24;
      this.tone(now, 145 * j, 34, 0.11, 'sawtooth', 0.42, 420);
      this.burst(now, 0.14, 1650 * j, 1.4, 0.45);
      this.burst(now + 0.025, 0.09, 2400 * j, 2.5, 0.28);
      this.burst(now + 0.055, 0.11, 1100 * j, 1.8, 0.24);
      this.burst(now, 0.22, 260, 0.9, 0.38, 'lowpass');
    });
  }

  // ---- Areia: farfalhar de grãos, sem impacto grave ----
  playSandHit(progress = 0): void {
    this.safe((now) => {
      const j = 0.92 + Math.random() * 0.16;
      this.burst(now, 0.08, (2600 + clamp01(progress) * 600) * j, 1.1, 0.24, 'bandpass', 0.015);
    });
  }
  playSandBreak(): void {
    this.safe((now) => {
      const j = 0.9 + Math.random() * 0.2;
      this.burst(now, 0.18, 2200 * j, 0.9, 0.38, 'bandpass', 0.02);
      this.burst(now + 0.04, 0.24, 3400 * j, 1.4, 0.28, 'highpass', 0.03);
      this.tone(now, 85 * j, 38, 0.09, 'sine', 0.2);
    });
  }

  // ---- Gelo: estalo agudo e "tins" cristalinos ----
  playIceHit(progress = 0): void {
    this.safe((now) => {
      const j = 0.94 + Math.random() * 0.12, f = (1400 + clamp01(progress) * 500) * j;
      this.tone(now, f, f * 0.65, 0.045, 'sine', 0.22);
      this.burst(now, 0.035, 4200 * j, 3.5, 0.18, 'highpass');
    });
  }
  playIceBreak(): void {
    this.safe((now) => {
      const j = 0.9 + Math.random() * 0.2;
      this.burst(now, 0.14, 3200 * j, 1.2, 0.42, 'highpass');
      this.burst(now + 0.03, 0.12, 4800 * j, 2.0, 0.3, 'bandpass');
      [1950, 2680, 3420].forEach((f, i) => this.tone(now + i * 0.022, f * j, f * j * 0.85, 0.09, 'sine', 0.18));
    });
  }

  // ---- Colocar bloco (timbre por material) ----
  playBlockPlace(material: SurfaceMaterial = 'rock'): void {
    this.safe((now) => {
      const j = 0.93 + Math.random() * 0.14;
      if (material === 'sand') {
        this.tone(now, 95 * j, 45, 0.07, 'sine', 0.32);
        this.burst(now, 0.09, 2100 * j, 1.2, 0.26, 'bandpass', 0.01);
      } else if (material === 'ice') {
        this.tone(now, 240 * j, 90, 0.06, 'triangle', 0.35);
        this.tone(now + 0.01, 1850 * j, 1400 * j, 0.06, 'sine', 0.18);
        this.burst(now, 0.05, 3500 * j, 2.5, 0.2, 'highpass');
      } else {
        this.tone(now, 165 * j, 52, 0.075, 'triangle', 0.45);
        this.burst(now, 0.055, 1150 * j, 1.8, 0.28);
      }
    });
  }

  // ---- Lanterna ----
  playLanternPlace(): void {
    this.safe((now) => {
      this.tone(now, 180, 65, 0.06, 'triangle', 0.32);
      this.tone(now + 0.015, 1320, 1280, 0.14, 'sine', 0.16);
      this.tone(now + 0.025, 2640, 2590, 0.11, 'sine', 0.1);
      this.burst(now + 0.02, 0.14, 900, 1.5, 0.16, 'bandpass', 0.03);
    });
  }
  playLanternPickup(): void {
    this.safe((now) => {
      this.tone(now, 520, 880, 0.08, 'sine', 0.24);
      this.tone(now + 0.035, 1480, 1960, 0.1, 'sine', 0.15);
      this.burst(now, 0.05, 2400, 2.2, 0.14, 'bandpass');
    });
  }

  // ---- Dano ----
  playHurt(): void {
    this.safe((now) => {
      const j = 0.92 + Math.random() * 0.16;
      this.tone(now, 170 * j, 55, 0.13, 'triangle', 0.4);
      this.burst(now, 0.09, 420, 0.8, 0.3, 'lowpass');
    });
  }

  // ---- Coleta de item ou lasca ----
  playItemPickup(): void {
    this.safe((now) => {
      const j = 0.92 + Math.random() * 0.22;
      this.tone(now, 440 * j, 980 * j, 0.065, 'sine', 0.26);
    });
  }

  /** Comer (ADR 0060): duas mordidas secas de casca, com um estalo grave no fim. */
  playEat(): void {
    this.safe((now) => {
      const j = 0.92 + Math.random() * 0.16;
      this.burst(now, 0.05, 2200 * j, 1.4, 0.2, 'bandpass', 0.01);
      this.burst(now + 0.11, 0.06, 1700 * j, 1.2, 0.22, 'bandpass', 0.01);
      this.tone(now + 0.2, 220 * j, 140 * j, 0.09, 'triangle', 0.14);
    });
  }

  /** Raspar de pata na areia (Farejador de Duna em aviso, ADR 0061): ruído áspero curto e grave. */
  playScrape(): void {
    this.safe((now) => {
      const j = 0.9 + Math.random() * 0.2;
      this.burst(now, 0.16, 1500 * j, 0.7, 0.2, 'bandpass', 0.02);
      this.burst(now + 0.05, 0.12, 700 * j, 0.9, 0.16, 'lowpass', 0.01);
    });
  }

  /** Golpe no animal (ADR 0069): pancada seca e grave com um estalo curto. */
  playStrike(): void {
    this.safe((now) => {
      const j = 0.92 + Math.random() * 0.16;
      this.tone(now, 180 * j, 70 * j, 0.1, 'triangle', 0.3);
      this.burst(now, 0.07, 1300 * j, 0.8, 0.22, 'bandpass', 0.003);
    });
  }

  /** Ferramenta quebrou (ADR 0067): estalo seco, estilhaços e um tom que cai. */
  playToolBreak(): void {
    this.safe((now) => {
      const j = 0.94 + Math.random() * 0.12;
      this.burst(now, 0.05, 3200 * j, 0.9, 0.26, 'highpass', 0.002);
      this.burst(now + 0.04, 0.16, 2400 * j, 1.2, 0.2, 'bandpass', 0.004);
      this.burst(now + 0.09, 0.12, 1700 * j, 1.4, 0.14, 'bandpass', 0.004);
      this.tone(now + 0.02, 520 * j, 150 * j, 0.22, 'triangle', 0.16);
    });
  }

  // ---- Passos por superfície ----
  playFootstep(material: SurfaceMaterial = 'rock'): void {
    this.safe((now) => {
      const j = 0.88 + Math.random() * 0.24;
      if (material === 'sand') {
        this.burst(now, 0.11, 1900 * j, 1.0, 0.16, 'bandpass', 0.02);
        this.tone(now, 70 * j, 38, 0.05, 'sine', 0.12);
      } else if (material === 'ice') {
        this.tone(now, 210 * j, 85, 0.04, 'triangle', 0.16);
        this.burst(now, 0.05, 3600 * j, 2.8, 0.13, 'highpass');
      } else {
        this.tone(now, 115 * j, 46, 0.045, 'triangle', 0.2);
        this.burst(now, 0.045, 950 * j, 1.6, 0.12);
      }
    });
  }

  // ---- Síntese ----
  private tone(start: number, f0: number, f1: number, duration: number, type: OscillatorType, volume: number, lowpass?: number): void {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), start + duration);
    g.gain.setValueAtTime(volume, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + duration);
    if (lowpass) {
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(lowpass, start);
      osc.connect(lp).connect(g).connect(this.master);
    } else osc.connect(g).connect(this.master);
    osc.start(start);
    osc.stop(start + duration + 0.01);
  }

  /** Rajada de ruído filtrado: sobe em `attack` s e decai exponencialmente, a partir de um ponto aleatório do ruído (nunca soa igual). */
  private burst(start: number, duration: number, freq: number, q: number, volume: number, type: BiquadFilterType = 'bandpass', attack = 0.003): void {
    if (!this.ctx || !this.master || !this.noise) return;
    const src = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    src.buffer = this.noise;
    filter.type = type;
    filter.frequency.setValueAtTime(freq, start);
    filter.Q.setValueAtTime(q, start);
    g.gain.setValueAtTime(0.001, start);
    g.gain.linearRampToValueAtTime(volume, start + attack);
    g.gain.exponentialRampToValueAtTime(0.001, start + duration);
    src.connect(filter).connect(g).connect(this.master);
    src.start(start, Math.random() * 0.5, duration + 0.02);
  }
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

export const gameAudio = new GameSoundSynthesizer();
