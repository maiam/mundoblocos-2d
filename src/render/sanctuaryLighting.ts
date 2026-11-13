import * as THREE from 'three';
import { MAX_LIGHTS, type LightSource } from './lighting';

/**
 * Camada de iluminação do render 3D (ADR 0029): depois da cena, desenha um retângulo de tela cheia com a escuridão
 * ambiente e "buracos" de luz (um por fonte, com decaimento suave e leve tinta quente). É uma sobreposição 2D: não mexe nas
 * malhas nem na profundidade, custa um quadro cheio com um laço de até `MAX_LIGHTS` fontes e pode ser desligada sem efeito colateral.
 * O HUD é DOM e fica por cima, sem escurecer.
 */
const VERT = /* glsl */ `
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const FRAG = /* glsl */ `
precision highp float;
#define MAX_LIGHTS ${MAX_LIGHTS}
uniform vec4 uLights[MAX_LIGHTS];   // x, y (pixels do dispositivo, origem embaixo), raio (px), intensidade
uniform vec3 uColors[MAX_LIGHTS];
uniform int uCount;
uniform float uAmbient;             // 0 = escuridão total, 1 = sem escuridão
uniform vec3 uDark;
void main() {
  vec2 p = gl_FragCoord.xy;
  float lit = 0.0;
  vec3 glow = vec3(0.0);
  for (int i = 0; i < MAX_LIGHTS; i++) {
    if (i >= uCount) break;
    float t = clamp(1.0 - length(p - uLights[i].xy) / uLights[i].z, 0.0, 1.0);
    t = t * t * (3.0 - 2.0 * t) * uLights[i].w;
    lit = max(lit, t);
    glow += uColors[i] * t;
  }
  float dark = (1.0 - uAmbient) * (1.0 - lit);
  float warm = clamp(length(glow), 0.0, 1.0);
  vec3 tint = warm > 0.0 ? glow / max(max(glow.r, max(glow.g, glow.b)), 0.0001) : vec3(1.0);
  float a = dark + warm * 0.12 * (1.0 - dark);
  vec3 c = (uDark * dark + tint * warm * 0.12 * (1.0 - dark)) / max(a, 0.0001);
  gl_FragColor = vec4(c, a);
}
`;

export interface LightingFrame {
  /** Foco da câmera em células (x leste, z sul). */
  focus: { x: number; z: number };
  /** Pixels CSS por célula (TILE × zoom) e tamanho da tela em px CSS. */
  cellPx: number;
  width: number;
  height: number;
  pixelRatio: number;
  /** Quanto a altura sobe na tela por unidade (K da vista oblíqua). */
  k: number;
  elapsed: number;
}

export class SanctuaryLighting {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly material: THREE.ShaderMaterial;
  private readonly geometry = new THREE.PlaneGeometry(2, 2);

  constructor(ambient: number) {
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uLights: { value: Array.from({ length: MAX_LIGHTS }, () => new THREE.Vector4()) },
        uColors: { value: Array.from({ length: MAX_LIGHTS }, () => new THREE.Vector3()) },
        uCount: { value: 0 },
        uAmbient: { value: ambient },
        uDark: { value: new THREE.Color(0x0a0820) },
      },
    });
    const quad = new THREE.Mesh(this.geometry, this.material);
    quad.frustumCulled = false;
    this.scene.add(quad);
  }

  /** Posiciona as luzes na tela (mesma projeção oblíqua da vista) e as entrega ao shader. */
  update(lights: readonly LightSource[], f: LightingFrame, flicker: (l: LightSource, i: number) => number): void {
    const u = this.material.uniforms;
    const n = Math.min(lights.length, MAX_LIGHTS);
    for (let i = 0; i < n; i++) {
      const l = lights[i];
      const sx = f.width / 2 + (l.x - f.focus.x) * f.cellPx;
      const sy = f.height / 2 + (l.z - f.focus.z - f.k * l.height) * f.cellPx;
      const v = (u.uLights.value as THREE.Vector4[])[i];
      v.set(sx * f.pixelRatio, (f.height - sy) * f.pixelRatio, l.radius * f.cellPx * f.pixelRatio * flicker(l, i), 1);
      (u.uColors.value as THREE.Vector3[])[i].set(l.color[0], l.color[1], l.color[2]);
    }
    u.uCount.value = n;
  }

  /** Desenha a camada por cima do que já está no quadro (sem limpar). */
  render(gpu: THREE.WebGLRenderer): void {
    const auto = gpu.autoClear;
    gpu.autoClear = false;
    gpu.render(this.scene, this.camera);
    gpu.autoClear = auto;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
