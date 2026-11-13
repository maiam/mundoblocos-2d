import * as THREE from 'three';
import { CHUNK_SIZE } from '../../config';
import type { BlockId } from '../../world/blocks';
import type { Chunk } from '../../world/chunk';
import type { ChunkRect } from '../../world/world';
import type { BlockWorld } from './chunkBlocks';

/** Sprite 2D de um objeto: o mesmo formato do `Sprite` do 2D (canto superior esquerdo em (ox, oy) a partir do canto da célula, px). */
export interface SpriteArt {
  canvas: HTMLCanvasElement;
  ox: number;
  oy: number;
  w: number;
  h: number;
  /** Retângulo clicável relativo ao canto da célula (px). */
  hit: { x: number; y: number; w: number; h: number };
}
export interface SpriteDraw {
  sprite: SpriteArt;
  /** Dá para andar por cima (grama, flor, cultura, porta aberta): não esconde o personagem. */
  walkable: boolean;
}
export interface SpriteCell { x: number; y: number; id: BlockId; sprite: SpriteArt }
export interface ChunkSpritesOptions {
  /** Pixels por célula da arte (TILE). */
  tile: number;
  /** Fator vertical da vista (K): o que é vertical mostra K por unidade, então a altura do plano é dividida por K. */
  k: number;
  /** O que desenhar na célula (id do objeto do nível 0), ou null (vazia, cubo, parede: têm render próprio). */
  art(id: BlockId, x: number, y: number): SpriteDraw | null;
  maxBuildsPerFrame?: number;
}

interface Asset {
  texture: THREE.CanvasTexture;
  geometry: THREE.PlaneGeometry;
  solid: THREE.MeshBasicMaterial;
  soft: THREE.MeshBasicMaterial;
}
interface Group { mesh: THREE.InstancedMesh; cells: SpriteCell[] }
interface Build { version: number; groups: Group[] }

/**
 * Objetos altos do Mundo no 3D (ADR 0031, M2.3): árvores, pedras, cultura, enfeites, portas, cercas, baú, cidade… Cada sprite 2D
 * vira um plano vertical com a base na face sul da célula (mesma âncora do 2D) e o tamanho em células da arte (sem o fator do
 * personagem: o mundo mantém a escala em células; só o personagem encolhe, ADR 0028). Instanciado por chunk e por sprite,
 * reconstruído só quando `chunk.version` muda (com orçamento por quadro). Objetos sólidos usam `alphaTest` e escrevem
 * profundidade (o personagem some atrás deles); os de passar por cima não escrevem, para nunca cobrir o personagem.
 */
export class ChunkSprites {
  private readonly builds = new Map<string, Build>();
  private readonly assets = new Map<HTMLCanvasElement, Asset>();
  private readonly dummy = new THREE.Object3D();
  private generation = 0;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly world: BlockWorld,
    private readonly opts: ChunkSpritesOptions,
  ) {}

  get count(): number { return this.builds.size; }

  /** Chegou arte nova (cultura, dungeon): refaz os planos e reenvia as texturas. */
  invalidateAll(): void {
    this.generation++;
    for (const a of this.assets.values()) a.texture.needsUpdate = true;
  }

  /** Contexto restaurado: reenvia as texturas. */
  reupload(): void {
    for (const a of this.assets.values()) a.texture.needsUpdate = true;
  }

  update(rect: ChunkRect): void {
    let budget = this.opts.maxBuildsPerFrame ?? 2;
    const keep = new Set<string>();
    for (let cy = rect.cy0; cy <= rect.cy1; cy++) {
      for (let cx = rect.cx0; cx <= rect.cx1; cx++) {
        const chunk = this.world.getChunk(cx, cy);
        if (!chunk) continue;
        const key = cx + ',' + cy;
        keep.add(key);
        const old = this.builds.get(key);
        const stamp = chunk.version * 1000 + this.generation;
        if (old && old.version === stamp) continue;
        if (budget <= 0) continue;
        budget--;
        if (old) this.release(old);
        this.builds.set(key, this.build(chunk, stamp));
      }
    }
    for (const [key, build] of this.builds) {
      if (keep.has(key)) continue;
      this.release(build);
      this.builds.delete(key);
    }
  }

  private asset(sprite: SpriteArt): Asset {
    let a = this.assets.get(sprite.canvas);
    if (a) return a;
    const { tile, k } = this.opts;
    const wc = sprite.w / tile;
    const hc = sprite.h / tile / k;
    const geometry = new THREE.PlaneGeometry(wc, hc);
    geometry.translate(wc / 2, hc / 2, 0); // origem no canto inferior esquerdo do sprite
    const texture = new THREE.CanvasTexture(sprite.canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    const common = { map: texture, side: THREE.DoubleSide } as const;
    a = {
      texture, geometry,
      solid: new THREE.MeshBasicMaterial({ ...common, alphaTest: 0.5 }),
      soft: new THREE.MeshBasicMaterial({ ...common, transparent: true, depthWrite: false, alphaTest: 0.01 }),
    };
    this.assets.set(sprite.canvas, a);
    return a;
  }

  private build(chunk: Chunk, stamp: number): Build {
    const x0 = chunk.cx * CHUNK_SIZE;
    const y0 = chunk.cy * CHUNK_SIZE;
    const { tile } = this.opts;
    const buckets = new Map<HTMLCanvasElement, { sprite: SpriteArt; walkable: boolean; cells: SpriteCell[] }>();
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const x = x0 + lx, y = y0 + ly;
        const id = this.world.getLevel(x, y, 0);
        const draw = this.opts.art(id, x, y);
        if (!draw) continue;
        let bucket = buckets.get(draw.sprite.canvas);
        if (!bucket) { bucket = { sprite: draw.sprite, walkable: draw.walkable, cells: [] }; buckets.set(draw.sprite.canvas, bucket); }
        bucket.cells.push({ x, y, id, sprite: draw.sprite });
      }
    }
    const groups: Group[] = [];
    for (const { sprite, walkable, cells } of buckets.values()) {
      const a = this.asset(sprite);
      const mesh = new THREE.InstancedMesh(a.geometry, walkable ? a.soft : a.solid, cells.length);
      mesh.name = `Mundo: objeto (chunk ${chunk.cx},${chunk.cy})`;
      cells.forEach((cell, i) => {
        // base do sprite = face sul da célula (oy + h = TILE na maioria dos objetos); canto esquerdo = ox
        this.dummy.position.set(cell.x + sprite.ox / tile, 0, cell.y + (sprite.oy + sprite.h) / tile);
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.scale.set(1, 1, 1);
        this.dummy.updateMatrix();
        mesh.setMatrixAt(i, this.dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      mesh.userData.cells = cells;
      this.scene.add(mesh);
      groups.push({ mesh, cells });
    }
    return { version: stamp, groups };
  }

  private release(build: Build): void {
    for (const g of build.groups) {
      this.scene.remove(g.mesh);
      g.mesh.dispose();
    }
  }

  /** Malhas clicáveis (para o `pick`). */
  meshes(): THREE.InstancedMesh[] {
    const out: THREE.InstancedMesh[] = [];
    for (const b of this.builds.values()) for (const g of b.groups) out.push(g.mesh);
    return out;
  }

  /**
   * Célula do objeto atingido pelo raio, só se o ponto cai dentro do retângulo clicável do sprite (`hit`): o plano inclui
   * áreas transparentes e não lemos pixels. Coordenadas do sprite: x em px a partir do canto da célula; y a partir do
   * canto superior da célula, com a base do sprite em `oy + h` e cada unidade de altura valendo `tile × k` px.
   */
  cellOf(hit: THREE.Intersection): SpriteCell | undefined {
    const cell = (hit.object.userData.cells as SpriteCell[] | undefined)?.[hit.instanceId ?? -1];
    if (!cell) return undefined;
    const { tile, k } = this.opts;
    const s = cell.sprite;
    const px = (hit.point.x - cell.x) * tile;
    const py = s.oy + s.h - hit.point.y * tile * k;
    const r = s.hit;
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h ? cell : undefined;
  }

  dispose(): void {
    for (const b of this.builds.values()) this.release(b);
    this.builds.clear();
    for (const a of this.assets.values()) {
      a.geometry.dispose();
      a.solid.dispose();
      a.soft.dispose();
      a.texture.dispose();
    }
    this.assets.clear();
  }
}
