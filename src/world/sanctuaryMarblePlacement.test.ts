import { describe, expect, it } from 'vitest';
import { Block } from './blocks';
import { World } from './world';
import { WORLD_PROFILES } from './profiles';
import { toChunk } from './coords';
import { classifyMarbleProfile } from '../render/sanctuaryMarbleAdaptive';
import { classifySanctuaryBlock, sanctuary3DGeometryCells } from '../render/sanctuaryThreeLayout';

const create=()=>new World(77,WORLD_PROFILES.santuario);
const marble=Block.MARBLE_CELESTIAL;
const anchor=(w:World):[number,number]=>{
  const [sx,sy]=w.findSpawn();
  return [sx+3,sy+4];
};

describe('Santuário V3 — base do mármore ocupa duas células em planta e dois níveis em altura',()=>{
  it('um clique preenche a base e a célula norte sem duplicar os blocos físicos',()=>{
    const w=create(),[x,y]=anchor(w);
    expect(w.placementLevel(x,y,marble)).toBe(0);
    expect(w.placeBlock(x,y,marble)).toBe(true);
    for(const row of [y,y-1]){
      expect(w.getLevel(x,row,0)).toBe(marble);
      expect(w.getLevel(x,row,1)).toBe(marble);
      expect(w.stackHeight(x,row)).toBe(2);
      expect(w.standHeight(x,row)).toBe(2);
    }
    expect(w.marbleV3PlacementBases()).toEqual([[x,y]]);
    expect(w.marbleV3AnchorAt(x,y-1)).toEqual([x,y]);
    expect(w.footprint(marble,x,y)).toEqual([[x,y],[x,y-1]]);
    expect(w.footprintAnchors(marble,x,y-1)).toEqual([[x,y-1],[x,y]]);
    expect(classifyMarbleProfile(w,x,y)).toBe('v3_face');
    expect(classifyMarbleProfile(w,x,y-1)).toBe('v3_top_half');
    expect(classifySanctuaryBlock(w,marble,x,y-1,1)).toBe('v3_top_half');
    expect(w.canPlace(x,y,marble)).toBe(false);
    expect(w.canPlace(x,y-1,marble)).toBe(false);
    expect(w.canPlace(x,y-1,Block.STONE_CELESTIAL)).toBe(false);
    const scene=sanctuary3DGeometryCells(w,{x0:x,x1:x,y0:y-1,y1:y});
    expect(scene.blocks).toHaveLength(2); // uma malha por célula lógica, sem duplicar por nível
    expect(scene.blocks.every(b=>b.level===1)).toBe(true);
    expect(scene.blocks.map(b=>b.shape)).toEqual(['v3_top_half','v3_face']);
  });

  it('duas bases verticais em (1,1) e (3,1) viram F + T + T + meio-topo',()=>{
    const w=create(),[x,y]=anchor(w);
    expect(w.placeBlock(x,y,marble)).toBe(true);
    expect(w.placeBlock(x,y-1,marble)).toBe(false); // célula já ocupada
    expect(w.placeBlock(x,y-2,marble)).toBe(true);
    expect([y,y-1,y-2,y-3].map(row=>classifyMarbleProfile(w,x,row)))
      .toEqual(['v3_face','v3_top','v3_top','v3_top_half']);
    for(const row of [y,y-1,y-2,y-3]) expect(w.getObject(x,row)).toBe(marble);
    expect(w.marbleV3PlacementBases()).toEqual([[x,y],[x,y-2]]);
    expect(w.canPlace(x,y-3,marble)).toBe(false);
    expect(w.canPlace(x,y-4,marble)).toBe(true);
    expect(w.getObject(x,y-4)).toBe(Block.AIR);
  });

  it('parede horizontal gera uma fila de faces e a segunda fila com meio-topos unidos',()=>{
    const w=create(),[x,y]=anchor(w);
    for(let dx=0;dx<5;dx++)expect(w.placeBlock(x+dx,y,marble)).toBe(true);
    for(let dx=0;dx<5;dx++){
      expect(classifyMarbleProfile(w,x+dx,y)).toBe('v3_face');
      expect(classifyMarbleProfile(w,x+dx,y-1)).toBe('v3_top_half');
    }
    const scene=sanctuary3DGeometryCells(w,{x0:x,x1:x+4,y0:y-1,y1:y});
    expect(scene.blocks).toHaveLength(10);
    expect(scene.blocks.filter(b=>b.shape==='v3_top')).toHaveLength(0);
    expect(scene.blocks.filter(b=>b.shape==='v3_face')).toHaveLength(5);
    expect(scene.blocks.filter(b=>b.shape==='v3_top_half')).toHaveLength(5);
    expect(new Set(scene.blocks.map(b=>b.x+':'+b.y)).size).toBe(10);
  });

  it('quadrado 9×9 em planta fecha os quatro lados sem ocupar o interior',()=>{
    const w=create(),[x,y]=anchor(w);
    // Frente sul e fundos norte; colunas de duas células ligam as duas fileiras.
    for(let dx=0;dx<=8;dx++){
      expect(w.placeBlock(x+dx,y,marble)).toBe(true);
      expect(w.placeBlock(x+dx,y-8,marble)).toBe(true);
    }
    for(const dy of [2,4,6])for(const xx of [x,x+8])
      expect(w.placeBlock(xx,y-dy,marble)).toBe(true);
    expect(w.marbleV3PlacementBases()).toHaveLength(24); // 9+9 paredes + 3+3 laterais
    expect(w.getObject(x+4,y-4)).toBe(Block.AIR);
    expect(w.isWalkable(x+4,y-4)).toBe(true);
    expect(w.getObject(x,y-9)).toBe(marble);
    expect(w.getObject(x+8,y-9)).toBe(marble);
    expect(classifyMarbleProfile(w,x,y-9)).toBe('v3_top_half');
    expect(classifyMarbleProfile(w,x+8,y-9)).toBe('v3_top_half');
    // Os quatro cantos continuam conectados às paredes horizontais.
    for(const xx of [x,x+8]){
      expect(classifyMarbleProfile(w,xx,y)).toBe('v3_face');
      expect(classifyMarbleProfile(w,xx,y-8)).toBe('v3_top');
    }
    const scene=sanctuary3DGeometryCells(w,{x0:x,x1:x+8,y0:y-9,y1:y});
    expect(scene.blocks).toHaveLength(42); // células únicas, sem duplicar níveis
    expect(scene.blocks.filter(b=>b.shape==='v3_face')).toHaveLength(9);
    expect(scene.blocks.filter(b=>b.shape==='v3_top_half')).toHaveLength(9);
  });

  it('quebra em qualquer metade libera ambas e preserva paredes vizinhas',()=>{
    const w=create(),[x,y]=anchor(w);
    expect(w.placeBlock(x,y,marble)).toBe(true);
    expect(w.placeBlock(x+1,y,marble)).toBe(true);
    expect(w.canBreak(x,y-1)).toBe(true);
    expect(w.breakBlock(x,y-1)).toBe(marble);
    expect(w.marbleV3AnchorAt(x,y)).toBeNull();
    expect(w.getLevel(x,y,0)).toBe(Block.AIR);
    expect(w.getLevel(x,y,1)).toBe(Block.AIR);
    expect(w.getLevel(x,y-1,0)).toBe(Block.AIR);
    expect(w.getLevel(x,y-1,1)).toBe(Block.AIR);
    expect(w.getObject(x+1,y-1)).toBe(marble);
    expect(w.placeBlock(x,y,marble)).toBe(true);
    expect(w.breakBlock(x,y)).toBe(marble);
    expect(w.marbleV3PlacementBases()).toEqual([[x+1,y]]);
  });

  it('recusa a base se a célula norte estiver ocupada ou fora do limite',()=>{
    const w=create(),[x,y]=anchor(w);
    expect(w.placeBlock(x,y-1,Block.STONE_CELESTIAL)).toBe(true);
    expect(w.placeBlock(x,y,marble)).toBe(false);
    expect(w.breakBlock(x,y-1)).toBe(Block.STONE_CELESTIAL);
    expect(w.placeBlock(x,y,marble)).toBe(true);
    const [sx]=w.findSpawn();
    expect(w.placeBlock(sx+3,-16,marble)).toBe(false); // topo fora do mundo
  });

  it('só a base gravada modifica o chunk; o topo virtual existe depois de reconstruído',()=>{
    const w=create(),[x,y]=anchor(w);
    expect(w.placeBlock(x,y,marble)).toBe(true);
    const chunk=w.getChunk(toChunk(x),toChunk(y));
    expect(chunk?.modified).toBe(true);
    expect(chunk?.version).toBeGreaterThan(1);
    expect(w.getLevel(x,y-1,1)).toBe(marble);
    expect(w.marbleV3PlacementBases()).toEqual([[x,y]]);
  });

  it('painéis legados não são reinterpretados retroativamente como duas células',()=>{
    const w=create(),[x,y]=anchor(w);
    w.setObject(x,y,marble);
    expect(w.getObject(x,y-1)).toBe(Block.AIR);
    expect(w.marbleV3PlacementBases()).toHaveLength(0);
    expect(classifyMarbleProfile(w,x,y)).toBe('wall_front');
  });

  it('outros materiais e mundo principal mantêm a colocação original',()=>{
    const w=create(),[x,y]=anchor(w);
    expect(w.placeBlock(x,y,Block.STONE_CELESTIAL)).toBe(true);
    expect(w.stackHeight(x,y)).toBe(1);
    expect(w.placeBlock(x,y,Block.STONE_CELESTIAL)).toBe(true);
    expect(w.stackHeight(x,y)).toBe(2);
    const main=new World(7);
    const [mx,my]=main.outsideGate();
    expect(main.placeBlock(mx,my,Block.STONE_BRICK)).toBe(true);
    expect(main.stackHeight(mx,my)).toBe(1);
  });
});
