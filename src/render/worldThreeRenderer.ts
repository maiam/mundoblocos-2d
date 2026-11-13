import { TILE } from '../config';
import type { Camera } from '../game/camera';
import { ActorSprites } from './character';
import { ActorBillboards } from './three/actorBillboards';
import { DropSprites, HoverRing } from './three/itemSprites';
import { drawFade, drawHurtVignette, Overlay2D } from './three/overlay2d';
import { DamageNumbers } from './damageNumbers';
import type { RenderOptions } from './renderer';
import type { GameRenderer, RendererStats } from './rendererContract';
import { ChunkRenderer } from './chunkRenderer';
import { addDungeonTextures, createBlockTextures, type BlockTextures } from './textures';
import { getWaterArt, loadDungeonArt } from './blockArt';
import { Block, blockDef, type BlockId } from '../world/blocks';
import type { World } from '../world/world';
import type { Hit } from '../world/progression';
import { OBLIQUE_K } from './sanctuaryObliqueView';
import { CHARACTER_SCALE_FACTOR, SANCTUARY_CELLS_TALL } from './worldScale';
import { ThreeStage } from './three/stage';
import { SelectionMarkers } from './three/selection';
import { ChunkFloor } from './three/chunkFloor';
import { ChunkBlocks } from './three/chunkBlocks';
import { BlockMaterials } from './three/blockMaterials';
import { ChunkSprites } from './three/chunkSprites';
import { GroundFx } from './three/groundFx';
import { worldBlockFaces } from './worldBlockFaces';
import { worldSpriteArt } from './worldSpriteArt';
import { ItemIcons, itemIconUrl, loadCropSprites } from './itemArt';
import { type ItemId, stackBlock } from '../world/items';
import { classifySanctuaryBlock, sanctuaryBlockTransform } from './sanctuaryThreeLayout';

/** Margem de chunks além da tela: a vista oblíqua mostra mais ao sul/norte do que a antiga. */
const FLOOR_MARGIN = 1;

/**
 * Render do Mundo principal em 2.5D (ADR 0031, M2–M3 — **em construção**; só em desenvolvimento, `?render=3d`).
 * M2: chão por chunk (textura do `ChunkRenderer`), cubos (`ChunkBlocks`, frente provisória), objetos altos e a cidade
 * (`ChunkSprites`, planos verticais), efeitos de chão (`GroundFx`). M3.1: atores (`ActorBillboards`: jogador, NPCs, animais,
 * goblins e monstros em planos verticais com sombra, nome, coração e barra de vida), itens caídos e o anel da ovelha.
 * M3.2: camada 2D (`Overlay2D`) com números de dano, vinheta de dano e fade de porta. Ainda **não** desenha luz/dia-noite, partículas, animação da porta, interiores e dungeon
 * (ver `WORLD_THREE_OPTIONS` em `rendererContract.ts`). Mesma vista oblíqua K = 1 do Santuário (ADR 0026/0028).
 */
export class WorldThreeRenderer implements GameRenderer {
  readonly preferredCellsTall = SANCTUARY_CELLS_TALL;
  readonly textures: BlockTextures;
  private readonly stage: ThreeStage;
  private readonly selection: SelectionMarkers;
  private readonly chunks: ChunkRenderer;
  private readonly floor: ChunkFloor;
  private readonly blocks: ChunkBlocks;
  private readonly sprites: ChunkSprites;
  private readonly groundFx: GroundFx;
  /** Quantos objetos 2D o mapa de texturas tinha: se crescer (cultura/dungeon chegando), os planos são refeitos. */
  private objectCount = 0;
  private readonly blockMaterials: BlockMaterials;
  private readonly actorSprites = new ActorSprites();
  private readonly actors: ActorBillboards;
  private readonly drops: DropSprites;
  private readonly ring: HoverRing;
  /** Camada 2D sobre o WebGL: números de dano, vinheta de dano e escurecer de porta (M3.2). */
  private readonly overlay: Overlay2D;
  private readonly damageNumbers = new DamageNumbers();
  /** Ícones dos itens caídos: itens pelo pacote de arte; materiais pelo ícone do bloco (como no 2D). */
  private readonly itemIcons = new ItemIcons((id) => {
    const b = stackBlock(id);
    return b !== null ? this.iconFor(b) : itemIconUrl(id as ItemId);
  });
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, private readonly world: World) {
    this.stage = new ThreeStage(canvas, 'oblique', world.profile.sky[0], () => {
      this.actors?.reupload();
      this.drops?.reupload();
      this.floor.reupload();
      this.blockMaterials?.reupload();
      this.sprites?.reupload();
      this.groundFx?.reupload();
    });
    this.textures = createBlockTextures({ town: !!world.town });
    this.chunks = new ChunkRenderer(world, this.textures);
    // Arte da dungeon em segundo plano (como no 2D): quando chega, o chão é repintado.
    void loadDungeonArt().then((d) => { if (!this.disposed && d && addDungeonTextures(this.textures)) { this.chunks.invalidateAll(); this.sprites.invalidateAll(); } });
    loadCropSprites(this.textures.objects);
    this.floor = new ChunkFloor(this.stage.scene, world, this.chunks);
    this.selection = new SelectionMarkers(this.stage.scene, world);
    this.sprites = new ChunkSprites(this.stage.scene, world, { tile: TILE, k: OBLIQUE_K, art: worldSpriteArt(world, this.textures) });
    this.groundFx = new GroundFx(this.stage.scene, {
      seed: world.seed,
      isOpenWater: (x, y) => blockDef(world.getGround(x, y)).liquid && world.getObject(x, y) === Block.AIR,
      waterFlows: () => world.waterFlows(),
      flowSheet: () => getWaterArt()?.flow ?? null,
    });
    this.blockMaterials = new BlockMaterials('oblique', worldBlockFaces(this.textures), this.stage.gpu);
    this.blocks = new ChunkBlocks(this.stage.scene, world, {
      isCube: (id) => blockDef(id).shape === 'cube',
      classify: (w, id, x, y, level) => classifySanctuaryBlock(w, id, x, y, level),
      transform: (cell) => sanctuaryBlockTransform(cell),
      material: (id) => this.blockMaterials.get(id).block,
    });

    // Atores (jogador, NPCs, animais, monstros), itens caídos e o anel da ovelha. Os personagens levam o fator de escala do mundo
    // (ADR 0028); o mundo mantém a escala em células. Provisório: o mesmo fator para todas as espécies.
    this.actors = new ActorBillboards(this.stage.scene, this.actorSprites, { scale: CHARACTER_SCALE_FACTOR, k: OBLIQUE_K });
    this.drops = new DropSprites(this.stage.scene, this.itemIcons, OBLIQUE_K);
    this.ring = new HoverRing(this.stage.scene);
    this.overlay = new Overlay2D(canvas);
  }

  stats(): RendererStats { return this.stage.stats(); }

  /** Chunks de chão vivos (dev/testes). */
  get floorChunks(): number { return this.floor.count; }

  draw(cam: Camera, opts: RenderOptions): void {
    if (this.disposed || this.stage.contextLost) return;
    this.stage.syncCamera(cam);
    const rect = cam.visibleChunks(FLOOR_MARGIN);
    this.floor.update(rect);
    this.blocks.update(rect);
    if (this.textures.objects.size !== this.objectCount) { this.objectCount = this.textures.objects.size; this.sprites.invalidateAll(); }
    this.sprites.update(rect);
    // Área visível em células de mundo (+1 de margem): brilhos da água, água enchendo e sombras de nuvens.
    const [ax, ay] = cam.screenToWorld(0, 0);
    const [bx, by] = cam.screenToWorld(cam.width, cam.height);
    const view = { x0: ax / TILE - 1, y0: ay / TILE - 1, x1: bx / TILE + 1, y1: by / TILE + 1 };
    this.groundFx.update(view, opts.elapsed);
    this.actors.update(view, opts.actors, opts.elapsed);
    this.drops.update(view, opts.drops, opts.elapsed);
    this.ring.update(opts.hoverSheep);
    this.selection.update(opts);
    this.stage.render();
    const ctx = this.overlay.begin(cam.width, cam.height, window.devicePixelRatio || 1);
    if (ctx) {
      this.damageNumbers.draw(ctx, cam, opts.dt);
      drawHurtVignette(ctx, cam.width, cam.height, opts.hurtFlash);
      drawFade(ctx, cam.width, cam.height, opts.fade);
    }
  }

  pick(cam: Camera, sx: number, sy: number): { x: number; y: number; hasObject: boolean } {
    if (this.disposed) return { x: 0, y: 0, hasObject: false };
    this.stage.syncCamera(cam);
    this.stage.aim(cam, sx, sy);
    for (const hit of this.stage.hits([...this.blocks.meshes(), ...this.sprites.meshes()])) {
      const block = this.blocks.cellOf(hit.object, hit.instanceId) ?? this.sprites.cellOf(hit);
      if (block) return { x: block.x, y: block.y, hasObject: true };
    }
    const cell = this.stage.groundCell();
    if (!cell) return { x: 0, y: 0, hasObject: false };
    return { x: cell.x, y: cell.y, hasObject: this.world.getObject(cell.x, cell.y) !== Block.AIR };
  }

  /** Mostra o número de um dano que entrou (chamado pelo jogo a cada acerto); desenhado na camada 2D. */
  addDamage(x: number, y: number, hit: Hit, target: 'enemy' | 'player'): void {
    this.damageNumbers.add(x, y, hit, target);
  }

  iconFor(id: BlockId): string {
    return this.textures.icons.get(id) ?? '';
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.floor.dispose();
    this.blocks.dispose();
    this.sprites.dispose();
    this.groundFx.dispose();
    this.blockMaterials.dispose();
    this.selection.dispose();
    this.actors.dispose();
    this.drops.dispose();
    this.ring.dispose();
    this.overlay.dispose();
    this.stage.dispose();
  }
}

