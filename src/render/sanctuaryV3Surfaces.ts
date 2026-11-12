import * as THREE from 'three';

/**
 * Superfícies visuais do Mármore Celestial V3 (uma por célula lógica).
 *
 * A peça física continua ocupando dois níveis no World, mas:
 * - FACE é um plano vertical no limite norte da célula-base;
 * - TOPO é um plano horizontal sem qualquer frente adicional;
 * - MEIO-TOPO ocupa somente a metade sul da célula terminal.
 *
 * Os índices de material são os de BoxGeometry: topo +Y = 2,
 * face +Z = 4. A câmera oficial está ao sul (+Z), sem yaw.
 */
export function createSanctuaryV3Surfaces(): {
  face: THREE.PlaneGeometry;
  top: THREE.PlaneGeometry;
  halfTop: THREE.PlaneGeometry;
} {
  const face=new THREE.PlaneGeometry(1,2);
  face.translate(0,0,-0.5);
  face.clearGroups();
  face.addGroup(0,6,4);

  const top=new THREE.PlaneGeometry(1,1);
  top.rotateX(-Math.PI/2);
  top.clearGroups();
  top.addGroup(0,6,2);

  const halfTop=new THREE.PlaneGeometry(1,0.5);
  halfTop.rotateX(-Math.PI/2);
  halfTop.translate(0,0,0.25);
  halfTop.clearGroups();
  halfTop.addGroup(0,6,2);

  return {face,top,halfTop};
}
