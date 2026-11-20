import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * Farejador de Duna com rig (ADR 0064): carrega o GLB leve (`scripts/extract-titan-farejador-rig.py`: uma malha skinada, 23.768 triângulos, 18 ossos, textura de cor de 1024²) e anima os ossos pela
 * `FarejadorPose` (passo, cabeça, cauda, raspar, galope) — sem clipes: cada pose é uma rotação **no espaço do modelo** somada ao repouso de cada osso (o modelo olha para −X; Z é o eixo lateral).
 * Material: o mesmo da luz do dia do Titã (sem luzes de cena; `patchDayLight` do renderer entra por `prepare`). Sem DOM além do GLTFLoader.
 */
export interface RigPose { bob: number; roll: number; headPitch: number; headYaw: number; tailYaw: number; legs: readonly number[] }

type Role = 'tronco' | 'pescoco' | 'cabeca' | 'cauda1' | 'cauda2' | 'cauda3' | 'alta0' | 'baixa0' | 'pe0' | 'alta1' | 'baixa1' | 'pe1' | 'alta2' | 'baixa2' | 'pe2' | 'alta3' | 'baixa3' | 'pe3';
/** Ordem das patas em `pose.legs`: dianteira direita, dianteira esquerda, traseira direita, traseira esquerda. */
const LEG_SUFFIX = ['dd', 'de', 'td', 'te'] as const;

/** Papel de um osso pelo nome (o GLTFLoader remove pontos e espaços: `PernaAlta.DE` vira `PernaAltaDE`). */
export function roleOf(rawName: string): Role | null {
  const n = rawName.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_]/g, '').toLowerCase();
  if (n === 'tronco') return 'tronco';
  if (n === 'pescoco') return 'pescoco';
  if (n === 'cabeca') return 'cabeca';
  const t = /^cauda_?0?([123])$/.exec(n);
  if (t) return `cauda${t[1]}` as Role;
  const l = /^(pernaalta|pernabaixa|pe)(dd|de|td|te)$/.exec(n);
  if (l) { const k = LEG_SUFFIX.indexOf(l[2] as (typeof LEG_SUFFIX)[number]); return `${l[1] === 'pernaalta' ? 'alta' : l[1] === 'pernabaixa' ? 'baixa' : 'pe'}${k}` as Role; }
  return null;
}

const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
const AX = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };

export class RigInstance {
  readonly group: THREE.Group;
  private readonly bones = new Map<Role, { bone: THREE.Bone; rest: THREE.Quaternion; parent: THREE.Quaternion }>();

  constructor(source: THREE.Group) {
    this.group = cloneSkinned(source) as THREE.Group;
    this.group.updateMatrixWorld(true); // com o grupo na identidade, "mundo" = espaço do modelo
    this.group.traverse((o) => {
      if (!(o as THREE.Bone).isBone) return;
      const role = roleOf(o.userData.name ?? o.name) ?? roleOf(o.name);
      if (!role) return;
      const parent = new THREE.Quaternion();
      o.parent?.getWorldQuaternion(parent);
      this.bones.set(role, { bone: o as THREE.Bone, rest: o.quaternion.clone(), parent });
    });
    this.group.traverse((o) => { o.frustumCulled = false; });
  }

  get boneCount(): number { return this.bones.size; }

  /** Gira `role` em torno de um eixo do **espaço do modelo**, a partir do repouso: `local = P⁻¹ · R · P · repouso`. */
  private rot(role: Role, axis: 'x' | 'y' | 'z', angle: number, extra?: { axis: 'x' | 'y' | 'z'; angle: number }): void {
    const b = this.bones.get(role);
    if (!b) return;
    qa.setFromAxisAngle(AX[axis], angle);
    if (extra) { qb.setFromAxisAngle(AX[extra.axis], extra.angle); qa.premultiply(qb); }
    b.bone.quaternion.copy(b.parent).invert().multiply(qa).multiply(b.parent).multiply(b.rest);
  }

  apply(p: RigPose): void {
    // cabeça: arfar em Z (positivo = focinho para baixo) e girar em Y, dividido entre pescoço e cabeça
    this.rot('pescoco', 'z', p.headPitch * 0.4, { axis: 'y', angle: p.headYaw * 0.4 });
    this.rot('cabeca', 'z', p.headPitch * 0.6, { axis: 'y', angle: p.headYaw * 0.6 });
    // cauda: balanço lateral em Y, crescente até a ponta
    this.rot('cauda1', 'y', p.tailYaw * 0.4); this.rot('cauda2', 'y', p.tailYaw * 0.6); this.rot('cauda3', 'y', p.tailYaw * 0.8);
    // patas: a perna alta balança em Z; quando sobe (ângulo negativo) o joelho dobra e o pé acompanha
    for (let i = 0; i < 4; i++) {
      const a = p.legs[i], up = Math.max(0, -a);
      this.rot(`alta${i}` as Role, 'z', a);
      this.rot(`baixa${i}` as Role, 'z', 0.75 * up);
      this.rot(`pe${i}` as Role, 'z', -0.35 * up);
    }
  }
}

export interface RigTemplate { scene: THREE.Group; make(): RigInstance }

/**
 * Carrega o GLB e prepara o molde: troca o material por `material` (o do renderer, já com a luz do dia) e dá à geometria os atributos `color` (sombreado fixo por face, como os outros modelos) e
 * `glow` (zero) que o `patchDayLight` espera. Cada animal é um clone do molde (geometria e textura compartilhadas).
 */
export async function loadFarejadorRig(url: string, material: (map: THREE.Texture) => THREE.Material): Promise<RigTemplate> {
  const gltf = await new GLTFLoader().loadAsync(url);
  const scene = gltf.scene;
  let mat: THREE.Material | null = null;
  scene.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isSkinnedMesh) return;
    const src = m.material as THREE.MeshStandardMaterial;
    mat ??= material(src.map!);
    m.material = mat;
    const g = m.geometry, nrm = g.getAttribute('normal'), n = nrm.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const nx = nrm.getX(i), ny = nrm.getY(i), nz = nrm.getZ(i);
      const shade = ny > 0.5 ? 1 : ny < -0.5 ? 0.55 : nx > 0.5 ? 0.88 : nx < -0.5 ? 0.7 : nz > 0.5 ? 0.8 : 0.74;
      col.set([shade, shade, shade], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('glow', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  });
  return { scene, make: () => new RigInstance(scene) };
}
