import { CUBE_FRONT, DAY_LENGTH_S, LOAD_MARGIN, MAX_CHUNK_GEN_PER_FRAME, SUBDIV, TILE } from '../config';
import { CHARACTER_H } from '../render/character';
import { Renderer } from '../render/renderer';
import type { GameRenderer, RendererFactory } from '../render/rendererContract';
import { itemIconUrl, toolIconUrl } from '../render/itemArt';
import { blockDef, type BlockId } from '../world/blocks';
import { canCraft, type ItemId, ITEMS, monsterDrops, type Recipe, type StackId, STATION_REACH, TOOLS } from '../world/items';
import { art } from '../render/art';
import { World } from '../world/world';
import { WORLD_PROFILES, type WorldProfile } from '../world/profiles';
import type { Facing } from './walker';
import { Camera } from './camera';
import type { NetSession } from '../net/session';
import type { PlayerState } from '../net/protocol';
import { RemotePlayers } from './remotePlayers';
import { Drops } from './drops';
import { canSit, Entities, type HeroBody } from './entities';
import { exitDoorAt, type InteriorDoor, type InteriorLayout } from '../world/interiors';
import { BAG_SLOTS, bagHasRoom, bagStacks, canCarry, Hotbar, type HotbarSlot, slotStack, stackSlot as stackSlotOf } from './hotbar';
import type { RecipeDestination } from './skills';
import { BagPanel, type BagEntry } from './bag';
import { ChestPanel } from './chest';
import { setProfessionIcon, SkillsPanel } from './skills';
import type { SlotView } from './hud';
import { Hud } from './hud';
import { Inventory } from './inventory';
import { Joystick } from './joystick';
import type { ScreenMode } from './screenMode';
import { Player } from './player';
import { configureSanctuaryThreeCollision } from './sanctuaryThreeCollision';
import { ActionButton, HAND_ICON } from './actionButton';
import { DialogueBox } from './dialogue';
import { ShopWindow } from './shopWindow';
import { buyOffer, CURRENCY, MARKET_STOCK, type BuyResult, type ShopOffer } from '../world/shop';
import type { Villager } from './villager';
import { ActionController } from './actionController';
import { Menu } from './menu';
import { applySave, captureSave, type SaveData, type SaveStore } from './save';
import { HUNGER, weaponPower } from '../world/progression';
import type { MonsterKind } from '../world/dungeon';
import { CreatureMirror } from './creatureMirror';
import { MONSTERS } from './monster';
import { Minimap, type MinimapMarker } from '../render/minimap';
import { Exploration } from './exploration';

/** Duração de um dia completo em segundos. */
/** Duração entre salvamentos automáticos (s). */
const AUTOSAVE_S = 10;
/** Raio da névoa revelada em volta do jogador (células): cerca da área visível na tela. */
const REVEAL_RADIUS = 14 * SUBDIV;

/** Opções da sessão: salvamento para restaurar, armazenamento e ações do menu (vêm do main). */
export interface GameOptions {
  /** Only the Santuário supplies a WebGL renderer; main World always uses Canvas2D. */
  rendererFactory?: RendererFactory;
  /** Piloto do Mundo em 2.5D (`?fisica=solida`): o jogador não sobe em cubos sozinho (sem degrau). Só vale com o render 3D. */
  solidPhysics?: boolean;
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
  online?: {
    name: string; available: boolean; site: string;
    counts?(): Promise<Record<number, { players: number; max: number }> | null>;
    onJoin(name: string, room: number): void; onLeave(): void;
  };
  /** Aparência do personagem num mundo novo (o salvamento, se houver, prevalece); null/ausente = heroína. */
  /** Personagem pronto num mundo novo, quando não há `look` (o salvamento, se houver, prevalece). */
  body?: HeroBody;
  /**
   * Vitrine da tela de entrada: o mundo roda e se desenha atrás dela, sem HUD, sem entrada e sem salvar
   * (a câmera passeia devagar pela Cidade do Despertar).
   */
  showcase?: boolean;
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
  private readonly renderer: GameRenderer;
  /** Tempo (ms) que `renderer.draw` gastou nos últimos quadros (anel de 1200): separa o custo de JS do custo de GPU no painel `?fps=1`. */
  private readonly drawRing = new Float32Array(1200);
  private drawCount = 0;
  get drawTimes(): { samples: Float32Array; count: number } {
    return { samples: this.drawRing, count: this.drawCount };
  }
  /** Contadores de desempenho da GPU (só o renderer WebGL tem; null no 2D): usados pelo painel `?fps=1` (dev e piloto). */
  get rendererStats(): ReturnType<NonNullable<GameRenderer['stats']>> | null {
    return this.renderer.stats?.() ?? null;
  }
  private readonly hud: Hud;
  private readonly joystick: Joystick;
  private readonly keys = new Set<string>();
  private showChunkBorders = false;
  /** Espaço selecionado na hotbar; null = mão vazia. */
  private selected: number | null = null;
  private readonly actionButton: ActionButton;
  /** Caixa de conversa dos NPCs (aparece no centro da tela; só interface). */
  private readonly dialogue: DialogueBox;
  /** Janela do Mercado (criada na primeira vez que se fala com o mercador). */
  private shop: ShopWindow | null = null;
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
  /** Na sala: espelho dos animais e monstros da sala. */
  private mirror: CreatureMirror | null = null;
  /** Névoa do minimapa: o que o jogador já viu (salvo junto com o mundo). */
  readonly exploration = new Exploration();
  private minimap: Minimap | null = null;
  /** Última célula em que a névoa foi revelada (só revela de novo ao mudar de célula). */
  private revealedAt = '';
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
    this.hotbar = new Hotbar(profile, (options.save?.hotbar ?? options.net?.bag?.hotbar ?? undefined) as (StackId | null)[] | undefined);
    // Sem cultivo nem coleta, não há itens contáveis (Santuário: só blocos infinitos).
    this.inventory = profile.collectBlocks || profile.farming ? new Inventory() : new Inventory({});
    const [sx, sy] = this.world.findSpawn();
    this.player = new Player(sx + 0.5, sy + 0.6);
    // Only 3D Santuário: cubes are solid obstacles rather than automatic steps.
    // The main World and the optional Santuário Canvas2D renderer are unchanged.
    configureSanctuaryThreeCollision(this.player, profile.id, !!options.rendererFactory, !!options.solidPhysics);
    this.player.hungerOn = profile.hunger;
    this.entities = new Entities(this.player, Math.random, profile.character);
    if (options.body) this.entities.body = options.body;
    // Animais e monstros: na sala vêm do servidor (o aparelho só espelha); sozinho, nascem aqui pela seed.
    if (options.net) this.entities.remote = true;
    else this.entities.spawnWildlife(this.world, true);
    this.entities.spawnVillagers(this.world);
    // Monstro derrotado solta os espólios no lugar (seda, presas, Coração da Rainha).
    this.entities.onMonsterKilled = (m) => this.drops.spawn(m.x, m.y + 0.2, monsterDrops(m.kind));
    this.entities.onDamage = (x, y, hit, target) => this.renderer.addDamage(x, y, hit, target);
    this.lastHp = this.player.hp;
    this.renderer = options.rendererFactory?.(canvas, this.world) ?? new Renderer(canvas, this.world);
    this.camera.setCellsTall(this.renderer.preferredCellsTall);
    this.actions = new ActionController({
      world: this.world, entities: this.entities, player: this.player, inventory: this.inventory,
      drops: this.drops, camera: this.camera, renderer: this.renderer,
      slot: () => this.slot,
      joystickActive: () => this.joystick.active,
      collectBlocks: profile.collectBlocks,
      sharedLoot: !!options.net,
      onConsumed: () => this.hotbar.prune(this.inventory),
      onOpenChest: (x, y) => this.openChest(x, y),
      notify: (text) => this.hud.toast(text),
      talk: (v) => this.talkTo(v),
      onAction: (a) => options.net?.sent(a),
      canSit: () => profile.character === 'heroine' && canSit(this.entities.body),
      onFeed: options.net ? (animal, item) => {
        const id = this.mirror?.idOf(animal);
        if (id) options.net!.feed(id, item);
      } : undefined,
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
    if (profile.minimap) this.minimap = new Minimap(this.hud.root);
    this.bag = new BagPanel(this.hud.bagSection, (i, e) => this.onBagTap(i, e));
    this.chest = new ChestPanel(this.hud.chestSection, (i) => this.onChestTap(i));
    setProfessionIcon('builder', art().uiIcons?.builder ?? '');
    // Cozinheiro: o ícone do Caldeirão (onde se cozinha) até chegar arte própria.
    setProfessionIcon('cook', art().craftables?.cauldron?.icon ?? '');
    this.skills = new SkillsPanel(this.hud.recipesSection, this.hud.professionsSection,
      (id) => { const v = this.stackView(id, null); return { icon: v.icon, name: v.name }; },
      (r) => this.craft(r),
      // Ficha da receita aberta: a bolsa aparece à direita (no lugar das profissões) para ver o item entrar.
      (open) => { this.bag.peek(open); if (open) this.bag.render(this.bagEntries()); },
      (r) => this.craftDestination(r),
      { hand: HAND_ICON, bag: art().uiIcons?.bag ?? '' });
    this.joystick = new Joystick(this.hud.root);
    this.dialogue = new DialogueBox(this.hud.root);
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
        room: options.net?.roomName ?? undefined,
        players: () => 1 + (options.net?.others.size ?? 0),
      },
    });
    if (options.net) {
      // Na sala: o mundo recebe as edições já feitas; as dos outros chegam depois (e ninguém fica preso num bloco).
      const net = options.net;
      net.attach(this.world);
      // Mesmo horário para todos: o relógio segue o da sala (e é acertado a cada sincronização).
      if (net.time !== null) this.time = net.time;
      net.onTime = (t) => { this.time = t; };
      // Itens no chão e baús são da sala: o servidor cria os itens e decide quem pega; os baús vêm e vão por ela.
      this.drops.addShared(net.drops);
      net.onDrops = (list) => this.drops.addShared(list);
      this.drops.claim = (id) => net.take(id);
      net.onTaken = (id, mine) => {
        const item = this.drops.resolveClaim(id, mine);
        if (item) { this.inventory.add(item); this.onCollected(item); }
      };
      net.onChest = (x, y) => {
        this.sentChest.set(`${x},${y}`, JSON.stringify(this.world.chestAt(x, y)));
        const at = this.chest.at;
        if (at && at[0] === x && at[1] === y) { this.chest.picked = null; this.refreshChestUi(); }
      };
      // Bolsa e lugar guardados na sala para este nome (primeira vez: bolsa inicial, no ponto de início).
      const bag = net.bag;
      if (bag) {
        this.inventory.replaceAll(bag.inventory as Partial<Record<StackId, number>>);
        this.hotbar.prune(this.inventory);
        const [bx, by] = this.world.isWalkable(Math.floor(bag.x), Math.floor(bag.y))
          ? [bag.x, bag.y] : this.world.nearestWalkable(Math.floor(bag.x), Math.floor(bag.y)).map((v) => v + 0.5);
        this.player.x = bx;
        this.player.y = by;
      }
      // Bichos da sala (Etapa 3): a sala roda animais e monstros; aqui só o espelho. Golpe, comida e mordida passam por ela.
      const mirror = new CreatureMirror(this.entities, this.world);
      this.mirror = mirror;
      net.onMobs = (list) => mirror.apply(list);
      net.onBite = (kind, x, y) => { if (kind in MONSTERS) this.entities.biteFrom(kind as MonsterKind, x, y, this.world); };
      net.onHits = (list) => { for (const [x, y, amount, crit] of list) this.renderer.addDamage(x, y, { amount, crit: crit === 1 }, 'enemy'); };
      net.onFed = (_id, item) => {
        if (item in ITEMS && this.inventory.take(item as ItemId)) this.hotbar.prune(this.inventory);
      };
      net.onApplied = () => this.entities.settleAll(this.world);
      net.onRejected = () => this.hud.toast('Ação não aceita pela sala');
    }
    // Continua de onde parou (mesmo mundo e seed).
    let droppedBlocks = 0;
    if (options.save) {
      const r = applySave(options.save, {
        world: this.world, player: this.player, entities: this.entities, inventory: this.inventory,
        exploration: this.exploration, time: this.time, selected: this.selected, hotbar: null,
      });
      this.time = r.time;
      droppedBlocks = r.droppedBlocks;
      this.hotbar.prune(this.inventory);
      if (r.selected !== null && r.selected < this.hotbar.length) this.select(r.selected);
      this.lastHp = this.player.hp;
      this.lastSaved = options.save.savedAt;
      // Salvo dentro de um interior: volta para a rua, diante da porta (o cômodo não guarda estado).
      const room = this.world.interiorAt(this.player.cellX, this.player.cellY);
      if (room) this.moveTo(this.roomExit(room), 'down');
    }
    if (options.showcase) this.hud.root.style.display = 'none';
    this.resize();
    this.camera.follow(...this.cameraTarget(), 0, true);
    if (options.showcase) this.listen(window, 'resize', this.resize);
    else this.bindInput();
    if (options.notice) this.hud.toast(options.notice);
    // O 3º nível de blocos saiu do jogo (limite de 2 níveis): não some em silêncio.
    if (droppedBlocks) this.hud.toast(`O limite agora é de 2 níveis de blocos: ${droppedBlocks} ${droppedBlocks === 1 ? 'bloco do 3º nível foi removido' : 'blocos do 3º nível foram removidos'} deste mundo`);
    const spilled = this.spillBagOverflow();
    if (spilled) this.hud.toast(`A bolsa agora tem ${BAG_SLOTS} espaços: ${spilled} ${spilled === 1 ? 'item caiu' : 'itens caíram'} no chão aos seus pés`);
    requestAnimationFrame(this.frame);
  }

  destroy(): void {
    this.saveNow();
    this.sendBag(true); // na sala: a bolsa fica guardada lá até a próxima entrada
    this.running = false;
    for (const fn of this.cleanup) fn();
    this.dialogue.destroy();
    this.shop?.destroy();
    this.hud.destroy();
    this.renderer.dispose?.();
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

  /** Último conteúdo de cada baú mandado à/recebido da sala (só manda quando muda). */
  private readonly sentChest = new Map<string, string>();

  private refreshChestUi(): void {
    const slots = this.chestSlots;
    if (!slots) return this.closeChest();
    // Na sala: o baú mudou aqui → a sala guarda e repassa aos outros.
    const net = this.options.net;
    const at = this.chest.at!;
    const key = `${at[0]},${at[1]}`;
    const json = JSON.stringify(slots);
    if (net && this.sentChest.get(key) !== json) {
      if (this.sentChest.has(key) || slots.some((s) => s)) net.sendChest(at[0], at[1], slots);
      this.sentChest.set(key, json);
    }
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
    if (this.skills.detailOpen) return true; // ficha de receita: a bolsa aparece só para ver
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
      this.skills.render((id) => this.inventory.count(id), this.nearStation);
    }
  }

  /** Há um bloco `id` (estação de receita, ex.: Caldeirão) a até `STATION_REACH` células da personagem? */
  private nearStation = (id: BlockId): boolean => {
    const p = this.player;
    const r = STATION_REACH;
    for (let y = Math.floor(p.y - r); y <= Math.floor(p.y + r); y++) {
      for (let x = Math.floor(p.x - r); x <= Math.floor(p.x + r); x++) {
        if (this.world.getObject(x, y) === id && Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y) <= r + 0.5) return true;
      }
    }
    return false;
  };

  /**
   * Cria 1 vez a receita: gasta os ingredientes e o resultado entra na mão/bolsa. Se o resultado for de um tipo novo
   * e não houver lugar (mão e bolsa cheias), não cria.
   */
  private craft(r: Recipe): void {
    const count = (id: StackId) => this.inventory.count(id);
    if (!canCraft(r, count, this.nearStation)) {
      if (r.station !== undefined && r.inputs.every((i) => count(i.item) >= i.count)) {
        this.hud.toast(`Chegue perto de um ${blockDef(r.station).name} para fazer ${r.name}`);
      }
      return;
    }
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
    this.skills.render(count, this.nearStation);
    if (this.bag.visible) this.bag.render(this.bagEntries());
    const dest = this.hotbar.indexOf(out) >= 0 ? 'na mão' : 'na bolsa';
    this.hud.toast(`+${r.output.count} ${this.stackView(out, null).name} ${dest}`);
  }

  /** Para onde vai o que a receita cria (mesma regra de `craft`): pilha que já existe, espaço livre ou o que os ingredientes liberam. */
  private craftDestination(r: Recipe): RecipeDestination {
    const out = r.output.item;
    const count = (id: StackId) => this.inventory.count(id);
    if (this.hotbar.indexOf(out) >= 0) return 'mão';
    if (count(out) > 0) return 'bolsa';
    if (this.hotbar.hasFree) return 'mão';
    if (bagHasRoom(this.inventory, this.hotbar)) return 'bolsa';
    // Mão e bolsa cheias: um ingrediente que acaba libera o lugar dele.
    const spent = r.inputs.find((i) => count(i.item) > 0 && count(i.item) - i.count <= 0);
    if (!spent) return null;
    return this.hotbar.indexOf(spent.item) >= 0 ? 'mão' : 'bolsa';
  }

  /**
   * Bolsa menor (v0.57.0: 18 → 12 espaços): o que passar do limite num salvamento antigo cai no chão aos pés da
   * personagem (nada se perde; dá para pegar de volta ou guardar num baú). Devolve quantos tipos caíram.
   */
  private spillBagOverflow(): number {
    if (!this.hotbar.dynamic) return 0;
    const extra = bagStacks(this.inventory, this.hotbar).slice(BAG_SLOTS);
    for (const id of extra) {
      const n = this.inventory.count(id);
      this.inventory.take(id, n);
      this.drops.spawn(this.player.x, this.player.y + 0.3, [{ item: id, count: n }]);
    }
    return extra.length;
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
    if (this.skills.isOpen) this.skills.render((id) => this.inventory.count(id), this.nearStation);
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
    if (this.options.showcase) {
      // Vitrine: passeio lento em volta da praça (a heroína fica parada no início).
      const t = this.elapsed * 0.07;
      return [(this.player.x + Math.sin(t) * 7) * TILE, (this.player.y + Math.sin(t * 1.7) * 3 - 2) * TILE];
    }
    // Usa a altura suavizada: subir num bloco desloca a câmera sem trancos.
    return [this.player.x * TILE, this.player.y * TILE - this.player.visualZ * CUBE_FRONT - CHARACTER_H * 0.4 + this.dialogueShift];
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
        if (this.shop?.isOpen) this.shop.close();
        else if (this.dialogue.isOpen) this.dialogue.close();
        else if (this.skills.detailOpen) this.skills.closeDetail();
        else if (this.skills.isOpen) this.toggleSkills(false);
        else if (this.bag.isOpen) this.toggleBag(false);
        else this.select(null);
      }
      if (e.code === 'Enter' && this.dialogue.isOpen) this.dialogue.advance();
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
      if (this.dialogue.isOpen) { this.dialogue.advance(); return; } // clique no mundo com a conversa aberta: avança
      if (!this.actions.pointerDown(e.pointerId, e.offsetX, e.offsetY)) return;
      try { c.setPointerCapture(e.pointerId); } catch { /* ponteiro já liberado */ }
    });
    this.listen(c, 'pointermove', (e) => this.actions.pointerMove(e.pointerId, e.offsetX, e.offsetY, e.pointerType === 'mouse'));
    this.listen(c, 'pointerup', (e) => this.actions.pointerUp(e.pointerId, e.offsetX, e.offsetY, e.pointerType === 'mouse'));
    this.listen(c, 'pointercancel', () => this.actions.pointerCancel());
    // Captura perdida sem pointerup (gesto do navegador): cancela, para não ficar quebrando sem ninguém segurar.
    this.listen(c, 'lostpointercapture', () => this.actions.pointerCancel());
    this.listen(c, 'pointerleave', () => this.actions.pointerLeave());
  }


  /** Botão de ação/Espaço. */
  /** Quanto a câmera desce (px de mundo) com a conversa aberta, para quem fala não ficar atrás da caixa (suavizado). */
  private dialogueShift = 0;

  private startAction(): void {
    if (this.dialogue.isOpen) { this.dialogue.advance(); return; } // conversa aberta: o botão de ação avança o texto
    this.actions.startAction();
  }

  /** Alcance (células) até onde a conversa continua aberta; quem tem ofício atende do outro lado do balcão. */
  private static readonly TALK_KEEP = 3.2 * SUBDIV;
  private static readonly TALK_KEEP_ROLE = 4.4 * SUBDIV;

  /** Toque num morador: abre a caixa de conversa com ele (ou avança, se já falando com ele). */
  private talkTo(v: Villager): void {
    if (this.dialogue.isOpen && this.dialogue.npc === v) { this.dialogue.advance(); return; }
    this.actions.cancelAll();
    v.faceTo(this.player.x, this.player.y);
    if (v.role === 'merchant') { this.openShop(v); return; } // o mercador não conversa: abre a loja (v0.93.57)
    this.dialogue.open(v.conversation(), v, () => v.release());
  }

  /** Mercado: abre a janela da loja com o mercador (o jogo pausa enquanto ela está aberta). */
  private openShop(v: Villager): void {
    this.dialogue.close();
    this.shop ??= new ShopWindow(this.hud.root, {
      frame: art().shopFrame ?? '',
      title: 'Mercado',
      greeting: 'Confira os meus itens à venda!',
      icon: (item) => itemIconUrl(item),
      coins: () => this.inventory.count(CURRENCY),
      buy: (offer) => this.buyAtMarket(offer),
      onOpenChange: (open) => { if (!open) this.shopMerchant?.release(); },
    });
    this.shopMerchant = v;
    v.conversation(); // segura o mercador parado enquanto a loja está aberta (`release` ao fechar)
    this.shop.open(MARKET_STOCK, { portrait: art().portraits?.[v.npc] });
  }
  private shopMerchant: Villager | null = null;

  /** Compra 1 unidade no Mercado com Moedas de Cobre: entrega na grade (se houver lugar) ou na bolsa. */
  private buyAtMarket(offer: ShopOffer): BuyResult {
    const r = buyOffer(this.inventory, offer, (item) => canCarry(this.inventory, this.hotbar, item));
    if (r !== 'ok') return r;
    this.hotbar.prune(this.inventory); // a pilha de moedas pode ter acabado
    this.hotbar.autoPlace(offer.item);
    this.refreshSelection();
    if (this.bag.visible) this.bag.render(this.bagEntries());
    return r;
  }

  /** A conversa fecha sozinha se a personagem se afasta, leva dano ou abre um painel; o NPC fica virado para ela. */
  private updateDialogue(): void {
    const npc = this.dialogue.npc;
    if (!npc) return;
    const far = Math.hypot(npc.x - this.player.x, npc.y - this.player.y) > (npc.role ? Game.TALK_KEEP_ROLE : Game.TALK_KEEP);
    if (far || this.player.dead || this.player.invuln > 0 || this.menu.isOpen || this.bag.isOpen || this.skills.isOpen) { this.dialogue.close(); return; }
    npc.faceTo(this.player.x, this.player.y);
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    const realDt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    // Menu aberto = jogo pausado (o mundo continua desenhado atrás do painel).
    const paused = this.menu.isOpen || this.bag.isOpen || this.skills.isOpen || !!this.shop?.isOpen;
    const dt = paused ? 0 : realDt;
    this.elapsed += dt;
    this.time = (this.time + dt / DAY_LENGTH_S) % 1;
    this.saveTimer += dt;
    if (this.saveTimer >= AUTOSAVE_S) this.saveNow();

    const blocked = paused;
    if (blocked) this.actions.cancelAll();
    const [ix, iy] = blocked ? [0, 0] : this.input(dt);
    this.player.update(dt, ix, iy, this.world, this.entities.blocker);
    if (!blocked) this.updateInteriors(iy);
    this.fade = Math.max(0, this.fade - dt * 2.5);
    this.entities.update(dt, this.world);
    this.updateDialogue();
    this.updateNet(realDt);
    this.updateHealth(dt);
    // Só ferramentas que golpeiam (espada, machado) acertam entidades; a enxada apenas ara.
    if (this.player.consumeHit() && this.player.attackTool && TOOLS[this.player.attackTool].strikes) {
      const net = this.options.net;
      if (net) net.strike(this.player.facing, this.player.stats.attack + weaponPower(this.player.attackTool));
      else this.entities.strike(this.player.facing, this.world);
    }
    // Na sala, plantas e árvores crescem pelo servidor (mensagens `grow`); aqui só a água.
    this.world.tick(dt, Math.random, !this.options.net);
    this.drops.update(dt, this.player, this.inventory, (id) => this.onCollected(id),
      (id) => !this.collect || canCarry(this.inventory, this.hotbar, id));
    const shiftWant = this.dialogue.isOpen ? (this.dialogue.boxHeight * 0.62) / this.camera.zoom : 0;
    this.dialogueShift += (shiftWant - this.dialogueShift) * (1 - Math.exp(-7 * realDt));
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
    this.updateMinimap(room?.def.name ?? null, now);
    const drawStart = performance.now();
    this.renderer.draw(this.camera, {
      player: this.player,
      actors: this.remotes.size ? [...this.entities.actors, ...this.remotes.actors] : this.entities.actors,
      showChunkBorders: this.showChunkBorders,
      // Vitrine: sem marcação de célula (ninguém está jogando).
      ...(this.options.showcase ? { hover: null, hoverSheep: null, focus: null, breaking: null } : this.actions.targets()),
      drops: this.drops.list,
      hurtFlash: this.hurtFlash,
      inDungeon: this.inDungeon,
      entrance: this.world.cave && !this.inDungeon && !room ? this.world.cave.outside : null,
      dungeonArea: this.inDungeon ? this.world.dungeon!.area : null,
      interior: room,
      fade: this.fade,
      time: this.time,
      elapsed: this.elapsed,
      dt,
    });
    this.drawRing[this.drawCount++ % this.drawRing.length] = performance.now() - drawStart;
    this.hud.setSlots(Array.from({ length: this.hotbar.length }, (_, i) => {
      const id = this.hotbar.stack(i);
      return id ? this.stackView(id, this.inventory.count(id)) : null;
    }));
    this.hud.update(this.selected ?? -1);
    // Corações só quando importam (ferida ou na dungeon) — tela limpa no resto do tempo.
    this.hud.setHealth(this.player.hp, this.player.maxHp, this.inDungeon || this.player.hp < this.player.maxHp);
    this.hud.setHunger(this.player.hungerOn ? this.player.hunger : null, HUNGER.max);
    const slot = this.slot;
    this.actionButton.update(this.actions.actionProgress,
      !!slot && slot.kind !== 'tool' && (slot.kind === 'item' || this.collect) && this.inventory.count(slotStack(slot)) === 0);
    requestAnimationFrame(this.frame);
  };

  /** Revela a névoa em volta do jogador (ao mudar de célula, fora dos cômodos) e redesenha o minimapa. */
  private updateMinimap(place: string | null, now: number): void {
    if (!this.minimap || this.options.showcase) return;
    const p = this.player;
    const cell = `${p.cellX},${p.cellY}`;
    let force = false;
    if (!place && cell !== this.revealedAt) {
      this.revealedAt = cell;
      force = this.exploration.revealAround(p.cellX, p.cellY, REVEAL_RADIUS);
    }
    const markers: MinimapMarker[] = [];
    const town = this.world.town;
    // No covil o mapa é só o labirinto (a cidade e a tenda ficam em outro lugar do mundo).
    if (town && !this.inDungeon) {
      const a = town.area;
      markers.push({ kind: 'town', x: (a.x0 + a.x1 + 1) / 2, y: (a.y0 + a.y1 + 1) / 2, pinned: true });
    }
    const cave = this.world.cave;
    if (cave && !this.inDungeon && this.exploration.isExplored(cave.outside[0], cave.outside[1])) {
      markers.push({ kind: 'dungeon', x: cave.outside[0] + 0.5, y: cave.outside[1] + 0.5, pinned: true });
    }
    const tent = this.world.tent;
    if (tent && !this.inDungeon) markers.push({ kind: 'tent', x: tent[0] + 0.5, y: tent[1] + 0.5, pinned: true });
    for (const r of this.remotes.actors) markers.push({ kind: 'friend', x: r.x, y: r.y });
    this.minimap.update({ world: this.world, exploration: this.exploration, player: p, markers, place }, now, force);
  }

  /**
   * Multiplayer: acompanha os outros jogadores e manda a minha posição ~10×/s quando muda (pausado também: o jogo
   * dos outros continua). Sem sessão, nada.
   */
  private updateNet(dt: number): void {
    const net = this.options.net;
    if (!net) return;
    this.remotes.sync(net.others);
    this.remotes.update(dt, this.world);
    this.mirror?.update(dt);
    this.bagTimer -= dt;
    if (this.bagTimer <= 0) {
      this.bagTimer = 5;
      this.sendBag();
    }
    this.stateTimer -= dt;
    if (this.stateTimer > 0) return;
    this.stateTimer = 0.1;
    const p = this.player;
    const s: PlayerState = { x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100, facing: p.facing, moving: p.moving };
    const tool = p.attacking ? p.attackTool : p.equipped;
    if (tool) s.tool = tool;
    if (p.swings) s.swing = p.swings;
    if (p.sitting) s.sit = p.sitFrame;
    const key = JSON.stringify(s);
    if (key === this.lastState) return;
    this.lastState = key;
    net.sendState(s);
  }

  /** Última bolsa mandada à sala (só manda de novo quando muda). */
  private lastBag = '';
  private bagTimer = 0;

  /** Na sala: manda a bolsa e a posição para a sala guardar (a cada 5 s, se mudou, e ao sair). */
  sendBag(force = false): void {
    const net = this.options.net;
    if (!net) return;
    const p = this.player;
    const bag = {
      inventory: Object.fromEntries(this.inventory.entries()) as Record<string, number>,
      hotbar: this.hotbar.dynamic ? this.hotbar.layout() : null,
      x: Math.round(p.x * 100) / 100,
      y: Math.round(p.y * 100) / 100,
    };
    const key = JSON.stringify(bag);
    if (!force && key === this.lastBag) return;
    this.lastBag = key;
    net.sendBag(bag);
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
      exploration: this.exploration, time: this.time, selected: this.selected, hotbar: this.hotbar.dynamic ? this.hotbar.layout() : null,
    });
    if (store.save(data)) this.lastSaved = data.savedAt;
  }

  /** Texto do menu sobre o salvamento automático. */
  private saveStatus(): string {
    if (this.options.net) return 'Jogando com amigos: o mundo e a sua bolsa ficam salvos na sala (no servidor).';
    if (!this.options.store?.available) return 'Este navegador não permite salvar: o progresso some ao fechar.';
    if (!this.lastSaved) return 'Progresso salvo automaticamente a cada 10 s.';
    const s = Math.max(0, Math.round((Date.now() - this.lastSaved) / 1000));
    return `Progresso salvo automaticamente · último salvamento há ${s} s.`;
  }

  /**
   * Interiores (ADR 0014): andar para cima na célula diante da porta entra no cômodo (aparece logo acima do capacho);
   * pisar no capacho volta para a rua, diante da porta.
   */
  /** Frente da tenda por onde se entrou no cômodo da tenda (estado de execução). */
  private tentReturn: [number, number] | null = null;

  private updateInteriors(iy: number): void {
    const p = this.player;
    // Covil das Aranhas (ADR 0019): pisar no vão de saída volta para diante da caverna; andar para cima diante da
    // boca da caverna entra no labirinto.
    const cave = this.world.cave;
    if (cave && this.inDungeon) {
      if (this.world.isDungeonExit(p.cellX, p.cellY)) this.moveTo(cave.outside, 'down');
      return;
    }
    if (cave && iy < -0.3 && this.world.isCaveDoor(p.cellX, p.cellY)) {
      this.moveTo(this.world.dungeonEntry()!, 'up');
      this.hud.toast('Covil das Aranhas');
      return;
    }
    const room = this.world.interiorAt(p.cellX, p.cellY);
    if (room) {
      const out = exitDoorAt(room, p.cellX, p.cellY);
      if (out) this.moveTo(this.roomExit(room, out), 'down');
      return;
    }
    if (iy >= -0.3) return;
    const hit = this.world.interiorDoorAt(p.cellX, p.cellY);
    const tentRoom = !hit && this.world.tentDoorAt(p.cellX, p.cellY) ? this.world.tentRoom : null;
    const enter = hit?.room ?? tentRoom;
    if (!enter) return;
    // Tenda: um cômodo para todas; a volta é para diante da tenda por onde se entrou.
    if (tentRoom) this.tentReturn = [p.cellX, p.cellY];
    this.moveTo((hit?.door ?? enter.doors[0]).entry, 'up');
    this.hud.toast(enter.def.name);
  }

  /** Onde a saída do cômodo leva: a porta da construção ou, na tenda, a frente da tenda por onde se entrou. */
  private roomExit(room: InteriorLayout, door: InteriorDoor = room.doors[0]): [number, number] {
    if (door.outside) return door.outside;
    // Tenda: a frente por onde se entrou; sem ela (salvo lá dentro), diante da última tenda ou o ponto de renascer.
    const back = this.tentReturn;
    this.tentReturn = null;
    if (back && this.world.tentDoorAt(back[0], back[1])) return back;
    const t = this.world.tent;
    if (t && this.world.isWalkable(t[0], t[1] + 1)) return [t[0], t[1] + 1];
    return this.world.respawnPoint();
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
    return this.world.inDungeon(this.player.cellX, this.player.cellY);
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
