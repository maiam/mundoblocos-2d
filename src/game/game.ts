import { CUBE_FRONT, LOAD_MARGIN, MAX_CHUNK_GEN_PER_FRAME, TILE } from '../config';
import { CHARACTER_H } from '../render/character';
import { Renderer } from '../render/renderer';
import { ITEM_ICON_URLS, TOOL_ICON_URLS } from '../render/itemArt';
import { blockDef } from '../world/blocks';
import { dropsFor, ITEMS, TOOLS } from '../world/items';
import { World } from '../world/world';
import { WORLD_PROFILES, type WorldProfile } from '../world/profiles';
import { Camera } from './camera';
import { Drops } from './drops';
import { Entities } from './entities';
import { hotbarFor, type HotbarSlot } from './hotbar';
import { Hud } from './hud';
import { Inventory } from './inventory';
import type { Sheep } from './sheep';
import { Joystick } from './joystick';
import type { ScreenMode } from './screenMode';
import { Player } from './player';
import { ActionButton, HAND_ICON } from './actionButton';
import type { Facing } from './walker';

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

/** Um "segurar" em andamento (dedo/mouse na tela ou botão de ação). */
interface Hold {
  held: number;
  /** Célula sendo quebrada e progresso 0..1 (reinicia ao trocar de alvo). */
  target: { x: number; y: number } | null;
  progress: number;
}

interface Press extends Hold {
  id: number;
  sx: number;
  sy: number;
  moved: boolean;
}

type CellTarget = { x: number; y: number; valid: boolean };

/** Deslocamento da célula "à frente" para cada direção do sprite. */
const FACING_DIR: Record<Facing, [number, number]> = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };

/** Orquestra mundo, personagem, câmera, input, render e HUD. Sem regra de domínio. */
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
  /** Botão de ação (ou Espaço) pressionado: toque curto usa, segurar 2 s quebra o alvo à frente. */
  private action: Hold | null = null;
  private time = 0.31;
  private elapsed = 0;
  private last = performance.now();
  private unloadTimer = 0;
  private pointer = { x: 0, y: 0, inside: false };
  private press: Press | null = null;
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
    this.renderer = new Renderer(canvas, this.world);
    this.hud = new Hud({
      icons: this.hotbar.map((s) =>
        s.kind === 'tool' ? TOOL_ICON_URLS[s.tool] : s.kind === 'item' ? ITEM_ICON_URLS[s.item] : this.renderer.iconFor(s.block)),
      names: this.hotbar.map((s) =>
        s.kind === 'tool' ? TOOLS[s.tool].name : s.kind === 'item' ? ITEMS[s.item].name : blockDef(s.block).name),
      onSelect: (i) => this.select(i),
    });
    this.joystick = new Joystick(this.hud.root);
    this.actionButton = new ActionButton(this.hud.root, () => this.startAction(), () => this.endAction());
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
    if (slot.kind === 'tool') return TOOL_ICON_URLS[slot.tool];
    if (slot.kind === 'item') return ITEM_ICON_URLS[slot.item];
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
      if (e.code === 'Space') this.endAction();
    });
    this.listen(window, 'blur', () => {
      this.keys.clear();
      this.action = null;
    });

    this.listen(c, 'contextmenu', (e) => e.preventDefault());
    this.listen(c, 'wheel', (e) => {
      e.preventDefault();
      this.camera.zoomBy(Math.exp(-e.deltaY * 0.0012));
    }, { passive: false });

    // Toque/clique curto = colocar. Segurar 2 s sobre o mesmo alvo = quebrar.
    // No toque, a ação é pelo botão de ação (evita colocar/quebrar sem querer ao tocar na tela).
    this.listen(c, 'pointerdown', (e) => {
      if (this.press || e.pointerType === 'touch') return;
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

  // ---- Regras por célula (iguais para cursor e botão de ação) ----

  /** Pode quebrar aqui? Não se cava o chão sob nenhuma entidade. */
  private canBreakAt(x: number, y: number): boolean {
    return this.world.canBreak(x, y) && !(this.world.breakTarget(x, y) === 'ground' && this.entities.occupies(x, y));
  }

  /** Pode usar o espaço selecionado (bloco/semente) nesta célula? Ovelha: ver `canFeed`. */
  private canUseAt(slot: HotbarSlot | null, x: number, y: number): boolean {
    if (!slot) return false;
    if (slot.kind === 'tool') return slot.tool === 'hoe' && this.world.canTill(x, y);
    if (slot.kind === 'block') return this.world.canPlace(x, y, slot.block) && !this.entities.occupies(x, y);
    if (ITEMS[slot.item].plants) return this.inventory.count(slot.item) > 0 && this.world.canPlant(x, y);
    return false;
  }

  private canFeed(sheep: Sheep): boolean {
    return sheep.canEat && this.inventory.count('wheat') > 0;
  }

  /** Aplica o espaço selecionado: coloca bloco, planta ou alimenta. */
  private applyUse(slot: HotbarSlot | null, x: number, y: number, sheep: Sheep | null): void {
    if (!slot) return; // mão vazia ainda não tem ação
    if (slot.kind === 'tool') {
      // Enxada ara a terra; as demais ferramentas ainda não têm ação.
      if (slot.tool === 'hoe' && this.canUseAt(slot, x, y)) this.world.till(x, y);
      return;
    }
    if (slot.kind === 'block') {
      if (!this.canUseAt(slot, x, y)) return;
      this.world.placeBlock(x, y, slot.block);
      this.entities.settleAll(this.world);
      return;
    }
    const def = ITEMS[slot.item];
    if (def.plants) {
      if (this.canUseAt(slot, x, y) && this.inventory.take(slot.item)) this.world.plant(x, y);
    } else if (def.feeds === 'sheep' && sheep && this.canFeed(sheep) && this.inventory.take(slot.item)) {
      sheep.feed();
    }
  }

  // ---- Alvo pelo cursor (mouse) ----

  /** Alvo de quebra sob o ponto da tela (objeto do topo ou o chão). */
  private breakTarget(sx: number, sy: number): CellTarget {
    const { x, y } = this.renderer.pick(this.camera, sx, sy);
    return { x, y, valid: this.inReach(x, y) && this.canBreakAt(x, y) };
  }

  /** Célula de chão sob o ponto da tela (ignora objetos altos à frente). */
  private groundCell(sx: number, sy: number): [number, number] {
    const [wx, wy] = this.camera.screenToWorld(sx, sy);
    return [Math.floor(wx / TILE), Math.floor(wy / TILE)];
  }

  /** Célula onde o espaço selecionado agiria sob o cursor (bloco empilha se tocou num cubo com espaço). */
  private useTarget(sx: number, sy: number): CellTarget | null {
    const slot = this.slot;
    if (!slot || (slot.kind === 'tool' && slot.tool !== 'hoe') || (slot.kind === 'item' && !ITEMS[slot.item].plants)) return null;
    let [x, y] = this.groundCell(sx, sy);
    if (slot.kind === 'block') {
      const picked = this.renderer.pick(this.camera, sx, sy);
      const top = picked.hasObject ? this.world.topBlock(picked.x, picked.y) : null;
      if (top && (blockDef(top.id).shape === 'decoration' || this.world.canPlace(picked.x, picked.y, slot.block))) {
        [x, y] = [picked.x, picked.y];
      }
    }
    return { x, y, valid: this.inReach(x, y) && this.canUseAt(slot, x, y) };
  }

  /** Ovelha sob o cursor (com trigo selecionado). */
  private sheepUnderCursor(sx: number, sy: number): Sheep | null {
    const [wx, wy] = this.camera.screenToWorld(sx, sy);
    const sheep = this.entities.sheepAt(wx / TILE, wy / TILE);
    return sheep && Math.hypot(sheep.x - this.player.x, sheep.y - this.player.y) <= REACH ? sheep : null;
  }

  /** Clique curto do mouse. */
  private place(sx: number, sy: number): void {
    const slot = this.slot;
    if (slot?.kind === 'item' && ITEMS[slot.item].feeds) {
      this.applyUse(slot, 0, 0, this.sheepUnderCursor(sx, sy));
      return;
    }
    const t = this.useTarget(sx, sy);
    if (t?.valid) this.applyUse(slot, t.x, t.y, null);
  }

  // ---- Alvo à frente da personagem (botão de ação) ----

  /** Célula imediatamente à frente da personagem, na direção em que ela olha. */
  private frontCell(): [number, number] {
    const [dx, dy] = FACING_DIR[this.player.facing];
    return [this.player.cellX + dx, this.player.cellY + dy];
  }

  /** Ovelha logo à frente da personagem (para dar trigo). */
  private frontSheep(): Sheep | null {
    const [dx, dy] = FACING_DIR[this.player.facing];
    const px = this.player.x + dx * 0.9;
    const py = this.player.y + dy * 0.9;
    let best: Sheep | null = null;
    let bestD = 0.8;
    for (const s of this.entities.npcs) {
      const d = Math.hypot(s.x - px, s.y - py);
      if (d < bestD) { best = s; bestD = d; }
    }
    return best;
  }

  private startAction(): void {
    if (this.screenMode?.blocked || this.action) return;
    this.action = { held: 0, target: null, progress: 0 };
  }

  /** Soltou o botão: se foi um toque curto, usa o selecionado no alvo à frente. */
  private endAction(): void {
    const a = this.action;
    this.action = null;
    if (!a || a.held > TAP_MAX_S) return;
    const slot = this.slot;
    if (slot?.kind === 'item' && ITEMS[slot.item].feeds) {
      this.applyUse(slot, 0, 0, this.frontSheep());
      return;
    }
    const [x, y] = this.frontCell();
    this.applyUse(slot, x, y, null);
  }

  /**
   * Avança um "segurar": o progresso só acumula num alvo válido e reinicia se
   * o alvo mudar; ao completar, quebra e continua no que estiver por baixo
   * (ex.: bloco de baixo da pilha, depois o chão).
   */
  private advanceHold(h: Hold, t: CellTarget, dt: number): void {
    if (!t.valid) {
      h.target = null;
      h.progress = 0;
      return;
    }
    if (!h.target || h.target.x !== t.x || h.target.y !== t.y) {
      h.target = { x: t.x, y: t.y };
      h.progress = 0;
    }
    h.progress += dt / BREAK_HOLD_S;
    if (h.progress >= 1) {
      const broken = this.world.breakBlock(t.x, t.y);
      // Colheita: o que o mundo devolve cai no chão para ser coletado.
      if (broken !== null) this.drops.spawn(t.x + 0.5, t.y + 0.7, dropsFor(broken));
      this.entities.settleAll(this.world);
      h.target = null;
      h.progress = 0;
    }
  }

  private updateBreaking(dt: number): void {
    const p = this.press;
    if (p) {
      p.held += dt;
      if (p.held > TAP_MAX_S) this.advanceHold(p, this.breakTarget(this.pointer.x, this.pointer.y), dt);
    }
    const a = this.action;
    if (a) {
      a.held += dt;
      if (a.held > TAP_MAX_S) {
        const [x, y] = this.frontCell();
        this.advanceHold(a, { x, y, valid: this.canBreakAt(x, y) }, dt);
      }
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
    if (blocked) {
      this.press = null;
      this.action = null;
    }
    const [ix, iy] = blocked ? [0, 0] : this.input(dt);
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
      focus: this.focusTarget(),
      breaking: this.breakingState(),
      drops: this.drops.list,
      time: this.time,
      elapsed: this.elapsed,
      dt,
    });
    this.hud.update(this.selected ?? -1, this.hotbar.map((s) => (s.kind === 'item' ? this.inventory.count(s.item) : null)));
    const slot = this.slot;
    this.actionButton.update(this.action && this.action.held > TAP_MAX_S ? this.action.progress : 0,
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

  private breakingState(): { x: number; y: number; progress: number } | null {
    const h = this.action?.target ? this.action : this.press?.target ? this.press : null;
    return h?.target ? { ...h.target, progress: h.progress } : null;
  }

  /** Destaque do mouse: durante a quebra, o alvo da quebra; senão, onde o clique agiria. */
  private hoverTarget(): CellTarget | null {
    if (!this.pointer.inside || this.joystick.active) return null;
    const { x, y } = this.pointer;
    const p = this.press;
    if (p && p.held > TAP_MAX_S) return this.breakTarget(x, y);
    return this.useTarget(x, y);
  }

  /** Anel na ovelha alvo do trigo: sob o mouse ou, com a personagem parada, à frente dela. */
  private hoverSheep(): CellTarget | null {
    const slot = this.slot;
    if (slot?.kind !== 'item' || !ITEMS[slot.item].feeds) return null;
    let sheep: Sheep | null = null;
    if (this.pointer.inside && !this.joystick.active) {
      if (this.press && this.press.held > TAP_MAX_S) return null;
      sheep = this.sheepUnderCursor(this.pointer.x, this.pointer.y);
    } else if (!this.player.moving) {
      sheep = this.frontSheep();
    }
    return sheep ? { x: sheep.x, y: sheep.y, valid: this.canFeed(sheep) } : null;
  }

  /**
   * Alvo do botão de ação: com a personagem parada, a célula à frente ganha um
   * contorno de seleção (válido se dá para usar o selecionado ou quebrar).
   * Andando, nada fica selecionado. Com o mouse sobre o mundo, vale o destaque do mouse.
   */
  private focusTarget(): CellTarget | null {
    if (this.pointer.inside || this.player.moving) return null;
    const slot = this.slot;
    if (slot?.kind === 'item' && ITEMS[slot.item].feeds && this.frontSheep()) return null; // anel na ovelha
    const [x, y] = this.frontCell();
    return { x, y, valid: this.canUseAt(slot, x, y) || this.canBreakAt(x, y) };
  }
}
