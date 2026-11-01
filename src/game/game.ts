import { CUBE_FRONT, LOAD_MARGIN, MAX_CHUNK_GEN_PER_FRAME, TILE } from '../config';
import { CHARACTER_H } from '../render/character';
import { Renderer } from '../render/renderer';
import { ITEM_ICON_URLS } from '../render/itemArt';
import { blockDef, type BlockId } from '../world/blocks';
import { dropsFor, ITEMS } from '../world/items';
import { World } from '../world/world';
import { Camera } from './camera';
import { Drops } from './drops';
import { Entities } from './entities';
import { HOTBAR, type HotbarSlot } from './hotbar';
import { Hud } from './hud';
import { Inventory } from './inventory';
import type { Sheep } from './sheep';
import { Joystick } from './joystick';
import type { ScreenMode } from './screenMode';
import { Player } from './player';

/** Duração de um dia completo em segundos. */
const DAY_LENGTH_S = 480;
/** Alcance para quebrar/colocar, em células (do centro do personagem ao centro da célula). */
const REACH = 4.5;
/** Deslocamento máximo (px) para um toque/clique contar como "colocar". */
const TAP_THRESHOLD = 10;
/** Duração máxima de um toque/clique de colocar (s); acima disso é "segurar". */
const TAP_MAX_S = 0.3;
/** Tempo segurando sobre o mesmo alvo para quebrar (s). */
export const BREAK_HOLD_S = 2;

interface Press {
  id: number;
  sx: number;
  sy: number;
  moved: boolean;
  held: number;
  /** Célula sendo quebrada e progresso 0..1 (reinicia ao trocar de alvo). */
  target: { x: number; y: number } | null;
  progress: number;
}

/** Orquestra mundo, personagem, câmera, input, render e HUD. Sem regra de domínio. */
export class Game {
  readonly world: World;
  readonly camera = new Camera();
  readonly player: Player;
  readonly entities: Entities;
  readonly inventory = new Inventory();
  readonly drops = new Drops();
  private readonly renderer: Renderer;
  private readonly hud: Hud;
  private readonly joystick: Joystick;
  private readonly keys = new Set<string>();
  private showChunkBorders = false;
  private selected = 0;
  private time = 0.31;
  private elapsed = 0;
  private last = performance.now();
  private unloadTimer = 0;
  private pointer = { x: 0, y: 0, inside: false };
  private press: Press | null = null;
  private running = true;
  private readonly cleanup: (() => void)[] = [];

  constructor(private readonly canvas: HTMLCanvasElement, seed: number, private readonly screenMode?: ScreenMode) {
    this.world = new World(seed);
    const [sx, sy] = this.world.findSpawn();
    this.player = new Player(sx + 0.5, sy + 0.6);
    this.entities = new Entities(this.player);
    this.entities.spawnFlock(this.world, sx, sy);
    this.renderer = new Renderer(canvas, this.world);
    this.hud = new Hud({
      icons: HOTBAR.map((s) => (s.kind === 'item' ? ITEM_ICON_URLS[s.item] : this.renderer.iconFor(s.block))),
      names: HOTBAR.map((s) => (s.kind === 'item' ? ITEMS[s.item].name : blockDef(s.block).name)),
      onSelect: (i) => this.select(i),
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

  private get slot(): HotbarSlot {
    return HOTBAR[this.selected];
  }

  private select(i: number): void {
    this.selected = Math.max(0, Math.min(HOTBAR.length - 1, i));
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
      if (e.code === 'KeyT') this.skipTime();
      if (e.code.startsWith('Digit')) {
        const n = Number(e.code.slice(5)) || 10; // tecla 0 = 10º espaço
        if (n <= HOTBAR.length) this.select(n - 1);
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

    // Toque/clique curto = colocar. Segurar 2 s sobre o mesmo alvo = quebrar.
    this.listen(c, 'pointerdown', (e) => {
      if (this.press) return;
      c.setPointerCapture(e.pointerId);
      this.press = { id: e.pointerId, sx: e.offsetX, sy: e.offsetY, moved: false, held: 0, target: null, progress: 0 };
      this.pointer = { x: e.offsetX, y: e.offsetY, inside: true };
    });
    this.listen(c, 'pointermove', (e) => {
      this.pointer = { x: e.offsetX, y: e.offsetY, inside: e.pointerType === 'mouse' || !!this.press };
      const p = this.press;
      if (p && p.id === e.pointerId && Math.hypot(e.offsetX - p.sx, e.offsetY - p.sy) > TAP_THRESHOLD) p.moved = true;
    });
    this.listen(c, 'pointerup', (e) => {
      const p = this.press;
      if (!p || p.id !== e.pointerId) return;
      this.press = null;
      if (e.pointerType !== 'mouse') this.pointer.inside = false;
      if (!p.moved && p.held <= TAP_MAX_S) this.place(e.offsetX, e.offsetY);
    });
    this.listen(c, 'pointercancel', () => (this.press = null));
    this.listen(c, 'pointerleave', () => (this.pointer.inside = false));
  }

  private inReach(x: number, y: number): boolean {
    return Math.hypot(x + 0.5 - this.player.x, y + 0.5 - (this.player.y - 0.4)) <= REACH;
  }

  /** Alvo de quebra sob o ponto da tela (objeto do topo ou o chão). */
  private breakTarget(sx: number, sy: number): { x: number; y: number; valid: boolean } {
    const { x, y } = this.renderer.pick(this.camera, sx, sy);
    // Não se cava o chão sob nenhuma entidade.
    const valid = this.inReach(x, y) && this.world.canBreak(x, y) &&
      !(this.world.breakTarget(x, y) === 'ground' && this.entities.occupies(x, y));
    return { x, y, valid };
  }

  /** Célula de chão sob o ponto da tela (ignora objetos altos à frente). */
  private groundCell(sx: number, sy: number): [number, number] {
    const [wx, wy] = this.camera.screenToWorld(sx, sy);
    return [Math.floor(wx / TILE), Math.floor(wy / TILE)];
  }

  /** Alvo de colocar um bloco: empilha se tocou num cubo com espaço; senão, no chão sob o cursor. */
  private blockTarget(sx: number, sy: number, block: BlockId): { x: number; y: number; valid: boolean } {
    const picked = this.renderer.pick(this.camera, sx, sy);
    let { x, y } = picked;
    const top = picked.hasObject ? this.world.topBlock(x, y) : null;
    const stackable = top && blockDef(top.id).shape === 'cube' && this.world.canPlace(x, y, block);
    if (top && blockDef(top.id).shape !== 'decoration' && !stackable) [x, y] = this.groundCell(sx, sy);
    // Não se coloca bloco sobre nenhuma entidade.
    const valid = this.inReach(x, y) && this.world.canPlace(x, y, block) && !this.entities.occupies(x, y);
    return { x, y, valid };
  }

  /** Alvo de plantar a semente: a célula de chão sob o cursor. */
  private plantTarget(sx: number, sy: number): { x: number; y: number; valid: boolean } {
    const [x, y] = this.groundCell(sx, sy);
    const valid = this.inReach(x, y) && this.inventory.count('wheat_seed') > 0 && this.world.canPlant(x, y);
    return { x, y, valid };
  }

  /** Ovelha sob o cursor para dar trigo. */
  private feedTarget(sx: number, sy: number): { sheep: Sheep; valid: boolean } | null {
    const [wx, wy] = this.camera.screenToWorld(sx, sy);
    const sheep = this.entities.sheepAt(wx / TILE, wy / TILE);
    if (!sheep) return null;
    const near = Math.hypot(sheep.x - this.player.x, sheep.y - this.player.y) <= REACH;
    return { sheep, valid: near && sheep.canEat && this.inventory.count('wheat') > 0 };
  }

  /** Toque/clique curto: usa o que está selecionado na hotbar. */
  private place(sx: number, sy: number): void {
    const slot = this.slot;
    if (slot.kind === 'block') {
      const t = this.blockTarget(sx, sy, slot.block);
      if (!t.valid) return;
      this.world.placeBlock(t.x, t.y, slot.block);
      this.entities.settleAll(this.world);
      return;
    }
    const def = ITEMS[slot.item];
    if (def.plants) {
      const t = this.plantTarget(sx, sy);
      if (t.valid && this.inventory.take(slot.item)) this.world.plant(t.x, t.y);
      return;
    }
    if (def.feeds === 'sheep') {
      const f = this.feedTarget(sx, sy);
      if (f?.valid && this.inventory.take(slot.item)) f.sheep.feed();
    }
  }

  /**
   * Avança a quebra enquanto o dedo/mouse segue pressionado. O progresso só
   * acumula num alvo válido e reinicia se o alvo mudar; ao completar, quebra e
   * continua no que estiver por baixo (ex.: bloco de baixo da pilha, depois o chão).
   */
  private updateBreaking(dt: number): void {
    const p = this.press;
    if (!p) return;
    p.held += dt;
    if (p.held <= TAP_MAX_S) return;
    const t = this.breakTarget(this.pointer.x, this.pointer.y);
    if (!t.valid) {
      p.target = null;
      p.progress = 0;
      return;
    }
    if (!p.target || p.target.x !== t.x || p.target.y !== t.y) {
      p.target = { x: t.x, y: t.y };
      p.progress = 0;
    }
    p.progress += dt / BREAK_HOLD_S;
    if (p.progress >= 1) {
      const broken = this.world.breakBlock(t.x, t.y);
      // Colheita: o que o mundo devolve cai no chão para ser coletado.
      if (broken !== null) this.drops.spawn(t.x + 0.5, t.y + 0.7, dropsFor(broken));
      this.entities.settleAll(this.world);
      p.target = null;
      p.progress = 0;
    }
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.elapsed += dt;
    this.time = (this.time + dt / DAY_LENGTH_S) % 1;

    // Em retrato no celular o jogo fica em espera (camada "Gire o aparelho").
    const blocked = this.screenMode?.blocked ?? false;
    if (blocked) this.press = null;
    const [ix, iy] = blocked ? [0, 0] : this.input();
    this.player.update(dt, ix, iy, this.world, this.entities.blocker);
    this.entities.update(dt, this.world);
    this.world.tick(dt);
    this.drops.update(dt, this.player, this.inventory);
    this.camera.follow(...this.cameraTarget(), dt);
    this.updateBreaking(dt);

    const loadRect = this.camera.visibleChunks(LOAD_MARGIN);
    this.world.ensureChunks(loadRect, MAX_CHUNK_GEN_PER_FRAME);
    this.unloadTimer += dt;
    if (this.unloadTimer > 1) {
      this.unloadTimer = 0;
      this.world.unloadFar(loadRect);
    }

    this.renderer.draw(this.camera, {
      player: this.player,
      actors: this.entities.actors,
      showChunkBorders: this.showChunkBorders,
      hover: this.hoverTarget(),
      hoverSheep: this.hoverSheep(),
      breaking: this.press?.target ? { ...this.press.target, progress: this.press.progress } : null,
      drops: this.drops.list,
      time: this.time,
      elapsed: this.elapsed,
      dt,
    });
    this.hud.update(this.selected, HOTBAR.map((s) => (s.kind === 'item' ? this.inventory.count(s.item) : null)));
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

  /** Destaque: durante a quebra, o alvo da quebra; senão, onde um toque agiria com o item/bloco selecionado. */
  private hoverTarget(): { x: number; y: number; valid: boolean } | null {
    if (!this.pointer.inside || this.joystick.active) return null;
    const { x, y } = this.pointer;
    const p = this.press;
    if (p && p.held > TAP_MAX_S) return this.breakTarget(x, y);
    const slot = this.slot;
    if (slot.kind === 'block') return this.blockTarget(x, y, slot.block);
    if (ITEMS[slot.item].plants) return this.plantTarget(x, y);
    return null; // trigo: o destaque é o anel na ovelha
  }

  private hoverSheep(): { x: number; y: number; valid: boolean } | null {
    const slot = this.slot;
    if (!this.pointer.inside || this.joystick.active || slot.kind !== 'item' || !ITEMS[slot.item].feeds) return null;
    if (this.press && this.press.held > TAP_MAX_S) return null;
    const f = this.feedTarget(this.pointer.x, this.pointer.y);
    return f ? { x: f.sheep.x, y: f.sheep.y, valid: f.valid } : null;
  }
}
