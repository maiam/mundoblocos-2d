import * as THREE from 'three';
import { partGeometry, type FazendaPart } from './fazenda';
import type { GrunhoPose } from '../titan/grunho';

/**
 * Grunho Casca-Rachada em caixas articuladas (ADR 0147): o mesmo esquema do modelo dos animais de fazenda (`fazenda.ts`: ficha de caixas com juntas em unidades de 1/16 de bloco, atlas UV
 * de 128 × 128 lido por frações de 64 × 64, frente = −Z, filtro vizinho mais próximo), com a hierarquia do goblin: corpo → pernas, braços (a clava no braço direito) e cabeça (orelhas, nariz).
 * A pose (pernas e braço esquerdo andando, braço da clava no golpe, cabeça) vem pura de `grunhoPose`.
 */
const PX = 1 / 16;
export interface GrunhoModels { textureSize: [number, number]; boxGeometryFaceOrder: string[]; mobs: { grunho: { parts: FazendaPart[] } } }
export interface GrunhoItem { x: number; y: number; z: number; yaw: number; pose: GrunhoPose }
interface Rig { group: THREE.Group; joints: Map<string, THREE.Group> }

export class GrunhoView {
  private readonly mat: THREE.MeshBasicMaterial;
  private readonly geos = new Map<string, THREE.BufferGeometry>();
  private readonly rests = new Map<string, [number, number, number]>();
  private readonly pool: Rig[] = [];

  constructor(private readonly scene: THREE.Scene, private readonly models: GrunhoModels, image: HTMLImageElement, patch: (m: THREE.MeshBasicMaterial) => void) {
    const tex = new THREE.Texture(image);
    tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.flipY = true; tex.needsUpdate = true;
    this.mat = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, alphaTest: 0.5, fog: true });
    patch(this.mat);
    for (const p of models.mobs.grunho.parts) { this.geos.set(p.id, partGeometry(p, models.boxGeometryFaceOrder, models.textureSize)); this.rests.set(p.id, p.restEulerRad); }
  }

  private make(): Rig {
    const group = new THREE.Group(), joints = new Map<string, THREE.Group>();
    for (const p of this.models.mobs.grunho.parts) {
      const j = new THREE.Group();
      j.position.set(p.pivotPx[0] * PX, p.pivotPx[1] * PX, p.pivotPx[2] * PX);
      j.rotation.set(...p.restEulerRad);
      const mesh = new THREE.Mesh(this.geos.get(p.id)!, this.mat);
      mesh.position.set(p.meshOffsetPx[0] * PX, p.meshOffsetPx[1] * PX, p.meshOffsetPx[2] * PX);
      mesh.frustumCulled = false;
      j.add(mesh);
      (p.parent ? joints.get(p.parent)! : group).add(j);
      joints.set(p.id, j);
    }
    this.scene.add(group);
    return { group, joints };
  }

  /** Desenha a lista (pés, giro e pose de cada goblin); o que sobra no pool some. */
  set(list: readonly GrunhoItem[]): void {
    list.forEach((it, i) => {
      const rig = this.pool[i] ?? (this.pool[i] = this.make());
      rig.group.visible = true;
      rig.group.position.set(it.x, it.y + it.pose.bob, it.z);
      rig.group.rotation.y = it.yaw;
      const set = (id: string, dx: number, dy: number, dz: number): void => { const j = rig.joints.get(id), r = this.rests.get(id); if (j && r) j.rotation.set(r[0] + dx, r[1] + dy, r[2] + dz); };
      set('perna_e', it.pose.legs[0], 0, 0); set('perna_d', it.pose.legs[1], 0, 0);
      set('braco_e', it.pose.armL, 0, 0); set('braco_d', it.pose.armR, 0, 0);
      set('cabeca', it.pose.headPitch, it.pose.headYaw, 0);
    });
    for (let i = list.length; i < this.pool.length; i++) this.pool[i].group.visible = false;
  }

  dispose(): void { for (const r of this.pool) this.scene.remove(r.group); }
}
