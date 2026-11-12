import { CHUNK_SIZE } from '../config';
import { Block, blockDef, type BlockId } from './blocks';
import { hash2 } from './random';
import type { Biome } from './biomes';
import type { Cell, TerrainSource } from './terrain';
import type { World } from './world';
import type { Rect } from './dungeon';

/** Goblin camps around the already-existing CAMPFIRE item; seven per camp. */
export const GOBLIN_PACK_SIZE=7;
export const GOBLIN_CAMP_COUNT=4;
export const GOBLIN_CAMP_ROAM=11;
export const GOBLIN_CAMP_SLOTS:ReadonlyArray<readonly [number,number]>=[
  [0,-3],[2,-2],[3,0],[2,2],[0,3],[-2,2],[-3,0],
];

export interface GoblinCamp {
  /** Tile containing the real campfire object (Block.CAMPFIRE). */
  x:number;
  y:number;
  /** Seven different walkable cells around that one fire. */
  slots:ReadonlyArray<readonly [number,number]>;
}
export function goblinRoam(x:number,y:number):Rect {
  return {x0:x-GOBLIN_CAMP_ROAM,y0:y-GOBLIN_CAMP_ROAM,
    x1:x+GOBLIN_CAMP_ROAM,y1:y+GOBLIN_CAMP_ROAM};
}

/** An unbuilt natural camp may clear trees/bushes in its 7-tile circle, but
 * never cover water, cliffs, cave entrances, player constructions or guards.
 */
function open(world:World,x:number,y:number):boolean {
  if(world.isProtected(x,y))return false;
  const cell=world.generator.cellAt(x,y);
  const ground=cell.ground;
  // World.isGroundStandable accepts materials (GRASS, DIRT, SAND) as
  // ground even though their shared block definitions say standable=false
  // when used as a raised cube. Mirror that exact domain rule.
  const def=blockDef(ground);
  const standable=def.layer==='object'?def.shape==='cube':def.standable;
  if(ground===Block.VOID||ground===Block.HOLE||ground===Block.WATER||
    def.liquid||!standable)return false;
  return cell.upper===Block.AIR;
}

/**
 * Generate deterministic packs once from the WORLD SEED, before chunk loading.
 * Keep them outside the city, gates, livestock field, caves and dungeon.
 * No dynamic placement during rendering or entity respawning.
 */
export function planGoblinCamps(world:World):GoblinCamp[] {
  if(world.profile.id!=='principal'||!world.town)return [];
  const town=world.town;
  const mx=(town.area.x0+town.area.x1)/2;
  const my=(town.area.y0+town.area.y1)/2;
  const rx=(town.area.x1-town.area.x0+1)/2;
  const ry=(town.area.y1-town.area.y0+1)/2;
  const camps:GoblinCamp[]=[];
  for(let i=0;i<1800&&camps.length<GOBLIN_CAMP_COUNT;i++){
    const angle=hash2(world.seed,113+i,274)*Math.PI*2;
    // Include open fields beyond the near-city ring when the biome is
    // mountains/ocean. Still favor nearby camps for discoverability.
    const extra=36+hash2(world.seed,938+i,181)*Math.min(220,56+Math.floor(i/15)*8);
    // Elliptical ring around the city, beyond the livestock field.
    const x=Math.round(mx+Math.cos(angle)*(rx+extra));
    const y=Math.round(my+Math.sin(angle)*(ry+extra));
    if(camps.some(c=>Math.hypot(c.x-x,c.y-y)<32))continue;
    if(!open(world,x,y))continue;
    const slots=GOBLIN_CAMP_SLOTS.map(([dx,dy])=>[x+dx,y+dy] as const);
    if(!slots.every(([sx,sy])=>open(world,sx,sy)))continue;
    camps.push({x,y,slots});
  }
  return camps;
}

/** Overlay exactly one pre-existing fire tile at each camp in the procedural
 * generator. The campfire remains breakable/placeable and saves/room snapshots
 * can override that tile just like any other generated object.
 */
export class GoblinCampTerrain implements TerrainSource {
  readonly seed:number;
  private readonly fires:Set<string>;
  private readonly cleared:Set<string>;
  private readonly inChunk=new Map<string,GoblinCamp[]>();
  constructor(private readonly source:TerrainSource,readonly camps:readonly GoblinCamp[]){
    this.seed=source.seed;
    this.fires=new Set(camps.map(c=>`${c.x},${c.y}`));
    this.cleared=new Set(camps.flatMap(c=>c.slots.map(([x,y])=>`${x},${y}`)));
    for(const c of camps){
      const cx=Math.floor(c.x/CHUNK_SIZE),cy=Math.floor(c.y/CHUNK_SIZE);
      const k=`${cx},${cy}`;
      const list=this.inChunk.get(k)??[];
      list.push(c);this.inChunk.set(k,list);
    }
  }
  cellAt(x:number,y:number):Cell {
    const c=this.source.cellAt(x,y);
    return this.fires.has(`${x},${y}`)?{...c,object:Block.CAMPFIRE}:
      this.cleared.has(`${x},${y}`)?{...c,object:Block.AIR}:c;
  }
  groundAt(x:number,y:number):BlockId{return this.source.groundAt(x,y);}
  objectAt(x:number,y:number):BlockId{
    return this.fires.has(`${x},${y}`)?Block.CAMPFIRE:
      this.cleared.has(`${x},${y}`)?Block.AIR:this.source.objectAt(x,y);
  }
  upperAt(x:number,y:number):BlockId{return this.source.upperAt(x,y);}
  biomeAt(x:number,y:number):Biome{return this.source.biomeAt(x,y);}
  generateChunk(cx:number,cy:number,ground:Uint8Array,objects:Uint8Array,upper:Uint8Array):void{
    this.source.generateChunk(cx,cy,ground,objects,upper);
    for(const c of this.inChunk.get(`${cx},${cy}`)??[]){
      const lx=c.x-cx*CHUNK_SIZE,ly=c.y-cy*CHUNK_SIZE;
      objects[ly*CHUNK_SIZE+lx]=Block.CAMPFIRE;
      for(const [x,y] of c.slots){
        if(Math.floor(x/CHUNK_SIZE)===cx&&Math.floor(y/CHUNK_SIZE)===cy)
          objects[(y-cy*CHUNK_SIZE)*CHUNK_SIZE+(x-cx*CHUNK_SIZE)]=Block.AIR;
      }
    }
    // Slots belonging to a center just across this chunk boundary.
    for(const xy of this.cleared){
      const [x,y]=xy.split(',').map(Number);
      if(Math.floor(x/CHUNK_SIZE)===cx&&Math.floor(y/CHUNK_SIZE)===cy)
        objects[(y-cy*CHUNK_SIZE)*CHUNK_SIZE+(x-cx*CHUNK_SIZE)]=Block.AIR;
    }
  }
}
