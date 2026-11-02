import { CUBE_FRONT, LOAD_MARGIN, MAX_CHUNK_GEN_PER_FRAME, TILE } from '../config';
import { CHARACTER_H } from '../render/character';
import { Renderer } from '../render/renderer';
import { itemIconUrl, toolIconUrl } from '../render/itemArt';
import { blockDef } from '../world/blocks';
import { ITEMS, TOOLS } from '../world/items';
import { World } from '../world/world';
import { WORLD_PROFILES, type WorldProfile } from '../world/profiles';
import { Camera } from './camera';
import { Drops } from './drops';
import { Entities } from './entities';
import { hotbarFor, type HotbarSlot } from './hotbar';
import { Hud } from './hud';
import { Inventory } from './inventory';
import { Joystick } from './joystick';
import type { ScreenMode } from './screenMode';
import { Player } from './player';
import { ActionButton, HAND_ICON } from './actionButton';
import { ActionController } from './actionController';

/** Duração de um dia completo em segundos. */
const DAY_LENGTH_S = 480;
/**
 * Orquestra mundo, personagem, câmera, entrada, render e HUD. Sem regra de domínio: o que cada toque/clique
 * faz fica no `ActionController`; as regras do mundo, no `World`.
 */
export class Game {
  readonly world: World;
  readonly camera = new Camera();
  readonly player: Player;
  readonly entities: Entities;
  readonly inventory: Inventory;
  /** Espaços da hotbar deste mundo (perfil). */
  private readonly hotbar: HotbarSlot[];
  readonly drops = new Drops();
  private readonly renderer: Renderer;
  private readonly hud: Hud;
  private readonly joystick: Joystick;
  private readonly keys = new Set<string>();
  private showChunkBorders = false;
  /** Espaço selecionado na hotbar; null = mão vazia. */
  private selected: number | null = null;
  private readonly actionButton: ActionButton;
  readonly actions: ActionController;
  private time = 0.31;
  private elapsed = 0;
  private last = performance.now();
  private unloadTimer = 0;
  private running = true;
  private readonly cleanup: (() => void)[] = [];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    seed: number,
    private readonly screenMode?: ScreenMode,
    profile: WorldProfile = WORLD_PROFILES.principal,
  ) {
    this.world = new World(seed, profile);
    this.hotbar = hotbarFor(profile);
    // Sem cultivo, não há itens contáveis (Santuário: só blocos).
    this.inventory = profile.farming ? new Inventory() : new Inventory({});
    const [sx, sy] = this.world.findSpawn();
    this.player = new Player(sx + 0.5, sy + 0.6);
    this.entities = new Entities(this.player, Math.random, profile.character);
    if (profile.sheep) this.entities.spawnFlock(this.world, sx, sy);
    this.entities.spawnMonsters(this.world);
    this.renderer = new Renderer(canvas, this.world);
    this.actions = new ActionController({
      world: this.world, entities: this.entities, player: this.player, inventory: this.inventory,
      drops: this.drops, camera: this.camera, renderer: this.renderer,
      slot: () => this.slot,
      joystickActive: () => this.joystick.active,
    });
    this.hud = new Hud({
      icons: this.hotbar.map((s) =>
        s.kind === 'tool' ? toolIconUrl(s.tool) : s.kind === 'item' ? itemIconUrl(s.item) : this.renderer.iconFor(s.block)),
      names: this.hotbar.map((s) =>
        s.kind === 'tool' ? TOOLS[s.tool].name : s.kind === 'item' ? ITEMS[s.item].name : blockDef(s.block).name),
      onSelect: (i) => this.select(i),
    });
    this.joystick = new Joystick(this.hud.root);
    this.actionButton = new ActionButton(this.hud.root, () => this.startAction(), () => this.actions.endAction());
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

  private get slot(): HotbarSlot | null {
    return this.selected === null ? null : this.hotbar[this.selected];
  }

  /**
   * Seleciona um espaço; selecionar de novo o mesmo solta (mão vazia).
   * Ferramenta selecionada = ferramenta equipada (muda o sprite).
   */
  private select(i: number | null): void {
    this.selected = i === null || i === this.selected ? null : Math.max(0, Math.min(this.hotbar.length - 1, i));
    const slot = this.slot;
    this.player.equipped = slot?.kind === 'tool' ? slot.tool : null;
    this.actionButton.setIcon(this.slotIcon(slot));
  }

  private slotIcon(slot: HotbarSlot | null): string {
    if (!slot) return HAND_ICON;
    if (slot.kind === 'tool') return toolIconUrl(slot.tool);
    if (slot.kind === 'item') return itemIconUrl(slot.item);
    return this.renderer.iconFor(slot.block);
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
        if (n <= this.hotbar.length) this.select(n - 1);
      }
      if (e.code === 'Escape') this.select(null);
      if (e.code === 'Space') this.startAction();
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    });
    this.listen(window, 'keyup', (e) => {
      this.keys.delete(e.code);
      if (e.code === 'Space') this.actions.endAction();
    });
    this.listen(window, 'blur', () => {
      this.keys.clear();
      this.actions.cancelAll();
    });

    this.listen(c, 'contextmenu', (e) => e.preventDefault());
    this.listen(c, 'wheel', (e) => {
      e.preventDefault();
      this.camera.zoomBy(Math.exp(-e.deltaY * 0.0012));
    }, { passive: false });

    // Toque/clique curto = colocar. Segurar 2 s sobre o mesmo alvo = quebrar.
    // No toque, a ação é pelo botão de ação (evita colocar/quebrar sem querer ao tocar na tela).
    this.listen(c, 'pointerdown', (e) => {
      if (e.pointerType === 'touch') return;
      if (!this.actions.pointerDown(e.pointerId, e.offsetX, e.offsetY)) return;
      try { c.setPointerCapture(e.pointerId); } catch { /* ponteiro já liberado */ }
    });
    this.listen(c, 'pointermove', (e) => this.actions.pointerMove(e.pointerId, e.offsetX, e.offsetY, e.pointerType === 'mouse'));
    this.listen(c, 'pointerup', (e) => this.actions.pointerUp(e.pointerId, e.offsetX, e.offsetY, e.pointerType === 'mouse'));
    this.listen(c, 'pointercancel', () => this.actions.pointerCancel());
    this.listen(c, 'pointerleave', () => this.actions.pointerLeave());
  }


  /** Botão de ação/Espaço: ignorado com a tela bloqueada ("Gire o aparelho"). */
  private startAction(): void {
    if (!this.screenMode?.blocked) this.actions.startAction();
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.elapsed += dt;
    this.time = (this.time + dt / DAY_LENGTH_S) % 1;

    // Em retrato no celular o jogo fica em espera (camada "Gire o aparelho").
    const blocked = this.screenMode?.blocked ?? false;
    if (blocked) this.actions.cancelAll();
    const [ix, iy] = blocked ? [0, 0] : this.input(dt);
    this.player.update(dt, ix, iy, this.world, this.entities.blocker);
    this.entities.update(dt, this.world);
    // Só ferramentas que golpeiam (espada, machado) acertam entidades; a enxada apenas ara.
    if (this.player.consumeHit() && this.player.attackTool && TOOLS[this.player.attackTool].strikes) {
      this.entities.strike(this.player.facing, this.world);
    }
    this.world.tick(dt);
    this.drops.update(dt, this.player, this.inventory);
    this.camera.follow(...this.cameraTarget(), dt);
    this.actions.update(dt);

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
      ...this.actions.targets(),
      drops: this.drops.list,
      time: this.time,
      elapsed: this.elapsed,
      dt,
    });
    this.hud.update(this.selected ?? -1, this.hotbar.map((s) => (s.kind === 'item' ? this.inventory.count(s.item) : null)));
    const slot = this.slot;
    this.actionButton.update(this.actions.actionProgress,
      slot?.kind === 'item' && this.inventory.count(slot.item) === 0);
    requestAnimationFrame(this.frame);
  };

  /** Teclado + joystick, ambos em direções de tela. */
  private input(dt: number): [number, number] {
    const k = this.keys;
    let x = this.joystick.x;
    let y = this.joystick.y;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (k.has('KeyW') || k.has('ArrowUp')) y -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y += 1;
    // Zoom contínuo independente da taxa de quadros (~1,35× por segundo).
    const z = Math.exp(0.3 * dt);
    if (k.has('KeyE') || k.has('Equal')) this.camera.zoomBy(z);
    if (k.has('KeyQ') || k.has('Minus')) this.camera.zoomBy(1 / z);
    return [x, y];
  }

}
