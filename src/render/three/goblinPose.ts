import * as THREE from 'three';

/** Um osso do rig (`scripts/extract-iso-goblin.py`): pai (−1 = raiz) e posição, quaternion e escala locais de repouso. */
export interface RigBone { name: string; parent: number; t: number[]; q: number[]; s: number[] }

/** Células andadas por um ciclo completo de caminhada (dois passos): ~0,8 da altura do goblin (1,5 célula). */
export const WALK_CYCLE_CELLS = 1.2;

// Amplitudes (rad) e altura do balanço (unidades do modelo, altura 2,0). Eixos do modelo: x = lateral, y = para cima, frente = +z.
const THIGH = 0.5;
const KNEE = 0.75;
const ARM = 0.4;
const ELBOW = 0.35;
const ARM_DOWN = 0.62; // a pose A tem os braços abertos ~45°: na caminhada eles descem para junto do corpo
const BOB = 0.035;
const TWIST = 0.09;

const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), AZ = new THREE.Vector3(0, 0, 1);

/**
 * Pose procedural do goblin (caminhada e respiração) sobre o esqueleto do GLB. Em vez de girar cada osso no eixo dele (os eixos vêm da rotação de bone do Blender), cada osso ganha uma rotação **no
 * espaço do modelo** (`delta · repouso global`): a de cada osso herda a do pai e soma só o que é dele; o quaternion local é `inverso(global do pai) · global do osso`. Ângulo positivo em x gira
 * y → z: perna para baixo vai PARA TRÁS; para a frente (+z) é negativo.
 */
export class GoblinPoser {
  private readonly index = new Map<string, number>();
  private readonly restG: THREE.Quaternion[];
  private readonly restLocal: THREE.Quaternion[];
  private readonly restPos: THREE.Vector3[] = [];
  /** +1 para ossos do lado de x > 0, −1 para x < 0, 0 no centro (pela posição de repouso). */
  readonly side: number[] = [];
  private readonly delta: THREE.Quaternion[];
  private readonly global: THREE.Quaternion[];
  private readonly tmp2 = new THREE.Quaternion();

  constructor(private readonly bones: readonly RigBone[], ibm: readonly number[]) {
    bones.forEach((b, i) => this.index.set(b.name, i));
    this.restLocal = bones.map((b) => new THREE.Quaternion().fromArray(b.q));
    this.restG = [];
    bones.forEach((b, i) => this.restG[i] = (b.parent >= 0 ? this.restG[b.parent].clone().multiply(this.restLocal[i]) : this.restLocal[i].clone()));
    const m = new THREE.Matrix4();
    bones.forEach((_, i) => {
      m.fromArray(ibm, i * 16).invert();
      this.restPos.push(new THREE.Vector3().setFromMatrixPosition(m));
      const x = this.restPos[i].x;
      this.side.push(Math.abs(x) < 0.02 ? 0 : Math.sign(x));
    });
    this.delta = bones.map(() => new THREE.Quaternion());
    this.global = bones.map(() => new THREE.Quaternion());
  }

  /** Posição de repouso (espaço do modelo) do osso `name`. */
  restPosition(name: string): THREE.Vector3 {
    return this.restPos[this.index.get(name)!];
  }

  private id(name: string): number {
    const i = this.index.get(name);
    if (i === undefined) throw new Error('osso do rig ausente: ' + name);
    return i;
  }

  /**
   * Aplica a pose aos `bones` (mesma ordem do rig). `phase` = fase do ciclo (rad), `walk` = 0 parado … 1 andando (mistura suave), `time` = segundos (respiração).
   * O osso raiz sobe e desce (`bob`) no espaço do modelo.
   */
  pose(bones: readonly THREE.Bone[], phase: number, walk: number, time: number): void {
    const n = this.bones.length;
    const sL = Math.sin(phase), sR = -sL;
    const cL = Math.cos(phase), cR = -cL;
    const breathe = Math.sin(time * 2.2) * (1 - walk);
    const ex = new Map<string, THREE.Quaternion>();
    const set = (name: string, q: THREE.Quaternion): void => { ex.set(name, q); };
    const rx = (a: number): THREE.Quaternion => new THREE.Quaternion().setFromAxisAngle(AX, a);
    const ry = (a: number): THREE.Quaternion => new THREE.Quaternion().setFromAxisAngle(AY, a);
    const rz = (a: number): THREE.Quaternion => new THREE.Quaternion().setFromAxisAngle(AZ, a);

    // Quadril e coluna: leve torção oposta (o tronco contra o quadril) e respiração no peito.
    const tw = TWIST * sL * walk;
    set('pelvis', ry(tw));
    set('spine', ry(-tw * 1.4));
    set('chest', rx(-0.02 * breathe));
    set('head', ry(tw * 0.5));
    for (const [leg, s, c] of [['L', sL, cL], ['R', sR, cR]] as const) {
      // perna: a coxa balança (frente = −x girado), o joelho dobra para trás na fase de avanço, o pé acompanha
      const swing = -THIGH * s * walk;
      const bend = KNEE * Math.max(0, c) * walk;
      set(`thigh.${leg}`, rx(swing));
      set(`shin.${leg}`, rx(bend));
      set(`foot.${leg}`, rx(-0.55 * (swing + bend) + 0.15 * s * walk));
      // braço oposto à perna do mesmo lado; desce da pose A (lado x > 0 gira para −z; x < 0, para +z)
      const side = this.side[this.id(`upper_arm.${leg}`)];
      const down = rz(-side * ARM_DOWN * walk);
      const armSwing = ARM * s * walk; // perna L à frente (s > 0): braço L para trás
      set(`upper_arm.${leg}`, rx(armSwing).multiply(down));
      set(`forearm.${leg}`, rx(-ELBOW * walk - 0.25 * Math.max(0, -armSwing)));
    }

    for (let i = 0; i < n; i++) {
      const b = this.bones[i];
      const e = ex.get(b.name);
      const d = this.delta[i];
      if (b.parent >= 0) d.copy(this.delta[b.parent]); else d.identity();
      if (e) d.premultiply(e);
      const g = this.global[i];
      g.copy(d).multiply(this.restG[i]);
      const q = bones[i].quaternion;
      if (b.parent >= 0) q.copy(this.tmp2.copy(this.global[b.parent]).invert()).multiply(g); else q.copy(g);
    }
    // balanço do corpo (sobe a cada passo; o osso raiz é filho da malha, no espaço do modelo)
    const root = bones[0];
    root.position.fromArray(this.bones[0].t);
    root.position.y += BOB * Math.abs(sL) * walk + 0.006 * breathe;
  }
}
