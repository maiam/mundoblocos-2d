import * as THREE from 'three';
import type { Camera } from '../game/camera';
import type { ThreeStage } from './three/stage';
import type { Player } from '../game/player';
import { SANCTUARY_DEFAULT_CAMERA } from './sanctuaryCameraJoystick';

export type SanctuaryCameraMode = 'atual' | 'isometrico' | 'primeira-pessoa';
const MODES: SanctuaryCameraMode[] = ['atual', 'isometrico', 'primeira-pessoa'];
const LABELS: Record<SanctuaryCameraMode, string> = {
  atual: 'Atual', isometrico: 'Isométrico', 'primeira-pessoa': 'Primeira pessoa',
};

/** Somente no Santuário. Não modifica o Game, o World nem a câmera do mundo principal. */
export class SanctuaryCameraModes {
  private mode: SanctuaryCameraMode = 'atual';
  private readonly root = document.createElement('div');
  private readonly perspective = new THREE.PerspectiveCamera(75, 1, 0.06, 220);
  private yaw = Math.PI;
  private pitch = 0;
  private drag: { id: number; x: number; y: number } | null = null;
  private readonly onPointerDown = (e: PointerEvent): void => {
    if (this.mode !== 'primeira-pessoa' || e.button !== 0) return;
    this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  private readonly onPointerMove = (e: PointerEvent): void => {
    if (!this.drag || e.pointerId !== this.drag.id || this.mode !== 'primeira-pessoa') return;
    this.yaw -= (e.clientX - this.drag.x) * 0.005;
    this.pitch = Math.max(-1.3, Math.min(1.3, this.pitch - (e.clientY - this.drag.y) * 0.005));
    this.drag.x = e.clientX; this.drag.y = e.clientY;
  };
  private readonly onPointerUp = (e: PointerEvent): void => {
    if (this.drag?.id === e.pointerId) this.drag = null;
  };

  /**
   * `fixed` = câmera travada neste modo, sem seletor nem arrasto (Santuário isométrico solo, ADR 0036); sem ele, o seletor das três câmeras da Sala 2.
   */
  constructor(private readonly canvas: HTMLCanvasElement, private readonly stage: ThreeStage, private readonly proceduralWorld = false, fixed: SanctuaryCameraMode | null = null) {
    if (fixed) { this.setMode(fixed); return; }
    this.root.className = 'sanctuary-view-switch';
    this.root.setAttribute('role', 'group');
    this.root.setAttribute('aria-label', 'Perspectiva do Santuário');
    const label = document.createElement('span');
    label.textContent = 'Câmera';
    this.root.append(label);
    for (const mode of MODES) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = LABELS[mode];
      button.dataset.mode = mode;
      button.addEventListener('click', () => this.setMode(mode));
      this.root.append(button);
    }
    const hint = document.createElement('small');
    hint.textContent = 'Na primeira pessoa, arraste para olhar';
    hint.hidden = true;
    hint.className = 'sanctuary-view-hint';
    this.root.append(hint);
    const style = document.createElement('style');
    style.textContent = `
      .sanctuary-view-switch{position:fixed;top:58px;right:12px;z-index:45;display:flex;flex-wrap:wrap;align-items:center;gap:5px;max-width:min(92vw,440px);padding:7px;border:1px solid #cbbbe4;border-radius:12px;background:#211a40e8;color:#fff;font:700 12px system-ui;box-shadow:0 3px 14px #0005}
      .sanctuary-view-switch button{border:1px solid #b8a3d6;border-radius:8px;background:#514575;color:white;padding:7px 9px;cursor:pointer;touch-action:manipulation}
      .sanctuary-view-switch button[aria-pressed=true]{background:#e7ceff;color:#281b41}
      .sanctuary-view-hint{width:100%;font-size:10px;opacity:.8}
      .sanctuary-view-hint[hidden]{display:none}
      @media(max-width:500px){.sanctuary-view-switch{top:46px;right:5px;left:5px;max-width:none;justify-content:center}}
    `;
    this.root.append(style);
    document.body.append(this.root);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);
    this.setMode('atual');
  }

  get current(): SanctuaryCameraMode { return this.mode; }

  private setMode(mode: SanctuaryCameraMode): void {
    this.mode = mode;
    this.drag = null;
    this.root.querySelectorAll<HTMLButtonElement>('button[data-mode]').forEach(b => {
      b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
    });
    const hint = this.root.querySelector<HTMLElement>('.sanctuary-view-hint');
    if (hint) hint.hidden = mode !== 'primeira-pessoa';
    this.stage.setFreeOrbit(mode === 'isometrico'
      ? { azimuthDeg: 45, elevationDeg: 35.264, zoom: 1, blockHeight: 1, cellSize: 1 }
      : mode === 'atual' && !this.proceduralWorld ? { ...SANCTUARY_DEFAULT_CAMERA } : null);
  }

  /** A câmera do modo atual permanece exatamente como era. */
  sync(cam: Camera, player: Player): THREE.Camera {
    this.stage.syncCamera(cam);
    if (this.mode !== 'primeira-pessoa') return this.stage.camera;
    const aspect = Math.max(0.1, cam.width / Math.max(1, cam.height));
    this.perspective.aspect = aspect;
    this.perspective.updateProjectionMatrix();
    // O corpo da Deusa está no centro da célula, acima do suporte sólido.
    const eye = this.proceduralWorld
      ? Math.max(0.9, player.visualZ + 1.25)
      : Math.max(0.6, player.z * 0.5 + 1.35);
    this.perspective.position.set(
      player.x * (this.proceduralWorld ? 1 : 0.8),
      eye,
      player.y * (this.proceduralWorld ? 1 : 0.8),
    );
    this.perspective.up.set(0, 1, 0);
    const direction = new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch),
    );
    this.perspective.lookAt(this.perspective.position.clone().add(direction));
    this.perspective.updateMatrixWorld();
    return this.perspective;
  }

  /** Usa o mesmo raio de seleção do Three.js, inclusive no modo primeira pessoa. */
  aim(cam: Camera, x: number, y: number): void {
    if (this.mode !== 'primeira-pessoa') {
      this.stage.aim(cam, x, y);
      return;
    }
    this.stage.aimWithCamera(this.perspective, cam, x, y);
  }

  dispose(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
    this.root.remove();
  }
}
