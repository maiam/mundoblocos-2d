import type { ToolId } from '../world/items';
import type { HeroBody } from './entities';

/**
 * Tempo do golpe do jogador por personagem e ferramenta (v0.93.64): quanto dura a animação e em que fração dela o acerto é
 * resolvido. O padrão (4 quadros) é 0,36 s com acerto em 45%; a folha de 8 quadros do Hood com a espada (o golpe só aparece no
 * 5º quadro) dura 0,48 s e acerta em 56% — no meio do arco desenhado. Sem DOM (a sala usa o mesmo tempo para animar os outros).
 */
export interface AttackTiming {
  /** Duração da animação do golpe (s). */
  seconds: number;
  /** Fração da animação em que o acerto é resolvido. */
  hitAt: number;
}

export const DEFAULT_ATTACK_TIMING: AttackTiming = { seconds: 0.36, hitAt: 0.45 };
export const HOOD_SWORD_TIMING: AttackTiming = { seconds: 0.48, hitAt: 0.56 };

export function attackTimingFor(body: HeroBody, tool: ToolId | null): AttackTiming {
  return body === 'hood' && tool === 'sword' ? HOOD_SWORD_TIMING : DEFAULT_ATTACK_TIMING;
}
