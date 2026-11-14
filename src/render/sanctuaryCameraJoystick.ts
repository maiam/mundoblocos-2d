/** Controle experimental de órbita do Santuário. Não altera o estado do jogo. */
export interface SanctuaryOrbit { azimuthDeg: number; elevationDeg: number; zoom: number }
const KEY = 'orvalis:santuario:camera-livre:v1';
const DEFAULT: SanctuaryOrbit = { azimuthDeg: 0, elevationDeg: 67, zoom: 1 };
const clamp = (n: number, min: number, max: number): number => Math.max(min, Math.min(max, n));
const normalize = (v: SanctuaryOrbit): SanctuaryOrbit => ({
  azimuthDeg: ((v.azimuthDeg % 360) + 360) % 360,
  elevationDeg: clamp(v.elevationDeg, 15, 85),
  zoom: clamp(v.zoom, 0.6, 2.2),
});
export class SanctuaryCameraJoystick {
  private readonly root: HTMLDivElement;
  private readonly panel: HTMLDivElement;
  private readonly readout: HTMLElement;
  private readonly knob: HTMLDivElement;
  private readonly ring: HTMLElement;
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
        <div class="sanctuary-camera-readout" aria-live="off"></div>
        <div class="sanctuary-camera-ring" aria-label="Joystick de câmera: arraste para girar e inclinar" role="group">
          <div class="sanctuary-camera-knob"></div>
        </div>
        <div class="sanctuary-camera-buttons">
          <button type="button" data-action="minus" title="Afastar">−</button>
          <span>Zoom</span>
          <button type="button" data-action="plus" title="Aproximar">+</button>
          <button type="button" data-action="reset" title="Voltar à câmera inclinada a 67°">Resetar</button>
          <button type="button" data-action="save" title="Guardar esta posição neste dispositivo">Salvar</button>
        </div>
      </div>`;
    this.panel = this.root.querySelector<HTMLDivElement>('.sanctuary-camera-panel')!;
    this.readout = this.root.querySelector<HTMLElement>('.sanctuary-camera-readout')!;
    this.knob = this.root.querySelector<HTMLDivElement>('.sanctuary-camera-knob')!;
    this.ring = this.root.querySelector<HTMLElement>('.sanctuary-camera-ring')!;
    this.root.querySelector<HTMLButtonElement>('.sanctuary-camera-toggle')!.addEventListener('click', () => {
      this.open = !this.open;
      this.panel.hidden = !this.open;
      this.root.querySelector<HTMLButtonElement>('.sanctuary-camera-toggle')!.setAttribute('aria-expanded', String(this.open));
      this.apply(this.open ? { ...this.orbit } : null);
      this.updateReadout();
    });
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
    if (this.open) this.apply({ ...this.orbit });
    this.updateReadout();
  }
  private updateReadout(): void {
    const azimuth = Math.round(this.orbit.azimuthDeg);
    const elevation = Math.round(this.orbit.elevationDeg);
    this.readout.textContent = `Rotação ${azimuth}° · Inclinação ${elevation}° · Zoom ${this.orbit.zoom.toFixed(2)}×`;
  }
  dispose(): void {
    this.apply(null);
    this.root.remove();
  }
}
