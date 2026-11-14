import * as THREE from 'three';
import { TILE } from '../../config';
import type { Camera } from '../../game/camera';
import type { RendererStats } from '../rendererContract';
import { sanctuaryCameraOffset } from '../sanctuaryCameraRig';
import type { SanctuaryOrbit } from '../sanctuaryCameraJoystick';
import { OBLIQUE_CAMERA_HEIGHT, obliqueProjection, obliqueRay } from '../sanctuaryObliqueView';

/**
 * `tilt`: câmera inclinada a 67° (reserva, iluminada). `oblique`: câmera reta para baixo com a altura como deslocamento
 * fixo na tela (padrão, ADR 0026) e materiais sem luz, para a arte aprovada manter as cores.
 */
export type StageView = 'tilt' | 'oblique';

/**
 * Palco do render 2.5D (núcleo genérico, ADR 0026/0031 — M1): cena, câmera ortográfica, GPU, perda de contexto, ajuste de
 * tamanho e a mira (raio do ponteiro). Não conhece mundo nenhum: Santuário e Mundo o compõem com as suas malhas.
 */
export class ThreeStage {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-8, 8, 5, -5, 0.1, 220);
  readonly gpu: THREE.WebGLRenderer;
  contextLost = false;
  private freeOrbit: SanctuaryOrbit | null = null;
  /** Alterna entre a camera de laboratorio e a projecao original do mundo. */
  setFreeOrbit(orbit: SanctuaryOrbit | null): void { this.freeOrbit = orbit; }
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private obliqueHalf = { w: 8, h: 5 };
  private obliqueFocus = { x: 0, z: 0 };
  private lastWidth = 0;
  private lastHeight = 0;
  private lastPixelRatio = 0;

  /**
   * @param onRestored chamado quando o contexto volta (o Three recria os recursos; quem usa refaz malhas e texturas de canvas).
   */
  constructor(
    private readonly canvas: HTMLCanvasElement,
    readonly view: StageView,
    background: string,
    private readonly onRestored: () => void,
  ) {
    // O aparelho pode tirar a GPU do jogo (aba em segundo plano, pouca memória): sem preventDefault o contexto nunca
    // volta. Ao voltar, o Three recria seus recursos sozinho; quem usa o palco só refaz o que é seu.
    canvas.addEventListener('webglcontextlost', this.onLost);
    canvas.addEventListener('webglcontextrestored', this.onBack);
    this.scene.background = new THREE.Color(background);
    this.gpu = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.gpu.outputColorSpace = THREE.SRGBColorSpace;
    this.gpu.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    // O quadro tem mais de uma passada (cena, depois a camada de luz): os contadores acumulam o quadro inteiro e são zerados
    // à mão no começo de `render()`; sem isso `stats()` mostraria só a última passada.
    this.gpu.info.autoReset = false;
  }

  private readonly onLost = (e: Event): void => {
    e.preventDefault();
    this.contextLost = true;
  };

  private readonly onBack = (): void => {
    this.contextLost = false;
    this.onRestored();
  };

  stats(): RendererStats {
    const i = this.gpu.info;
    return {
      calls: i.render.calls, triangles: i.render.triangles,
      geometries: i.memory.geometries, textures: i.memory.textures,
      contextLost: this.contextLost,
    };
  }

  /** Posiciona a câmera sobre o foco do jogo e acompanha o tamanho da tela (sem redimensionar o buffer à toa). */
  syncCamera(cam: Camera): void {
    const w = cam.width, h = cam.height;
    const halfH = h / (TILE * cam.zoom * 2 * (this.freeOrbit?.zoom ?? 1));
    const halfW = w / (TILE * cam.zoom * 2 * (this.freeOrbit?.zoom ?? 1));
    this.camera.left = -halfW; this.camera.right = halfW;
    this.camera.top = halfH; this.camera.bottom = -halfH;
    this.camera.updateProjectionMatrix();
    // Mesmos eixos X/Y do mundo; +Y é altura e +Z a frente voltada para a tela.
    const focusX = cam.x / TILE;
    const focusZ = cam.y / TILE;
    if (this.freeOrbit) {
      const elevation = this.freeOrbit.elevationDeg * Math.PI / 180;
      const azimuth = this.freeOrbit.azimuthDeg * Math.PI / 180;
      const depth = 37 / Math.tan(elevation);
      this.camera.up.set(0, 1, 0);
      this.camera.position.set(focusX + Math.sin(azimuth) * depth, 37, focusZ + Math.cos(azimuth) * depth);
      this.camera.lookAt(focusX, 0, focusZ);
      this.camera.updateMatrixWorld();
    } else if (this.view === 'oblique') {
      // Câmera reta para baixo (topo da tela = norte) e projeção oblíqua montada à mão (`sanctuaryObliqueView.ts`).
      this.camera.up.set(0, 0, -1);
      this.camera.position.set(focusX, OBLIQUE_CAMERA_HEIGHT, focusZ);
      this.camera.lookAt(focusX, 0, focusZ);
      this.camera.updateMatrixWorld();
      const m = obliqueProjection(halfW, halfH);
      this.camera.projectionMatrix.set(
        m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8], m[9], m[10], m[11], m[12], m[13], m[14], m[15],
      );
      this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
      this.obliqueHalf = { w: halfW, h: halfH };
      this.obliqueFocus = { x: focusX, z: focusZ };
    } else {
      this.camera.up.set(0, 1, 0);
      const offset = sanctuaryCameraOffset();
      this.camera.position.set(focusX, offset.height, focusZ + offset.depth);
      this.camera.lookAt(focusX, 0, focusZ);
      this.camera.updateMatrixWorld();
    }
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    if (w !== this.lastWidth || h !== this.lastHeight || pixelRatio !== this.lastPixelRatio) {
      this.gpu.setPixelRatio(pixelRatio);
      this.gpu.setSize(w, h, false);
      this.lastWidth = w;
      this.lastHeight = h;
      this.lastPixelRatio = pixelRatio;
    }
  }

  /** Aponta o raio para o pixel (sx, sy) da tela; a câmera precisa estar sincronizada (`syncCamera`). */
  aim(cam: Camera, sx: number, sy: number): void {
    this.pointer.set(sx / cam.width * 2 - 1, 1 - sy / cam.height * 2);
    if (this.view === 'oblique' && !this.freeOrbit) {
      // Na projeção oblíqua o raio não é perpendicular à tela: sobe 1 de altura a cada K de célula para o sul.
      const r = obliqueRay(this.pointer.x, this.pointer.y, this.obliqueHalf.w, this.obliqueHalf.h, this.obliqueFocus);
      this.raycaster.set(new THREE.Vector3(...r.origin), new THREE.Vector3(...r.dir));
    } else this.raycaster.setFromCamera(this.pointer, this.camera);
  }

  /** Interseções do raio apontado com as malhas dadas, da mais próxima à mais distante. */
  hits(objects: THREE.Object3D[]): THREE.Intersection[] {
    return this.raycaster.intersectObjects(objects, false);
  }

  /** Célula do chão sob o raio apontado (plano y = 0), ou null se o raio não o encontra. */
  groundCell(): { x: number; y: number } | null {
    const point = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), point)) return null;
    return { x: Math.floor(point.x), y: Math.floor(point.z) };
  }

  render(): void {
    this.gpu.info.reset();
    this.gpu.render(this.scene, this.camera);
  }

  dispose(): void {
    this.canvas.removeEventListener('webglcontextlost', this.onLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onBack);
    this.gpu.dispose();
  }
}
