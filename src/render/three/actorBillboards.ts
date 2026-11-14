import * as THREE from 'three';
import { TILE } from '../../config';
import type { Actor, ActorKind } from '../../game/entities';
import { drawHeart } from '../character';
import type { ActorLight } from '../actorLight';
import { FIRE_COLOR, fireLightOn, type FireSource } from '../fireLight';

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
  /** Eco translúcido do primeiro ator (o jogador) por cima de tudo: mostra onde ele está quando uma copa ou parede o esconde. */
  echo?: boolean;
  /** Sombreado por quadro com a luz do sol/lua (normais falsas pela forma e pelo brilho do desenho); desligado = atores chapados como antes. */
  lit?: boolean;
  createCanvas?(): HTMLCanvasElement;
}

/** Luz compartilhada por todos os atores (os mesmos objetos de uniforme em todos os materiais). */
function makeLightUniforms() {
  return {
    uSunDir: { value: new THREE.Vector3(0.3, 0.9, 0.5).normalize() },
    uSunColor: { value: new THREE.Vector3(1, 0.97, 0.9) },
    uAmbient: { value: new THREE.Vector3(0.74, 0.8, 0.95) },
    uLightStrength: { value: 1 },
    uFireColor: { value: new THREE.Vector3(...FIRE_COLOR) },
  };
}

/**
 * Sombreado do ator: depois de ler a cor da folha, estima uma "normal" por pixel (o alfa borrado dá o arredondado da silhueta, o
 * brilho dá o relevo das dobras), acende com o sol (difuso + brilho de contorno do lado do sol) e escurece de leve junto dos pés. O
 * resultado é relativo a uma normal de frente: sem sol o ator fica como a arte, o dia continua claro.
 */
const LIT_HEAD = `
uniform vec2 uTexel; uniform vec2 uFeet; uniform float uStrength;
uniform vec3 uSunDir; uniform vec3 uSunColor; uniform vec3 uAmbient; uniform float uLightStrength;
uniform vec3 uFireDir; uniform float uFireInt; uniform vec3 uFireColor;
float lumOf(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
`;
const LIT_BODY = `
#ifdef USE_MAP
if (uStrength * uLightStrength > 0.001 && diffuseColor.a > 0.05) {
  vec2 t = uTexel * 2.0;
  vec4 L = texture2D(map, vMapUv + vec2(-t.x, 0.0)); vec4 R = texture2D(map, vMapUv + vec2(t.x, 0.0));
  vec4 U = texture2D(map, vMapUv + vec2(0.0, t.y)); vec4 D = texture2D(map, vMapUv + vec2(0.0, -t.y));
  float gx = (R.a - L.a) + 1.8 * (lumOf(R.rgb) * R.a - lumOf(L.rgb) * L.a);
  float gy = (U.a - D.a) + 1.8 * (lumOf(U.rgb) * U.a - lumOf(D.rgb) * D.a);
  vec3 n = normalize(vec3(-gx * 2.2, -gy * 2.2, 1.0));
  vec3 l = normalize(uSunDir);
  float flat0 = max(dot(vec3(0.0, 0.0, 1.0), l), 0.0);
  float lit = max(dot(n, l), 0.0);
  vec3 shade = uAmbient + uSunColor * lit;
  vec3 shade0 = uAmbient + uSunColor * flat0;
  vec3 rel = clamp(shade / max(shade0, vec3(0.001)), vec3(0.72), vec3(1.32));
  float rim = pow(1.0 - n.z, 2.0) * max(dot(normalize(n.xy + vec2(0.0001)), normalize(l.xy + vec2(0.0001))), 0.0);
  float along = clamp((vMapUv.y - uFeet.x) / max(uFeet.y, 0.001), 0.0, 1.0);
  float ground = mix(0.9, 1.0, smoothstep(0.0, 0.3, along));
  vec3 col = diffuseColor.rgb * rel * ground + uSunColor * rim * 0.38 * diffuseColor.a;
  diffuseColor.rgb = mix(diffuseColor.rgb, col, uStrength * uLightStrength);
}
// Luz da fogueira (v0.93.67): quente, do lado dela, vale de dia e de noite (não depende do sol).
if (uFireInt > 0.001 && diffuseColor.a > 0.05) {
  vec2 ft = uTexel * 2.0;
  float fgx = texture2D(map, vMapUv + vec2(ft.x, 0.0)).a - texture2D(map, vMapUv - vec2(ft.x, 0.0)).a;
  float fgy = texture2D(map, vMapUv + vec2(0.0, ft.y)).a - texture2D(map, vMapUv - vec2(0.0, ft.y)).a;
  vec3 fn = normalize(vec3(-fgx * 2.2, -fgy * 2.2, 1.0));
  float fl = max(dot(fn, normalize(uFireDir)), 0.0);
  diffuseColor.rgb += diffuseColor.rgb * uFireColor * (0.18 + 0.7 * fl) * uFireInt;
}
#endif
`;

interface Slot {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  /** Uniformes próprios do quadro (tamanho do texel, onde ficam os pés no canvas, quanto o sombreado vale neste ator). */
  u: { uTexel: { value: THREE.Vector2 }; uFeet: { value: THREE.Vector2 }; uStrength: { value: number }; uFireDir: { value: THREE.Vector3 }; uFireInt: { value: number } };
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
  private readonly light = makeLightUniforms();
  private fires: readonly FireSource[] = [];
  private shadowDir = { dx: 0, dz: 0, len: 1, opacity: 0.22 };
  private echo: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null = null;

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
    if (opts.echo) {
      // Nunca desligar o teste de profundidade do personagem em si (achataria todo obstáculo à frente): o eco é um segundo plano.
      this.echo = new THREE.Mesh(this.plane, new THREE.MeshBasicMaterial({
        color: 0xe6dcff, transparent: true, opacity: 0.45, depthTest: false, depthWrite: false, alphaTest: 0.015, side: THREE.DoubleSide,
      }));
      this.echo.renderOrder = 2;
      this.echo.frustumCulled = false;
      this.echo.visible = false;
      this.echo.name = 'Mundo: eco do jogador';
      scene.add(this.echo);
    }
  }

  /** Luz da hora do dia (`actorLightAt`): sol/lua para o sombreado e a sombra no chão. Chamar antes de `update`. */
  setLight(l: ActorLight): void {
    this.light.uSunDir.value.set(...l.dir);
    this.light.uSunColor.value.set(...l.color);
    this.light.uAmbient.value.set(...l.ambient);
    this.light.uLightStrength.value = l.strength;
    this.shadowDir = l.shadow;
  }

  /** Fogueiras visíveis (`findFires`): iluminam os atores perto delas. Chamar antes de `update`. */
  setFires(f: readonly FireSource[]): void {
    this.fires = f;
  }

  /** O eco do jogador está visível? (dev/testes) */
  get echoVisible(): boolean { return !!this.echo?.visible; }

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
      // Onde ficam os pés e a altura do desenho em coordenadas de textura (v de baixo para cima), para o escurecimento junto ao chão.
      slot.u.uFeet.value.set((3 * z) / side, (sheet.drawHeight * z * (a.scale ?? 1)) / side);
      slot.u.uStrength.value = a.kind === 'love-hearts' || a.dying !== undefined ? 0 : 1;
      const fl = a.kind === 'love-hearts' || this.fires.length === 0 ? null : fireLightOn(a.x, a.y, this.fires, elapsed);
      slot.u.uFireInt.value = fl ? fl.intensity : 0;
      if (fl) slot.u.uFireDir.value.set(...fl.dir);
      const cells = side / (z * TILE) * this.opts.scale;
      slot.mesh.scale.set(cells, cells / this.opts.k, 1);
      slot.mesh.position.set(a.x, a.visualZ + 0.03, a.y);
      slot.mesh.visible = true;
      if (this.echo && a === chosen[0]) {
        this.echo.material.map = slot.texture;
        this.echo.scale.copy(slot.mesh.scale);
        this.echo.position.copy(slot.mesh.position);
        this.echo.visible = true;
      }
      const [rx, ry] = sheet.shadowRadii;
      const dying = a.dying ?? 0;
      // Sombra projetada pelo sol: cai para o lado oposto a ele, mais comprida com o sol baixo (sem luz ligada: o círculo de sempre).
      const sd = this.opts.lit === false ? { dx: 0, dz: 0, len: 1, opacity: 0.22 } : this.shadowDir;
      const sx = rx * Math.sqrt(this.opts.scale), sz = ry * Math.sqrt(this.opts.scale);
      const reach = (sd.len - 1) * sx * 0.5;
      slot.shadow.position.set(a.x + sd.dx * reach, a.visualZ + 0.018, a.y + sd.dz * reach);
      slot.shadow.rotation.y = Math.atan2(sd.dz, sd.dx) * -1;
      slot.shadow.scale.set(sx * sd.len, 1, sz);
      slot.shadow.material.opacity = sd.opacity * (1 - dying);
      slot.shadow.visible = rx > 0;
    }
    this.drawn = chosen.length;
    if (this.echo && chosen.length === 0) this.echo.visible = false;
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
    const material = new THREE.MeshBasicMaterial({
      map: texture, transparent: true, depthTest: true, depthWrite: false, alphaTest: 0.015, side: THREE.DoubleSide,
    });
    const u = { uTexel: { value: new THREE.Vector2(1 / side, 1 / side) }, uFeet: { value: new THREE.Vector2(0, 0.5) }, uStrength: { value: 0 }, uFireDir: { value: new THREE.Vector3(0, 1, 0) }, uFireInt: { value: 0 } };
    if (this.opts.lit !== false) {
      material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, u, this.light);
        shader.fragmentShader = shader.fragmentShader
          .replace('void main() {', `${LIT_HEAD}\nvoid main() {`)
          .replace('#include <map_fragment>', `#include <map_fragment>\n${LIT_BODY}`);
      };
    }
    const mesh = new THREE.Mesh(this.plane, material);
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
    s = { mesh, u, shadow, canvas, ctx: canvas.getContext('2d'), texture, side };
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
    if (this.echo) { this.scene.remove(this.echo); this.echo.material.dispose(); this.echo = null; }
    this.pools.clear();
    this.plane.dispose();
    this.shadowGeometry.dispose();
  }
}
