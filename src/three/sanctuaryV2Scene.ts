import * as THREE from 'three';
import { celestialFaces } from '../render/celestialArt';
import { sanctuaryV2Plan, type SanctuaryV2Cell } from './sanctuaryV2Plan';
import { SANCTUARY_V2_IDS, type SanctuaryV2Materials } from './sanctuaryV2Materials';

interface MeshData { positions: number[]; uvs: number[] }
const fresh = (): MeshData => ({ positions: [], uvs: [] });
const triangle = [0, 1, 2, 0, 2, 3];

function addQuad(dest: MeshData, vertices: number[][], uvs: number[][]): void {
  for (const i of triangle) {
    dest.positions.push(...vertices[i]);
    dest.uvs.push(...uvs[i]);
  }
}

function materialCanvas(id: number, anisotropy: number): any {
  const tex = new THREE.CanvasTexture(celestialFaces(id).top);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = Math.min(4, anisotropy);
  return tex;
}

/**
 * Independent preview meshes. Does not mutate World, chunk data or game saves.
 * One draw call per material/orientation: internal faces are removed, UVs are
 * aligned to world coordinates (4×4 cells per seamless texture period).
 */
export function buildSanctuaryV2Scene(
  worldX0: number,
  worldY0: number,
  library: SanctuaryV2Materials | null,
  anisotropy: number,
  excludedArea?: Readonly<{ x: number; y: number; width: number; depth: number }>,
): { group: any; cells: SanctuaryV2Cell[]; dispose(): void } {
  // Optional, temporary footprint reservation for the 16×12 building lab.
  // Existing four-sector plan is never mutated; when disabled all cells return.
  const cells = sanctuaryV2Plan().filter(cell => !excludedArea || cell.x < excludedArea.x
    || cell.x >= excludedArea.x + excludedArea.width
    || cell.y < excludedArea.y || cell.y >= excludedArea.y + excludedArea.depth);
  const index = new Map(cells.map((cell) => [cell.x + ',' + cell.y, cell]));
  const surfaces = new Map<string, MeshData>();
  const get = (id: number, face: string): MeshData => {
    const key = id + '/' + face;
    if (!surfaces.has(key)) surfaces.set(key, fresh());
    return surfaces.get(key)!;
  };
  const texPeriod = 4;
  for (const cell of cells) {
    const x = worldX0 + cell.x, z = worldY0 + cell.y;
    const base = cell.floating ? 3.5 : 0;
    const top = base + cell.height;
    // Identical artwork across every face, using the actual world UV position.
    addQuad(get(cell.top, 'top'),
      [[x, top, z], [x, top, z + 1], [x + 1, top, z + 1], [x + 1, top, z]],
      [[x / texPeriod, z / texPeriod], [x / texPeriod, (z + 1) / texPeriod],
        [(x + 1) / texPeriod, (z + 1) / texPeriod], [(x + 1) / texPeriod, z / texPeriod]]);
    const sides = [
      { dx: 0, dy: -1, face: 'ns', vertices: (bottom: number) => [
        [x + 1, bottom, z], [x, bottom, z], [x, top, z], [x + 1, top, z]],
        uv: (bottom: number) => [[(x + 1) / 4, bottom / 4], [x / 4, bottom / 4],
          [x / 4, top / 4], [(x + 1) / 4, top / 4]] },
      { dx: 0, dy: 1, face: 'ns', vertices: (bottom: number) => [
        [x, bottom, z + 1], [x + 1, bottom, z + 1], [x + 1, top, z + 1], [x, top, z + 1]],
        uv: (bottom: number) => [[x / 4, bottom / 4], [(x + 1) / 4, bottom / 4],
          [(x + 1) / 4, top / 4], [x / 4, top / 4]] },
      { dx: -1, dy: 0, face: 'ew', vertices: (bottom: number) => [
        [x, bottom, z], [x, bottom, z + 1], [x, top, z + 1], [x, top, z]],
        uv: (bottom: number) => [[z / 4, bottom / 4], [(z + 1) / 4, bottom / 4],
          [(z + 1) / 4, top / 4], [z / 4, top / 4]] },
      { dx: 1, dy: 0, face: 'ew', vertices: (bottom: number) => [
        [x + 1, bottom, z + 1], [x + 1, bottom, z], [x + 1, top, z], [x + 1, top, z + 1]],
        uv: (bottom: number) => [[(z + 1) / 4, bottom / 4], [z / 4, bottom / 4],
          [z / 4, top / 4], [(z + 1) / 4, top / 4]] },
    ];
    for (const side of sides) {
      const neighbor = index.get((cell.x + side.dx) + ',' + (cell.y + side.dy));
      const coverage = neighbor && Boolean(neighbor.floating) === Boolean(cell.floating)
        ? (neighbor.floating ? 3.5 : 0) + neighbor.height : base;
      const bottom = Math.max(base, coverage);
      if (bottom >= top) continue;
      addQuad(get(cell.side, side.face), side.vertices(bottom), side.uv(bottom));
    }
  }
  const group = new THREE.Group();
  group.name = 'Santuário V2 — 4 setores (somente prévia)';
  const owned: any[] = [];
  const byId = new Map<number, any>();
  for (const id of SANCTUARY_V2_IDS) {
    const tex = library?.textures.get(id) ?? materialCanvas(id, anisotropy);
    byId.set(id, tex);
    if (!library) owned.push(tex);
  }
  for (const [key, data] of surfaces) {
    if (!data.positions.length) continue;
    const [idString, face] = key.split('/');
    const id = Number(idString);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(data.uvs, 2));
    geometry.computeVertexNormals();
    const color = face === 'top' ? 0xffffff : face === 'ns' ? 0xc7cae1 : 0x9eafcf;
    const material = new THREE.MeshBasicMaterial({ map: byId.get(id), color, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.userData.sanctuaryLabV2 = true;
    group.add(mesh);
  }
  return {
    group,
    cells,
    dispose(): void {
      group.traverse((obj: any) => {
        if (!obj.isMesh) return;
        obj.geometry.dispose();
        obj.material.dispose();
      });
      for (const t of owned) t.dispose();
    },
  };
}
