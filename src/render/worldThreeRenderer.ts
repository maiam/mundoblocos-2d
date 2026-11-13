import * as THREE from 'three';
import { TILE } from '../config';
import type { Camera } from '../game/camera';
import { ActorSprites } from './character';
import type { RenderOptions } from './renderer';
import type { GameRenderer, RendererStats } from './rendererContract';
import { ChunkRenderer } from './chunkRenderer';
import { addDungeonTextures, createBlockTextures, type BlockTextures } from './textures';
import { loadDungeonArt } from './blockArt';
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
import { worldBlockFaces } from './worldBlockFaces';
import { classifySanctuaryBlock, sanctuaryBlockTransform } from './sanctuaryThreeLayout';

/** Folha do personagem pintada em um canvas 256 × 320 (pé embaixo, ao centro), usado como textura do plano vertical. */
const BILLBOARD = { width: 256, height: 320, drawX: 128, groundY: 320, zoom: 3 } as const;
/** Margem de chunks além da tela: a vista oblíqua mostra mais ao sul/norte do que a antiga. */
const FLOOR_MARGIN = 1;

/**
 * Render do Mundo principal em 2.5D (ADR 0031, M2 — **em construção**; só em desenvolvimento, `?render=3d`).
 * Fatias atuais: M2.1 chão por chunk (textura do `ChunkRenderer`) + o personagem em plano vertical + realces; M2.2 cubos
 * (`ChunkBlocks`, frente quadrada provisória, paredes finas) + pick nos cubos. Ainda **não** desenha árvores, objetos, cidade, atores além do jogador, itens, luz nem efeitos
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
  private readonly blockMaterials: BlockMaterials;
  private readonly actorSprites = new ActorSprites();
  private readonly actorCanvas = document.createElement('canvas');
  private readonly actorContext: CanvasRenderingContext2D;
  private readonly actorTexture: THREE.CanvasTexture;
  private readonly billboard: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly shadow: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, private readonly world: World) {
    this.stage = new ThreeStage(canvas, 'oblique', world.profile.sky[0], () => {
      this.actorTexture.needsUpdate = true;
      this.floor.reupload();
      this.blockMaterials?.reupload();
    });
    this.textures = createBlockTextures({ town: !!world.town });
    this.chunks = new ChunkRenderer(world, this.textures);
    // Arte da dungeon em segundo plano (como no 2D): quando chega, o chão é repintado.
    void loadDungeonArt().then((d) => { if (!this.disposed && d && addDungeonTextures(this.textures)) this.chunks.invalidateAll(); });
    this.floor = new ChunkFloor(this.stage.scene, world, this.chunks);
    this.selection = new SelectionMarkers(this.stage.scene, world);
    this.blockMaterials = new BlockMaterials('oblique', worldBlockFaces(this.textures), this.stage.gpu);
    this.blocks = new ChunkBlocks(this.stage.scene, world, {
      isCube: (id) => blockDef(id).shape === 'cube',
      classify: (w, id, x, y, level) => classifySanctuaryBlock(w, id, x, y, level),
      transform: (cell) => sanctuaryBlockTransform(cell),
      material: (id) => this.blockMaterials.get(id).block,
    });

    this.actorCanvas.width = BILLBOARD.width;
    this.actorCanvas.height = BILLBOARD.height;
    const ctx = this.actorCanvas.getContext('2d');
    if (!ctx) throw new Error('Canvas auxiliar do personagem indisponível');
    this.actorContext = ctx;
    this.actorTexture = new THREE.CanvasTexture(this.actorCanvas);
    this.actorTexture.colorSpace = THREE.SRGBColorSpace;
    this.actorTexture.minFilter = THREE.LinearFilter;
    // Plano vertical (nunca `THREE.Sprite`, que inclina com a câmera), com a origem nos pés. O plano cobre a tela do canvas
    // em células (zoom 3 × TILE) e leva o fator de escala do mundo (ADR 0028); na vista oblíqua o que é vertical mostra
    // K por unidade, então a altura é dividida por K.
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.translate(0, 0.5, 0);
    this.billboard = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
      map: this.actorTexture, transparent: true, depthTest: true, depthWrite: false, alphaTest: 0.015, side: THREE.DoubleSide,
    }));
    const cellsW = BILLBOARD.width / (BILLBOARD.zoom * TILE);
    const cellsH = BILLBOARD.height / (BILLBOARD.zoom * TILE);
    this.billboard.scale.set(cellsW * CHARACTER_SCALE_FACTOR, cellsH * CHARACTER_SCALE_FACTOR / OBLIQUE_K, 1);
    this.billboard.renderOrder = 3;
    const shadowGeometry = new THREE.CircleGeometry(1, 32);
    shadowGeometry.rotateX(-Math.PI / 2);
    this.shadow = new THREE.Mesh(shadowGeometry, new THREE.MeshBasicMaterial({
      color: 0x241648, transparent: true, opacity: 0.22, depthTest: true, depthWrite: false, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -2,
    }));
    this.shadow.renderOrder = 1;
    this.stage.scene.add(this.shadow);
    this.stage.scene.add(this.billboard);
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
    this.drawPlayer(opts);
    this.selection.update(opts);
    this.stage.render();
  }

  /** O personagem do jogador (primeiro ator): a folha 2D atual num plano vertical, com sombra no chão. */
  private drawPlayer(opts: RenderOptions): void {
    const a = opts.actors[0];
    this.billboard.visible = this.shadow.visible = !!a;
    if (!a) return;
    const sheet = this.actorSprites.get(a.kind);
    this.actorContext.clearRect(0, 0, BILLBOARD.width, BILLBOARD.height);
    sheet.draw(this.actorContext, BILLBOARD.drawX, BILLBOARD.groundY, BILLBOARD.zoom, a, opts.elapsed, false);
    this.actorTexture.needsUpdate = true;
    this.billboard.position.set(a.x, a.visualZ + 0.03, a.y);
    this.shadow.position.set(a.x, a.visualZ + 0.018, a.y);
    this.shadow.scale.set(sheet.shadowRadii[0], 1, sheet.shadowRadii[1]);
  }

  pick(cam: Camera, sx: number, sy: number): { x: number; y: number; hasObject: boolean } {
    if (this.disposed) return { x: 0, y: 0, hasObject: false };
    this.stage.syncCamera(cam);
    this.stage.aim(cam, sx, sy);
    for (const hit of this.stage.hits(this.blocks.meshes())) {
      const block = this.blocks.cellOf(hit.object, hit.instanceId);
      if (block) return { x: block.x, y: block.y, hasObject: true };
    }
    const cell = this.stage.groundCell();
    if (!cell) return { x: 0, y: 0, hasObject: false };
    return { x: cell.x, y: cell.y, hasObject: this.world.getObject(cell.x, cell.y) !== Block.AIR };
  }

  addDamage(_x: number, _y: number, _hit: Hit, _target: 'enemy' | 'player'): void {
    // M3: números de dano em camada 2D sobre o canvas 3D.
  }

  iconFor(id: BlockId): string {
    return this.textures.icons.get(id) ?? '';
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.floor.dispose();
    this.blocks.dispose();
    this.blockMaterials.dispose();
    this.selection.dispose();
    this.billboard.geometry.dispose();
    this.billboard.material.dispose();
    this.shadow.geometry.dispose();
    this.shadow.material.dispose();
    this.actorTexture.dispose();
    this.stage.dispose();
  }
}

