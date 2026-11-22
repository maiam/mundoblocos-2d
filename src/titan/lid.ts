/**
 * Tampa do Baú de Rocha e Junco (ADR 0093): regras puras da animação, sem DOM nem THREE. A tampa gira em torno da dobradiça (atrás do baú) até `LID_OPEN_ANGLE`
 * enquanto o painel do baú está aberto e volta a fechar quando ele fecha; só o desenho muda, o estado do baú (`session.chests`) não sabe da tampa.
 */
/** Abertura máxima da tampa, em radianos (≈ 109°: a tampa fica quase em pé, apoiada para trás). */
export const LID_OPEN_ANGLE = 1.9;
/** Velocidade de abertura e fechamento, em rad/s (abre em ~0,35 s). */
export const LID_RATE = 5.5;

/** Um passo da animação: aproxima o ângulo de `LID_OPEN_ANGLE` (aberto) ou de 0 (fechado) sem passar do alvo. `dt` em segundos (limitado a 0,25 s para um quadro perdido não pular a animação). */
export function stepLid(angle: number, open: boolean, dt: number): number {
  const target = open ? LID_OPEN_ANGLE : 0, step = LID_RATE * Math.min(Math.max(dt, 0), 0.25);
  return angle < target ? Math.min(target, angle + step) : Math.max(target, angle - step);
}

/** Som da tampa (ADR 0096): a transição do painel do baú (`antes` → `agora`) decide o rangido de abrir ou a batida de fechar; sem mudança, nada. */
export const lidSound = (before: boolean, now: boolean): 'open' | 'close' | null => (before === now ? null : now ? 'open' : 'close');

/** A tampa ainda está em movimento (ou aberta)? Quando é falso e fechada, o renderer deixa de acompanhá-la. */
export const lidIdle = (angle: number, open: boolean): boolean => (open ? angle >= LID_OPEN_ANGLE : angle <= 0);
