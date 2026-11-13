import * as THREE from 'three';

/** Área do cômodo em células do mundo (inclusiva), como em `InteriorLayout.area`. */
export interface RoomArea { x0: number; y0: number; x1: number; y1: number }
export interface RoomView { id: string; area: RoomArea }

/** Fundo atrás do cômodo e cor do chão enquanto a arte não carrega (as mesmas do `Renderer` 2D). */
export const INTERIOR_BACKGROUND = '#120c18';
export const INTERIOR_FALLBACK = '#7a4a2a';

/** Área visível dentro do cômodo (células): só o que está dentro dele é desenhado — atores e itens. */
export function roomBounds(a: RoomArea): { x0: number; y0: number; x1: number; y1: number } {
  return { x0: a.x0, y0: a.y0, x1: a.x1 + 1, y1: a.y1 + 1 };
}

/**
 * Interior no 3D (ADR 0031, M4.1; ADR 0014): o cômodo continua isolado em coordenadas fixas e a arte pronta dele (a ilustração
 * 3/4 inteira, paredes e móveis incluídos) é estendida sobre o chão da área — na vista oblíqua K = 1 o chão ocupa a tela como no
 * 2D, então a imagem aparece igual — e os atores e itens ficam em pé por cima, pelo z-buffer. O resto do mundo é escondido
 * pelo renderer (sem céu, nuvens, noite nem partículas lá dentro).
 */
export class InteriorRoom {
  private readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly images = new Map<string, HTMLImageElement>();
  private readonly textures = new Map<string, THREE.Texture>();
  private disposed = false;
  private current: string | null = null;

  /**
   * @param urls arte por id de interior (`art().interiors`); carrega sob demanda, em segundo plano
   * @param createImage cria a imagem (o DOM; nos testes, uma falsa)
   */
  constructor(
    private readonly layer: THREE.Object3D,
    private readonly urls: Record<string, string | undefined>,
    private readonly createImage: () => HTMLImageElement = () => new Image(),
  ) {
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.rotateX(-Math.PI / 2); // chão; topo da imagem = norte
    this.mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: INTERIOR_FALLBACK }));
    this.mesh.visible = false;
    this.mesh.name = 'Interior: cômodo';
    this.mesh.frustumCulled = false;
    layer.add(this.mesh);
  }

  get visible(): boolean { return this.mesh.visible; }
  get currentId(): string | null { return this.current; }

  /** Mostra o cômodo (ou esconde, com null): posiciona o plano sobre a área e põe a arte quando já carregou. */
  update(room: RoomView | null): void {
    this.mesh.visible = !!room;
    this.current = room?.id ?? null;
    if (!room) return;
    const { x0, y0, x1, y1 } = room.area;
    const w = x1 + 1 - x0, h = y1 + 1 - y0;
    this.mesh.scale.set(w, 1, h);
    this.mesh.position.set(x0 + w / 2, 0.005, y0 + h / 2);
    const mat = this.mesh.material;
    const tex = this.textureFor(room.id);
    if (tex) {
      if (mat.map !== tex) { mat.map = tex; mat.color.set(0xffffff); mat.needsUpdate = true; }
    } else if (mat.map) { mat.map = null; mat.color.set(INTERIOR_FALLBACK); mat.needsUpdate = true; }
  }

  private textureFor(id: string): THREE.Texture | null {
    const cached = this.textures.get(id);
    if (cached) return cached;
    let img = this.images.get(id);
    if (!img) {
      const url = this.urls[id];
      if (!url) return null;
      img = this.createImage();
      img.src = url;
      this.images.set(id, img);
    }
    if (!(img.complete && img.naturalWidth)) return null;
    const t = new THREE.Texture(img);
    t.colorSpace = THREE.SRGBColorSpace;
    t.generateMipmaps = false;
    t.minFilter = THREE.LinearFilter;
    t.needsUpdate = true;
    this.textures.set(id, t);
    return t;
  }

  reupload(): void {
    for (const t of this.textures.values()) t.needsUpdate = true;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.layer.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    for (const t of this.textures.values()) t.dispose();
    this.textures.clear();
  }
}
