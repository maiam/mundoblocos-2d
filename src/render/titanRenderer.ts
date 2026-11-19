import * as THREE from 'three';
import { meshSection, type MeshData } from '../titan/mesher';
import { EYE_HEIGHT } from '../titan/physics';
import type { TitanVolume } from '../titan/volume';
import { SECTIONS } from '../titan/voxel';

/**
 * Renderer do Titã (ADR 0039): Three.js, câmera em primeira pessoa, uma `BufferGeometry` por seção de 16³ para o terreno opaco e outra para o
 * líquido, atlas compartilhado de pixels nítidos, luz de tarde fixa (embutida nos vértices) e névoa âmbar. Só **lê** o volume.
 * Malhas feitas no quadro (limite por quadro, mais perto primeiro); workers ficam para a otimização posterior (NEXT_STEPS).
 */
const FOG_COLOR = 0xd2a066; // âmbar da tarde (mistura da atmosfera e do cobre da direção de arte)
const HORIZON = 0xf2cc93;
const ZENITH = 0xb96e33;
/** Alcance de render (blocos): a região de teste é pequena; a névoa começa em 70% e fecha antes da borda carregada. */
const RANGE = 64;
const MESH_BUDGET_MS = 6;

export class TitanRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly camera: THREE.PerspectiveCamera;
  private readonly scene = new THREE.Scene();
  private readonly opaqueMat: THREE.MeshBasicMaterial;
  private readonly liquidMat: THREE.MeshBasicMaterial;
  private readonly liquidTex: THREE.Texture;
  private readonly sections = new Map<string, { opaque?: THREE.Mesh; liquid?: THREE.Mesh; rev: number }>();
  private readonly pending = new Set<string>();
  private readonly outline: THREE.LineSegments;
  private readonly sky: THREE.Mesh;
  private frame = 0;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly volume: TitanVolume, atlas: HTMLImageElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.scene.background = new THREE.Color(FOG_COLOR);
    this.scene.fog = new THREE.Fog(FOG_COLOR, RANGE * 0.7, RANGE * 0.97);
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.05, 400);
    this.camera.rotation.order = 'YXZ';

    const tex = new THREE.Texture(atlas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    this.opaqueMat = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, fog: true });
    // o líquido compartilha a névoa e alterna o quadro (frame 1 ↔ 2 do atlas: deslocamento de 20 px em u)
    this.liquidTex = tex.clone();
    this.liquidTex.needsUpdate = true;
    this.liquidMat = new THREE.MeshBasicMaterial({ map: this.liquidTex, vertexColors: true, fog: true, transparent: true, opacity: 0.94 });

    // céu: cúpula com degradê procedural (cobre no alto → âmbar → névoa pálida no horizonte), acompanha a câmera
    const dome = new THREE.SphereGeometry(300, 24, 12);
    const colors: number[] = [];
    const pos = dome.getAttribute('position');
    const zen = new THREE.Color(ZENITH), mid = new THREE.Color(0xd99342), hor = new THREE.Color(HORIZON), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const h = Math.max(0, pos.getY(i) / 300); // 0 horizonte … 1 zênite
      if (h < 0.35) c.copy(hor).lerp(mid, h / 0.35); else c.copy(mid).lerp(zen, (h - 0.35) / 0.65);
      colors.push(c.r, c.g, c.b);
    }
    dome.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.sky = new THREE.Mesh(dome, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    this.sky.renderOrder = -1;
    this.scene.add(this.sky);

    // contorno da célula apontada
    const box = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004));
    this.outline = new THREE.LineSegments(box, new THREE.LineBasicMaterial({ color: 0xfff3d8 }));
    this.outline.visible = false;
    this.scene.add(this.outline);

    // fila inicial: todas as seções não vazias da região (4 × 4 chunks), da mais perto da chegada para fora
    this.queueRegion();
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  private queueRegion(): void {
    const g = this.volume.gen;
    for (let cx = -2; cx <= 1; cx++) for (let cz = -2; cz <= 1; cz++) {
      // alturas úteis: do fundo (rocha-mãe) até a maior coluna do chunk (+ edições mexem nas seções acima via `takeTouched`)
      let maxTop = 0;
      for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) maxTop = Math.max(maxTop, g.column(cx * 16 + x, cz * 16 + z).top);
      const top = Math.min(SECTIONS - 1, Math.floor((maxTop + 64) / 16) + 1);
      for (let sy = 0; sy <= top; sy++) this.pending.add(`${cx},${sy},${cz}`);
    }
  }

  readonly resize = (): void => {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  /** Seções que ainda faltam (diagnóstico e testes de navegador). */
  get pendingSections(): number { return this.pending.size; }
  get meshedSections(): number { return this.sections.size; }

  private build(key: string): void {
    const [cx, sy, cz] = key.split(',').map(Number);
    const m = meshSection(this.volume, cx, sy, cz);
    const entry = this.sections.get(key) ?? { rev: 0 };
    for (const k of ['opaque', 'liquid'] as const) {
      const old = entry[k];
      if (old) { this.scene.remove(old); old.geometry.dispose(); entry[k] = undefined; }
      const data = m[k];
      if (!data) continue;
      const mesh = new THREE.Mesh(toGeometry(data), k === 'opaque' ? this.opaqueMat : this.liquidMat);
      mesh.frustumCulled = true;
      mesh.matrixAutoUpdate = false;
      this.scene.add(mesh);
      entry[k] = mesh;
    }
    entry.rev = this.volume.sectionRevision(cx, sy, cz);
    if (entry.opaque || entry.liquid) this.sections.set(key, entry); else this.sections.delete(key);
  }

  /** Um quadro: câmera, malhas pendentes (mais perto primeiro, com orçamento de tempo), contorno e desenho. */
  render(eye: { x: number; y: number; z: number }, yaw: number, pitch: number, target: { x: number; y: number; z: number } | null, time: number): void {
    this.camera.position.set(eye.x, eye.y, eye.z);
    this.camera.rotation.set(pitch, yaw, 0);
    this.sky.position.copy(this.camera.position);
    // edições aparecem no mesmo quadro (sem orçamento); só a geração inicial é repartida entre quadros
    for (const k of this.volume.takeTouched()) { this.build(k); this.pending.delete(k); }
    if (this.pending.size) {
      const px = eye.x / 16, pz = eye.z / 16, py = (eye.y + 64) / 16;
      const order = [...this.pending].map((k) => { const [cx, sy, cz] = k.split(',').map(Number); return { k, d: (cx + 0.5 - px) ** 2 + (cz + 0.5 - pz) ** 2 + (sy + 0.5 - py) ** 2 }; }).sort((a, b) => a.d - b.d);
      const t0 = performance.now();
      for (const { k } of order) {
        this.build(k);
        this.pending.delete(k);
        if (performance.now() - t0 > MESH_BUDGET_MS && this.frame > 1) break;
      }
    }
    this.liquidTex.offset.x = (Math.floor(time / 0.7) % 2) * 0.25; // dois quadros de ondulação
    this.outline.visible = !!target;
    if (target) this.outline.position.set(target.x + 0.5, target.y + 0.5, target.z + 0.5);
    this.renderer.render(this.scene, this.camera);
    this.frame++;
  }

  /** Altura dos olhos a partir dos pés. */
  static eyeOf(b: { x: number; y: number; z: number }): { x: number; y: number; z: number } { return { x: b.x, y: b.y + EYE_HEIGHT, z: b.z }; }

  dispose(): void {
    window.removeEventListener('resize', this.resize);
    for (const e of this.sections.values()) { e.opaque?.geometry.dispose(); e.liquid?.geometry.dispose(); }
    this.renderer.dispose();
  }
}

function toGeometry(d: MeshData): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(d.pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(d.uv, 2));
  g.setAttribute('color', new THREE.BufferAttribute(d.col, 3));
  g.setIndex(new THREE.BufferAttribute(d.idx, 1));
  g.computeBoundingSphere();
  return g;
}
