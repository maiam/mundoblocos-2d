/**
 * Agenda dos NPCs (ADR 0034, nível 1 — rotina): puro, sem DOM nem sorteio. Dado o relógio do mundo (`time`, 0 = meia-noite, 0,5 = meio-dia, o mesmo
 * de `render/daycycle.ts`), diz em que fase do dia o NPC está. Hoje só o mercador (Bento) tem agenda; quem não tem continua passeando como antes.
 */
export type NpcPhase = 'asleep' | 'opening' | 'open' | 'closing';

/** Horas do dia (0–24) em que cada fase começa; a que não está na lista entre `sleepAt` e `wakeAt` é dormir. */
export interface DaySchedule {
  /** Acorda (aparece; a loja ainda está fechada, ele arruma o balcão). */
  wakeAt: number;
  /** Abre a loja. */
  openAt: number;
  /** Fecha a loja (ainda fica no balcão, arrumando). */
  closeAt: number;
  /** Vai dormir (some pela porta dos fundos). */
  sleepAt: number;
}

/** Bento (Mercado): acorda às 6h, abre às 7h (a manhã de um mundo novo, 7h26, já é com a loja aberta), fecha às 19h30 e dorme às 21h. */
export const BENTO_SCHEDULE: DaySchedule = { wakeAt: 6, openAt: 7, closeAt: 19.5, sleepAt: 21 };

const SCHEDULES: Readonly<Record<string, DaySchedule>> = { bento: BENTO_SCHEDULE };

/** Agenda de um NPC (null = sem agenda: passeia como sempre). */
export function scheduleOf(npc: string): DaySchedule | null {
  return SCHEDULES[npc] ?? null;
}

/** Hora do dia (0 ≤ h < 24) do relógio do mundo. */
export function hourOf(time: number): number {
  return (((time % 1) + 1) % 1) * 24;
}

export function phaseAt(s: DaySchedule, time: number): NpcPhase {
  const h = hourOf(time);
  if (h >= s.wakeAt && h < s.openAt) return 'opening';
  if (h >= s.openAt && h < s.closeAt) return 'open';
  if (h >= s.closeAt && h < s.sleepAt) return 'closing';
  return 'asleep';
}

/** A loja está aberta (atende)? */
export function shopOpen(s: DaySchedule | null, time: number): boolean {
  return !s || phaseAt(s, time) === 'open';
}

/** Está dormindo (fora do mapa)? */
export function isAsleep(s: DaySchedule | null, time: number): boolean {
  return !!s && phaseAt(s, time) === 'asleep';
}

/** O que o atendente diz quando a loja está fechada e ele ainda está à vista (arrumando o balcão). */
export function closedLine(phase: NpcPhase): string {
  return phase === 'opening'
    ? 'Ainda estou arrumando as prateleiras! Abro a loja daqui a pouco, volte logo mais.'
    : 'Já fechei por hoje! Estou guardando as mercadorias. Volte amanhã cedo.';
}
