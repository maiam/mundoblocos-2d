import * as THREE from 'three';
import type { GoblinView } from '../../game/valeGoblins';
import { GoblinPoser, type RigBone } from './goblinPose';

/** A malha do goblin com pele (`scripts/extract-iso-goblin.py`): posições (unidades do modelo, altura ~2), normais em centésimos, UV, ossos por vértice, índices, ossos de repouso e inversas de bind. */
export interface IsoGoblinRig {
  height: number; positions: number[]; normals: number[]; uvs: number[]; skinIndex: number[]; skinWeight: number[]; indices: number[]; bones: RigBone[]; ibm: number[];
}
/** Arte do goblin: o rig e a imagem da cor base do atlas. */
export interface IsoGoblinArt { rig: IsoGoblinRig; image: HTMLImageElement }

/** Altura do goblin em células: medida na tela, com 1,15 ele ficava com 0,53 da altura da Deusa (halo aos pés); 1,5 dá ~0,7 (goblin menor que ela). */
export const GOBLIN_HEIGHT = 1.5;

interface Instance { group: THREE.Group; bones: THREE.Bone[] }

/**
 * Goblins do Vale como **malhas 3D com pele** (v0.93.161): o modelo do dono do produto (Blender, 3000 triângulos, 22 ossos) com a cor base do atlas dele. O jogo (`game/valeGoblins.ts`) manda a
 * posição, a direção e a fase de caminhada de cada um a cada quadro; aqui só se monta uma `SkinnedMesh` por goblin (esqueleto próprio, geometria e material compartilhados) e se aplica a pose
 * procedural (`goblinPose.ts`). A cena não tem luzes: o relevo vem de um sombreado fixo por normal no espaço da câmera (injetado no `MeshBasicMaterial`), que acompanha a pele e o giro.
 */
export class IsoGoblins {
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.MeshBasicMaterial;
  private readonly texture: THREE.Texture;
  private readonly poser: GoblinPoser;
  private readonly inverses: THREE.Matrix4[];
  private readonly instances = new Map<number, Instance>();
  private readonly scale: number;

  constructor(private readonly scene: THREE.Object3D, private readonly art: IsoGoblinArt) {
    const r = art.rig;
    this.poser = new GoblinPoser(r.bones, r.ibm);
    this.scale = GOBLIN_HEIGHT / r.height;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(r.positions, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(Float32Array.from(r.normals, (v) => v / 100), 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(r.uvs, 2));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(r.skinIndex, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(Float32Array.from(r.skinWeight, (v) => v / 255), 4));
    g.setIndex(r.indices);
    this.geometry = g;
    this.inverses = r.bones.map((_, i) => new THREE.Matrix4().fromArray(r.ibm, i * 16));
    this.texture = new THREE.Texture(art.image);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.flipY = false; // UV do glTF: origem no canto superior esquerdo
    this.texture.anisotropy = 4;
    this.texture.needsUpdate = true;
    this.material = new THREE.MeshBasicMaterial({ map: this.texture, side: THREE.DoubleSide });
    this.material.onBeforeCompile = (shader) => {
      // sombreado fixo (luz de cima e da esquerda da câmera) pela normal da pele, no espaço da câmera
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying float vGoblinShade;')
        .replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\n  vGoblinShade = 0.55 + 0.45 * max(0.0, dot(normalize(transformedNormal), normalize(vec3(-0.3, 0.7, 0.65))));');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vGoblinShade;')
        .replace('#include <opaque_fragment>', '#include <opaque_fragment>\n  gl_FragColor.rgb *= vGoblinShade;');
    };
    this.material.customProgramCacheKey = () => 'goblin-shade';
  }

  private make(): Instance {
    const r = this.art.rig;
    const bones = r.bones.map((b) => {
      const o = new THREE.Bone();
      o.name = b.name;
      o.position.fromArray(b.t);
      o.quaternion.fromArray(b.q);
      o.scale.fromArray(b.s);
      return o;
    });
    const mesh = new THREE.SkinnedMesh(this.geometry, this.material);
    r.bones.forEach((b, i) => (b.parent >= 0 ? bones[b.parent] : mesh).add(bones[i]));
    mesh.frustumCulled = false;
    mesh.name = 'Santuário: goblin 3D';
    mesh.bind(new THREE.Skeleton(bones, this.inverses), new THREE.Matrix4());
    const group = new THREE.Group();
    group.name = 'Santuário: goblin';
    group.scale.setScalar(this.scale);
    group.add(mesh);
    this.scene.add(group);
    return { group, bones };
  }

  /** Põe cada goblin na posição, direção e pose recebidas (cria os que faltam e remove os que sumiram). `time` = segundos (respiração). */
  sync(goblins: readonly GoblinView[], time: number): void {
    const seen = new Set<number>();
    for (const v of goblins) {
      seen.add(v.id);
      let inst = this.instances.get(v.id);
      if (!inst) { inst = this.make(); this.instances.set(v.id, inst); }
      inst.group.position.set(v.x, v.z, v.y);
      inst.group.rotation.y = v.yaw;
      this.poser.pose(inst.bones, v.phase, v.walk, time + v.id * 0.7);
    }
    for (const [id, inst] of this.instances) {
      if (seen.has(id)) continue;
      this.scene.remove(inst.group);
      this.instances.delete(id);
    }
  }

  get count(): number { return this.instances.size; }

  dispose(): void {
    for (const inst of this.instances.values()) this.scene.remove(inst.group);
    this.instances.clear();
    this.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
  }
}
