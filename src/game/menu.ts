import { MAX_PLAYERS, NAME_MAX, ROOMS, sanitizeName } from '../net/protocol';

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
  /** Multiplayer (ADR 0016): sem `online` o menu não mostra "Jogar com amigos" (ex.: Santuário). */
  online?: {
    /** Na sala: nome dela e quantos estão nela (sem `room` = jogando sozinho). */
    room?: string;
    players?(): number;
    /** Nome usado da última vez (lembrado no aparelho). */
    name: string;
    /** Este endereço conecta ao servidor? Falso no Artifact e nas prévias: o menu mostra o link do site. */
    available: boolean;
    /** Site onde jogar com amigos (link do aviso). */
    site: string;
    /** Quantos estão em cada sala agora (mostrado ao abrir o menu); null = servidor sem resposta. */
    counts?(): Promise<Record<number, { players: number; max: number }> | null>;
    onJoin(name: string, room: number): void;
    onLeave(): void;
  };
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
    // Duas partes: o menu do jogo e "Jogar com amigos" — no celular deitado ficam lado a lado (cabem sem rolar).
    this.panel.innerHTML = `
      <div class="menu-main">
      <h2>Orvalis</h2>
      <p class="menu-status"></p>
      <p class="menu-seed">Semente do mundo: <b>${h.seed}</b></p>
      <button data-act="continue" class="primary">Continuar</button>
      ${h.online?.room ? '' : `<button data-act="new">Novo mundo</button>
      <button data-act="restart">Recomeçar este mundo</button>`}
      <p class="menu-confirm" hidden></p>
      </div>
      ${h.online ? onlineSection(h.online) : ''}`;
    this.statusEl = this.panel.querySelector('.menu-status')!;
    this.confirmEl = this.panel.querySelector('.menu-confirm')!;
    this.onlineMsg = this.panel.querySelector('.menu-online-msg');
    this.panel.addEventListener('click', (e) => {
      const act = (e.target as HTMLElement).closest('button')?.dataset.act;
      if (act === 'continue') this.toggle(false);
      if (act === 'new' || act === 'restart') this.ask(act);
      if (act === 'join') this.goOnline(Number((e.target as HTMLElement).closest('button')!.dataset.room));
      if (act === 'leave') this.h.online?.onLeave();
    });
    root.append(this.button, this.panel);
  }

  private readonly onlineMsg: HTMLElement | null;

  /** Mensagem na área "Jogar com amigos" (ex.: "Conectando…", erro do servidor). */
  onlineMessage(text: string): void {
    if (!this.onlineMsg) return;
    this.onlineMsg.textContent = text;
    this.onlineMsg.hidden = !text;
  }

  private goOnline(room: number): void {
    const o = this.h.online;
    if (!o) return;
    const name = this.panel.querySelector<HTMLInputElement>('.menu-name')!.value;
    if (!sanitizeName(name)) return this.onlineMessage('Nome: de 2 a 16 letras ou números.');
    this.onlineMessage('Conectando…');
    o.onJoin(name, room);
  }

  /** Ao abrir: quantos estão em cada sala (sem resposta, fica sem número). */
  private refreshCounts(): void {
    void this.h.online?.counts?.().then((c) => {
      for (const el of this.panel.querySelectorAll<HTMLElement>('.menu-room-count')) {
        const n = c?.[Number(el.dataset.room)];
        el.textContent = n ? `${n.players}/${n.max}` : '';
      }
    });
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
    if (this.open) {
      this.statusEl.textContent = this.h.status();
      const count = this.panel.querySelector('.menu-players');
      if (count && this.h.online?.players) count.textContent = String(this.h.online.players());
      if (!this.h.online?.room) this.refreshCounts();
    }
  }
}

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Área "Jogar com amigos": salas fixas (entrar quando quiser) ou, na sala, qual é e sair. */
function onlineSection(o: NonNullable<MenuHandlers['online']>): string {
  if (o.room) {
    return `<div class="menu-online">
      <h3>Jogando com amigos</h3>
      <p>Você está na <b class="menu-room">${esc(o.room)}</b><br>Na sala: <b class="menu-players">1</b> de ${MAX_PLAYERS}<br>
        <small>O que se faz aqui fica salvo na sala, e a sua bolsa fica guardada até você voltar.</small></p>
      <button data-act="leave">Sair da sala</button>
    </div>`;
  }
  if (!o.available) {
    return `<div class="menu-online">
      <h3>Jogar com amigos</h3>
      <p class="menu-online-off">Aqui só dá para jogar sozinho. Para jogar com amigos, abra o jogo no site:</p>
      <a class="menu-online-site" href="${esc(o.site)}" target="_blank" rel="noopener" title="Abrir o site do Orvalis"
        aria-label="Abrir o site do Orvalis para jogar com amigos">🌐 ${esc(o.site.replace(/^https?:\/\//, ''))}</a>
    </div>`;
  }
  const rooms = ROOMS.map((r) => `<button data-act="join" data-room="${r.id}" class="menu-room-btn" title="Entrar na ${esc(r.name)}"
        aria-label="Entrar na ${esc(r.name)}">🌍 ${esc(r.name)} <span class="menu-room-count" data-room="${r.id}"></span></button>`).join('');
  return `<div class="menu-online">
      <h3>Jogar com amigos</h3>
      <input class="menu-name" maxlength="${NAME_MAX}" placeholder="Seu nome" value="${esc(o.name)}" autocomplete="nickname">
      ${rooms}
      <p class="menu-online-msg" hidden></p>
    </div>`;
}
