/**
 * Modo de tela em dispositivos de toque: o jogo é jogado na HORIZONTAL.
 *
 * - No primeiro toque (gesto exigido pelos navegadores), pede tela cheia e,
 *   onde suportado (Android/Chrome), trava a orientação em paisagem.
 * - Onde o navegador não permite (ex.: Safari no iPhone, iframes restritos),
 *   a garantia é a camada "Gire o aparelho", que cobre o jogo enquanto o
 *   aparelho estiver em retrato.
 * - Se o jogador sair da tela cheia, o próximo toque volta a pedi-la.
 * No desktop nada muda (janela já é horizontal; F11 fica a critério do usuário).
 */

type FsElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type FsDocument = Document & { webkitFullscreenElement?: Element | null };
type LockableOrientation = ScreenOrientation & { lock?: (o: 'landscape') => Promise<void> };

export class ScreenMode {
  readonly isTouch = window.matchMedia('(pointer: coarse)').matches;
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
      const onGesture = () => void this.enterLandscapeFullscreen();
      window.addEventListener('pointerup', onGesture, true);
      this.cleanup.push(() => window.removeEventListener('pointerup', onGesture, true));
    }
    this.updateOverlay();
  }

  /** Em retrato num aparelho de toque, o jogo fica bloqueado pela camada de rotação. */
  get blocked(): boolean {
    return this.isTouch && this.portraitQuery.matches;
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
