import { CUBE_FRONT, LOAD_MARGIN, MAX_CHUNK_GEN_PER_FRAME, TILE } from '../config';
import { CHARACTER_H } from '../render/character';
import { Renderer } from '../render/renderer';
import { Block, blockDef, HOTBAR_BLOCKS, type BlockId } from '../world/blocks';
import { toChunk } from '../world/coords';
import { World } from '../world/world';
import { Camera } from './camera';
import { type ActionMode, Hud, type HudState } from './hud';
import { Joystick } from './joystick';
import { Player } from './player';

/** Duração de um dia completo em segundos. */
const DAY_LENGTH_S = 480;
/** Alcance para quebrar/colocar, em células (do centro do personagem ao centro da célula). */
const REACH = 4.5;
const TAP_THRESHOLD = 10;

/** Orquestra mundo, personagem, câmera, input, render e HUD. Sem regra de domínio. */
export class Game {
  readonly world: World;
  readonly camera = new Camera();
  readonly player: Player;
  private readonly renderer: Renderer;
  private readonly hud: Hud;
  private readonly joystick: Joystick;
  private readonly keys = new Set<string>();
  private showChunkBorders = false;
  private selected = 0;
  private mode: ActionMode = 'break';
  private time = 0.31;
  private elapsed = 0;
  private last = performance.now();
  private fps = 60;
  private unloadTimer = 0;
  private pointer = { x: 0, y: 0, inside: false };
  private press: { id: number; sx: number; sy: number; button: number } | null = null;
  private running = true;
  private readonly cleanup: (() => void)[] = [];

  constructor(private readonly canvas: HTMLCanvasElement, seed: number, private readonly onNewWorld: () => void) {
    this.world = new World(seed);
    const [sx, sy] = this.world.findSpawn();
    this.player = new Player(sx + 0.5, sy + 0.6);
    this.renderer = new Renderer(canvas, this.world);
    this.hud = new Hud({
      icons: HOTBAR_BLOCKS.map((id) => this.renderer.iconFor(id)),
      onSelect: (i) => this.select(i),
      onToggleChunks: () => (this.showChunkBorders = !this.showChunkBorders),
      onNewWorld: () => this.onNewWorld(),
      onToggleMode: () => this.toggleMode(),
      onSkipTime: () => this.skipTime(),
    });
    this.joystick = new Joystick(this.hud.root);
    this.resize();
    this.camera.follow(...this.cameraTarget(), 0, true);
    this.bindInput();
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

  private toggleMode(): void {
    this.mode = this.mode === 'break' ? 'place' : 'break';
  }

  private skipTime(): void {
    this.time = ((Math.floor(this.time * 4) + 1) / 4 + 0.01) % 1;
  }

  /** Alvo da câmera: posição lógica do personagem (centro do corpo), sem balanço. */
  private cameraTarget(): [number, number] {
    // Usa a altura suavizada: subir num bloco desloca a câmera sem trancos.
    return [this.player.x * TILE, this.player.y * TILE - this.player.visualZ * CUBE_FRONT - CHARACTER_H * 0.4];
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
      this.keys.add(e.code);
      if (e.repeat) return;
      if (e.code === 'KeyG') this.showChunkBorders = !this.showChunkBorders;
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
      this.camera.zoomBy(Math.exp(-e.deltaY * 0.0012));
    }, { passive: false });

    this.listen(c, 'pointerdown', (e) => {
      this.press = { id: e.pointerId, sx: e.offsetX, sy: e.offsetY, button: e.button };
      this.pointer = { x: e.offsetX, y: e.offsetY, inside: true };
    });
    this.listen(c, 'pointermove', (e) => {
      this.pointer = { x: e.offsetX, y: e.offsetY, inside: e.pointerType === 'mouse' || !!this.press };
    });
    this.listen(c, 'pointerup', (e) => {
      const p = this.press;
      this.press = null;
      if (e.pointerType !== 'mouse') this.pointer.inside = false;
      if (!p || p.id !== e.pointerId) return;
      if (Math.hypot(e.offsetX - p.sx, e.offsetY - p.sy) > TAP_THRESHOLD) return;
      const place = p.button === 2 || (p.button === 0 && this.mode === 'place');
      this.act(e.offsetX, e.offsetY, place);
    });
    this.listen(c, 'pointercancel', () => (this.press = null));
    this.listen(c, 'pointerleave', () => (this.pointer.inside = false));
  }

  /** Resolve o alvo do clique/toque e aplica a regra do domínio. */
  private target(sx: number, sy: number, place: boolean): { x: number; y: number; valid: boolean } {
    const picked = this.renderer.pick(this.camera, sx, sy);
    let { x, y } = picked;
    const pickedTop = picked.hasObject ? this.world.topBlock(x, y) : null;
    const stackable = pickedTop && blockDef(pickedTop.id).shape === 'cube' && this.world.canPlace(x, y, this.selectedBlock);
    if (place && pickedTop && blockDef(pickedTop.id).shape !== 'decoration' && !stackable) {
      // Objeto que não aceita pilha (árvore, pilha cheia): coloca no chão sob o cursor.
      const [wx, wy] = this.camera.screenToWorld(sx, sy);
      x = Math.floor(wx / TILE);
      y = Math.floor(wy / TILE);
    }
    const dist = Math.hypot(x + 0.5 - this.player.x, y + 0.5 - (this.player.y - 0.4));
    const inReach = dist <= REACH;
    // Não se coloca bloco sobre a personagem nem se cava o chão sob seus pés.
    const valid = inReach && (place
      ? this.world.canPlace(x, y, this.selectedBlock) && !this.player.occupies(x, y)
      : this.world.canBreak(x, y) && !(this.world.breakTarget(x, y) === 'ground' && this.player.occupies(x, y)));
    return { x, y, valid };
  }

  private act(sx: number, sy: number, place: boolean): void {
    const t = this.target(sx, sy, place);
    if (!t.valid) return;
    if (place) this.world.placeBlock(t.x, t.y, this.selectedBlock);
    else this.world.breakBlock(t.x, t.y);
    this.player.settle(this.world);
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.elapsed += dt;
    this.time = (this.time + dt / DAY_LENGTH_S) % 1;
    this.fps += (1 / Math.max(dt, 1e-3) - this.fps) * 0.05;

    const [ix, iy] = this.input();
    this.player.update(dt, ix, iy, this.world);
    this.camera.follow(...this.cameraTarget(), dt);

    const loadRect = this.camera.visibleChunks(LOAD_MARGIN);
    this.world.ensureChunks(loadRect, MAX_CHUNK_GEN_PER_FRAME);
    this.unloadTimer += dt;
    if (this.unloadTimer > 1) {
      this.unloadTimer = 0;
      this.world.unloadFar(loadRect);
    }

    this.renderer.draw(this.camera, {
      player: this.player,
      showChunkBorders: this.showChunkBorders,
      hover: this.pointer.inside && !this.joystick.active ? this.target(this.pointer.x, this.pointer.y, this.mode === 'place') : null,
      time: this.time,
      elapsed: this.elapsed,
      dt,
    });
    this.hud.update(this.hudState());
    requestAnimationFrame(this.frame);
  };

  /** Teclado + joystick, ambos em direções de tela. */
  private input(): [number, number] {
    const k = this.keys;
    let x = this.joystick.x;
    let y = this.joystick.y;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (k.has('KeyW') || k.has('ArrowUp')) y -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y += 1;
    if (k.has('KeyE') || k.has('Equal')) this.camera.zoomBy(1.02);
    if (k.has('KeyQ') || k.has('Minus')) this.camera.zoomBy(1 / 1.02);
    return [x, y];
  }

  private hudState(): HudState {
    const bx = this.player.cellX;
    const by = this.player.cellY;
    let hoverName: string | null = null;
    if (this.pointer.inside) {
      const picked = this.renderer.pick(this.camera, this.pointer.x, this.pointer.y);
      const top = picked.hasObject ? this.world.topBlock(picked.x, picked.y) : null;
      if (top) hoverName = blockDef(top.id).name;
      else if (this.world.getGround(picked.x, picked.y) === Block.HOLE) hoverName = blockDef(Block.HOLE).name;
    }
    return {
      seed: this.world.seed,
      block: [bx, by],
      level: this.player.z,
      chunk: [toChunk(bx), toChunk(by)],
      biome: this.world.biomeAt(bx, by).name,
      loaded: this.world.loadedCount,
      fps: Math.round(this.fps),
      time: this.time,
      selected: this.selected,
      selectedName: blockDef(this.selectedBlock).name,
      mode: this.mode,
      chunkBorders: this.showChunkBorders,
      hoverName,
    };
  }
}
