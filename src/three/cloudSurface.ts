import * as THREE from 'three';
import { MAX_STACK } from '../config';
import { Block } from '../world/blocks';
import type { World } from '../world/world';
import { CLOUD_PATTERN_CELLS } from './cloudPattern';

/**
 * Render just the EXPOSED cloud surfaces. World-aligned UVs eliminate tile
 * boundaries; triangles may end on cell edges but the painting never does.
 * Other celestial materials keep the existing InstancedMesh path.
 */
export function buildCloudSurface(
  world: World,
  bounds: { x0: number; x1: number; y0: number; y1: number },
  topMaterial: any,
  sideMaterial: any,
): any[] {
  const top = new SurfaceBuilder(false);
  const sides = new SurfaceBuilder(true);
  const { x0, x1, y0, y1 } = bounds;
  const cloud = (x: number, y: number, level: number): boolean => {
    if (level === -1) return world.getGround(x, y) === Block.CLOUD_SOLID;
    return world.getLevel(x, y, level) === Block.CLOUD_SOLID;
  };
  const occupied = (x: number, y: number, level: number): boolean => {
    if (level === -1) return world.getGround(x, y) !== Block.HOLE && world.getGround(x, y) !== Block.VOID;
    return world.getLevel(x, y, level) !== Block.AIR;
  };
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    for (let level = -1; level < MAX_STACK; level++) {
      if (!cloud(x, y, level)) continue;
      const h0 = level < 0 ? -0.24 : level;
      const h1 = level < 0 ? 0 : level + 1;
      if (level === MAX_STACK - 1 || !occupied(x, y, level + 1)) {
        top.add(
          [[x, h1, y], [x, h1, y + 1], [x + 1, h1, y + 1], [x + 1, h1, y]],
          [x, y, x, y + 1, x + 1, y + 1, x + 1, y],
        );
      }
      // Do not paint internal faces between adjacent occupied volumes.
      if (!occupied(x, y - 1, level)) sides.add(
        [[x + 1, h0, y], [x, h0, y], [x, h1, y], [x + 1, h1, y]],
        [x + 1, h0, x, h0, x, h1, x + 1, h1],
      );
      if (!occupied(x, y + 1, level)) sides.add(
        [[x, h0, y + 1], [x + 1, h0, y + 1], [x + 1, h1, y + 1], [x, h1, y + 1]],
        [x, h0, x + 1, h0, x + 1, h1, x, h1],
      );
      if (!occupied(x - 1, y, level)) sides.add(
        [[x, h0, y], [x, h0, y + 1], [x, h1, y + 1], [x, h1, y]],
        [y, h0, y + 1, h0, y + 1, h1, y, h1],
      );
      if (!occupied(x + 1, y, level)) sides.add(
        [[x + 1, h0, y + 1], [x + 1, h0, y], [x + 1, h1, y], [x + 1, h1, y + 1]],
        [y + 1, h0, y, h0, y, h1, y + 1, h1],
      );
    }
  }
  const meshes: any[] = [];
  for (const [builder, material] of [[top, topMaterial], [sides, sideMaterial]] as const) {
    const geometry = builder.geometry();
    if (!geometry) continue;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.cloudSurface = true;
    // The positions are in absolute world coordinates: no object translation.
    mesh.frustumCulled = false;
    meshes.push(mesh);
  }
  return meshes;
}

/** All coordinates are world-space. Each quad has independent, correct UVs. */
class SurfaceBuilder {
  private positions: number[] = [];
  private uvs: number[] = [];
  constructor(private readonly vertical: boolean) {}

  add(points: number[][], uv: number[]): void {
    // Triangle winding: outward-facing in world coordinates.
    for (const i of [0, 1, 2, 0, 2, 3]) {
      this.positions.push(...points[i]);
      const scaleU = CLOUD_PATTERN_CELLS;
      const scaleV = this.vertical ? 4 : CLOUD_PATTERN_CELLS;
      this.uvs.push(uv[i * 2] / scaleU, uv[i * 2 + 1] / scaleV);
    }
  }

  geometry(): any | null {
    if (!this.positions.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2));
    g.computeVertexNormals();
    return g;
  }
}

/** Edges are rendered only where a cloud block has a genuinely exposed side. */
export function exposedCloudEdge(world: World, x: number, y: number, dx: number, dy: number): boolean {
  if (world.getObject(x, y) !== Block.CLOUD_SOLID) return false;
  return world.getObject(x + dx, y + dy) === Block.AIR;
}
