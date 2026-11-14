import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { Actor, ActorKind } from '../../game/entities';
import { ActorBillboards, selectVisibleActors, type ActorSheet } from './actorBillboards';

const fakeCtx = { clearRect() {}, fillText() {}, strokeText() {} } as unknown as CanvasRenderingContext2D;
const fakeCanvas = (): HTMLCanvasElement => ({ width: 0, height: 0, getContext: () => fakeCtx }) as unknown as HTMLCanvasElement;

function actor(kind: string, x: number, y: number, extra: Partial<Actor> = {}): Actor {
  return { kind: kind as ActorKind, x, y, visualZ: 0, facing: 'down', moving: false, walkTime: 0, ...extra } as Actor;
}
const sheetFor = (height: number, aspect = 1): ActorSheet & { draws: number } => {
  const s = { draws: 0, drawHeight: height, frameAspect: aspect, shadowRadii: [0.32, 0.12] as [number, number], draw() { s.draws++; }, visualKey: (a: Actor, e: number) => `${a.moving}:${Math.floor(e * 7)}` };
  return s;
};
const view = { x0: 0, y0: 0, x1: 20, y1: 20 };

describe('selectVisibleActors', () => {
  it('o primeiro (jogador) sempre entra; os demais só se visíveis, do mais perto ao mais longe; respeita o teto', () => {
    const player = { x: 50, y: 50 }; // fora da área, mesmo assim entra
    const near = { x: 10, y: 10 }, far = { x: 19, y: 19 }, out = { x: 99, y: 5 };
    const sorted = selectVisibleActors([player, far, out, near], view, 10);
    expect(sorted[0]).toBe(player);
    expect(sorted).toHaveLength(3);
    expect(sorted).not.toContain(out);
    expect(Math.hypot(sorted[1].x - 50, sorted[1].y - 50)).toBeLessThan(Math.hypot(sorted[2].x - 50, sorted[2].y - 50));
    expect(selectVisibleActors([player, far, near], view, 2)).toHaveLength(2); // jogador + 1
    expect(selectVisibleActors([], view, 5)).toEqual([]);
  });
});

describe('ActorBillboards (atores do Mundo no 3D)', () => {
  function setup(sheets: Record<string, ActorSheet>) {
    const scene = new THREE.Scene();
    const bb = new ActorBillboards(scene, { get: (k) => sheets[k] }, { scale: 0.5, k: 1, paintZoom: 2, createCanvas: fakeCanvas });
    return { scene, bb };
  }

  it('um plano com sombra por ator visível, pintando a folha 2D; o plano leva a escala do mundo', () => {
    const hero = sheetFor(70), cow = sheetFor(40);
    const { scene, bb } = setup({ heroine: hero, cow });
    bb.update(view, [actor('heroine', 5, 5), actor('cow', 8, 9), actor('cow', 90, 9)], 0);
    expect(bb.count).toBe(2); // a vaca fora da área não conta
    expect(hero.draws).toBe(1);
    expect(cow.draws).toBe(1);
    const planes = scene.children.filter((o) => o.name === 'Mundo: ator' && o.visible) as THREE.Mesh[];
    expect(planes).toHaveLength(2);
    const heroPlane = planes.find((p) => p.position.x === 5)!;
    // lado do canvas = ceil(70 × 2 × 1,45 / 16) × 16 = 208; em células: 208 / (2 × 32) × 0,5 = 1,625
    expect(heroPlane.scale.x).toBeCloseTo(1.625);
    expect(heroPlane.scale.y).toBeCloseTo(1.625); // K = 1
    expect(heroPlane.position.y).toBeCloseTo(0.03);
    expect(heroPlane.position.z).toBe(5);
  });

  it('reaproveita os planos entre quadros e esconde os que sobram', () => {
    const hero = sheetFor(70);
    const { scene, bb } = setup({ heroine: hero });
    bb.update(view, [actor('heroine', 1, 1), actor('heroine', 2, 2), actor('heroine', 3, 3)], 0);
    const total = scene.children.length;
    bb.update(view, [actor('heroine', 1, 1), actor('heroine', 2, 2), actor('heroine', 3, 3)], 1);
    expect(scene.children.length).toBe(total); // nada novo
    bb.update(view, [actor('heroine', 1, 1)], 2);
    expect(scene.children.filter((o) => o.name === 'Mundo: ator' && o.visible)).toHaveLength(1);
  });

  it('a sombra some junto com a morte do monstro; dispose limpa a cena', () => {
    const wolf = sheetFor(50);
    const { scene, bb } = setup({ wolf, heroine: sheetFor(70) });
    bb.update(view, [actor('heroine', 1, 1), actor('wolf', 3, 3, { dying: 0.5 })], 0);
    const shadow = scene.children.find((o) => o.name === 'Mundo: sombra de ator' && (o as THREE.Mesh).position.x === 3) as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
    expect(shadow.material.opacity).toBeCloseTo(0.11);
    bb.dispose();
    expect(scene.children).toHaveLength(0);
  });

  it('eco do jogador: um plano translúcido sem teste de profundidade que acompanha o primeiro ator; só se ligado', () => {
    const hero = sheetFor(70);
    const scene = new THREE.Scene();
    const bb = new ActorBillboards(scene, { get: () => hero }, { scale: 0.5, k: 1, paintZoom: 2, createCanvas: fakeCanvas, echo: true });
    expect(bb.echoVisible).toBe(false);
    bb.update(view, [actor('heroine', 5, 6), actor('heroine', 8, 9)], 0);
    expect(bb.echoVisible).toBe(true);
    const echo = scene.children.find((o) => o.name === 'Mundo: eco do jogador') as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
    expect(echo.material.depthTest).toBe(false);
    expect(echo.material.opacity).toBeLessThan(0.6);
    expect(echo.position.x).toBe(5); // o do primeiro ator, não o do segundo
    expect(echo.position.z).toBe(6);
    bb.update(view, [], 1);
    expect(bb.echoVisible).toBe(false);
    const plain = new ActorBillboards(new THREE.Scene(), { get: () => hero }, { scale: 0.5, k: 1, createCanvas: fakeCanvas });
    plain.update(view, [actor('heroine', 1, 1)], 0);
    expect(plain.echoVisible).toBe(false);
    bb.dispose();
    expect(scene.children).toHaveLength(0);
  });

  it('não repinta nem reenvia a textura enquanto o desenho não mudou (assinatura igual); repinta quando muda', () => {
    const hero = sheetFor(70);
    const { bb } = setup({ heroine: hero });
    const a = [actor('heroine', 5, 5)];
    bb.update(view, a, 0);
    expect([bb.painted, bb.skipped]).toEqual([1, 0]);
    bb.update(view, a, 0.05); // mesmo quadro da animação (7 por segundo)
    expect([bb.painted, bb.skipped]).toEqual([0, 1]);
    expect(hero.draws).toBe(1);
    bb.update(view, a, 0.2); // passou do quadro: repinta
    expect(bb.painted).toBe(1);
    bb.update(view, [actor('heroine', 5, 5, { facing: 'left' })], 0.2); // virou: repinta
    expect(bb.painted).toBe(1);
    expect(hero.draws).toBe(3);
    bb.reupload(); // contexto restaurado: tudo de novo
    bb.update(view, [actor('heroine', 5, 5, { facing: 'left' })], 0.2);
    expect(bb.painted).toBe(1);
  });
});
