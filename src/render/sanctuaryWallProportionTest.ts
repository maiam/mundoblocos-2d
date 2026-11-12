import * as THREE from 'three';
import { OBLIQUE_K } from './sanctuaryObliqueView';

/**
 * Cena de TESTE de proporção das paredes (ADR 0027), só para o dono do produto escolher a altura olhando: três paredes
 * lisas de cores diferentes, com a frente de 0,75, 1,0 e 1,25 célula na tela (vista oblíqua), cada uma com um quadrado
 * de 1 célula no chão como régua e a altura escrita na frente. A Deusa anda ao redor para ver a cabeça por cima.
 * Aberta por `?mundo=santuario&paredes=teste`; sem lógica de jogo (não entra no mapa, não bloqueia nada) e removível.
 */
export const WALL_TEST_FRONTS = [0.75, 1.0, 1.25] as const;
const WALL_WIDTH = 2;
const SPACING = 3.2;
const PALETTE = [
  { front: '#b9855a', top: '#e0b98a', line: '#8a5d3a' },
  { front: '#7f9fc4', top: '#b4cde8', line: '#56759b' },
  { front: '#8fb572', top: '#c0dba2', line: '#628549' },
] as const;

function frontTexture(label: string, color: string, line: string, aspect: number): THREE.CanvasTexture {
  const w = 256;
  const h = Math.round(w / aspect);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = color;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = line;
  g.lineWidth = 3;
  for (let x = 0; x <= w; x += w / 4) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  g.strokeRect(1.5, 1.5, w - 3, h - 3);
  g.fillStyle = '#fff';
  g.strokeStyle = '#3a2a1a';
  g.lineWidth = 4;
  g.font = `bold ${Math.round(Math.min(h * 0.34, w * 0.115))}px sans-serif`; // cabe na largura da face
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.strokeText(label, w / 2, h / 2);
  g.fillText(label, w / 2, h / 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** `spawn`: célula inicial da Deusa (x, z). As paredes ficam 4 células ao norte dela. */
export function createWallProportionTest(spawn: { x: number; z: number }): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Teste de proporção das paredes';
  WALL_TEST_FRONTS.forEach((front, i) => {
    const pal = PALETTE[i];
    const height = front / OBLIQUE_K; // altura no mundo: cada unidade sobe K de célula na tela
    const cx = spawn.x + 0.5 + (i - 1) * SPACING;
    const cz = spawn.z - 4 + 0.5;
    const label = `${String(front).replace('.', ',')} célula`;
    const frontMat = new THREE.MeshBasicMaterial({ map: frontTexture(label, pal.front, pal.line, WALL_WIDTH / height) });
    const sideMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(pal.front).multiplyScalar(0.72) });
    const topMat = new THREE.MeshBasicMaterial({ color: pal.top });
    // Ordem do BoxGeometry: +X, -X, +Y (topo), -Y, +Z (frente, para o sul), -Z
    const wall = new THREE.Mesh(new THREE.BoxGeometry(WALL_WIDTH, height, 1), [sideMat, sideMat, topMat, sideMat, frontMat, sideMat]);
    wall.position.set(cx, height / 2, cz);
    group.add(wall);
    // Régua: um quadrado de 1 célula no chão, logo à frente da parede.
    const ruler = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }));
    ruler.position.set(cx, 0.02, cz + 1.2);
    group.add(ruler);
  });
  return group;
}
