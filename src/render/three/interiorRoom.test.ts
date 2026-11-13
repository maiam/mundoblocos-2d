import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { INTERIOR_FALLBACK, InteriorRoom, roomBounds } from './interiorRoom';

const area = { x0: 100, y0: -300, x1: 108, y1: -283 }; // 9 × 18 células, como a ferraria
const fakeImage = (loaded: boolean) => ({ src: '', complete: loaded, naturalWidth: loaded ? 288 : 0 }) as unknown as HTMLImageElement;

describe('InteriorRoom (cômodo no 3D)', () => {
  it('limites do cômodo: o que está dentro (a área é inclusiva)', () => {
    expect(roomBounds(area)).toEqual({ x0: 100, y0: -300, x1: 109, y1: -282 });
  });

  it('escondido sem cômodo; com cômodo, um plano sobre a área com a cor de reserva até a arte carregar', () => {
    const layer = new THREE.Group();
    const room = new InteriorRoom(layer, { smithy: 'smithy.webp' }, () => fakeImage(false));
    expect(room.visible).toBe(false);
    room.update({ id: 'smithy', area });
    const mesh = layer.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
    expect(room.visible).toBe(true);
    expect(mesh.scale.toArray()).toEqual([9, 1, 18]);
    expect(mesh.position.toArray()).toEqual([104.5, 0.005, -291]);
    expect(mesh.material.map).toBeNull();
    expect(mesh.material.color.getHex()).toBe(new THREE.Color(INTERIOR_FALLBACK).getHex());
    room.update(null);
    expect(room.visible).toBe(false);
    expect(room.currentId).toBeNull();
  });

  it('a arte entra quando a imagem termina de carregar; id sem arte segue com a cor de reserva', () => {
    const layer = new THREE.Group();
    const img = fakeImage(false);
    const room = new InteriorRoom(layer, { smithy: 'smithy.webp' }, () => img);
    const mesh = layer.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
    room.update({ id: 'smithy', area });
    expect(mesh.material.map).toBeNull();
    (img as unknown as { complete: boolean; naturalWidth: number }).complete = true;
    (img as unknown as { naturalWidth: number }).naturalWidth = 288;
    room.update({ id: 'smithy', area });
    expect(mesh.material.map).not.toBeNull();
    expect(mesh.material.color.getHex()).toBe(0xffffff);
    room.update({ id: 'tenda-sem-arte', area });
    expect(mesh.material.map).toBeNull();
  });

  it('dispose remove o plano da camada', () => {
    const layer = new THREE.Group();
    const room = new InteriorRoom(layer, {}, () => fakeImage(false));
    room.dispose();
    expect(layer.children).toHaveLength(0);
  });
});
