/**
 * Modo de tela em dispositivos de toque (ADR 0030): o jogo funciona na HORIZONTAL **e** na VERTICAL; a orientação é escolha do jogador.
 *
 * - No primeiro toque (gesto exigido pelos navegadores), pede tela cheia. **Não trava a orientação** (antes travava em paisagem e,
 *   onde não dava, cobria o jogo com "Gire o aparelho"): quem quiser jogar em pé, joga em pé.
 * - Se o jogador sair da tela cheia, o próximo toque volta a pedi-la — menos ao tocar num campo de texto ou com um
 *   campo em foco (e ao focar um campo sai da tela cheia, senão o Safari do iPad avisa "digitando em tela cheia"): o teclado na tela tira o navegador da tela cheia, e pedi-la de novo fechava o teclado em loop
 *   (não dava para digitar o nome no "Jogar com amigos" no tablet).
 * - Expõe `data-orientation` (`portrait`/`landscape`) e `data-device` (`phone`/`tablet`/`desktop`) em `<html>` para o CSS e `isPortrait`
 *   para a câmera (a vertical mostra mais mundo na altura e menos na largura).
 * No desktop nada muda (janela já é horizontal; F11 fica a critério do usuário).
 */

type FsElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type FsDocument = Document & { webkitFullscreenElement?: Element | null };

export class ScreenMode {
  readonly isTouch = window.matchMedia('(pointer: coarse)').matches;
  /**
   * Tablet: tela de toque cujo lado menor tem ≥ 600 px (celular deitado fica em ~360–430 px; iPad/tablets ≥ 744).
   * No tablet o toque na tela também age como o clique do computador (além do botão de ação e do joystick).
   */
  readonly isTablet = isTabletScreen(this.isTouch, window.screen.width, window.screen.height);
  private readonly portraitQuery = window.matchMedia('(orientation: portrait)');
  private readonly cleanup: (() => void)[] = [];
  private wasFullscreen = false;
  /** Há dedo na tela (ou levantou há menos de 0,8 s): só então a saída é tratada como acidente do toque (ADR 0077). */
  private down = 0;
  private lastUp = -1e9;
  private touchRecent(): boolean { return this.down > 0 || performance.now() - this.lastUp < TOUCH_RECENT_MS; }
  /** A saída da tela cheia foi nossa (campo de texto em foco): não volta sozinha. */
  private intentionalExit = false;

  constructor() {
    const update = () => this.syncAttributes();
    this.portraitQuery.addEventListener('change', update);
    window.addEventListener('resize', update);
    this.cleanup.push(() => {
      this.portraitQuery.removeEventListener('change', update);
      window.removeEventListener('resize', update);
    });
    if (this.isTouch) {
      const onGesture = (e: Event) => {
        if (isTextField(e.target) || isTextField(document.activeElement)) return; // digitando: deixa o teclado em paz
        void this.enterFullscreen();
      };
      window.addEventListener('pointerup', onGesture, true);
      this.cleanup.push(() => window.removeEventListener('pointerup', onGesture, true));
      // Campo de texto em foco dentro da tela cheia: o Safari do iPad mostra "Parece que você está digitando em tela cheia".
      // Sai da tela cheia ao focar; o toque seguinte fora do campo volta a pedi-la (onGesture ignora campos em foco).
      // Saída inesperada da tela cheia (gesto de borda do sistema, voltar, barra que aparece) com o dedo ainda na tela: volta na hora, enquanto o toque ainda vale como gesto do usuário (ADR 0077)
      const onFsChange = () => { const now = this.isFullscreen, was = this.wasFullscreen; this.wasFullscreen = now; if (shouldReenter(was, now, this.intentionalExit, document.visibilityState === 'visible', this.touchRecent())) void this.enterFullscreen(); if (!now) this.intentionalExit = false; };
      const onDown = () => { this.down++; };
      const onUp = () => { this.down = Math.max(0, this.down - 1); this.lastUp = performance.now(); };
      window.addEventListener('pointerdown', onDown, true); window.addEventListener('pointerup', onUp, true); window.addEventListener('pointercancel', onUp, true);
      this.cleanup.push(() => { window.removeEventListener('pointerdown', onDown, true); window.removeEventListener('pointerup', onUp, true); window.removeEventListener('pointercancel', onUp, true); });
      document.addEventListener('fullscreenchange', onFsChange);
      document.addEventListener('webkitfullscreenchange', onFsChange);
      this.cleanup.push(() => { document.removeEventListener('fullscreenchange', onFsChange); document.removeEventListener('webkitfullscreenchange', onFsChange); });
      const onFocus = (e: Event) => { if (isTextField(e.target)) void this.exitFullscreen(); };
      document.addEventListener('focusin', onFocus, true);
      this.cleanup.push(() => document.removeEventListener('focusin', onFocus, true));
    }
    this.blockPageZoom();
    this.syncAttributes();
  }

  /** A tela está em pé (altura maior que a largura)? Vale também no computador (janela estreita). */
  get isPortrait(): boolean {
    return this.portraitQuery.matches;
  }

  /** Atributos de `<html>` que o CSS usa para a vertical e para o tipo de aparelho. */
  private syncAttributes(): void {
    const root = document.documentElement;
    root.dataset.orientation = this.isPortrait ? 'portrait' : 'landscape';
    root.dataset.device = this.isTablet ? 'tablet' : this.isTouch ? 'phone' : 'desktop';
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

  private get isFullscreen(): boolean {
    const d = document as FsDocument;
    return !!(document.fullscreenElement ?? d.webkitFullscreenElement);
  }

  /** Pede tela cheia (sem travar a orientação). Falhas são esperadas e ignoradas. */
  private async enterFullscreen(): Promise<void> {
    if (this.isFullscreen) return;
    const el = document.documentElement as FsElement;
    try {
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
      else await el.webkitRequestFullscreen?.();
    } catch {
      // navegador/iframe não permite: o jogo segue na janela normal
    }
  }

  /** Sai da tela cheia (para digitar). Falhas são ignoradas. */
  private async exitFullscreen(): Promise<void> {
    if (!this.isFullscreen) return;
    this.intentionalExit = true;
    const d = document as FsDocument & { webkitExitFullscreen?: () => Promise<void> | void };
    try {
      if (document.exitFullscreen) await document.exitFullscreen();
      else await d.webkitExitFullscreen?.();
    } catch {
      // sem efeito: segue na janela atual
    }
  }

  destroy(): void {
    for (const fn of this.cleanup) fn();
    delete document.documentElement.dataset.orientation;
    delete document.documentElement.dataset.device;
  }
}

/** Campo onde se digita (abre o teclado na tela). */
/** Dois toques mais próximos que isto (ms) seriam o "toque duplo" que amplia a página no Safari. */
const DOUBLE_TAP_MS = 350;

function isTextField(el: EventTarget | Element | null): boolean {
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || (el instanceof HTMLElement && el.isContentEditable);
}

/** Devemos pedir a tela cheia de volta agora? Só se estava em tela cheia, saiu, a saída não foi nossa, a página está visível (aba trocada não conta) e há toque na tela (quem sai de propósito, pelo gesto de voltar, não é puxado de volta). Pura, testável. */
export function shouldReenter(was: boolean, now: boolean, intentional: boolean, visible: boolean, touching: boolean): boolean {
  return was && !now && !intentional && visible && touching;
}
/** Quanto tempo depois de levantar o dedo uma saída ainda conta como acidente do toque (ms). */
const TOUCH_RECENT_MS = 800;

/** Lado menor da tela ≥ 600 px num aparelho de toque = tablet (função pura, testável). */
export function isTabletScreen(touch: boolean, w: number, h: number): boolean {
  return touch && Math.min(w, h) >= 600;
}
