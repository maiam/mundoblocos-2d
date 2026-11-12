import * as THREE from 'three';
import { OBLIQUE_K } from './sanctuaryObliqueView';

/**
 * Cena de TESTE da escala do mundo (ADR 0028), só para o dono do produto validar olhando. Compara, lado a lado e na mesma
 * tela, TRÊS escalas (frente do cubo, parede e personagem, em células na tela):
 *   ATUAL     — cubo 0,56 (`OBLIQUE_K`), parede de 2 cubos = 1,125, personagem 2,2;
 *   PROPOSTA  — cubo 1,0, parede de 2 cubos = 2,0, personagem 1,75 (1 célula = 1 m);
 *   CORE KEEPER — medida de uma cena do jogo (v0.93.13): cubo 1,0, parede ≈ 1,2 (≈ a altura do personagem), personagem 1,2.
 * Cada grupo traz um cubo, uma parede, uma régua vertical (2 segmentos) e uma personagem de referência parada. A Deusa que se
 * mexe usa a escala escolhida em `?escala=atual|proposta|core` (padrão: core). Aberta por `?mundo=santuario&paredes=teste`;
 * sem lógica de jogo (não entra no mapa) e removível.
 *
 * Na vista oblíqua, vertical é só deslocamento na tela: para uma altura de tela `s` o objeto tem altura de mundo `s / K`.
 */
export type ScalePreset = 'atual' | 'proposta' | 'core';
export interface ScaleDef { name: string; cube: number; wall: number; character: number }
/** Altura da personagem na escala atual, em células na tela (`CHARACTER_H` / `TILE`). */
const CURRENT_CHARACTER = 2.2;
export const SCALE_PRESETS: Record<ScalePreset, ScaleDef> = {
  atual: { name: 'ATUAL', cube: OBLIQUE_K, wall: OBLIQUE_K * 2, character: CURRENT_CHARACTER },
  proposta: { name: 'PROPOSTA 1,75', cube: 1.0, wall: 2.0, character: 1.75 },
  core: { name: 'CORE KEEPER 1,2', cube: 1.0, wall: 1.2, character: 1.2 },
};
/** Fator da personagem sobre a escala atual (o plano da Deusa foi desenhado para 2,2). */
export function characterScale(preset: ScalePreset): number {
  return SCALE_PRESETS[preset].character / CURRENT_CHARACTER;
}
const BILLBOARD_H = 3.0; // altura de tela do plano da personagem na escala atual (células)
const GROUP_SPACING = 6.4;

interface Group extends ScaleDef { x: number; hue: string; top: string; line: string }

function canvasTexture(draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, w: number, h: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function frontFace(color: string, line: string, cubes: number, aspect: number): THREE.CanvasTexture {
  const w = 256;
  const h = Math.max(32, Math.round(w / aspect));
  return canvasTexture((g) => {
    g.fillStyle = color;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = line;
    g.lineWidth = 3;
    // uma linha por metro (cada cubo), para ler a altura em cubos
    for (let i = 1; i < cubes; i++) { g.beginPath(); g.moveTo(0, (h * i) / cubes); g.lineTo(w, (h * i) / cubes); g.stroke(); }
    g.strokeRect(1.5, 1.5, w - 3, h - 3);
  }, w, h);
}

function groundLabel(text: string): THREE.Mesh {
  const tex = canvasTexture((g, w, h) => {
    g.font = 'bold 40px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 7;
    g.strokeStyle = '#2a2a52';
    g.strokeText(text, w / 2, h / 2);
    g.fillStyle = '#fff';
    g.fillText(text, w / 2, h / 2);
  }, 512, 96);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.renderOrder = 4;
  return m;
}

/**
 * `spawn`: célula inicial da Deusa (x, z); os grupos ficam 5 células ao norte dela, lado a lado (atual, proposta, Core Keeper).
 * `makeReference(scaleY)`: cria um plano de personagem parado (mesma textura animada da Deusa), com a altura de tela
 * `BILLBOARD_H * scale` — fornecido pelo renderer, dono da textura.
 */
export function createWallProportionTest(spawn: { x: number; z: number }, makeReference: (screenHeight: number) => THREE.Object3D): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Teste da escala do mundo (3 escalas)';
  const colors = [
    { hue: '#b9855a', top: '#e0b98a', line: '#8a5d3a' },
    { hue: '#7f9fc4', top: '#b4cde8', line: '#56759b' },
    { hue: '#8fb572', top: '#c0dba2', line: '#628549' },
  ];
  const groups: Group[] = (['atual', 'proposta', 'core'] as ScalePreset[]).map((k, i) => ({
    ...SCALE_PRESETS[k], x: spawn.x + 0.5 + (i - 1) * GROUP_SPACING, ...colors[i],
  }));
  for (const gr of groups) {
    const cz = spawn.z - 5 + 0.5;
    const hOf = (screen: number): number => screen / OBLIQUE_K;
    const mats = (cubes: number, aspect: number) => {
      const front = new THREE.MeshBasicMaterial({ map: frontFace(gr.hue, gr.line, cubes, aspect) });
      const side = new THREE.MeshBasicMaterial({ color: new THREE.Color(gr.hue).multiplyScalar(0.72) });
      const top = new THREE.MeshBasicMaterial({ color: gr.top });
      return [side, side, top, side, front, side]; // +X, -X, +Y, -Y, +Z (frente, sul), -Z
    };
    // cubo (frente = gr.cube)
    const cubeH = hOf(gr.cube);
    const cube = new THREE.Mesh(new THREE.BoxGeometry(1, cubeH, 1), mats(1, 1 / gr.cube));
    cube.position.set(gr.x - 2.6, cubeH / 2, cz);
    group.add(cube);
    // parede (frente = gr.wall); linhas a cada cubo para ler a altura em cubos
    const wallH = hOf(gr.wall);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(2, wallH, 1), mats(Math.max(1, Math.round(gr.wall / gr.cube)), 2 / gr.wall));
    wall.position.set(gr.x - 0.6, wallH / 2, cz);
    group.add(wall);
    // régua vertical: 2 segmentos de 1 cubo, cores alternadas
    for (let i = 0; i < 2; i++) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.16, hOf(gr.cube), 0.16), new THREE.MeshBasicMaterial({ color: i % 2 ? '#ffffff' : '#e0486a' }));
      seg.position.set(gr.x + 1.0, hOf(gr.cube) * (i + 0.5), cz);
      group.add(seg);
    }
    // personagem de referência parada, ao lado da régua
    const ref = makeReference(BILLBOARD_H * (gr.character / CURRENT_CHARACTER));
    ref.position.set(gr.x + 2.2, 0.03, cz);
    group.add(ref);
    // réguas no chão: 1 x 1 célula diante do cubo e da parede
    for (const dx of [-2.6, -0.6]) {
      const ruler = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
      ruler.position.set(gr.x + dx, 0.02, cz + 1.25);
      group.add(ruler);
    }
    const label = groundLabel(gr.name);
    label.position.set(gr.x - 0.2, 0.03, cz + 2.3);
    group.add(label);
  }
  return group;
}
