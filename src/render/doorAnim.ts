/**
 * Animação da porta (aparência apenas): 8 quadros, 0..3 abrindo e 4..7 fechando; fechada = 0, aberta = 3. A máquina de estados
 * é a MESMA do `Renderer` 2D e do 3D (ADR 0031, M3.4): a primeira vez que a porta é vista não anima; ao mudar de estado
 * anima por `DOOR_ANIM_S`.
 */
export const DOOR_ANIM_S = 0.32;

/** Quadro (0..7) de uma porta no instante `t` desde a mudança de estado; `open` = estado final. */
export function doorFrame(open: boolean, t: number): number {
  const step = Math.min(3, Math.floor(t * 4));
  return t < 1 ? (open ? step : 4 + step) : open ? 3 : 0;
}

/** Memória do estado visto por porta: detecta a mudança aberta ↔ fechada e devolve o quadro a desenhar. */
export class DoorAnimator {
  private readonly seen = new Map<number, { open: boolean; since: number }>();

  /** `key` identifica a porta (ex.: `x * 100003 + y`); `elapsed` em segundos. */
  frameFor(key: number, open: boolean, elapsed: number): number {
    let st = this.seen.get(key);
    if (!st) {
      if (this.seen.size > 1024) this.seen.clear();
      st = { open, since: -Infinity }; // primeira vez vista: sem animação
      this.seen.set(key, st);
    } else if (st.open !== open) {
      st.open = open;
      st.since = elapsed;
    }
    return doorFrame(open, (elapsed - st.since) / DOOR_ANIM_S);
  }

  /** A porta ainda está no meio da animação (precisa de redesenho a cada quadro)? */
  animating(key: number, elapsed: number): boolean {
    const st = this.seen.get(key);
    return !!st && (elapsed - st.since) / DOOR_ANIM_S < 1;
  }
}

export const doorKey = (x: number, y: number): number => x * 100003 + y;
