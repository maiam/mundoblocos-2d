import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { FreeBuildFive } from './freeBuildFive';
import { renderFreeBuildFive } from './freeBuildFiveScene';
import type { SanctuaryV2Materials } from './sanctuaryV2Materials';

type Point = [number, number, number];
type Triangle = { cell: {x:number;y:number;z:number}; points: [Point,Point,Point] };
function allTriangles(group: any): Triangle[] {
  const triangles: Triangle[] = [];
  group.traverse((mesh: any) => {
    const cells = mesh.userData?.freeBuildCells as Triangle['cell'][] | undefined;
    if (!cells) return;
    const positions = mesh.geometry.getAttribute('position');
    for (let triangle = 0; triangle < cells.length; triangle++) {
      const points = [0,1,2].map(v => {
        const i = triangle * 3 + v;
        return [positions.getX(i), positions.getY(i), positions.getZ(i)] as Point;
      }) as [Point,Point,Point];
      triangles.push({ cell: cells[triangle], points });
    }
  });
  return triangles;
}
function zRange(triangles: Triangle[]): [number, number] {
  const coordinates = triangles.flatMap(tr => tr.points.map(p => p[2]));
  return [Math.min(...coordinates), Math.max(...coordinates)];
}

describe('Santuário — malha de parede com frente alinhada aos pilares', () => {

  it('renders a visible door leaf on a full-depth pillar and joins thin stone neighbors', () => {
    const ed = new FreeBuildFive();
    for (let x = 33; x <= 37; x++) ed.set(x, 12, 0, 84);
    ed.remove(35, 12, 0);
    ed.setDoor(35, 12, 0, 84);
    const texture = new THREE.Texture();
    const kit: SanctuaryV2Materials = {
      textures: new Map([[84, texture]]), seams: new Map(),
      dispose() { texture.dispose(); },
    };
    const scene = renderFreeBuildFive(ed, 0, 0, kit, 1, true);
    try {
      const triangles = allTriangles(scene.group);
      const door = triangles.filter(t => t.cell.x === 35 && t.cell.y === 12);
      const sideWall = triangles.filter(t => t.cell.x === 34 && t.cell.y === 12);
      expect(zRange(sideWall)[0]).toBeGreaterThan(12.4);
      // The door cell remains a full pillar even surrounded by identical stone.
      expect(zRange(door)[0]).toBe(12);
      // Its wood panel remains accessible by the same raycast-to-voxel mapping.
      const leaf = scene.group.children.find((mesh: any) =>
        mesh.material?.color?.getHex?.() === 0x805039);
      expect(leaf).toBeDefined();
      expect(leaf.userData.freeBuildCells).toContainEqual(
        expect.objectContaining({ x: 35, y: 12, kind: 'door' }),
      );
    } finally {
      scene.dispose();
      kit.dispose();
    }
  });

  it('keeps the stone panel front flush at +Z and removes only the rear half', () => {
    const ed = new FreeBuildFive();
    for (let x = 33; x <= 35; x++) expect(ed.set(x, 12, 0, 84).ok).toBe(true);

    // Avoid browser CanvasTexture in Vitest: the renderer uses the supplied
    // material texture and still builds the actual production Three.js meshes.
    const texture = new THREE.Texture();
    const kit: SanctuaryV2Materials = {
      textures: new Map([[84, texture]]),
      seams: new Map(),
      dispose() { texture.dispose(); },
    };
    const scene = renderFreeBuildFive(ed, 0, 0, kit, 1, true);
    try {
      const triangles = allTriangles(scene.group);
      const wall = triangles.filter(tr => tr.cell.x === 34 && tr.cell.y === 12);
      const leftColumn = triangles.filter(tr => tr.cell.x === 33 && tr.cell.y === 12);
      expect(wall.length).toBeGreaterThan(0);
      expect(leftColumn.length).toBeGreaterThan(0);

      // Top trim can protrude toward the REAR, not toward the visible front.
      const [wallRear, wallFront] = zRange(wall);
      expect(wallRear).toBeGreaterThan(12.4);
      expect(wallFront).toBe(13);
      const [columnRear, columnFront] = zRange(leftColumn);
      expect(columnRear).toBe(12);
      expect(columnFront).toBe(wallFront);

      // The actual front facade of both wall and pillar is at exactly Z=13.
      const frontTriangles = triangles.filter(tr =>
        (tr.cell.x === 33 || tr.cell.x === 34) && tr.points.every(p => p[2] === 13));
      expect(frontTriangles.some(tr => tr.cell.x === 33)).toBe(true);
      expect(frontTriangles.some(tr => tr.cell.x === 34)).toBe(true);

      // The column's exposed side is precisely the missing REAR half of
      // the thin middle voxel, not two separate bands on either side.
      const columnExposed = leftColumn.filter(tr =>
        tr.points.every(p => p[0] === 34) &&
        tr.points.some(p => p[2] === 12) &&
        tr.points.some(p => p[2] === 12.5));
      expect(columnExposed.length).toBe(2);
    } finally {
      scene.dispose();
      kit.dispose();
    }
  });
});
