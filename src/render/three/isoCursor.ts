import * as THREE from 'three';
import type { World } from '../../world/world';
import type { RenderOptions } from '../rendererContract';

/**
 * Cursor da câmera isométrica (ADR 0036): um bloco-fantasma translúcido, com arestas, **no lugar exato onde o próximo bloco entra** (o nível acima do topo da
 * pilha da célula apontada), sombreando a célula e as faces. Existe porque a moldura/cantoneiras 2D (`selectionFx`) são retângulos de tela da vista oblíqua e,
 * na projeção isométrica, ficavam longe da célula real. É 3D de verdade: acompanha a câmera, a altura da pilha e o zoom. Só lê o `World`.
 */
export class IsoCursor {
  private readonly ghost: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>;
  private readonly edges: THREE.LineSegments<THREE.EdgesGeometry, THREE.LineBasicMaterial>;
  /** Base do fantasma, mais forte: a célula (a "casa") onde o bloco assenta. */
  private readonly floorTile: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly breaking: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>;

  constructor(parent: THREE.Object3D, private readonly world: World) {
    const box = new THREE.BoxGeometry(1, 1, 1);
    this.ghost = new THREE.Mesh(box, new THREE.MeshBasicMaterial({
      color: 0xffe27a, transparent: true, opacity: 0.32, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
    }));
    this.ghost.renderOrder = 6;
    this.ghost.visible = false;
    this.edges = new THREE.LineSegments(new THREE.EdgesGeometry(box), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false }));
    this.edges.renderOrder = 7;
    this.ghost.add(this.edges);
    const tile = new THREE.PlaneGeometry(1, 1);
    tile.rotateX(-Math.PI / 2);
    this.floorTile = new THREE.Mesh(tile, new THREE.MeshBasicMaterial({
      color: 0xffe27a, transparent: true, opacity: 0.38, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3,
    }));
    this.floorTile.position.y = -0.5 + 0.002;
    this.floorTile.renderOrder = 6;
    this.ghost.add(this.floorTile);
    this.breaking = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: 0xff7389, transparent: true, opacity: 0.4, depthWrite: false }));
    this.breaking.renderOrder = 6;
    this.breaking.visible = false;
    parent.add(this.ghost, this.breaking);
  }

  /** `active` = câmera isométrica ligada; fora dela o cursor 2D de sempre cuida da seleção. */
  update(opts: Pick<RenderOptions, 'hover' | 'focus' | 'breaking'>, active: boolean): void {
    const w = this.world;
    const cl = w.cubeLevels;
    const h = 1 / cl;
    const cell = active ? opts.hover ?? opts.focus : null;
    if (cell && w.inBounds(cell.x, cell.y)) {
      const stack = w.stackHeight(cell.x, cell.y);
      // Pilha cheia: nada entra em cima; marca o bloco do topo.
      const level = cell.level ?? (stack >= w.maxStack ? w.maxStack - 1 : stack);
      this.ghost.position.set(cell.x + 0.5, (level + 0.5) * h, cell.y + 0.5);
      this.ghost.scale.set(1.004, h * 1.004, 1.004);
      this.ghost.material.color.set(cell.valid ? 0xffe27a : 0xff6b7d);
      this.edges.material.color.set(cell.valid ? 0xffffff : 0xffd0d6);
      this.floorTile.material.color.set(cell.valid ? 0xffe27a : 0xff6b7d);
      this.ghost.visible = true;
    } else this.ghost.visible = false;
    const b = active ? opts.breaking : null;
    if (b && w.inBounds(b.x, b.y) && w.stackHeight(b.x, b.y) > 0) {
      const top = w.stackHeight(b.x, b.y) - 1;
      this.breaking.position.set(b.x + 0.5, (top + 0.5) * h, b.y + 0.5);
      this.breaking.scale.set(1.01, h * 1.01, 1.01);
      this.breaking.material.opacity = Math.min(0.7, 0.15 + 0.5 * b.progress);
      this.breaking.visible = true;
    } else this.breaking.visible = false;
  }

  dispose(): void {
    this.ghost.geometry.dispose();
    this.edges.geometry.dispose();
    this.ghost.material.dispose();
    this.edges.material.dispose();
    this.floorTile.geometry.dispose();
    this.floorTile.material.dispose();
    this.breaking.material.dispose();
    this.ghost.removeFromParent();
    this.breaking.removeFromParent();
  }
}
