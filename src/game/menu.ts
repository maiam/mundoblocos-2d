/**
 * Menu recolhível (☰ no canto superior direito): continuar, novo mundo, recomeçar este mundo.
 * Mostra se o progresso está sendo salvo automaticamente. Apresentação pura; ações vêm do Game/main.
 * Confirmação dentro do próprio painel (tocar de novo): `window.confirm` é bloqueado em iframes sem
 * `allow-modals` (caso do Artifact) e devolve false sem mostrar nada — o botão parecia não funcionar.
 */
const CONFIRM_MS = 5000;
const CONFIRM_TEXT: Record<'new' | 'restart', [string, string]> = {
  new: ['Toque de novo para criar', 'Um mundo novo com outra semente. O progresso deste mundo continua salvo.'],
  restart: ['Toque de novo para recomeçar', 'Este mundo volta do zero e o progresso salvo dele é apagado.'],
};
export interface MenuHandlers {
  /** Texto de estado do salvamento (ex.: "Salvo automaticamente · há 5 s"). */
  status(): string;
  seed: number;
  onOpenChange(open: boolean): void;
  onNewWorld?(): void;
  onRestart?(): void;
}

export class Menu {
  private readonly button: HTMLButtonElement;
  private readonly panel: HTMLElement;
  private readonly statusEl: HTMLElement;
  private readonly confirmEl: HTMLElement;
  private open = false;
  /** Ação esperando o segundo toque (e quando expira). */
  private pending: { act: 'new' | 'restart'; until: number } | null = null;

  constructor(root: HTMLElement, private readonly h: MenuHandlers) {
    this.button = document.createElement('button');
    this.button.className = 'menu-button';
    this.button.setAttribute('aria-label', 'Menu');
    this.button.setAttribute('aria-expanded', 'false');
    this.button.innerHTML = '<span></span><span></span><span></span>';
    this.button.addEventListener('click', () => this.toggle());
    this.panel = document.createElement('div');
    this.panel.className = 'menu-panel';
    this.panel.hidden = true;
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-label', 'Menu do jogo');
    this.panel.innerHTML = `
      <h2>MundoBlocos</h2>
      <p class="menu-status"></p>
      <p class="menu-seed">Semente do mundo: <b>${h.seed}</b></p>
      <button data-act="continue" class="primary">Continuar</button>
      <button data-act="new">Novo mundo</button>
      <button data-act="restart">Recomeçar este mundo</button>
      <p class="menu-confirm" hidden></p>`;
    this.statusEl = this.panel.querySelector('.menu-status')!;
    this.confirmEl = this.panel.querySelector('.menu-confirm')!;
    this.panel.addEventListener('click', (e) => {
      const act = (e.target as HTMLElement).closest('button')?.dataset.act;
      if (act === 'continue') this.toggle(false);
      if (act === 'new' || act === 'restart') this.ask(act);
    });
    root.append(this.button, this.panel);
  }

  /** 1º toque: pede confirmação no próprio botão; 2º toque (em até 5 s): executa. */
  private ask(act: 'new' | 'restart'): void {
    const p = this.pending;
    if (p && p.act === act && performance.now() < p.until) {
      this.resetConfirm();
      if (act === 'new') this.h.onNewWorld?.();
      else this.h.onRestart?.();
      return;
    }
    this.resetConfirm();
    this.pending = { act, until: performance.now() + CONFIRM_MS };
    const btn = this.panel.querySelector<HTMLButtonElement>(`[data-act="${act}"]`)!;
    btn.dataset.label = btn.textContent ?? '';
    btn.textContent = CONFIRM_TEXT[act][0];
    btn.classList.add('confirming');
    this.confirmEl.textContent = CONFIRM_TEXT[act][1];
    this.confirmEl.hidden = false;
  }

  private resetConfirm(): void {
    this.pending = null;
    this.confirmEl.hidden = true;
    for (const b of this.panel.querySelectorAll<HTMLButtonElement>('button.confirming')) {
      b.textContent = b.dataset.label ?? b.textContent;
      b.classList.remove('confirming');
    }
  }

  get isOpen(): boolean {
    return this.open;
  }

  toggle(force?: boolean): void {
    this.open = force ?? !this.open;
    this.resetConfirm();
    this.panel.hidden = !this.open;
    this.button.setAttribute('aria-expanded', String(this.open));
    this.h.onOpenChange(this.open); // abrir salva; o estado mostrado já reflete esse salvamento
    if (this.open) this.statusEl.textContent = this.h.status();
  }
}
