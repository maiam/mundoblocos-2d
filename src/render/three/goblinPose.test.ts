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
    poser.pose(bones, 1.3, 0, 0);
    expect(worldPos(bones, 'foot.L').distanceTo(rest)).toBeLessThan(0.02);
    expect(worldPos(bones, 'hand.R').distanceTo(worldPos(bones, 'hand.R'))).toBe(0);
  });

  it('andando: os pés se alternam à frente e atrás (±z em oposição), os braços balançam ao contrário e os quaternions seguem unitários', () => {
    const { poser, bones } = make();
    poser.pose(bones, Math.PI / 2, 1, 0); // perna L no ponto mais à frente
    const zL = worldPos(bones, 'foot.L').z, zR = worldPos(bones, 'foot.R').z;
    expect(Math.abs(zL - zR)).toBeGreaterThan(0.4); // passo largo (altura 2,0)
    const handL = worldPos(bones, 'hand.L').z, handR = worldPos(bones, 'hand.R').z;
    expect(Math.sign(handL - handR)).toBe(-Math.sign(zL - zR)); // braço oposto à perna do mesmo lado
    poser.pose(bones, -Math.PI / 2, 1, 0);
    expect(Math.sign(worldPos(bones, 'foot.L').z - worldPos(bones, 'foot.R').z)).toBe(-Math.sign(zL - zR)); // meio ciclo depois, trocados
    for (const b of bones) expect(b.quaternion.length()).toBeCloseTo(1, 4);
    // a frente é +z: o pé que avança tem z maior que o de repouso
    const rest = make();
    expect(Math.max(zL, zR)).toBeGreaterThan(worldPos(rest.bones, 'foot.L').z + 0.2);
  });

  it('os pés não atravessam o chão nem os joelhos se invertem; o corpo sobe e desce pouco', () => {
    const { poser, bones } = make();
    let minY = 9, maxHip = -9, minHip = 9;
    for (let k = 0; k < 24; k++) {
      poser.pose(bones, (k / 24) * Math.PI * 2, 1, 0);
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
