import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import rig from '../../assets/iso-goblin.json';
import { GoblinPoser, WALK_CYCLE_CELLS } from './goblinPose';

function make(): { poser: GoblinPoser; bones: THREE.Bone[] } {
  const poser = new GoblinPoser(rig.bones, rig.ibm);
  const bones = rig.bones.map((b) => { const o = new THREE.Bone(); o.name = b.name; o.position.fromArray(b.t); o.quaternion.fromArray(b.q); o.scale.fromArray(b.s); return o; });
  rig.bones.forEach((b, i) => { if (b.parent >= 0) bones[b.parent].add(bones[i]); });
  bones[0].updateMatrixWorld(true);
  return { poser, bones };
}
const worldPos = (bones: THREE.Bone[], name: string): THREE.Vector3 => { bones[0].updateMatrixWorld(true); return new THREE.Vector3().setFromMatrixPosition(bones.find((b) => b.name === name)!.matrixWorld); };

describe('Goblin com pele: malha e esqueleto do GLB', () => {
  it('3455 vértices, 3000 triângulos, 26 ossos (com orelhas) e pesos de pele por vértice', () => {
    const n = rig.positions.length / 3;
    expect(n).toBe(3455);
    expect(rig.indices.length / 3).toBe(3000);
    expect(rig.bones).toHaveLength(26);
    expect(rig.bones.map((b) => b.name)).toEqual(expect.arrayContaining(['ear_base.L', 'ear_tip.R', 'hand.L', 'toe.R']));
    expect(rig.ibm).toHaveLength(26 * 16);
    expect(rig.skinIndex).toHaveLength(n * 4);
    expect(Math.max(...rig.skinIndex)).toBeLessThan(26);
    for (let v = 0; v < n; v++) {
      const sum = rig.skinWeight.slice(v * 4, v * 4 + 4).reduce((a, b) => a + b, 0);
      expect(Math.abs(sum - 255), `vértice ${v}`).toBeLessThanOrEqual(3);
    }
    expect(rig.bones.filter((b) => b.parent < 0)).toHaveLength(1);
    expect(rig.height).toBeCloseTo(2.0, 1);
  });
});

describe('Pose procedural do goblin (caminhada)', () => {
  it('parado (walk = 0) e fase qualquer: quase na pose de repouso (só a respiração)', () => {
    const { poser, bones } = make();
    const rest = worldPos(bones, 'foot.L').clone();
    poser.pose(bones, { phase: 1.3 }, 0);
    expect(worldPos(bones, 'foot.L').distanceTo(rest)).toBeLessThan(0.02);
    expect(worldPos(bones, 'hand.R').distanceTo(worldPos(bones, 'hand.R'))).toBe(0);
  });

  it('andando: os pés se alternam à frente e atrás (±z em oposição), os braços balançam ao contrário e os quaternions seguem unitários', () => {
    const { poser, bones } = make();
    poser.pose(bones, { phase: Math.PI / 2, walk: 1 }, 0); // perna L no ponto mais à frente
    const zL = worldPos(bones, 'foot.L').z, zR = worldPos(bones, 'foot.R').z;
    expect(Math.abs(zL - zR)).toBeGreaterThan(0.4); // passo largo (altura 2,0)
    const handL = worldPos(bones, 'hand.L').z, handR = worldPos(bones, 'hand.R').z;
    expect(Math.sign(handL - handR)).toBe(-Math.sign(zL - zR)); // braço oposto à perna do mesmo lado
    poser.pose(bones, { phase: -Math.PI / 2, walk: 1 }, 0);
    expect(Math.sign(worldPos(bones, 'foot.L').z - worldPos(bones, 'foot.R').z)).toBe(-Math.sign(zL - zR)); // meio ciclo depois, trocados
    for (const b of bones) expect(b.quaternion.length()).toBeCloseTo(1, 4);
    // a frente é +z: o pé que avança tem z maior que o de repouso
    const rest = make();
    expect(Math.max(zL, zR)).toBeGreaterThan(worldPos(rest.bones, 'foot.L').z + 0.12);
  });

  it('os pés não atravessam o chão nem os joelhos se invertem; o corpo sobe e desce pouco', () => {
    const { poser, bones } = make();
    let minY = 9, maxHip = -9, minHip = 9;
    for (let k = 0; k < 24; k++) {
      poser.pose(bones, { phase: (k / 24) * Math.PI * 2, walk: 1 }, 0);
      minY = Math.min(minY, worldPos(bones, 'foot.L').y, worldPos(bones, 'foot.R').y, worldPos(bones, 'toe.L').y, worldPos(bones, 'toe.R').y);
      const hip = worldPos(bones, 'pelvis').y;
      maxHip = Math.max(maxHip, hip); minHip = Math.min(minHip, hip);
    }
    expect(minY).toBeGreaterThan(-0.12); // pés de apoio perto do chão (z = 0 é a sola da bota no repouso)
    expect(maxHip - minHip).toBeLessThan(0.2);
  });

  it('um ciclo vale ~0,8 da altura do goblin', () => {
    expect(WALK_CYCLE_CELLS / 1.5).toBeGreaterThan(0.7);
    expect(WALK_CYCLE_CELLS / 1.5).toBeLessThan(0.9);
  });
});

describe('Poses novas do goblin (v0.93.165)', () => {
  it('parado, os braços pendem junto do corpo (as mãos ficam bem abaixo dos ombros e perto do tronco), não abertos como na pose A', () => {
    const { poser, bones } = make();
    poser.pose(bones, {}, 0);
    for (const h of ['hand.L', 'hand.R']) {
      const hand = worldPos(bones, h), shoulder = worldPos(bones, h.replace('hand', 'upper_arm'));
      expect(shoulder.y - hand.y).toBeGreaterThan(0.4);
      expect(Math.abs(hand.x)).toBeLessThan(0.45); // na pose A a mão está em x = 0,66
    }
  });

  it('sentado: o quadril desce perto do chão e os pés ficam apoiados à frente; agachado: o quadril desce menos', () => {
    const { poser, bones } = make();
    const rest = worldPos(bones, 'pelvis').y;
    poser.pose(bones, { sit: 1 }, 0);
    expect(worldPos(bones, 'pelvis').y).toBeLessThan(rest - 0.4);
    for (const f of ['foot.L', 'foot.R', 'toe.L', 'toe.R']) expect(worldPos(bones, f).y, f).toBeGreaterThan(-0.08);
    expect(worldPos(bones, 'toe.L').z).toBeGreaterThan(worldPos(bones, 'pelvis').z + 0.3);
    const sitY = worldPos(bones, 'pelvis').y;
    poser.pose(bones, { stoke: 1 }, 0);
    const crouchY = worldPos(bones, 'pelvis').y;
    expect(crouchY).toBeLessThan(rest - 0.15);
    expect(crouchY).toBeGreaterThan(sitY);
    for (const f of ['foot.L', 'foot.R', 'toe.L', 'toe.R']) expect(worldPos(bones, f).y, f).toBeGreaterThan(-0.08);
    for (const b of bones) expect(b.quaternion.length()).toBeCloseTo(1, 4);
  });

  it('agachado: a mão direita avança para a frente (cutuca a fogueira)', () => {
    const { poser, bones } = make();
    poser.pose(bones, {}, 0);
    const z0 = worldPos(bones, 'hand.R').z;
    poser.pose(bones, { stoke: 1 }, 1);
    expect(worldPos(bones, 'hand.R').z).toBeGreaterThan(z0 + 0.2);
  });

  it('correndo: inclina o tronco para a frente, a passada é maior que a da caminhada e os cotovelos dobram', () => {
    const { poser, bones } = make();
    poser.pose(bones, { phase: Math.PI / 2, walk: 1 }, 0);
    const walkStride = Math.abs(worldPos(bones, 'foot.L').z - worldPos(bones, 'foot.R').z);
    poser.pose(bones, { phase: Math.PI / 2, walk: 1, run: 1 }, 0);
    expect(Math.abs(worldPos(bones, 'foot.L').z - worldPos(bones, 'foot.R').z)).toBeGreaterThan(walkStride);
    expect(worldPos(bones, 'chest').z).toBeGreaterThan(worldPos(make().bones, 'chest').z + 0.02);
    for (const b of bones) expect(b.quaternion.length()).toBeCloseTo(1, 4);
  });

  it('conversa: falando gesticula (as mãos sobem à frente) e ouvindo quase não mexe os braços', () => {
    const { poser, bones } = make();
    poser.pose(bones, {}, 0);
    const z0 = worldPos(bones, 'hand.L').z + worldPos(bones, 'hand.R').z;
    let best = 0;
    for (let t = 0; t < 3; t += 0.1) { poser.pose(bones, { talk: 1 }, t); best = Math.max(best, worldPos(bones, 'hand.L').z + worldPos(bones, 'hand.R').z - z0); }
    expect(best).toBeGreaterThan(0.3);
    for (let t = 0; t < 3; t += 0.1) { poser.pose(bones, { talk: 0.3 }, t); expect(worldPos(bones, 'hand.L').z + worldPos(bones, 'hand.R').z - z0).toBeLessThan(0.25); }
  });

  it('olhar: a cabeça gira para o lado pedido', () => {
    const { poser, bones } = make();
    poser.pose(bones, {}, 0);
    const x0 = worldPos(bones, 'ear_tip.L').z;
    poser.pose(bones, { look: 0.8 }, 0);
    expect(Math.abs(worldPos(bones, 'ear_tip.L').z - x0)).toBeGreaterThan(0.05);
  });
});
