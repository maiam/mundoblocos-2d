import * as THREE from 'three';
import { OBLIQUE_K } from './sanctuaryObliqueView';

/**
 * Cena de TESTE da escala do mundo (ADR 0028), só para o dono do produto validar olhando. Compara, lado a lado e na mesma
 * tela, a escala ATUAL (cada cubo sobe `OBLIQUE_K` = 0,56 célula na tela; personagem de 2,2 células) com a NOVA proposta
 * (1 célula = 1 m: cada cubo sobe 1,0 célula; parede = 2 cubos = 2 células; personagem de ~1,75). Cada grupo traz um cubo,
 * uma parede de 2 cubos, uma régua vertical de 1 m por segmento e uma personagem de referência parada. A Deusa que se mexe
 * usa a escala NOVA. Aberta por `?mundo=santuario&paredes=teste`; sem lógica de jogo (não entra no mapa) e removível.
 *
 * Na vista oblíqua, vertical é só deslocamento na tela: para uma altura de tela `s` o objeto tem altura de mundo `s / K`.
 */
export const NEW_CUBE_FRONT = 1.0;
/** Altura da personagem na escala nova (células ≈ metros) sobre a atual (2,2 células): 1,75 / 2,2. */
export const NEW_CHARACTER_SCALE = 1.75 / 2.2;
const WALL_CUBES = 2;
const BILLBOARD_H = 3.0; // altura de tela do plano da personagem na escala atual (células)

interface Group { name: string; front: number; character: number; x: number; hue: string; top: string; line: string }

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
 * `spawn`: célula inicial da Deusa (x, z); os grupos ficam 5 células ao norte dela.
 * `makeReference(scaleY)`: cria um plano de personagem parado (mesma textura animada da Deusa), com a altura de tela
 * `BILLBOARD_H * scale` — fornecido pelo renderer, dono da textura.
 */
export function createWallProportionTest(spawn: { x: number; z: number }, makeReference: (screenHeight: number) => THREE.Object3D): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Teste da escala do mundo (1 célula = 1 m)';
  const groups: Group[] = [
    { name: 'ATUAL', front: OBLIQUE_K, character: 1, x: spawn.x + 0.5 - 4.5, hue: '#b9855a', top: '#e0b98a', line: '#8a5d3a' },
    { name: 'NOVA (1 m)', front: NEW_CUBE_FRONT, character: NEW_CHARACTER_SCALE, x: spawn.x + 0.5 + 4.5, hue: '#7f9fc4', top: '#b4cde8', line: '#56759b' },
  ];
  for (const gr of groups) {
    const cz = spawn.z - 5 + 0.5;
    const hOf = (screen: number): number => screen / OBLIQUE_K;
    const mats = (cubes: number, aspect: number) => {
      const front = new THREE.MeshBasicMaterial({ map: frontFace(gr.hue, gr.line, cubes, aspect) });
      const side = new THREE.MeshBasicMaterial({ color: new THREE.Color(gr.hue).multiplyScalar(0.72) });
      const top = new THREE.MeshBasicMaterial({ color: gr.top });
      return [side, side, top, side, front, side]; // +X, -X, +Y, -Y, +Z (frente, sul), -Z
    };
    // cubo (1 m)
    const cubeH = hOf(gr.front);
    const cube = new THREE.Mesh(new THREE.BoxGeometry(1, cubeH, 1), mats(1, 1 / gr.front));
    cube.position.set(gr.x - 3, cubeH / 2, cz);
    group.add(cube);
    // parede de 2 cubos (2 m)
    const wallH = hOf(gr.front * WALL_CUBES);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(2, wallH, 1), mats(WALL_CUBES, 2 / (gr.front * WALL_CUBES)));
    wall.position.set(gr.x - 0.5, wallH / 2, cz);
    group.add(wall);
    // régua vertical: um segmento por metro, cores alternadas
    for (let i = 0; i < WALL_CUBES; i++) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.16, hOf(gr.front), 0.16), new THREE.MeshBasicMaterial({ color: i % 2 ? '#ffffff' : '#e0486a' }));
      seg.position.set(gr.x + 1.4, hOf(gr.front) * (i + 0.5), cz);
      group.add(seg);
    }
    // personagem de referência parada, ao lado da régua
    const ref = makeReference(BILLBOARD_H * gr.character);
    ref.position.set(gr.x + 2.6, 0.03, cz);
    group.add(ref);
    // réguas no chão: 1 m x 1 m diante do cubo e da parede
    for (const dx of [-3, -0.5]) {
      const ruler = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
      ruler.position.set(gr.x + dx, 0.02, cz + 1.25);
      group.add(ruler);
    }
    const label = groundLabel(gr.name);
    label.position.set(gr.x, 0.03, cz + 2.3);
    group.add(label);
  }
  return group;
}
