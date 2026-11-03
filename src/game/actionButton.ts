/**
 * Botão de ação (lado direito, telas de toque): toque curto usa o que está
 * selecionado no alvo à frente da personagem; segurar 2 s quebra o alvo.
 * Mostra o ícone do espaço selecionado — ou uma mão, com a mão vazia.
 * Apresentação + captura do gesto; a regra fica no Game/World.
 */

/** Mão aberta (mão vazia), no traço dos ícones do jogo: creme com contorno marrom. */
export const HAND_ICON = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <g stroke="#6e4518" stroke-width="3" stroke-linejoin="round" fill="#ffe9cf">
    <rect x="17" y="12" width="8" height="26" rx="4"/>
    <rect x="26" y="7" width="8" height="30" rx="4"/>
    <rect x="35" y="9" width="8" height="29" rx="4"/>
    <rect x="44" y="15" width="7.5" height="24" rx="3.75"/>
    <path d="M14 34c-3-4-8-3-8 1 0 3 6 10 9 15 4 6 9 9 17 9 11 0 19-7 19-18v-6H17z"/>
  </g>
  <path d="M22 44c4 3 9 4 14 2" stroke="#e0b48a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
</svg>`)}`;

export class ActionButton {
  readonly el: HTMLButtonElement;
  private readonly icon: HTMLImageElement;
  private pointerId: number | null = null;
  private lastProgress = -1;

  constructor(parent: HTMLElement, onPress: () => void, onRelease: () => void) {
    this.el = document.createElement('button');
    this.el.className = 'action-button';
    this.el.type = 'button';
    this.el.setAttribute('aria-label', 'Ação: toque para usar, segure para quebrar');
    this.icon = document.createElement('img');
    this.icon.alt = '';
    this.icon.src = HAND_ICON;
    this.el.appendChild(this.icon);
    parent.appendChild(this.el);

    this.el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this.pointerId !== null) return;
      this.pointerId = e.pointerId;
      try { this.el.setPointerCapture(e.pointerId); } catch { /* ponteiro já liberado: segue sem captura */ }
      this.el.classList.add('pressed');
      onPress();
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== this.pointerId) return;
      this.pointerId = null;
      this.el.classList.remove('pressed');
      onRelease();
    };
    this.el.addEventListener('pointerup', end);
    this.el.addEventListener('pointercancel', end);
    this.el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  setIcon(src: string): void {
    if (this.icon.src !== src) this.icon.src = src;
  }

  /** `progress` 0..1 da quebra (anel ao redor); `empty` esmaece o ícone (item acabou). */
  update(progress: number, empty: boolean): void {
    const p = Math.round(progress * 100) / 100;
    if (p !== this.lastProgress) {
      this.lastProgress = p;
      this.el.style.setProperty('--progress', String(p));
      this.el.classList.toggle('charging', p > 0);
    }
    this.el.classList.toggle('empty', empty);
  }
}
