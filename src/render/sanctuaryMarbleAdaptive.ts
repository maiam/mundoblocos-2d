import { Block, type BlockId } from '../world/blocks';

/**
 * Experimental Core Keeper-style connection, restricted to celestial marble
 * (82) in the OFFICIAL Santuário Three.js renderer.
 *
 * New default: a marble cell is a TWO-STOREY wall anchored to the front
 * (screen-bottom) half. Its NORTH/SOUTH marble neighbors turn it into a full
 * pillar. Horizontal strips align their walls to neighboring columns at
 * the rear, front or middle of the cell; other materials are unchanged.
 */
export type MarbleProfile = 'pillar' | 'wall_back' | 'wall_middle' | 'wall_front';
export type MarbleShape = MarbleProfile | 'solid' | 'thin';
type MarbleReader = {getLevel(x:number,y:number,level:number):BlockId};
export const MARBLE_TEST_ID: BlockId = Block.MARBLE_CELESTIAL;

const same = (world:MarbleReader,x:number,y:number) =>
  world.getLevel(x,y,0) === MARBLE_TEST_ID;

/**
 * A column is a line along NORTH/SOUTH on the map, not a vertical height
 * stack. Every occupied marble cell is automatically TWO LEVELS tall.
 */
const columnAt=(world:MarbleReader,x:number,y:number):boolean=>
  same(world,x,y) && (same(world,x,y-1)||same(world,x,y+1));

/** Profile of a side pillar relative to the current horizontal row. */
function pillarAnchor(world:MarbleReader,x:number,y:number):MarbleProfile | null {
  if(!columnAt(world,x,y))return null;
  const north=same(world,x,y-1),south=same(world,x,y+1);
  if(north&&south)return 'wall_middle';
  if(south)return 'wall_back'; // upper end of a vertical column
  return 'wall_front';         // lower end of a vertical column
}

/**
 * Only the ground level decides shape; the upper cube reuses it.
 * Scan the contiguous horizontal strip: all walls in one run keep the same
 * anchor, even when a remote end cell adjoins a vertical pillar.
 */
export function classifyMarbleProfile(world:MarbleReader,x:number,y:number):MarbleProfile {
  if(!same(world,x,y))return 'pillar';
  if(columnAt(world,x,y))return 'pillar';

  // A loose single block or strip starts as a FRONT-anchored wall.
  let west=x,east=x;
  for(let i=0;i<80&&same(world,west-1,y);i++)west--;
  for(let i=0;i<80&&same(world,east+1,y);i++)east++;

  const anchors=new Set<MarbleProfile>();
  for(let xx=west;xx<=east;xx++){
    const p=pillarAnchor(world,xx,y);
    if(p)anchors.add(p);
  }
  if(anchors.has('wall_middle') ||
    (anchors.has('wall_front')&&anchors.has('wall_back')))return 'wall_middle';
  if(anchors.has('wall_back'))return 'wall_back';
  return 'wall_front';
}

export function marbleFootprint(y:number,shape:MarbleShape):{rear:number;front:number}{
  return shape==='wall_back' ? {rear:y,front:y+0.5}
    : shape==='wall_middle' ? {rear:y+0.25,front:y+0.75}
    : shape==='wall_front'||shape==='thin' ? {rear:y+0.5,front:y+1}
    : {rear:y,front:y+1};
}

export type MarbleSideQuarters = [boolean,boolean,boolean,boolean];
export type MarbleEdgeExposure = {
  north:boolean; south:boolean;
  west:MarbleSideQuarters;
  east:MarbleSideQuarters;
};

/**
 * Quarter-length exposure masks allow a centered wall (25–75%) to meet a
 * solid pillar without drawing gold over the hidden middle half of its edge.
 * The same algorithm supports back/front walls (0–50%, 50–100%).
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
  const side=(span:{rear:number;front:number}|null):MarbleSideQuarters=>{
    const width=(own.front-own.rear)/4;
    return [0,1,2,3].map(i=>{
      const a=own.rear+i*width,b=a+width;
      return !span || Math.min(span.front,b)-Math.max(span.rear,a)<=0.0001;
    }) as MarbleSideQuarters;
  };
  const touchesNorth=!!north && Math.abs(own.rear-north.front)<0.0001;
  const touchesSouth=!!south && Math.abs(own.front-south.rear)<0.0001;
  return {
    north:!touchesNorth,south:!touchesSouth,
    west:side(west),east:side(east),
  };
}

export function marbleExposureKey(m:MarbleEdgeExposure):string {
  return [m.north,m.south,...m.west,...m.east]
    .map(x=>x?'1':'0').join('');
}

/** Build a top texture from the user's decorated marble TOP, hiding frames
 * on every shared edge. No new generated source assets or extra art packs.
 *
 * Uses the center marble grain as the unframed foundation; copies ornamental
 * strips/corners from the approved artwork on exposed edges.
 * Variants are cached by a ten-bit segment mask (not regenerated each frame).
 */
export function drawMarbleAdaptiveTop(
  ctx:CanvasRenderingContext2D,
  source:CanvasImageSource & {width:number;height:number},
  e:MarbleEdgeExposure,
  size=256,
):void {
  const s=source.width;
  ctx.clearRect(0,0,size,size);
  // An isolated pillar must preserve the exact full original ornament.
  if(e.north&&e.south&&e.west.every(Boolean)&&e.east.every(Boolean)){
    ctx.drawImage(source,0,0,s,source.height,0,0,size,size);
    return;
  }
  // The framed picture is square; draw an unframed marble background first.
  ctx.drawImage(source,s*0.24,s*0.24,s*0.52,s*0.52,0,0,size,size);

  const band=0.19;
  const draw=(sx:number,sy:number,sw:number,sh:number,
    dx:number,dy:number,dw:number,dh:number)=>{
    ctx.drawImage(source,sx*s,sy*s,sw*s,sh*s,dx*size,dy*size,dw*size,dh*size);
  };
  // Extend continuous rails all the way to the block edge. If a neighboring
  // block is connected, its matching rail meets this one without an ugly
  // ornamental gap. Sample between the gems to avoid repeated corner jewels.
  if(e.north)draw(0.27,0,0.1,band,0,0,1,band);
  if(e.south)draw(0.27,1-band,0.1,band,0,1-band,1,band);

  const side=(west:boolean,exposed:MarbleSideQuarters)=>{
    const xx=west?0:1-band;
    for(let q=0;q<4;q++){
      if(exposed[q]){
        draw(xx,0.27,band,0.1,xx,q*0.25,band,0.25);
      }
    }
    // Only genuinely exterior corners receive the original ornament.
    if(exposed[0]&&e.north)draw(xx,0,band,band,xx,0,band,band);
    if(exposed[3]&&e.south)draw(xx,1-band,band,band,xx,1-band,band,band);
  };
  side(true,e.west);
  side(false,e.east);
}
