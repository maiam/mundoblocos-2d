import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { ItemDrop } from '../../game/drops';
import { SUBDIV } from '../../config';
import { DropSprites, HoverRing, dropLift } from './itemSprites';

const image = { naturalWidth: 30, naturalHeight: 15 } as HTMLImageElement;
const view = { x0: 0, y0: 0, x1: 20, y1: 20 };
const drop = (x: number, y: number, age = 1): ItemDrop => ({ item: 'wheat' as ItemDrop['item'], x, y, age });

describe('itens caídos no 3D', () => {
  it('flutuação e pulo de saída (px do 2D ÷ TILE)', () => {
    // (na grade fina os px acompanham `SUBDIV`: o ícone mantém a altura em pixels)
    expect(dropLift(1, 0, 0)).toBeCloseTo((2 * SUBDIV) / 32);              // flutuando: 2 px com o seno em 0
    expect(dropLift(0.2, 0, 0)).toBeCloseTo(((2 + 10) * SUBDIV) / 32);    // meio do pulo: +10 px
    expect(dropLift(0, 0, 0)).toBeCloseTo((2 * SUBDIV) / 32);              // começo do pulo: ainda no chão
  });

  it('um ícone com sombra por item visível; sem imagem só a sombra; fora da área nada; sobras ficam escondidas', () => {
    const scene = new THREE.Scene();
    let ready: HTMLImageElement | undefined = image;
    const sprites = new DropSprites(scene, { get: () => ready }, 1);
    sprites.update(view, [drop(3, 4), drop(5, 6), drop(99, 1)], 0);
    expect(sprites.count).toBe(2);
    const icons = scene.children.filter((o) => o.name === 'Mundo: item caído') as THREE.Mesh[];
    expect(icons.filter((i) => i.visible)).toHaveLength(2);
    expect(icons[0].scale.x / icons[0].scale.y).toBeCloseTo(2); // a largura segue a proporção da imagem
    ready = undefined; // a imagem ainda não carregou
    sprites.update(view, [drop(3, 4)], 1);
    expect(icons.filter((i) => i.visible)).toHaveLength(0);
    expect(scene.children.filter((o) => o.name === 'Mundo: sombra de item' && o.visible)).toHaveLength(1);
    sprites.dispose();
    expect(scene.children).toHaveLength(0);
  });
});

describe('anel da ovelha', () => {
  it('cor pelo estado (dourado, rosado, vermelho), escondido sem alvo', () => {
    const scene = new THREE.Scene();
    const ring = new HoverRing(scene);
    const mesh = scene.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
    ring.update(null);
    expect(ring.visible).toBe(false);
    ring.update({ x: 2, y: 3, valid: true });
    expect(ring.visible).toBe(true);
    expect(mesh.position.toArray()).toEqual([2, 0.03, 3]);
    const ok = mesh.material.color.getHex();
    ring.update({ x: 2, y: 3, valid: false });
    const bad = mesh.material.color.getHex();
    ring.update({ x: 2, y: 3, valid: true, attack: true });
    const attack = mesh.material.color.getHex();
    expect(new Set([ok, bad, attack]).size).toBe(3);
    ring.dispose();
    expect(scene.children).toHaveLength(0);
  });
});
