import { describe, expect, it } from 'vitest';
import manifest from '../assets/materials-v2.json';
import { CUBE_FRONT, TILE } from '../config';
import { Block } from '../world/blocks';
import { TRANSITION_PIECES } from './transitions';
import { TEX_RES } from './textures';
import { blocksV2FromSearch, type CubeView, cubeEdges, edgesKey, V2_BLOCKS } from './materialsV2';

describe('Padrão de Materiais V2 (ADR 0023)', () => {
  it('manifesto gerado bate com a geometria do motor: topo T×T, franja T×CUBE_FRONT, frente inteira para fatiar', () => {
    expect(manifest.cell).toBe(TILE * TEX_RES);
    expect(manifest.rows.top[1]).toBe(TILE * TEX_RES);
    expect(manifest.rows.overlay[1]).toBe(CUBE_FRONT * TEX_RES);
    // A frente é a textura inteira (seamless); cada nível lê uma fatia de CUBE_FRONT × TEX_RES.
    expect(manifest.rows.front[1]).toBe(TILE * TEX_RES);
    expect(manifest.rows.front[1]).toBeGreaterThanOrEqual(CUBE_FRONT * TEX_RES);
  });

  it('todo bloco-piloto aponta para materiais que existem no atlas', () => {
    for (const b of Object.values(V2_BLOCKS)) {
      expect(manifest.materials).toContain(b!.top);
      expect(manifest.materials).toContain(b!.front);
      if (b!.overlay) expect(manifest.overlay).toContain(b!.overlay);
    }
  });

  it('Terra Arada, Caminho de Terra e Grama têm frente de terra e a franja do próprio topo', () => {
    for (const id of [Block.TILLED, Block.PATH, Block.GRASS]) {
      const b = V2_BLOCKS[id]!;
      expect(b.front).toBe('terra');
      expect(b.overlay).toBe(b.top);
    }
  });

  it('o V2 é o padrão; só ?blocos=legado volta ao atlas antigo', () => {
    expect(blocksV2FromSearch('?seed=1')).toBe(true);
    expect(blocksV2FromSearch('?blocos=v2&seed=1')).toBe(true);
    expect(blocksV2FromSearch('?blocos=legado')).toBe(false);
  });

  it('atlas de máscaras: uma forma, oito peças na ordem de TRANSITION_PIECES', () => {
    expect(manifest.masks!.order).toEqual([...TRANSITION_PIECES]);
    expect(manifest.masks!.cell).toBe(TILE * TEX_RES);
    expect(manifest.masks!.shapes).toEqual(['avanco']);
  });
});

/** Mapa de teste: alturas por célula ("x,y"); todo cubo é V2, menos as células em `legacy`. */
function view(heights: Record<string, number>, legacy: string[] = []): CubeView {
  const h = (x: number, y: number) => heights[`${x},${y}`] ?? 0;
  return { height: h, v2: (x, y, level) => level < h(x, y) && !legacy.includes(`${x},${y}`) };
}
const none = { n: false, wt: false, et: false, wf: false, ef: false, base: false };

describe('Massa contínua de cubos V2: contorno só na silhueta (ADR 0023)', () => {
  it('cubo isolado: contorno em tudo', () => {
    const e = cubeEdges(view({ '0,0': 1 }), 0, 0, 0);
    expect(e).toEqual({ top: true, front: true, n: true, wt: true, et: true, wf: true, ef: true, base: true });
  });

  it('platô 3×3 (materiais quaisquer): só a borda do conjunto tem contorno', () => {
    const heights: Record<string, number> = {};
    for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) heights[`${x},${y}`] = 1;
    const v = view(heights);
    expect(cubeEdges(v, 1, 1, 0)).toEqual({ top: true, front: false, ...none }); // miolo: nada
    expect(cubeEdges(v, 1, 0, 0)).toMatchObject({ n: true, wt: false, et: false, front: false }); // lado norte
    expect(cubeEdges(v, 0, 1, 0)).toMatchObject({ n: false, wt: true, et: false }); // lado oeste
    expect(cubeEdges(v, 1, 2, 0)).toMatchObject({ n: false, wt: false, et: false, front: true, wf: false, ef: false, base: true }); // frente da fileira sul: contínua
    expect(cubeEdges(v, 0, 2, 0)).toMatchObject({ wt: true, wf: true, ef: false, base: true }); // canto sudoeste
  });

  it('cubo vizinho que não é V2 continua separado por contorno', () => {
    const v = view({ '0,0': 1, '1,0': 1 }, ['1,0']);
    expect(cubeEdges(v, 0, 0, 0)).toMatchObject({ et: true, ef: true });
  });

  it('pilha de 3: níveis de baixo só mostram a frente, sem contorno entre eles; só o de cima tem topo', () => {
    const v = view({ '0,0': 3 });
    expect(cubeEdges(v, 0, 0, 0)).toEqual({ top: false, front: true, n: false, wt: false, et: false, wf: true, ef: true, base: true });
    expect(cubeEdges(v, 0, 0, 1)).toEqual({ top: false, front: true, n: false, wt: false, et: false, wf: true, ef: true, base: false });
    expect(cubeEdges(v, 0, 0, 2)).toEqual({ top: true, front: true, n: true, wt: true, et: true, wf: true, ef: true, base: false });
  });

  it('degrau: a borda do mais baixo com o mais alto é contorno; as frentes lado a lado continuam contínuas', () => {
    const v = view({ '0,0': 1, '1,0': 2 });
    expect(cubeEdges(v, 0, 0, 0)).toMatchObject({ top: true, et: true, ef: false }); // topo do baixo encosta no alto
    expect(cubeEdges(v, 1, 0, 0)).toMatchObject({ top: false, wf: false }); // frente do nível 0 segue a do vizinho
    expect(cubeEdges(v, 1, 0, 1)).toMatchObject({ top: true, wt: true, wf: true }); // o alto aparece sobre o vizinho
  });

  it('cubo coberto ao sul pelo topo do vizinho: sem frente, sem linha de pé', () => {
    const e = cubeEdges(view({ '0,0': 1, '0,1': 1 }), 0, 0, 0);
    expect(e).toMatchObject({ top: true, front: false, wf: false, ef: false, base: false, n: true });
  });

  it('chave das bordas distingue combinações', () => {
    const a = cubeEdges(view({ '0,0': 1 }), 0, 0, 0);
    expect(edgesKey(a)).not.toBe(edgesKey({ ...a, wt: false }));
    expect(edgesKey(a)).toBeLessThan(256);
  });
});
