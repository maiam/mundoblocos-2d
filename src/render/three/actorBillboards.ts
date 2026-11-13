import * as THREE from 'three';
import { TILE } from '../../config';
import type { Actor, ActorKind } from '../../game/entities';
import { drawHeart } from '../character';

/** O que o pool precisa de uma folha de sprites (a `SpriteSheet` 2D, que continua dona do desenho de cada quadro). */
export interface ActorSheet {
  draw(ctx: CanvasRenderingContext2D, fx: number, fy: number, zoom: number, a: Actor, elapsed: number, drawShadow: boolean): void;
  readonly drawHeight: number;
  readonly frameAspect: number;
  readonly shadowRadii: [number, number];
}
export interface ActorSource { get(kind: ActorKind): ActorSheet }

/** Área visível em células de mundo. */
export interface ActorView { x0: number; y0: number; x1: number; y1: number }

export interface ActorBillboardsOptions {
  /** Fator de escala do mundo para personagens e criaturas (`CHARACTER_SCALE_FACTOR`, ADR 0028). */
  scale: number;
  /** Fator vertical da vista (K): a altura do plano é dividida por ele. */
  k: number;
  /** Zoom com que a folha é pintada no canvas do plano (mais = mais nítido, mais pesado). */
  paintZoom?: number;
  /** Teto de atores desenhados por quadro (o jogador sempre entra). */
  maxActors?: number;
  createCanvas?(): HTMLCanvasElement;
}

interface Slot {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  shadow: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | null;
  texture: THREE.CanvasTexture;
  side: number;
}

/** Quais atores desenhar: o primeiro (o jogador) sempre; dos demais, os que caem na área visível, do mais perto ao mais longe do jogador. */
export function selectVisibleActors<T extends { x: number; y: number }>(actors: readonly T[], view: ActorView, max: number): T[] {
  if (actors.length === 0) return [];
  const [first, ...rest] = actors;
  const inView = rest.filter((a) => a.x >= view.x0 && a.x <= view.x1 && a.y >= view.y0 && a.y <= view.y1);
  inView.sort((a, b) => Math.hypot(a.x - first.x, a.y - first.y) - Math.hypot(b.x - first.x, b.y - first.y));
  return [first, ...inView.slice(0, Math.max(0, max - 1))];
}

/**
 * Atores do Mundo no 3D (ADR 0031, M3.1): cada ator visível é um plano vertical com a folha 2D pintada num canvas (pé embaixo,
 * ao centro), com sombra no chão — o jogador, NPCs, animais, goblins e monstros, com nome (outros jogadores), coração de namoro
 * e barra de vida de monstro (a `SpriteSheet` 2D já pinta a barra, o piscar de dano e a morte). Pools por tamanho de canvas
 * (nada é recriado por quadro); `depthTest` ligado e sem escrever profundidade, como o personagem do Santuário.
 */
export class ActorBillboards {
  private readonly pools = new Map<number, Slot[]>();
  private readonly plane: THREE.PlaneGeometry;
  private readonly shadowGeometry: THREE.BufferGeometry;
  private readonly zoom: number;
  private drawn = 0;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly sheets: ActorSource,
    private readonly opts: ActorBillboardsOptions,
  ) {
    this.zoom = opts.paintZoom ?? 2;
    this.plane = new THREE.PlaneGeometry(1, 1);
    this.plane.translate(0, 0.5, 0); // origem nos pés
    this.shadowGeometry = new THREE.CircleGeometry(1, 24);
    this.shadowGeometry.rotateX(-Math.PI / 2);
  }

  /** Atores desenhados no último quadro (dev/testes). */
  get count(): number { return this.drawn; }

  update(view: ActorView, actors: readonly Actor[], elapsed: number): void {
    const chosen = selectVisibleActors(actors, view, this.opts.maxActors ?? 48);
    const used = new Map<number, number>();
    for (const a of chosen) {
      const sheet = this.sheets.get(a.kind);
      const z = this.zoom;
      // Lado do canvas: a folha inteira com folga em cima (nome, coração, barra de vida) e dos lados (quadros largos).
      const side = Math.ceil(sheet.drawHeight * z * Math.max(1, sheet.frameAspect) * 1.45 / 16) * 16;
      const index = used.get(side) ?? 0;
      used.set(side, index + 1);
      const slot = this.slot(side, index);
      this.paint(slot, sheet, a, elapsed);
      const cells = side / (z * TILE) * this.opts.scale;
      slot.mesh.scale.set(cells, cells / this.opts.k, 1);
      slot.mesh.position.set(a.x, a.visualZ + 0.03, a.y);
      slot.mesh.visible = true;
      const [rx, ry] = sheet.shadowRadii;
      const dying = a.dying ?? 0;
      slot.shadow.position.set(a.x, a.visualZ + 0.018, a.y);
      slot.shadow.scale.set(rx * Math.sqrt(this.opts.scale), 1, ry * Math.sqrt(this.opts.scale));
      slot.shadow.material.opacity = 0.22 * (1 - dying);
      slot.shadow.visible = rx > 0;
    }
    this.drawn = chosen.length;
    for (const [side, slots] of this.pools) {
      const n = used.get(side) ?? 0;
      for (let i = n; i < slots.length; i++) slots[i].mesh.visible = slots[i].shadow.visible = false;
    }
  }

  private slot(side: number, index: number): Slot {
    let pool = this.pools.get(side);
    if (!pool) { pool = []; this.pools.set(side, pool); }
    let s = pool[index];
    if (s) return s;
    const canvas = (this.opts.createCanvas ?? (() => document.createElement('canvas')))();
    canvas.width = canvas.height = side;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    const mesh = new THREE.Mesh(this.plane, new THREE.MeshBasicMaterial({
      map: texture, transparent: true, depthTest: true, depthWrite: false, alphaTest: 0.015, side: THREE.DoubleSide,
    }));
    mesh.renderOrder = 3;
    mesh.name = 'Mundo: ator';
    mesh.frustumCulled = false;
    const shadow = new THREE.Mesh(this.shadowGeometry, new THREE.MeshBasicMaterial({
      color: 0x241648, transparent: true, opacity: 0.22, depthTest: true, depthWrite: false, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -2,
    }));
    shadow.renderOrder = 1;
    shadow.name = 'Mundo: sombra de ator';
    this.scene.add(shadow);
    this.scene.add(mesh);
    s = { mesh, shadow, canvas, ctx: canvas.getContext('2d'), texture, side };
    pool.push(s);
    return s;
  }

  private paint(slot: Slot, sheet: ActorSheet, a: Actor, elapsed: number): void {
    const { ctx, side } = slot;
    if (!ctx) return;
    const z = this.zoom;
    ctx.clearRect(0, 0, side, side);
    const fx = side / 2;
    const fy = side - 3 * z; // a folha pinta os pés 2 px abaixo do ponto dado
    sheet.draw(ctx, fx, fy, z, a, elapsed, false); // a sombra é um plano no chão, não um desenho vertical
    const top = fy - sheet.drawHeight * z * (a.scale ?? 1) - 4 * z;
    if (a.label) { // nome de outro jogador (multiplayer)
      ctx.font = `800 ${Math.round(11 * z)}px Nunito, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.lineWidth = 3 * z;
      ctx.strokeStyle = 'rgba(28, 22, 64, 0.9)';
      ctx.strokeText(a.label, fx, Math.max(12 * z, top));
      ctx.fillStyle = '#ffffff';
      ctx.fillText(a.label, fx, Math.max(12 * z, top));
    }
    if (a.inLove) { // coração flutuando enquanto está apaixonada
      const bob = Math.sin(elapsed * 3 + a.x) * 3 * z;
      const size = 9 * z * (1 + 0.08 * Math.sin(elapsed * 6));
      drawHeart(ctx, fx, Math.max(size, top + bob), size);
    }
    slot.texture.needsUpdate = true;
  }

  /** Contexto restaurado: reenvia as texturas. */
  reupload(): void {
    for (const pool of this.pools.values()) for (const s of pool) s.texture.needsUpdate = true;
  }

  dispose(): void {
    for (const pool of this.pools.values()) {
      for (const s of pool) {
        this.scene.remove(s.mesh);
        this.scene.remove(s.shadow);
        s.mesh.material.dispose();
        s.shadow.material.dispose();
        s.texture.dispose();
      }
    }
    this.pools.clear();
    this.plane.dispose();
    this.shadowGeometry.dispose();
  }
}
