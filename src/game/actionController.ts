import { TILE } from '../config';
import type { Renderer } from '../render/renderer';
import { Block, blockDef, type BlockId } from '../world/blocks';
import { blockStack, breakDrops, breakSeconds, ITEMS, type StackId, toolCanBreak, TOOLS, type ToolId } from '../world/items';
import type { World } from '../world/world';
import type { Camera } from './camera';
import type { Drops } from './drops';
import type { Entities } from './entities';
import type { HotbarSlot } from './hotbar';
import type { Inventory } from './inventory';
import type { Player } from './player';
import type { Sheep } from './sheep';
import type { Facing } from './walker';

/** Alcance para quebrar/colocar, em células (do centro do personagem ao centro da célula). */
const REACH = 4.5;
/** Deslocamento máximo (px) para um toque/clique contar como "colocar". */
const TAP_THRESHOLD = 10;
/** Duração máxima de um toque/clique de colocar (s); acima disso é "segurar". */
export const TAP_MAX_S = 0.3;

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

export type CellTarget = { x: number; y: number; valid: boolean };

/** Deslocamento da célula "à frente" para cada direção do sprite. */
const FACING_DIR: Record<Facing, [number, number]> = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };

/** O que o controlador de ações precisa do jogo (sem conhecer o laço, a HUD nem a entrada bruta). */
export interface ActionContext {
  world: World;
  entities: Entities;
  player: Player;
  inventory: Inventory;
  drops: Drops;
  camera: Camera;
  renderer: Renderer;
  /** Espaço selecionado na hotbar (null = mão vazia). */
  slot(): HotbarSlot | null;
  /** Joystick em uso (esconde o destaque do mouse). */
  joystickActive(): boolean;
  /** Materiais coletados (colocar gasta, quebrar solta o bloco) — perfil `collectBlocks`. */
  collectBlocks: boolean;
  /** Algo do inventário foi gasto (a grade libera espaços vazios). */
  onConsumed(): void;
  /** Tocou num baú ao alcance: o Game abre o painel dele. */
  onOpenChest(x: number, y: number): void;
  /** Mensagem curta na tela (ex.: "Ponto de renascimento alterado"). */
  notify(text: string): void;
}

/** Alvos para o render (destaque do mouse, anel na entidade, foco do botão de ação, quebra em andamento). */
export interface ActionTargets {
  hover: CellTarget | null;
  hoverSheep: (CellTarget & { attack?: boolean }) | null;
  focus: CellTarget | null;
  breaking: { x: number; y: number; progress: number } | null;
}

/**
 * Ações do jogador por célula — iguais para o cursor (mouse) e para o botão de ação/Espaço (célula à frente).
 * Decide o que um toque curto, um clique ou um "segurar" faz com o item em mãos, delegando as regras do mundo
 * ao `World` (colocar, quebrar, arar, amassar, plantar, porta) e as de ferramenta ao registro `TOOLS`.
 * Separado do `Game` (Fase 0 do plano): o `Game` só orquestra laço, câmera, HUD e repassa a entrada.
 */
export class ActionController {
  /** Botão de ação (ou Espaço) pressionado: toque curto usa, segurar quebra o alvo à frente. */
  private action: Hold | null = null;
  private press: Press | null = null;
  private pointer = { x: 0, y: 0, inside: false };

  constructor(private readonly ctx: ActionContext) {}

  private get world(): World { return this.ctx.world; }
  private get entities(): Entities { return this.ctx.entities; }
  private get player(): Player { return this.ctx.player; }
  private get inventory(): Inventory { return this.ctx.inventory; }
  private get drops(): Drops { return this.ctx.drops; }
  private get camera(): Camera { return this.ctx.camera; }
  private get renderer(): Renderer { return this.ctx.renderer; }
  private get slot(): HotbarSlot | null { return this.ctx.slot(); }

  // ---- Entrada (repassada pelo Game) ----

  /** Mouse/caneta pressionado no canvas (o toque usa o botão de ação). Retorna true se iniciou um "press". */
  pointerDown(id: number, sx: number, sy: number): boolean {
    if (this.press) return false;
    this.press = { id, sx, sy, moved: false, held: 0, target: null, progress: 0 };
    this.pointer = { x: sx, y: sy, inside: true };
    return true;
  }

  pointerMove(id: number, sx: number, sy: number, isMouse: boolean): void {
    this.pointer = { x: sx, y: sy, inside: isMouse || !!this.press };
    const p = this.press;
    if (p && p.id === id && Math.hypot(sx - p.sx, sy - p.sy) > TAP_THRESHOLD) p.moved = true;
  }

  /** Soltou: clique curto parado = usar o item sob o cursor. */
  pointerUp(id: number, sx: number, sy: number, isMouse: boolean): void {
    const p = this.press;
    if (!p || p.id !== id) return;
    this.press = null;
    if (!isMouse) this.pointer.inside = false;
    if (!p.moved && p.held <= TAP_MAX_S) this.place(sx, sy);
  }

  pointerCancel(): void {
    this.press = null;
  }

  pointerLeave(): void {
    this.pointer.inside = false;
  }

  /** Solta tudo (janela perdeu o foco, tela bloqueada). */
  cancelAll(): void {
    this.press = null;
    this.action = null;
  }

  /** Progresso da quebra pelo botão de ação (anel do botão), 0 se não está segurando. */
  get actionProgress(): number {
    return this.action && this.action.held > TAP_MAX_S ? this.action.progress : 0;
  }

  private inReach(x: number, y: number): boolean {
    return Math.hypot(x + 0.5 - this.player.x, y + 0.5 - (this.player.y - 0.4)) <= REACH;
  }

  // ---- Regras por célula (iguais para cursor e botão de ação) ----

  /** Ferramenta em mãos (null = mão vazia, item ou bloco). */
  private get tool(): ToolId | null {
    const s = this.slot;
    return s?.kind === 'tool' ? s.tool : null;
  }

  /** Ferramenta de golpe em mãos? (espada, machado: toque curto = golpe em entidades). */
  private get strikerInHand(): boolean {
    const t = this.tool;
    return !!t && TOOLS[t].strikes;
  }

  /** Ferramenta com animação de ação que também quebra algo (machado, enxada, pá, picareta): anima enquanto quebra. */
  private get swingsWhileBreaking(): boolean {
    const t = this.tool;
    return !!t && TOOLS[t].swings && TOOLS[t].breaks !== 'none';
  }

  /**
   * Pode quebrar aqui? Respeita a restrição da ferramenta (`toolCanBreak`: espada nada, machado orgânico,
   * enxada só planta) e não cava o chão sob nenhuma entidade.
   */
  private canBreakAt(x: number, y: number): boolean {
    const id = this.world.breakTargetId(x, y);
    if (id === null || !toolCanBreak(this.tool, id)) return false;
    return this.world.canBreak(x, y) && !(this.world.breakTarget(x, y) === 'ground' && this.entities.occupies(x, y));
  }

  /** Dá para abrir/fechar a porta desta célula? Fechar exige a célula livre de entidades. */
  private canToggleDoorAt(x: number, y: number): boolean {
    if (!this.world.isDoor(x, y)) return false;
    return !this.world.isDoorOpen(x, y) || !this.entities.occupies(x, y);
  }

  /** Toque numa porta: abre/fecha (qualquer item em mãos). Retorna true se havia porta (o toque foi usado). */
  private useDoorAt(x: number, y: number): boolean {
    if (this.world.getObject(x, y) === Block.CHEST) {
      // Baú: toque (qualquer item em mãos) abre o painel dele.
      if (this.inReach(x, y)) this.ctx.onOpenChest(x, y);
      return true;
    }
    if (!this.world.isDoor(x, y)) return false;
    if (this.inReach(x, y) && this.canToggleDoorAt(x, y)) this.world.toggleDoor(x, y);
    return true;
  }

  /** Pode usar o espaço selecionado (bloco/semente) nesta célula? Ovelha: ver `canFeed`. */
  private canUseAt(slot: HotbarSlot | null, x: number, y: number): boolean {
    if (!slot) return false;
    if (slot.kind === 'tool') {
      const use = TOOLS[slot.tool].groundUse;
      if (use === 'till') return this.world.canTill(x, y);
      if (use === 'flatten') return this.world.canFlatten(x, y);
      return false;
    }
    if (slot.kind === 'block') {
      if (this.ctx.collectBlocks && this.inventory.count(blockStack(slot.block)) <= 0) return false;
      return this.placeAnchor(slot.block, x, y) !== null;
    }
    if (ITEMS[slot.item].plants) return this.inventory.count(slot.item) > 0 && this.world.canPlant(x, y);
    return false;
  }

  /**
   * Onde colocar o bloco para cobrir a célula alvo: o canto válido cujas células não pegam nenhuma entidade
   * (objetos de várias células, como a tenda 2×2, nunca prendem a heroína). Entre as opções, a que fica mais longe
   * dela. null = não dá.
   */
  private placeAnchor(id: BlockId, x: number, y: number): [number, number] | null {
    const p = this.player;
    const options = this.world.footprintAnchors(id, x, y)
      .filter(([ax, ay]) => this.world.canPlace(ax, ay, id)
        && this.world.footprint(id, ax, ay).every(([cx, cy]) => !this.entities.occupies(cx, cy)));
    const dist = ([ax, ay]: [number, number]) => this.world.footprint(id, ax, ay)
      .reduce((m, [cx, cy]) => Math.min(m, Math.hypot(cx + 0.5 - p.x, cy + 0.5 - p.y)), Infinity);
    options.sort((a, b) => dist(b) - dist(a));
    return options[0] ?? null;
  }

  private canFeed(sheep: Sheep): boolean {
    return sheep.canEat && this.inventory.count('wheat') > 0;
  }

  /** Aplica o espaço selecionado: coloca bloco, planta ou alimenta. */
  private applyUse(slot: HotbarSlot | null, x: number, y: number, sheep: Sheep | null): void {
    if (!slot) return; // mão vazia ainda não tem ação
    if (slot.kind === 'tool') {
      // Ferramenta com ação (enxada, pá, picareta): animação sempre; enxada/pá trocam o chão se o alvo for válido.
      const use = TOOLS[slot.tool].groundUse;
      if (TOOLS[slot.tool].swings) this.player.startAttack(slot.tool);
      if (!use || !this.canUseAt(slot, x, y)) return;
      if (use === 'till') this.world.till(x, y);
      else this.world.flatten(x, y);
      return;
    }
    if (slot.kind === 'block') {
      if (!this.canUseAt(slot, x, y)) return;
      const [ax, ay] = this.placeAnchor(slot.block, x, y)!;
      const placed = this.world.placeBlock(ax, ay, slot.block);
      if (placed && slot.block === Block.TENT) this.ctx.notify('Ponto de renascimento alterado');
      if (placed && this.ctx.collectBlocks) {
        this.inventory.take(blockStack(slot.block));
        this.ctx.onConsumed();
      }
      this.entities.settleAll(this.world);
      return;
    }
    const def = ITEMS[slot.item];
    if (def.plants) {
      if (this.canUseAt(slot, x, y) && this.inventory.take(slot.item)) this.world.plant(x, y);
    } else if (def.feeds === 'sheep' && sheep && this.canFeed(sheep) && this.inventory.take(slot.item)) {
      sheep.feed();
    }
    this.ctx.onConsumed();
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
    if (!slot || (slot.kind === 'tool' && !TOOLS[slot.tool].groundUse) || (slot.kind === 'item' && !ITEMS[slot.item].plants)) return null;
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

  /** Golpe (espada/machado) na direção em que a personagem olha (o acerto sai no meio da animação). */
  private attack(): void {
    this.player.startAttack();
  }

  /** Vira a personagem para o ponto da tela (eixo dominante), para o golpe pelo mouse. */
  private faceToward(sx: number, sy: number): void {
    const [wx, wy] = this.camera.screenToWorld(sx, sy);
    const dx = wx / TILE - this.player.x;
    const dy = wy / TILE - (this.player.y - 0.4);
    if (Math.abs(dx) > Math.abs(dy)) this.player.facing = dx < 0 ? 'left' : 'right';
    else this.player.facing = dy < 0 ? 'up' : 'down';
  }

  /** Clique curto do mouse. */
  private place(sx: number, sy: number): void {
    const slot = this.slot;
    const picked = this.renderer.pick(this.camera, sx, sy);
    if (picked.hasObject && this.useDoorAt(picked.x, picked.y)) return;
    if (this.strikerInHand) {
      if (!this.player.attacking) this.faceToward(sx, sy);
      this.attack();
      return;
    }
    if (slot?.kind === 'item' && ITEMS[slot.item].feeds) {
      this.applyUse(slot, 0, 0, this.sheepUnderCursor(sx, sy));
      return;
    }
    if (slot?.kind === 'tool' && TOOLS[slot.tool].swings) {
      // Pelo mouse: vira para o cursor e toca a ação (ara/amassa só se o alvo for válido).
      const t = this.useTarget(sx, sy);
      if (!this.player.attacking) this.faceToward(sx, sy);
      if (t?.valid) this.applyUse(slot, t.x, t.y, null);
      else this.player.startAttack(slot.tool); // alvo fora de alcance/inválido: só a animação
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

  startAction(): void {
    if (this.action) return;
    this.action = { held: 0, target: null, progress: 0 };
  }

  /** Soltou o botão: se foi um toque curto, usa o selecionado no alvo à frente. */
  endAction(): void {
    const a = this.action;
    this.action = null;
    if (!a || a.held > TAP_MAX_S) return;
    const slot = this.slot;
    const [fx, fy] = this.frontCell();
    if (this.useDoorAt(fx, fy)) return;
    if (this.strikerInHand) {
      this.attack();
      return;
    }
    if (slot?.kind === 'item' && ITEMS[slot.item].feeds) {
      this.applyUse(slot, 0, 0, this.frontSheep());
      return;
    }
    this.applyUse(slot, fx, fy, null);
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
    h.progress += dt / breakSeconds(this.tool); // ferramenta 1 s, mão/item 2 s
    // Machado/enxada/pá/picareta: enquanto quebra, repete a animação de ação (só o machado acerta entidades).
    if (this.swingsWhileBreaking && !this.player.attacking) this.player.startAttack();
    if (h.progress >= 1) {
      // Baú quebrado: o conteúdo cai no chão junto com o baú.
      const contents = (this.world.chestAt(t.x, t.y) ?? []).filter((c) => c !== null)
        .map((c) => ({ item: c!.item as StackId, count: c!.count }));
      const hadTent = this.world.tent;
      const broken = this.world.breakBlock(t.x, t.y);
      if (contents.length) this.drops.spawn(t.x + 0.5, t.y + 0.7, contents);
      if (hadTent && !this.world.tent) this.ctx.notify('Ponto de renascimento voltou ao início');
      // O que cai no chão para ser coletado: colheita (pá e picareta destroem plantas sem drop) e, com coleta,
      // o próprio material (árvore dá toras).
      if (broken !== null) this.drops.spawn(t.x + 0.5, t.y + 0.7, breakDrops(this.tool, broken, this.ctx.collectBlocks));
      this.entities.settleAll(this.world);
      h.target = null;
      h.progress = 0;
    }
  }

  /** Avança os "segurar" do mouse e do botão de ação (chamado a cada quadro). */
  update(dt: number): void {
    const p = this.press;
    if (p) {
      p.held += dt;
      if (p.held > TAP_MAX_S) {
        const t = this.breakTarget(this.pointer.x, this.pointer.y);
        // Cortando pelo mouse: vira para o alvo antes do golpe.
        if (t.valid && this.swingsWhileBreaking && !this.player.attacking) this.faceToward(this.pointer.x, this.pointer.y);
        this.advanceHold(p, t, dt);
      }
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

  private breakingState(): { x: number; y: number; progress: number } | null {
    const h = this.action?.target ? this.action : this.press?.target ? this.press : null;
    return h?.target ? { ...h.target, progress: h.progress } : null;
  }

  /** Destaque do mouse: durante a quebra, o alvo da quebra; senão, onde o clique agiria. */
  private hoverTarget(): CellTarget | null {
    if (!this.pointer.inside || this.ctx.joystickActive()) return null;
    const { x, y } = this.pointer;
    const p = this.press;
    if (p && p.held > TAP_MAX_S) return this.tool === 'sword' ? null : this.breakTarget(x, y);
    // Porta sob o cursor: o clique abre/fecha com qualquer item.
    const picked = this.renderer.pick(this.camera, x, y);
    if (picked.hasObject && this.world.isDoor(picked.x, picked.y)) {
      return { x: picked.x, y: picked.y, valid: this.inReach(picked.x, picked.y) && this.canToggleDoorAt(picked.x, picked.y) };
    }
    // Espada: o alvo é a entidade (anel), nunca a célula. Machado: só mostra a célula ao segurar.
    if (this.tool === 'sword') return null;
    if (this.strikerInHand) return null;
    return this.useTarget(x, y);
  }

  /** Anel na ovelha alvo do trigo (ou do golpe): sob o mouse ou, com a personagem parada, à frente dela. */
  private hoverSheep(): (CellTarget & { attack?: boolean }) | null {
    if (this.strikerInHand) {
      const t = this.entities.strikeTargets(this.player.facing)[0];
      return t ? { x: t.x, y: t.y, valid: true, attack: true } : null;
    }
    const slot = this.slot;
    if (slot?.kind !== 'item' || !ITEMS[slot.item].feeds) return null;
    let sheep: Sheep | null = null;
    if (this.pointer.inside && !this.ctx.joystickActive()) {
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
    const [dx, dy] = this.frontCell();
    if (this.world.isDoor(dx, dy)) return { x: dx, y: dy, valid: this.canToggleDoorAt(dx, dy) };
    if (this.tool === 'sword') return null;
    const slot = this.slot;
    if (this.strikerInHand) {
      // Machado: só destaca o que dá para cortar (madeira/árvore/planta) à frente.
      const [x, y] = this.frontCell();
      return this.canBreakAt(x, y) ? { x, y, valid: true } : null;
    }
    if (slot?.kind === 'item' && ITEMS[slot.item].feeds && this.frontSheep()) return null; // anel na ovelha
    const [x, y] = this.frontCell();
    return { x, y, valid: this.canUseAt(slot, x, y) || this.canBreakAt(x, y) };
  }

  /** Alvos atuais para o render. */
  targets(): ActionTargets {
    return { hover: this.hoverTarget(), hoverSheep: this.hoverSheep(), focus: this.focusTarget(), breaking: this.breakingState() };
  }

  /** Só para testes no navegador (dev): célula à frente. */
  get front(): [number, number] {
    return this.frontCell();
  }
}
