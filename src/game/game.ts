import { LOAD_MARGIN, MAX_CHUNK_GEN_PER_FRAME, TILE } from '../config';
import { Renderer } from '../render/renderer';
import { blockDef, HOTBAR_BLOCKS, type BlockId } from '../world/blocks';
import { toChunk } from '../world/coords';
import { World } from '../world/world';
import { Camera } from './camera';
import { type ActionMode, Hud, type HudState } from './hud';

/** Duração de um dia completo em segundos. */
const DAY_LENGTH_S = 480;
const PAN_SPEED = 700;
const DRAG_THRESHOLD = 6;


/** Orquestra mundo, câmera, input, render e HUD. Não contém regra de domínio. */
export class Game {
  readonly world: World;
  readonly camera = new Camera();
  private readonly renderer: Renderer;
  private readonly hud: Hud;
  private readonly keys = new Set<string>();
  private showChunkBorders = true;
  private selected = 0;
  private mode: ActionMode = 'break';
  private time = 0.31;
  private elapsed = 0;
  private last = performance.now();
  private fps = 60;
  private unloadTimer = 0;
  private pointer: { x: number; y: number; inside: boolean } = { x: 0, y: 0, inside: false };
  private drag: { id: number; sx: number; sy: number; cx: number; cy: number; moved: boolean; button: number } | null = null;
  private running = true;
  private readonly cleanup: (() => void)[] = [];

  constructor(private readonly canvas: HTMLCanvasElement, seed: number, private readonly onNewWorld: () => void) {
    this.world = new World(seed);
    this.renderer = new Renderer(canvas, this.world);
    this.hud = new Hud({
      icons: HOTBAR_BLOCKS.map((id) => this.renderer.iconFor(id)),
      onSelect: (i) => this.select(i),
      onToggleChunks: () => this.toggleChunks(),
      onNewWorld: () => this.onNewWorld(),
      onToggleMode: () => this.toggleMode(),
      onSkipTime: () => this.skipTime(),
    });
    this.camera.x = 0;
    this.camera.y = (this.world.generator.surfaceY(0) - 4) * TILE;
    this.resize();
    this.bindInput();
    this.hud.update(this.hudState());
    requestAnimationFrame(this.frame);
  }

  destroy(): void {
    this.running = false;
    for (const fn of this.cleanup) fn();
    this.hud.destroy();
  }

  private get selectedBlock(): BlockId {
    return HOTBAR_BLOCKS[this.selected];
  }

  private select(i: number): void {
    this.selected = Math.max(0, Math.min(HOTBAR_BLOCKS.length - 1, i));
    this.mode = 'place';
  }

  private toggleChunks(): void {
    this.showChunkBorders = !this.showChunkBorders;
  }

  private toggleMode(): void {
    this.mode = this.mode === 'break' ? 'place' : 'break';
  }

  private skipTime(): void {
    this.time = (Math.floor(this.time * 4) + 1) / 4 + 0.01;
  }

  private resize = (): void => {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.camera.resize(w, h);
  };

  private listen<K extends keyof WindowEventMap>(target: Window, type: K, fn: (e: WindowEventMap[K]) => void, opts?: AddEventListenerOptions): void;
  private listen<K extends keyof HTMLElementEventMap>(target: HTMLElement, type: K, fn: (e: HTMLElementEventMap[K]) => void, opts?: AddEventListenerOptions): void;
  private listen(target: Window | HTMLElement, type: string, fn: (e: Event) => void, opts?: AddEventListenerOptions): void {
    target.addEventListener(type, fn, opts);
    this.cleanup.push(() => target.removeEventListener(type, fn, opts));
  }

  private bindInput(): void {
    const c = this.canvas;
    this.listen(window, 'resize', this.resize);
    this.listen(window, 'keydown', (e) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      this.keys.add(e.code);
      if (e.code === 'KeyG') this.toggleChunks();
      if (e.code === 'KeyF') this.toggleMode();
      if (e.code === 'KeyT') this.skipTime();
      if (e.code.startsWith('Digit')) {
        const n = Number(e.code.slice(5));
        if (n >= 1 && n <= HOTBAR_BLOCKS.length) this.select(n - 1);
      }
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    });
    this.listen(window, 'keyup', (e) => this.keys.delete(e.code));
    this.listen(window, 'blur', () => this.keys.clear());

    this.listen(c, 'contextmenu', (e) => e.preventDefault());
    this.listen(c, 'wheel', (e) => {
      e.preventDefault();
      this.camera.zoomAt(Math.exp(-e.deltaY * 0.0015), e.offsetX, e.offsetY);
    }, { passive: false });

    this.listen(c, 'pointerdown', (e) => {
      c.setPointerCapture(e.pointerId);
      this.drag = { id: e.pointerId, sx: e.offsetX, sy: e.offsetY, cx: this.camera.x, cy: this.camera.y, moved: false, button: e.button };
    });
    this.listen(c, 'pointermove', (e) => {
      this.pointer = { x: e.offsetX, y: e.offsetY, inside: true };
      const d = this.drag;
      if (!d || d.id !== e.pointerId) return;
      const dx = e.offsetX - d.sx;
      const dy = e.offsetY - d.sy;
      if (!d.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) d.moved = true;
      if (d.moved) {
        this.camera.x = d.cx - dx / this.camera.zoom;
        this.camera.y = d.cy - dy / this.camera.zoom;
      }
    });
    this.listen(c, 'pointerup', (e) => {
      const d = this.drag;
      this.drag = null;
      if (!d || d.id !== e.pointerId || d.moved) return;
      const [bx, by] = this.camera.screenToBlock(e.offsetX, e.offsetY);
      const place = d.button === 2 || (d.button === 0 && this.mode === 'place');
      if (place) this.world.placeBlock(bx, by, this.selectedBlock);
      else this.world.breakBlock(bx, by);
    });
    this.listen(c, 'pointercancel', () => (this.drag = null));
    this.listen(c, 'pointerleave', () => (this.pointer.inside = false));
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.elapsed += dt;
    this.time = (this.time + dt / DAY_LENGTH_S) % 1;
    this.fps += (1 / Math.max(dt, 1e-3) - this.fps) * 0.05;

    this.updateCamera(dt);

    const loadRect = this.camera.visibleChunks(LOAD_MARGIN);
    this.world.ensureChunks(loadRect, MAX_CHUNK_GEN_PER_FRAME);
    this.unloadTimer += dt;
    if (this.unloadTimer > 1) {
      this.unloadTimer = 0;
      if (this.world.unloadFar(loadRect).length) this.renderer.prune();
    }

    this.renderer.draw(this.camera, {
      showChunkBorders: this.showChunkBorders,
      hover: this.hoverInfo(),
      time: this.time,
      elapsed: this.elapsed,
      dt,
    });
    this.hud.update(this.hudState());
    requestAnimationFrame(this.frame);
  };

  private updateCamera(dt: number): void {
    const k = this.keys;
    const speed = (PAN_SPEED * (k.has('ShiftLeft') || k.has('ShiftRight') ? 2.5 : 1) * dt) / this.camera.zoom;
    if (k.has('KeyA') || k.has('ArrowLeft')) this.camera.x -= speed;
    if (k.has('KeyD') || k.has('ArrowRight')) this.camera.x += speed;
    if (k.has('KeyW') || k.has('ArrowUp')) this.camera.y -= speed;
    if (k.has('KeyS') || k.has('ArrowDown')) this.camera.y += speed;
    const cx = this.camera.width / 2;
    const cy = this.camera.height / 2;
    if (k.has('KeyE') || k.has('Equal')) this.camera.zoomAt(1 + dt * 1.5, cx, cy);
    if (k.has('KeyQ') || k.has('Minus')) this.camera.zoomAt(1 / (1 + dt * 1.5), cx, cy);
  }

  private hoverInfo(): { x: number; y: number; valid: boolean } | null {
    if (!this.pointer.inside || this.drag?.moved) return null;
    const [x, y] = this.camera.screenToBlock(this.pointer.x, this.pointer.y);
    const valid = this.mode === 'place' ? this.world.canPlace(x, y, this.selectedBlock) : this.world.canBreak(x, y);
    return { x, y, valid };
  }

  private hudState(): HudState {
    const [wx, wy] = this.camera.screenToWorld(this.camera.width / 2, this.camera.height / 2);
    const bx = Math.floor(wx / TILE);
    const by = Math.floor(wy / TILE);
    let hoverName: string | null = null;
    if (this.pointer.inside) {
      const [hx, hy] = this.camera.screenToBlock(this.pointer.x, this.pointer.y);
      hoverName = blockName(this.world.getBlock(hx, hy));
    }
    return {
      seed: this.world.seed,
      block: [bx, by],
      chunk: [toChunk(bx), toChunk(by)],
      biome: this.world.biomeAt(bx).name,
      loaded: this.world.loadedCount,
      fps: Math.round(this.fps),
      zoom: this.camera.zoom,
      time: this.time,
      selected: this.selected,
      selectedName: blockName(this.selectedBlock),
      mode: this.mode,
      chunkBorders: this.showChunkBorders,
      hoverName,
    };
  }
}

function blockName(id: number): string {
  return blockDef(id).name;
}
