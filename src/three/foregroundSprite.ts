import * as THREE from 'three';

/**
 * Sprite 2D usado como personagem jogável em cenário 3D.
 *
 * Uma parede ou plataforma alta pode passar à frente do plano do sprite em
 * câmera superior, escondendo apenas o rosto/cabeça. No protótipo de Orvalis
 * a leitura do protagonista tem prioridade sobre a oclusão de terreno.
 *
 * Importante: a prioridade é apenas VISUAL. Raycast, colisões, altura e
 * construção continuam usando a geometria real do mundo.
 *
 * Quando construções com andares/interiores forem implementadas, substituir
 * essa regra pela oclusão contextual (paredes/telhados transparentes).
 */
export function makeForegroundCharacterSprite(map: any): any {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map,
    transparent: true,
    alphaTest: 0.04,
    depthTest: false,
    depthWrite: false,
  }));
  // Above cloud overlays and selection planes (renderOrder <= 2).
  sprite.renderOrder = 10;
  return sprite;
}
