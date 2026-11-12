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
export type MarbleProfile =
  | 'pillar' | 'wall_back' | 'wall_middle' | 'wall_front'
  | 'wall_corner_back_left' | 'wall_corner_back_right';
export type MarbleShape = MarbleProfile | 'solid' | 'thin';
type MarbleReader = {
  getLevel(x:number,y:number,level:number):BlockId;
  getMarblePlacementOrder?(x:number,y:number):number;
};
export const MARBLE_TEST_ID: BlockId = Block.MARBLE_CELESTIAL;

const same = (world:MarbleReader,x:number,y:number) =>
  world.getLevel(x,y,0) === MARBLE_TEST_ID;

/**
 * V2 — ligação vertical norte/sul (y crescente = abaixo na tela):
 * - Novo painel ACIMA do existente: ambos ficam preenchidos.
 * - Novo painel ABAIXO do existente: só o novo fica preenchido; o antigo
 *   mantém a meia parede, inclusive em uma fileira horizontal.
 * A ordem 0 representa painéis de saves antigos e preserva a regra anterior.
 * A altura física de cada painel continua sendo os dois níveis oficiais.
 */
const columnAt=(world:MarbleReader,x:number,y:number):boolean=>{
  if(!same(world,x,y))return false;
  if(same(world,x,y-1))return true; // painel de baixo sempre se completa
  if(!same(world,x,y+1))return false;
  const current=world.getMarblePlacementOrder?.(x,y)??0;
  const below=world.getMarblePlacementOrder?.(x,y+1)??0;
  return current>=below; // painel acima só se completa se foi colocado depois
};

/** Profile of a side pillar relative to the current horizontal row. */
function pillarAnchor(world:MarbleReader,x:number,y:number):MarbleProfile | null {
  if(!columnAt(world,x,y))return null;
  const north=same(world,x,y-1),south=same(world,x,y+1);
  if(north&&south)return 'wall_middle';
  if(south)return 'wall_back'; // upper end of a vertical column
  return 'wall_front';         // lower end of a vertical column
}

/**
 * A horizontal run joining the TOP of a north-going column to the BOTTOM of
 * a south-going column previously collapsed into wall_middle with two full
 * pillars. That makes a stepped top even though the row is continuous.
 *
 * Keep a single BACK-anchored strip (aligned with the visible top edge),
 * and let only the column which continues SOUTH have a narrow L-shaped
 * connector. The other end already touches its north-going column along
 * the rear edge. We deliberately do NOT override rooms, T-junctions, dense
 * slabs, or a run with internal north/south columns.
 *
 * Both left-to-right orientations are supported, with no stored state: the
 * decision is fully recomputed after any neighboring cell changes.
 */
function oppositeEndCorner(
  world: MarbleReader, west: number, east: number, y: number,
): { cornerX:number; shape:'wall_corner_back_left'|'wall_corner_back_right' } | null {
  if(west>=east)return null;
  const left=pillarAnchor(world,west,y);
  const right=pillarAnchor(world,east,y);
  if(!((left==='wall_front'&&right==='wall_back')||
       (left==='wall_back'&&right==='wall_front')))return null;
  for(let xx=west+1;xx<east;xx++){
    if(columnAt(world,xx,y))return null;
  }
  const cornerX=left==='wall_back'?west:east;
  return {cornerX,
    shape:cornerX===west?'wall_corner_back_left':'wall_corner_back_right'};
}

/**
 * O nível de base decide a forma dos DOIS níveis de altura.
 * Conexões verticais respeitam a ordem de colocação; faixas horizontais
 * mantêm os alinhamentos e o conector em L quando necessário.
 */
export function classifyMarbleProfile(world:MarbleReader,x:number,y:number):MarbleProfile {
  if(!same(world,x,y))return 'pillar';
  let west=x,east=x;
  for(let i=0;i<80&&same(world,west-1,y);i++)west--;
  for(let i=0;i<80&&same(world,east+1,y);i++)east++;

  const opposite=oppositeEndCorner(world,west,east,y);
  if(opposite){
    return x===opposite.cornerX?opposite.shape:'wall_back';
  }
  if(columnAt(world,x,y))return 'pillar';

  const anchors=new Set<MarbleProfile>();
  for(let xx=west;xx<=east;xx++){
    const p=pillarAnchor(world,xx,y);
    if(p)anchors.add(p);
  }
  if(anchors.has('wall_middle')||
    (anchors.has('wall_front')&&anchors.has('wall_back')))return 'wall_middle';
  if(anchors.has('wall_back'))return 'wall_back';
  return 'wall_front';
}

/**
 * The L-shaped endpoint is a rear wall (1 × 0.5) plus a small tongue
 * (0.25 × 0.5) going forward to meet the south-going column.
 * Coordinates are offsets from the cell centre in Three.js X/Z.
 */
export type MarbleCornerPiece={x:number;z:number;width:number;depth:number};
export function marbleCornerParts(shape:MarbleProfile):MarbleCornerPiece[] {
  if(shape!=='wall_corner_back_left'&&shape!=='wall_corner_back_right')return [];
  return [
    {x:0,z:-0.25,width:1,depth:0.5},
    {x:shape==='wall_corner_back_left'?-0.375:0.375,
      z:0.25,width:0.25,depth:0.5},
  ];
}

export function marbleFootprint(y:number,shape:MarbleShape):{rear:number;front:number}{
  return (shape==='wall_back'||shape==='wall_corner_back_left'||
      shape==='wall_corner_back_right') ? {rear:y,front:y+0.5}
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
/**
 * Side exposure is evaluated over the *actual* occupied edge. The L corner
 * extends only the LEFT or RIGHT outer edge to the front of its cell.
 */
function sideSpan(y:number,shape:MarbleShape,side:'west'|'east'):{
  rear:number;front:number
}{
  if((shape==='wall_corner_back_left'&&side==='west')||
    (shape==='wall_corner_back_right'&&side==='east')){
    return {rear:y,front:y+1};
  }
  return marbleFootprint(y,shape);
}

export function marbleTopExposure(
  world:MarbleReader,x:number,y:number,level:number,shape:MarbleShape,
  shapeAt:(x:number,y:number,level:number)=>MarbleShape,
):MarbleEdgeExposure {
  const own=marbleFootprint(y,shape);
  const other=(nx:number,ny:number):MarbleShape|null=>
    world.getLevel(nx,ny,level)===MARBLE_TEST_ID
      ? shapeAt(nx,ny,level):null;
  const west=other(x-1,y),east=other(x+1,y),
    north=other(x,y-1),south=other(x,y+1);
  const quarters=(side:'west'|'east',neighbor:MarbleShape|null):MarbleSideQuarters=>{
    const edge=sideSpan(y,shape,side);
    const opposite=side==='west'?'east':'west';
    const attached=neighbor?sideSpan(y,neighbor,opposite):null;
    const width=(edge.front-edge.rear)/4;
    return [0,1,2,3].map(i=>{
      const a=edge.rear+i*width,b=a+width;
      return !attached||Math.min(attached.front,b)-Math.max(attached.rear,a)<=0.0001;
    }) as MarbleSideQuarters;
  };
  // A corner's tongue touches the SOUTH cell even though its main wall
  // only spans the rear half of the tile.
  const rear=own.rear;
  const front=shape==='wall_corner_back_left'||shape==='wall_corner_back_right'
    ? y+1:own.front;
  const northTouches=!!north&&
    Math.abs(rear-sideSpan(y-1,north,'east').front)<0.0001;
  const southTouches=!!south&&
    Math.abs(front-sideSpan(y+1,south,'east').rear)<0.0001;
  return {
    north:!northTouches,south:!southTouches,
    west:quarters('west',west),east:quarters('east',east),
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

/**
 * Ornament for the L connector. It is the same approved marble artwork,
 * mapped once across the entire 1×1 cell. Gold rails follow the indented
 * outside contour rather than painting a gold square over the empty notch.
 */
export function drawMarbleCornerTop(
  ctx:CanvasRenderingContext2D,
  source:CanvasImageSource & {width:number;height:number},
  e:MarbleEdgeExposure,side:'left'|'right',size=256,
):void {
  drawMarbleAdaptiveTop(ctx,source,e,size);
  const s=source.width;
  const thickness=0.09;
  const tongue=0.25;
  const notchX=side==='left'?tongue:0;
  const notchWidth=1-tongue;
  const draw=(sx:number,sy:number,sw:number,sh:number,
    dx:number,dy:number,dw:number,dh:number)=>{
    ctx.drawImage(source,sx*s,sy*s,sw*s,sh*s,
      dx*size,dy*size,dw*size,dh*size);
  };
  // Inside bend: exposed front edge of the broad rear half.
  draw(0.27,0,0.1,0.15,
    notchX,0.5-thickness/2,notchWidth,thickness);
  // Side of the narrow forward tongue, until it reaches the pillar below.
  draw(side==='left'?0:0.81,0.27,0.19,0.1,
    side==='left'?tongue-thickness/2:1-tongue-thickness/2,
    0.5,thickness,0.5);
}
