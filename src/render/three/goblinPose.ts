import * as THREE from 'three';

/** Um osso do rig (`scripts/extract-iso-goblin.py`): pai (−1 = raiz) e posição, quaternion e escala locais de repouso. */
export interface RigBone { name: string; parent: number; t: number[]; q: number[]; s: number[] }

/** Células andadas por um ciclo completo de caminhada (dois passos): ~0,8 da altura do goblin (1,5 célula). Na corrida o passo é maior (`RUN_CYCLE_CELLS`). */
export const WALK_CYCLE_CELLS = 1.2;
export const RUN_CYCLE_CELLS = 2.3;

/** O que o goblin está fazendo, para a pose: tudo de 0 a 1 (misturas suaves feitas pelo jogo, `game/valeGoblins.ts`). */
export interface GoblinPoseParams {
  /** Fase do ciclo de passada (rad). */
  phase: number;
  /** 0 parado … 1 em movimento (caminhada ou corrida). */
  walk: number;
  /** 0 caminhada … 1 corrida (só vale com `walk`). */
  run: number;
  /** Sentado no chão (joelhos para cima, mãos nos joelhos). */
  sit: number;
  /** Agachado mexendo na fogueira (braço direito cutuca para a frente). */
  stoke: number;
  /** Conversando: 1 = falando (gesticula), ~0,3 = ouvindo (acena com a cabeça). */
  talk: number;
  /** Giro da cabeça em relação ao corpo (rad, + = para a esquerda do goblin). */
  look: number;
}
export const REST_POSE: GoblinPoseParams = { phase: 0, walk: 0, run: 0, sit: 0, stoke: 0, talk: 0, look: 0 };

// Amplitudes (rad) e altura do balanço (unidades do modelo, altura 2,0). Eixos do modelo: x = lateral, y = para cima, frente = +z.
const THIGH = 0.5, THIGH_RUN = 0.85;
const KNEE = 0.75, KNEE_RUN = 1.45;
const ARM = 0.4, ARM_RUN = 0.85;
const ELBOW = 0.35, ELBOW_RUN = 1.35;
/** A pose A do modelo tem os braços ~33° abaixo da horizontal: para pendê-los junto do corpo (parado e andando) eles descem ~0,9 rad. */
const ARM_DOWN = 0.88;
const BOB = 0.03, BOB_RUN = 0.07;
const TWIST = 0.09, TWIST_RUN = 0.16;
const EAR = 0.12;
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const ease = (x: number): number => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };

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
   * Aplica a pose aos `bones` (mesma ordem do rig). `p` = o que o goblin faz (`GoblinPoseParams`; o que faltar é 0), `time` = segundos (respiração, gestos).
   * O osso raiz sobe e desce no espaço do modelo (balanço da passada, sentar, agachar).
   */
  pose(bones: readonly THREE.Bone[], p: Partial<GoblinPoseParams>, time: number): void {
    const n = this.bones.length;
    const { phase, walk, run } = { ...REST_POSE, ...p };
    const sit = ease(p.sit ?? 0), stoke = ease(p.stoke ?? 0), talk = p.talk ?? 0, look = p.look ?? 0;
    const sL = Math.sin(phase), sR = -sL;
    const cL = Math.cos(phase), cR = -cL;
    const still = (1 - walk) * (1 - sit) * (1 - stoke);
    const breathe = Math.sin(time * 2.2);
    const sway = Math.sin(time * 0.8);
    const ex = new Map<string, THREE.Quaternion>();
    /** Soma `q` à rotação já pedida para o osso (em ordem: o que vem depois age por último, no espaço do modelo). */
    const add = (name: string, q: THREE.Quaternion): void => { const o = ex.get(name); ex.set(name, o ? q.clone().multiply(o) : q); };
    const rx = (a: number): THREE.Quaternion => new THREE.Quaternion().setFromAxisAngle(AX, a);
    const ry = (a: number): THREE.Quaternion => new THREE.Quaternion().setFromAxisAngle(AY, a);
    const rz = (a: number): THREE.Quaternion => new THREE.Quaternion().setFromAxisAngle(AZ, a);
    const thighA = lerp(THIGH, THIGH_RUN, run), kneeA = lerp(KNEE, KNEE_RUN, run), armA = lerp(ARM, ARM_RUN, run), elbowA = lerp(ELBOW, ELBOW_RUN, run);

    // Quadril e coluna: torção oposta (o tronco contra o quadril), leve balanço lateral, inclinação para a frente na corrida e respiração no peito.
    const tw = lerp(TWIST, TWIST_RUN, run) * sL * walk;
    const lean = 0.2 * run * walk;
    add('pelvis', ry(tw));
    add('pelvis', rz(0.03 * Math.cos(phase) * walk + 0.02 * sway * still));
    add('spine', ry(-tw * 1.4));
    add('spine', rz(-0.03 * Math.cos(phase) * walk - 0.015 * sway * still));
    add('spine', rx(lean * 0.6 + 0.16 * sit + 0.34 * stoke));
    add('chest', rx(lean * 0.4 - 0.02 * breathe * (1 - walk) + 0.06 * sit + 0.12 * stoke));
    // pescoço e cabeça: compensam a inclinação (o olhar segue em frente), olham para o lado `look` e acenam/gesticulam ao conversar
    add('neck', rx(-(lean * 0.5 + 0.1 * sit + 0.2 * stoke)));
    add('neck', ry(look * 0.4));
    add('head', rx(-(lean * 0.4 + 0.06 * sit + 0.12 * stoke) + 0.07 * talk * Math.sin(time * 5.3) + 0.03 * breathe * still));
    add('head', ry(tw * 0.5 + look * 0.6));
    add('head', rz(0.05 * talk * Math.sin(time * 2.1 + 1)));
    // orelhas: balançam a cada passo (o osso da ponta atrasa em relação à base) e mexem de leve ao falar
    for (const e of ['L', 'R'] as const) {
      if (!this.index.has(`ear_base.${e}`)) continue;
      const side = this.side[this.id(`ear_base.${e}`)];
      const wag = walk * (0.5 + 0.5 * run) + 0.35 * talk;
      add(`ear_base.${e}`, rz(side * EAR * Math.sin(2 * phase + 0.6 + time * 4 * talk) * wag));
      add(`ear_tip.${e}`, rz(side * EAR * 1.4 * Math.sin(2 * phase + 1.3 + time * 4 * talk) * wag));
    }
    for (const [leg, s, c, spk] of [['L', sL, cL, 1], ['R', sR, cR, 0]] as const) {
      // perna: a coxa balança (frente = rotação negativa), o joelho dobra suavemente ao avançar e o pé acompanha, quase sempre plano no chão
      const swing = -thighA * s * walk;
      const bend = kneeA * (0.5 + 0.5 * c) ** 2 * walk;
      add(`thigh.${leg}`, rx(swing));
      add(`shin.${leg}`, rx(bend));
      add(`foot.${leg}`, rx(-0.7 * (swing + bend) + 0.15 * s * walk));
      // sentado (joelhos para cima, pés planos) e agachado (coxa na horizontal, canela na vertical)
      const sd = this.side[this.id(`thigh.${leg}`)];
      add(`thigh.${leg}`, rx(-1.85 * sit - 1.55 * stoke));
      add(`thigh.${leg}`, rz(sd * 0.1 * sit));
      add(`shin.${leg}`, rx(0.75 * sit + 1.55 * stoke));
      add(`foot.${leg}`, rx(1.1 * sit));
      // braço: oposto à perna do mesmo lado; a pose A (braços abertos) vira braços pendendo junto do corpo (lado x > 0 gira para baixo em −z, x < 0 em +z)
      const side = this.side[this.id(`upper_arm.${leg}`)];
      const armSwing = armA * s * walk;
      const g1 = 0.5 + 0.5 * Math.sin(time * 3.1 + (spk ? 0 : 2)), g2 = 0.5 + 0.5 * Math.sin(time * 4.3 + (spk ? 1 : 3));
      const gest = talk > 0.6 ? talk * (spk ? 1 : 0.55) : 0; // fala com os dois braços, o esquerdo mais
      const down = ARM_DOWN * (1 - 0.3 * gest * g2);
      const fwd = 0.1 + 0.55 * gest * (0.4 + 0.6 * g1) + 0.38 * sit + (leg === 'R' ? 1.25 * stoke : 0.35 * stoke);
      add(`clavicle.${leg}`, rz(-side * 0.12));
      add(`upper_arm.${leg}`, rx(armSwing - fwd).multiply(rz(-side * down)));
      const poke = leg === 'R' ? 0.4 * Math.sin(time * 6.5) : 0;
      add(`forearm.${leg}`, rx(-(0.3 * (1 - walk) * (1 - sit) + elbowA * walk + 0.25 * Math.max(0, -armSwing) + 0.55 * gest * (0.5 + 0.5 * g2) + 0.6 * sit + (0.55 + poke) * stoke * (leg === 'R' ? 1 : 0.6))));
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
    // balanço do corpo: sobe e desce a cada passo (mais alto com as pernas juntas), desce ao sentar e agachar e recua um pouco (o peso fica sobre os pés)
    const root = bones[0];
    root.position.fromArray(this.bones[0].t);
    root.position.y += lerp(BOB, BOB_RUN, run) * Math.cos(2 * phase) * walk - 0.025 * run * walk + 0.006 * breathe * still - 0.52 * sit - 0.28 * stoke;
    root.position.z += -0.14 * sit - 0.08 * stoke;
  }
}
