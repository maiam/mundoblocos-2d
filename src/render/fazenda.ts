import * as THREE from 'three';
import type { FaunaKind, FaunaPose } from '../titan/fauna';

/**
 * Fauna de fazenda do Orvalis (ADR 0124): modelos em **caixas articuladas** do pacote Mobs64px (`fazenda-modelos.json`: tamanho, pivô, deslocamento e UV de cada parte; frente = −Z, 16 unidades
 * por bloco). Um atlas UV de 64 × 64 por animal, sempre com filtro vizinho mais próximo. A geometria e a textura são compartilhadas; cada animal tem a sua hierarquia de juntas, animada pela
 * `FaunaPose` pura (pernas, cabeça, asas). Sem rig, sem GLB. Luz do dia pelo mesmo `patchDayLight` do resto (atributos `color` e `glow`).
 */
export interface FazendaPart {
  id: string;
  parent: string | null;
  sizePx: [number, number, number];
  pivotPx: [number, number, number];
  meshOffsetPx: [number, number, number];
  restEulerRad: [number, number, number];
  uvPx: Record<'+X' | '-X' | '+Y' | '-Y' | '+Z' | '-Z', [number, number, number, number]>;
}
export interface FazendaModels { textureSize: [number, number]; boxGeometryFaceOrder: string[]; mobs: Record<string, { parts: FazendaPart[] }> }
export interface FazendaItem { kind: FaunaKind; x: number; y: number; z: number; yaw: number; pose: FaunaPose }

interface Rig { group: THREE.Group; joints: Map<string, THREE.Group> }
const PX = 1 / 16;

/** Geometria de uma parte: `BoxGeometry` com os retângulos UV do pacote (x, y, largura, altura em px, do canto superior esquerdo) e os atributos `color`/`glow` que o shader do dia lê. */
export function partGeometry(p: FazendaPart, order: readonly string[], size: readonly [number, number]): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(p.sizePx[0] * PX, p.sizePx[1] * PX, p.sizePx[2] * PX);
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  order.forEach((face, fi) => {
    const [x, y, w, h] = p.uvPx[face as keyof FazendaPart['uvPx']];
    for (let a = fi * 4; a < fi * 4 + 4; a++) uv.setXY(a, (x + uv.getX(a) * w) / size[0], 1 - (y + (1 - uv.getY(a)) * h) / size[1]);
  });
  uv.needsUpdate = true;
  const n = g.getAttribute('position').count;
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
  g.setAttribute('glow', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  return g;
}

export class FazendaView {
  private readonly mats = {} as Record<FaunaKind, THREE.MeshBasicMaterial>;
  private readonly geos: Record<string, THREE.BufferGeometry> = {};
  private readonly rests = {} as Record<FaunaKind, Map<string, [number, number, number]>>;
  private readonly pool: Record<FaunaKind, Rig[]> = { porco: [], vaca: [], ovelha: [], galinha: [] };

  constructor(private readonly scene: THREE.Scene, private readonly models: FazendaModels, images: Record<FaunaKind, HTMLImageElement>, patch: (m: THREE.MeshBasicMaterial) => void) {
    for (const kind of Object.keys(this.pool) as FaunaKind[]) {
      const tex = new THREE.Texture(images[kind]);
      tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.flipY = true; tex.needsUpdate = true;
      const m = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, alphaTest: 0.5, fog: true });
      patch(m);
      this.mats[kind] = m;
      this.rests[kind] = new Map(models.mobs[kind].parts.map((p) => [p.id, p.restEulerRad]));
      for (const p of models.mobs[kind].parts) this.geos[`${kind}/${p.id}`] = partGeometry(p, models.boxGeometryFaceOrder, models.textureSize);
    }
  }

  private make(kind: FaunaKind): Rig {
    const group = new THREE.Group(), joints = new Map<string, THREE.Group>();
    for (const p of this.models.mobs[kind].parts) {
      const j = new THREE.Group();
      j.position.set(p.pivotPx[0] * PX, p.pivotPx[1] * PX, p.pivotPx[2] * PX);
      j.rotation.set(...p.restEulerRad);
      const mesh = new THREE.Mesh(this.geos[`${kind}/${p.id}`], this.mats[kind]);
      mesh.position.set(p.meshOffsetPx[0] * PX, p.meshOffsetPx[1] * PX, p.meshOffsetPx[2] * PX);
      mesh.frustumCulled = false;
      j.add(mesh);
      (p.parent ? joints.get(p.parent)! : group).add(j);
      joints.set(p.id, j);
    }
    this.scene.add(group);
    return { group, joints };
  }

  /** Desenha a lista (pés, giro e pose de cada animal); o que sobra no pool some. */
  set(list: readonly FazendaItem[]): void {
    const used: Record<FaunaKind, number> = { porco: 0, vaca: 0, ovelha: 0, galinha: 0 };
    for (const it of list) {
      const pool = this.pool[it.kind], i = used[it.kind]++;
      const rig = pool[i] ?? (pool[i] = this.make(it.kind));
      rig.group.visible = true;
      rig.group.position.set(it.x, it.y + it.pose.bob, it.z);
      rig.group.rotation.y = it.yaw;
      this.pose(it.kind, rig, it.pose);
    }
    for (const kind of Object.keys(this.pool) as FaunaKind[]) for (let i = used[kind]; i < this.pool[kind].length; i++) this.pool[kind][i].group.visible = false;
  }

  /** Pernas (frente-e, trás-e, frente-d, trás-d; a galinha usa `perna_e/d` nas da frente), cabeça (cabeceio e giro) e asas, em torno do repouso de cada junta. */
  private pose(kind: FaunaKind, rig: Rig, pose: FaunaPose): void {
    const rest = this.rests[kind];
    const set = (id: string, dx: number, dy: number, dz: number): void => { const j = rig.joints.get(id), r = rest.get(id); if (j && r) j.rotation.set(r[0] + dx, r[1] + dy, r[2] + dz); };
    set('pata_frente_e', pose.legs[0], 0, 0); set('pata_tras_e', pose.legs[1], 0, 0); set('pata_frente_d', pose.legs[2], 0, 0); set('pata_tras_d', pose.legs[3], 0, 0);
    set('perna_e', pose.legs[0], 0, 0); set('perna_d', pose.legs[2], 0, 0);
    set('cabeca', pose.headPitch, pose.headYaw, 0);
    set('asa_e', 0, 0, -pose.wing); set('asa_d', 0, 0, pose.wing);
  }

  dispose(): void {
    for (const kind of Object.keys(this.pool) as FaunaKind[]) for (const r of this.pool[kind]) this.scene.remove(r.group);
  }
}
