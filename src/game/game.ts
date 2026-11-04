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
import type { Facing } from './walker';
import { Camera } from './camera';
import type { NetSession } from '../net/session';
import { RemotePlayers } from './remotePlayers';
import { Drops } from './drops';
import { Entities } from './entities';
import { bagHasRoom, bagStacks, canCarry, Hotbar, type HotbarSlot, slotStack, stackSlot as stackSlotOf } from './hotbar';
import { BagPanel, type BagEntry } from './bag';
import { ChestPanel } from './chest';
import { setProfessionIcon, SkillsPanel } from './skills';
import type { SlotView } from './hud';
import { Hud } from './hud';
import { Inventory } from './inventory';
import { Joystick } from './joystick';
import type { ScreenMode } from './screenMode';
import { Player } from './player';
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
  /** Aviso curto mostrado ao abrir (ex.: "Novo mundo criado"). */
  notice?: string;
  /**
   * Multiplayer (ADR 0016): sessão já na sala (o mundo usa a seed dela). Sem salvamento local nesse modo; as ações do
   * mapa vão ao servidor e as dos outros chegam por ela.
   */
  net?: NetSession;
  /** Menu "Jogar com amigos": criar/entrar (jogando sozinho) e sair (na sala). Ausente = sem multiplayer (Santuário). */
  online?: { name: string; onCreate(name: string): void; onJoin(name: string, code: string): void; onLeave(): void };
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
  private readonly chest: ChestPanel;
  /** Pilha da heroína escolhida (da mão ou da bolsa) para levar ao baú. */
  private heroPicked: StackId | null = null;
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
  /** Outros jogadores da sala (multiplayer). */
  private readonly remotes = new RemotePlayers();
  /** Tempo até mandar a próxima posição ao servidor e a última mandada. */
  private stateTimer = 0;
  private lastState = '';
  /** Escurecer rápido ao passar por uma porta de interior (1 → 0). */
  private fade = 0;
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
    if (profile.sheep) {
      // Rebanho no campo, do lado de fora do portão da cidade.
      const [gx, gy] = this.world.outsideGate();
      this.entities.spawnFlock(this.world, gx, gy + (this.world.town ? 8 : 0));
      // Cavalo no mesmo campo, um pouco mais longe da estrada.
      this.entities.spawnHorse(this.world, gx + 9, gy + (this.world.town ? 10 : 2));
    }
    this.entities.spawnVillagers(this.world);
    this.entities.spawnMonsters(this.world);
    // Monstro derrotado solta os espólios no lugar (seda, presas, Coração da Rainha).
    this.entities.onMonsterKilled = (m) => this.drops.spawn(m.x, m.y + 0.2, monsterDrops(m.kind));
    this.entities.onDamage = (x, y, hit, target) => this.renderer.addDamage(x, y, hit, target);
    this.lastHp = this.player.hp;
    this.renderer = new Renderer(canvas, this.world);
    this.actions = new ActionController({
      world: this.world, entities: this.entities, player: this.player, inventory: this.inventory,
      drops: this.drops, camera: this.camera, renderer: this.renderer,
      slot: () => this.slot,
      joystickActive: () => this.joystick.active,
      collectBlocks: profile.collectBlocks,
      onConsumed: () => this.hotbar.prune(this.inventory),
      onOpenChest: (x, y) => this.openChest(x, y),
      notify: (text) => this.hud.toast(text),
      onAction: (a) => options.net?.sent(a),
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
      health: profile.dungeon,
    });
    this.bag = new BagPanel(this.hud.bagSection, (i, e) => this.onBagTap(i, e));
    this.chest = new ChestPanel(this.hud.chestSection, (i) => this.onChestTap(i));
    setProfessionIcon('builder', art().uiIcons?.builder ?? '');
    this.skills = new SkillsPanel(this.hud.recipesSection, this.hud.professionsSection,
      (id) => { const v = this.stackView(id, null); return { icon: v.icon, name: v.name }; },
      (r) => this.craft(r));
    this.joystick = new Joystick(this.hud.root);
    this.actionButton = new ActionButton(this.hud.root, () => this.startAction(), () => this.actions.endAction());
    if (screenMode?.isTablet) this.hud.root.classList.add('tablet'); // toque na tela também age (além do botão)
    this.menu = new Menu(this.hud.root, {
      seed,
      status: () => this.saveStatus(),
      onOpenChange: (open) => { if (open) { this.toggleBag(false); this.toggleSkills(false); this.actions.cancelAll(); this.saveNow(); } },
      onNewWorld: options.net ? undefined : options.onNewWorld,
      onRestart: options.net ? undefined : options.onRestart,
      online: options.online && {
        ...options.online,
        room: options.net?.room ?? undefined,
        players: () => 1 + (options.net?.others.size ?? 0),
      },
    });
    if (options.net) {
      // Na sala: o mundo recebe as edições já feitas; as dos outros chegam depois (e ninguém fica preso num bloco).
      const net = options.net;
      net.attach(this.world);
      net.onApplied = () => this.entities.settleAll(this.world);
      net.onRejected = () => this.hud.toast('Ação não aceita pela sala');
    }
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
      // Salvo dentro de um interior: volta para a rua, diante da porta (o cômodo não guarda estado).
      const room = this.world.interiorAt(this.player.cellX, this.player.cellY);
      if (room) this.moveTo(room.outside, 'down');
    }
    this.resize();
    this.camera.follow(...this.cameraTarget(), 0, true);
    this.bindInput();
    if (options.notice) this.hud.toast(options.notice);
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
    if (this.chest.isOpen) {
      this.onHandTapWithChest(i);
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
    if (!open) this.closeChest();
    this.bag.setOpen(open);
    this.hud.setBagOpen(open);
    if (open) {
      this.actions.cancelAll();
      this.bag.render(this.bagEntries());
    }
  }

  // ---- Baú (tocar no item e depois no destino) ----

  /** Abre o baú da célula: painel do baú + bolsa acima da mão (pausa o jogo). */
  private openChest(x: number, y: number): void {
    if (!this.world.chestAt(x, y)) return;
    this.toggleSkills(false);
    this.toggleBag(true);
    this.chest.setOpen([x, y]);
    this.hud.setChestOpen(true);
    this.heroPicked = null;
    this.refreshChestUi();
  }

  private closeChest(): void {
    if (!this.chest.isOpen) return;
    this.chest.setOpen(null);
    this.hud.setChestOpen(false);
    this.heroPicked = null;
    this.hud.setHandPicked(-1);
  }

  private get chestSlots() {
    const at = this.chest.at;
    return at ? this.world.chestAt(at[0], at[1]) : null;
  }

  private refreshChestUi(): void {
    const slots = this.chestSlots;
    if (!slots) return this.closeChest();
    this.chest.render(slots, (id) => {
      const v = this.stackView(id, null);
      return { icon: v.icon, name: v.name, tool: id.startsWith('tool:') };
    });
    this.bag.picked = this.heroPicked && this.hotbar.indexOf(this.heroPicked) < 0 ? this.heroPicked : null;
    this.bag.render(this.bagEntries());
    this.hud.setHandPicked(this.heroPicked ? this.hotbar.indexOf(this.heroPicked) : -1);
  }

  /** Recebe uma pilha do baú: soma se já tem; tipo novo só com lugar (na mão em `hand`, senão na bolsa). */
  private receiveFromChest(item: StackId, count: number, hand: number | null): boolean {
    const has = this.inventory.count(item) > 0;
    if (hand !== null) {
      const displaced = this.hotbar.stack(hand);
      if (!has && displaced && displaced !== item && !bagHasRoom(this.inventory, this.hotbar)) return false;
      this.inventory.add(item, count);
      this.hotbar.assign(hand, item);
      return true;
    }
    if (!has && !bagHasRoom(this.inventory, this.hotbar)) return false;
    this.inventory.add(item, count);
    return true;
  }

  private onChestTap(j: number): void {
    const slots = this.chestSlots;
    if (!slots) return;
    const here = slots[j];
    if (this.heroPicked) {
      // Da heroína para o baú: espaço vazio ou com o mesmo item (soma).
      const id = this.heroPicked;
      if (!here || here.item === id) {
        const n = this.inventory.count(id);
        this.inventory.take(id, n);
        slots[j] = { item: id, count: (here?.count ?? 0) + n };
        this.hotbar.prune(this.inventory);
        this.refreshSelection();
        this.heroPicked = null;
      } else {
        this.heroPicked = null;
        this.chest.picked = j;
      }
    } else if (this.chest.picked !== null) {
      // Dentro do baú: troca de lugar (ou soma se for o mesmo item).
      const p = this.chest.picked;
      if (p !== j) {
        const from = slots[p]!;
        if (here && here.item === from.item) { here.count += from.count; slots[p] = null; }
        else { slots[p] = here; slots[j] = from; }
      }
      this.chest.picked = null;
    } else if (here) {
      this.chest.picked = j;
    }
    this.refreshChestUi();
  }

  /** Mão com o baú aberto: recebe o item escolhido do baú, ou escolhe a pilha para levar. */
  private onHandTapWithChest(i: number): void {
    const slots = this.chestSlots!;
    const p = this.chest.picked;
    if (p !== null) {
      const s = slots[p]!;
      if (this.receiveFromChest(s.item as StackId, s.count, i)) slots[p] = null;
      else this.hud.toast('Sem espaço na bolsa');
      this.chest.picked = null;
      this.refreshSelection();
    } else if (this.heroPicked) {
      this.hotbar.assign(i, this.heroPicked); // da bolsa (ou outro espaço) para este espaço da mão
      this.heroPicked = null;
      this.refreshSelection();
    } else {
      const id = this.hotbar.stack(i);
      this.heroPicked = id;
    }
    this.refreshChestUi();
  }

  /** Bolsa com o baú aberto: recebe o item escolhido do baú, ou escolhe a pilha para levar. */
  private onBagTap(_i: number, e: BagEntry | undefined): boolean {
    if (!this.chest.isOpen) return false;
    const slots = this.chestSlots!;
    const p = this.chest.picked;
    if (p !== null) {
      const s = slots[p]!;
      if (this.receiveFromChest(s.item as StackId, s.count, null)) slots[p] = null;
      else this.hud.toast('Sem espaço na bolsa');
      this.chest.picked = null;
    } else {
      this.heroPicked = e && this.heroPicked !== e.id ? e.id : null;
    }
    this.refreshChestUi();
    return true;
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
    if (this.chest.isOpen) this.refreshChestUi();
    else if (this.bag.isOpen) this.bag.render(this.bagEntries());
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
      // Digitando num campo (nome, código de convite): as teclas são do campo, não do jogo.
      if (e.target instanceof HTMLInputElement) return;
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
    // na tela age como o clique do computador e o botão de ação também fica.
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
    if (!blocked) this.updateInteriors(iy);
    this.fade = Math.max(0, this.fade - dt * 2.5);
    this.entities.update(dt, this.world);
    this.updateNet(realDt);
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

    const room = this.world.interiorAt(this.player.cellX, this.player.cellY);
    this.renderer.draw(this.camera, {
      player: this.player,
      actors: this.remotes.size ? [...this.entities.actors, ...this.remotes.actors] : this.entities.actors,
      showChunkBorders: this.showChunkBorders,
      ...this.actions.targets(),
      drops: this.drops.list,
      hurtFlash: this.hurtFlash,
      inDungeon: this.inDungeon,
      entrance: this.world.dungeon && !this.inDungeon && !room ? this.world.dungeon.doorstep : null,
      interior: room,
      fade: this.fade,
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
    this.hud.setHealth(this.player.hp, this.player.maxHp, this.inDungeon || this.player.hp < this.player.maxHp);
    const slot = this.slot;
    this.actionButton.update(this.actions.actionProgress,
      !!slot && slot.kind !== 'tool' && (slot.kind === 'item' || this.collect) && this.inventory.count(slotStack(slot)) === 0);
    requestAnimationFrame(this.frame);
  };

  /**
   * Multiplayer: acompanha os outros jogadores e manda a minha posição ~10×/s quando muda (pausado também: o jogo
   * dos outros continua). Sem sessão, nada.
   */
  private updateNet(dt: number): void {
    const net = this.options.net;
    if (!net) return;
    this.remotes.sync(net.others);
    this.remotes.update(dt, this.world);
    this.stateTimer -= dt;
    if (this.stateTimer > 0) return;
    this.stateTimer = 0.1;
    const p = this.player;
    const s = { x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100, facing: p.facing, moving: p.moving };
    const key = JSON.stringify(s);
    if (key === this.lastState) return;
    this.lastState = key;
    net.sendState(s);
  }

  /** Mensagem curta na tela e na área "Jogar com amigos" do menu (erros de conexão/sala). */
  notify(text: string): void {
    this.hud.toast(text);
    this.menu.onlineMessage(text);
  }

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
    if (this.options.net) return 'Jogando com amigos: o que muda nesta sala não é salvo neste aparelho.';
    if (!this.options.store?.available) return 'Este navegador não permite salvar: o progresso some ao fechar.';
    if (!this.lastSaved) return 'Progresso salvo automaticamente a cada 10 s.';
    const s = Math.max(0, Math.round((Date.now() - this.lastSaved) / 1000));
    return `Progresso salvo automaticamente · último salvamento há ${s} s.`;
  }

  /**
   * Interiores (ADR 0014): andar para cima na célula diante da porta entra no cômodo (aparece logo acima do capacho);
   * pisar no capacho volta para a rua, diante da porta.
   */
  private updateInteriors(iy: number): void {
    const p = this.player;
    const room = this.world.interiorAt(p.cellX, p.cellY);
    if (room) {
      if (p.cellX === room.exit[0] && p.cellY === room.exit[1]) this.moveTo(room.outside, 'down');
      return;
    }
    const door = iy < -0.3 ? this.world.interiorEntrance(p.cellX, p.cellY) : null;
    if (door) {
      this.moveTo(door.entry, 'up');
      this.hud.toast(door.def.name);
    }
  }

  /** Leva a personagem para a célula (centro), virada para `facing`, com a câmera junto e um escurecer rápido. */
  private moveTo([x, y]: [number, number], facing: Facing): void {
    const p = this.player;
    p.x = x + 0.5;
    p.y = y + 0.5;
    p.facing = facing;
    p.settle(this.world);
    this.actions.cancelAll();
    this.camera.follow(...this.cameraTarget(), 0, true);
    this.fade = 1;
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
      // Ao cair, perde tudo; só as ferramentas ficam.
      if (this.collect) {
        this.inventory.dropOnDeath();
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
