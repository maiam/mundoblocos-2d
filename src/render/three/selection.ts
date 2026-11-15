import * as THREE from 'three';
import type { World } from '../../world/world';
import type { RenderOptions } from '../rendererContract';

/** Realces de seleção (cursor/foco) e de quebra, planos sobre o topo da pilha da célula (núcleo genérico, M1). */
export class SelectionMarkers {
  private readonly highlight: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  private readonly breakHighlight: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;

  constructor(scene: THREE.Object3D, private readonly world: World) {
    const selectGeometry = new THREE.PlaneGeometry(1, 1);
    selectGeometry.rotateX(-Math.PI / 2);
    this.highlight = new THREE.Mesh(selectGeometry, new THREE.MeshBasicMaterial({
      color: 0xffeb8d, transparent: true, opacity: 0.32, depthWrite: false,
      side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3,
    }));
    this.highlight.renderOrder = 4;
    this.highlight.visible = false;
    scene.add(this.highlight);
    this.breakHighlight = new THREE.Mesh(
      selectGeometry.clone(), new THREE.MeshBasicMaterial({
        color: 0xff7389, transparent: true, opacity: 0.35, depthWrite: false,
        side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4,
      }),
    );
    this.breakHighlight.renderOrder = 5;
    this.breakHighlight.visible = false;
    scene.add(this.breakHighlight);
  }

  update(opts: Pick<RenderOptions, 'hover' | 'focus' | 'breaking'>): void {
    const cell = opts.hover ?? opts.focus;
    if (cell && cell.valid && this.world.inBounds(cell.x, cell.y)) {
      const top = this.world.stackHeight(cell.x, cell.y) / this.world.cubeLevels; // em células de altura
      this.highlight.position.set(cell.x + 0.5, top + 0.03, cell.y + 0.5);
      this.highlight.visible = true;
    } else this.highlight.visible = false;
    const breaking = opts.breaking;
    if (breaking && this.world.inBounds(breaking.x, breaking.y)) {
      const h = this.world.stackHeight(breaking.x, breaking.y) / this.world.cubeLevels;
      this.breakHighlight.position.set(breaking.x + 0.5, h + 0.04, breaking.y + 0.5);
      this.breakHighlight.material.opacity = Math.min(0.58, 0.12 + 0.46 * breaking.progress);
      this.breakHighlight.visible = true;
    } else this.breakHighlight.visible = false;
  }

  dispose(): void {
    this.highlight.geometry.dispose();
    this.breakHighlight.geometry.dispose();
    this.highlight.material.dispose();
    this.breakHighlight.material.dispose();
  }
}
