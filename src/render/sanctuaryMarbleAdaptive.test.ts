import { describe, expect, it, vi } from 'vitest';
import { Block, type BlockId } from '../world/blocks';
import { classifySanctuaryBlock, sanctuaryBlockTransform } from './sanctuaryThreeLayout';
import {
  classifyMarbleProfile, drawMarbleAdaptiveTop, marbleExposureKey,
  marbleTopExposure, marbleFootprint, type MarbleEdgeExposure,
  type MarbleProfile,
} from './sanctuaryMarbleAdaptive';
import { sanctuaryCameraOffset, SANCTUARY_CAMERA_ELEVATION_DEG } from './sanctuaryCameraRig';

const marble=Block.MARBLE_CELESTIAL;
type Cell=[number,number,number,BlockId];
const build=(points:Cell[])=>{
  const cells=new Map(points.map(([x,y,z,id])=>[String([x,y,z]),id]));
  return {getLevel(x:number,y:number,z:number):BlockId {
    return cells.get(String([x,y,z]))??Block.AIR;
  }};
};
const line=(y:number,xs:number[]):Cell[]=>
  xs.map(x=>[x,y,0,marble]);
const vertical=(x:number,ys:number[]):Cell[]=>
  ys.map(y=>[x,y,0,marble]);
const rectangle=(w:number,h:number):Cell[]=>{
  const a:Cell[]=[];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)
    if(x===0||y===0||x===w-1||y===h-1)a.push([x,y,0,marble]);
  return a;
};
const profile=(w:ReturnType<typeof build>,x:number,y:number):MarbleProfile=>
  classifyMarbleProfile(w,x,y);
const exposure=(w:ReturnType<typeof build>,x:number,y:number,z=0)=>
  marbleTopExposure(w,x,y,z,
    classifySanctuaryBlock(w,marble,x,y,z),
    (xx,yy,zz)=>classifySanctuaryBlock(w,marble,xx,yy,zz));
const NONE:MarbleEdgeExposure={north:false,south:false,
  west:[false,false,false,false],east:[false,false,false,false]};

describe('Santuário — Mármore Celestial adaptativo (dois níveis)',()=>{
  it('bloco isolado começa como parede INFERIOR (frente), nunca pilar',()=>{
    const w=build([[7,9,0,marble],[7,9,1,marble]]);
    expect(profile(w,7,9)).toBe('wall_front');
    expect(classifySanctuaryBlock(w,marble,7,9,0)).toBe('wall_front');
    expect(classifySanctuaryBlock(w,marble,7,9,1)).toBe('wall_front');
    expect(marbleFootprint(9,'wall_front')).toEqual({rear:9.5,front:10});
  });

  it('fileira horizontal isolada (inclusive extremidades) continua sendo parede inferior',()=>{
    for(const n of [2,3,5]){
      const w=build(line(7,Array.from({length:n},(_,i)=>i)));
      for(let x=0;x<n;x++)expect(profile(w,x,7)).toBe('wall_front');
    }
  });

  it('qualquer nova conexão VERTICAL na tela transforma os dois vizinhos em pilares',()=>{
    const cells:Cell[]=[[2,2,0,marble]];
    expect(profile(build(cells),2,2)).toBe('wall_front');
    cells.push([2,3,0,marble]);
    expect(profile(build(cells),2,2)).toBe('pillar');
    expect(profile(build(cells),2,3)).toBe('pillar');
    cells.push([2,4,0,marble]);
    expect([2,3,4].map(y=>profile(build(cells),2,y)))
      .toEqual(['pillar','pillar','pillar']);
    // Removing the connection restores the default wall automatically.
    cells.splice(1);
    expect(profile(build(cells),2,2)).toBe('wall_front');
  });

  it('parede conectada ao TOPO da coluna ocupa a metade de trás',()=>{
    const cells=[...vertical(0,[0,1,2]),...line(0,[1,2,3])];
    const w=build(cells);
    expect(profile(w,0,0)).toBe('pillar');
    for(const x of [1,2,3])expect(profile(w,x,0)).toBe('wall_back');
  });

  it('parede conectada à BASE da coluna ocupa a metade da frente',()=>{
    const w=build([...vertical(0,[0,1,2]),...line(2,[1,2,3])]);
    for(const x of [1,2,3])expect(profile(w,x,2)).toBe('wall_front');
  });

  it('parede ligada ao MEIO de uma coluna de três usa o centro (25–75%)',()=>{
    const w=build([...vertical(0,[0,1,2]),...line(1,[1,2,3])]);
    expect(profile(w,0,1)).toBe('pillar');
    for(const x of [1,2,3]) {
      expect(profile(w,x,1)).toBe('wall_middle');
      expect(classifySanctuaryBlock(w,marble,x,1,0)).toBe('wall_middle');
    }
    expect(marbleFootprint(1,'wall_middle')).toEqual({rear:1.25,front:1.75});
  });

  it('sala retangular 3×3 / 5×5: cantos e paredes N–S são pilares',()=>{
    for(const n of [3,5]){
      const w=build(rectangle(n,n));
      for(let x=1;x<n-1;x++){
        expect(profile(w,x,0)).toBe('wall_back');
        expect(profile(w,x,n-1)).toBe('wall_front');
      }
      for(let y=0;y<n;y++){
        expect(profile(w,0,y)).toBe('pillar');
        expect(profile(w,n-1,y)).toBe('pillar');
      }
    }
  });

  it('três travessas ligadas à coluna geram fundo, meio e frente',()=>{
    const w=build([...vertical(0,[0,1,2]), ...vertical(4,[0,1,2]),
      ...line(0,[1,2,3]),...line(1,[1,2,3]),...line(2,[1,2,3])]);
    // This is a full 5×3 slab: cells with north/south neighbors are pillars.
    // Verify on separate branches to avoid turning horizontal walls into columns.
    for(const y of [0,1,2]){
      const wRow=build([...vertical(0,[0,1,2]),...vertical(4,[0,1,2]),
        ...line(y,[1,2,3])]);
      const expected=y===0?'wall_back':y===1?'wall_middle':'wall_front';
      for(const x of [1,2,3])expect(profile(wRow,x,y)).toBe(expected);
    }
    expect(profile(w,2,1)).toBe('pillar');
  });

  it('geometria 3D coloca cada parede na metade correta e a coluna em 100%',()=>{
    const pillar=sanctuaryBlockTransform({x:1,y:5,level:1,shape:'solid'});
    const back=sanctuaryBlockTransform({x:1,y:5,level:1,shape:'wall_back'});
    const mid=sanctuaryBlockTransform({x:1,y:5,level:1,shape:'wall_middle'});
    const front=sanctuaryBlockTransform({x:1,y:5,level:1,shape:'wall_front'});
    expect(pillar).toMatchObject({y:1.5,z:5.5,depth:1});
    expect(back).toMatchObject({y:1.5,z:5.25,depth:0.5});
    expect(mid).toMatchObject({y:1.5,z:5.5,depth:0.5});
    expect(front).toMatchObject({y:1.5,z:5.75,depth:0.5});
    expect(back.z-back.depth/2).toBe(pillar.z-pillar.depth/2);
    expect(front.z+front.depth/2).toBe(pillar.z+pillar.depth/2);
  });

  it('nível superior herda a mesma forma sem examinar vizinhos próprios',()=>{
    const w=build([...vertical(0,[0,1,2]),[1,1,0,marble],
      [1,1,1,Block.MARBLE_ORNATE],[1,2,1,marble]]);
    expect(classifySanctuaryBlock(w,marble,1,1,0)).toBe('wall_middle');
    expect(classifySanctuaryBlock(w,Block.MARBLE_ORNATE,1,1,1)).toBe('wall_middle');
    expect(classifySanctuaryBlock(w,Block.CLOUD_SOLID,1,1,1)).toBe('solid');
  });

  it('moldura de pilar oculta metade traseira, dianteira ou central',()=>{
    const withSide=(y:number)=>build([...vertical(0,[0,1,2]),[1,y,0,marble]]);
    expect(exposure(withSide(0),0,0).east).toEqual([false,false,true,true]);
    expect(exposure(withSide(1),0,1).east).toEqual([true,false,false,true]);
    expect(exposure(withSide(2),0,2).east).toEqual([true,true,false,false]);
    expect(exposure(withSide(1),1,1).west).toEqual([false,false,false,false]);
    expect(exposure(withSide(1),1,1).north).toBe(true);
    expect(exposure(withSide(1),1,1).south).toBe(true);
  });

  it('textura ornamentada usa máscara de 10 segmentos para resolver meia borda',()=>{
    const mask:MarbleEdgeExposure={
      north:true,south:false,west:[true,false,false,true],
      east:[false,true,false,true],
    };
    expect(marbleExposureKey(mask)).toBe('1010010101');
    expect(marbleExposureKey({...mask,north:false})).not.toBe(marbleExposureKey(mask));
    expect(marbleExposureKey({...mask,west:[true,false,true,true]}))
      .not.toBe(marbleExposureKey(mask));
  });

  it('topo isolado mostra arte completa; conectado oculta moldura interna',()=>{
    const calls:unknown[][]=[];
    const ctx={
      clearRect:vi.fn(),
      drawImage:vi.fn((...args:unknown[])=>calls.push(args)),
    } as unknown as CanvasRenderingContext2D;
    const img={width:1254,height:1254} as HTMLImageElement;
    drawMarbleAdaptiveTop(ctx,img,NONE);
    expect(calls).toHaveLength(1); // somente a pedra sem borda
    expect(ctx.clearRect).toHaveBeenCalledWith(0,0,256,256);

    calls.length=0;
    drawMarbleAdaptiveTop(ctx,img,{...NONE,north:true,
      west:[true,false,false,false]});
    expect(calls).toHaveLength(4); // centro, trilho de cima, quarto lateral e canto

    calls.length=0;
    drawMarbleAdaptiveTop(ctx,img,{north:true,south:true,
      west:[true,true,true,true],east:[true,true,true,true]});
    expect(calls).toHaveLength(1); // cópia integral do topo original
    expect(calls[0].slice(1)).toEqual([0,0,1254,1254,0,0,256,256]);
  });

  it('preserva a câmera superior ortográfica em 67°',()=>{
    const {height,depth}=sanctuaryCameraOffset();
    expect(SANCTUARY_CAMERA_ELEVATION_DEG).toBe(67);
    expect(height).toBe(37);
    expect(depth).toBeGreaterThan(15);
    expect(depth).toBeLessThan(17);
    expect(Math.atan2(height,depth)*180/Math.PI).toBeCloseTo(67,5);
  });
});
