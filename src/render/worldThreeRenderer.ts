import { TILE } from '../config';
import type { Camera } from '../game/camera';
import { ActorSprites } from './character';
import { ActorBillboards } from './three/actorBillboards';
import { DropSprites, HoverRing } from './three/itemSprites';
import { drawFade, drawHurtVignette, Overlay2D } from './three/overlay2d';
import { DamageNumbers } from './damageNumbers';
import { SanctuaryLighting } from './sanctuaryLighting';
import { flickerFactor, type LightSource, PLAYER_LIGHT, pickLights } from './lighting';
import { collectWorldLights, worldAmbient } from './worldLight';
import type { RenderOptions } from './renderer';
import type { GameRenderer, RendererStats } from './rendererContract';
import { ChunkRenderer } from './chunkRenderer';
import { addDungeonTextures, createBlockTextures, type BlockTextures } from './textures';
import { getWaterArt, loadDungeonArt } from './blockArt';
import { Block, blockDef, isDoor, type BlockId } from '../world/blocks';
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
import { DoorSprites } from './three/doorSprites';
import * as THREE from 'three';
import { INTERIOR_BACKGROUND, InteriorRoom, roomBounds } from './three/interiorRoom';
import { art } from './art';
import { Particles } from './particles';
import { skyAt } from './daycycle';
import { darkenOutside, drawBeacon } from './dungeonFx';
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
 * M3.2: camada 2D (`Overlay2D`) com números de dano, vinheta de dano e fade de porta. M3.3: luz e escuridão só à noite e na dungeon. M3.4: animação da porta (`DoorSprites`) e partículas do bioma. M4.1: interiores (`InteriorRoom`). M4.2: dungeon (parede empilhada, farol e seta da entrada, escuro fora do labirinto, penumbra pela luz)
 * (ver `WORLD_THREE_OPTIONS` em `rendererContract.ts`). Mesma vista oblíqua K = 1 do Santuário (ADR 0026/0028).
 */
export class WorldThreeRenderer implements GameRenderer {
  readonly preferredCellsTall = SANCTUARY_CELLS_TALL;
  readonly textures: BlockTextures;
  private readonly stage: ThreeStage;
  private readonly selection: SelectionMarkers;
  private readonly chunks: ChunkRenderer;
  /** Tudo do mundo aberto (chão, cubos, objetos, portas, efeitos): escondido quando a personagem está num interior (M4.1). */
  private readonly worldLayer = new THREE.Group();
  private readonly interiorLayer = new THREE.Group();
  private readonly room: InteriorRoom;
  private readonly skyColor: THREE.Color;
  private readonly floor: ChunkFloor;
  private readonly blocks: ChunkBlocks;
  private readonly sprites: ChunkSprites;
  private readonly groundFx: GroundFx;
  private readonly doors: DoorSprites;
  /** Partículas do bioma (pétalas, poeira, pólen, vaga-lumes), em espaço de tela, na camada 2D. */
  private readonly particles = new Particles();
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
  /** Luz e escuridão (M3.3): só à noite e na dungeon (clima padrão decidido em 13/11/2026); o dia não desenha a camada. */
  private readonly lighting = new SanctuaryLighting(1);
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
      this.doors?.reupload();
      this.room?.reupload();
    });
    this.textures = createBlockTextures({ town: !!world.town });
    this.chunks = new ChunkRenderer(world, this.textures);
    // Arte da dungeon em segundo plano (como no 2D): quando chega, o chão é repintado.
    void loadDungeonArt().then((d) => { if (!this.disposed && d && addDungeonTextures(this.textures)) { this.chunks.invalidateAll(); this.sprites.invalidateAll(); } });
    loadCropSprites(this.textures.objects);
    this.stage.scene.add(this.worldLayer, this.interiorLayer);
    this.skyColor = new THREE.Color(world.profile.sky[0]);
    this.room = new InteriorRoom(this.interiorLayer, art().interiors ?? {});
    this.floor = new ChunkFloor(this.worldLayer, world, this.chunks);
    this.selection = new SelectionMarkers(this.stage.scene, world);
    this.sprites = new ChunkSprites(this.worldLayer, world, { tile: TILE, k: OBLIQUE_K, art: worldSpriteArt(world, this.textures) });
    this.doors = new DoorSprites(this.worldLayer, world, {
      tile: TILE, k: OBLIQUE_K,
      isDoor: (id) => isDoor(id), isOpen: (id) => id === Block.OAK_DOOR_OPEN,
      frames: () => this.textures.doorFrames,
    });
    this.groundFx = new GroundFx(this.worldLayer, {
      seed: world.seed,
      isOpenWater: (x, y) => blockDef(world.getGround(x, y)).liquid && world.getObject(x, y) === Block.AIR,
      waterFlows: () => world.waterFlows(),
      flowSheet: () => getWaterArt()?.flow ?? null,
    });
    this.blockMaterials = new BlockMaterials('oblique', worldBlockFaces(this.textures), this.stage.gpu);
    this.blocks = new ChunkBlocks(this.worldLayer, world, {
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
    // Interior (ADR 0014): o cômodo isolado substitui o mundo — sem chão, céu, nuvens, noite nem partículas lá dentro.
    const inside = opts.interior ?? null;
    this.worldLayer.visible = !inside;
    this.interiorLayer.visible = !!inside;
    this.room.update(inside ? { id: inside.def.id, area: inside.area } : null);
    (this.stage.scene.background as THREE.Color).set(inside ? INTERIOR_BACKGROUND : this.skyColor);
    // Área visível em células de mundo (+1 de margem); dentro do cômodo, só o que está nele.
    const [ax, ay] = cam.screenToWorld(0, 0);
    const [bx, by] = cam.screenToWorld(cam.width, cam.height);
    const view = inside ? roomBounds(inside.area) : { x0: ax / TILE - 1, y0: ay / TILE - 1, x1: bx / TILE + 1, y1: by / TILE + 1 };
    if (!inside) {
      const rect = cam.visibleChunks(FLOOR_MARGIN);
      this.floor.update(rect);
      this.blocks.update(rect);
      if (this.textures.objects.size !== this.objectCount) { this.objectCount = this.textures.objects.size; this.sprites.invalidateAll(); }
      this.sprites.update(rect);
      this.doors.update(rect, opts.elapsed);
      this.groundFx.update(view, opts.elapsed);
    }
    this.actors.update(view, opts.actors, opts.elapsed);
    this.drops.update(view, opts.drops, opts.elapsed);
    this.ring.update(opts.hoverSheep);
    this.selection.update(opts);
    this.stage.render();
    if (!inside) this.drawLighting(cam, opts, view);
    const ctx = this.overlay.begin(cam.width, cam.height, window.devicePixelRatio || 1);
    if (ctx) {
      // Dungeon (como no 2D: farol da entrada e escuro fora do labirinto, antes das partículas).
      if (!inside && opts.entrance) drawBeacon(ctx, cam, opts.entrance, opts.elapsed, cam.width, cam.height);
      if (!inside && opts.dungeonArea) darkenOutside(ctx, cam, opts.dungeonArea, cam.width, cam.height);
      // Partículas do bioma onde o jogador está (como no 2D: depois da noite, antes dos números de dano).
      if (!inside) {
        this.particles.update(opts.dt, cam.width, cam.height, this.world.biomeAt(opts.player.cellX, opts.player.cellY), skyAt(opts.time).night);
        this.particles.draw(ctx);
      }
      this.damageNumbers.draw(ctx, cam, opts.dt);
      drawHurtVignette(ctx, cam.width, cam.height, opts.hurtFlash);
      drawFade(ctx, cam.width, cam.height, opts.fade);
    }
  }

  /** Escuridão com poças de luz pela hora do dia (`opts.time`) e pelo covil (`opts.inDungeon`); dia pleno: nada é desenhado. */
  private drawLighting(cam: Camera, opts: RenderOptions, view: { x0: number; y0: number; x1: number; y1: number }): void {
    const amb = worldAmbient(opts.time, opts.inDungeon);
    if (!amb.active) return;
    const focus = { x: cam.x / TILE, z: cam.y / TILE };
    const cellPx = TILE * cam.zoom;
    const reach = Math.hypot(cam.width, cam.height) / (2 * cellPx);
    const a = opts.actors[0];
    const player: LightSource = { x: a ? a.x : focus.x, z: a ? a.y : focus.z, ...PLAYER_LIGHT };
    const glows = collectWorldLights(view, (x, y) => this.world.getObject(x, y), (id) => {
      const color = this.textures.glowColor.get(id);
      return color ? { color, at: this.textures.glowAt.get(id) } : undefined;
    });
    const chosen = [player, ...pickLights(glows, focus, reach, 11)];
    this.lighting.setAmbient(amb.ambient, amb.dark);
    this.lighting.update(chosen, {
      focus, cellPx, width: cam.width, height: cam.height,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2), k: OBLIQUE_K, elapsed: opts.elapsed,
    }, (l, i) => flickerFactor(l.flicker, opts.elapsed, l.x * 7 + l.z * 13 + i));
    this.lighting.render(this.stage.gpu);
  }

  pick(cam: Camera, sx: number, sy: number): { x: number; y: number; hasObject: boolean } {
    if (this.disposed) return { x: 0, y: 0, hasObject: false };
    this.stage.syncCamera(cam);
    this.stage.aim(cam, sx, sy);
    if (this.worldLayer.visible) for (const hit of this.stage.hits([...this.blocks.meshes(), ...this.sprites.meshes(), ...this.doors.meshes()])) {
      const block = this.blocks.cellOf(hit.object, hit.instanceId) ?? this.sprites.cellOf(hit) ?? this.doors.cellOf(hit);
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
    this.doors.dispose();
    this.groundFx.dispose();
    this.blockMaterials.dispose();
    this.selection.dispose();
    this.actors.dispose();
    this.drops.dispose();
    this.ring.dispose();
    this.overlay.dispose();
    this.room.dispose();
    this.lighting.dispose();
    this.stage.dispose();
  }
}

