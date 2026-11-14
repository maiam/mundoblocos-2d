import * as THREE from 'three';
import { SUBDIV, TILE } from '../../config';
import type { ItemDrop } from '../../game/drops';
import { hash2 } from '../../world/random';

/** Itens caídos e o anel sob a ovelha no 3D (ADR 0031, M3.1) — o mesmo desenho do `Renderer` 2D, em planos. */

export interface DropIcons {
  /** Ícone da pilha, quando a imagem já carregou. */
  get(id: ItemDrop['item']): HTMLImageElement | undefined;
}
export interface DropView { x0: number; y0: number; x1: number; y1: number }

interface DropSlot {
  icon: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  shadow: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  image: HTMLImageElement | null;
}

/**
 * Posição do ícone acima do chão (células de altura): saída com **dois quiques** (14 px em 0,5 s e 5 px em 0,3 s; v0.93.94) e depois a
 * flutuação (px do 2D ÷ TILE). O quique só vale a partir do instante em que o item nasce (`age`).
 */
export function dropLift(age: number, elapsed: number, x: number): number {
  const pop = age < 0.5 ? Math.sin((age / 0.5) * Math.PI) * 14 : age < 0.8 ? Math.sin(((age - 0.5) / 0.3) * Math.PI) * 5 : 0;
  const bob = 2 + Math.sin(elapsed * 4 + x * 3) * 1.5;
  return ((bob + pop) * SUBDIV) / TILE;
}

/** Deslocamento horizontal do item nos primeiros 0,5 s: sai do bloco quebrado e desliza até o ponto onde cai (decai a zero; hash da posição). */
export function dropToss(d: { x: number; y: number; age: number }): number {
  if (d.age >= 0.5) return 0;
  const k = 1 - d.age / 0.5;
  return (hash2(7, Math.floor(d.x * 97), Math.floor(d.y * 89)) - 0.5) * 0.9 * k * k;
}

/** Itens caídos: um ícone em plano vertical com sombra no chão (pool; teto de `MAX_DROPS`). */
export class DropSprites {
  private static readonly MAX_DROPS = 64;
  private readonly slots: DropSlot[] = [];
  private readonly textures = new Map<HTMLImageElement, THREE.Texture>();
  private readonly plane: THREE.PlaneGeometry;
  private readonly shadowGeometry: THREE.BufferGeometry;
  private readonly blank: THREE.Texture;
  private drawn = 0;

  constructor(private readonly scene: THREE.Scene, private readonly icons: DropIcons, private readonly k: number) {
    this.plane = new THREE.PlaneGeometry(1, 1);
    this.plane.translate(0, 0.5, 0);
    this.shadowGeometry = new THREE.CircleGeometry(1, 20);
    this.shadowGeometry.rotateX(-Math.PI / 2);
    this.blank = new THREE.Texture();
  }

  get count(): number { return this.drawn; }

  update(view: DropView, drops: readonly ItemDrop[], elapsed: number): void {
    let n = 0;
    for (const d of drops) {
      if (n >= DropSprites.MAX_DROPS) break;
      if (d.x < view.x0 || d.x > view.x1 || d.y < view.y0 || d.y > view.y1) continue;
      const slot = this.slot(n++);
      // sombra (raios 6 × 2,2 px do 2D)
      slot.shadow.position.set(d.x, 0.02, d.y);
      slot.shadow.scale.set((6 * SUBDIV) / TILE, 1, (2.2 * SUBDIV) / TILE);
      slot.shadow.visible = true;
      const img = this.icons.get(d.item) ?? null;
      slot.icon.visible = !!img;
      if (!img) continue;
      if (slot.image !== img) {
        slot.image = img;
        slot.icon.material.map = this.textureFor(img);
        slot.icon.material.needsUpdate = true;
      }
      const h = (15 * SUBDIV) / TILE; // ícone de 15 px de altura, a largura segue a proporção da imagem
      const ratio = img.naturalWidth / img.naturalHeight;
      slot.icon.scale.set(h * ratio, h / this.k, 1);
      slot.icon.position.set(d.x + dropToss(d), dropLift(d.age, elapsed, d.x) / this.k, d.y);
    }
    this.drawn = n;
    for (let i = n; i < this.slots.length; i++) this.slots[i].icon.visible = this.slots[i].shadow.visible = false;
  }

  private textureFor(img: HTMLImageElement): THREE.Texture {
    let t = this.textures.get(img);
    if (!t) {
      t = new THREE.Texture(img);
      t.colorSpace = THREE.SRGBColorSpace;
      t.minFilter = THREE.LinearFilter;
      t.generateMipmaps = false;
      t.needsUpdate = true;
      this.textures.set(img, t);
    }
    return t;
  }

  private slot(i: number): DropSlot {
    let s = this.slots[i];
    if (s) return s;
    const icon = new THREE.Mesh(this.plane, new THREE.MeshBasicMaterial({
      map: this.blank, transparent: true, depthWrite: false, alphaTest: 0.02, side: THREE.DoubleSide,
    }));
    icon.renderOrder = 2;
    icon.frustumCulled = false;
    icon.name = 'Mundo: item caído';
    const shadow = new THREE.Mesh(this.shadowGeometry, new THREE.MeshBasicMaterial({
      color: 0x1e1446, transparent: true, opacity: 0.28, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1,
    }));
    shadow.renderOrder = 1;
    shadow.name = 'Mundo: sombra de item';
    this.scene.add(shadow);
    this.scene.add(icon);
    s = { icon, shadow, image: null };
    this.slots.push(s);
    return s;
  }

  reupload(): void {
    for (const t of this.textures.values()) t.needsUpdate = true;
  }

  dispose(): void {
    for (const s of this.slots) {
      this.scene.remove(s.icon);
      this.scene.remove(s.shadow);
      s.icon.material.dispose();
      s.shadow.material.dispose();
    }
    this.slots.length = 0;
    for (const t of this.textures.values()) t.dispose();
    this.textures.clear();
    this.blank.dispose();
    this.plane.dispose();
    this.shadowGeometry.dispose();
  }
}

export type RingState = { x: number; y: number; valid: boolean; attack?: boolean };
const RING_COLORS = { attack: 0xff4646, ok: 0xffecA0, bad: 0xff788c } as const;

/** Anel sob a ovelha: dourado = pode receber trigo; rosado = não pode; vermelho = alvo do golpe de espada. */
export class HoverRing {
  private readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;

  constructor(scene: THREE.Scene) {
    const g = new THREE.RingGeometry(0.88, 1, 40);
    g.rotateX(-Math.PI / 2);
    this.mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
      color: RING_COLORS.ok, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -3,
    }));
    this.mesh.renderOrder = 4;
    this.mesh.visible = false;
    this.mesh.name = 'Mundo: anel da ovelha';
    scene.add(this.mesh);
    this.scene = scene;
  }
  private readonly scene: THREE.Scene;

  get visible(): boolean { return this.mesh.visible; }

  update(r: RingState | null): void {
    this.mesh.visible = !!r;
    if (!r) return;
    this.mesh.position.set(r.x, 0.03, r.y);
    this.mesh.scale.set(0.5 * SUBDIV, 1, 0.2 * SUBDIV); // elipse de 0,5 × 0,2 célula, como no 2D
    this.mesh.material.color.setHex(r.attack ? RING_COLORS.attack : r.valid ? RING_COLORS.ok : RING_COLORS.bad);
  }

  dispose(): void {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
