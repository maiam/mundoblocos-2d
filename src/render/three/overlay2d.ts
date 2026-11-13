/**
 * Camada 2D sobre o canvas WebGL (ADR 0031, M3.2): números de dano, vinheta vermelha de dano e escurecer de porta. Um canvas
 * irmão do canvas do jogo (um canvas só aceita um tipo de contexto), colado nele, sem pegar toques e abaixo do HUD (o HUD é
 * criado depois no DOM). Mesmo desenho do `Renderer` 2D.
 */
export class Overlay2D {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private width = 0;
  private height = 0;
  private dpr = 0;

  constructor(host: HTMLCanvasElement, createCanvas: () => HTMLCanvasElement = () => document.createElement('canvas')) {
    this.canvas = createCanvas();
    this.canvas.setAttribute?.('aria-hidden', 'true');
    this.canvas.setAttribute?.('data-layer', 'overlay-2d');
    Object.assign(this.canvas.style ?? {}, {
      position: 'fixed', left: '0', top: '0', width: '100%', height: '100%', pointerEvents: 'none',
    });
    this.ctx = this.canvas.getContext('2d');
    host.after?.(this.canvas);
  }

  /** Prepara o quadro: acompanha o tamanho da tela, apaga e devolve o contexto (em px de CSS), ou null sem 2D. */
  begin(width: number, height: number, dpr: number): CanvasRenderingContext2D | null {
    const ctx = this.ctx;
    if (!ctx) return null;
    if (width !== this.width || height !== this.height || dpr !== this.dpr) {
      this.canvas.width = Math.round(width * dpr);
      this.canvas.height = Math.round(height * dpr);
      this.width = width;
      this.height = height;
      this.dpr = dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    return ctx;
  }

  dispose(): void {
    this.canvas.remove?.();
  }
}

/** Dano: vinheta vermelha que some com `flash` (1 → 0). */
export function drawHurtVignette(ctx: CanvasRenderingContext2D, w: number, h: number, flash: number): void {
  if (flash <= 0) return;
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
  g.addColorStop(0, 'rgba(255, 40, 80, 0)');
  g.addColorStop(1, `rgba(255, 40, 80, ${0.45 * flash})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Escurecer ao passar por uma porta (1 → 0). */
export function drawFade(ctx: CanvasRenderingContext2D, w: number, h: number, fade: number | undefined): void {
  if (!fade || fade <= 0) return;
  ctx.fillStyle = `rgba(10, 6, 16, ${Math.min(1, fade)})`;
  ctx.fillRect(0, 0, w, h);
}
