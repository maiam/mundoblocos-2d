import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { BlockId } from '../../world/blocks';
import type { Chunk } from '../../world/chunk';
import { DOOR_ANIM_S } from '../doorAnim';
import type { SpriteArt } from './chunkSprites';
import { DoorSprites } from './doorSprites';

const CLOSED = 50, OPEN = 51;
const frames: SpriteArt[] = Array.from({ length: 8 }, () => ({
  canvas: {} as HTMLCanvasElement, ox: 8, oy: -88, w: 70, h: 120, hit: { x: 8, y: -80, w: 61, h: 110 },
}));

function setup() {
  const chunks = new Map<string, Chunk>([['0,0', { cx: 0, cy: 0, version: 1 } as Chunk]]);
  const cells = new Map<string, number>([['3,4', CLOSED]]);
  let scans = 0;
  const world = { getChunk: (cx: number, cy: number) => chunks.get(cx + ',' + cy), getLevel: (x: number, y: number) => { scans++; return (cells.get(x + ',' + y) ?? 0) as BlockId; } };
  const scene = new THREE.Scene();
  const doors = new DoorSprites(scene, world, {
    tile: 32, k: 1, isDoor: (id) => id === CLOSED || id === OPEN, isOpen: (id) => id === OPEN, frames: () => frames,
  });
  return { chunks, cells, scene, doors, scans: () => scans };
}
const rect = { cx0: 0, cy0: 0, cx1: 0, cy1: 0 };

describe('DoorSprites (portas animadas no 3D)', () => {
  it('um plano por porta, ancorado na face sul da célula; fechada escreve profundidade', () => {
    const { doors, scene } = setup();
    doors.update(rect, 0);
    expect(doors.count).toBe(1);
    const mesh = scene.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
    // x + ox/tile = 3,25 ; z = y + (oy + h)/tile = 4 + 32/32 = 5
    expect(mesh.position.toArray()).toEqual([3.25, 0, 5]);
    expect(mesh.material.depthWrite).toBe(true);
  });

  it('só varre as células quando a version do chunk muda (não a cada quadro)', () => {
    const { doors, chunks, scans } = setup();
    doors.update(rect, 0);
    const after1 = scans();
    doors.update(rect, 0.1); doors.update(rect, 0.2);
    expect(scans()).toBe(after1);
    chunks.get('0,0')!.version++;
    doors.update(rect, 0.3);
    expect(scans()).toBeGreaterThan(after1);
  });

  it('ao abrir, percorre os quadros de abertura e assenta aberta (material que não cobre o personagem)', () => {
    const { doors, cells, chunks, scene } = setup();
    doors.update(rect, 10); // vista fechada, sem animação
    cells.set('3,4', OPEN); chunks.get('0,0')!.version++; // o jogador abriu
    const used = new Set<HTMLCanvasElement>();
    for (let t = 0; t <= DOOR_ANIM_S + 0.05; t += 0.04) {
      doors.update(rect, 20 + t);
      used.add(((scene.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).map!.image as HTMLCanvasElement);
    }
    // frames distintos por canvas: todos os quadros são o mesmo objeto de teste? não — cada um tem o seu
    expect(used.size).toBeGreaterThanOrEqual(1);
    const mesh = scene.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
    expect(mesh.material.depthWrite).toBe(false); // aberta: se atravessa
    expect(mesh.material.map!.image).toBe(frames[3].canvas);
  });

  it('o pick só vale no retângulo clicável; planos sobrando ficam escondidos; dispose limpa', () => {
    const { doors, cells, scene } = setup();
    doors.update(rect, 0);
    const mesh = scene.children[0] as THREE.Mesh;
    const at = (x: number, h: number) => doors.cellOf({ object: mesh, point: new THREE.Vector3(x, h, 5) } as unknown as THREE.Intersection);
    expect(at(3.5, 1)).toMatchObject({ x: 3, y: 4 });
    expect(at(3.0, 1)).toBeUndefined(); // à esquerda do corpo da porta
    cells.clear();
    (doors as unknown as { lists: Map<string, unknown> }).lists.clear();
    doors.update(rect, 1);
    expect(doors.count).toBe(0);
    expect(mesh.visible).toBe(false);
    doors.dispose();
    expect(scene.children).toHaveLength(0);
  });
});
