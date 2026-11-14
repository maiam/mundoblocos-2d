import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { Chunk } from '../../world/chunk';
import type { BlockWorld } from './chunkBlocks';
import { ChunkSprites, SPRITE_BIAS_BASE, SPRITE_BIAS_PERIOD, SPRITE_BIAS_STEP, type SpriteArt, spriteDepthBias } from './chunkSprites';

const TREE = 7, GRASS = 8, CUBE = 5;
const canvasA = {} as HTMLCanvasElement;
const canvasB = {} as HTMLCanvasElement;
// árvore 64 × 96 px: base em oy + h = 32 (face sul da célula), ox = -16
const tree: SpriteArt = { canvas: canvasA, ox: -16, oy: -64, w: 64, h: 96, hit: { x: 0, y: -48, w: 32, h: 70 } };
const grass: SpriteArt = { canvas: canvasB, ox: 0, oy: 0, w: 32, h: 32, hit: { x: 0, y: 0, w: 32, h: 32 } };

function setup(maxBuilds = 2) {
  const chunks = new Map<string, Chunk>();
  for (let cx = 0; cx < 3; cx++) chunks.set(cx + ',0', { cx, cy: 0, version: 1 } as Chunk);
  const cells = new Map<string, number>();
  const world: BlockWorld = { getChunk: (cx, cy) => chunks.get(cx + ',' + cy), getLevel: (x, y) => cells.get(x + ',' + y) ?? 0 };
  const scene = new THREE.Scene();
  const sprites = new ChunkSprites(scene, world, {
    tile: 32, k: 1, maxBuildsPerFrame: maxBuilds,
    art: (id) => id === TREE ? { sprite: tree, walkable: false } : id === GRASS ? { sprite: grass, walkable: true } : null,
  });
  return { chunks, cells, scene, sprites };
}

describe('ChunkSprites (objetos altos do Mundo no 3D)', () => {
  it('um plano instanciado por sprite; cubos e vazio ficam de fora; sólido e de passar por cima usam materiais diferentes', () => {
    const { cells, sprites } = setup();
    cells.set('1,1', TREE); cells.set('3,3', TREE); cells.set('2,2', GRASS); cells.set('4,4', CUBE);
    sprites.update({ cx0: 0, cy0: 0, cx1: 0, cy1: 0 });
    const meshes = sprites.meshes();
    expect(meshes).toHaveLength(2);
    const trees = meshes.find((m) => m.count === 2)!;
    const soft = meshes.find((m) => m.count === 1)!;
    expect((trees.material as THREE.MeshBasicMaterial).depthWrite).toBe(true);
    expect((soft.material as THREE.MeshBasicMaterial).depthWrite).toBe(false);
    // a base do plano fica na face sul da célula: z = y + (oy + h) / tile = y + 1; x = x + ox / tile
    const m = new THREE.Matrix4();
    trees.getMatrixAt(0, m);
    const pos = new THREE.Vector3().setFromMatrixPosition(m);
    expect(pos.x).toBeCloseTo(0.5);
    expect(pos.y).toBe(0);
    expect(pos.z).toBeCloseTo(2 + spriteDepthBias(1), 6); // base na face sul + o desempate de profundidade da coluna
    // plano de 2 × 3 células (64 × 96 px), com a origem no canto inferior esquerdo
    const g = trees.geometry as THREE.PlaneGeometry;
    g.computeBoundingBox();
    expect(g.boundingBox!.min.toArray()).toEqual([0, 0, 0]);
    expect(g.boundingBox!.max.toArray()).toEqual([2, 3, 0]);
  });

  it('o pick só vale dentro do retângulo clicável do sprite (o plano tem áreas transparentes)', () => {
    const { cells, sprites } = setup();
    cells.set('1,1', TREE);
    sprites.update({ cx0: 0, cy0: 0, cx1: 0, cy1: 0 });
    const mesh = sprites.meshes()[0];
    const at = (x: number, height: number) => sprites.cellOf({ object: mesh, instanceId: 0, point: new THREE.Vector3(x, height, 2) } as unknown as THREE.Intersection);
    expect(at(1.5, 1)).toMatchObject({ x: 1, y: 1 }); // tronco: dentro de `hit`
    expect(at(0.2, 1)).toBeUndefined();               // à esquerda do tronco: copa transparente
    expect(at(1.5, 2.9)).toBeUndefined();              // acima do retângulo clicável
  });

  it('reconstrói só quando a version muda ou chega arte nova; respeita orçamento; libera fora da área; dispose limpa', () => {
    const { cells, chunks, scene, sprites } = setup(1);
    cells.set('1,1', TREE); cells.set('17,1', TREE); cells.set('33,1', TREE);
    const rect = { cx0: 0, cy0: 0, cx1: 2, cy1: 0 };
    sprites.update(rect);
    expect(sprites.meshes()).toHaveLength(1);
    sprites.update(rect); sprites.update(rect);
    expect(sprites.meshes()).toHaveLength(3);
    const first = sprites.meshes()[0];
    sprites.update(rect);
    expect(sprites.meshes()[0]).toBe(first);
    sprites.invalidateAll();
    for (let i = 0; i < 3; i++) sprites.update(rect);
    expect(sprites.meshes()).not.toContain(first);
    chunks.get('1,0')!.version++;
    sprites.update(rect);
    sprites.update({ cx0: 2, cy0: 0, cx1: 2, cy1: 0 });
    expect(sprites.count).toBe(1);
    sprites.dispose();
    expect(scene.children).toHaveLength(0);
  });

  it('empilhado N vezes: N instâncias, uma unidade de altura acima da outra; o pick desconta a altura do exemplar', () => {
    const chunks = new Map<string, Chunk>([['0,0', { cx: 0, cy: 0, version: 1 } as Chunk]]);
    const world: BlockWorld = { getChunk: (cx, cy) => chunks.get(cx + ',' + cy), getLevel: (x, y) => (x === 2 && y === 2 ? 9 : 0) };
    const scene = new THREE.Scene();
    const wall: SpriteArt = { canvas: {} as HTMLCanvasElement, ox: 0, oy: -18, w: 32, h: 50, hit: { x: 0, y: -18, w: 32, h: 50 } };
    const sprites = new ChunkSprites(scene, world, { tile: 32, k: 1, art: (id) => (id === 9 ? { sprite: wall, walkable: false, stack: 2 } : null) });
    sprites.update({ cx0: 0, cy0: 0, cx1: 0, cy1: 0 });
    const mesh = sprites.meshes()[0];
    expect(mesh.count).toBe(2);
    const m = new THREE.Matrix4();
    const ys = [0, 1].map((i) => { mesh.getMatrixAt(i, m); return new THREE.Vector3().setFromMatrixPosition(m).y; });
    expect(ys).toEqual([0, 1]);
    // um ponto a 1,4 de altura está no 2º exemplar (lift 1) a 0,4 acima da base dele: dentro do retângulo clicável
    const hit = (i: number, h: number) => sprites.cellOf({ object: mesh, instanceId: i, point: new THREE.Vector3(2.5, h, 3) } as unknown as THREE.Intersection);
    expect(hit(1, 1.4)).toMatchObject({ x: 2, y: 2, lift: 1 });
    expect(hit(0, 1.4)).toBeDefined(); // o 1º exemplar (50 px ≈ 1,56 célula) também cobre 1,4
    expect(hit(1, 3)).toBeUndefined();  // acima do 2º exemplar (1 + 1,56 = 2,56)
  });

  it('desempate de profundidade: vizinhos da mesma linha nunca empatam (o da direita fica na frente, como no 2D); folga pequena sobre as faces dos cubos', () => {
    for (let x = -200; x < 200; x++) {
      if ((x & (SPRITE_BIAS_PERIOD - 1)) === SPRITE_BIAS_PERIOD - 1) continue; // o salto do ciclo é o único lugar onde a ordem inverte
      expect(spriteDepthBias(x + 1)).toBeGreaterThan(spriteDepthBias(x));
    }
    expect(spriteDepthBias(0)).toBeCloseTo(SPRITE_BIAS_BASE);
    // menor que a meia profundidade dos pés do personagem (~0,14): não esconde quem está logo ao sul do tronco
    expect(spriteDepthBias(SPRITE_BIAS_PERIOD - 1)).toBeLessThan(0.14);
    // maior que a precisão de profundidade de 16 bits do pior celular (≈ 7e-4 de célula): o empate some de verdade
    expect(SPRITE_BIAS_STEP).toBeGreaterThan(7e-4);
    expect(spriteDepthBias(-5)).toBeGreaterThanOrEqual(SPRITE_BIAS_BASE); // colunas negativas (o covil fica em x ≈ −100000)
  });

  it('árvore que balança usa o material de copa (sólido, escreve profundidade) e entra na lista de árvores perto', () => {
    const chunks = new Map<string, Chunk>([['0,0', { cx: 0, cy: 0, version: 1 } as Chunk]]);
    const cells = new Map<string, number>([['1,1', TREE], ['2,2', GRASS]]);
    const world: BlockWorld = { getChunk: (cx, cy) => chunks.get(cx + ',' + cy), getLevel: (x, y) => cells.get(x + ',' + y) ?? 0 };
    const sprites = new ChunkSprites(new THREE.Scene(), world, {
      tile: 32, k: 1,
      art: (id) => id === TREE ? { sprite: tree, walkable: false } : id === GRASS ? { sprite: grass, walkable: true } : null,
      animated: (id) => (id === TREE ? 'tree' : null),
    });
    sprites.update({ cx0: 0, cy0: 0, cx1: 0, cy1: 0 });
    const m = sprites.meshes().find((x) => x.count === 1 && (x.material as THREE.MeshBasicMaterial).alphaTest === 0.5)!;
    expect((m.material as THREE.MeshBasicMaterial).depthWrite).toBe(true);
    expect(sprites.treesNear(1, 1, 3)).toHaveLength(1);
    expect(sprites.treesNear(30, 30, 3)).toHaveLength(0);
  });
});
