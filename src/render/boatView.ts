import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Botes do Orvalis (ADR 0137): três modelos estáticos do pacote (casco, bancos e remos em malhas separadas, textura das tábuas embutida, proa em −Z, origem no centro do casco, Y para cima), um por madeira.
 * O molde de cada madeira é carregado uma vez; cada bote é um clone (geometria e textura compartilhadas) posto na posição e no giro do bote. O material é o da luz do dia do Titã, de filtro vizinho mais próximo, sem luzes
 * de cena; a geometria ganha os atributos `color` (sombreado fixo por face) e `glow` (zero) que o `patchDayLight` espera. Sem DOM além do GLTFLoader.
 */
export interface BoatDraw { kind: number; x: number; y: number; z: number; yaw: number }

const shadeOf = (nx: number, ny: number, nz: number): number => (ny > 0.5 ? 1 : ny < -0.5 ? 0.55 : nx > 0.5 ? 0.88 : nx < -0.5 ? 0.7 : nz > 0.5 ? 0.8 : 0.74);

/** Carrega um GLB de bote e o prepara com `material` (recebe a textura embutida). */
export async function loadBoatTemplate(url: string, material: (map: THREE.Texture | null) => THREE.Material): Promise<THREE.Group> {
  const gltf = await new GLTFLoader().loadAsync(url);
  const cache = new Map<THREE.Material, THREE.Material>();
  gltf.scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const src = m.material as THREE.MeshStandardMaterial;
    let mat = cache.get(src);
    if (!mat) { const map = src.map; if (map) { map.magFilter = THREE.NearestFilter; map.minFilter = THREE.NearestFilter; map.generateMipmaps = false; map.needsUpdate = true; } mat = material(map ?? null); cache.set(src, mat); }
    m.material = mat;
    const g = m.geometry, nrm = g.getAttribute('normal'), n = g.getAttribute('position').count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const s = nrm ? shadeOf(nrm.getX(i), nrm.getY(i), nrm.getZ(i)) : 1; col.set([s, s, s], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('glow', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  });
  return gltf.scene;
}

export class BoatView {
  private readonly templates: Array<THREE.Group | null>;
  private loading = false;
  private readonly live: THREE.Group[] = [];
  private last: readonly BoatDraw[] = [];

  constructor(private readonly scene: THREE.Scene, private readonly urls: readonly string[], private readonly material: (map: THREE.Texture | null) => THREE.Material) {
    this.templates = urls.map(() => null);
  }

  /** Desenha a lista (madeira, posição e giro de cada bote); carrega os modelos na primeira vez que há bote. */
  set(list: readonly BoatDraw[]): void {
    this.last = list;
    if (!list.length && !this.live.length) return;
    if (list.length && !this.loading) {
      this.loading = true;
      this.urls.forEach((u, i) => { loadBoatTemplate(u, this.material).then((t) => { this.templates[i] = t; this.set(this.last); }, (e) => console.warn('Orvalis: modelo do bote não carregou', e)); });
    }
    while (this.live.length > list.length) this.scene.remove(this.live.pop()!);
    list.forEach((b, i) => {
      const tpl = this.templates[b.kind];
      let g = this.live[i];
      if (!tpl) { if (g) g.visible = false; return; }
      if (!g || g.userData.kind !== b.kind) {
        if (g) this.scene.remove(g);
        g = tpl.clone(true); g.userData.kind = b.kind; g.frustumCulled = false;
        g.traverse((o) => { o.frustumCulled = false; });
        this.scene.add(g); this.live[i] = g;
      }
      g.visible = true;
      g.position.set(b.x, b.y, b.z);
      g.rotation.y = b.yaw;
    });
  }

  dispose(): void { for (const g of this.live) this.scene.remove(g); this.live.length = 0; }
}
