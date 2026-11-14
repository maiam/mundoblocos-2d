import * as THREE from 'three';
import { CHUNK_SIZE } from '../../config';
import type { Chunk } from '../../world/chunk';
import type { ChunkRect } from '../../world/world';
import { buildWaterMask, WATER_MASK_SIZE } from '../waterFx';

export interface WaterSurfaceSource {
  /** A célula é água aberta (chão líquido sem objeto por cima)? */
  isOpenWater(x: number, y: number): boolean;
  /** Terra que recebe a faixa pintada da água (grama, areia, caminho, terra): entra na máscara se tem água ao lado. */
  paintedShore?(x: number, y: number): boolean;
  getChunk(cx: number, cy: number): Chunk | null | undefined;
  /** Ladrilho da água (repetível), quando a arte já carregou. */
  tile(): HTMLCanvasElement | null;
}

const VERTEX = `
uniform vec2 uOrigin;
varying vec2 vCell; varying vec2 vWorld;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xz;
  vCell = wp.xz - uOrigin;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;
/**
 * Duas cópias do ladrilho da água deslizando em direções e escalas diferentes (a diferença entre elas dá o movimento de ondas),
 * mais fios de luz que correm e a espuma que vai e volta na beira. Só onde a máscara marca água; a margem esmaece (a máscara tem 1 célula de vizinhança, então o
 * esmaecer cruza chunks). À noite fica mais escura, com fios azulados.
 */
const FRAGMENT = `
uniform sampler2D uMask; uniform sampler2D uTile;
uniform float uTime; uniform float uNight;
varying vec2 vCell; varying vec2 vWorld;
void main() {
  float m = texture2D(uMask, (vCell + 1.0) / ${WATER_MASK_SIZE}.0).r;
  float a = smoothstep(0.5, 0.95, m);
  // a faixa pintada da agua cobre 0.65 de celula da terra vizinha (a mascara inclui essa celula): a camada comeca na franja visivel
  // (m = 0.85 na celula de terra) e edge mede, em celulas, a distancia dali para dentro da agua
  if (m <= 0.85) discard;
  vec2 w = vWorld;
  vec2 warp = vec2(sin(w.y * 1.9 + uTime * 0.9), cos(w.x * 1.7 + uTime * 0.8)) * 0.06;
  vec3 c1 = texture2D(uTile, w / 1.7 + vec2(uTime * 0.020, uTime * 0.011) + warp).rgb;
  vec3 c2 = texture2D(uTile, w / 2.4 + vec2(-uTime * 0.014, uTime * 0.017) - warp).rgb;
  // o ladrilho tem pouco contraste (luma 0,575 ± 0,08): amplifica o desvio para virar manchas claras e escuras em movimento
  float l = dot(mix(c1, c2, 0.5), vec3(0.299, 0.587, 0.114));
  float pat = clamp(0.5 + (l - 0.575) * 4.0, 0.0, 1.0);
  vec3 deep = mix(vec3(0.0, 0.5, 0.82), vec3(0.0, 0.2, 0.45), uNight);
  vec3 lite = mix(vec3(0.5, 0.95, 1.0), vec3(0.35, 0.55, 0.9), uNight);
  vec3 col = mix(deep, lite, pat);
  float ln = sin(w.x * 2.3 + w.y * 1.4 + uTime * 1.3) * sin(w.x * 1.1 - w.y * 2.7 - uTime * 0.9);
  float shine = pow(max(ln, 0.0), 5.0);
  vec3 light = mix(vec3(1.0, 1.0, 0.95), vec3(0.62, 0.78, 1.0), uNight);
  col = mix(col, light, shine * (0.45 - 0.15 * uNight));
  // espuma na beira: a distância à margem vem da própria máscara (0 junto à margem pintada, ~0,7 no centro da célula); uma frente fina de
  // espuma vai e volta (vaivém por posição, com ruído para não ficar reta) e deixa um rastro perto da margem
  float edge = (m - 0.85) * 2.0;
  float n = sin(w.x * 7.3 + w.y * 5.1 + uTime * 0.7) * 0.5 + sin(w.x * 3.1 - w.y * 9.7 - uTime * 0.5) * 0.5;
  float lap = 0.5 + 0.5 * sin(uTime * 0.8 + (w.x + w.y) * 0.9 + n * 0.8);
  float front = 0.06 + 0.2 * lap + n * 0.04;
  float crest = smoothstep(front - 0.13, front - 0.03, edge) * (1.0 - smoothstep(front - 0.03, front + 0.07, edge));
  float trail = (1.0 - smoothstep(0.0, 0.1 + 0.08 * lap, edge)) * 0.55;
  float lace = 0.72 + 0.28 * sin(w.x * 13.0 + w.y * 11.0 + uTime * 1.5);
  float foam = clamp(crest + trail, 0.0, 1.0) * lace;
  vec3 foamCol = vec3(0.96, 1.0, 1.0) * (1.0 - 0.4 * uNight);
  gl_FragColor = vec4(mix(col, foamCol, foam), mix(a * 0.26, 0.85, foam));
}
`;

interface Layer {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  mask: THREE.DataTexture;
  data: Uint8Array;
  version: number;
}

/**
 * Superfície da água do Mundo no 3D (v0.93.86): um plano por chunk com água, colado ao chão (sem escrever profundidade), que
 * anima a água sem mexer nos pixels do chão (a água continua no canvas do chunk, que não é lido). Limite de máscaras refeitas por
 * quadro; chunks sem água ficam invisíveis; os que saem da área liberam a GPU.
 */
export class WaterSurface {
  private readonly layers = new Map<string, Layer>();
  private readonly geometry: THREE.PlaneGeometry;
  private tileTexture: THREE.CanvasTexture | null = null;
  private tileCanvas: HTMLCanvasElement | null = null;
  private readonly uniforms = { uTime: { value: 0 }, uNight: { value: 0 } };

  constructor(private readonly scene: THREE.Object3D, private readonly src: WaterSurfaceSource, private readonly maxMasksPerFrame = 4) {
    this.geometry = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE);
    this.geometry.rotateX(-Math.PI / 2);
  }

  /** Quantos chunks têm a camada visível (dev/testes). */
  get visibleCount(): number {
    let n = 0;
    for (const l of this.layers.values()) if (l.mesh.visible) n++;
    return n;
  }

  get count(): number { return this.layers.size; }

  update(rect: ChunkRect, elapsed: number, night: number): void {
    const canvas = this.src.tile();
    if (!canvas) return; // a arte da água ainda não chegou
    if (canvas !== this.tileCanvas) {
      this.tileTexture?.dispose();
      this.tileCanvas = canvas;
      this.tileTexture = new THREE.CanvasTexture(canvas);
      this.tileTexture.colorSpace = THREE.SRGBColorSpace;
      this.tileTexture.wrapS = this.tileTexture.wrapT = THREE.RepeatWrapping;
      this.tileTexture.generateMipmaps = false;
      this.tileTexture.minFilter = THREE.LinearFilter;
      for (const l of this.layers.values()) l.mesh.material.uniforms.uTile.value = this.tileTexture;
    }
    this.uniforms.uTime.value = elapsed;
    this.uniforms.uNight.value = night;
    let budget = this.maxMasksPerFrame;
    const keep = new Set<string>();
    for (let cy = rect.cy0; cy <= rect.cy1; cy++) {
      for (let cx = rect.cx0; cx <= rect.cx1; cx++) {
        const chunk = this.src.getChunk(cx, cy);
        if (!chunk) continue;
        const key = cx + ',' + cy;
        keep.add(key);
        let layer = this.layers.get(key);
        if (!layer) {
          if (budget <= 0) continue;
          layer = this.addLayer(key, cx, cy);
        }
        if (layer.version !== chunk.version && budget > 0) {
          budget--;
          const n = buildWaterMask(this.src.isOpenWater, cx * CHUNK_SIZE, cy * CHUNK_SIZE, CHUNK_SIZE, layer.data, this.src.paintedShore);
          layer.mask.needsUpdate = true;
          layer.version = chunk.version;
          layer.mesh.visible = n > 0;
        }
      }
    }
    for (const [key, l] of this.layers) {
      if (keep.has(key)) continue;
      this.removeLayer(l);
      this.layers.delete(key);
    }
  }

  private addLayer(key: string, cx: number, cy: number): Layer {
    const data = new Uint8Array(WATER_MASK_SIZE * WATER_MASK_SIZE);
    const mask = new THREE.DataTexture(data, WATER_MASK_SIZE, WATER_MASK_SIZE, THREE.RedFormat, THREE.UnsignedByteType);
    mask.minFilter = mask.magFilter = THREE.LinearFilter;
    mask.wrapS = mask.wrapT = THREE.ClampToEdgeWrapping;
    mask.generateMipmaps = false;
    mask.needsUpdate = true;
    const material = new THREE.ShaderMaterial({
      uniforms: {
        ...this.uniforms,
        uMask: { value: mask },
        uTile: { value: this.tileTexture },
        uOrigin: { value: new THREE.Vector2(cx * CHUNK_SIZE, cy * CHUNK_SIZE) },
      },
      vertexShader: VERTEX, fragmentShader: FRAGMENT, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -1,
    });
    const mesh = new THREE.Mesh(this.geometry, material);
    mesh.position.set(cx * CHUNK_SIZE + CHUNK_SIZE / 2, 0.012, cy * CHUNK_SIZE + CHUNK_SIZE / 2);
    mesh.renderOrder = -1; // acima do chão (opaco), abaixo das plantas e objetos translúcidos (ordem 0) e dos brilhos e do fluxo (ordem 1)
    mesh.frustumCulled = false;
    mesh.visible = false;
    mesh.name = 'Mundo: superfície da água ' + key;
    this.scene.add(mesh);
    const layer: Layer = { mesh, mask, data, version: -1 };
    this.layers.set(key, layer);
    return layer;
  }

  private removeLayer(l: Layer): void {
    this.scene.remove(l.mesh);
    l.mesh.material.dispose();
    l.mask.dispose();
  }

  dispose(): void {
    for (const l of this.layers.values()) this.removeLayer(l);
    this.layers.clear();
    this.tileTexture?.dispose();
    this.geometry.dispose();
  }
}
