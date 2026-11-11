import * as THREE from 'three';
import { celestialFaces } from '../render/celestialArt';
import { FREE_BUILD, type FreeBuildFive, type FreeBuildVoxel } from './freeBuildFive';
import { HORIZONTAL_WALL_THICKNESS, horizontalWallShape, horizontalWallZBounds } from './adaptiveHorizontalWalls';
import { SANCTUARY_V2_IDS, type SanctuaryV2Materials } from './sanctuaryV2Materials';

type FaceBuffer = { positions: number[]; uvs: number[]; cells: FreeBuildVoxel[] };
type FaceKind = 'top' | 'bottom' | 'ns' | 'ew' | 'cap';
const quad = [0, 1, 2, 0, 2, 3] as const;
const makeBuffer = (): FaceBuffer => ({ positions: [], uvs: [], cells: [] });
function addFace(buffer: FaceBuffer, corners: number[][], uv: number[][], cell: FreeBuildVoxel): void {
  for (const i of quad) { buffer.positions.push(...corners[i]); buffer.uvs.push(...uv[i]); }
  // BufferGeometry is non-indexed: two triangles per quad. Used for precise
  // selection even when a thin face lies inside its logical voxel.
  buffer.cells.push(cell, cell);
}

/**
 * Ephemeral five-level editor mesh. When enabled, only horizontal stone/marble
 * runs become thin; columns, 2x2 masses, clouds and all other modes stay solid.
 * Actual voxel coordinates, material IDs and save format are never modified.
 */
export function renderFreeBuildFive(
  data: FreeBuildFive,
  worldX0: number,
  worldY0: number,
  library: SanctuaryV2Materials | null,
  anisotropy: number,
  adaptiveWalls = false,
): { group: any; dispose(): void } {
  const group = new THREE.Group();
  group.name = 'Santuário: construção livre 5 níveis e paredes horizontais experimentais';
  const faceBuffers = new Map<string, FaceBuffer>();
  const buffer = (id: number, kind: FaceKind): FaceBuffer => {
    const key = id + '/' + kind;
    let value = faceBuffers.get(key);
    if (!value) { value = makeBuffer(); faceBuffers.set(key, value); }
    return value;
  };
  const textures: any[] = [];
  const getTexture = (id: number): any => {
    const uploaded = library?.textures.get(id);
    if (uploaded) return uploaded;
    const texture = new THREE.CanvasTexture(celestialFaces(id).top);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = Math.min(4, anisotropy);
    textures.push(texture);
    return texture;
  };
  const textureMap = new Map<number, any>();
  const map = (id: number) => {
    if (!textureMap.has(id)) textureMap.set(id, getTexture(id));
    return textureMap.get(id);
  };

  for (const cell of data.list()) {
    const x = worldX0 + cell.x, y = cell.z, z = worldY0 + cell.y;
    const id = cell.id;
    const thin = horizontalWallShape(data, cell, adaptiveWalls) === 'thin';
    // In the superior camera the player's visible front edge is +Z. Keep
    // that face flush with the columns and remove depth only towards -Z.
    const { rearZ: frontZ, frontZ: backZ } = horizontalWallZBounds(z, thin);
    const u = x / 4, w = (x + 1) / 4;
    const uvTop = (a: number, b: number) => [[u,a/4],[u,b/4],[w,b/4],[w,a/4]];
    const uvFront = [[w,y/4],[u,y/4],[u,(y+1)/4],[w,(y+1)/4]];
    const uvBack = [[u,y/4],[w,y/4],[w,(y+1)/4],[u,(y+1)/4]];
    const uvSide = (a: number, b: number) => [[a/4,y/4],[b/4,y/4],[b/4,(y+1)/4],[a/4,(y+1)/4]];

    // When a thin panel sits on a solid block, reveal only the rear half of its top.
    const above = data.get(cell.x, cell.y, cell.z + 1);
    const aboveThin = above && horizontalWallShape(data, above, adaptiveWalls) === 'thin';
    const addTop = (a: number, b: number) => addFace(buffer(id, 'top'),
      [[x,y+1,a],[x,y+1,b],[x+1,y+1,b],[x+1,y+1,a]], uvTop(a,b), cell);
    if (!above) addTop(frontZ, backZ);
    else if (!thin && aboveThin) {
      // The panel above covers only the FRONT half of this solid block.
      addTop(z, z + 1 - HORIZONTAL_WALL_THICKNESS);
    }

    const below = cell.z > 0 ? data.get(cell.x, cell.y, cell.z - 1) : undefined;
    const belowThin = below && horizontalWallShape(data, below, adaptiveWalls) === 'thin';
    const addBottom = (a: number, b: number) => addFace(buffer(id, 'bottom'),
      [[x,y,b],[x,y,a],[x+1,y,a],[x+1,y,b]],
      [[u,b/4],[u,a/4],[w,a/4],[w,b/4]], cell);
    if (cell.z > 0 && !below) addBottom(frontZ, backZ);
    else if (cell.z > 0 && !thin && belowThin) {
      addBottom(z, z + 1 - HORIZONTAL_WALL_THICKNESS);
    }

    // North/south neighbours occupy the full depth, so the horizontal panel
    // condition explicitly prohibits them. Other blocks retain old culling.
    if (!data.get(cell.x, cell.y-1, cell.z)) addFace(buffer(id, 'ns'),
      [[x+1,y,frontZ],[x,y,frontZ],[x,y+1,frontZ],[x+1,y+1,frontZ]],
      uvFront, cell);
    if (!data.get(cell.x, cell.y+1, cell.z)) addFace(buffer(id, 'ns'),
      [[x,y,backZ],[x+1,y,backZ],[x+1,y+1,backZ],[x,y+1,backZ]],
      uvBack, cell);

    const addLeft = (a: number, b: number) => addFace(buffer(id, 'ew'),
      [[x,y,a],[x,y,b],[x,y+1,b],[x,y+1,a]], uvSide(a,b), cell);
    const addRight = (a: number, b: number) => addFace(buffer(id, 'ew'),
      [[x+1,y,b],[x+1,y,a],[x+1,y+1,a],[x+1,y+1,b]],
      uvSide(b,a), cell);
    const left = data.get(cell.x - 1, cell.y, cell.z);
    const right = data.get(cell.x + 1, cell.y, cell.z);
    if (!left) addLeft(frontZ, backZ);
    else if (!thin && horizontalWallShape(data, left, adaptiveWalls) === 'thin') {
      addLeft(z, z + 1 - HORIZONTAL_WALL_THICKNESS);
    }
    if (!right) addRight(frontZ, backZ);
    else if (!thin && horizontalWallShape(data, right, adaptiveWalls) === 'thin') {
      addRight(z, z + 1 - HORIZONTAL_WALL_THICKNESS);
    }

    // Thin stone wall gets a small deliberately raised top rim. Its world UVs
    // line up along the entire run; no special sprites or per-length mesh.
    if (thin && !above) {
      const lip = 0.045, capY = y + 1.035;
      // Cap may overhang the rear edge, never the aligned front face.
      const a = frontZ - lip, b = backZ;
      addFace(buffer(id, 'cap'),
        [[x,capY,a],[x,capY,b],[x+1,capY,b],[x+1,capY,a]], uvTop(a,b), cell);
      const capFrontUV = [[w,y/4],[u,y/4],[u,(y+0.035)/4],[w,(y+0.035)/4]];
      const capBackUV = [[u,y/4],[w,y/4],[w,(y+0.035)/4],[u,(y+0.035)/4]];
      addFace(buffer(id, 'cap'),
        [[x+1,y+1,a],[x,y+1,a],[x,capY,a],[x+1,capY,a]], capFrontUV, cell);
      addFace(buffer(id, 'cap'),
        [[x,y+1,b],[x+1,y+1,b],[x+1,capY,b],[x,capY,b]], capBackUV, cell);
    }
  }
  const geometries: any[] = [], materials: any[] = [];
  for (const [key, face] of faceBuffers) {
    if (!face.positions.length) continue;
    const [idStr, kind] = key.split('/');
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(face.positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(face.uvs, 2));
    geometry.computeVertexNormals();
    geometries.push(geometry);
    const color = kind === 'top' ? 0xffffff : kind === 'cap' ? 0xf7edd8
      : kind === 'ns' ? 0xc7cae1 : kind === 'ew' ? 0x9eafcf : 0xb0b0ca;
    const material = new THREE.MeshBasicMaterial({ map: map(Number(idStr)), color, side: THREE.DoubleSide });
    materials.push(material);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.freeBuildFive = true;
    mesh.userData.freeBuildCells = face.cells;
    mesh.frustumCulled = false;
    group.add(mesh);
  }
  const grid = new THREE.GridHelper(FREE_BUILD.width, FREE_BUILD.width, 0xf4d995, 0xafa8d0);
  grid.position.set(worldX0 + FREE_BUILD.x + FREE_BUILD.width/2, 0.015,
    worldY0 + FREE_BUILD.y + FREE_BUILD.depth/2);
  grid.scale.z = FREE_BUILD.depth / FREE_BUILD.width;
  grid.userData.freeBuildGuide = true;
  group.add(grid);

  return {
    group,
    dispose(): void {
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      for (const texture of textures) texture.dispose();
      grid.geometry.dispose();
      if (Array.isArray(grid.material)) grid.material.forEach((m: any) => m.dispose());
      else grid.material.dispose();
    },
  };
}

export function freeBuildMaterialIds(): readonly number[] { return SANCTUARY_V2_IDS; }
