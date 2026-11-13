import * as THREE from 'three';
import { Block, type BlockId, isWall } from '../world/blocks';
import { DEFAULT_WALL_THICKNESS, type WallThickness, wallFootprintParts, wallNeighbors } from '../world/walls';
import { OBLIQUE_K } from './sanctuaryObliqueView';
import { WORLD_SCALE } from './worldScale';

/**
 * PROTÓTIPO das paredes (ADR 0027), com cores lisas, para ver o autotile antes da arte: cada parede é uma placa fina
 * (`WallThickness`: x = faixas, z = tampa) montada por `wallFootprint` — poste central mais um braço até a borda em cada lado com parede vizinha.
 * Por isso a frente só aparece no último bloco de uma fileira norte–sul (os demais mostram só a tampa) e a fileira
 * leste–oeste tem frente de célula inteira. A altura é `WORLD_SCALE.wall` (≈ 1,2 célula na tela).
 *
 * Só desenho: a colisão e as regras vivem no `World`. Será substituído pela arte (W1/W3). Ligado por `?paredes=autotile`.
 */
const WALL_HEIGHT = WORLD_SCALE.wall / OBLIQUE_K; // altura de mundo (K = 1: igual à altura na tela)

interface Palette { front: string; side: string; top: string; icon: string; trim: string }
const PALETTES: Record<number, Palette> = {
  [Block.WALL_PLANKS]: { front: '#b98a5e', side: '#8d6642', top: '#3f2c1d', icon: '#b98a5e', trim: '#a8764a' },
  [Block.WALL_STONE]: { front: '#a9a9b8', side: '#7d7d8c', top: '#35353f', icon: '#a9a9b8', trim: '#8f8fa0' },
};
const FALLBACK: Palette = { front: '#c0c0c0', side: '#909090', top: '#404040', icon: '#c0c0c0', trim: '#a0a0a0' };

/**
 * Tampa com franjas (referência Core Keeper): a coluna (barra norte–sul) tem `franja clara | miolo escuro | franja clara`; a fileira
 * (barra leste–oeste) tem uma franja clara na borda norte. Proporções medidas: franja ≈ 0,21 e miolo ≈ 0,58 da largura da coluna.
 */
export const CAP_TRIM = 0.21;
type CapOrientation = 'column' | 'row';

function capTexture(p: Palette, orientation: CapOrientation): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = p.top;
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = p.trim;
  const t = Math.round(64 * CAP_TRIM);
  if (orientation === 'column') {
    g.fillRect(0, 0, t, 64);
    g.fillRect(64 - t, 0, t, 64);
    // junta de tábua a cada célula (a textura cobre um braço: uma marca no meio)
    g.fillStyle = p.top;
    g.fillRect(0, 30, t, 4);
    g.fillRect(64 - t, 30, t, 4);
  } else {
    g.fillRect(0, 0, 64, Math.round(64 * 0.2)); // franja na borda norte (v = 1 no topo da textura da face +Y)
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  return tex;
}

/** Ícone provisório da hotbar (SVG em data URL: nada de ler canvas). */
export function wallPlaceholderIcon(id: BlockId): string {
  if (!isWall(id)) return '';
  const p = PALETTES[id] ?? FALLBACK;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="14" width="52" height="40" rx="4" fill="${p.front}" stroke="${p.side}" stroke-width="4"/><rect x="6" y="14" width="52" height="10" rx="3" fill="${p.top}"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface WallPrototype {
  group: THREE.Group;
  /** Malhas clicáveis (cada uma guarda a célula em `userData.cell`). */
  meshes: THREE.Mesh[];
  dispose(): void;
}

/** Monta as paredes da área dada. `isWallAt` e `idAt` vêm do `World` (o desenho só lê). */
export function buildWallPrototype(
  world: { isWallAt(x: number, y: number): boolean; getObject(x: number, y: number): BlockId },
  bounds: { x0: number; x1: number; y0: number; y1: number },
  thickness: WallThickness = DEFAULT_WALL_THICKNESS,
): WallPrototype {
  const group = new THREE.Group();
  group.name = 'Paredes (protótipo de autotile)';
  const meshes: THREE.Mesh[] = [];
  const materials = new Map<number, THREE.Material[]>();
  const geometries: THREE.BufferGeometry[] = [];
  const textures: THREE.Texture[] = [];
  const materialsFor = (id: BlockId, orientation: CapOrientation): THREE.Material[] => {
    const key = id * 2 + (orientation === 'column' ? 0 : 1);
    let m = materials.get(key);
    if (!m) {
      const p = PALETTES[id] ?? FALLBACK;
      const side = new THREE.MeshBasicMaterial({ color: p.side });
      const tex = capTexture(p, orientation);
      textures.push(tex);
      const top = new THREE.MeshBasicMaterial({ map: tex });
      const front = new THREE.MeshBasicMaterial({ color: p.front });
      m = [side, side, top, side, front, side]; // +X, -X, +Y (tampa), -Y, +Z (frente, sul), -Z
      materials.set(key, m);
    }
    return m;
  };
  const isWallAt = (x: number, y: number): boolean => world.isWallAt(x, y);
  for (let y = bounds.y0; y <= bounds.y1; y++) {
    for (let x = bounds.x0; x <= bounds.x1; x++) {
      if (!isWallAt(x, y)) continue;
      const id = world.getObject(x, y);
      const nb = wallNeighbors(isWallAt, x, y);
      for (const { kind, rect: r } of wallFootprintParts(nb, thickness)) {
        const geo = new THREE.BoxGeometry(r.x1 - r.x0, WALL_HEIGHT, r.z1 - r.z0);
        geometries.push(geo);
        // barras norte–sul (e o poste de uma coluna) levam a tampa de coluna; as leste–oeste, a de fileira
        const column = kind === 'n' || kind === 's' || (kind === 'post' && (nb.n || nb.s) && !(nb.e || nb.w));
        const mesh = new THREE.Mesh(geo, materialsFor(id, column ? 'column' : 'row'));
        mesh.position.set(x + (r.x0 + r.x1) / 2, WALL_HEIGHT / 2, y + (r.z0 + r.z1) / 2);
        mesh.userData.cell = { x, y };
        group.add(mesh);
        meshes.push(mesh);
      }
    }
  }
  return {
    group,
    meshes,
    dispose() {
      for (const g of geometries) g.dispose();
      for (const list of materials.values()) for (const m of new Set(list)) m.dispose();
      for (const t of textures) t.dispose();
    },
  };
}
