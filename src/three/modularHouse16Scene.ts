import * as THREE from 'three';
import type { SanctuaryV2Materials } from './sanctuaryV2Materials';
import { HOUSE16, HOUSE16_STAIRS, type HouseLevel, type HouseBuildPiece, type ModularHouse16 } from './modularHouse16Plan';

export interface House16Visual {
  group: any;
  updateVisibility(x: number, y: number, level: number, cameraPosition: any): void;
  dispose(): void;
}

/**
 * Experimental 16×12 house, assembled from independently addressable blocks
 * instead of a fixed prefab. Its footprint is NOT constructed in World.
 */
export function renderModularHouse16(
  plan: ModularHouse16, worldX0: number, worldY0: number,
  library: SanctuaryV2Materials | null,
  maxAnisotropy: number,
): House16Visual {
  const group = new THREE.Group();
  group.name = 'Casa Modular 16×12 · blocos por pavimento';
  const geometry: any[] = [];
  const materials: any[] = [];
  const textures: any[] = [];
  const wallMeshes: Array<{ mesh: any; level: HouseLevel; x: number; y: number }> = [];
  const upperMeshes: any[] = [];
  const roofMeshes: any[] = [];
  const baseX = worldX0 + HOUSE16.x, baseY = worldY0 + HOUSE16.y;

  const makeMaterial = (id: number, repeatX: number, repeatY: number, tint = 0xffffff) => {
    const source = library?.textures.get(id);
    const texture = source ? source.clone() : null;
    if (texture) {
      texture.needsUpdate = true;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = Math.min(maxAnisotropy, 4);
      texture.repeat.set(repeatX, repeatY);
      textures.push(texture);
    }
    const color = source ? tint
      : id === 85 ? 0xffdb9d : id === 83 ? 0xd3bcf2 : id === 84 ? 0xb6add8 : 0xebdeff;
    const mat = new THREE.MeshBasicMaterial({
      map: texture, color, side: THREE.DoubleSide,
    });
    materials.push(mat);
    return mat;
  };
  // 1 cell = a quarter of the 512px tiling period, including vertical walls.
  const wall = makeMaterial(84, 0.25, 1, 0xd2cbe8);
  const wallUpper = makeMaterial(84, 0.25, 1, 0xe8dcf0);
  const decorated = makeMaterial(83, .25, .25);
  const slab = makeMaterial(82, .25, .25);
  const stairMat = makeMaterial(82, .25, .25);
  const gold = makeMaterial(85, .25, .25);
  const roof = makeMaterial(83, 4.5, 1.65);
  const foundation = makeMaterial(82, HOUSE16.width / 4, HOUSE16.depth / 4);

  const add = (x: number, z: number, y: number, width: number, depth: number, height: number,
    mat: any, role: string, tile?: { x: number; y: number; level: HouseLevel; kind: HouseBuildPiece }) => {
    const g = new THREE.BoxGeometry(width, height, depth);
    geometry.push(g);
    const mesh = new THREE.Mesh(g, mat);
    mesh.position.set(x, y, z);
    mesh.userData.house16 = true;
    mesh.userData.house16Role = role;
    if (tile) mesh.userData.house16Tile = tile;
    group.add(mesh);
    return mesh;
  };
  // Continuous base at level 0, shaped to the full house; model footprint contains
  // interior cells which are wider than a Minecraft miniature 5×5 cabin.
  add(baseX + 8, baseY + 6, 0.032, 15.8, 11.8, .06, foundation, 'ground');
  for (const piece of plan.pieces()) {
    const x = worldX0 + piece.x + .5;
    const z = worldY0 + piece.y + .5;
    if (piece.kind === 'wall') {
      const base = piece.level;
      const outer = plan.isBoundary(piece.x, piece.y);
      // Windows are drawn as real openings, with a sill and lintel.
      const window = outer && (
        piece.y === HOUSE16.y && [57, 61, 66].includes(piece.x)
        || piece.x === HOUSE16.x + 15 && [21, 26].includes(piece.y)
      );
      const tile = { ...piece };
      if (window) {
        const lower = add(x, z, base + .75, .97, .97, 1.5, wall, 'wall', tile);
        const upper = add(x, z, base + 3.55, .97, .97, .9, wallUpper, 'wall', tile);
        wallMeshes.push({ mesh: lower, level: base, x: piece.x, y: piece.y },
          { mesh: upper, level: base, x: piece.x, y: piece.y });
        // Thin golden window frame, no fake collision glass.
        add(x, z, base + 2.15, .98, .98, .12, gold, 'window');
      } else {
        const m = add(x, z, base + 2, .97, .97, 4, piece.level === 0 ? wall : wallUpper, 'wall', tile);
        wallMeshes.push({ mesh: m, level: base, x: piece.x, y: piece.y });
      }
      if (outer && piece.y === HOUSE16.y + HOUSE16.depth - 1 && piece.level === 0 &&
        (piece.x === 60 || piece.x === 63)) {
        add(x, z, 3.7, .98, .98, .17, gold, 'trim');
      }
    } else {
      const tile = { ...piece };
      const m = add(x, z, HOUSE16.upperLevel - 0.09, .99, .99, .18,
        (piece.x + piece.y) % 9 === 0 ? decorated : slab, 'upper', tile);
      upperMeshes.push(m);
    }
  }

  for (const cell of HOUSE16_STAIRS) {
    const x = worldX0 + cell.x + .5, z = worldY0 + cell.y + .5;
    add(x, z, cell.height / 2, .98, .98, cell.height, stairMat, 'stairs');
    add(x, z, cell.height - .025, .98, .98, .05, gold, 'stair-trim');
  }
  const centerX = baseX + 8, centerZ = baseY + 6;
  // Fantasy gabled roof: distinct volume instead of a monolithic floating plane.
  const slope = Math.atan2(2.2, 6.2);
  const northern = add(centerX, centerZ - 3.04, 9.05, 16.7, 6.9, .18, roof, 'roof');
  northern.rotation.x = slope;
  const southern = add(centerX, centerZ + 3.04, 9.05, 16.7, 6.9, .18, roof, 'roof');
  southern.rotation.x = -slope;
  const ridge = add(centerX, centerZ, 10.18, 16.7, .28, .27, gold, 'roof');
  roofMeshes.push(northern, southern, ridge);

  function updateVisibility(playerX: number, playerY: number, height: number, cameraPosition: any): void {
    const inside = playerX >= baseX && playerX < baseX + HOUSE16.width
      && playerY >= baseY && playerY < baseY + HOUSE16.depth;
    const cameraX = cameraPosition.x - centerX, cameraZ = cameraPosition.z - centerZ;
    for (const { mesh, level, x, y } of wallMeshes) {
      const face = (cameraX > 0 ? x === HOUSE16.x + 15 : x === HOUSE16.x)
        || (cameraZ > 0 ? y === HOUSE16.y + 11 : y === HOUSE16.y);
      mesh.visible = !(inside && face && (height < 3 ? level === 0 : level === 4));
    }
    // Upper floor remains on the second level and disappears on the ground
    // floor, excluding stairwell holes which were never built.
    for (const mesh of upperMeshes) mesh.visible = !inside || height >= 3;
    for (const mesh of roofMeshes) mesh.visible = !inside;
  }

  return {
    group, updateVisibility,
    dispose(): void {
      for (const geo of geometry) geo.dispose();
      for (const mat of materials) mat.dispose();
      for (const tex of textures) tex.dispose();
    },
  };
}
