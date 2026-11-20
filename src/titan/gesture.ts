import { DRAG_TOLERANCE_PX, HOLD_MS, breakProgress, crackStage, type TargetKind } from './breaking';

/**
 * Gesto primário do Titã (ADR 0042): **clique/toque curto coloca, segurar quebra, arrastar gira a câmera**. Máquina de estados pura (sem DOM, com o tempo
 * injetado em ms monotônicos), para testar a fronteira de 200 ms e o quadro atrasado sem navegador.
 *
 *  IDLE ──press(alvo)──▶ ARMED ──solta <200 ms, sem arrasto, alvo e face iguais──▶ coloca (uma vez) ──▶ IDLE
 *                          │ arrasto > tolerância ──▶ CAMERA_DRAG ──solta──▶ IDLE (sem ação)
 *                          │ ≥ 200 ms no mesmo bloco ──▶ BREAKING ──tempo total──▶ COMPLETED (uma ação) ──solta──▶ IDLE
 *                          │ alvo mudou antes dos 200 ms ou saiu do alcance ──▶ COMPLETED (consumido, sem ação) ──solta──▶ IDLE
 *  Continuar quebrando (ADR 0055): **segurando**, ao arrastar a mira para outro bloco, a quebra segue nele (tempo cheio, do zero). Em BREAKING, trocar de bloco quebrável recomeça no novo;
 *  depois de uma quebra (COMPLETED), arrastar além da tolerância e apontar um bloco quebrável recomeça a quebra. Sem arrastar não há quebra em série (o bloco de trás não cede sozinho).
 * O tempo é conferido também em `release`: uma pressão de 200 ms ou mais **nunca** vira colocação por atraso de quadro.
 */
export type GestureState = 'IDLE' | 'ARMED' | 'CAMERA_DRAG' | 'BREAKING' | 'COMPLETED';

export interface GestureTarget {
  x: number; y: number; z: number;
  /** Normal da face apontada (a colocação vai para a célula adjacente). */
  nx: number; ny: number; nz: number;
  /** Altura 0–1 do ponto apontado dentro da célula (laje superior × inferior ao colocar, ADR 0056). */
  hy?: number;
  kind: TargetKind;
  /** Id do bloco (kind 'block') e id da lasca (kind 'shard'). */
  block?: number;
  item?: string;
}

export interface ActionOutcome { ok: boolean }

export interface GestureHooks {
  /** Tempo total desde a pressão para concluir, ou null se o alvo não se quebra. */
  totalMs(t: GestureTarget): number | null;
  /** Coloca na célula adjacente. Valida antes de consumir o item; devolve se colocou. */
  place(t: GestureTarget): ActionOutcome;
  /** Conclui a quebra/recolhimento (revalidado pelo gesto); devolve se agiu (mochila cheia → falso). */
  complete(t: GestureTarget): ActionOutcome;
  /** Efeito visual: alvo e progresso 0–1 (estágio de rachadura 0–9); `null` limpa. Chamado a cada quadro durante a quebra. */
  effect(t: GestureTarget | null, progress: number, stage: number): void;
}

const sameCell = (a: GestureTarget | null, b: GestureTarget | null): boolean =>
  !!a && !!b && a.x === b.x && a.y === b.y && a.z === b.z && a.kind === b.kind && a.item === b.item;
const sameFace = (a: GestureTarget, b: GestureTarget): boolean => a.nx === b.nx && a.ny === b.ny && a.nz === b.nz;

export class InteractionGesture {
  state: GestureState = 'IDLE';
  /** Resultado da última ação do gesto atual (testes e mensagens). */
  lastOutcome: 'placed' | 'broke' | 'failed' | 'cancelled' | null = null;
  private pointer: number | string | null = null;
  private t0 = 0;
  private start: GestureTarget | null = null;
  private total: number | null = null;
  /** O gesto já chegou a quebrar (BREAKING): só então arrastar a mira recomeça a quebra no próximo bloco. */
  private mined = false;
  /** Último valor de arrasto recebido (toque: distância do ponto de pressão; mouse: movimento acumulado) e o valor na última (re)partida/conclusão. */
  private lastDist = 0;
  private dragBase = 0;

  constructor(private readonly hooks: GestureHooks, private readonly holdMs = HOLD_MS, private readonly dragTolerance = DRAG_TOLERANCE_PX) {}

  /** Há um ponteiro com gesto em andamento (qualquer estado fora de IDLE). */
  get active(): boolean { return this.state !== 'IDLE'; }
  get activePointer(): number | string | null { return this.pointer; }

  /**
   * Pressionou. `target` null (céu, fora do alcance) = só câmera. Devolve se o gesto aceitou o ponteiro: com outro gesto em andamento recusa, e um
   * segundo ponteiro nunca dispara a ação armada pelo primeiro.
   */
  press(pointer: number | string, now: number, target: GestureTarget | null): boolean {
    if (this.state !== 'IDLE') return false;
    this.pointer = pointer;
    this.t0 = now;
    this.lastOutcome = null;
    this.mined = false; this.lastDist = 0; this.dragBase = 0;
    if (!target) { this.start = null; this.total = null; this.state = 'CAMERA_DRAG'; return true; }
    this.start = { ...target };
    this.total = this.hooks.totalMs(target);
    this.state = 'ARMED';
    return true;
  }

  /** Distância do ponteiro até onde pressionou (toque) ou movimento relativo acumulado (mouse capturado), em px. */
  drag(pointer: number | string, distancePx: number): void {
    if (pointer !== this.pointer) return;
    this.lastDist = distancePx;
    if (this.state === 'ARMED' && distancePx > this.dragTolerance) this.state = 'CAMERA_DRAG'; // entrega o movimento à câmera; ao soltar, nada acontece
  }

  /** Chamar a cada quadro com a mira atual (ou null). */
  update(now: number, target: GestureTarget | null): void {
    if (this.state === 'ARMED') {
      if (!sameCell(target, this.start)) { this.consume('cancelled'); return; } // alvo mudou ou saiu do alcance: consome até soltar
      if (now - this.t0 >= this.holdMs) {
        if (this.total === null) { this.consume('cancelled'); return; } // nada a quebrar (rocha-mãe)
        this.state = 'BREAKING';
        this.mined = true;
        this.tick(now, target!);
      }
    } else if (this.state === 'BREAKING') this.tick(now, target);
    else if (this.state === 'COMPLETED' && this.mined && Math.abs(this.lastDist - this.dragBase) > this.dragTolerance && target && this.hooks.totalMs(target) !== null) this.begin(now, target); // arrastou depois de quebrar: segue no próximo
  }

  /** Começa (ou recomeça) a quebra de `target` com o gesto ainda pressionado: tempo cheio, do zero. */
  private begin(now: number, target: GestureTarget): void {
    this.start = { ...target };
    this.total = this.hooks.totalMs(target);
    this.t0 = now;
    this.dragBase = this.lastDist;
    this.lastElapsed = 0;
    this.mined = true;
    this.state = 'BREAKING';
    this.tick(now, target);
  }

  /** Soltou. O tempo vem do evento de soltar (`pointerup`/`mouseup`), não do quadro. */
  release(pointer: number | string, now: number, target: GestureTarget | null): void {
    if (pointer !== this.pointer) return; // outro ponteiro não encerra o gesto
    const elapsed = now - this.t0;
    if (this.state === 'ARMED') {
      if (elapsed < this.holdMs) {
        // toque curto: só coloca se não virou arrasto e o alvo e a face continuam os mesmos
        if (sameCell(target, this.start) && target && this.start && sameFace(target, this.start)) this.doPlace(this.start);
      } else if (this.total !== null && elapsed >= this.total && sameCell(target, this.start)) {
        this.doComplete(target!); // quadro atrasado: já passou do tempo total, a quebra vale; nunca vira colocação
      }
    } else if (this.state === 'BREAKING') {
      if (this.total !== null && elapsed >= this.total && sameCell(target, this.start)) this.doComplete(target!);
    }
    this.reset();
  }

  /** Cancelamento externo (ponteiro cancelado, perda de foco ou de captura, menu aberto): limpa o gesto e o efeito, sem ação. */
  cancel(): void {
    if (this.state !== 'IDLE') this.lastOutcome = 'cancelled';
    this.reset();
  }

  /** Progresso atual 0–1 da quebra (0 fora de BREAKING). */
  get progress(): number { return this.state === 'BREAKING' && this.total !== null ? breakProgress(this.lastElapsed, this.total) : 0; }
  private lastElapsed = 0;

  private tick(now: number, target: GestureTarget | null): void {
    if (!sameCell(target, this.start)) { // trocou de bloco: segue no novo se quebra; sem alvo ou rocha-mãe, espera o próximo arrasto
      if (target && this.hooks.totalMs(target) !== null) { this.begin(now, target); return; }
      this.dragBase = this.lastDist;
      this.consume('cancelled');
      return;
    }
    const elapsed = now - this.t0;
    this.lastElapsed = elapsed;
    if (this.total !== null && elapsed >= this.total) { this.doComplete(target!); return; }
    const p = this.total === null ? 0 : breakProgress(elapsed, this.total);
    this.hooks.effect(target, p, crackStage(p)); // mudar só a face do mesmo bloco mantém o progresso
  }

  private doPlace(t: GestureTarget): void {
    this.lastOutcome = this.hooks.place(t).ok ? 'placed' : 'failed';
  }

  /** Uma única ação por gesto: depois dela o gesto fica consumido até soltar. */
  private doComplete(t: GestureTarget): void {
    this.lastOutcome = this.hooks.complete(t).ok ? 'broke' : 'failed';
    this.hooks.effect(null, 0, 0);
    this.dragBase = this.lastDist;
    this.state = 'COMPLETED';
  }

  private consume(outcome: 'cancelled'): void {
    this.lastOutcome = outcome;
    this.hooks.effect(null, 0, 0);
    this.state = 'COMPLETED';
  }

  private reset(): void {
    this.hooks.effect(null, 0, 0);
    this.state = 'IDLE';
    this.pointer = null;
    this.start = null;
    this.total = null;
    this.lastElapsed = 0;
    this.mined = false;
  }
}
