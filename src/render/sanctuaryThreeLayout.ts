import { Block, blockDef, type BlockId } from '../world/blocks';
import { MAX_STACK } from '../config';
import { ADAPTIVE_WALL_BLOCKS, horizontalWallShape } from './adaptiveWalls';
import { classifyMarbleProfile, MARBLE_TEST_ID, type MarbleShape } from './sanctuaryMarbleAdaptive';
import { SANCTUARY_CAMERA_ELEVATION_DEG, sanctuaryV3VisualHeight } from './sanctuaryCameraRig';

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
  if((level===0 ? id : world.getLevel(x,y,0))===MARBLE_TEST_ID){
    const profile=classifyMarbleProfile(world,x,y);
    return profile==='pillar' ? 'solid' : profile;
  }
  return horizontalWallShape(world,id,x,y,level);
}

/**
 * A projeção V3 é ancorada pela BASE INFERIOR da face clicada.
 * O plano vertical vai de Y=0 até uma altura visual equivalente a
 * uma linha projetada (tan do ângulo), não aos 2 níveis de colisão.
 * Seu topo e as superfícies horizontais compartilham o MESMO Y e Z
 * para evitar deslocamento, lacuna ou sobreposição.
 */
export function sanctuaryV3ScreenAnchorOffset():number {
  return sanctuaryV3VisualHeight()/Math.tan(SANCTUARY_CAMERA_ELEVATION_DEG*Math.PI/180);
}

/** One full-height pillar or a half-depth wall anchored front, center or rear. */
export function sanctuaryBlockTransform(cell: Pick<SanctuaryBlockCell,'x'|'y'|'level'|'shape'>): {
  x:number;y:number;z:number;width:number;height:number;depth:number;
} {
  const front=cell.shape==='thin'||cell.shape==='wall_front';
  const back=cell.shape==='wall_back';
  const middle=cell.shape==='wall_middle';
  // O chão da base clicada determina a posição INFERIOR da face.
  // H/tan(67°)=1: sua parte inferior ocupa a borda sul da célula,
  // a parte superior encosta no topo da base, e os topos continuam
  // alinhados às células lógicas ao norte.
  if(cell.shape==='v3_face'||cell.shape==='v3_top'||cell.shape==='v3_top_half'){
    const visualZ=cell.y+0.5+sanctuaryV3ScreenAnchorOffset();
    const visualHeight=sanctuaryV3VisualHeight();
    if(cell.shape==='v3_face')
      return {x:cell.x+0.5,y:visualHeight/2,z:visualZ,
        width:1,height:visualHeight,depth:0};
    return {x:cell.x+0.5,y:visualHeight,z:visualZ,width:1,height:0,
      depth:cell.shape==='v3_top'?1:0.5};
  }
  // L-corners fill the full tile's bounding box but remain a thin wall
  // plus a quarter-width connector, never a solid pillar.
  return {
    x:cell.x+0.5,y:cell.level+0.5,
    z:cell.y+(front?0.75:back?0.25:0.5),
    width:1,height:1,depth:front||back||middle?0.5:1,
  };
}

/** The official sanctuary uses exactly the 80x32 bounded profile. */
export function sanctuary3DGeometryCells(
  world: {getGround(x:number,y:number):BlockId;getLevel(x:number,y:number,level:number):BlockId;
    isMarbleV3Cell?(x:number,y:number):boolean},
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
      // V3 tem uma única superfície renderizada por célula lógica: no nível
      // 1 aparece a face vertical OU o topo. Nunca desenhar novamente no 0.
      // Os dois níveis continuam existindo no World para física e salvamento.
      if(id===MARBLE_TEST_ID&&world.isMarbleV3Cell?.(x,y)&&level===0)continue;
      blocks.push({x,y,level,id,shape:blockDef(id).shape==='cube'
        ? classifySanctuaryBlock(world,id,x,y,level):'solid'});
    }
  }
  return {grounds,blocks};
}
