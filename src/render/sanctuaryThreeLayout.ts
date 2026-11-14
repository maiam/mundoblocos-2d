import { SLAB_HEIGHT } from '../world/slabs';
import { Block, blockDef, type BlockId } from '../world/blocks';
import { SANCTUARY_MAX_STACK } from '../config';
import { ADAPTIVE_WALL_BLOCKS, horizontalWallShape } from './adaptiveWalls';

/** Forma de cubo no Santuário: maciço, ou placa fina de meia profundidade (parede horizontal de construção). */
export type SanctuaryBlockShape = 'solid' | 'thin' | 'slab';
export interface SanctuaryBlockCell {x:number;y:number;level:number;id:BlockId;shape:SanctuaryBlockShape}
export interface SanctuaryGroundCell {x:number;y:number;id:BlockId}

/** Geometry classification stays tied to the authoritative World and its Santuário 5-level rules. */
export function classifySanctuaryBlock(
  world: {getLevel(x:number,y:number,level:number):BlockId},
  id: BlockId, x:number, y:number, level:number,
): SanctuaryBlockShape {
  if (level < 0 || level >= SANCTUARY_MAX_STACK) return 'solid';
  if(!ADAPTIVE_WALL_BLOCKS.has(id))return 'solid';
  // O nível superior herda a pegada da base, não os próprios vizinhos (ver `horizontalWallShape`).
  if (level >= 2) {
    // Todas as camadas altas repetem a pegada da base; o algoritmo genérico
    // de paredes do Mundo principal continua restrito aos seus dois níveis.
    const baseId = world.getLevel(x,y,0);
    return ADAPTIVE_WALL_BLOCKS.has(baseId)
      ? horizontalWallShape(world,baseId,x,y,0) : 'solid';
  }
  return horizontalWallShape(world,id,x,y,level);
}

/** Um cubo cheio ou uma placa de meia profundidade encostada à frente da célula. */
export function sanctuaryBlockTransform(cell: Pick<SanctuaryBlockCell,'x'|'y'|'level'|'shape'>): {
  x:number;y:number;z:number;width:number;height:number;depth:number;
} {
  const thin=cell.shape==='thin';
  // Laje (piloto): altura de 1/4, centro 1/8 acima do nível.
  if(cell.shape==='slab')return {x:cell.x+0.5,y:cell.level+SLAB_HEIGHT/2,z:cell.y+0.5,width:1,height:SLAB_HEIGHT,depth:1};
  return {
    x:cell.x+0.5,y:cell.level+0.5,
    z:cell.y+(thin?0.75:0.5),
    width:1,height:1,depth:thin?0.5:1,
  };
}

/** The official sanctuary uses exactly the 80x32 bounded profile. */
export function sanctuary3DGeometryCells(
  world: {getGround(x:number,y:number):BlockId;getLevel(x:number,y:number,level:number):BlockId},
  bounds:{x0:number;x1:number;y0:number;y1:number},
): {grounds: SanctuaryGroundCell[];blocks: SanctuaryBlockCell[]} {
  const grounds:SanctuaryGroundCell[]=[];
  const blocks:SanctuaryBlockCell[]=[];
  for(let y=bounds.y0;y<=bounds.y1;y++) for(let x=bounds.x0;x<=bounds.x1;x++){
    const ground=world.getGround(x,y);
    if(ground!==Block.VOID&&ground!==Block.HOLE) grounds.push({x,y,id:ground});
    for(let level=0;level<SANCTUARY_MAX_STACK;level++){
      const id=world.getLevel(x,y,level);
      if(id===Block.AIR)continue;
      // Paredes (ADR 0027) não são cubos: têm render próprio (`sanctuaryWallPrototype.ts`).
      if(blockDef(id).shape==='wall'||blockDef(id).shape==='wall-door')continue;
      blocks.push({x,y,level,id,shape:blockDef(id).shape==='cube'
        ? classifySanctuaryBlock(world,id,x,y,level):'solid'});
    }
  }
  return {grounds,blocks};
}
