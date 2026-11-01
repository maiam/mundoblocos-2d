/**
 * Joystick virtual alinhado às direções da tela: arrastar o pino para cima
 * move o personagem para cima na tela, para a direita move à direita, etc.
 */
const RADIUS = 46;
const DEADZONE = 0.12;

export class Joystick {
  readonly el: HTMLElement;
  private readonly knob: HTMLElement;
  private pointerId: number | null = null;
  /** Vetor atual em coordenadas de tela, magnitude 0..1. */
  x = 0;
  y = 0;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'joystick';
    this.el.setAttribute('aria-label', 'Joystick de movimento');
    this.knob = document.createElement('div');
    this.knob.className = 'joystick-knob';
    this.el.appendChild(this.knob);
    parent.appendChild(this.el);

    this.el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.pointerId = e.pointerId;
      this.el.setPointerCapture(e.pointerId);
      this.el.classList.add('active');
      this.move(e);
    });
    this.el.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.pointerId) this.move(e);
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== this.pointerId) return;
      this.pointerId = null;
      this.el.classList.remove('active');
      this.set(0, 0);
    };
    this.el.addEventListener('pointerup', end);
    this.el.addEventListener('pointercancel', end);
  }

  private move(e: PointerEvent): void {
    const r = this.el.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > RADIUS) { dx *= RADIUS / d; dy *= RADIUS / d; }
    this.set(dx / RADIUS, dy / RADIUS);
  }

  private set(nx: number, ny: number): void {
    const m = Math.hypot(nx, ny);
    this.knob.style.transform = `translate(${nx * RADIUS}px, ${ny * RADIUS}px)`;
    if (m < DEADZONE) { this.x = 0; this.y = 0; return; }
    // Reescala para que a zona morta não cause salto de velocidade.
    const k = (m - DEADZONE) / (1 - DEADZONE) / m;
    this.x = nx * k;
    this.y = ny * k;
  }

  get active(): boolean {
    return this.pointerId !== null;
  }
}
