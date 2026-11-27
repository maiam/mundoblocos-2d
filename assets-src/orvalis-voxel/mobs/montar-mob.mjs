/**
 * Cria a hierarquia em repouso a partir de uma entrada de mobs64px-uv.json.
 * Forneça uma textura carregada com THREE.TextureLoader.
 */
export function montarMob(THREE, entrada, textura) {
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.magFilter = THREE.NearestFilter;
  textura.minFilter = THREE.NearestFilter;
  textura.generateMipmaps = false;
  textura.flipY = true;
  textura.needsUpdate = true;

  const material = new THREE.MeshLambertMaterial({ map: textura, alphaTest: 0.5 });
  const grupo = new THREE.Group();
  const juntas = new Map();
  const ordem = ['+X', '-X', '+Y', '-Y', '+Z', '-Z'];

  for (const parte of entrada.parts) {
    const junta = new THREE.Group();
    junta.name = parte.id;
    junta.position.set(...parte.pivotPx.map(v => v / 16));
    junta.rotation.set(...parte.restEulerRad);
    (parte.parent ? juntas.get(parte.parent) : grupo).add(junta);
    juntas.set(parte.id, junta);

    const geometria = new THREE.BoxGeometry(...parte.sizePx.map(v => v / 16));
    const uv = geometria.getAttribute('uv');
    for (const [faceIndex, face] of ordem.entries()) {
      const [x, y, w, h] = parte.uvPx[face];
      for (let a = faceIndex * 4; a < faceIndex * 4 + 4; a++) {
        uv.setXY(a, (x + uv.getX(a) * w) / 64, 1 - (y + (1 - uv.getY(a)) * h) / 64);
      }
    }
    uv.needsUpdate = true;
    const malha = new THREE.Mesh(geometria, material);
    malha.position.set(...parte.meshOffsetPx.map(v => v / 16));
    junta.add(malha);
  }

  return { grupo, juntas, material };
}
