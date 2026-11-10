import * as THREE from 'three';
import type { SanctuaryV2Materials } from './sanctuaryV2Materials';
import { HOUSE5, HOUSE5_STAIRS } from './modularHouse5Plan';

/**
 * Non-persisted, art-directed 5×5 two-storey model, combining solid Three.js
 * floors and walls with the official 512px marble/stone paintings.
 * Only camera-facing walls/upper slabs fade when the goddess is INSIDE.
 */
export function makeModularHouse5(
  worldX0: number,
  worldY0: number,
  library: SanctuaryV2Materials | null,
  maxAnisotropy: number,
): {
  group: any;
  updateView(playerX: number, playerY: number, playerHeight: number, cameraPosition: any): void;
  dispose(): void;
} {
  const group = new THREE.Group();
  group.name = 'Casa Celestial 5×5 — dois pavimentos (prévia)';
  const tintedWalls: any[] = [];
  const upperSurfaces: any[] = [];
  const roofMeshes: any[] = [];
  const materials: any[] = [];
  const textures: any[] = [];
  const geometry: any[] = [];
  const x0 = worldX0 + HOUSE5.x;
  const z0 = worldY0 + HOUSE5.y;
  const centerX = x0 + 2.5, centerZ = z0 + 2.5;
  const makeMaterial = (id: number, tint = 0xffffff, alpha = 1): any => {
    const source = library?.textures.get(id);
    const texture = source ? source.clone() : null;
    if (texture) {
      texture.needsUpdate = true;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = Math.min(4, maxAnisotropy);
      texture.repeat.set(1 / 4, 1 / 4);
      textures.push(texture);
    }
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      color: texture ? tint : (id === 85 ? 0xf4d3a2 : id === 83 ? 0xd6c1f4 : id === 84 ? 0xb3aedf : 0xece7ff),
      transparent: alpha < 1,
      opacity: alpha,
      side: THREE.DoubleSide,
      depthWrite: alpha === 1,
    });
    materials.push(mat);
    return mat;
  };
  const marble = makeMaterial(82);
  const decorated = makeMaterial(83);
  const stone = makeMaterial(84, 0xc7cae1);
  const gold = makeMaterial(85);
  const roofMaterial = makeMaterial(82, 0xf2eeff, 0.92);
  const add = (x: number, y: number, z: number, w: number, h: number, d: number, mat: any, role: 'wall' | 'roof' | 'upper' | 'solid' = 'solid') => {
    const g = new THREE.BoxGeometry(w, h, d);
    geometry.push(g);
    const mesh = new THREE.Mesh(g, mat);
    mesh.position.set(x, y, z);
    mesh.userData.houseRole = role;
    group.add(mesh);
    if (role === 'wall') tintedWalls.push(mesh);
    if (role === 'roof') roofMeshes.push(mesh);
    if (role === 'upper') upperSurfaces.push(mesh);
    return mesh;
  };

  // The ground floor can actually be entered from the south side, z=y+4.
  // A thin floor does NOT affect world standHeight, only the visual surface.
  add(centerX, 0.035, centerZ, 4.6, 0.07, 4.6, marble);
  // The physical upper-floor support is at height 4. The transparent cutaway
  // prevents this slab from hiding the protagonist while on the ground floor.
  add(centerX, 3.91, centerZ, 4.6, 0.18, 4.6, decorated, 'upper');

  // Stairs: 4 cells, 1 unit higher each time, no invisible ceiling collision.
  for (const cell of HOUSE5_STAIRS) {
    add(worldX0 + cell.x + 0.5, cell.height * 0.5,
      worldY0 + cell.y + 0.5, 0.98, cell.height, 0.98, marble);
  }

  // Outer walls are panels, not a closed opaque box: south entrance open.
  // Two levels of wall have decorative upper trim and three actual windows.
  for (let row = 0; row < 5; row++) {
    const x = x0 + row + 0.5;
    // Northern wall.
    add(x, 1.9, z0 + 0.10, 1, 3.8, 0.2, stone, 'wall');
    // Southern wall, with the 1-cell central entrance (no hidden collider).
    if (row !== 2) add(x, 1.9, z0 + 4.9, 1, 3.8, 0.2, stone, 'wall');
    else {
      // Decorated lintel and no lower door slab.
      add(x, 3.55, z0 + 4.9, 1, 0.7, 0.2, gold, 'wall');
    }
    // Second-floor walls and side windows (open lower viewport).
    add(x, 5.7, z0 + 0.10, 1, 3.4, 0.2, stone, 'wall');
    add(x, 5.7, z0 + 4.9, 1, 3.4, 0.2, stone, 'wall');
    // Trim at the upper floor helps read distinct storeys.
    add(x, 4.05, z0 + 0.11, 1, 0.14, 0.3, gold, 'wall');
    add(x, 4.05, z0 + 4.89, 1, 0.14, 0.3, gold, 'wall');
  }
  for (let row = 1; row < 4; row++) {
    const z = z0 + row + 0.5;
    // East and west wall segments. Upper floor has open window slot on middle row.
    add(x0 + 0.10, 1.9, z, 0.2, 3.8, 1, stone, 'wall');
    add(x0 + 4.90, 1.9, z, 0.2, 3.8, 1, stone, 'wall');
    if (row !== 2) {
      add(x0 + 0.10, 5.7, z, 0.2, 3.4, 1, stone, 'wall');
      add(x0 + 4.90, 5.7, z, 0.2, 3.4, 1, stone, 'wall');
    } else {
      for (const east of [false, true]) {
        const px = x0 + (east ? 4.90 : 0.10);
        add(px, 4.7, z, 0.2, 1.4, 1, stone, 'wall');
        add(px, 7.0, z, 0.2, 0.8, 1, stone, 'wall');
        // Illuminated open window frame, no glass or invisible barrier.
        add(px, 6.2, z - 0.45, 0.25, 0.1, 0.1, gold, 'wall');
      }
    }
  }

  // A simple illustrated roof, hidden when exploring interiors.
  add(centerX, 7.58, centerZ, 5.3, 0.23, 5.3, roofMaterial, 'roof');
  add(centerX, 7.75, centerZ, 2.6, 0.12, 2.6, gold, 'roof');

  function updateView(px: number, pz: number, h: number, cameraPosition: any): void {
    const inside = px >= x0 && px < x0 + 5 && pz >= z0 && pz < z0 + 5;
    // Mask only the camera-facing walls. Side/rear walls remain solid.
    const cameraWest = cameraPosition.x < centerX;
    const cameraNorth = cameraPosition.z < centerZ;
    for (const m of tintedWalls) {
      const cameraFacing = (cameraWest ? m.position.x < centerX - 1.9 : m.position.x > centerX + 1.9)
        || (cameraNorth ? m.position.z < centerZ - 1.9 : m.position.z > centerZ + 1.9);
      const relevantStorey = h < 3 ? m.position.y < 4.2 : m.position.y >= 4.2;
      // Own material needed because walls share a single original mesh material.
      m.visible = !inside || !cameraFacing || !relevantStorey;
    }
    // Keep the entire sprite visible without rendering it unnaturally ahead of walls.
    for (const mesh of upperSurfaces) mesh.visible = !inside || h >= 3;
    for (const mesh of roofMeshes) mesh.visible = !inside;
  }

  return {
    group,
    updateView,
    dispose(): void {
      for (const g of geometry) g.dispose();
      for (const m of materials) m.dispose();
      for (const t of textures) t.dispose();
    },
  };
}
