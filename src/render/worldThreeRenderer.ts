import { SUBDIV, TILE } from '../config';
import type { Camera } from '../game/camera';
import { ActorSprites } from './character';
import { ActorBillboards } from './three/actorBillboards';
import { DropSprites, HoverRing } from './three/itemSprites';
import { drawFade, drawHurtVignette, Overlay2D } from './three/overlay2d';
import { DamageNumbers } from './damageNumbers';
import { SanctuaryLighting } from './sanctuaryLighting';
import { flickerFactor, type LightSource, PLAYER_LIGHT, pickLights } from './lighting';
import { collectWorldLights, worldAmbient } from './worldLight';
import { actorLightAt } from './actorLight';
import { feelOn } from '../game/feel';
import { DUST_STRIDE, dustFor, printFor } from './footDust';
import { FootPrints } from './three/footPrints';
import { SWAY_PUSH_RADIUS, windKind } from './wind';
import { TreeLeaves } from './three/treeLeaves';
import { WaterSurface } from './three/waterSurface';
import { WaterRipples } from './three/waterRipples';
import { WaterFish } from './three/waterFish';
import { BreakChips } from './three/breakChips';
import { BreakCracks } from './three/breakCracks';
import { BREAK_BURST_CHIPS, BREAK_GRACE, breakShake, CHIP_EVERY, chipColor, chipsPerBurst } from './breakFx';
import { waterFxOn } from './waterFx';
import { v2WaterTop } from './materialsV2';
import { FootDust } from './three/footDust';
import { findFires, type FireSource } from './fireLight';
import { FireFx } from './three/fireFx';
import { actorLightOn, sunShadingOn, sunShadowOn } from './rendererChoice';
import type { RenderOptions } from './rendererContract';
import type { GameRenderer, RendererStats } from './rendererContract';
import { ChunkRenderer } from './chunkRenderer';
import { addDungeonTextures, createBlockTextures, type BlockTextures } from './textures';
import { getFxArt, getTownImages, getWaterArt, loadDungeonArt } from './blockArt';
import { SpriteFx } from './three/spriteFx';
import { TOOLS } from '../world/items';
import { Block, blockDef, gateFence, isDoor, isGate, isGateOpen, joinsFence, isWaterPlant, type BlockId } from '../world/blocks';
import type { World } from '../world/world';
import type { Hit } from '../world/progression';
import { OBLIQUE_K } from './sanctuaryObliqueView';
import { actorScaleFor, cellsTallFromSearch, objectScaleFor } from './worldScale';
import { ChimneySmoke, chimneyWorldPos, type Chimney } from './three/chimneySmoke';
import { chimneyMouths, isTownArt } from './townArt';
import { hash2 } from '../world/random';
import { ChunkWalls } from './three/chunkWalls';
import { DEFAULT_WALL_THICKNESS } from '../world/walls';
import { ThreeStage } from './three/stage';
import { SanctuaryCameraModes } from './sanctuaryCameraModes';
import { ChunkFloor } from './three/chunkFloor';
import { ChunkBlocks } from './three/chunkBlocks';
import { BlockMaterials } from './three/blockMaterials';
import { ChunkSprites, type SpriteCell } from './three/chunkSprites';
import { GroundFx } from './three/groundFx';
import { DoorSprites } from './three/doorSprites';
import { gateIsSide } from './fence';
import * as THREE from 'three';
import { INTERIOR_BACKGROUND, InteriorRoom, roomBounds } from './three/interiorRoom';
import { art } from './art';
import { Particles } from './particles';
import { skyAt } from './daycycle';
import { drawBreakingRing, drawFocusBrackets, drawHoverFrame } from './selectionFx';
import { selectionRect3d } from './worldSelection';
import { darkenOutside, drawBeacon } from './dungeonFx';
import { worldBlockFaces } from './worldBlockFaces';
import { worldSpriteArt } from './worldSpriteArt';
import { ItemIcons, itemIconUrl, loadCropSprites } from './itemArt';
import { type ItemId, stackBlock } from '../world/items';
import { classifySanctuaryBlock, sanctuaryBlockTransform } from './sanctuaryThreeLayout';

/** Margem de chunks além da tela: a vista oblíqua mostra mais ao sul/norte do que a antiga. */
const FLOOR_MARGIN = 1;

/** Água "aberta" para os efeitos (brilho, espuma, ondas, peixes): chão líquido sem objeto, ou só com uma planta flutuante por cima. */
function openWaterAt(world: World, x: number, y: number): boolean {
  if (!blockDef(world.getGround(x, y)).liquid) return false;
  const o = world.getObject(x, y);
  return o === Block.AIR || isWaterPlant(o);
}

/**
 * Render do Mundo principal em 2.5D (ADR 0031, M2–M3 — **em construção**; só em desenvolvimento, `?render=3d`).
 * M2: chão por chunk (textura do `ChunkRenderer`), cubos (`ChunkBlocks`, frente provisória), objetos altos e a cidade
 * (`ChunkSprites`, planos verticais), efeitos de chão (`GroundFx`). M3.1: atores (`ActorBillboards`: jogador, NPCs, animais,
 * goblins e monstros em planos verticais com sombra, nome, coração e barra de vida), itens caídos e o anel da ovelha.
 * M3.2: camada 2D (`Overlay2D`) com números de dano, vinheta de dano e fade de porta. M3.3: luz e escuridão só à noite e na dungeon. M3.4: animação da porta (`DoorSprites`) e partículas do bioma. M4.1: interiores (`InteriorRoom`). M4.2: dungeon (parede empilhada, farol e seta da entrada, escuro fora do labirinto, penumbra pela luz)
 * (ver `WORLD_THREE_OPTIONS` em `rendererContract.ts`). Mesma vista oblíqua K = 1 do Santuário (ADR 0026/0028).
 */
export class WorldThreeRenderer implements GameRenderer {
  /** Padrão 14; `?celulas=N` (experimento de escala, `worldScale.ts`) muda para comparar. */
  readonly preferredCellsTall = cellsTallFromSearch(typeof window === 'undefined' ? '' : window.location.search);
  readonly textures: BlockTextures;
  private readonly stage: ThreeStage;
  private readonly sanctuaryCameras: SanctuaryCameraModes | null;
  private lastCameraPlayer: RenderOptions['player'] | null = null;
  private readonly chunks: ChunkRenderer;
  /** Tudo do mundo aberto (chão, cubos, objetos, portas, efeitos): escondido quando a personagem está num interior (M4.1). */
  private readonly worldLayer = new THREE.Group();
  private readonly interiorLayer = new THREE.Group();
  private readonly room: InteriorRoom;
  private readonly skyColor: THREE.Color;
  private readonly floor: ChunkFloor;
  private readonly blocks: ChunkBlocks;
  private readonly sprites: ChunkSprites;
  /** Efeitos da fogueira (brilho no chão, halo, brasas) e a lista das visíveis (refeita a cada ~0,25 s). */
  private readonly fireFx: FireFx;
  /** Poeira de passos do jogador (v0.93.69): distância andada desde a última nuvenzinha e onde ele estava. */
  private readonly dust: FootDust;
  private readonly leaves: TreeLeaves;
  private readonly water: WaterSurface | null;
  private readonly ripples: WaterRipples | null;
  private readonly fish: WaterFish | null;
  private readonly chips: BreakChips;
  private readonly cracks: BreakCracks;
  private readonly fx: SpriteFx;
  private readonly smoke: ChimneySmoke;
  private impactSeen = 0;
  /** A quebra em andamento: onde, que bloco, a altura do topo e quando foi vista pela última vez (para o estouro final). */
  private lastBreak: { x: number; y: number; id: number; top: number; at: number } | null = null;
  private chipAt = 0;
  private rippleWalked = 0;
  private rippleAt: { x: number; y: number } | null = null;
  private waterTileCanvas: HTMLCanvasElement | null = null;
  private readonly leafTrees: SpriteCell[] = [];
  private leafTreesAt = -1;
  private cutLeafAt = 0;
  private readonly prints: FootPrints;
  private dustWalked = 0;
  private dustAt: { x: number; y: number } | null = null;
  private fires: FireSource[] = [];
  private firesAt = -Infinity;
  private readonly groundFx: GroundFx;
  private readonly doors: DoorSprites;
  private readonly gates: DoorSprites;
  /** Paredes autotile (W5): arte por chunk; os atlas chegam em segundo plano. */
  private readonly walls: ChunkWalls;
  private readonly wallAtlases = new Map<BlockId, HTMLImageElement>();
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

  constructor(canvas: HTMLCanvasElement, private readonly world: World, sanctuaryRoom = false) {
    this.stage = new ThreeStage(canvas, 'oblique', world.profile.sky[0], () => {
      this.actors?.reupload();
      this.drops?.reupload();
      this.floor.reupload();
      this.blockMaterials?.reupload();
      this.sprites?.reupload();
      this.groundFx?.reupload();
      this.doors?.reupload();
      this.gates?.reupload();
      this.room?.reupload();
    });
    this.sanctuaryCameras = sanctuaryRoom ? new SanctuaryCameraModes(canvas, this.stage, true) : null;
    // Os carvalhos mudam de arte (e giram) na Isométrica: refaz os sprites ao trocar de câmera.
    if (this.sanctuaryCameras) this.sanctuaryCameras.onChange = () => this.sprites?.invalidateAll();
    this.textures = createBlockTextures({ town: !!world.town });
    this.chunks = new ChunkRenderer(world, this.textures);
    // Arte da dungeon em segundo plano (como no 2D): quando chega, o chão é repintado.
    void loadDungeonArt().then((d) => { if (!this.disposed && d && addDungeonTextures(this.textures)) { this.chunks.invalidateAll(); this.sprites.invalidateAll(); } });
    loadCropSprites(this.textures.objects);
    this.stage.scene.add(this.worldLayer, this.interiorLayer);
    this.skyColor = new THREE.Color(world.profile.sky[0]);
    this.room = new InteriorRoom(this.interiorLayer, art().interiors ?? {});
    this.floor = new ChunkFloor(this.worldLayer, world, this.chunks);
    this.sprites = new ChunkSprites(this.worldLayer, world, { tile: TILE, k: OBLIQUE_K, art: worldSpriteArt(world, this.textures, () => this.sanctuaryCameras?.current === 'isometrico'), animated: (id) => (id === Block.CAMPFIRE ? 'fire' : feelOn() ? (windKind(id) === 'grass' ? 'sway' : windKind(id) === 'tree' ? 'tree' : null) : null), swayRadius: SWAY_PUSH_RADIUS * SUBDIV, felled: (c) => { for (let n = 0; n < 7; n++) this.leaves.emit(c); } });
    this.fireFx = new FireFx(this.worldLayer, OBLIQUE_K);
    this.dust = new FootDust(this.worldLayer, OBLIQUE_K);
    this.leaves = new TreeLeaves(this.worldLayer, TILE, OBLIQUE_K);
    this.prints = new FootPrints(this.worldLayer);
    this.walls = new ChunkWalls(this.worldLayer, world, this.wallAtlases, DEFAULT_WALL_THICKNESS);
    for (const [key, url] of Object.entries(art().wallAtlases ?? {})) {
      if (!url) continue;
      const img = new Image();
      img.onload = () => { if (!this.disposed) { this.wallAtlases.set(Number(key) as BlockId, img); this.walls.invalidateAll(); } };
      img.onerror = () => console.warn('Atlas de paredes não carregou');
      img.src = url;
    }
    this.doors = new DoorSprites(this.worldLayer, world, {
      tile: TILE, k: OBLIQUE_K,
      isDoor: (id) => isDoor(id), isOpen: (id) => id === Block.OAK_DOOR_OPEN,
      frames: () => this.textures.doorFrames,
    });
    this.gates = new DoorSprites(this.worldLayer, world, {
      tile: TILE, k: OBLIQUE_K, steps: 5,
      isDoor: (id) => isGate(id), isOpen: (id) => isGateOpen(id),
      frames: () => this.textures.gateFrames.get(Block.FENCE) ?? [],
      framesAt: (gx, gy) => {
        const fence = gateFence(world.getObject(gx, gy));
        const side = gateIsSide((dx, dy) => joinsFence(world.getObject(gx + dx, gy + dy)));
        return (side ? this.textures.gateFramesSide : this.textures.gateFrames).get(fence) ?? this.textures.gateFrames.get(fence);
      },
    });
    this.groundFx = new GroundFx(this.worldLayer, {
      seed: world.seed,
      isOpenWater: (x, y) => openWaterAt(world, x, y),
      waterFlows: () => world.waterFlows(),
      flowSheet: () => getWaterArt()?.flow ?? null,
    });
    this.water = waterFxOn() ? new WaterSurface(this.worldLayer, {
      isOpenWater: (x, y) => openWaterAt(world, x, y),
      paintedShore: (x, y) => { const g = world.getGround(x, y); return g === Block.GRASS || g === Block.SAND || g === Block.PATH || g === Block.DIRT; },
      getChunk: (cx, cy) => world.getChunk(cx, cy),
      tile: () => this.waterTile(),
    }) : null;
    this.ripples = this.water ? new WaterRipples(this.worldLayer) : null;
    this.chips = new BreakChips(this.worldLayer, world.seed);
    this.cracks = new BreakCracks(this.worldLayer, world.cubeLevels);
    this.smoke = new ChimneySmoke(this.worldLayer, world.seed);
    this.smoke.setChimneys(this.villageChimneys());
    this.fx = new SpriteFx(this.worldLayer, () => getFxArt());
    this.fish = this.water ? new WaterFish(this.worldLayer, world.seed, getTownImages()) : null;
    if (this.ripples) {
      this.leaves.onLand = (x, z) => { if (this.isOpenWaterAt(x, z)) this.ripples!.emit(x, z, 0.5); };
    }
    this.blockMaterials = new BlockMaterials('oblique', worldBlockFaces(this.textures), this.stage.gpu);
    this.blocks = new ChunkBlocks(this.worldLayer, world, {
      isCube: (id) => blockDef(id).shape === 'cube',
      // Mundo (blocos de 1/4, ADR 0033): sempre caixa cheia (sem a placa fina das "paredes horizontais"), `n` blocos iguais seguidos numa caixa só,
      // do nível `level` até `level + n`, em células de altura (nível ÷ níveis por cubo). Santuário (1 nível por cubo) mantém o cálculo dele.
      levelsPerCube: this.world.cubeLevels,
      classify: (w, id, x, y, level) => (this.world.cubeLevels > 1 ? 'solid' : classifySanctuaryBlock(w, id, x, y, level)),
      transform: (cell) => (this.world.cubeLevels > 1
        ? { x: cell.x + 0.5, y: (cell.level + cell.n / 2) / this.world.cubeLevels, z: cell.y + 0.5 }
        : sanctuaryBlockTransform(cell)),
      material: (id) => this.blockMaterials.get(id).block,
    });

    // Atores (jogador, NPCs, animais, monstros), itens caídos e o anel da ovelha. Os personagens levam o fator de escala do mundo
    // (ADR 0028); o mundo mantém a escala em células. Provisório: o mesmo fator para todas as espécies.
    this.actors = new ActorBillboards(this.stage.scene, this.actorSprites, { scale: actorScaleFor(this.preferredCellsTall), k: OBLIQUE_K, echo: true, lit: actorLightOn(), sunShading: sunShadingOn(), sunShadow: sunShadowOn(), bob: feelOn() });
    this.drops = new DropSprites(this.stage.scene, this.itemIcons, OBLIQUE_K);
    this.ring = new HoverRing(this.stage.scene);
    this.overlay = new Overlay2D(canvas);
  }

  stats(): RendererStats { return this.stage.stats(); }

  /** Chunks de chão vivos (dev/testes). */
  get floorChunks(): number { return this.floor.count; }

  draw(cam: Camera, opts: RenderOptions): void {
    if (this.disposed || this.stage.contextLost) return;
    this.lastCameraPlayer = opts.player;
    const activeCamera = this.sanctuaryCameras?.sync(cam, opts.player) ?? (this.stage.syncCamera(cam), this.stage.camera);
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
      this.walls.update(rect);
      this.doors.update(rect, opts.elapsed);
      this.gates.update(rect, opts.elapsed);
      this.groundFx.update(view, opts.elapsed);
      this.water?.update(rect, opts.elapsed, skyAt(opts.time).night);
    }
    // Fogueiras vivas (v0.93.67): a lista das visíveis é refeita a cada ~0,25 s; chama, brilho, brasas e luz nos atores.
    this.sprites.setTime(opts.elapsed);
    this.sprites.tick(opts.dt);
    this.sprites.setSwayPlayer(opts.actors[0] && !inside ? opts.actors[0].x : null, opts.actors[0]?.y);
    if (inside) this.fires = [];
    else if (opts.elapsed - this.firesAt > 0.25 || opts.elapsed < this.firesAt) {
      this.firesAt = opts.elapsed;
      this.fires = findFires(view, (x, y) => this.world.getObject(x, y), { x: cam.x / TILE, z: cam.y / TILE });
    }
    this.fireFx.update(this.fires, opts.elapsed, skyAt(opts.time).night, TILE * cam.zoom);
    this.stepDust(opts, inside, TILE * cam.zoom);
    // Folhas caindo das copas (v0.93.82): a lista das árvores perto da câmera é refeita a cada ~0,5 s; nada em cômodos nem com `?sensacao=0`.
    if (inside || !feelOn()) { this.leaves.clear(); this.leafTrees.length = 0; }
    else if (opts.elapsed - this.leafTreesAt > 0.5 || opts.elapsed < this.leafTreesAt) {
      this.leafTreesAt = opts.elapsed;
      const cellPx = TILE * cam.zoom;
      // o que aparece na tela: meia largura + folga, e meia altura + a altura da copa (a árvore da borda de baixo mostra a copa acima)
      this.sprites.treesNear(cam.x / TILE, cam.y / TILE, cam.width / cellPx / 2 + 2, cam.height / cellPx / 2 + 8, this.leafTrees);
    }
    // Golpe do machado (v0.93.83): a árvore sendo cortada treme mais quanto mais perto de cair e solta folhas no ritmo dos golpes.
    const cut = opts.breaking && !inside && feelOn() && (opts.breaking as { valid?: boolean }).valid !== false && windKind(this.world.getObject(opts.breaking.x, opts.breaking.y)) === 'tree' ? opts.breaking : null;
    const shaking = this.sprites.setShake(cut, 0.4 + 0.6 * (cut?.progress ?? 0), opts.dt);
    if (shaking && opts.elapsed - this.cutLeafAt > 0.14) { this.cutLeafAt = opts.elapsed; this.leaves.emit(shaking); }
    this.leaves.update(opts.dt, TILE * cam.zoom, this.leafTrees);
    this.stepRipples(opts, inside);
    if (this.fish) {
      if (inside) this.fish.clear();
      else this.fish.update(opts.dt, { x: cam.x / TILE, z: cam.y / TILE }, Math.hypot(view.x1 - view.x0, view.y1 - view.y0) / 2, opts.actors[0] ? { x: opts.actors[0].x, z: opts.actors[0].y } : null, (x, z) => openWaterAt(this.world, Math.floor(x), Math.floor(z)));
    }
    this.stepBreak(opts, inside, TILE * cam.zoom);
    // Fumaça das chaminés da vila (v0.93.109): só as que estão na tela; sem a "sensação" e dentro de cômodos, nada.
    if (!feelOn() || inside) this.smoke.clear(); else this.smoke.update(opts.dt, TILE * cam.zoom, view, opts.elapsed, skyAt(opts.time).night);
    if (inside) this.ripples?.clear();
    this.ripples?.update(opts.dt, skyAt(opts.time).night);
    this.actors.setFires(this.fires);
    this.actors.setLight(actorLightAt(opts.time, inside ? 'interior' : opts.inDungeon ? 'dungeon' : 'world'));
    this.actors.update(view, opts.actors, opts.elapsed);
    this.drops.update(view, opts.drops, opts.elapsed);
    this.ring.update(opts.hoverSheep);
    if (this.sanctuaryCameras) this.stage.renderWithCamera(activeCamera);
    else this.stage.render();
    if (!inside && (!this.sanctuaryCameras || this.sanctuaryCameras.current === 'atual')) this.drawLighting(cam, opts, view);
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
      if (!inside && opts.zones) {
        ctx.save();
        ctx.strokeStyle = `rgba(255, 205, 90, ${0.65 + 0.3 * Math.sin(opts.elapsed * 3)})`;
        ctx.fillStyle = 'rgba(255, 205, 90, 0.12)';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 6]);
        for (const z of opts.zones) {
          const sx = cam.worldToScreenX(z.x0 * TILE), sy = cam.worldToScreenY(z.y0 * TILE);
          const w = (z.x1 - z.x0 + 1) * TILE * cam.zoom, h = (z.y1 - z.y0 + 1) * TILE * cam.zoom;
          ctx.fillRect(sx, sy, w, h);
          ctx.strokeRect(sx, sy, w, h);
        }
        ctx.restore();
      }
      // Seleção como no 2D (moldura do cursor, cantoneiras do alvo, rachaduras): em volta do que se vê — o cubo de cima, o objeto —,
      // não um quadrado no chão (o 3D tinha um realce plano que só aparecia quando válido e não acompanhava a silhueta).
      const rectFor = (c: { x: number; y: number }) => {
        const top = this.world.topBlock(c.x, c.y);
        return selectionRect3d(cam, {
          x: c.x, y: c.y,
          top: top ? { level: top.level, cube: blockDef(top.id).shape === 'cube', levelsPerCube: this.world.cubeLevels } : null,
          hit: top ? this.textures.objects.get(top.id)?.hit ?? null : null,
        }, TILE, OBLIQUE_K);
      };
      if (opts.focus) drawFocusBrackets(ctx, rectFor(opts.focus), cam.zoom, opts.focus.valid, opts.elapsed);
      if (opts.hover) drawHoverFrame(ctx, rectFor(opts.hover), opts.hover.valid);
      if (opts.breaking) drawBreakingRing(ctx, rectFor(opts.breaking), opts.breaking.progress);
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
    const player: LightSource = { x: a ? a.x : focus.x, z: a ? a.y : focus.z, ...PLAYER_LIGHT, radius: PLAYER_LIGHT.radius * SUBDIV };
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

  /**
   * Quebra de blocos (v0.93.94): enquanto se segura, o bloco treme e solta lascas da cor do material (mais, quanto mais perto de quebrar);
   * quando o bloco some, estoura em lascas e poeira. Só o 3D; `?sensacao=0` e os cômodos ficam sem. A árvore tem o tremor próprio (`sprites`).
   */
  private stepBreak(opts: RenderOptions, inside: unknown, cellPx: number): void {
    const b = opts.breaking && (opts.breaking as { valid?: boolean }).valid !== false ? opts.breaking : null;
    if (!feelOn() || inside) { this.blocks.setShake(null); this.cracks.hide(); this.chips.clear(); this.fx.clear(); this.impactSeen = opts.player.impacts; this.lastBreak = null; this.chips.update(opts.dt, cellPx); return; }
    const w = this.world;
    // Golpe (v0.93.102): o instante da pancada (`Player.consumeHit`) toca o efeito da ferramenta e solta as lascas, em vez de um ritmo fixo.
    const p = opts.player;
    const hit = p.impacts !== this.impactSeen;
    this.impactSeen = p.impacts;
    const swingTool = p.equipped !== null && TOOLS[p.equipped].swings;
    if (hit && p.attackTool === 'sword') {
      // para os lados: o corte do lado direito, espelhado à esquerda; para cima e para baixo: os cortes próprios
      if (p.facing === 'up') this.fx.play('slashUp', p.x, 1.2, p.y - 0.9);
      else if (p.facing === 'down') this.fx.play('slashDown', p.x, 1.2, p.y + 1.1);
      else this.fx.play('slash', p.x + (p.facing === 'left' ? -1 : 1), 1.2, p.y + 0.3, { mirror: p.facing === 'left' });
    }
    // enxada: terra revirada na célula-alvo (o alvo de uso aparece como foco/hover)
    if (hit && p.attackTool === 'hoe') {
      const t = opts.focus ?? opts.hover;
      if (t && t.valid) this.fx.play('till', t.x + 0.5, 0.5, t.y + 0.7);
    }
    if (b) {
      const top = w.topBlock(b.x, b.y);
      const id = top ? top.id : w.getGround(b.x, b.y);
      const cube = !!top && blockDef(top.id).shape === 'cube';
      const h = cube ? w.stackHeight(b.x, b.y) / w.cubeLevels : 0;
      this.lastBreak = { x: b.x, y: b.y, id, top: w.stackHeight(b.x, b.y), at: opts.elapsed };
      const shake = cube ? breakShake(opts.elapsed, b.progress) : { dx: 0, dy: 0, dz: 0 };
      if (cube) this.blocks.setShake({ x: b.x, y: b.y }, shake); else this.blocks.setShake(null);
      if (!(cube || !top) || !chipColor(id)) this.cracks.hide(); else this.cracks.show(b.x, b.y, h, b.progress, cube, shake);
      const color = chipColor(id);
      if (hit && p.attackTool === 'axe' && windKind(id) === 'tree') this.fx.play('tree', b.x + 0.5, 0.95, b.y + 0.9);
      if (hit && p.attackTool === 'pickaxe') this.fx.play('rock', b.x + 0.5, h + 0.35, b.y + 0.9);
      if (hit && p.attackTool === 'shovel') this.fx.play('soil', b.x + 0.5, h + 0.3, b.y + 0.8);
      if (color && (swingTool ? hit : opts.elapsed - this.chipAt >= CHIP_EVERY)) {
        this.chipAt = opts.elapsed;
        this.chips.emit(b.x + 0.5, h, b.y + 0.5, color, chipsPerBurst(b.progress));
      }
    } else {
      this.blocks.setShake(null);
      this.cracks.hide();
      const lb = this.lastBreak;
      if (lb && opts.elapsed - lb.at <= BREAK_GRACE) {
        // o bloco sumiu (ou perdeu um nível)? estoura
        const now = w.topBlock(lb.x, lb.y);
        const gone = w.stackHeight(lb.x, lb.y) < lb.top || (now ? now.id : w.getGround(lb.x, lb.y)) !== lb.id;
        if (gone) {
          const color = chipColor(lb.id);
          if (w.getGround(lb.x, lb.y) === Block.HOLE) this.fx.play('dig', lb.x + 0.5, 0.12 * 2.2, lb.y + 0.5);
          if (color) {
            const h = Math.max(0, w.stackHeight(lb.x, lb.y)) / w.cubeLevels;
            this.chips.emit(lb.x + 0.5, h + 0.15, lb.y + 0.5, color, BREAK_BURST_CHIPS, 1.9);
            for (let i = 0; i < 2; i++) this.dust.emit(lb.x + 0.5 + (i - 0.5) * 0.3, lb.y + 0.5, { color, amount: 1.3 });
          }
          this.lastBreak = null;
        }
      } else if (lb) this.lastBreak = null;
    }
    this.chips.update(opts.dt, cellPx);
    this.fx.update(opts.dt);
  }

  /**
   * Chaminés das casas da Vila Camponesa no mundo (`World.village.props`; a variante da arte sai da posição, como no `worldSpriteArt`): a boca de cada
   * uma vem de `townArt.CHIMNEY_MOUTH` e a posição 3D de `chimneyWorldPos`. Fixas: calculadas uma vez.
   */
  private villageChimneys(): Chimney[] {
    const v = this.world.village;
    if (!v) return [];
    const out: Chimney[] = [];
    for (const p of v.props) {
      const vars = this.textures.variants.get(p.id);
      const mouths = chimneyMouths(p.id);
      if (!vars || !mouths.length) continue;
      const idx = Math.floor(hash2(isTownArt(p.id) ? 0x7041 : this.world.seed, p.x * 7 + 3, p.y * 13 - 1) * vars.length);
      const s = vars[idx], mouth = mouths[idx];
      if (!s || !mouth) continue;
      const pos = chimneyWorldPos(p, { ox: s.ox, oy: s.oy, w: s.w, h: s.h, imgW: s.canvas.width }, mouth, objectScaleFor(blockDef(p.id).shape), TILE);
      out.push({ ...pos, phase: hash2(this.world.seed, p.x, p.y) });
    }
    return out;
  }

  private isOpenWaterAt(x: number, z: number): boolean {
    const cx = Math.floor(x), cy = Math.floor(z);
    return openWaterAt(this.world, cx, cy);
  }

  /** Ondas de quem anda na margem: a cada passada, uma onda na água vizinha mais próxima (até 1,5 célula); nada em cômodos nem com `?agua=0`. */
  private stepRipples(opts: RenderOptions, inside: unknown): void {
    const a = opts.actors[0];
    if (!this.ripples) return;
    if (inside || !a || !a.moving || a.visualZ > 0.05) { this.rippleAt = a ? { x: a.x, y: a.y } : null; return; }
    if (this.rippleAt) this.rippleWalked += Math.hypot(a.x - this.rippleAt.x, a.y - this.rippleAt.y);
    this.rippleAt = { x: a.x, y: a.y };
    if (this.rippleWalked < DUST_STRIDE) return;
    this.rippleWalked = 0;
    const R = Math.ceil(1.5 * SUBDIV);
    let best: [number, number] | null = null, bd = (1.5 * SUBDIV) ** 2;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const cx = Math.floor(a.x) + dx, cy = Math.floor(a.y) + dy;
      const d = (cx + 0.5 - a.x) ** 2 + (cy + 0.5 - a.y) ** 2;
      if (d < bd && this.isOpenWaterAt(cx, cy)) { bd = d; best = [cx, cy]; }
    }
    if (best) this.ripples.emit(best[0] + 0.5, best[1] + 0.5, 0.8);
  }

  /** Ladrilho da água V2 (`agua`) pintado num canvas próprio (sem ler pixels), assim que o atlas dos materiais chega; null antes. */
  private waterTile(): HTMLCanvasElement | null {
    if (this.waterTileCanvas) return this.waterTileCanvas;
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    if (ctx && v2WaterTop(ctx, 128, 128)) this.waterTileCanvas = c;
    return this.waterTileCanvas;
  }

  /** Poeira de passos: uma nuvenzinha por passada do jogador (distância andada), com a cor do chão pisado; nada em cômodos nem em água. */
  private stepDust(opts: RenderOptions, inside: unknown, cellPx: number): void {
    const a = opts.actors[0];
    if (!feelOn() || inside || !a || !a.moving || a.frame !== undefined) this.dustAt = a ? { x: a.x, y: a.y } : null;
    else {
      if (this.dustAt) this.dustWalked += Math.hypot(a.x - this.dustAt.x, a.y - this.dustAt.y);
      this.dustAt = { x: a.x, y: a.y };
      if (this.dustWalked >= DUST_STRIDE) {
        this.dustWalked = 0;
        const ground = this.world.getGround(Math.floor(a.x), Math.floor(a.y));
        const style = dustFor(ground);
        if (style && a.visualZ < 0.05) this.dust.emit(a.x, a.y, style);
        const print = printFor(ground);
        if (print && a.visualZ < 0.05) this.prints.emit(a.x, a.y, a.facing === 'left' ? -1 : a.facing === 'right' ? 1 : 0, a.facing === 'up' ? -1 : a.facing === 'down' ? 1 : 0, print);
      }
    }
    this.dust.update(opts.dt, cellPx);
    this.prints.update(opts.dt);
  }

  pick(cam: Camera, sx: number, sy: number): { x: number; y: number; hasObject: boolean } {
    if (this.disposed) return { x: 0, y: 0, hasObject: false };
    if (this.sanctuaryCameras && this.lastCameraPlayer) {
      this.sanctuaryCameras.sync(cam, this.lastCameraPlayer);
      this.sanctuaryCameras.aim(cam, sx, sy);
    } else {
      this.stage.syncCamera(cam);
      this.stage.aim(cam, sx, sy);
    }
    if (this.worldLayer.visible) for (const hit of this.stage.hits([...this.blocks.meshes(), ...this.sprites.meshes(), ...this.walls.meshes(), ...this.doors.meshes(), ...this.gates.meshes()])) {
      const block = this.blocks.cellOf(hit.object, hit.instanceId) ?? this.sprites.cellOf(hit) ?? this.walls.cellOf(hit.object, hit.instanceId) ?? this.doors.cellOf(hit) ?? this.gates.cellOf(hit);
      if (block) return { x: block.x, y: block.y, hasObject: true };
    }
    const cell = this.stage.groundCell();
    if (!cell) return { x: 0, y: 0, hasObject: false };
    return { x: cell.x, y: cell.y, hasObject: this.world.getObject(cell.x, cell.y) !== Block.AIR };
  }

  /** Mostra o número de um dano que entrou (chamado pelo jogo a cada acerto); desenhado na camada 2D. */
  /** Chão visto sob o ponto da tela: o cubo atingido (qualquer nível) ou o ladrilho do chão; árvores e objetos de sprite não contam. */
  pickGround(cam: Camera, sx: number, sy: number): { x: number; y: number } | null {
    if (this.disposed) return null;
    if (this.sanctuaryCameras && this.lastCameraPlayer) {
      this.sanctuaryCameras.sync(cam, this.lastCameraPlayer);
      this.sanctuaryCameras.aim(cam, sx, sy);
    } else {
      this.stage.syncCamera(cam);
      this.stage.aim(cam, sx, sy);
    }
    if (this.worldLayer.visible) {
      for (const hit of this.stage.hits(this.blocks.meshes())) {
        const block = this.blocks.cellOf(hit.object, hit.instanceId);
        if (block) return { x: block.x, y: block.y };
      }
    }
    return this.stage.groundCell();
  }

  addDamage(x: number, y: number, hit: Hit, target: 'enemy' | 'player'): void {
    this.damageNumbers.add(x, y, hit, target);
  }

  iconFor(id: BlockId): string {
    return this.textures.icons.get(id) ?? '';
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.sanctuaryCameras?.dispose();
    this.floor.dispose();
    this.blocks.dispose();
    this.sprites.dispose();
    this.fireFx.dispose();
    this.dust.dispose();
    this.leaves.dispose();
    this.water?.dispose();
    this.ripples?.dispose();
    this.fish?.dispose();
    this.chips.dispose();
    this.cracks.dispose();
    this.smoke.dispose();
    this.fx.dispose();
    this.prints.dispose();
    this.walls.dispose();
    this.doors.dispose();
    this.gates.dispose();
    this.groundFx.dispose();
    this.blockMaterials.dispose();
    this.actors.dispose();
    this.drops.dispose();
    this.ring.dispose();
    this.overlay.dispose();
    this.room.dispose();
    this.lighting.dispose();
    this.stage.dispose();
  }
}

