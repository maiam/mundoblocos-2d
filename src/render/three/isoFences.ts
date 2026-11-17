import * as THREE from 'three';
import { CHUNK_SIZE } from '../../config';
import { Block, type BlockId, gateFence, isFence, isGate, isGateOpen, joinsFence } from '../../world/blocks';
import type { Chunk } from '../../world/chunk';
import type { ChunkRect } from '../../world/world';
import { gateIsSide } from '../fence';

/** Uma face do modelo: lista de vértices [x, y, z] em unidades do modelo (12 u = 1 célula; norte = −z; y para cima). */
export type ModelFace = number[][];
/** O modelo do Blockbench já extraído (`scripts/extract-iso-fence.py`): peças da cerca por nome e elementos do portão. */
export interface IsoFenceModel { fence: Record<string, ModelFace[]>; gate: { name: string; faces: ModelFace[] }[] }
/** Arte da cerca isométrica: o modelo e a imagem com as tábuas (6 quadrados em 1 linha: topo e frente de carvalho, bétula e cerejeira). */
export interface IsoFenceArt { model: IsoFenceModel; wood: HTMLImageElement }

export interface IsoFenceWorld {
  getChunk(cx: number, cy: number): Chunk | null | undefined;
  getLevel(x: number, y: number, level: number): BlockId;
}

/** Unidades do modelo por célula do jogo. */
const CELL = 12;
/** Eixo da dobradiça do portão (x do modelo) e ângulo aberto (rad); a folha gira para o norte, como o portão 2D. */
const HINGE_X = -5.1;
const OPEN_ANGLE = Math.PI / 2;
/** Velocidade de abrir/fechar (rad/s): 90° em ~0,35 s. */
const SWING_SPEED = OPEN_ANGLE / 0.35;
/** As travessas saem mais escuras que as estacas para se distinguirem delas (o mesmo tom da cerca 2D). */
const RAIL_TONE = 0.68;

type Wood = 0 | 1 | 2; // carvalho, bétula, cerejeira (a ordem das tábuas na imagem)
function woodOf(id: BlockId): Wood {
  const f = isGate(id) ? gateFence(id) : id;
  return f === Block.FENCE_BIRCH ? 1 : f === Block.FENCE_CHERRY ? 2 : 0;
}

/** Acumula faces em duas malhas (topo e laterais), com UV projetada pela posição (1 tábua = 1 célula) e o sombreado fixo pela direção da face. */
class Builder {
  private readonly top = { pos: [] as number[], uv: [] as number[], col: [] as number[] };
  private readonly side = { pos: [] as number[], uv: [] as number[], col: [] as number[] };

  /** `map` leva o vértice do modelo à posição final (modelo → célula); `shift` é subtraído só da posição (o eixo do pivô), nunca da UV. */
  add(faces: ModelFace[], map: (v: number[]) => number[], upright: boolean, tone = 1, shift: number[] = [0, 0, 0]): void {
    for (const face of faces) {
      const V = face.map(map);
      if (V.length < 3) continue;
      const [a, b, c] = V;
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l; ny /= l; nz /= l;
      const isTop = Math.abs(ny) > 0.6;
      const shade = (isTop ? 1.0 : Math.abs(nz) > Math.abs(nx) ? 0.9 : 0.74) * tone;
      const t = isTop ? this.top : this.side;
      for (let i = 1; i < V.length - 1; i++) {
        for (const v of [V[0], V[i], V[i + 1]]) {
          t.pos.push((v[0] - shift[0]) / CELL, (v[1] - shift[1]) / CELL, (v[2] - shift[2]) / CELL);
          t.col.push(shade, shade, shade);
          let h: number, w: number;
          if (isTop) { h = v[0]; w = -v[2]; } else if (Math.abs(nz) > Math.abs(nx)) { h = v[0]; w = v[1]; } else { h = v[2]; w = v[1]; }
          let u = h / CELL;
          w /= CELL;
          if (upright && !isTop) [u, w] = [w, -u];
          t.uv.push(u, w);
        }
      }
    }
  }

  /** Geometria com 2 grupos (0 = topo, 1 = laterais), na ordem dos materiais `[topo, lateral]`. */
  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    const pos = [...this.top.pos, ...this.side.pos];
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([...this.top.uv, ...this.side.uv], 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute([...this.top.col, ...this.side.col], 3));
    g.addGroup(0, this.top.pos.length / 3, 0);
    g.addGroup(this.top.pos.length / 3, this.side.pos.length / 3, 1);
    return g;
  }
}

const remap = (v: number, from0: number, from1: number, to0: number, to1: number): number => to0 + ((v - from0) * (to1 - to0)) / (from1 - from0);

interface Entry { x: number; y: number; id: BlockId; group: THREE.Group; picks: THREE.Mesh[]; leaf?: THREE.Object3D; key: string }
interface GateState { angle: number; target: number }

/**
 * Cercas e portões como **malhas 3D de verdade** na câmera isométrica do Santuário (ADR 0036, v0.93.142): o modelo do Blockbench
 * (`assets-src/cerca-betula/*.bbmodel`) com as tábuas das 3 madeiras, no lugar dos sprites 3/4 do Mundo (que só valem naquela vista).
 * Cada célula de cerca = a estaca no centro + meia travessa para cada vizinho que se emenda (cerca ou portão; a vizinha completa a outra metade);
 * o portão tem a folha numa dobradiça que gira (para o norte, 90°) ao abrir/fechar, e fica de lado quando as cercas vizinhas estão ao norte/sul.
 * As regras (bloquear, abrir) continuam no `World`; aqui é só aparência. Os chunks são varridos quando `chunk.version` (dele e dos vizinhos) muda.
 */
export class IsoFences {
  private readonly lists = new Map<string, { stamp: number; entries: Entry[] }>();
  private readonly geometries = new Map<string, THREE.BufferGeometry>();
  private readonly materials: THREE.MeshBasicMaterial[][] = []; // [madeira] → [topo, lateral]
  private readonly textures: THREE.CanvasTexture[] = [];
  private readonly angles = new Map<string, GateState>();
  private readonly gates: Entry[] = [];
  private pickables: THREE.Mesh[] = [];
  private dirty = true;

  constructor(private readonly scene: THREE.Object3D, private readonly world: IsoFenceWorld, private readonly art: IsoFenceArt) {
    const { wood } = art;
    const cell = wood.height; // tábuas quadradas, uma ao lado da outra
    const tile = (i: number): THREE.CanvasTexture => {
      const c = document.createElement('canvas');
      c.width = c.height = cell;
      c.getContext('2d')!.drawImage(wood, i * cell, 0, cell, cell, 0, 0, cell, cell);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.magFilter = t.minFilter = THREE.NearestFilter;
      t.generateMipmaps = false;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      this.textures.push(t);
      return t;
    };
    for (let w = 0; w < 3; w++) {
      const mk = (map: THREE.Texture) => new THREE.MeshBasicMaterial({ map, vertexColors: true, side: THREE.DoubleSide });
      this.materials.push([mk(tile(w * 2)), mk(tile(w * 2 + 1))]);
    }
  }

  // ---- geometria ----

  private fenceGeometry(wood: Wood, mask: number): THREE.BufferGeometry {
    const key = `f${wood}:${mask}`;
    let g = this.geometries.get(key);
    if (g) return g;
    const m = this.art.model.fence;
    const b = new Builder();
    b.add(m['Frente 3'], (v) => v, true); // a estaca (4 × 17 u) no centro da célula
    const railsH = [m['Frontal 2 | nível 5'], m['Frontal 2 | nível 12']];   // x de −10 a −2
    const railsV = [m['Retorno 1 | nível 5'], m['Retorno 1 | nível 12']];   // z de −10 a −2, em x = 24
    for (const r of railsH) {
      if (mask & 8) b.add(r, (v) => [remap(v[0], -10, -2, -6, 0), v[1], v[2]], false, RAIL_TONE); // oeste
      if (mask & 2) b.add(r, (v) => [remap(v[0], -10, -2, 0, 6), v[1], v[2]], false, RAIL_TONE);  // leste
    }
    for (const r of railsV) {
      if (mask & 1) b.add(r, (v) => [v[0] - 24, v[1], remap(v[2], -10, -2, -6, 0)], false, RAIL_TONE); // norte
      if (mask & 4) b.add(r, (v) => [v[0] - 24, v[1], remap(v[2], -10, -2, 0, 6)], false, RAIL_TONE);  // sul
    }
    g = b.build();
    this.geometries.set(key, g);
    return g;
  }

  /** O portão: `fixed` (estacas e dobradiças) e `leaf` (a folha, com a origem na dobradiça). */
  private gateGeometry(part: 'fixed' | 'leaf'): THREE.BufferGeometry {
    const key = `g:${part}`;
    let g = this.geometries.get(key);
    if (g) return g;
    const b = new Builder();
    const id = (v: number[]) => v;
    for (const e of this.art.model.gate) {
      const n = e.name;
      if (n.startsWith('Frente estaca')) { if (part === 'fixed') b.add(e.faces, id, true, 1); }
      else if (n.startsWith('Dobradi')) { if (part === 'fixed') b.add(e.faces, id, false, 0.3); }
      else if (part === 'leaf') {
        const shift = [HINGE_X, 0, 0];
        if (n.startsWith('Fecho')) b.add(e.faces, id, false, 0.3, shift);
        else if (n.startsWith('Cora')) b.add(e.faces, id, false, 0.55, shift);
        else if (n.startsWith('Frente tábua')) b.add(e.faces, id, true, 0.85, shift);
        else if (n.startsWith('Frente montante')) b.add(e.faces, id, true, 0.68, shift);
        else if (n.startsWith('Travessa')) b.add(e.faces, id, false, 0.68, shift);
      }
    }
    g = b.build();
    this.geometries.set(key, g);
    return g;
  }

  // ---- cena ----

  private make(x: number, y: number, id: BlockId): Entry {
    const wood = woodOf(id);
    const mats = this.materials[wood];
    const group = new THREE.Group();
    group.position.set(x + 0.5, 0, y + 0.5);
    group.name = isGate(id) ? 'Santuário: portão 3D' : 'Santuário: cerca 3D';
    const picks: THREE.Mesh[] = [];
    const cellKey = `${x},${y}`;
    let leaf: THREE.Object3D | undefined;
    let key = '';
    if (isGate(id)) {
      const join = (dx: number, dy: number) => joinsFence(this.world.getLevel(x + dx, y + dy, 0));
      const side = gateIsSide(join);
      group.rotation.y = side ? -Math.PI / 2 : 0; // de lado: a dobradiça fica ao norte e a folha abre para leste
      const fixed = new THREE.Mesh(this.gateGeometry('fixed'), mats);
      const pivot = new THREE.Group();
      pivot.position.set(HINGE_X / CELL, 0, 0);
      const leafMesh = new THREE.Mesh(this.gateGeometry('leaf'), mats);
      pivot.add(leafMesh);
      group.add(fixed, pivot);
      leaf = pivot;
      picks.push(fixed, leafMesh);
      const target = isGateOpen(id) ? OPEN_ANGLE : 0;
      const st = this.angles.get(cellKey) ?? { angle: target, target };
      st.target = target;
      this.angles.set(cellKey, st);
      pivot.rotation.y = st.angle;
      key = `g${wood}${side ? 's' : ''}`;
    } else {
      const j = (dx: number, dy: number) => (joinsFence(this.world.getLevel(x + dx, y + dy, 0)) ? 1 : 0);
      const mask = j(0, -1) | (j(1, 0) << 1) | (j(0, 1) << 2) | (j(-1, 0) << 3);
      const mesh = new THREE.Mesh(this.fenceGeometry(wood, mask), mats);
      group.add(mesh);
      picks.push(mesh);
      key = `f${wood}:${mask}`;
    }
    for (const m of picks) m.userData.cell = { x, y };
    this.scene.add(group);
    return { x, y, id, group, picks, leaf, key };
  }

  private release(e: Entry): void {
    this.scene.remove(e.group);
    const i = this.gates.indexOf(e);
    if (i >= 0) this.gates.splice(i, 1);
  }

  private stampOf(cx: number, cy: number): number {
    let s = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += (this.world.getChunk(cx + dx, cy + dy)?.version ?? 0) * 31 + 1;
    return s;
  }

  update(rect: ChunkRect, dt: number): void {
    const keep = new Set<string>();
    for (let cy = rect.cy0; cy <= rect.cy1; cy++) {
      for (let cx = rect.cx0; cx <= rect.cx1; cx++) {
        const chunk = this.world.getChunk(cx, cy);
        if (!chunk) continue;
        const key = cx + ',' + cy;
        keep.add(key);
        const stamp = this.stampOf(cx, cy);
        const old = this.lists.get(key);
        if (old && old.stamp === stamp) continue;
        if (old) for (const e of old.entries) this.release(e);
        const entries: Entry[] = [];
        for (let ly = 0; ly < CHUNK_SIZE; ly++) {
          for (let lx = 0; lx < CHUNK_SIZE; lx++) {
            const x = cx * CHUNK_SIZE + lx, y = cy * CHUNK_SIZE + ly;
            const id = this.world.getLevel(x, y, 0);
            if (!isFence(id) && !isGate(id)) continue;
            const e = this.make(x, y, id);
            entries.push(e);
            if (e.leaf) this.gates.push(e);
          }
        }
        this.lists.set(key, { stamp, entries });
        this.dirty = true;
      }
    }
    for (const [key, list] of this.lists) {
      if (keep.has(key)) continue;
      for (const e of list.entries) this.release(e);
      this.lists.delete(key);
      this.dirty = true;
    }
    // abre/fecha: o ângulo de cada portão persegue o alvo (o estado vive por célula, então um portão refeito continua a animação)
    for (const e of this.gates) {
      const st = this.angles.get(`${e.x},${e.y}`);
      if (!st || !e.leaf || st.angle === st.target) continue;
      const step = SWING_SPEED * dt;
      st.angle = Math.abs(st.target - st.angle) <= step ? st.target : st.angle + Math.sign(st.target - st.angle) * step;
      e.leaf.rotation.y = st.angle;
    }
    if (this.dirty) {
      this.pickables = [...this.lists.values()].flatMap((l) => l.entries.flatMap((e) => e.picks));
      this.dirty = false;
    }
  }

  /** Malhas para o raio de seleção (cada uma leva `userData.cell`). */
  meshes(): THREE.Mesh[] { return this.pickables; }

  cellOf(object: THREE.Object3D): { x: number; y: number } | undefined {
    return object.userData.cell as { x: number; y: number } | undefined;
  }

  get count(): number { return this.lists.size ? [...this.lists.values()].reduce((n, l) => n + l.entries.length, 0) : 0; }

  dispose(): void {
    for (const l of this.lists.values()) for (const e of l.entries) this.release(e);
    this.lists.clear();
    for (const g of this.geometries.values()) g.dispose();
    this.geometries.clear();
    for (const ms of this.materials) for (const m of ms) m.dispose();
    for (const t of this.textures) t.dispose();
  }
}
