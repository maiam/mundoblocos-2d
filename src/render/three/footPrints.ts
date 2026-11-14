import * as THREE from 'three';
import { SUBDIV } from '../../config';
import { PRINT_LIFE, type PrintStyle } from '../footDust';

/**
 * Pegadas no chão macio (v0.93.69): um pool de ovais deitados no chão, alternando pé esquerdo e direito, que somem em `PRINT_LIFE` s.
 * Nada é criado por quadro; só desenha por cima do chão (sem escrever profundidade).
 */
const MAX = 24;

function footTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 32; c.height = 48;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff';
  g.beginPath();
  g.ellipse(16, 30, 9, 15, 0, 0, Math.PI * 2); // sola
  g.fill();
  g.beginPath();
  g.ellipse(16, 8, 7, 6, 0, 0, Math.PI * 2); // frente do pé
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class FootPrints {
  private readonly group = new THREE.Group();
  private readonly texture = footTexture();
  private readonly meshes: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  private readonly age = new Float32Array(MAX).fill(PRINT_LIFE);
  private readonly alpha = new Float32Array(MAX);
  private next = 0;
  private left = false;

  constructor(scene: THREE.Object3D) {
    this.group.name = 'Mundo: pegadas';
    // O corpo mantém os pixels na grade fina (ADR 0032): pegada e passo em células × `SUBDIV`.
    const plane = new THREE.PlaneGeometry(0.2 * SUBDIV, 0.3 * SUBDIV);
    for (let i = 0; i < MAX; i++) {
      const m = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, opacity: 0, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.renderOrder = 1.1;
      m.visible = false;
      this.meshes.push(m);
      this.group.add(m);
    }
    scene.add(this.group);
  }

  /** Marca uma pegada em (x, z) (células) para quem anda na direção (dx, dz); alterna o pé. */
  emit(x: number, z: number, dx: number, dz: number, style: PrintStyle): void {
    const i = this.next;
    this.next = (this.next + 1) % MAX;
    this.left = !this.left;
    const len = Math.hypot(dx, dz) || 1;
    // Deslocamento lateral de cada pé (perpendicular ao andar) e orientação do pé na direção do movimento.
    const px = -dz / len, pz = dx / len;
    const side = this.left ? 1 : -1;
    const m = this.meshes[i];
    m.position.set(x + px * 0.09 * SUBDIV * side, 0.03, z + pz * 0.09 * SUBDIV * side - 0.05 * SUBDIV);
    m.rotation.z = Math.atan2(dx, -dz) * -1;
    m.material.color.setRGB(...style.color);
    this.age[i] = 0;
    this.alpha[i] = style.alpha;
    m.visible = true;
  }

  update(dt: number): void {
    for (let i = 0; i < MAX; i++) {
      const m = this.meshes[i];
      if (this.age[i] >= PRINT_LIFE) { m.visible = false; continue; }
      this.age[i] += dt;
      const t = this.age[i] / PRINT_LIFE;
      // Firme no começo e some no último pedaço da vida.
      m.material.opacity = this.alpha[i] * Math.min(1, (1 - t) / 0.6);
    }
  }

  get live(): number {
    let n = 0;
    for (let i = 0; i < MAX; i++) if (this.age[i] < PRINT_LIFE) n++;
    return n;
  }

  dispose(): void {
    this.group.parent?.remove(this.group);
    this.meshes[0]?.geometry.dispose();
    for (const m of this.meshes) m.material.dispose();
    this.texture.dispose();
  }
}
