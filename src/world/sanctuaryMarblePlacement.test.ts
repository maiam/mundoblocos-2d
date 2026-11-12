import { describe, expect, it } from 'vitest';
import { Block } from './blocks';
import { World } from './world';
import { WORLD_PROFILES } from './profiles';
import { toChunk } from './coords';
import { classifyMarbleProfile } from '../render/sanctuaryMarbleAdaptive';

const create=()=>new World(77,WORLD_PROFILES.santuario);
const marble=Block.MARBLE_CELESTIAL;

describe('Santuário — colocação de Mármore Celestial como peça de dois níveis',()=>{
  it('um único clique cria uma parede de dois níveis e não permite empilhar outra',()=>{
    const w=create();
    const [x,y]=w.findSpawn();
    expect(w.placementLevel(x+2,y,marble)).toBe(0);
    expect(w.placeBlock(x+2,y,marble)).toBe(true);
    expect(w.getLevel(x+2,y,0)).toBe(marble);
    expect(w.getLevel(x+2,y,1)).toBe(marble);
    expect(w.stackHeight(x+2,y)).toBe(2);
    expect(w.standHeight(x+2,y)).toBe(2);
    expect(classifyMarbleProfile(w,x+2,y)).toBe('wall_front');
    expect(w.canPlace(x+2,y,marble)).toBe(false);
    expect(w.canPlace(x+2,y,Block.STONE_GOLDEN)).toBe(false);
  });

  it('quebra um único painel de dois níveis inteiro, sem deixar a base suspensa',()=>{
    const w=create();
    const [x,y]=w.findSpawn();
    expect(w.placeBlock(x+2,y,marble)).toBe(true);
    expect(w.breakBlock(x+2,y)).toBe(marble);
    expect(w.getObject(x+2,y)).toBe(Block.AIR);
    expect(w.getUpper(x+2,y)).toBe(Block.AIR);
    expect(w.stackHeight(x+2,y)).toBe(0);
    expect(w.placeBlock(x+2,y,marble)).toBe(true);
  });

  it('duas células norte-sul tornam ambas pilares sem comandos adicionais',()=>{
    const w=create();
    const [x,y]=w.findSpawn();
    expect(w.placeBlock(x+2,y,marble)).toBe(true);
    expect(classifyMarbleProfile(w,x+2,y)).toBe('wall_front');
    expect(w.placeBlock(x+2,y+1,marble)).toBe(true);
    expect(classifyMarbleProfile(w,x+2,y)).toBe('pillar');
    expect(classifyMarbleProfile(w,x+2,y+1)).toBe('pillar');
    // Deletion must recompute affected neighbors in both height levels.
    expect(w.breakBlock(x+2,y+1)).toBe(marble);
    expect(classifyMarbleProfile(w,x+2,y)).toBe('wall_front');
  });

  it('progride de parede padrão para fundo, centro e frente ao conectar 3 pilares',()=>{
    const w=create();
    const [sx,sy]=w.findSpawn();
    const x=sx+2,y=sy+1;
    w.placeBlock(x,y-1,marble);
    w.placeBlock(x,y,marble);
    w.placeBlock(x,y+1,marble);
    for(const [row,expected] of [[y-1,'wall_back'],[y,'wall_middle'],[y+1,'wall_front']] as const){
      expect(w.placeBlock(x+1,row,marble)).toBe(true);
      expect(classifyMarbleProfile(w,x+1,row)).toBe(expected);
      expect(w.getLevel(x+1,row,1)).toBe(marble);
      expect(w.breakBlock(x+1,row)).toBe(marble);
    }
    expect(classifyMarbleProfile(w,x,y)).toBe('pillar');
  });

  it('marca chunk e mantém nível 1 persistível para salvamentos',()=>{
    const w=create();
    const [x,y]=w.findSpawn();
    expect(w.placeBlock(x+2,y,marble)).toBe(true);
    const chunk=w.getChunk(toChunk(x+2),toChunk(y));
    expect(chunk?.modified).toBe(true);
    expect(chunk?.version).toBeGreaterThan(1);
    const xy={x:x+2,y};
    expect(w.getLevel(xy.x,xy.y,0)).toBe(marble);
    expect(w.getLevel(xy.x,xy.y,1)).toBe(marble);
  });

  it('não permite duplicar quando há nível superior já ocupado ou outra base',()=>{
    const w=create();
    const [x,y]=w.findSpawn();
    expect(w.placeBlock(x+2,y,Block.STONE_CELESTIAL)).toBe(true);
    expect(w.placeBlock(x+2,y,marble)).toBe(false);
    expect(w.placeBlock(x+3,y,Block.MARBLE_ORNATE)).toBe(true);
    expect(w.placeBlock(x+3,y,marble)).toBe(false);
    expect(w.getUpper(x+2,y)).toBe(Block.AIR);
  });

  it('outros materiais e Mundo principal continuam com a colocação original',()=>{
    const w=create();
    const [x,y]=w.findSpawn();
    expect(w.placeBlock(x+2,y,Block.STONE_CELESTIAL)).toBe(true);
    expect(w.stackHeight(x+2,y)).toBe(1);
    expect(w.placeBlock(x+2,y,Block.STONE_CELESTIAL)).toBe(true);
    expect(w.stackHeight(x+2,y)).toBe(2);

    const main=new World(7);
    const [mx,my]=main.outsideGate();
    expect(main.placeBlock(mx,my,Block.STONE_BRICK)).toBe(true);
    expect(main.stackHeight(mx,my)).toBe(1);
    expect(main.placeBlock(mx,my,Block.STONE_BRICK)).toBe(true);
    expect(main.stackHeight(mx,my)).toBe(2);
  });

  it('salvamento antigo com 1 nível de mármore quebra sem modificar outros materiais',()=>{
    const w=create();
    const [x,y]=w.findSpawn();
    w.setObject(x+2,y,marble); // simula save antigo anterior à colocação dupla
    expect(w.getUpper(x+2,y)).toBe(Block.AIR);
    expect(w.breakBlock(x+2,y)).toBe(marble);
    expect(w.getObject(x+2,y)).toBe(Block.AIR);
  });
});
