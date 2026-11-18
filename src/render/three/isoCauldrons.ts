import * as THREE from 'three';
import { CHUNK_SIZE } from '../../config';
import { Block, type BlockId } from '../../world/blocks';
import type { Chunk } from '../../world/chunk';
import type { ChunkRect } from '../../world/world';

/** A malha do caldeirão (`scripts/extract-iso-cauldron.py`): posições [x, y, z, …] em células (y para cima, base em 0, centrada) e índices dos triângulos. */
export interface IsoCauldronModel { positions: number[]; indices: number[] }

export interface IsoCauldronWorld {
  getChunk(cx: number, cy: number): Chunk | null | undefined;
  getLevel(x: number, y: number, level: number): BlockId;
}

/**
 * Fator de tamanho do desenho (pedido do dono do produto, 18/11/2026: metade do tamanho do personagem). A malha tem 1,05 célula de largura e 143 px de altura
 * na tela; a Deusa (do halo aos pés) tem 371 px na mesma câmera, então metade = 185 px = 1,3×.
 */
export const CAULDRON_SCALE = 1.3;
/** Unidades da malha cobertas por UMA repetição da textura de pedra (a UV é projetada pela posição, então não há costura); rachaduras finas, de objeto pequeno. */
const TEX_CELLS = 0.4;
/** Giro (rad) do caldeirão: as alças ficam nos lados da tela na câmera isométrica. */
const YAW = Math.PI / 4;

interface Entry { x: number; y: number; level: number; mesh: THREE.Mesh }

/**
 * Caldeirão de Pedra como **malha 3D** no Santuário isométrico (v0.93.149): o modelo do dono do produto (Blender, 2757 quadriláteros) com a textura da Pedra
 * Rachada do Mundo, no lugar do sprite 3/4 do Mundo. As regras (estação de cozinha, luz) continuam no `World`/`lighting`; aqui é só aparência. Os chunks são
 * varridos quando `chunk.version` muda; cada caldeirão sobe `nível` células (em cima do terreno em camadas).
 */
export class IsoCauldrons {
  private readonly lists = new Map<string, { version: number; entries: Entry[] }>();
  private readonly geometry: THREE.BufferGeometry;
  private material: THREE.MeshBasicMaterial | null = null;
  private texture: THREE.CanvasTexture | null = null;
  private pickables: THREE.Mesh[] = [];
  private dirty = true;

  constructor(private readonly scene: THREE.Object3D, private readonly world: IsoCauldronWorld, model: IsoCauldronModel, private readonly stone: () => HTMLCanvasElement | undefined) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(model.positions, 3));
    g.setIndex(model.indices);
    g.computeVertexNormals(); // suaves (vértices compartilhados) — antes de separar os triângulos
    const flat = g.toNonIndexed();
    g.dispose();
    const p = flat.getAttribute('position') as THREE.BufferAttribute;
    const n = flat.getAttribute('normal') as THREE.BufferAttribute;
    const uv = new Float32Array(p.count * 2);
    const fn = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let t = 0; t < p.count; t += 3) {
      // projeção em caixa: o eixo dominante da face decide o plano (pedra sem costura visível)
      a.fromBufferAttribute(p, t); b.fromBufferAttribute(p, t + 1); c.fromBufferAttribute(p, t + 2);
      fn.subVectors(b, a).cross(c.sub(a));
      const ax = Math.abs(fn.x), ay = Math.abs(fn.y), az = Math.abs(fn.z);
      for (let i = 0; i < 3; i++) {
        const x = p.getX(t + i), y = p.getY(t + i), z = p.getZ(t + i);
        const [u, v] = ay >= ax && ay >= az ? [x, z] : ax >= az ? [z, y] : [x, y];
        uv[(t + i) * 2] = u / TEX_CELLS;
        uv[(t + i) * 2 + 1] = v / TEX_CELLS;
      }
    }
    // A cena do Santuário não tem luzes (os cubos são `MeshBasicMaterial`): o relevo vem do sombreado fixo por normal, de cima e da esquerda da câmera.
    const light = new THREE.Vector3(-0.35, 0.85, 0.4).normalize();
    const col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const k = 0.5 + 0.5 * Math.max(0, n.getX(i) * light.x + n.getY(i) * light.y + n.getZ(i) * light.z);
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k;
    }
    flat.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    flat.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.geometry = flat;
  }

  private materialFor(): THREE.MeshBasicMaterial {
    if (this.material) return this.material;
    const canvas = this.stone();
    if (canvas) {
      this.texture = new THREE.CanvasTexture(canvas);
      this.texture.colorSpace = THREE.SRGBColorSpace;
      this.texture.wrapS = this.texture.wrapT = THREE.RepeatWrapping;
      this.texture.anisotropy = 4;
    }
    this.material = new THREE.MeshBasicMaterial(this.texture ? { map: this.texture, vertexColors: true } : { color: '#b9a58c', vertexColors: true });
    return this.material;
  }

  private make(x: number, y: number, level: number): Entry {
    const mesh = new THREE.Mesh(this.geometry, this.materialFor());
    mesh.position.set(x + 0.5, level, y + 0.5);
    mesh.rotation.y = YAW;
    mesh.scale.setScalar(CAULDRON_SCALE);
    mesh.name = 'Santuário: caldeirão 3D';
    mesh.userData.cell = { x, y };
    this.scene.add(mesh);
    return { x, y, level, mesh };
  }

  update(rect: ChunkRect): void {
    const keep = new Set<string>();
    for (let cy = rect.cy0; cy <= rect.cy1; cy++) {
      for (let cx = rect.cx0; cx <= rect.cx1; cx++) {
        const chunk = this.world.getChunk(cx, cy);
        if (!chunk) continue;
        const key = cx + ',' + cy;
        keep.add(key);
        const old = this.lists.get(key);
        if (old && old.version === chunk.version) continue;
        if (old) for (const e of old.entries) this.scene.remove(e.mesh);
        const entries: Entry[] = [];
        for (let ly = 0; ly < CHUNK_SIZE; ly++) {
          for (let lx = 0; lx < CHUNK_SIZE; lx++) {
            const x = cx * CHUNK_SIZE + lx, y = cy * CHUNK_SIZE + ly;
            for (let level = 0; level < chunk.levels.length; level++) {
              if (this.world.getLevel(x, y, level) !== Block.CAULDRON) continue;
              entries.push(this.make(x, y, level));
              break;
            }
          }
        }
        this.lists.set(key, { version: chunk.version, entries });
        this.dirty = true;
      }
    }
    for (const [key, list] of this.lists) {
      if (keep.has(key)) continue;
      for (const e of list.entries) this.scene.remove(e.mesh);
      this.lists.delete(key);
      this.dirty = true;
    }
    if (this.dirty) {
      this.pickables = [...this.lists.values()].flatMap((l) => l.entries.map((e) => e.mesh));
      this.dirty = false;
    }
  }

  /** Malhas para o raio de seleção (cada uma leva `userData.cell`). */
  meshes(): THREE.Mesh[] { return this.pickables; }

  cellOf(object: THREE.Object3D): { x: number; y: number } | undefined {
    return object.userData.cell as { x: number; y: number } | undefined;
  }

  get count(): number { return this.pickables.length; }

  dispose(): void {
    for (const l of this.lists.values()) for (const e of l.entries) this.scene.remove(e.mesh);
    this.lists.clear();
    this.geometry.dispose();
    this.material?.dispose();
    this.texture?.dispose();
  }
}
