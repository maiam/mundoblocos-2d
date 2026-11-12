import { Block, type BlockId } from '../world/blocks';

/**
 * Experimental Core Keeper-style connection, restricted to celestial marble
 * (82) in the OFFICIAL Santuário Three.js renderer.
 *
 * PILLAR: full voxel. WALL_BACK: rear half (negative Z, y in map).
 * WALL_FRONT: front half (positive Z). Other materials retain their rules.
 */
export type MarbleProfile = 'pillar' | 'wall_back' | 'wall_front';
export type MarbleShape = MarbleProfile | 'solid' | 'thin';
type MarbleReader = {getLevel(x:number,y:number,level:number):BlockId};
export const MARBLE_TEST_ID: BlockId = Block.MARBLE_CELESTIAL;

const same = (world:MarbleReader,x:number,y:number) =>
  world.getLevel(x,y,0) === MARBLE_TEST_ID;

/** Base-floor contour decides both official build levels (0 and 1). */
export function classifyMarbleProfile(world:MarbleReader,x:number,y:number):MarbleProfile {
  if(!same(world,x,y))return 'pillar';
  if(!same(world,x-1,y)||!same(world,x+1,y))return 'pillar';
  if(world.getLevel(x,y-1,0)!==Block.AIR || world.getLevel(x,y+1,0)!==Block.AIR)
    return 'pillar';

  // Follow the horizontal strip to its end columns. In a hollow room,
  // the REAR wall's end columns continue SOUTH into the side walls; the
  // FRONT wall's end columns continue NORTH. For a single free-standing
  // line, retain the established front-aligned behavior.
  let west=x,east=x;
  for(let n=0;n<80 && same(world,west-1,y);n++)west--;
  for(let n=0;n<80 && same(world,east+1,y);n++)east++;
  const south=Number(same(world,west,y+1))+Number(same(world,east,y+1));
  const north=Number(same(world,west,y-1))+Number(same(world,east,y-1));
  if(south>north)return 'wall_back';
  return 'wall_front';
}

export function marbleFootprint(y:number,shape:MarbleShape):{rear:number;front:number}{
  return shape==='wall_back' ? {rear:y,front:y+0.5}
    : shape==='wall_front'||shape==='thin' ? {rear:y+0.5,front:y+1}
    : {rear:y,front:y+1};
}

export type MarbleEdgeExposure = {
  north:boolean; south:boolean;
  westBack:boolean; westFront:boolean;
  eastBack:boolean; eastFront:boolean;
};

/**
 * Six exposed half-edges decide the top ornament. A full pillar next to a
 * half-depth wall keeps the gold frame ONLY on the unconnected half of its
 * side; the segment touching the wall has no doubled gold border.
 */
export function marbleTopExposure(
  world:MarbleReader,x:number,y:number,level:number,shape:MarbleShape,
  shapeAt:(x:number,y:number,level:number)=>MarbleShape,
):MarbleEdgeExposure {
  const own=marbleFootprint(y,shape);
  const neighbor=(nx:number,ny:number) =>
    world.getLevel(nx,ny,level)===MARBLE_TEST_ID
      ? marbleFootprint(ny,shapeAt(nx,ny,level)):null;
  const west=neighbor(x-1,y),east=neighbor(x+1,y),
    north=neighbor(x,y-1),south=neighbor(x,y+1);
  const mid=(own.rear+own.front)/2;
  const overlaps=(span:{rear:number;front:number}|null,a:number,b:number) =>
    !!span && Math.min(span.front,b)-Math.max(span.rear,a)>0.0001;
  const touchesNorth=!!north && Math.abs(own.rear-north.front)<0.0001;
  const touchesSouth=!!south && Math.abs(own.front-south.rear)<0.0001;
  return {
    north:!touchesNorth,south:!touchesSouth,
    westBack:!overlaps(west,own.rear,mid),
    westFront:!overlaps(west,mid,own.front),
    eastBack:!overlaps(east,own.rear,mid),
    eastFront:!overlaps(east,mid,own.front),
  };
}

export function marbleExposureKey(m:MarbleEdgeExposure):string {
  return [m.north,m.south,m.westBack,m.westFront,m.eastBack,m.eastFront]
    .map(x=>x?'1':'0').join('');
}

/** Build a top texture from the user's decorated marble TOP, hiding frames
 * on every shared edge. No new generated source assets or extra art packs.
 *
 * Uses the center marble grain as the unframed foundation; copies ornamental
 * strips/corners from the exact original 1254px artwork on exposed edges.
 * Pure canvas composition: every one of the 64 variants is cached by key.
 */
export function drawMarbleAdaptiveTop(
  ctx:CanvasRenderingContext2D,
  source:CanvasImageSource & {width:number;height:number},
  e:MarbleEdgeExposure,
  size=256,
):void {
  const s=source.width;
  // The framed picture is square; draw an unframed marble background first.
  ctx.clearRect(0,0,size,size);
  ctx.drawImage(source,s*0.24,s*0.24,s*0.52,s*0.52,0,0,size,size);

  const band=0.19;
  const draw=(sx:number,sy:number,sw:number,sh:number,
    dx:number,dy:number,dw:number,dh:number)=>{
    ctx.drawImage(source,sx*s,sy*s,sw*s,sh*s,dx*size,dy*size,dw*size,dh*size);
  };
  const mid=1-2*band;
  if(e.north)draw(band,0,mid,band,band,0,mid,band);
  if(e.south)draw(band,1-band,mid,band,band,1-band,mid,band);

  const side=(west:boolean,back:boolean,front:boolean)=>{
    const xx=west?0:1-band;
    if(back) draw(xx,band,band,mid/2,xx,band,band,mid/2);
    if(front) draw(xx,band+mid/2,band,mid/2,xx,band+mid/2,band,mid/2);
    if(back&&e.north)draw(xx,0,band,band,xx,0,band,band);
    if(front&&e.south)draw(xx,1-band,band,band,xx,1-band,band,band);
  };
  side(true,e.westBack,e.westFront);
  side(false,e.eastBack,e.eastFront);
}
