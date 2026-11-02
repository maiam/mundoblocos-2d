import { CUBE_FRONT, LOAD_MARGIN, MAX_CHUNK_GEN_PER_FRAME, TILE } from '../config';
import { CHARACTER_H } from '../render/character';
import { Renderer } from '../render/renderer';
import { itemIconUrl, toolIconUrl } from '../render/itemArt';
import { blockDef } from '../world/blocks';
import { canCraft, ITEMS, monsterDrops, type Recipe, type StackId, TOOLS } from '../world/items';
import { art } from '../render/art';
import { inRect } from '../world/dungeon';
import { World } from '../world/world';
import { WORLD_PROFILES, type WorldProfile } from '../world/profiles';
import { Camera } from './camera';
import { Drops } from './drops';
import { Entities } from './entities';
import { bagHasRoom, bagStacks, canCarry, Hotbar, type HotbarSlot, slotStack, stackSlot as stackSlotOf } from './hotbar';
import { BagPanel, type BagEntry } from './bag';
import { setProfessionIcon, SkillsPanel } from './skills';
import type { SlotView } from './hud';
import { Hud } from './hud';
import { Inventory } from './inventory';
import { Joystick } from './joystick';
import type { ScreenMode } from './screenMode';
import { MAX_HP, Player } from './player';
import { ActionButton, HAND_ICON } from './actionButton';
import { ActionController } from './actionController';
import { Menu } from './menu';
import { applySave, captureSave, type SaveData, type SaveStore } from './save';

/** Duração de um dia completo em segundos. */
const DAY_LENGTH_S = 480;
/** Duração entre salvamentos automáticos (s). */
const AUTOSAVE_S = 10;

/** Opções da sessão: salvamento para restaurar, armazenamento e ações do menu (vêm do main). */
export interface GameOptions {
  save?: SaveData | null;
  store?: SaveStore;
  onNewWorld?(): void;
  onRestart?(): void;
}

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
  /** Grade deste mundo: 8 espaços + bolsa (com coleta) ou lista fixa do perfil (Santuário). */
  readonly hotbar: Hotbar;
  private readonly bag: BagPanel;
  private readonly skills: SkillsPanel;
  /** Materiais precisam ser coletados neste mundo (perfil). */
  private readonly collect: boolean;
  readonly drops = new Drops();
  private readonly renderer: Renderer;
  private readonly hud: Hud;
  private readonly joystick: Joystick;
  private readonly keys = new Set<string>();
  private showChunkBorders = false;
  /** Espaço selecionado na hotbar; null = mão vazia. */
  private selected: number | null = null;
  private readonly actionButton: ActionButton;
  private readonly menu: Menu;
  private saveTimer = 0;
  /** Momento do último salvamento bem-sucedido (ms), 0 = ainda não salvou nesta sessão. */
  private lastSaved = 0;
  readonly actions: ActionController;
  private time = 0.31;
  private elapsed = 0;
  /** Flash vermelho ao levar dano (1 → 0). */
  private hurtFlash = 0;
  private lastHp = 0;
  private last = performance.now();
  private unloadTimer = 0;
  private running = true;
  private readonly cleanup: (() => void)[] = [];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    seed: number,
    private readonly screenMode?: ScreenMode,
    profile: WorldProfile = WORLD_PROFILES.principal,
    private readonly options: GameOptions = {},
  ) {
    this.world = new World(seed, profile);
    this.collect = profile.collectBlocks;
    this.hotbar = new Hotbar(profile, options.save?.hotbar ?? undefined);
    // Sem cultivo nem coleta, não há itens contáveis (Santuário: só blocos infinitos).
    this.inventory = profile.collectBlocks || profile.farming ? new Inventory() : new Inventory({});
    const [sx, sy] = this.world.findSpawn();
    this.player = new Player(sx + 0.5, sy + 0.6);
    this.entities = new Entities(this.player, Math.random, profile.character);
    if (profile.sheep) this.entities.spawnFlock(this.world, sx, sy);
    this.entities.spawnMonsters(this.world);
    // Monstro derrotado solta os espólios no lugar (seda, presas, Coração da Rainha).
    this.entities.onMonsterKilled = (m) => this.drops.spawn(m.x, m.y + 0.2, monsterDrops(m.kind));
    this.lastHp = this.player.hp;
    this.renderer = new Renderer(canvas, this.world);
    this.actions = new ActionController({
      world: this.world, entities: this.entities, player: this.player, inventory: this.inventory,
      drops: this.drops, camera: this.camera, renderer: this.renderer,
      slot: () => this.slot,
      joystickActive: () => this.joystick.active,
      collectBlocks: profile.collectBlocks,
      onConsumed: () => this.hotbar.prune(this.inventory),
    });
    this.hud = new Hud({
      slots: this.hotbar.length,
      onSelect: (i) => this.onSlot(i),
      menu: this.hotbar.dynamic
        ? {
          character: art().uiIcons?.character ?? '', skills: art().uiIcons?.skills ?? '', bag: art().uiIcons?.bag ?? '',
          onSkills: () => this.toggleSkills(), onBag: () => this.toggleBag(),
        }
        : undefined,
      // Corações só em mundo com dungeon.
      maxHp: profile.dungeon ? MAX_HP : 0,
    });
    this.bag = new BagPanel(this.hud.bagSection);
    setProfessionIcon('builder', art().uiIcons?.builder ?? '');
    this.skills = new SkillsPanel(this.hud.recipesSection, this.hud.professionsSection,
      (id) => { const v = this.stackView(id, null); return { icon: v.icon, name: v.name }; },
      (r) => this.craft(r));
    this.joystick = new Joystick(this.hud.root);
    this.actionButton = new ActionButton(this.hud.root, () => this.startAction(), () => this.actions.endAction());
    if (screenMode?.isTablet) this.hud.root.classList.add('tablet'); // sem botão de ação; toque age na tela
    this.menu = new Menu(this.hud.root, {
      seed,
      status: () => this.saveStatus(),
      onOpenChange: (open) => { if (open) { this.toggleBag(false); this.toggleSkills(false); this.actions.cancelAll(); this.saveNow(); } },
      onNewWorld: options.onNewWorld,
      onRestart: options.onRestart,
    });
    // Continua de onde parou (mesmo mundo e seed).
    if (options.save) {
      const r = applySave(options.save, {
        world: this.world, player: this.player, entities: this.entities, inventory: this.inventory,
        time: this.time, selected: this.selected, hotbar: null,
      });
      this.time = r.time;
      this.hotbar.prune(this.inventory);
      if (r.selected !== null && r.selected < this.hotbar.length) this.select(r.selected);
      this.lastHp = this.player.hp;
      this.lastSaved = options.save.savedAt;
    }
    this.resize();
    this.camera.follow(...this.cameraTarget(), 0, true);
    this.bindInput();
    requestAnimationFrame(this.frame);
  }

  destroy(): void {
    this.saveNow();
    this.running = false;
    for (const fn of this.cleanup) fn();
    this.hud.destroy();
  }

  private get slot(): HotbarSlot | null {
    return this.selected === null ? null : this.hotbar.get(this.selected);
  }

  /** Toque num espaço da grade: com a bolsa aberta, troca; senão, seleciona. */
  private onSlot(i: number): void {
    if (!this.bag.isOpen) {
      this.select(i);
      return;
    }
    // Bolsa aberta: põe o item escolhido no espaço (o que estava volta para a bolsa) ou guarda o espaço na bolsa
    // (só se a bolsa tiver lugar).
    if (!this.bag.picked && this.hotbar.stack(i) && !bagHasRoom(this.inventory, this.hotbar)) return;
    this.hotbar.assign(i, this.bag.picked);
    this.bag.picked = null;
    this.refreshSelection();
    this.bag.render(this.bagEntries());
  }

  /** Abre/fecha a bolsa (pausa o jogo enquanto aberta). */
  private toggleBag(force?: boolean): void {
    if (!this.hotbar.dynamic) return;
    const open = force ?? !this.bag.isOpen;
    if (open === this.bag.isOpen) return;
    if (open) this.toggleSkills(false); // um painel por vez acima da grade
    this.bag.setOpen(open);
    this.hud.setBagOpen(open);
    if (open) {
      this.actions.cancelAll();
      this.bag.render(this.bagEntries());
    }
  }

  /** Abre/fecha habilidades (receitas + profissões); pausa o jogo como a bolsa. */
  private toggleSkills(force?: boolean): void {
    if (!this.hotbar.dynamic) return;
    const open = force ?? !this.skills.isOpen;
    if (open === this.skills.isOpen) return;
    if (open) this.toggleBag(false);
    this.skills.setOpen(open);
    this.hud.setSkillsOpen(open);
    if (open) {
      this.actions.cancelAll();
      this.skills.render((id) => this.inventory.count(id));
    }
  }

  /**
   * Cria 1 vez a receita: gasta os ingredientes e o resultado entra na mão/bolsa. Se o resultado for de um tipo novo
   * e não houver lugar (mão e bolsa cheias), não cria.
   */
  private craft(r: Recipe): void {
    const count = (id: StackId) => this.inventory.count(id);
    if (!canCraft(r, count)) return;
    const out = r.output.item;
    // Se os ingredientes acabarem, liberam espaço; o resultado precisa caber depois do gasto.
    const after = new Map(r.inputs.map((i) => [i.item, count(i.item) - i.count]));
    const freed = [...after.values()].filter((n) => n <= 0).length;
    const isNew = count(out) <= 0;
    if (isNew && !canCarry(this.inventory, this.hotbar, out) && freed === 0) return;
    for (const i of r.inputs) this.inventory.take(i.item, i.count);
    this.hotbar.prune(this.inventory);
    this.inventory.add(out, r.output.count);
    this.hotbar.autoPlace(out);
    this.refreshSelection();
    this.skills.render(count);
  }

  /** O que está na bolsa (fora da grade), para os 18 espaços dela. */
  private bagEntries(): BagEntry[] {
    return bagStacks(this.inventory, this.hotbar).map((id) => {
      const n = this.inventory.count(id);
      const v = this.stackView(id, n);
      return { id, icon: v.icon, name: v.name, count: id.startsWith('tool:') ? null : n };
    });
  }

  /** Ícone, nome e quantidade de uma pilha. */
  private stackView(id: StackId, n: number | null): SlotView {
    const s = stackSlotOf(id);
    if (s.kind === 'tool') return { icon: toolIconUrl(s.tool), name: TOOLS[s.tool].name, count: null };
    if (s.kind === 'item') return { icon: itemIconUrl(s.item), name: ITEMS[s.item].name, count: n };
    return { icon: this.renderer.iconFor(s.block), name: blockDef(s.block).name, count: this.collect ? n : null };
  }

  /** O espaço selecionado esvaziou (material acabou, troca na bolsa)? Atualiza ferramenta equipada e ícone. */
  private refreshSelection(): void {
    const slot = this.slot;
    this.player.equipped = slot?.kind === 'tool' ? slot.tool : null;
    this.actionButton.setIcon(this.slotIcon(slot));
  }

  /** Coletou algo do chão: vai para a grade se já estiver nela ou houver espaço livre. */
  private onCollected(id: StackId): void {
    this.hotbar.autoPlace(id);
    if (this.bag.isOpen) this.bag.render(this.bagEntries());
    if (this.skills.isOpen) this.skills.render((id) => this.inventory.count(id));
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
        if (n <= this.hotbar.length) this.onSlot(n - 1);
      }
      if (e.code === 'KeyI' || e.code === 'KeyB') this.toggleBag();
      if (e.code === 'KeyK') this.toggleSkills();
      // KeyC: reservado para o painel do personagem (em breve).
      if (e.code === 'Escape') {
        if (this.skills.isOpen) this.toggleSkills(false);
        else if (this.bag.isOpen) this.toggleBag(false);
        else this.select(null);
      }
      if (e.code === 'Space') this.startAction();
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    });
    this.listen(window, 'keyup', (e) => {
      this.keys.delete(e.code);
      if (e.code === 'Space') this.actions.endAction();
    });
    // Salva ao esconder a aba ou fechar a página (celular troca de app sem aviso).
    this.listen(window, 'pagehide', () => this.saveNow());
    const onVisibility = (): void => { if (document.visibilityState === 'hidden') this.saveNow(); };
    document.addEventListener('visibilitychange', onVisibility);
    this.cleanup.push(() => document.removeEventListener('visibilitychange', onVisibility));
    this.listen(window, 'blur', () => {
      this.keys.clear();
      this.actions.cancelAll();
    });

    this.listen(c, 'contextmenu', (e) => e.preventDefault());
    this.listen(c, 'wheel', (e) => {
      e.preventDefault();
      this.camera.zoomBy(Math.exp(-e.deltaY * 0.0012));
    }, { passive: false });

    // Toque/clique curto = usar. Segurar sobre o mesmo alvo = quebrar.
    // No celular, a ação é pelo botão de ação (evita colocar/quebrar sem querer ao tocar na tela); no tablet, o toque
    // na tela age como o clique do computador e não há botão de ação.
    this.listen(c, 'pointerdown', (e) => {
      if (e.pointerType === 'touch' && !this.screenMode?.isTablet) return;
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
    const realDt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    // Menu aberto = jogo pausado (o mundo continua desenhado atrás do painel).
    const paused = this.menu.isOpen || this.bag.isOpen || this.skills.isOpen;
    const dt = paused ? 0 : realDt;
    this.elapsed += dt;
    this.time = (this.time + dt / DAY_LENGTH_S) % 1;
    this.saveTimer += dt;
    if (this.saveTimer >= AUTOSAVE_S) this.saveNow();

    // Em retrato no celular o jogo fica em espera (camada "Gire o aparelho").
    const blocked = (this.screenMode?.blocked ?? false) || paused;
    if (blocked) this.actions.cancelAll();
    const [ix, iy] = blocked ? [0, 0] : this.input(dt);
    this.player.update(dt, ix, iy, this.world, this.entities.blocker);
    this.entities.update(dt, this.world);
    this.updateHealth(dt);
    // Só ferramentas que golpeiam (espada, machado) acertam entidades; a enxada apenas ara.
    if (this.player.consumeHit() && this.player.attackTool && TOOLS[this.player.attackTool].strikes) {
      this.entities.strike(this.player.facing, this.world);
    }
    this.world.tick(dt);
    this.drops.update(dt, this.player, this.inventory, (id) => this.onCollected(id),
      (id) => !this.collect || canCarry(this.inventory, this.hotbar, id));
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
      hurtFlash: this.hurtFlash,
      inDungeon: this.inDungeon,
      entrance: this.world.dungeon && !this.inDungeon ? this.world.dungeon.doorstep : null,
      time: this.time,
      elapsed: this.elapsed,
      dt,
    });
    this.hud.setSlots(Array.from({ length: this.hotbar.length }, (_, i) => {
      const id = this.hotbar.stack(i);
      return id ? this.stackView(id, this.inventory.count(id)) : null;
    }));
    this.hud.update(this.selected ?? -1);
    // Corações só quando importam (ferida ou na dungeon) — tela limpa no resto do tempo.
    this.hud.setHealth(this.player.hp, this.inDungeon || this.player.hp < MAX_HP);
    const slot = this.slot;
    this.actionButton.update(this.actions.actionProgress,
      !!slot && slot.kind !== 'tool' && (slot.kind === 'item' || this.collect) && this.inventory.count(slotStack(slot)) === 0);
    requestAnimationFrame(this.frame);
  };

  /** Salva agora (silencioso se o navegador não permitir). */
  private saveNow(): void {
    this.saveTimer = 0;
    const store = this.options.store;
    if (!store || !this.running) return;
    const data = captureSave({
      world: this.world, player: this.player, entities: this.entities, inventory: this.inventory,
      time: this.time, selected: this.selected, hotbar: this.hotbar.dynamic ? this.hotbar.layout() : null,
    });
    if (store.save(data)) this.lastSaved = data.savedAt;
  }

  /** Texto do menu sobre o salvamento automático. */
  private saveStatus(): string {
    if (!this.options.store?.available) return 'Este navegador não permite salvar: o progresso some ao fechar.';
    if (!this.lastSaved) return 'Progresso salvo automaticamente a cada 10 s.';
    const s = Math.max(0, Math.round((Date.now() - this.lastSaved) / 1000));
    return `Progresso salvo automaticamente · último salvamento há ${s} s.`;
  }

  /** Personagem dentro da dungeon? (corações visíveis, penumbra, sem seta para a entrada). */
  private get inDungeon(): boolean {
    const d = this.world.dungeon;
    return !!d && inRect(d.area, this.player.cellX, this.player.cellY);
  }

  /** Flash ao levar dano; derrotada → renasce no início com vida cheia (itens ficam com ela). */
  private updateHealth(dt: number): void {
    if (this.player.hp < this.lastHp) this.hurtFlash = 1;
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 2.5);
    if (this.player.dead) {
      this.actions.cancelAll();
      // Ao cair, perde todos os materiais de construção (ferramentas, itens e espólios ficam).
      if (this.collect) {
        this.inventory.dropMaterials();
        this.hotbar.prune(this.inventory);
        this.refreshSelection();
      }
      // Renasce ao lado da última tenda (se de pé), senão no início.
      const [rx, ry] = this.world.respawnPoint();
      this.player.respawn(rx + 0.5, ry + 0.6);
      this.camera.follow(...this.cameraTarget(), 0, true);
      this.hurtFlash = 1;
    }
    this.lastHp = this.player.hp;
  }

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
