import { CHUNK_SIZE, CUBE_FRONT, DAY_LENGTH_S, LOAD_MARGIN, MAX_CHUNK_GEN_PER_FRAME, SUBDIV, TILE } from '../config';
import { CHARACTER_H } from '../render/character';
import type { GameRenderer, RendererFactory } from '../render/rendererContract';
import { itemIconUrl, toolIconUrl } from '../render/itemArt';
import { blockDef, type BlockId } from '../world/blocks';
import { canCraft, type ItemId, ITEMS, monsterDrops, type Recipe, type StackId, STATION_REACH, stackBlock, TOOLS } from '../world/items';
import { art } from '../render/art';
import { World } from '../world/world';
import { tilledIn } from '../world/farmPlot';
import { type WorldProfile } from '../world/profiles';
import type { Facing } from './walker';
import { Camera, initialZoomMultiplier } from './camera';
import type { NetSession } from '../net/session';
import type { PlayerState } from '../net/protocol';
import { RemotePlayers } from './remotePlayers';
import { Drops } from './drops';
import { canSit, Entities, HERO_NAMES, type HeroBody } from './entities';
import { CharacterWindow } from './characterWindow';
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
import { ShopWindow, type ShopStyle } from './shopWindow';
import { buyOffer, CURRENCY, FLORIST_STOCK, MARKET_STOCK, type BuyResult, type ShopOffer } from '../world/shop';
import type { Conversation, Villager } from './villager';
import { ActionController } from './actionController';
import { Menu } from './menu';
import { noteBuy, noteTalk, shopGreeting, tierOf } from './npcBrain/memory';
import { phaseAt, scheduleOf, shopOpen } from './npcBrain/schedule';
import {
  accept as acceptMissionLog, complete as completeMission, COIN, goalsOf, isReady as isMissionReady, type Mission, type MissionEvent, marksOf as missionMarks,
  bonusFor, missionOf, nextMission, onEvent as onMissionEvent,
} from './npcBrain/missions';
import { haveOf, markOf, phaseOf, type QuestDef, questOf, questsFor, takeOf } from './npcBrain/quests';
import { applySave, captureSave, type SaveData, type SaveStore } from './save';
import { HUNGER, weaponPower } from '../world/progression';
import type { MonsterKind } from '../world/dungeon';
import { CreatureMirror } from './creatureMirror';
import { MONSTERS } from './monster';
import { Minimap, type MinimapMarker } from '../render/minimap';
import { WorldMap, type WorldMapView } from '../render/worldMap';
import { attackTimingFor } from './attackTiming';
import { feelOn, LOOKAHEAD_PX, LOOKAHEAD_RATE } from './feel';
import { Exploration } from './exploration';

/** Duração de um dia completo em segundos. */
/** Duração entre salvamentos automáticos (s). */
const AUTOSAVE_S = 10;
/** Raio da névoa revelada em volta do jogador (células): cerca da área visível na tela. */
const REVEAL_RADIUS = 14 * SUBDIV;
/** Retorno do golpe: duração (s) do hit-stop, quanto o tempo da simulação cai nele e a tremida (px de mundo). */
const HITSTOP_S = 0.055;
const HITSTOP_CRIT_S = 0.1;
const HITSTOP_SCALE = 0.06;
const SHAKE_HIT = 1.6;
const SHAKE_CRIT = 3.2;
const SHAKE_HURT = 2.2;

/** Opções da sessão: salvamento para restaurar, armazenamento e ações do menu (vêm do main). */
export interface GameOptions {
  /** O renderer 2.5D em WebGL do mundo (o Canvas 2D foi removido na v0.93.105): o `main` o monta e avisa quando o aparelho não tem WebGL. */
  rendererFactory: RendererFactory;
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
    /** Salas que esta página oferece (o mundo normal não lista o Santuário). */
    rooms: ReadonlyArray<{ id: number; name: string }>;
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
  /** Presets por orientação só se aplicam enquanto o usuário não ajustou o zoom. */
  private zoomModifiedByUser = false;
  private lastZoomPortrait: boolean | null = null;
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
  /** Missões, carteira e painel do personagem ligados (`WorldProfile.progression`; desligado na Sala 2). */
  private readonly progression: boolean;
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
  /** Retorno do golpe (v0.93.63): pausa curta (`hitStop`, s) e tremida de câmera (`shake`, px de mundo; some em ~0,15 s). */
  /** Antecipação da câmera (px de mundo): vai na direção do movimento (v0.93.69). */
  private look = { x: 0, y: 0 };
  private hitStop = 0;
  private shake = 0;
  private shakeOff = { x: 0, y: 0 };
  /** Outros jogadores da sala (multiplayer). */
  private readonly remotes = new RemotePlayers();
  /** Na sala: espelho dos animais e monstros da sala. */
  private mirror: CreatureMirror | null = null;
  /** Névoa do minimapa: o que o jogador já viu (salvo junto com o mundo). */
  readonly exploration = new Exploration();
  private minimap: Minimap | null = null;
  /** Mapa grande (tela cheia) com tudo o que já foi explorado; abre pelo minimapa ou pela tecla M e pausa o jogo. */
  private worldMap: WorldMap | null = null;
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
    private readonly screenMode: ScreenMode | undefined,
    profile: WorldProfile,
    private readonly options: GameOptions,
  ) {
    this.world = new World(seed, profile);
    this.questDefs = questsFor(this.world);
    this.collect = profile.collectBlocks;
    this.progression = profile.progression;
    this.hotbar = new Hotbar(profile, (options.save?.hotbar ?? options.net?.bag?.hotbar ?? undefined) as (StackId | null)[] | undefined);
    // Sem cultivo nem coleta, não há itens contáveis (Santuário: só blocos infinitos).
    this.inventory = profile.collectBlocks || profile.farming ? new Inventory() : new Inventory({});
    const [sx, sy] = this.world.findSpawn();
    this.player = new Player(sx + 0.5, sy + 0.6);
    // Only 3D Santuário: cubes are solid obstacles rather than automatic steps.
    configureSanctuaryThreeCollision(this.player, profile.id, true, !!options.solidPhysics);
    // A nova seed do Santuário não tem chão vazio: nasce sobre o topo da
    // coluna inicial, nunca dentro dos cubos.
    if (profile.id === 'santuario') {
      this.player.z = this.world.standHeight(sx, sy) ?? 0;
      this.player.visualZ = this.player.z / this.world.cubeLevels;
    }
    this.player.hungerOn = profile.hunger;
    this.entities = new Entities(this.player, Math.random, profile.character);
    if (options.body) this.entities.body = options.body;
    // Animais e monstros: na sala vêm do servidor (o aparelho só espelha); sozinho, nascem aqui pela seed.
    if (options.net) this.entities.remote = true;
    else this.entities.spawnWildlife(this.world, true);
    // Moradores: na sala vêm do servidor (o aparelho só espelha); sozinho, nascem aqui pela seed.
    if (!options.net) {
      this.entities.spawnVillagers(this.world);
      this.entities.spawnResidents(this.world);
    }
    // Monstro derrotado solta os espólios no lugar (seda, presas, Coração da Rainha).
    this.entities.onMonsterKilled = (m) => { this.drops.spawn(m.x, m.y + 0.2, monsterDrops(m.kind)); this.missionEvent({ type: 'kill', monster: m.kind }); };
    this.entities.onDamage = (x, y, hit, target) => { this.renderer.addDamage(x, y, hit, target); if (target === 'enemy') this.onHitLanded(hit.crit); };
    this.player.timingFor = (tool) => attackTimingFor(this.entities.body, tool);
    this.player.smooth = !options.showcase && feelOn();
    this.lastHp = this.player.hp;
    this.renderer = options.rendererFactory(canvas, this.world);
    this.camera.setCellsTall(this.renderer.preferredCellsTall);
    this.syncOrientationZoom(true);
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
      onAction: (a) => { options.net?.sent(a); if (a.kind === 'place') this.missionEvent({ type: 'place', block: a.block }); },
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
          onCharacter: profile.progression ? () => this.toggleCharacter() : undefined, onSkills: () => this.toggleSkills(), onBag: () => this.toggleBag(),
        }
        : undefined,
      // Corações só em mundo com dungeon.
      health: profile.dungeon,
    });
    if (profile.minimap) {
      this.minimap = new Minimap(this.hud.root, options.showcase ? undefined : () => this.toggleWorldMap());
      if (!options.showcase) this.worldMap = new WorldMap(this.hud.root, () => this.actions.cancelAll());
    }
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
      zoom: screenMode?.isTouch ? {
        get: () => this.camera.zoomMul,
        change: (factor: number) => this.zoomByUser(factor),
      } : undefined,
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
        if (this.progression && typeof bag.coins === 'number') this.inventory.wallet.set(bag.coins); // carteira guardada na sala (v28)
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
      mirror.onTalk = (id, on) => net.talk(id, on);
      net.onEscort = (id, ok) => this.onEscortReply(id, ok);
      net.onKilled = (k) => this.missionEvent({ type: 'kill', monster: k as MonsterKind });
      net.onBite = (kind, x, y) => { if (kind in MONSTERS) this.entities.biteFrom(kind as MonsterKind, x, y, this.world); };
      net.onHits = (list) => { for (const [x, y, amount, crit] of list) { this.renderer.addDamage(x, y, { amount, crit: crit === 1 }, 'enemy'); this.onHitLanded(crit === 1); } };
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
    // Saves anteriores à geração em camadas podem registrar a Deusa em z=0
    // onde agora existe terreno: reposiciona os pés sobre o topo sem editar a seed.
    if (profile.id === 'santuario') {
      const support = this.world.standHeight(this.player.cellX, this.player.cellY);
      if (support !== null && this.player.z < support) {
        this.player.z = support;
        this.player.visualZ = support / this.world.cubeLevels;
      }
    }
    if (options.showcase) this.hud.root.style.display = 'none';
    this.resize();
    this.camera.follow(...this.cameraTarget(), 0, true);
    if (options.showcase) this.listen(window, 'resize', this.resize);
    else this.bindInput();
    if (options.notice) this.hud.toast(options.notice);
    // O 3º nível de blocos saiu do jogo (limite de 2 níveis): não some em silêncio.
    if (droppedBlocks) this.hud.toast(`O limite deste mundo é de ${this.world.maxStack} níveis: ${droppedBlocks} ${droppedBlocks === 1 ? 'bloco excedente foi removido' : 'blocos excedentes foram removidos'} deste mundo`);
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
    this.charWin?.destroy();
    this.worldMap?.destroy();
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
    return [this.player.x * TILE + this.look.x, this.player.y * TILE - this.player.visualZ * CUBE_FRONT - CHARACTER_H * 0.4 + this.dialogueShift + this.look.y];
  }

  /** Por padrão, paisagem usa 1,91× e retrato 0,95×.
   * Girar a tela atualiza o preset apenas até o primeiro ajuste manual.
   */
  private syncOrientationZoom(force = false): void {
    const portrait = this.screenMode?.isPortrait ?? window.innerHeight > window.innerWidth;
    if (!force && this.lastZoomPortrait === portrait) return;
    this.lastZoomPortrait = portrait;
    if (!this.zoomModifiedByUser) this.camera.setZoomMultiplier(initialZoomMultiplier(portrait));
  }

  private zoomByUser(factor: number): void {
    this.zoomModifiedByUser = true;
    this.camera.zoomBy(factor);
  }

  private resize = (): void => {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.syncOrientationZoom();
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
      if (e.code === 'KeyM') this.toggleWorldMap();
      if (e.code === 'KeyC') this.toggleCharacter();
      if (e.code === 'Escape') {
        if (this.worldMap?.isOpen) this.worldMap.close();
        else if (this.charWin?.isOpen) this.charWin.close();
        else if (this.shop?.isOpen) this.shop.close();
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
      this.zoomByUser(Math.exp(-e.deltaY * 0.0012));
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
    if (this.talkMission(v)) return; // missões do Capítulo 1: oferta, andamento ou entrega
    // Loja fechada (rotina do Bento): pela hora do mundo, igual no jogo sozinho e na sala.
    const sched = scheduleOf(v.npc);
    if (v.role === 'merchant' && !shopOpen(sched, this.time)) {
      this.dialogue.open(v.closedConversation(sched ? phaseAt(sched, this.time) : 'closing'), v, () => v.release());
      return;
    }
    if (v.role === 'merchant' || v.role === 'florist') { this.openShop(v); return; } // mercador e florista não conversam: abrem a loja (v0.93.57, v0.93.110)
    const quest = v.resident ? null : questOf(this.questDefs, v.npc);
    if (quest && this.talkQuest(v, quest)) return;
    const tier = tierOf(this.entities.memory[v.memoryKey]);
    this.dialogue.open(v.conversation(tier), v, () => v.release());
    noteTalk(this.entities.memory, v.memoryKey); // lembra desta conversa (ADR 0034, nível 3)
  }

  /** Chave do NPC nas missões: o Mestre da Guilda é `guild`; os nomeados, o id. Sorteados não participam. */
  private missionKey(v: Villager): string | null {
    return v.resident ? (v.resident.id === 'guild' ? 'guild' : null) : v.npc;
  }

  /** Um acontecimento para a missão ativa (falar, abater, construir…); atualiza o diário se algo andou. */
  /** Metas lidas do mundo (não contadas por evento): terra arada no terreno indicado. */
  private missionProbe = (key: string): number => (key === 'plot-tilled' && this.world.farmPlot ? tilledIn(this.world, this.world.farmPlot) : 0);

  private missionEvent(e: MissionEvent): void {
    if (!this.progression) return;
    if (onMissionEvent(this.entities.missions, e)) this.refreshMissionHud();
  }

  /** Diário curto no canto da tela: título e metas da missão ativa (nada, sem missão). */
  private refreshMissionHud(): void {
    const log = this.entities.missions;
    const m = this.progression ? missionOf(log.active) : null;
    if (!m) { this.hud.setMission(null); return; }
    const goals = goalsOf(m, log, (id) => this.inventory.count(id), this.missionProbe);
    this.hud.setMission(m.title, goals.map(({ goal, have, done }) => `${done ? '✓ ' : ''}${goal.text}${goal.count > 1 ? ` ${have}/${goal.count}` : ''}`));
  }

  /**
   * Conversa de missão do Capítulo 1 com `v`: conta o "falar com" e, no Mestre da Guilda, oferece a próxima missão (Aceitar / Agora não), cobra o andamento
   * ou entrega a pronta; nos outros, só recebe a entrega quando a missão pede a eles. Devolve se a conversa foi tratada (senão segue a conversa normal).
   */
  private talkMission(v: Villager): boolean {
    if (!this.progression) return false;
    const key = this.missionKey(v);
    if (!key) return false;
    const log = this.entities.missions;
    this.missionEvent({ type: 'talk', npc: key });
    const count = (id: StackId) => this.inventory.count(id);
    const active = missionOf(log.active);
    const base = { npc: v.npc, name: v.name };
    const open = (conv: Conversation): void => { this.dialogue.open(conv, v, () => v.release()); v.conversation(); };
    if (active && active.turnIn === key) {
      if (!isMissionReady(active, log, count, this.missionProbe)) {
        if (key !== 'guild') return false; // fora da guilda só a entrega pronta interrompe a conversa normal
        open({ ...base, text: active.progress });
        return true;
      }
      if (!canCarry(this.inventory, this.hotbar, COIN) && this.inventory.count(COIN) === 0) { this.hud.toast('Sem espaço na bolsa'); return true; }
      const taken: Array<[StackId, number]> = [];
      if (!completeMission(log, active, count, (id, n) => this.inventory.take(id, n), taken, this.missionProbe)) return true;
      const bonus = bonusFor(active, taken);
      const coins = active.reward.coins + bonus;
      this.inventory.add(COIN, coins);
      this.hotbar.autoPlace(COIN);
      this.hotbar.prune(this.inventory);
      this.refreshSelection();
      noteBuy(this.entities.memory, v.memoryKey, 5);
      this.hud.toast(`Missão cumprida: ${active.title} (+${coins} Moedas de Cobre${bonus > 0 ? `, ${bonus} dos itens` : ''})`);
      this.refreshMissionHud();
      open({ ...base, text: active.complete });
      return true;
    }
    if (active && key === 'guild') { open({ ...base, text: active.progress }); return true; } // a missão ativa é entregue a outro NPC
    if (key !== 'guild') return false;
    const next = nextMission(log);
    if (!next) return false; // o capítulo acabou: conversa normal
    open({
      ...base, text: next.offer, prompt: next.prompt,
      choices: [
        { label: 'Aceitar', run: () => this.acceptMission(v, next) },
        { label: 'Agora não', run: () => { /* fica para depois */ } },
      ],
    });
    return true;
  }

  private acceptMission(v: Villager, m: Mission): void {
    acceptMissionLog(this.entities.missions, m.id);
    this.missionEvent({ type: 'talk', npc: 'guild' }); // aceitar já é falar com o Mestre (registrar-se)
    this.refreshMissionHud();
    this.hud.toast(`Missão aceita: ${m.title}`);
    this.dialogue.open({ npc: v.npc, name: v.name, text: m.accepted }, v, () => v.release());
  }

  /** Fala de missão: oferece (com escolhas), cobra o andamento ou recebe a entrega. Devolve false se não há o que dizer (missão concluída). */
  private talkQuest(v: Villager, q: QuestDef): boolean {
    const have = haveOf(q, (id) => this.inventory.count(id));
    const phase = phaseOf(this.entities.quests, q, have);
    if (phase === 'available' && !q.offerable()) return false; // o canteiro não tem flores o bastante (mundo já mexido): não oferece
    const base = { npc: v.npc, name: v.name };
    const open = (conv: Conversation): void => { this.dialogue.open(conv, v, () => v.release()); v.conversation(); };
    if (phase === 'available') {
      open({
        ...base, text: q.offer, prompt: q.prompt,
        choices: [
          { label: q.accept, run: () => this.acceptQuest(v, q) },
          { label: q.decline, run: () => { /* fica para depois */ } },
        ],
      });
    } else if (phase === 'active') {
      open({ ...base, text: q.progress(have) });
    } else if (phase === 'ready') {
      if (!canCarry(this.inventory, this.hotbar, q.reward.item) && this.inventory.count(q.reward.item) === 0) { this.hud.toast('Sem espaço na bolsa'); return true; }
      if (!takeOf(q, (id) => this.inventory.count(id), (id, n) => this.inventory.take(id, n))) return true;
      this.hotbar.prune(this.inventory); // as pilhas de flor que acabaram saem da grade
      this.inventory.add(q.reward.item, q.reward.count);
      this.hotbar.autoPlace(q.reward.item);
      this.hotbar.prune(this.inventory);
      this.refreshSelection();
      this.entities.quests[q.id] = 'done';
      const rid = this.mirror?.idOf(v);
      if (this.mirror) { if (rid) this.options.net?.escort(rid, false); } else v.setCompanion(false); // volta ao posto
      noteTalk(this.entities.memory, v.memoryKey);
      noteBuy(this.entities.memory, v.memoryKey, 5); // a ajuda conta como favor: sobe a relação
      this.hud.toast(`Missão cumprida: ${q.title} (+${q.reward.count} Moedas de Cobre)`);
      open({ ...base, text: `${q.ready} ${q.done}` });
    } else return false;
    noteTalk(this.entities.memory, v.memoryKey);
    return true;
  }

  private acceptQuest(v: Villager, q: QuestDef): void {
    this.entities.quests[q.id] = 'active';
    const rid = this.mirror?.idOf(v);
    if (this.mirror) { if (rid) { this.escortAsked = { id: rid, fresh: q.id }; this.options.net?.escort(rid, true); } } // na sala: a sala decide se ele pode vir
    else v.setCompanion(true);
    this.hud.toast(`Missão aceita: ${q.title}`);
    this.dialogue.open({ npc: v.npc, name: v.name, text: q.accepted }, v, () => v.release());
  }

  /** Todo quadro: sinal sobre a cabeça de quem tem missão, acompanhante de missão em andamento (também ao carregar o jogo) e seus comentários. */
  private updateQuests(dt: number): void {
    const marks: Partial<Record<string, ReturnType<typeof markOf>>> = {};
    for (const q of this.questDefs) {
      const phase = phaseOf(this.entities.quests, q, haveOf(q, (id) => this.inventory.count(id)));
      const m = phase === 'available' && !q.offerable() ? null : markOf(phase);
      if (m) marks[q.giver] = m;
      const giver = this.entities.villagers.find((x) => x.npc === q.giver && !x.resident);
      if (!giver) continue;
      if (this.entities.quests[q.id] === 'active') {
        if (this.mirror) { // na sala: pede de novo que ele me acompanhe se ele voltou ao posto (reentrou, ou outro o levou e soltou)
          const rid = this.mirror.idOf(giver);
          this.askTimer -= dt;
          if (rid && giver.escortedBy !== this.options.net?.you && this.askTimer <= 0) {
            this.askTimer = 5;
            this.escortAsked = { id: rid, fresh: null };
            this.options.net?.escort(rid, true);
          }
        } else if (!giver.escorting) { // carregou o jogo no meio da missão: ele vem para perto
          giver.setCompanion(true);
          giver.teleportTo(this.player.x - 1.5, this.player.y);
        }
        this.remarkTimer -= dt;
        if (this.remarkTimer <= 0 && !this.dialogue.isOpen) {
          this.remarkTimer = 0.6;
          const r = 3 * SUBDIV;
          for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
            if (this.world.getObject(Math.floor(giver.x) + dx, Math.floor(giver.y) + dy) !== stackBlock(q.items[0])) continue;
            this.hud.toast(`${giver.name}: ${q.remarks[this.remarkIndex++ % q.remarks.length]}`);
            this.remarkTimer = 30;
            return;
          }
        }
      }
    }
    // Missões do Capítulo 1: ! no Mestre que oferece, ? em quem recebe (azulado em andamento, dourado pronta); vence o sinal do Silvano na mesma pessoa.
    if (this.progression) Object.assign(marks, missionMarks(this.entities.missions, (id) => this.inventory.count(id), this.missionProbe));
    this.refreshMissionHud();
    this.entities.marks = marks as typeof this.entities.marks;
  }
  /** Missões deste mundo (a espécie e o canteiro dependem da seed). */
  private questDefs: QuestDef[] = [];
  private remarkTimer = 8;
  private askTimer = 0;
  /** Pedido de acompanhar em aberto (na sala): `fresh` = missão recém-aceita (se a sala negar, a missão volta a ser oferecida). */
  private escortAsked: { id: number; fresh: QuestDef['id'] | null } | null = null;

  /** A sala respondeu ao pedido de acompanhar: negado = ele já está com outro jogador. */
  private onEscortReply(id: number, ok: boolean): void {
    const ask = this.escortAsked;
    if (!ask || ask.id !== id) return;
    this.escortAsked = null;
    if (ok) return;
    if (ask.fresh) { // não valeu: a missão continua oferecida
      delete this.entities.quests[ask.fresh];
      this.hud.toast('Ele já está ajudando outra pessoa agora. Tente de novo daqui a pouco.');
    } else this.askTimer = 30; // retomada negada: tenta de novo mais tarde, sem avisar toda hora
  }
  private remarkIndex = 0;

  private charWin: CharacterWindow | null = null;

  /** Painel do personagem (botão ou tecla C): avatar, personagem inteiro, nível, ataque, HP e a carteira; o jogo pausa enquanto está aberto. */
  private toggleCharacter(): void {
    if (!this.progression) return;
    if (this.charWin?.isOpen) { this.charWin.close(); return; }
    this.charWin ??= new CharacterWindow(this.hud.root, { frame: art().characterFrame ?? '', onOpenChange: () => { /* o `frame` lê `isOpen` para pausar */ } });
    this.dialogue.close();
    const p = this.player;
    const body = this.entities.body;
    this.charWin.show({
      body, name: HERO_NAMES[body], level: 1, xp: 0, xpText: '—',
      attack: p.stats.attack + weaponPower(p.equipped), hp: Math.round(p.hp), maxHp: p.maxHp, copper: this.inventory.wallet.copper,
    });
  }

  /** Vitrine, título e falas de cada loja (Mercado e Floricultura, v0.93.110). */
  private static readonly SHOPS: Record<'merchant' | 'florist', { stock: readonly ShopOffer[]; style: ShopStyle }> = {
    merchant: { stock: MARKET_STOCK, style: { title: 'Mercado', greeting: 'Confira os meus itens à venda!', category: 'Consumíveis' } },
    florist: { stock: FLORIST_STOCK, style: { title: 'Floricultura', greeting: 'Flores fofas para enfeitar o seu mundo!', category: 'Flores' } },
  };

  /** Loja: abre a janela com o atendente (mercador ou florista; o jogo pausa enquanto ela está aberta). */
  private openShop(v: Villager): void {
    this.dialogue.close();
    this.shop ??= new ShopWindow(this.hud.root, {
      frame: art().shopFrame ?? '',
      icon: (id) => this.stackView(id, null).icon,
      name: (id) => this.stackView(id, null).name,
      coins: () => this.inventory.count(CURRENCY),
      buy: (offer) => this.buyAtMarket(offer),
      onOpenChange: (open) => { if (!open) this.shopMerchant?.release(); },
    });
    this.shopMerchant = v;
    v.conversation(); // segura o atendente parado enquanto a loja está aberta (`release` ao fechar)
    const role = v.role === 'florist' ? 'florist' : 'merchant';
    const shop = Game.SHOPS[role];
    const tier = tierOf(this.entities.memory[v.memoryKey]);
    noteTalk(this.entities.memory, v.memoryKey); // a visita conta para a relação
    this.shop.open(shop.stock, { portrait: art().portraits?.[v.npc] }, { ...shop.style, greeting: shopGreeting(role, tier) });
  }
  private shopMerchant: Villager | null = null;

  /** Compra 1 unidade na loja (Mercado ou Floricultura) com Moedas de Cobre: entrega na grade (se houver lugar) ou na bolsa. */
  private buyAtMarket(offer: ShopOffer): BuyResult {
    const r = buyOffer(this.inventory, offer, (item) => canCarry(this.inventory, this.hotbar, item));
    if (r !== 'ok') return r;
    if (this.shopMerchant) noteBuy(this.entities.memory, this.shopMerchant.memoryKey);
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
    const paused = this.menu.isOpen || this.bag.isOpen || this.skills.isOpen || !!this.shop?.isOpen || !!this.charWin?.isOpen || !!this.worldMap?.isOpen;
    // Hit-stop: ao acertar, o mundo quase para por uns instantes (só a simulação; o desenho e o relógio real seguem).
    const dt = paused ? 0 : realDt * (this.hitStop > 0 ? HITSTOP_SCALE : 1);
    this.hitStop = Math.max(0, this.hitStop - realDt);
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
    this.updateQuests(dt);
    this.entities.time = this.time;
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
    // Tremida: tira o deslocamento do quadro anterior, segue o alvo e põe o novo (não acumula na suavização).
    this.camera.x -= this.shakeOff.x;
    this.camera.y -= this.shakeOff.y;
    // Antecipação: a câmera se adianta (devagar) para onde o personagem vai; parado, volta ao centro.
    const lk = this.player.smooth && !this.dialogue.isOpen ? 1 - Math.exp(-LOOKAHEAD_RATE * dt) : 1;
    const wantX = this.player.smooth && !this.dialogue.isOpen ? this.player.vx * LOOKAHEAD_PX : 0;
    const wantY = this.player.smooth && !this.dialogue.isOpen ? this.player.vy * LOOKAHEAD_PX * 0.6 : 0;
    this.look.x += (wantX - this.look.x) * lk;
    this.look.y += (wantY - this.look.y) * lk;
    this.camera.follow(...this.cameraTarget(), dt);
    this.shake = Math.max(0, this.shake - realDt * 14);
    this.shakeOff = this.shake > 0.05 ? { x: (Math.random() * 2 - 1) * this.shake, y: (Math.random() * 2 - 1) * this.shake } : { x: 0, y: 0 };
    this.camera.x += this.shakeOff.x;
    this.camera.y += this.shakeOff.y;
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
      zones: !room && !this.inDungeon && this.entities.missions.active === 'm07' && this.world.farmPlot ? [this.world.farmPlot] : undefined,
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

  /** Acertou um inimigo: hit-stop e tremida (maiores no crítico). */
  private onHitLanded(crit: boolean): void {
    this.hitStop = Math.max(this.hitStop, crit ? HITSTOP_CRIT_S : HITSTOP_S);
    this.shake = Math.max(this.shake, crit ? SHAKE_CRIT : SHAKE_HIT);
  }

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
    this.minimap.update({ world: this.world, exploration: this.exploration, player: p, markers: this.mapMarkers(), place }, now, force);
  }

  /** Abre/fecha o mapa grande (fora dos cômodos, que são espaços à parte do mundo). */
  private toggleWorldMap(): void {
    const m = this.worldMap;
    if (!m) return;
    if (m.isOpen) { m.close(); return; }
    if (this.world.interiorAt(this.player.cellX, this.player.cellY)) return;
    if (this.bag.isOpen) this.toggleBag(false);
    if (this.skills.isOpen) this.toggleSkills(false);
    this.dialogue.close();
    m.open((): WorldMapView => {
      const area = this.inDungeon ? this.world.dungeon?.area : null;
      const dung = this.world.dungeon?.area;
      const inRect = (a: { x0: number; y0: number; x1: number; y1: number }, cx: number, cy: number): boolean =>
        cx * CHUNK_SIZE <= a.x1 && (cx + 1) * CHUNK_SIZE > a.x0 && cy * CHUNK_SIZE <= a.y1 && (cy + 1) * CHUNK_SIZE > a.y0;
      return {
        world: this.world, exploration: this.exploration, player: this.player, markers: this.mapMarkers(),
        // No covil só o labirinto; no mundo, tudo menos o covil (que fica num canto isolado, longe de tudo).
        filter: area ? (cx, cy) => inRect(area, cx, cy) : dung ? (cx, cy) => !inRect(dung, cx, cy) : null,
      };
    });
  }

  /** Marcadores do mapa (minimapa e mapa grande): cidade, covil, tenda e amigos. */
  private mapMarkers(): MinimapMarker[] {
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
    return markers;
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
      coins: this.progression ? this.inventory.wallet.copper : 0,
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
    if (this.player.hp < this.lastHp) { this.hurtFlash = 1; this.shake = Math.max(this.shake, SHAKE_HURT); }
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
    if (k.has('KeyE') || k.has('Equal')) this.zoomByUser(z);
    if (k.has('KeyQ') || k.has('Minus')) this.zoomByUser(1 / z);
    return [x, y];
  }

}
