import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Item na mão em primeira pessoa (ADR 0071). Carrega o GLB do item (pivô na palma, ponta em +Y), troca o material pelo do renderer (luz do dia, sem luzes de cena)
 * e dá à geometria o sombreado fixo por face (`color`) e `glow` zero que o `patchDayLight` espera, como no rig do Farejador.
 */
export async function loadHeldModel(url: string, material: (map: THREE.Texture) => THREE.Material): Promise<THREE.Group> {
  const gltf = await new GLTFLoader().loadAsync(url);
  const scene = gltf.scene;
  let mat: THREE.Material | null = null;
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const src = m.material as THREE.MeshStandardMaterial;
    mat ??= material(src.map!);
    m.material = mat;
    m.frustumCulled = false;
    const g = m.geometry, nrm = g.getAttribute('normal'), n = nrm.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const ny = nrm.getY(i), nx = nrm.getX(i), nz = nrm.getZ(i);
      const s = 0.62 + 0.3 * Math.max(0, ny) + 0.12 * nx + 0.08 * nz; // de cima/da direita mais claro, de baixo mais escuro
      const v = Math.max(0.5, Math.min(1, s));
      col.set([v, v, v], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('glow', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  });
  const group = new THREE.Group();
  group.add(scene);
  return group;
}
