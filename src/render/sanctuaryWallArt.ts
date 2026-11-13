import * as THREE from 'three';
import type { BlockId } from '../world/blocks';
import { wallNeighbors, type WallThickness } from '../world/walls';
import {
  capRect, doorPieceFor, frontRect, WALL_ART_CELL, WALL_ART_FRONT_H, WALL_DOOR_PIECES, WALL_FRONT_PIECES, wallArtBase, wallArtPiece,
  type AtlasRect, type WallDoorPiece, type WallFrontPiece,
} from './wallAtlas';
import { OBLIQUE_K } from './sanctuaryObliqueView';
import { WORLD_SCALE } from './worldScale';

/**
 * Paredes com a ARTE real (W3, ADR 0027): para cada parede, um plano horizontal (a tampa, `cap_XX` 128 × 128) à altura da parede e, onde
 * não há parede ao sul, um plano vertical (a frente) com a base na face sul da laje. Planos instanciados por peça (20 por material).
 *
 * Medidas em células (arte de 128 px por célula): a tampa fica à altura `WORLD_SCALE.wall` (1,2; K = 1 ⇒ 154 px na tela); a face sul da
 * laje está em z = (1 + z)/2 da célula e a frente sobe 154/128 = 1,2. A tampa e a frente se encontram na tela exatamente como no gabarito.
 * Só desenho: colisão e regras vivem no `World`. O `pick` usa as malhas (a célula inteira conta como parede).
 */
const WALL_HEIGHT = WORLD_SCALE.wall / OBLIQUE_K;

export interface WallArtGroup {
  group: THREE.Group;
  /** Estado (id do bloco) de cada porta de parede encontrada, por "x,y": o renderer compara entre refeitas para animar. */
  doors: Map<string, BlockId>;
  /** Malhas clicáveis; `userData.cells[instanceId]` = célula da instância. */
  meshes: THREE.InstancedMesh[];
  dispose(): void;
}

/** Textura de uma peça recortada do atlas (cópia em canvas: mipmaps sem sangrar entre peças vizinhas do atlas). */
function pieceTexture(atlas: HTMLImageElement, r: AtlasRect): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = r.w;
  c.height = r.h;
  c.getContext('2d')!.drawImage(atlas, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

interface Pieces { caps: THREE.CanvasTexture[]; fronts: Record<WallFrontPiece | WallDoorPiece, THREE.CanvasTexture> }

/**
 * Texturas das peças, materiais e geometrias compartilhados entre várias chamadas de `buildWallArt` (o Mundo monta as paredes por chunk:
 * sem isto cada chunk criaria as 23 texturas do material de novo). Quem cria o cache é dono dele e chama `dispose`.
 */
export class WallPieceCache {
  private readonly pieces = new Map<BlockId, Pieces>();
  private readonly materials = new Map<string, THREE.MeshBasicMaterial>();
  readonly capGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2); // +Y para cima; u para leste, v para norte (topo da textura = norte)
  readonly frontGeo = new THREE.PlaneGeometry(1, WALL_ART_FRONT_H / WALL_ART_CELL); // vertical, olhando para o sul (+Z)

  piecesFor(id: BlockId, atlas: HTMLImageElement): Pieces {
    let p = this.pieces.get(id);
    if (!p) {
      p = {
        caps: Array.from({ length: 16 }, (_, m) => pieceTexture(atlas, capRect(m))),
        fronts: Object.fromEntries([...WALL_FRONT_PIECES, ...WALL_DOOR_PIECES].map((f) => [f, pieceTexture(atlas, frontRect(f))])) as Pieces['fronts'],
      };
      this.pieces.set(id, p);
    }
    return p;
  }

  material(key: string, tex: THREE.Texture): THREE.MeshBasicMaterial {
    let m = this.materials.get(key);
    if (!m) this.materials.set(key, (m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide })));
    return m;
  }

  dispose(): void {
    for (const p of this.pieces.values()) for (const t of [...p.caps, ...Object.values(p.fronts)]) t.dispose();
    for (const m of this.materials.values()) m.dispose();
    this.capGeo.dispose();
    this.frontGeo.dispose();
    this.pieces.clear();
    this.materials.clear();
  }
}

export function buildWallArt(
  world: { isWallAt(x: number, y: number): boolean; getObject(x: number, y: number): BlockId },
  bounds: { x0: number; x1: number; y0: number; y1: number },
  atlases: ReadonlyMap<BlockId, HTMLImageElement>,
  thickness: WallThickness,
  /** Portas ("x,y") em animação: desenham o quadro intermediário. */
  halfDoors: ReadonlySet<string> = new Set(),
  /** Cache compartilhado (o chamador é o dono); sem ele, a chamada cria o seu e o libera em `dispose`. */
  shared?: WallPieceCache,
): WallArtGroup {
  const group = new THREE.Group();
  group.name = 'Paredes (arte)';
  const meshes: THREE.InstancedMesh[] = [];
  const cache = shared ?? new WallPieceCache();
  const frontH = WALL_ART_FRONT_H / WALL_ART_CELL;
  const { capGeo, frontGeo } = cache;
  const southFace = (1 + thickness.z) / 2;                            // z da face sul da laje, em células

  interface Instance { x: number; y: number; cell: { x: number; y: number } }
  const groups = new Map<string, { id: BlockId; kind: 'cap' | 'front'; piece: number | WallFrontPiece | WallDoorPiece; items: Instance[] }>();
  const doors = new Map<string, BlockId>();
  const add = (id: BlockId, kind: 'cap' | 'front', piece: number | WallFrontPiece | WallDoorPiece, x: number, y: number): void => {
    const key = `${id}:${kind}:${piece}`;
    let g = groups.get(key);
    if (!g) groups.set(key, (g = { id, kind, piece, items: [] }));
    g.items.push({ x, y, cell: { x, y } });
  };
  const isWallAt = (x: number, y: number): boolean => world.isWallAt(x, y);
  for (let y = bounds.y0; y <= bounds.y1; y++) {
    for (let x = bounds.x0; x <= bounds.x1; x++) {
      if (!isWallAt(x, y)) continue;
      const id = world.getObject(x, y);
      const base = wallArtBase(id); // a porta usa o atlas do material da parede
      if (!atlases.has(base)) continue;
      const doorKey = `${x},${y}`;
      const door = doorPieceFor(id, halfDoors.has(doorKey));
      if (door) doors.set(doorKey, id);
      const p = wallArtPiece(wallNeighbors(isWallAt, x, y), door);
      add(base, 'cap', p.cap, x, y);
      if (p.front) add(base, 'front', p.front, x, y);
    }
  }
  const dummy = new THREE.Object3D();
  for (const g of groups.values()) {
    const pc = cache.piecesFor(g.id, atlases.get(g.id)!);
    const tex = g.kind === 'cap' ? pc.caps[g.piece as number] : pc.fronts[g.piece as WallFrontPiece | WallDoorPiece];
    const mat = cache.material(`${g.id}:${g.kind}:${g.piece}`, tex);
    const mesh = new THREE.InstancedMesh(g.kind === 'cap' ? capGeo : frontGeo, mat, g.items.length);
    g.items.forEach((it, i) => {
      if (g.kind === 'cap') dummy.position.set(it.x + 0.5, WALL_HEIGHT, it.y + 0.5);
      else dummy.position.set(it.x + 0.5, frontH / 2, it.y + southFace);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.userData.cells = g.items.map((it) => it.cell);
    mesh.name = `Parede ${g.kind} ${g.piece}`;
    group.add(mesh);
    meshes.push(mesh);
  }
  return { group, doors, meshes, dispose() { if (!shared) cache.dispose(); } };
}
