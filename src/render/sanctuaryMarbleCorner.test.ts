import { describe, expect, it, vi } from 'vitest';
import { Block, type BlockId } from '../world/blocks';
import { classifySanctuaryBlock, sanctuaryBlockTransform, sanctuary3DGeometryCells } from './sanctuaryThreeLayout';
import {
  classifyMarbleProfile, marbleCornerParts, marbleTopExposure,
  drawMarbleCornerTop, marbleExposureKey,
} from './sanctuaryMarbleAdaptive';
import { World } from '../world/world';
import { WORLD_PROFILES } from '../world/profiles';

const id=Block.MARBLE_CELESTIAL;
type Cell=[number,number,number,BlockId];
function fake(points:Cell[]){
  const m=new Map(points.map(([x,y,z,b])=>[String([x,y,z]),b]));
  return {
    getLevel(x:number,y:number,z:number):BlockId{
      return m.get(String([x,y,z]))??Block.AIR;
    },
    getGround():BlockId{return Block.CLOUD_SOLID;},
  };
}
const horizontal=(a:number,b:number,y:number):Cell[] =>
  Array.from({length:b-a+1},(_,i)=>[a+i,y,0,id]);

describe('Mármore Celestial — canto adaptativo entre colunas opostas',()=>{
  it('coluna que sobe à esquerda + coluna que desce à direita: faixa inteira plana e canto direito em L',()=>{
    const points:Cell[]=[
      ...horizontal(1,5,5),
      [1,4,0,id], // coluna subindo na tela
      [5,6,0,id], // coluna descendo na tela
    ];
    const w=fake(points);
    expect([1,2,3,4,5].map(x=>classifyMarbleProfile(w,x,5))).toEqual([
      'wall_back','wall_back','wall_back','wall_back','wall_corner_back_right',
    ]);
    expect(classifyMarbleProfile(w,1,4)).toBe('pillar');
    expect(classifyMarbleProfile(w,5,6)).toBe('pillar');
    const scene=sanctuary3DGeometryCells(w,{x0:1,x1:5,y0:4,y1:6});
    expect(scene.blocks.filter(b=>b.y===5)).toHaveLength(5);
    expect(scene.blocks.filter(b=>b.shape==='solid')).toHaveLength(2);
    expect(scene.blocks.find(b=>b.x===5&&b.y===5)?.shape)
      .toBe('wall_corner_back_right');
    for(const x of [1,2,3,4]){
      expect(sanctuaryBlockTransform({x,y:5,level:0,shape:'wall_back'}).z)
        .toBe(5.25);
    }
  });

  it('caso espelhado: coluna que desce à esquerda + coluna que sobe à direita: canto esquerdo',()=>{
    const w=fake([...horizontal(1,5,5),[1,6,0,id],[5,4,0,id]]);
    expect([1,2,3,4,5].map(x=>classifyMarbleProfile(w,x,5))).toEqual([
      'wall_corner_back_left','wall_back','wall_back','wall_back','wall_back',
    ]);
    expect(classifyMarbleProfile(w,1,6)).toBe('pillar');
    expect(classifyMarbleProfile(w,5,4)).toBe('pillar');
  });

  it('malha do canto é meia parede traseira + conector frontal estreito, não cubo cheio',()=>{
    const left=marbleCornerParts('wall_corner_back_left');
    const right=marbleCornerParts('wall_corner_back_right');
    expect(left).toEqual([
      {x:0,z:-0.25,width:1,depth:0.5},
      {x:-0.375,z:0.25,width:0.25,depth:0.5},
    ]);
    expect(right[0]).toEqual(left[0]);
    expect(right[1]).toEqual({x:0.375,z:0.25,width:0.25,depth:0.5});
    // Top/side geometry occupies 62.5% of a cell, never 100%.
    const area=left.reduce((sum,p)=>sum+p.width*p.depth,0);
    expect(area).toBe(0.625);
    expect(marbleCornerParts('pillar')).toEqual([]);
    expect(sanctuaryBlockTransform({
      x:5,y:5,level:1,shape:'wall_corner_back_right',
    })).toMatchObject({x:5.5,y:1.5,z:5.5,depth:1});
  });

  it('os dois níveis repetem a mesma peça em L, sem recalcular vizinhos no alto',()=>{
    const base=[...horizontal(1,5,5),[1,4,0,id],[5,6,0,id]] as Cell[];
    const upper=base.map(([x,y])=>[x,y,1,id] as Cell);
    const w=fake([...base,...upper]);
    for(const level of [0,1]){
      expect(classifySanctuaryBlock(w,id,5,5,level)).toBe('wall_corner_back_right');
      expect(classifySanctuaryBlock(w,id,3,5,level)).toBe('wall_back');
    }
  });

  it('borda do canto encosta na parede a oeste e na coluna ao sul sem duplicar ornamento',()=>{
    const w=fake([...horizontal(1,5,5),[1,4,0,id],[5,6,0,id]]);
    const at=(x:number,y:number,z:number)=>
      classifySanctuaryBlock(w,id,x,y,z);
    const cap=marbleTopExposure(w,5,5,0,at(5,5,0),at);
    expect(cap.west).toEqual([false,false,false,false]);
    expect(cap.east).toEqual([true,true,true,true]);
    expect(cap.south).toBe(false); // estreita extensão encontra coluna de baixo
    expect(cap.north).toBe(true);
    const mask=marbleExposureKey(cap);
    expect(mask).toHaveLength(10);
  });

  it('o topo em L acrescenta apenas dois filetes à máscara ornamental existente',()=>{
    const calls:unknown[][]=[];
    const ctx={
      clearRect:vi.fn(),
      drawImage:vi.fn((...args:unknown[])=>calls.push(args)),
    } as unknown as CanvasRenderingContext2D;
    const img={width:1254,height:1254} as HTMLImageElement;
    const mask={north:false,south:false,
      west:[false,false,false,false] as [boolean,boolean,boolean,boolean],
      east:[false,false,false,false] as [boolean,boolean,boolean,boolean]};
    drawMarbleCornerTop(ctx,img,mask,'right',256);
    expect(calls).toHaveLength(3); // marble center + inner gold rail + connector rail
    expect(ctx.clearRect).toHaveBeenCalledWith(0,0,256,256);
  });

  it('adicionar uma coluna transversal interna conserva regra anterior: não força canto',()=>{
    const w=fake([...horizontal(1,5,5),[1,4,0,id],[5,6,0,id],
      [3,4,0,id],[3,6,0,id]]);
    expect(classifyMarbleProfile(w,3,5)).toBe('pillar');
    expect(classifyMarbleProfile(w,2,5)).toBe('wall_middle');
  });

  it('regra calcula de novo após remover colunas e não altera salas retangulares',()=>{
    const top:Cell[]=[...horizontal(1,5,5),[1,4,0,id],[5,6,0,id]];
    const w=fake(top);
    expect(classifyMarbleProfile(w,5,5)).toBe('wall_corner_back_right');
    const noSouth=fake(top.filter(([x,y])=>!(x===5&&y===6)));
    expect(classifyMarbleProfile(noSouth,1,5)).toBe('pillar');
    expect(classifyMarbleProfile(noSouth,3,5)).toBe('wall_front');
    const noNorth=fake(top.filter(([x,y])=>!(x===1&&y===4)));
    expect(classifyMarbleProfile(noNorth,5,5)).toBe('pillar');
    expect(classifyMarbleProfile(noNorth,3,5)).toBe('wall_back');
    const room:Cell[]=[];
    for(let x=0;x<5;x++)for(let y=0;y<5;y++)
      if(x===0||x===4||y===0||y===4)room.push([x,y,0,id]);
    const rm=fake(room);
    expect(classifyMarbleProfile(rm,0,0)).toBe('pillar');
    expect(classifyMarbleProfile(rm,4,4)).toBe('pillar');
    expect(classifyMarbleProfile(rm,2,0)).toBe('wall_back');
    expect(classifyMarbleProfile(rm,2,4)).toBe('wall_front');
  });

  it('World V3: extensões opostas mantêm a face inferior e o meio-topo superior',()=>{
    const w=new World(77,WORLD_PROFILES.santuario);
    const [sx,sy]=w.findSpawn();
    const left=sx+2,right=sx+6,row=sy+2;
    for(let x=left;x<=right;x++)expect(w.placeBlock(x,row,id)).toBe(true);
    expect(w.placeBlock(left,row-2,id)).toBe(true);
    expect(w.placeBlock(right,row+2,id)).toBe(true);
    // Cada base ocupa duas células: não há sobreposição mesmo nos cantos.
    expect(classifySanctuaryBlock(w,id,left,row,0)).toBe('solid');
    expect(classifySanctuaryBlock(w,id,right,row,1)).toBe('solid');
    expect(classifySanctuaryBlock(w,id,left,row-3,0)).toBe('wall_front');
    expect(classifySanctuaryBlock(w,id,right,row-1,0)).toBe('wall_front');
    expect(w.breakBlock(right,row+1)).toBe(id); // célula projetada da nova base
    expect(w.getObject(right,row+2)).toBe(Block.AIR);
    expect(w.getObject(right,row)).toBe(id);
    expect(classifySanctuaryBlock(w,id,right,row-1,0)).toBe('wall_front');
  });
});
