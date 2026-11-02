/**
 * Menu recolhível (☰ no canto superior direito): continuar, novo mundo, recomeçar este mundo.
 * Mostra se o progresso está sendo salvo automaticamente. Apresentação pura; ações vêm do Game/main.
 */
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
  private open = false;

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
      <button data-act="restart">Recomeçar este mundo</button>`;
    this.statusEl = this.panel.querySelector('.menu-status')!;
    this.panel.addEventListener('click', (e) => {
      const act = (e.target as HTMLElement).closest('button')?.dataset.act;
      if (act === 'continue') this.toggle(false);
      if (act === 'new' && window.confirm('Criar um novo mundo? O progresso deste mundo continua salvo.')) h.onNewWorld?.();
      if (act === 'restart' && window.confirm('Recomeçar este mundo do zero? O progresso salvo dele será apagado.')) h.onRestart?.();
    });
    root.append(this.button, this.panel);
  }

  get isOpen(): boolean {
    return this.open;
  }

  toggle(force?: boolean): void {
    this.open = force ?? !this.open;
    this.panel.hidden = !this.open;
    this.button.setAttribute('aria-expanded', String(this.open));
    this.h.onOpenChange(this.open); // abrir salva; o estado mostrado já reflete esse salvamento
    if (this.open) this.statusEl.textContent = this.h.status();
  }
}
