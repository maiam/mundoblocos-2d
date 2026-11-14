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
  /** Desenhado empilhado N vezes, um cubo (1 de altura) acima do outro (parede do labirinto: 2). Padrão 1. */
  stack?: number;
  /** Fator de tamanho do desenho em volta do meio da base (objetos que mantêm os pixels na grade fina, ADR 0032: árvores). Padrão 1. */
  scale?: number;
}
export interface SpriteCell {
  x: number;
  y: number;
  id: BlockId;
  sprite: SpriteArt;
  /** Altura (unidades de mundo) em que este exemplar do sprite está empilhado; 0 = no chão. */
  lift?: number;
  /** Fator de tamanho (`SpriteDraw.scale`); padrão 1. */
  scale?: number;
}
export interface ChunkSpritesOptions {
  /** Pixels por célula da arte (TILE). */
  tile: number;
  /** Fator vertical da vista (K): o que é vertical mostra K por unidade, então a altura do plano é dividida por K. */
  k: number;
  /** O que desenhar na célula (id do objeto do nível 0), ou null (vazia, cubo, parede: têm render próprio). */
  art(id: BlockId, x: number, y: number): SpriteDraw | null;
  maxBuildsPerFrame?: number;
  /** Objetos de chama viva (fogueira): a chama balança e pisca no próprio desenho (`FIRE_VERTEX`/`FIRE_FRAGMENT`). */
  animated?(id: BlockId): boolean;
}

/**
 * Chama que balança: o desenho da fogueira (toras e pedras embaixo, fogo em cima) é amostrado com a coordenada horizontal ondulando
 * tanto mais quanto mais alto o ponto, e os pixels de cor de fogo pulsam em brilho. Sem recorte do desenho: o mesmo sprite, só animado.
 */
const FIRE_FRAGMENT = `
#ifdef USE_MAP
vec2 fuv = vMapUv;
float fh = smoothstep(uFlameFrom, uFlameTo, vMapUv.y);
float fw = sin(uFireTime * 7.0 + vMapUv.y * 11.0) * 0.55 + sin(uFireTime * 12.3 + vMapUv.y * 19.0 + 1.7) * 0.45;
fuv.x += fw * 0.016 * fh;
fuv.y -= (0.5 + 0.5 * sin(uFireTime * 5.1)) * 0.018 * fh;
vec4 sampledDiffuseColor = texture2D(map, fuv);
diffuseColor *= sampledDiffuseColor;
float warm = smoothstep(0.1, 0.45, sampledDiffuseColor.r - sampledDiffuseColor.b) * smoothstep(0.35, 0.8, sampledDiffuseColor.r);
float pulse = 0.5 + 0.5 * sin(uFireTime * 9.0 + vMapUv.y * 5.0) * 0.6 + 0.5 * sin(uFireTime * 21.0) * 0.4;
diffuseColor.rgb *= 1.0 + warm * (pulse - 0.5) * 0.45;
#endif
`;

/**
 * Desempate de profundidade (z-fighting): planos de objetos vizinhos na MESMA linha ficam exatamente na mesma profundidade e, onde as
 * copas se sobrepõem, a GPU alterna entre um e outro em faixas. O 2D resolvia pela ordem de desenho (da esquerda para a direita:
 * quem está mais à direita fica por cima); aqui cada coluna avança um pouquinho para o lado do espectador, em ciclos de `SPRITE_BIAS_PERIOD`
 * colunas (só a ordem entre vizinhos importa; o salto do ciclo inverte a sobreposição em 1 de cada 64 colunas, quase nunca visível).
 * `SPRITE_BIAS_BASE` põe todos os objetos um pouco à frente das faces dos cubos, que estão no mesmo plano. Tudo menor que a meia altura do
 * pé do personagem (~0,14), para não esconder quem está logo ao sul.
 */
export const SPRITE_BIAS_BASE = 0.01;
export const SPRITE_BIAS_STEP = 0.0015;
export const SPRITE_BIAS_PERIOD = 64;
export function spriteDepthBias(x: number): number {
  return SPRITE_BIAS_BASE + (x & (SPRITE_BIAS_PERIOD - 1)) * SPRITE_BIAS_STEP;
}

interface Asset {
  texture: THREE.CanvasTexture;
  geometry: THREE.PlaneGeometry;
  solid: THREE.MeshBasicMaterial;
  soft: THREE.MeshBasicMaterial;
  fire?: THREE.MeshBasicMaterial;
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
  /** Tempo da chama (s), compartilhado pelos materiais animados. */
  private readonly fireUniforms = { uFireTime: { value: 0 }, uFlameFrom: { value: 0.3 }, uFlameTo: { value: 0.9 } };

  constructor(
    private readonly scene: THREE.Object3D,
    private readonly world: BlockWorld,
    private readonly opts: ChunkSpritesOptions,
  ) {}

  get count(): number { return this.builds.size; }

  /** Relógio da chama viva (chamar a cada quadro com o tempo decorrido). */
  setTime(elapsed: number): void { this.fireUniforms.uFireTime.value = elapsed; }

  private fireMaterial(a: Asset): THREE.MeshBasicMaterial {
    if (a.fire) return a.fire;
    const m = new THREE.MeshBasicMaterial({ map: a.texture, side: THREE.DoubleSide, alphaTest: 0.5 });
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.fireUniforms);
      shader.fragmentShader = shader.fragmentShader
        .replace('void main() {', 'uniform float uFireTime; uniform float uFlameFrom; uniform float uFlameTo;\nvoid main() {')
        .replace('#include <map_fragment>', FIRE_FRAGMENT);
    };
    a.fire = m;
    return m;
  }

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
    const buckets = new Map<HTMLCanvasElement, { sprite: SpriteArt; walkable: boolean; animated: boolean; cells: SpriteCell[] }>();
    const MAX_STACK_DRAWN = 4;
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const x = x0 + lx, y = y0 + ly;
        const id = this.world.getLevel(x, y, 0);
        const draw = this.opts.art(id, x, y);
        if (!draw) continue;
        let bucket = buckets.get(draw.sprite.canvas);
        if (!bucket) { bucket = { sprite: draw.sprite, walkable: draw.walkable, animated: !!this.opts.animated?.(id), cells: [] }; buckets.set(draw.sprite.canvas, bucket); }
        const scale = draw.scale && draw.scale !== 1 ? draw.scale : undefined;
        const n = Math.min(MAX_STACK_DRAWN, Math.max(1, Math.floor(draw.stack ?? 1)));
        for (let level = 0; level < n; level++) bucket.cells.push({ x, y, id, sprite: draw.sprite, lift: level, scale });
      }
    }
    const groups: Group[] = [];
    for (const { sprite, walkable, animated, cells } of buckets.values()) {
      const a = this.asset(sprite);
      const mesh = new THREE.InstancedMesh(a.geometry, animated ? this.fireMaterial(a) : walkable ? a.soft : a.solid, cells.length);
      mesh.name = `Mundo: objeto (chunk ${chunk.cx},${chunk.cy})`;
      cells.forEach((cell, i) => {
        // base do sprite = face sul da célula (oy + h = TILE na maioria dos objetos); canto esquerdo = ox
        // maior que 1: cresce em volta do meio da base (o tronco fica na célula)
        const sc = cell.scale ?? 1;
        this.dummy.position.set(cell.x + sprite.ox / tile - (sprite.w / tile / 2) * (sc - 1), cell.lift ?? 0, cell.y + (sprite.oy + sprite.h) / tile + spriteDepthBias(cell.x));
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.scale.set(sc, sc, 1);
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
    return cell && spriteHit(hit.point, cell, this.opts.tile, this.opts.k) ? cell : undefined;
  }

  dispose(): void {
    for (const b of this.builds.values()) this.release(b);
    this.builds.clear();
    for (const a of this.assets.values()) {
      a.geometry.dispose();
      a.solid.dispose();
      a.soft.dispose();
      a.fire?.dispose();
      a.texture.dispose();
    }
    this.assets.clear();
  }
}

/**
 * O ponto (mundo) atingido cai dentro do retângulo clicável (`hit`) do sprite da célula? Coordenadas do sprite: x em px a
 * partir do canto da célula; y a partir do canto superior da célula, com a base do sprite em `oy + h` e cada unidade de
 * altura valendo `tile × k` px.
 */
export function spriteHit(point: { x: number; y: number }, cell: { x: number; sprite: SpriteArt; lift?: number; scale?: number }, tile: number, k: number): boolean {
  const s = cell.sprite;
  const sc = cell.scale ?? 1;
  // volta ao desenho sem ampliação: o ponto é desfeito em volta do meio da base
  const cx = (s.ox + s.w / 2) / tile;
  const bx = sc === 1 ? point.x : cell.x + cx + (point.x - cell.x - cx) / sc;
  const h = point.y - (cell.lift ?? 0);
  const by = sc === 1 ? h : h / sc;
  const px = (bx - cell.x) * tile;
  const py = s.oy + s.h - by * tile * k;
  const r = s.hit;
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}
