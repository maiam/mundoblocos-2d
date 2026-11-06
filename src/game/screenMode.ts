/**
 * Modo de tela em dispositivos de toque: o jogo é jogado na HORIZONTAL.
 *
 * - No primeiro toque (gesto exigido pelos navegadores), pede tela cheia e,
 *   onde suportado (Android/Chrome), trava a orientação em paisagem.
 * - Onde o navegador não permite (ex.: Safari no iPhone, iframes restritos),
 *   a garantia é a camada "Gire o aparelho", que cobre o jogo enquanto o
 *   aparelho estiver em retrato.
 * - Se o jogador sair da tela cheia, o próximo toque volta a pedi-la — menos ao tocar num campo de texto ou com um
 *   campo em foco: o teclado na tela tira o navegador da tela cheia, e pedi-la de novo fechava o teclado em loop
 *   (não dava para digitar o nome no "Jogar com amigos" no tablet).
 * No desktop nada muda (janela já é horizontal; F11 fica a critério do usuário).
 */

type FsElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type FsDocument = Document & { webkitFullscreenElement?: Element | null };
type LockableOrientation = ScreenOrientation & { lock?: (o: 'landscape') => Promise<void> };

export class ScreenMode {
  readonly isTouch = window.matchMedia('(pointer: coarse)').matches;
  /**
   * Tablet: tela de toque cujo lado menor tem ≥ 600 px (celular deitado fica em ~360–430 px; iPad/tablets ≥ 744).
   * No tablet o toque na tela também age como o clique do computador (além do botão de ação e do joystick).
   */
  readonly isTablet = isTabletScreen(this.isTouch, window.screen.width, window.screen.height);
  private readonly portraitQuery = window.matchMedia('(orientation: portrait)');
  private readonly overlay: HTMLElement;
  private readonly cleanup: (() => void)[] = [];

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'rotate-overlay';
    this.overlay.setAttribute('role', 'alert');
    this.overlay.innerHTML = `
      <div class="rotate-phone" aria-hidden="true"><span></span></div>
      <p>Gire o aparelho para jogar na horizontal</p>`;
    document.body.appendChild(this.overlay);

    const update = () => this.updateOverlay();
    this.portraitQuery.addEventListener('change', update);
    window.addEventListener('resize', update);
    this.cleanup.push(() => {
      this.portraitQuery.removeEventListener('change', update);
      window.removeEventListener('resize', update);
    });
    if (this.isTouch) {
      const onGesture = (e: Event) => {
        if (isTextField(e.target) || isTextField(document.activeElement)) return; // digitando: deixa o teclado em paz
        void this.enterLandscapeFullscreen();
      };
      window.addEventListener('pointerup', onGesture, true);
      this.cleanup.push(() => window.removeEventListener('pointerup', onGesture, true));
    }
    this.blockPageZoom();
    this.updateOverlay();
  }

  /** Em retrato num aparelho de toque, o jogo fica bloqueado pela camada de rotação. */
  get blocked(): boolean {
    return this.isTouch && this.portraitQuery.matches;
  }

  /**
   * O jogo nunca deixa o navegador ampliar a página: o Safari (iPhone/iPad) ignora `user-scalable=no` e amplia com
   * toque duplo ou pinça — tocar rápido no botão de ação ampliava a tela e a deixava "travada" fora do lugar.
   * Bloqueia o segundo toque rápido, a pinça (`gesture*`, só Safari) e o duplo clique. Campos de texto ficam livres.
   */
  private blockPageZoom(): void {
    let lastTap = 0;
    const onTouchEnd = (e: TouchEvent) => {
      // Botões e campos não ampliam (touch-action: manipulation) e precisam do clique de cada toque rápido
      // (bolsa, grade); o bloqueio vale para o resto da tela.
      if (e.target instanceof Element && e.target.closest('button, input, textarea, select, a, label')) return;
      const now = e.timeStamp;
      if (now - lastTap < DOUBLE_TAP_MS && e.cancelable) e.preventDefault();
      lastTap = now;
    };
    const stop = (e: Event) => { if (e.cancelable) e.preventDefault(); };
    const pinch = (e: TouchEvent) => { if (e.touches.length > 1 && e.cancelable) e.preventDefault(); };
    document.addEventListener('touchend', onTouchEnd, { passive: false });
    document.addEventListener('touchmove', pinch, { passive: false });
    document.addEventListener('dblclick', stop, { passive: false });
    for (const g of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(g, stop, { passive: false });
    this.cleanup.push(() => {
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchmove', pinch);
      document.removeEventListener('dblclick', stop);
      for (const g of ['gesturestart', 'gesturechange', 'gestureend']) document.removeEventListener(g, stop);
    });
  }

  private updateOverlay(): void {
    this.overlay.hidden = !this.blocked;
  }

  private get isFullscreen(): boolean {
    const d = document as FsDocument;
    return !!(document.fullscreenElement ?? d.webkitFullscreenElement);
  }

  /** Pede tela cheia + trava em paisagem. Falhas são esperadas e ignoradas (a camada garante). */
  private async enterLandscapeFullscreen(): Promise<void> {
    if (!this.isFullscreen) {
      const el = document.documentElement as FsElement;
      try {
        if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
        else await el.webkitRequestFullscreen?.();
      } catch {
        return; // navegador/iframe não permite: segue com a camada de rotação
      }
    }
    try {
      await (screen.orientation as LockableOrientation | undefined)?.lock?.('landscape');
    } catch {
      // Sem trava de orientação (ex.: iOS): a camada de rotação cobre o retrato.
    }
  }

  destroy(): void {
    for (const fn of this.cleanup) fn();
    this.overlay.remove();
  }
}

/** Campo onde se digita (abre o teclado na tela). */
/** Dois toques mais próximos que isto (ms) seriam o "toque duplo" que amplia a página no Safari. */
const DOUBLE_TAP_MS = 350;

function isTextField(el: EventTarget | Element | null): boolean {
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || (el instanceof HTMLElement && el.isContentEditable);
}

/** Lado menor da tela ≥ 600 px num aparelho de toque = tablet (função pura, testável). */
export function isTabletScreen(touch: boolean, w: number, h: number): boolean {
  return touch && Math.min(w, h) >= 600;
}
