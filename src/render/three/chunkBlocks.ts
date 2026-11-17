import * as THREE from 'three';
import { CHUNK_SIZE, MAX_STACK } from '../../config';
import type { BlockId } from '../../world/blocks';
import type { Chunk } from '../../world/chunk';
import type { ChunkRect } from '../../world/world';

/** Uma caixa desenhada: `level` = nível da base e `n` = quantos níveis seguidos do mesmo bloco ela cobre (sequência da coluna; 1 sem `levelsPerCube`). */
export interface BlockCell { x: number; y: number; level: number; id: BlockId; n?: number }
export type CubeShape = 'solid' | 'thin';
export interface BlockWorld {
  getChunk(cx: number, cy: number): Chunk | null | undefined;
  getLevel(x: number, y: number, level: number): BlockId;
}
export interface ChunkBlocksOptions {
  /** O bloco é um cubo desenhado aqui (objetos altos, árvores etc. têm render próprio). */
  isCube(id: BlockId): boolean;
  /** `solid` (cubo cheio) ou `thin` (placa de meia profundidade, parede horizontal de construção). */
  classify(world: BlockWorld, id: BlockId, x: number, y: number, level: number): CubeShape;
  /**
   * Quantos níveis valem 1 célula de altura (4 no Mundo: blocos de 1/4). Com mais de 1, blocos iguais seguidos na coluna viram uma caixa só
   * (`stackGeometry`) e o `transform` recebe `n`. Padrão 1: um cubo por nível, como antes.
   */
  levelsPerCube?: number;
  /** Posição do centro da caixa em unidades de mundo. */
  transform(cell: { x: number; y: number; level: number; shape: CubeShape; n: number }): { x: number; y: number; z: number };
  /** Materiais do bloco por face do `BoxGeometry`. */
  material(id: BlockId): THREE.Material[];
  /**
   * Id usado só para ESCOLHER O MATERIAL da célula (agrupamento e `material`): permite peças diferentes para o mesmo bloco, conforme os vizinhos (Rio das Fadas,
   * ADR 0036). `cell.id` continua o do mapa. Padrão: o próprio id.
   */
  variant?(world: BlockWorld, id: BlockId, x: number, y: number, level: number): BlockId;
  /** Reconstruções de chunk por quadro. */
  maxBuildsPerFrame?: number;
}

/**
 * Caixa de uma sequência de `n` blocos de 1/4 que começa no nível `base` de uma pilha de `levels` níveis por cubo (ADR 0033): altura
 * `n / levels`, largura e fundo 1. Tudo é RECORTE da textura, nunca esticado — as faces laterais usam a faixa do cubo que a sequência
 * ocupa (v de `base / levels` a `(base + n) / levels`, de baixo para cima), então 4 blocos iguais na coluna são exatamente o cubo de
 * antes; o topo e a base seguem inteiros.
 */
export function stackGeometry(base: number, n: number, levels: number): THREE.BoxGeometry {
  const g = new THREE.BoxGeometry(1, n / levels, 1);
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  // Ordem das faces do BoxGeometry: +X, −X, +Y (topo), −Y (base), +Z, −Z; 4 vértices cada.
  for (const face of [0, 1, 4, 5]) {
    for (let i = face * 4; i < face * 4 + 4; i++) uv.setY(i, base / levels + uv.getY(i) * (n / levels));
  }
  uv.needsUpdate = true;
  return g;
}

interface Group { mesh: THREE.InstancedMesh; cells: BlockCell[] }
interface Build { version: number; groups: Group[] }

/**
 * Cubos do Mundo no 3D (ADR 0031, M2.2): por chunk visível, uma malha instanciada por (bloco, forma), reconstruída só quando
 * `chunk.version` muda (o `World` já avisa os chunks vizinhos nas bordas), com orçamento de reconstruções por quadro (enquanto
 * isso, a versão antiga continua na tela) e liberação dos chunks fora da área. Cada malha guarda as células para o `pick`.
 */
export class ChunkBlocks {
  private readonly builds = new Map<string, Build>();
  private readonly solid = new THREE.BoxGeometry(1, 1, 1);
  private readonly thin = new THREE.BoxGeometry(1, 1, 0.5);
  /** Geometrias das sequências por (base, n): no máximo 10 com 4 níveis. */
  private readonly stacks = new Map<string, THREE.BoxGeometry>();

  private stackFor(base: number, n: number, levels: number): THREE.BoxGeometry {
    const key = base + ':' + n;
    let g = this.stacks.get(key);
    if (!g) { g = stackGeometry(base, n, levels); this.stacks.set(key, g); }
    return g;
  }
  private readonly dummy = new THREE.Object3D();

  constructor(
    private readonly scene: THREE.Object3D,
    private readonly world: BlockWorld,
    private readonly opts: ChunkBlocksOptions,
  ) {}

  get count(): number { return this.builds.size; }

  /** Instância tremendo agora: onde está e a matriz original, para devolver. */
  private shaken: { mesh: THREE.InstancedMesh; index: number; original: THREE.Matrix4 } | null = null;

  /**
   * Treme o bloco mais alto da célula (x, y) (a quebra em andamento): desloca a instância por (dx, dy, dz) células; `null` devolve o bloco ao
   * lugar. Uma célula por vez. Se o chunk for refeito no meio, a instância nova já nasce no lugar certo.
   */
  setShake(cell: { x: number; y: number } | null, off: { dx: number; dy: number; dz: number } = { dx: 0, dy: 0, dz: 0 }): boolean {
    const cur = this.shaken;
    if (cur && cur.mesh.parent) {
      // a mesma instância (se a célula é a mesma) só muda o deslocamento; senão devolve a anterior
      const cells = cur.mesh.userData.cells as BlockCell[] | undefined;
      const c = cells?.[cur.index];
      if (!cell || !c || c.x !== cell.x || c.y !== cell.y) { cur.mesh.setMatrixAt(cur.index, cur.original); cur.mesh.instanceMatrix.needsUpdate = true; this.shaken = null; }
    } else if (cur) this.shaken = null; // o chunk saiu da cena
    if (!cell) return false;
    if (!this.shaken) {
      const build = this.builds.get(Math.floor(cell.x / CHUNK_SIZE) + ',' + Math.floor(cell.y / CHUNK_SIZE));
      if (!build) return false;
      let best: { mesh: THREE.InstancedMesh; index: number; top: number } | null = null;
      for (const g of build.groups) {
        g.cells.forEach((c, index) => {
          if (c.x !== cell.x || c.y !== cell.y) return;
          const top = c.level + (c.n ?? 1);
          if (!best || top > best.top) best = { mesh: g.mesh, index, top };
        });
      }
      if (!best) return false;
      const b = best as { mesh: THREE.InstancedMesh; index: number; top: number };
      const original = new THREE.Matrix4();
      b.mesh.getMatrixAt(b.index, original);
      this.shaken = { mesh: b.mesh, index: b.index, original };
    }
    const s = this.shaken;
    this.dummy.matrix.copy(s.original);
    const e = this.dummy.matrix.elements;
    e[12] += off.dx; e[13] += off.dy; e[14] += off.dz;
    s.mesh.setMatrixAt(s.index, this.dummy.matrix);
    s.mesh.instanceMatrix.needsUpdate = true;
    return true;
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
        if (old && old.version === chunk.version) continue;
        if (budget <= 0) continue;
        budget--;
        if (old) this.release(old);
        this.builds.set(key, this.build(chunk));
      }
    }
    for (const [key, build] of this.builds) {
      if (keep.has(key)) continue;
      this.release(build);
      this.builds.delete(key);
    }
  }

  private build(chunk: Chunk): Build {
    const x0 = chunk.cx * CHUNK_SIZE;
    const y0 = chunk.cy * CHUNK_SIZE;
    const Q = this.opts.levelsPerCube ?? 1;
    const levels = Math.max(MAX_STACK, chunk.levels?.length ?? 0);
    const buckets = new Map<string, { id: BlockId; shape: CubeShape; base: number; n: number; cells: BlockCell[] }>();
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const x = x0 + lx, y = y0 + ly;
        for (let level = 0; level < levels; level++) {
          const id = this.world.getLevel(x, y, level);
          if (!this.opts.isCube(id)) continue;
          const shape = this.opts.classify(this.world, id, x, y, level);
          // Com blocos de 1/4 (`Q > 1`): blocos iguais seguidos na coluna viram UMA caixa (menos instâncias, textura contínua).
          let n = 1;
          if (Q > 1) while (level + n < levels && this.world.getLevel(x, y, level + n) === id) n++;
          const base = Q > 1 ? level : 0;
          const drawId = this.opts.variant ? this.opts.variant(this.world, id, x, y, level) : id;
          const key = drawId + ':' + shape + ':' + base + ':' + n;
          let bucket = buckets.get(key);
          if (!bucket) { bucket = { id: drawId, shape, base, n, cells: [] }; buckets.set(key, bucket); }
          bucket.cells.push({ x, y, level, id, n });
          level += n - 1;
        }
      }
    }
    const groups: Group[] = [];
    for (const { id, shape, base, n, cells } of buckets.values()) {
      const geometry = shape === 'thin' ? this.thin : Q > 1 ? this.stackFor(base, n, Q) : this.solid;
      const mesh = new THREE.InstancedMesh(geometry, this.opts.material(id), cells.length);
      mesh.name = `Mundo: cubo ${id} ${shape}${Q > 1 ? ` ${n}/${Q}@${base}` : ''} (chunk ${chunk.cx},${chunk.cy})`;
      cells.forEach((cell, i) => {
        const t = this.opts.transform({ x: cell.x, y: cell.y, level: cell.level, shape, n });
        this.dummy.position.set(t.x, t.y, t.z);
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
    return { version: chunk.version, groups };
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

  /** Célula de uma instância atingida pelo raio, ou undefined se a malha não é nossa. */
  cellOf(object: THREE.Object3D, instanceId: number | undefined): BlockCell | undefined {
    return (object.userData.cells as BlockCell[] | undefined)?.[instanceId ?? -1];
  }

  dispose(): void {
    for (const b of this.builds.values()) this.release(b);
    this.builds.clear();
    this.solid.dispose();
    this.thin.dispose();
    for (const g of this.stacks.values()) g.dispose();
    this.stacks.clear();
  }
}
