import * as THREE from 'three';
import type { RGB, Sky } from '../titan/sky';

/**
 * Cúpula do céu do Titã (ADR 0048): um **shader** sobre a esfera que acompanha a câmera. Tudo é função da direção do olhar e de uniforms (a hora só muda números; nenhuma malha é refeita):
 * degradê horizonte → meio → zênite; **bruma direcional** (halo largo e suave do lado do Sol/poente e ocre mais frio no lado oposto); duas faixas finas de bruma baixa com deriva lenta;
 * poucas **estrelas** fracas perto do zênite à noite; e, raramente, **Saturno** quase apagado atrás da bruma (um trecho dos anéis, sempre no mesmo ponto do céu, encoberto abaixo de certa altura).
 * As cores chegam em sRGB e viram linear aqui, como as do resto da cena; a saída passa pelos mesmos trechos de mapa de tons e espaço de cor do Three.js.
 */
const VERT = /* glsl */ `
varying vec3 vDir;
void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const FRAG = /* glsl */ `
uniform vec3 uZenith, uMid, uHorizon, uFog, uGlowDir, uGlow, uCool, uSatDir;
uniform float uGlowK, uCoolK, uHaze, uStars, uTime, uSaturn;
varying vec3 vDir;
float hash(vec3 p) { p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
void main() {
  vec3 d = normalize(vDir);
  float h = max(d.y, 0.0);
  vec3 col = h < 0.35 ? mix(uHorizon, uMid, h / 0.35) : mix(uMid, uZenith, (h - 0.35) / 0.65);
  // bruma direcional: ocre mais frio longe do Sol; halo largo e suave perto dele (mais forte rente ao horizonte)
  float gd = dot(d, uGlowDir);
  col = mix(col, col * uCool, clamp(uCoolK * (1.0 - gd) * 0.5, 0.0, 1.0));
  float low = 1.0 - smoothstep(0.0, 0.75, h);
  col += uGlow * uGlowK * (pow(max(gd, 0.0), 3.0) * 0.22 * (0.4 + 0.6 * low) + pow(max(gd, 0.0), 28.0) * 0.5);
  // duas faixas finas de bruma baixa, com deriva lenta
  float az = atan(d.z, d.x);
  float n1 = 0.5 + 0.5 * sin(az * 3.0 + uTime * 0.015) * cos(az * 5.0 - uTime * 0.01);
  float n2 = 0.5 + 0.5 * sin(az * 4.0 - uTime * 0.02 + 1.7);
  float b1 = exp(-pow((h - 0.09) / 0.045, 2.0)), b2 = exp(-pow((h - 0.22) / 0.035, 2.0));
  col = mix(col, uFog + uGlow * uGlowK * 0.15 * max(gd, 0.0), clamp(uHaze * (0.30 * b1 * n1 + 0.20 * b2 * n2), 0.0, 0.6));
  // estrelas: poucas, fracas, só no alto
  float sv = uStars * smoothstep(0.32, 0.85, d.y);
  if (sv > 0.001) {
    vec3 p = d * 42.0; vec3 id = floor(p); vec3 f = fract(p) - 0.5;
    float r = hash(id);
    float star = step(0.9925, r) * (1.0 - smoothstep(0.08, 0.22, length(f)));
    col += vec3(0.85, 0.88, 1.0) * star * (0.65 + 0.35 * sin(uTime * 1.1 + r * 80.0)) * sv * 0.8;
  }
  // Saturno: um trecho tênue dos anéis e o disco quase apagado, no mesmo ponto do céu; a bruma o encobre abaixo de certa altura
  if (uSaturn > 0.001 && dot(d, uSatDir) > 0.9) {
    vec3 t1 = normalize(cross(vec3(0.0, 1.0, 0.0), uSatDir)); vec3 t2 = cross(uSatDir, t1);
    vec2 q = vec2(dot(d, t1), dot(d, t2));
    vec2 r = vec2(q.x * 0.8776 + q.y * 0.4794, -q.x * 0.4794 + q.y * 0.8776);
    float e = length(vec2(r.x / 0.105, r.y / 0.034));
    float ring = smoothstep(0.62, 0.66, e) * (1.0 - smoothstep(0.80, 0.84, e)) + 0.7 * smoothstep(0.88, 0.91, e) * (1.0 - smoothstep(0.98, 1.01, e));
    float arc = smoothstep(-0.15, 0.55, -r.y / 0.034 + 0.1);
    float disc = exp(-pow(length(q) / 0.035, 2.0)) * 0.35;
    col += vec3(0.95, 0.82, 0.55) * (ring * arc * 0.42 + disc * 0.45) * uSaturn * smoothstep(0.2, 0.46, d.y);
  }
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** Direção fixa de Saturno no céu da Margem (Titã mostra sempre a mesma face ao planeta): nordeste, a ~35° de altura. */
export const SATURN_DIR: [number, number, number] = (() => { const v: [number, number, number] = [0.42, 0.58, -0.7]; const m = Math.hypot(...v); return [v[0] / m, v[1] / m, v[2] / m]; })();

export class SkyDome {
  readonly mesh: THREE.Mesh;
  private readonly u: Record<string, THREE.IUniform>;
  private readonly tmp = new THREE.Color();

  constructor() {
    const col = (): THREE.IUniform => ({ value: new THREE.Color() });
    this.u = {
      uZenith: col(), uMid: col(), uHorizon: col(), uFog: col(), uGlow: col(),
      uGlowDir: { value: new THREE.Vector3(1, 0, 0) }, uCool: { value: new THREE.Vector3(1, 1, 1) }, uSatDir: { value: new THREE.Vector3(...SATURN_DIR) },
      uGlowK: { value: 0 }, uCoolK: { value: 0 }, uHaze: { value: 0 }, uStars: { value: 0 }, uTime: { value: 0 }, uSaturn: { value: 0 },
    };
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 12), new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: VERT, fragmentShader: FRAG, side: THREE.BackSide, depthWrite: false, fog: false }));
    this.mesh.renderOrder = -1;
  }

  private setColor(name: string, v: RGB): void { (this.u[name].value as THREE.Color).setRGB(v[0], v[1], v[2], THREE.SRGBColorSpace); }

  /** Aplica a aparência da hora (uniforms; sem remalhar). */
  update(sky: Sky): void {
    this.setColor('uZenith', sky.zenith); this.setColor('uMid', sky.mid); this.setColor('uHorizon', sky.horizon); this.setColor('uFog', sky.fog); this.setColor('uGlow', sky.glow);
    (this.u.uGlowDir.value as THREE.Vector3).set(...sky.glowDir);
    (this.u.uCool.value as THREE.Vector3).set(...sky.cool);
    this.u.uGlowK.value = sky.glowK; this.u.uCoolK.value = sky.coolK; this.u.uHaze.value = sky.haze; this.u.uStars.value = sky.stars;
  }
  setTime(t: number): void { this.u.uTime.value = t; }
  /** 0–1: quanto de Saturno aparece agora. */
  setSaturn(v: number): void { this.u.uSaturn.value = v; }
  /** Cor linear de uma cor sRGB (para a névoa e o fundo, que o Three.js converte sozinho). */
  tint(v: RGB): THREE.Color { return this.tmp.setRGB(v[0], v[1], v[2], THREE.SRGBColorSpace); }
}
