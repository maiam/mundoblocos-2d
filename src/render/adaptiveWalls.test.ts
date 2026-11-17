import { describe, expect, it } from 'vitest';
import { Block, type BlockId } from '../world/blocks';
import { ADAPTIVE_WALL_BLOCKS, horizontalWallShape, thinWallSlices } from './adaptiveWalls';

const view = (entries: Array<[number,number,number,BlockId]>) => {
  const cells = new Map(entries.map(([x,y,z,id])=>[x+':'+y+':'+z,id]));
  return {getLevel(x:number,y:number,z:number):BlockId {
    return cells.get(x+':'+y+':'+z) ?? Block.AIR;
  }};
};
const buildRun = (id:BlockId,length:number,level=0) =>
  view(Array.from({length},(_,i)=>[i,2,level,id] as [number,number,number,BlockId]));

describe('autotile de paredes 2D do motor oficial', () => {
  it('mantém 1/2 blocos sólidos e afina somente o interior das linhas horizontais', () => {
    for(const id of [Block.STONE_BRICK,Block.STONE_SMOOTH,Block.STONE_POLISHED,
      Block.OAK_PLANKS,Block.CHERRY_PLANKS,Block.BIRCH_PLANKS]) {
      expect(ADAPTIVE_WALL_BLOCKS.has(id)).toBe(true);
      for(const n of [1,2,3,4,5]) {
        const w=buildRun(id,n);
        for(let x=0;x<n;x++) expect(horizontalWallShape(w,id,x,2,0))
          .toBe(x>0&&x<n-1?'thin':'solid');
      }
    }
  });

  it('terra, pedra natural, areia, pisos e nuvens nunca afinam', () => {
    for(const id of [Block.DIRT,Block.GRASS,Block.STONE,Block.SAND,Block.STONE_FLOOR,
      Block.OAK_LOG]) {
      const w=buildRun(id,5);
      expect(horizontalWallShape(w,id,2,2,0)).toBe('solid');
    }
  });

  it('volumes 2×2 e 3×3 permanecem maciços; linhas frente/atrás não afinam', () => {
    for(const size of [2,3]) {
      const positions: Array<[number,number,number,BlockId]>=[];
      for(let x=0;x<size;x++)for(let y=0;y<size;y++)
        positions.push([x,y,0,Block.STONE_BRICK]);
      const w=view(positions);
      for(const [x,y,z,id] of positions) expect(horizontalWallShape(w,id,x,y,z)).toBe('solid');
    }
    const w=view([[2,1,0,Block.STONE_BRICK],[2,2,0,Block.STONE_BRICK],[2,3,0,Block.STONE_BRICK]]);
    expect(horizontalWallShape(w,Block.STONE_BRICK,2,2,0)).toBe('solid');
  });

  it('célula perpendicular impede afinar, sem produzir conexão T ou canto', () => {
    const run: Array<[number,number,number,BlockId]> =
      [0,1,2,3,4].map(x=>[x,2,0,Block.STONE_BRICK]);
    const w=view([...run,[2,1,0,Block.DIRT]]);
    expect(horizontalWallShape(w,Block.STONE_BRICK,2,2,0)).toBe('solid');
    expect(horizontalWallShape(w,Block.STONE_BRICK,1,2,0)).toBe('thin');
    expect(horizontalWallShape(w,Block.STONE_BRICK,3,2,0)).toBe('thin');
  });

  it('porta aberta ou fechada é pilar na base e conecta paredes dos dois níveis', () => {
    for(const door of [Block.OAK_DOOR,Block.OAK_DOOR_OPEN]) {
      const w=view([[0,2,0,Block.STONE_BRICK],[1,2,0,Block.STONE_BRICK],
        [2,2,0,door],[3,2,0,Block.STONE_BRICK],[4,2,0,Block.STONE_BRICK],
        [1,2,1,Block.STONE_POLISHED],[3,2,1,Block.STONE_SMOOTH]]);
      expect(horizontalWallShape(w,Block.STONE_BRICK,1,2,0)).toBe('thin');
      expect(horizontalWallShape(w,door,2,2,0)).toBe('solid');
      expect(horizontalWallShape(w,Block.STONE_BRICK,3,2,0)).toBe('thin');
      // Os painéis acima herdam a forma da base mesmo sem vizinhos no andar.
      expect(horizontalWallShape(w,Block.STONE_POLISHED,1,2,1)).toBe('thin');
      expect(horizontalWallShape(w,Block.STONE_SMOOTH,3,2,1)).toBe('thin');
      // A porta continua sendo o pilar; não se cria parede no lugar dela.
      expect(horizontalWallShape(w,Block.STONE_BRICK,2,2,1)).toBe('solid');
    }
  });

  it('segundo nível herda parede, mesmo com material ou vizinhança diferente', () => {
    const w=view([
      [0,2,0,Block.STONE_BRICK],[1,2,0,Block.STONE_BRICK],[2,2,0,Block.STONE_BRICK],
      [1,2,1,Block.OAK_PLANKS],
      [1,1,1,Block.OAK_PLANKS], // vizinho frontal só no piso superior: não muda forma
    ]);
    expect(horizontalWallShape(w,Block.STONE_BRICK,1,2,0)).toBe('thin');
    expect(horizontalWallShape(w,Block.OAK_PLANKS,1,2,1)).toBe('thin');
  });

  it('segundo nível herda pilar, mesmo se seus próprios vizinhos formarem uma linha', () => {
    const w=view([
      [0,2,0,Block.STONE_BRICK],[1,2,0,Block.STONE_BRICK],
      [2,2,0,Block.STONE_BRICK],[1,1,0,Block.STONE_BRICK],
      [0,2,1,Block.OAK_PLANKS],[1,2,1,Block.OAK_PLANKS],
      [2,2,1,Block.OAK_PLANKS],
    ]);
    expect(horizontalWallShape(w,Block.STONE_BRICK,1,2,0)).toBe('solid');
    expect(horizontalWallShape(w,Block.OAK_PLANKS,1,2,1)).toBe('solid');
  });

  it('segundo nível sem base adaptativa ou não construtivo permanece maciço', () => {
    const w=view([
      [0,2,0,Block.STONE_BRICK],[1,2,0,Block.DIRT],[2,2,0,Block.STONE_BRICK],
      [0,2,1,Block.STONE_BRICK],[1,2,1,Block.STONE_BRICK],
      [2,2,1,Block.STONE_BRICK],
    ]);
    expect(horizontalWallShape(w,Block.STONE_BRICK,1,2,1)).toBe('solid');
    expect(horizontalWallShape(w,Block.OAK_PLANKS,10,2,1)).toBe('solid'); // sem base
    expect(horizontalWallShape(w,Block.DIRT,1,2,1)).toBe('solid'); // não construtivo
    expect(horizontalWallShape(w,Block.STONE_BRICK,1,2,2)).toBe('solid'); // fora do limite
  });

  it('ao adicionar/remover vizinho da base, a geometria dos dois níveis muda junta', () => {
    const cells: Array<[number,number,number,BlockId]> = [
      [0,2,0,Block.STONE_BRICK],[1,2,0,Block.STONE_BRICK],
      [2,2,0,Block.STONE_BRICK],[1,2,1,Block.STONE_POLISHED],
    ];
    expect(horizontalWallShape(view(cells),Block.STONE_POLISHED,1,2,1)).toBe('thin');
    cells.push([1,3,0,Block.OAK_PLANKS]); // massa perpendicular na base
    expect(horizontalWallShape(view(cells),Block.STONE_POLISHED,1,2,1)).toBe('solid');
    cells.pop();
    expect(horizontalWallShape(view(cells),Block.STONE_POLISHED,1,2,1)).toBe('thin');
  });

  it('níveis diferentes ou materiais de bloco incompatíveis não criam paredes', () => {
    const w=view([[0,2,0,Block.STONE_BRICK],[1,2,0,Block.STONE_BRICK],
      [2,2,1,Block.STONE_BRICK],[2,2,0,Block.STONE_SMOOTH]]);
    expect(horizontalWallShape(w,Block.STONE_BRICK,1,2,0)).toBe('solid');
  });

  it('recorta somente metade traseira do topo, preservando 100% da frente', () => {
    const r=thinWallSlices(100,50,82,114,132);
    expect(r).toEqual({topSrcY:32,topSrcH:32,frontSrcY:64,frontSrcH:36,
      topY:98,topH:16,frontY:114,frontH:18});
  });
});
