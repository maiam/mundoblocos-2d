import * as THREE from 'three';
import { hash2 } from '../../world/random';
import { FISH_MAX, FISH_SCALE, FISH_SCHOOL, FISH_SPECIES, type Fish, fishAlpha, fishYaw, newFish, pickSpecies, spawnPoint, stepFish } from '../fishSim';

/**
 * Peixes de ambiente no 3D (v0.93.92): um pool fixo de planos deitados sobre a água, cada um com a imagem do peixe girada para a direção em
 * que nada (a arte vem de uma direção só; o giro é em código, decisão do dono do produto). Nada é criado por quadro. A simulação é `fishSim.ts`.
 */
const SIDE = 1.7; // lado do quadro do peixe em células (o corpo ocupa ~85% dele)
const SPAWN_EVERY = 0.6; // s entre tentativas de nascer um cardume
const MAX_DIST = 26; // some se ficar a mais disso da câmera (células)

interface Slot { mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>; fish: Fish | null }

export class WaterFish {
  private readonly slots: Slot[] = [];
  private readonly geometry = new THREE.PlaneGeometry(1, 1);
  private readonly textures: Array<THREE.Texture | null>;
  private clock = 0;
  private counter = 0;

  constructor(scene: THREE.Object3D, private readonly seed: number, images: Map<string, HTMLImageElement>) {
    this.geometry.rotateX(-Math.PI / 2); // deitado: o topo da imagem aponta para o norte (−Z)
    this.textures = FISH_SPECIES.map((s) => {
      const img = images.get('water-fish-' + s);
      if (!img) return null;
      const t = new THREE.Texture(img);
      t.colorSpace = THREE.SRGBColorSpace;
      t.generateMipmaps = false;
      t.minFilter = THREE.LinearFilter;
      t.needsUpdate = true;
      return t;
    });
    for (let i = 0; i < FISH_MAX; i++) {
      const material = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0 });
      const mesh = new THREE.Mesh(this.geometry, material);
      mesh.visible = false;
      mesh.frustumCulled = false;
      mesh.renderOrder = -0.5; // acima da água animada (−1), abaixo das plantas e dos atores
      mesh.name = 'Mundo: peixe';
      scene.add(mesh);
      this.slots.push({ mesh, fish: null });
    }
  }

  /** Peixes vivos (dev/testes). */
  get live(): number { return this.slots.filter((s) => s.fish).length; }

  private rnd(k: number): number { return hash2(this.seed, ++this.counter, k); }

  /**
   * Avança o tempo. `cam` = centro da tela (células), `view` = meia-diagonal visível (células), `player` = onde está o jogador (o assusta).
   * `water` diz se um ponto é água aberta.
   */
  update(dt: number, cam: { x: number; z: number }, view: number, player: { x: number; z: number } | null, water: (x: number, z: number) => boolean): void {
    this.clock += dt;
    if (this.clock >= SPAWN_EVERY) {
      this.clock = 0;
      this.trySpawn(cam, view, water);
    }
    for (const s of this.slots) {
      const f = s.fish;
      if (!f) continue;
      const far = Math.hypot(f.x - cam.x, f.z - cam.z) > Math.max(MAX_DIST, view + 8);
      const alive = stepFish(f, dt, water, player, this.rnd(21)) && !far;
      if (!alive) { s.fish = null; s.mesh.visible = false; continue; }
      const sc = SIDE * FISH_SCALE[f.species];
      s.mesh.position.set(f.x, 0.04, f.z);
      s.mesh.rotation.y = fishYaw(f.heading);
      s.mesh.scale.set(sc, 1, sc);
      s.mesh.material.opacity = fishAlpha(f);
    }
  }

  private trySpawn(cam: { x: number; z: number }, view: number, water: (x: number, z: number) => boolean): void {
    const free = this.slots.filter((s) => !s.fish);
    if (free.length < FISH_SCHOOL || this.live >= FISH_MAX - FISH_SCHOOL) return;
    for (let attempt = 0; attempt < 8; attempt++) {
      const p = spawnPoint(this.seed, ++this.counter, cam.x, cam.z, view * 0.25, view * 1.05, water);
      if (!p) continue;
      const species = pickSpecies(this.rnd(31));
      const tex = this.textures[species];
      if (!tex) return;
      const n = 1 + Math.floor(this.rnd(32) * FISH_SCHOOL); // cardume de 1 a 3
      const h = this.rnd(33);
      for (let i = 0; i < n && i < free.length; i++) {
        const ox = (this.rnd(34) - 0.5) * 1.6, oz = (this.rnd(35) - 0.5) * 1.6;
        const x = water(p[0] + ox, p[1] + oz) ? p[0] + ox : p[0], z = water(p[0] + ox, p[1] + oz) ? p[1] + oz : p[1];
        const f = newFish(x, z, species, h, this.rnd(36), this.rnd(37)); // mesmo rumo inicial: nadam juntos
        const slot = free[i];
        slot.fish = f;
        slot.mesh.material.map = tex;
        slot.mesh.material.needsUpdate = true;
        slot.mesh.visible = true;
      }
      return;
    }
  }

  clear(): void { for (const s of this.slots) { s.fish = null; s.mesh.visible = false; } }

  dispose(): void {
    for (const s of this.slots) { s.mesh.parent?.remove(s.mesh); s.mesh.material.dispose(); }
    this.slots.length = 0;
    for (const t of this.textures) t?.dispose();
    this.geometry.dispose();
  }
}
