import * as THREE from 'three';

/**
 * Chuva à vista (ADR 0118): faixas finas que caem numa caixa em volta da câmera, todas em uma única `LineSegments`. A intensidade (0–1) define quantas aparecem e a opacidade.
 * Só desenho: não toca em malha, luz ou física. Ainda cai por baixo de telhados (a oclusão fica como dívida, `NEXT_STEPS`).
 */
const DROPS = 700, AREA = 9, HEIGHT = 14, FALL = 22, LEN = 0.7;

export class RainLayer {
  readonly mesh: THREE.LineSegments;
  private readonly pos: Float32Array;
  private readonly seed: Float32Array; // x, z e fase de cada gota
  private readonly geo = new THREE.BufferGeometry();

  constructor() {
    this.pos = new Float32Array(DROPS * 6);
    this.seed = new Float32Array(DROPS * 3);
    for (let i = 0; i < DROPS; i++) { this.seed[i * 3] = (Math.random() * 2 - 1) * AREA; this.seed[i * 3 + 1] = (Math.random() * 2 - 1) * AREA; this.seed[i * 3 + 2] = Math.random() * HEIGHT; }
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.mesh = new THREE.LineSegments(this.geo, new THREE.LineBasicMaterial({ color: 0xbfd0e6, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    this.mesh.frustumCulled = false; this.mesh.visible = false; this.mesh.renderOrder = 5;
  }

  /** Posiciona a caixa em torno do olho e avança as gotas (`t` em segundos). `level` 0–1; 0 esconde tudo. */
  update(eye: { x: number; y: number; z: number }, level: number, t: number): void {
    this.mesh.visible = level > 0.01;
    if (!this.mesh.visible) return;
    const n = Math.max(1, Math.round(DROPS * level)), top = eye.y + HEIGHT * 0.5;
    for (let i = 0; i < n; i++) {
      const x = eye.x + this.seed[i * 3], z = eye.z + this.seed[i * 3 + 1];
      const y = top - ((this.seed[i * 3 + 2] + t * FALL) % HEIGHT), k = i * 6;
      this.pos[k] = x; this.pos[k + 1] = y; this.pos[k + 2] = z; this.pos[k + 3] = x - 0.04; this.pos[k + 4] = y - LEN; this.pos[k + 5] = z;
    }
    this.geo.setDrawRange(0, n * 2);
    this.geo.attributes.position.needsUpdate = true;
    (this.mesh.material as THREE.LineBasicMaterial).opacity = 0.18 + 0.32 * level;
  }
}
