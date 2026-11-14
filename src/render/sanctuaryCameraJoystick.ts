/** Controle experimental de órbita do Santuário. Não altera o estado do jogo. */
export interface SanctuaryOrbit {
  azimuthDeg: number; elevationDeg: number; zoom: number;
  /** Escala da altura dos cubos, apenas no palco visual. 1 = bloco original. */
  blockHeight: number;
  /** Escala da largura/profundidade da célula renderizada. 1 = célula original. */
  cellSize: number;
}
// v2: invalida snapshots antigos que substituiriam inadvertidamente o novo padrão.
const KEY = 'orvalis:santuario:camera-livre:v2';
export const SANCTUARY_DEFAULT_CAMERA: SanctuaryOrbit = { azimuthDeg: 35, elevationDeg: 50, zoom: 0.95, blockHeight: 0.5, cellSize: 0.8 };
const DEFAULT: SanctuaryOrbit = SANCTUARY_DEFAULT_CAMERA;
/** Comparação aprovada para a câmera inclinada — não muda a visão original. */
export const CAMERA_OPTION_2: SanctuaryOrbit = { azimuthDeg: 36, elevationDeg: 40, zoom: 1.91, blockHeight: 0.5, cellSize: 0.5 };
const clamp = (n: number, min: number, max: number): number => Math.max(min, Math.min(max, n));
const normalize = (v: SanctuaryOrbit): SanctuaryOrbit => ({
  azimuthDeg: ((v.azimuthDeg % 360) + 360) % 360,
  elevationDeg: clamp(v.elevationDeg, 15, 85),
  zoom: clamp(v.zoom, 0.6, 2.2),
  blockHeight: clamp(Number.isFinite(v.blockHeight) ? v.blockHeight : 1, 0.25, 1.25),
  cellSize: clamp(Number.isFinite(v.cellSize) ? v.cellSize : 1, 0.5, 1.25),
});
export class SanctuaryCameraJoystick {
  private readonly root: HTMLDivElement;
  private readonly panel: HTMLDivElement;
  private readonly readout: HTMLElement;
  private readonly knob: HTMLDivElement;
  private readonly ring: HTMLElement;
  private readonly blockRange: HTMLInputElement;
  private readonly cellRange: HTMLInputElement;
  private orbit: SanctuaryOrbit = { ...DEFAULT };
  private open = false;
  private pointerId: number | null = null;
  private lastX = 0;
  private lastY = 0;

  constructor(private readonly apply: (orbit: SanctuaryOrbit | null) => void) {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null') as SanctuaryOrbit | null;
      if (saved && Number.isFinite(saved.azimuthDeg) && Number.isFinite(saved.elevationDeg) && Number.isFinite(saved.zoom)) {
        this.orbit = normalize(saved);
      }
    } catch { /* dispositivo sem armazenamento: usa padrão */ }
    this.root = document.createElement('div');
    this.root.className = 'sanctuary-camera-ui';
    this.root.innerHTML = `
      <button type="button" class="sanctuary-camera-toggle" aria-expanded="false">◉ Câmera</button>
      <div class="sanctuary-camera-panel" hidden>
        <div class="sanctuary-camera-presets" role="group" aria-label="Comparar perspectivas">
          <button type="button" data-preset="1">Padrão · 35°/50°</button>
          <button type="button" data-preset="2">Comparar · 36°/40°</button>
        </div>
        <div class="sanctuary-camera-readout" aria-live="off"></div>
        <div class="sanctuary-camera-ring" aria-label="Joystick de câmera: arraste para girar e inclinar" role="group">
          <div class="sanctuary-camera-knob"></div>
        </div>
        <div class="sanctuary-scale-controls">
          <label>Altura do bloco <output data-value="block">100%</output>
            <input type="range" min="25" max="125" step="5" value="100" data-range="block" aria-label="Altura visual de cada bloco">
          </label>
          <label>Tamanho da célula <output data-value="cell">100%</output>
            <input type="range" min="50" max="125" step="5" value="100" data-range="cell" aria-label="Tamanho visual da célula">
          </label>
        </div>
        <div class="sanctuary-camera-buttons">
          <button type="button" data-action="minus" title="Afastar">−</button>
          <span>Zoom</span>
          <button type="button" data-action="plus" title="Aproximar">+</button>
          <button type="button" data-action="reset" title="Restaurar câmera padrão 35°/50°">Resetar</button>
          <button type="button" data-action="save" title="Guardar esta posição neste dispositivo">Salvar</button>
        </div>
      </div>`;
    this.panel = this.root.querySelector<HTMLDivElement>('.sanctuary-camera-panel')!;
    this.readout = this.root.querySelector<HTMLElement>('.sanctuary-camera-readout')!;
    this.knob = this.root.querySelector<HTMLDivElement>('.sanctuary-camera-knob')!;
    this.ring = this.root.querySelector<HTMLElement>('.sanctuary-camera-ring')!;
    this.blockRange = this.root.querySelector<HTMLInputElement>('[data-range="block"]')!;
    this.cellRange = this.root.querySelector<HTMLInputElement>('[data-range="cell"]')!;
    this.blockRange.addEventListener('input', () => {
      this.orbit.blockHeight = Number(this.blockRange.value) / 100; this.publish();
    });
    this.cellRange.addEventListener('input', () => {
      this.orbit.cellSize = Number(this.cellRange.value) / 100; this.publish();
    });
    this.root.querySelector<HTMLButtonElement>('.sanctuary-camera-toggle')!.addEventListener('click', () => {
      this.open = !this.open;
      this.panel.hidden = !this.open;
      this.root.querySelector<HTMLButtonElement>('.sanctuary-camera-toggle')!.setAttribute('aria-expanded', String(this.open));
      this.apply({ ...this.orbit });
      this.updateReadout();
    });
    this.root.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach(btn => btn.addEventListener('click', () => {
      this.orbit = btn.dataset.preset === '1' ? { ...DEFAULT } : { ...CAMERA_OPTION_2 };
      this.publish();
    }));
    this.ring.addEventListener('pointerdown', this.down);
    this.ring.addEventListener('pointermove', this.move);
    this.ring.addEventListener('pointerup', this.end);
    this.ring.addEventListener('pointercancel', this.end);
    this.ring.addEventListener('lostpointercapture', this.end);
    this.root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(btn => btn.addEventListener('click', () => {
      switch (btn.dataset.action) {
        case 'minus': this.orbit.zoom /= 1.15; break;
        case 'plus': this.orbit.zoom *= 1.15; break;
        case 'reset': this.orbit = { ...DEFAULT }; break;
        case 'save':
          try { localStorage.setItem(KEY, JSON.stringify(this.orbit)); btn.textContent = 'Salvo ✓'; }
          catch { btn.textContent = 'Indisponível'; }
          return;
      }
      this.orbit = normalize(this.orbit);
      this.publish();
    }));
    this.updateReadout();
    document.body.appendChild(this.root);
    // A configuração inicial vale já no primeiro quadro do jogo.
    this.apply({ ...this.orbit });
  }
  private readonly down = (e: PointerEvent): void => {
    if (this.pointerId !== null) return;
    e.preventDefault();
    e.stopPropagation();
    this.pointerId = e.pointerId;
    this.lastX = e.clientX; this.lastY = e.clientY;
    this.ring.setPointerCapture(e.pointerId);
    this.knob.style.transform = 'translate(0px,0px)';
  };
  private readonly move = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;
    e.preventDefault();
    const dx = e.clientX - this.lastX, dy = e.clientY - this.lastY;
    this.lastX = e.clientX; this.lastY = e.clientY;
    this.orbit.azimuthDeg += dx * 0.48;
    this.orbit.elevationDeg = clamp(this.orbit.elevationDeg + dy * 0.35, 15, 85);
    const bounds = this.ring.getBoundingClientRect();
    const x = clamp(e.clientX - (bounds.left + bounds.width / 2), -27, 27);
    const y = clamp(e.clientY - (bounds.top + bounds.height / 2), -27, 27);
    this.knob.style.transform = `translate(${x}px,${y}px)`;
    this.publish();
  };
  private readonly end = (e: PointerEvent): void => {
    if (this.pointerId !== e.pointerId) return;
    this.pointerId = null;
    this.knob.style.transform = 'translate(0px,0px)';
    if (this.ring.hasPointerCapture(e.pointerId)) this.ring.releasePointerCapture(e.pointerId);
  };
  private publish(): void {
    this.orbit = normalize(this.orbit);
    this.apply({ ...this.orbit });
    this.updateReadout();
  }
  private updateReadout(): void {
    const azimuth = Math.round(this.orbit.azimuthDeg);
    const elevation = Math.round(this.orbit.elevationDeg);
    this.readout.textContent = `Rotação ${azimuth}° · Inclinação ${elevation}° · Zoom ${this.orbit.zoom.toFixed(2)}×`;
    this.root.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach(btn => {
      const preset = btn.dataset.preset === '1' ? DEFAULT : CAMERA_OPTION_2;
      const active = JSON.stringify(this.orbit) === JSON.stringify(preset);
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    this.blockRange.value = String(Math.round(this.orbit.blockHeight * 100));
    this.cellRange.value = String(Math.round(this.orbit.cellSize * 100));
    this.root.querySelector<HTMLOutputElement>('[data-value="block"]')!.value = `${Math.round(this.orbit.blockHeight * 100)}%`;
    this.root.querySelector<HTMLOutputElement>('[data-value="cell"]')!.value = `${Math.round(this.orbit.cellSize * 100)}%`;
  }
  dispose(): void {
    this.root.remove();
  }
}
