import * as THREE from 'three';
import { celestialFaces } from '../render/celestialArt';
import { FREE_BUILD, type FreeBuildFive } from './freeBuildFive';
import { SANCTUARY_V2_IDS, type SanctuaryV2Materials } from './sanctuaryV2Materials';

type FaceBuffer = { positions: number[]; uvs: number[] };
type FaceKind = 'top' | 'bottom' | 'ns' | 'ew';
const quad = [0, 1, 2, 0, 2, 3] as const;
const makeBuffer = (): FaceBuffer => ({ positions: [], uvs: [] });
function addFace(buffer: FaceBuffer, corners: number[][], uv: number[][]): void {
  for (const i of quad) { buffer.positions.push(...corners[i]); buffer.uvs.push(...uv[i]); }
}

/** Full 3D cubes, with covered internal faces omitted; UVs align across adjacent tiles. */
export function renderFreeBuildFive(
  data: FreeBuildFive,
  worldX0: number,
  worldY0: number,
  library: SanctuaryV2Materials | null,
  anisotropy: number,
): { group: any; dispose(): void } {
  const group = new THREE.Group();
  group.name = 'Santuário: construção manual 5 níveis, blocos adjacentes';
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
    const image = celestialFaces(id).top;
    const texture = new THREE.CanvasTexture(image);
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
    const id = cell.id, u = x / 4, v = z / 4, w = (x + 1) / 4, t = (z + 1) / 4;
    if (!data.get(cell.x, cell.y, cell.z + 1)) {
      addFace(buffer(id, 'top'), [[x,y+1,z],[x,y+1,z+1],[x+1,y+1,z+1],[x+1,y+1,z]],
        [[u,v],[u,t],[w,t],[w,v]]);
    }
    if (cell.z > 0 && !data.get(cell.x, cell.y, cell.z - 1)) {
      addFace(buffer(id, 'bottom'), [[x,y,z+1],[x,y,z],[x+1,y,z],[x+1,y,z+1]],
        [[u,t],[u,v],[w,v],[w,t]]);
    }
    if (!data.get(cell.x, cell.y-1, cell.z))
      addFace(buffer(id, 'ns'), [[x+1,y,z],[x,y,z],[x,y+1,z],[x+1,y+1,z]],
        [[w,y/4],[u,y/4],[u,(y+1)/4],[w,(y+1)/4]]);
    if (!data.get(cell.x, cell.y+1, cell.z))
      addFace(buffer(id, 'ns'), [[x,y,z+1],[x+1,y,z+1],[x+1,y+1,z+1],[x,y+1,z+1]],
        [[u,y/4],[w,y/4],[w,(y+1)/4],[u,(y+1)/4]]);
    if (!data.get(cell.x-1, cell.y, cell.z))
      addFace(buffer(id, 'ew'), [[x,y,z],[x,y,z+1],[x,y+1,z+1],[x,y+1,z]],
        [[v,y/4],[t,y/4],[t,(y+1)/4],[v,(y+1)/4]]);
    if (!data.get(cell.x+1, cell.y, cell.z))
      addFace(buffer(id, 'ew'), [[x+1,y,z+1],[x+1,y,z],[x+1,y+1,z],[x+1,y+1,z+1]],
        [[t,y/4],[v,y/4],[v,(y+1)/4],[t,(y+1)/4]]);
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
    const color = kind === 'top' ? 0xffffff : kind === 'ns' ? 0xc7cae1 : kind === 'ew' ? 0x9eafcf : 0xb0b0ca;
    const material = new THREE.MeshBasicMaterial({ map: map(Number(idStr)), color, side: THREE.DoubleSide });
    materials.push(material);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.freeBuildFive = true;
    mesh.frustumCulled = false;
    group.add(mesh);
  }
  // Guide grid at the active editing layer, never stored as voxel content.
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
