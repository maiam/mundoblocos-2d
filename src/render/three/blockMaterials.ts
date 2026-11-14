import * as THREE from 'three';
import type { StageView } from './stage';

export type SurfaceMaterial = THREE.MeshLambertMaterial | THREE.MeshBasicMaterial;
/** Materiais de um bloco por face do `BoxGeometry` (+X, −X, +Y, −Y, +Z, −Z) e as texturas que os sustentam. */
export type BlockMaterialSet = { block: SurfaceMaterial[]; ground: SurfaceMaterial[]; textures: THREE.Texture[] };
/** Imagens de um bloco: topo, frente (cubo) e chão. Cada mundo fornece as suas (`celestialFaces` no Santuário). */
export type BlockFaces = {
  top: HTMLCanvasElement; front: HTMLCanvasElement; ground: HTMLCanvasElement;
  /** Mapa UV real, em ordem BoxGeometry: +X, -X, +Y, -Y, +Z, -Z. */
  cube?: [HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement];
};

/**
 * Cache de materiais por id de bloco (núcleo genérico, M1). Na vista oblíqua (K = 1) a frente do cubo é quadrada e usa a
 * mesma imagem do topo, escurecida (a arte 2D pinta essa frente fria à mão); a inclinada usa a imagem de frente e luz.
 */
export class BlockMaterials {
  private readonly cache = new Map<number, BlockMaterialSet>();

  constructor(
    private readonly view: StageView,
    private readonly faces: (id: number) => BlockFaces,
    private readonly gpu: THREE.WebGLRenderer,
  ) {}

  get(id: number): BlockMaterialSet {
    let cached = this.cache.get(id);
    if (cached) return cached;
    const faces = this.faces(id);
    const toTexture = (canvas: HTMLCanvasElement): THREE.CanvasTexture => {
      const t = new THREE.CanvasTexture(canvas);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = Math.min(4, this.gpu.capabilities.getMaxAnisotropy());
      return t;
    };
    if (faces.cube) {
      const textures = faces.cube.map(toTexture);
      const Mat = this.view === 'oblique' ? THREE.MeshBasicMaterial : THREE.MeshLambertMaterial;
      const block = textures.map(map => new Mat({ map, color: 0xffffff }));
      // O solo tem a mesma face superior, mas e' uma placa mais fina.
      cached = { block, ground: block, textures };
      this.cache.set(id, cached);
      return cached;
    }
    const top = toTexture(faces.top);
    const front = this.view === 'oblique' ? top : toTexture(faces.front);
    const ground = toTexture(faces.ground);
    const Mat = this.view === 'oblique' ? THREE.MeshBasicMaterial : THREE.MeshLambertMaterial;
    const topMaterial = new Mat({ map: top, color: 0xffffff });
    // Sem luz, topo e frente seriam a mesma imagem: a frente leva o escurecimento frio que a arte 2D pinta à mão.
    const sideMaterial = new Mat({ map: front, color: this.view === 'oblique' ? 0xc4c6dc : 0xffffff });
    const groundMaterial = new Mat({ map: ground, color: 0xffffff });
    cached = {
      block: [sideMaterial, sideMaterial, topMaterial, sideMaterial, sideMaterial, sideMaterial],
      ground: [sideMaterial, sideMaterial, groundMaterial, sideMaterial, sideMaterial, sideMaterial],
      textures: [top, front, ground],
    };
    this.cache.set(id, cached);
    return cached;
  }

  /** Recria o material de um bloco apos uma nova textura ser carregada. */
  invalidate(id: number): void {
    const group = this.cache.get(id);
    if (!group) return;
    for (const m of new Set([...group.block, ...group.ground])) m.dispose();
    for (const t of group.textures) t.dispose();
    this.cache.delete(id);
  }

  /** Contexto restaurado: reenvia as texturas de canvas à GPU. */
  reupload(): void {
    for (const group of this.cache.values()) for (const t of group.textures) t.needsUpdate = true;
  }

  dispose(): void {
    for (const group of this.cache.values()) {
      for (const m of new Set([...group.block, ...group.ground])) m.dispose();
      for (const t of group.textures) t.dispose();
    }
    this.cache.clear();
  }
}
