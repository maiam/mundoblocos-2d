import { Block, blockDef, type BlockId } from '../world/blocks';
import { MAX_STACK } from '../config';
import { ADAPTIVE_WALL_BLOCKS, horizontalWallShape } from './adaptiveWalls';
import { classifyMarbleProfile, MARBLE_TEST_ID, type MarbleShape } from './sanctuaryMarbleAdaptive';

export type SanctuaryBlockShape = MarbleShape;
export interface SanctuaryBlockCell {x:number;y:number;level:number;id:BlockId;shape:SanctuaryBlockShape}
export interface SanctuaryGroundCell {x:number;y:number;id:BlockId}

/** Geometry classification stays tied to the authoritative World and 2-level rules. */
export function classifySanctuaryBlock(
  world: {getLevel(x:number,y:number,level:number):BlockId},
  id: BlockId, x:number, y:number, level:number,
): SanctuaryBlockShape {
  if (level < 0 || level >= MAX_STACK) return 'solid';
  if(!ADAPTIVE_WALL_BLOCKS.has(id))return 'solid';
  // Only the celestial-marble pilot uses the new front/back classification.
  // The upper construction level inherits the base footprint, not its own
  // neighbors, even when its texture belongs to a different stone material.
  if((level===0 ? id : world.getLevel(x,y,0))===MARBLE_TEST_ID)
    return classifyMarbleProfile(world,x,y)==='pillar'
      ? 'solid' : classifyMarbleProfile(world,x,y);
  return horizontalWallShape(world,id,x,y,level);
}

/** Thin wall has its FRONT face flush at y+1; rear half is removed. */
export function sanctuaryBlockTransform(cell: Pick<SanctuaryBlockCell,'x'|'y'|'level'|'shape'>): {
  x:number;y:number;z:number;width:number;height:number;depth:number;
} {
  const front=cell.shape==='thin'||cell.shape==='wall_front';
  const back=cell.shape==='wall_back';
  return {
    x:cell.x+0.5,y:cell.level+0.5,
    z:cell.y+(front?0.75:back?0.25:0.5),
    width:1,height:1,depth:front||back?0.5:1,
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
    for(let level=0;level<MAX_STACK;level++){
      const id=world.getLevel(x,y,level);
      if(id===Block.AIR)continue;
      // The fixed sanctuary profile only places cubes; do not morph objects.
      blocks.push({x,y,level,id,shape:blockDef(id).shape==='cube'
        ? classifySanctuaryBlock(world,id,x,y,level):'solid'});
    }
  }
  return {grounds,blocks};
}
