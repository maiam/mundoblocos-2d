import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import rig from '../../assets/iso-goblin.json';
import dagger from '../../assets/iso-dagger.json';
import { GoblinPoser, SWING_HIT, SWING_WINDUP, WALK_CYCLE_CELLS } from './goblinPose';

function make(): { poser: GoblinPoser; bones: THREE.Bone[] } {
  const poser = new GoblinPoser(rig.bones, rig.ibm);
  const bones = rig.bones.map((b) => { const o = new THREE.Bone(); o.name = b.name; o.position.fromArray(b.t); o.quaternion.fromArray(b.q); o.scale.fromArray(b.s); return o; });
  rig.bones.forEach((b, i) => { if (b.parent >= 0) bones[b.parent].add(bones[i]); });
  bones[0].updateMatrixWorld(true);
  return { poser, bones };
}
const worldPos = (bones: THREE.Bone[], name: string): THREE.Vector3 => { bones[0].updateMatrixWorld(true); return new THREE.Vector3().setFromMatrixPosition(bones.find((b) => b.name === name)!.matrixWorld); };

describe('Goblin com pele: malha e esqueleto do GLB', () => {
  it('10756 vértices, 17268 triângulos em 4 grupos (atlas, cabelo, pele), 26 ossos (com orelhas) e pesos de pele por vértice', () => {
    const n = rig.positions.length / 3;
    expect(n).toBe(10756);
    expect(rig.indices.length / 3).toBe(17268);
    // os grupos cobrem os índices e os vértices sem buraco nem sobreposição, e só a pele usa cor de vértice
    expect(rig.groups.map((g) => g.material).sort()).toEqual(['base', 'base', 'hair', 'skin']);
    expect(rig.groups.reduce((a, g) => a + g.count, 0)).toBe(rig.indices.length);
    expect(rig.groups.reduce((a, g) => a + g.vertexCount, 0)).toBe(n);
    rig.groups.forEach((g, i) => { if (i > 0) { expect(g.start).toBe(rig.groups[i - 1].start + rig.groups[i - 1].count); expect(g.firstVertex).toBe(rig.groups[i - 1].firstVertex + rig.groups[i - 1].vertexCount); } });
    const skin = rig.groups.find((g) => g.material === 'skin')!;
    expect(rig.skinColors).toHaveLength(skin.vertexCount * 3);
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

describe('Golpe de adaga e postura de luta (v0.93.166)', () => {
  it('golpe: arma a mão direita acima do ombro e atrás, depois a leva à frente e abaixo; volta à postura no fim', () => {
    const { poser, bones } = make();
    poser.pose(bones, { fight: 1 }, 0);
    const stance = worldPos(bones, 'hand.R').clone();
    poser.pose(bones, { fight: 1, swing: SWING_WINDUP }, 0);
    const armed = worldPos(bones, 'hand.R').clone();
    expect(armed.y).toBeGreaterThan(worldPos(bones, 'upper_arm.R').y); // acima do ombro
    expect(armed.z).toBeLessThan(stance.z - 0.2); // e para trás
    poser.pose(bones, { fight: 1, swing: SWING_HIT + 0.04 }, 0);
    const hit = worldPos(bones, 'hand.R');
    expect(hit.z).toBeGreaterThan(armed.z + 0.5); // varreu para a frente
    expect(hit.y).toBeLessThan(armed.y - 0.2);    // e para baixo
    poser.pose(bones, { fight: 1, swing: 0.999 }, 0);
    expect(worldPos(bones, 'hand.R').distanceTo(stance)).toBeLessThan(0.1);
    for (const b of bones) expect(b.quaternion.length()).toBeCloseTo(1, 4);
  });

  it('postura de luta: agachado de leve, adaga à frente, braço esquerdo em guarda, pés no chão; defender ergue a adaga', () => {
    const { poser, bones } = make();
    const rest = worldPos(bones, 'pelvis').y;
    poser.pose(bones, { fight: 1 }, 0);
    expect(worldPos(bones, 'pelvis').y).toBeLessThan(rest - 0.05);
    expect(worldPos(bones, 'hand.R').z).toBeGreaterThan(0.25);
    expect(worldPos(bones, 'hand.L').z).toBeGreaterThan(0.25);
    for (const f of ['foot.L', 'foot.R', 'toe.L', 'toe.R']) expect(worldPos(bones, f).y, f).toBeGreaterThan(-0.08);
    const low = worldPos(bones, 'hand.R').y;
    poser.pose(bones, { fight: 1, parry: 1 }, 0);
    expect(worldPos(bones, 'hand.R').y).toBeGreaterThan(low + 0.05);
  });

  it('adaga: 4 materiais em cor de vértice, lâmina para +y, origem no cabo', () => {
    expect(dagger.positions.length / 3).toBe(dagger.colors.length / 3);
    expect(dagger.positions.length / 3).toBe(dagger.normals.length / 3);
    expect(Math.max(...dagger.indices)).toBeLessThan(dagger.positions.length / 3);
    const ys = dagger.positions.filter((_, i) => i % 3 === 1);
    expect(Math.max(...ys)).toBeGreaterThan(0.4);   // ponta
    expect(Math.min(...ys)).toBeLessThan(-0.08);    // pomo
    expect(dagger.length).toBeCloseTo(0.585, 2);
  });
});
