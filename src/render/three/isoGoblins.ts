import * as THREE from 'three';
import type { GoblinView } from '../../game/valeGoblins';
import { GoblinPoser, SWING_END, SWING_WINDUP, type RigBone } from './goblinPose';

/** A malha do goblin com pele (`scripts/extract-iso-goblin.py`): posições (unidades do modelo, altura ~2), normais em centésimos, UV, ossos por vértice, índices, ossos de repouso e inversas de bind. */
export interface IsoGoblinRig {
  height: number; positions: number[]; normals: number[]; uvs: number[]; skinIndex: number[]; skinWeight: number[]; indices: number[]; bones: RigBone[]; ibm: number[];
}
/** A adaga (`scripts/extract-iso-dagger.py`): malha em cor de vértice, origem no meio do cabo, lâmina para +y. */
export interface IsoDaggerMesh { length: number; positions: number[]; normals: number[]; colors: number[]; indices: number[] }
/** Arte do goblin: o rig, a imagem da cor base do atlas e a adaga da mão direita. */
export interface IsoGoblinArt { rig: IsoGoblinRig; image: HTMLImageElement; dagger?: IsoDaggerMesh }

/** Altura do goblin em células: medida na tela, com 1,15 ele ficava com 0,53 da altura da Deusa (halo aos pés); 1,5 dá ~0,7 (goblin menor que ela). */
export const GOBLIN_HEIGHT = 1.5;

/** Bolinha macia (gradiente radial) das faíscas, desenhada num canvas (só se escreve, nunca se lê). */
function sparkTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  if (!g) return null;
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,230,150,0.8)');
  grad.addColorStop(1, 'rgba(255,200,80,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

interface Instance { group: THREE.Group; bones: THREE.Bone[]; trail: THREE.Mesh; sparks: THREE.Points }

/** Arco do golpe (plano y–z à frente do goblin, centrado no ombro direito): raio interno/externo (unidades do modelo) e abertura em graus (0 = à frente, 90 = para cima). */
const TRAIL = { r0: 0.72, r1: 1.02, from: -25, to: 150, segs: 30, center: new THREE.Vector3(-0.12, 1.22, 0.02), roll: 0.65 };
/** Faíscas do choque das adagas: quantas, quanto duram (s) e onde nascem (à frente do goblin que golpeia, no meio do caminho até o parceiro). */
const SPARK = { n: 12, life: 0.45, origin: new THREE.Vector3(-0.1, 1.0, 0.8) };
const sparkDirs = Array.from({ length: SPARK.n }, (_, i) => {
  const a = (i / SPARK.n) * Math.PI * 2 + (i % 3) * 0.4, e = 0.3 + ((i * 37) % 10) / 14;
  return new THREE.Vector3(Math.cos(a) * 0.9, e, Math.sin(a) * 0.9 + 0.35).normalize().multiplyScalar(1.4 + ((i * 53) % 7) / 4);
});

/**
 * Goblins do Vale como **malhas 3D com pele** (v0.93.161): o modelo do dono do produto (Blender, 3000 triângulos, 26 ossos) com a cor base do atlas dele. O jogo (`game/valeGoblins.ts`) manda a
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
  private daggerGeometry: THREE.BufferGeometry | null = null;
  private daggerMaterial: THREE.MeshBasicMaterial | null = null;
  private readonly trailGeometry: THREE.BufferGeometry;
  private readonly trailMaterial: THREE.MeshBasicMaterial;
  private readonly sparkMaterial: THREE.PointsMaterial;
  /** Como a adaga se prende ao osso `hand.R` (calculado uma vez com a pose parada): rotação e posição locais. */
  private grip: { q: THREE.Quaternion; p: THREE.Vector3 } | null = null;

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
    // adaga na mão direita (cor de vértice + o mesmo sombreado fixo por normal)
    if (art.dagger) {
      const d = art.dagger;
      const dg = new THREE.BufferGeometry();
      dg.setAttribute('position', new THREE.Float32BufferAttribute(d.positions, 3));
      dg.setAttribute('normal', new THREE.Float32BufferAttribute(Float32Array.from(d.normals, (v) => v / 100), 3));
      dg.setAttribute('color', new THREE.Float32BufferAttribute(Float32Array.from(d.colors, (v) => v / 255), 3));
      dg.setIndex(d.indices);
      this.daggerGeometry = dg;
      this.daggerMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
      this.daggerMaterial.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying float vDaggerShade;')
          // o MeshBasicMaterial só calcula `transformedNormal` com pele ou envmap: aqui a normal vem direto do atributo
          .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vDaggerShade = 0.6 + 0.55 * max(0.0, dot(normalize(normalMatrix * normal), normalize(vec3(-0.3, 0.7, 0.65))));');
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nvarying float vDaggerShade;')
          .replace('#include <opaque_fragment>', '#include <opaque_fragment>\n  gl_FragColor.rgb *= vDaggerShade;');
      };
      this.daggerMaterial.customProgramCacheKey = () => 'dagger-shade';
    }
    // rastro do golpe: faixa em arco com brilho crescente na ponta (revelada aos poucos por `setDrawRange`)
    const ring = new THREE.RingGeometry(TRAIL.r0, TRAIL.r1, TRAIL.segs, 1, THREE.MathUtils.degToRad(TRAIL.from), THREE.MathUtils.degToRad(TRAIL.to - TRAIL.from));
    ring.rotateY(-Math.PI / 2); // plano y–z: x do anel vira +z (frente), y fica para cima
    const cols = new Float32Array((TRAIL.segs + 1) * 2 * 4);
    for (let j = 0; j < 2; j++) for (let i = 0; i <= TRAIL.segs; i++) {
      const k = (j * (TRAIL.segs + 1) + i) * 4, a = (1 - i / TRAIL.segs) ** 0.8 * (j === 0 ? 0.12 : 1);
      cols.set([0.88, 0.98, 1, a * 0.9], k);
    }
    ring.setAttribute('color', new THREE.BufferAttribute(cols, 4));
    this.trailGeometry = ring;
    this.trailMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide });
    this.sparkMaterial = new THREE.PointsMaterial({ color: 0xffe7a0, size: 9, map: sparkTexture(), sizeAttenuation: false, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
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
    if (this.daggerGeometry && this.daggerMaterial) {
      const hand = bones.find((b) => b.name === 'hand.R')!;
      if (!this.grip) this.grip = this.computeGrip(bones, mesh, hand);
      const dagger = new THREE.Mesh(this.daggerGeometry, this.daggerMaterial);
      dagger.name = 'Santuário: adaga do goblin';
      dagger.quaternion.copy(this.grip.q);
      dagger.position.copy(this.grip.p);
      dagger.frustumCulled = false;
      hand.add(dagger);
    }
    const trail = new THREE.Mesh(this.trailGeometry.clone(), this.trailMaterial.clone());
    trail.position.copy(TRAIL.center);
    trail.rotation.z = TRAIL.roll; // o golpe cruza o corpo (do alto à direita para baixo à esquerda): a câmera isométrica enxerga a faixa
    trail.visible = false;
    trail.frustumCulled = false;
    trail.renderOrder = 50;
    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(SPARK.n * 3), 3));
    const sparks = new THREE.Points(sparkGeo, this.sparkMaterial.clone());
    sparks.visible = false;
    sparks.frustumCulled = false;
    sparks.renderOrder = 51;
    const group = new THREE.Group();
    group.name = 'Santuário: goblin';
    group.scale.setScalar(this.scale);
    group.add(mesh, trail, sparks);
    this.scene.add(group);
    return { group, bones, trail, sparks };
  }

  /**
   * Prende a adaga à mão direita: com a pose parada, a lâmina segue o antebraço (para baixo, inclinada um pouco para a frente) e o fio olha para a frente; a posição é o punho, um pouco
   * além do pulso. Devolve rotação e posição locais ao osso (a adaga acompanha a mão em qualquer pose).
   */
  private computeGrip(bones: THREE.Bone[], mesh: THREE.Object3D, hand: THREE.Bone): { q: THREE.Quaternion; p: THREE.Vector3 } {
    this.poser.pose(bones, {}, 0);
    mesh.updateMatrixWorld(true);
    const fore = bones.find((b) => b.name === 'forearm.R')!;
    const hp = hand.getWorldPosition(new THREE.Vector3()), fp = fore.getWorldPosition(new THREE.Vector3());
    const hq = hand.getWorldQuaternion(new THREE.Quaternion());
    const arm = hp.clone().sub(fp).normalize();
    const y = arm.clone().add(new THREE.Vector3(0, 0, 0.5)).normalize();
    const fwd = new THREE.Vector3(0, 0, 1);
    const x = fwd.clone().sub(y.clone().multiplyScalar(fwd.dot(y))).normalize();
    const z = new THREE.Vector3().crossVectors(x, y);
    const qModel = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    const inv = hq.clone().invert();
    return { q: inv.clone().multiply(qModel), p: arm.clone().multiplyScalar(0.1).applyQuaternion(inv) };
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
      this.poser.pose(inst.bones, v, time + v.id * 0.7);
      this.effects(inst, v);
    }
    for (const [id, inst] of this.instances) {
      if (seen.has(id)) continue;
      this.scene.remove(inst.group);
      this.free(inst);
      this.instances.delete(id);
    }
  }

  /** Rastro do golpe (faixa em arco que varre da posição armada até a frente e some) e faíscas do choque das adagas. */
  private effects(inst: Instance, v: GoblinView): void {
    const u = v.swing;
    const showTrail = u >= SWING_WINDUP && u < 0.82;
    inst.trail.visible = showTrail;
    if (showTrail) {
      const n = TRAIL.segs;
      const p = Math.min(1, (u - SWING_WINDUP) / (SWING_END - SWING_WINDUP)), head = Math.round(n * (1 - (1 - (1 - p) ** 3)));
      const tail = Math.min(n, head + Math.round(n * 0.55));
      inst.trail.geometry.setDrawRange(head * 6, Math.max(0, tail - head) * 6);
      (inst.trail.material as THREE.MeshBasicMaterial).opacity = u < SWING_END ? 1 : Math.max(0, 1 - (u - SWING_END) / (0.82 - SWING_END));
    }
    const t = v.spark;
    const showSparks = t >= 0 && t < SPARK.life;
    inst.sparks.visible = showSparks;
    if (showSparks) {
      const a = inst.sparks.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < SPARK.n; i++) {
        const d = sparkDirs[i];
        a.setXYZ(i, SPARK.origin.x + d.x * t, SPARK.origin.y + d.y * t - 3.2 * t * t, SPARK.origin.z + d.z * t);
      }
      a.needsUpdate = true;
      (inst.sparks.material as THREE.PointsMaterial).opacity = 1 - t / SPARK.life;
    }
  }

  get count(): number { return this.instances.size; }

  private free(inst: Instance): void {
    inst.trail.geometry.dispose();
    (inst.trail.material as THREE.Material).dispose();
    inst.sparks.geometry.dispose();
    (inst.sparks.material as THREE.Material).dispose();
  }

  dispose(): void {
    for (const inst of this.instances.values()) { this.scene.remove(inst.group); this.free(inst); }
    this.instances.clear();
    this.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
    this.daggerGeometry?.dispose();
    this.daggerMaterial?.dispose();
    this.trailGeometry.dispose();
    this.trailMaterial.dispose();
    this.sparkMaterial.dispose();
  }
}
