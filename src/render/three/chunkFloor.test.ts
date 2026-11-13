import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { Chunk } from '../../world/chunk';
import { ChunkFloor, type FloorSource, type FloorWorld } from './chunkFloor';

function fakeChunk(cx: number, cy: number): Chunk { return { cx, cy, version: 1 } as Chunk; }

/** Mundo e fonte falsos: `render` conta quantos chunks foram pintados; `fresh` guarda a versão pintada. */
function setup(maxPerFrame = 2) {
  const chunks = new Map<string, Chunk>();
  for (let cy = 0; cy < 3; cy++) for (let cx = 0; cx < 3; cx++) chunks.set(cx + ',' + cy, fakeChunk(cx, cy));
  const world: FloorWorld = { getChunk: (cx, cy) => chunks.get(cx + ',' + cy) };
  const painted = new Map<Chunk, { canvas: HTMLCanvasElement; version: number }>();
  let renders = 0;
  const source: FloorSource = {
    beginFrame() {},
    isFresh: (c) => painted.get(c)?.version === c.version,
    get(c, allow) {
      const hit = painted.get(c);
      if (hit && hit.version === c.version) return hit.canvas;
      if (!allow) return hit?.canvas ?? null;
      renders++;
      const canvas = hit?.canvas ?? ({} as HTMLCanvasElement);
      painted.set(c, { canvas, version: c.version });
      return canvas;
    },
  };
  const scene = new THREE.Scene();
  const floor = new ChunkFloor(scene, world, source, maxPerFrame);
  return { chunks, scene, floor, renders: () => renders };
}

describe('ChunkFloor (chão por chunk no 3D)', () => {
  it('limita os chunks pintados por quadro e completa nos quadros seguintes', () => {
    const { floor, renders } = setup(2);
    const rect = { cx0: 0, cy0: 0, cx1: 2, cy1: 2 }; // 9 chunks
    floor.update(rect);
    expect(renders()).toBe(2);
    expect(floor.count).toBe(2);
    for (let i = 0; i < 5; i++) floor.update(rect);
    expect(renders()).toBe(9);
    expect(floor.count).toBe(9);
  });

  it('um plano por chunk, posicionado no centro dele (topo da textura = norte)', () => {
    const { floor, scene } = setup(9);
    floor.update({ cx0: 1, cy0: 0, cx1: 1, cy1: 0 });
    const mesh = scene.children[0] as THREE.Mesh;
    expect(mesh.position.toArray()).toEqual([24, 0, 8]); // chunk (1, 0): x 16..32, z 0..16
  });

  it('textura só reenvia à GPU quando a version do chunk muda; chunk repintado = novo envio', () => {
    const { floor, chunks, scene } = setup(9);
    const rect = { cx0: 0, cy0: 0, cx1: 0, cy1: 0 };
    floor.update(rect);
    const tex = (scene.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>).material.map as THREE.Texture;
    const v0 = tex.version;
    floor.update(rect);
    expect(tex.version).toBe(v0); // nada mudou
    chunks.get('0,0')!.version++; // o mundo editou o chunk
    floor.update(rect);
    expect(tex.version).toBeGreaterThan(v0);
  });

  it('chunks fora da área somem e liberam as texturas; dispose limpa tudo', () => {
    const { floor, scene } = setup(9);
    floor.update({ cx0: 0, cy0: 0, cx1: 2, cy1: 0 });
    expect(floor.count).toBe(3);
    floor.update({ cx0: 2, cy0: 0, cx1: 2, cy1: 0 });
    expect(floor.count).toBe(1);
    expect(scene.children).toHaveLength(1);
    floor.dispose();
    expect(floor.count).toBe(0);
    expect(scene.children).toHaveLength(0);
  });
});
