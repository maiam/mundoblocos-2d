import { CHUNK_SIZE, SUBDIV } from '../config';
import { Block, blockDef, type BlockId } from './blocks';
import { hash2 } from './random';
import type { Biome } from './biomes';
import type { Cell, TerrainSource } from './terrain';
import type { World } from './world';
import type { Rect } from './dungeon';

/** Goblin camps around the already-existing CAMPFIRE item; seven per camp. */
export const GOBLIN_PACK_SIZE=7;
export const GOBLIN_CAMP_ROAM=11*SUBDIV;
export const GOBLIN_CAMP_SLOTS:ReadonlyArray<readonly [number,number]>=([
  [0,-3],[2,-2],[3,0],[2,2],[0,3],[-2,2],[-3,0],
] as const).map(([dx,dy])=>[dx*SUBDIV,dy*SUBDIV] as const);

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
 * Densidade dos acampamentos (dono do produto, 14/11/2026: "1 acampamento a cada 4 chunks"; ajustado para 1 a cada **16 chunks**,
 * 4 × 4, porque um chunk da grade 2 tem só 256 px): o mundo é dividido em regiões quadradas de `PACK_REGION` células (1 024 px) e
 * cada uma sorteia **no máximo um** ponto, pela seed. Constante única: mude aqui para ajustar a densidade.
 */
export const PACK_REGION=32*SUBDIV;
/** Raio (em regiões) planejado em volta do centro da cidade: ±640 px × `SUBDIV`… cobre o que o jogador alcança a pé. */
export const PACK_REGION_RADIUS=10;

/** Candidatas por região, nos pontos sorteados pela seed (determinístico, sem `Math.random`). */
function regionPoint(seed:number,rx:number,ry:number,salt:number,tries:number):Array<[number,number]> {
  const out:Array<[number,number]>=[];
  for(let i=0;i<tries;i++){
    const x=rx*PACK_REGION+Math.floor(hash2(seed,rx*131+i+salt,ry*977+salt)*PACK_REGION);
    const y=ry*PACK_REGION+Math.floor(hash2(seed,rx*577+salt,ry*313+i+salt*3)*PACK_REGION);
    out.push([x,y]);
  }
  return out;
}

/**
 * Generate deterministic packs once from the WORLD SEED, before chunk loading.
 * Keep them outside the city, gates, livestock field, caves and dungeon.
 * No dynamic placement during rendering or entity respawning.
 */
export function planGoblinCamps(world:World):GoblinCamp[] {
  if(world.profile.id!=='principal'||!world.town)return [];
  const town=world.town;
  const mx=Math.floor((town.area.x0+town.area.x1)/2);
  const my=Math.floor((town.area.y0+town.area.y1)/2);
  const r0x=Math.floor(mx/PACK_REGION),r0y=Math.floor(my/PACK_REGION);
  const camps:GoblinCamp[]=[];
  for(let ry=r0y-PACK_REGION_RADIUS;ry<=r0y+PACK_REGION_RADIUS;ry++){
    for(let rx=r0x-PACK_REGION_RADIUS;rx<=r0x+PACK_REGION_RADIUS;rx++){
      for(const [x,y] of regionPoint(world.seed,rx,ry,113,8)){
        // Fora da cidade e do anel em volta (a conta antiga: "além do campo do rebanho").
        if(x>=town.area.x0-36*SUBDIV&&x<=town.area.x1+36*SUBDIV&&y>=town.area.y0-36*SUBDIV&&y<=town.area.y1+36*SUBDIV)continue;
        // Vizinhos de regiões diferentes não podem ficar colados (os bandos se confundiriam).
        if(camps.some(c=>Math.hypot(c.x-x,c.y-y)<24*SUBDIV))continue;
        if(!open(world,x,y))continue;
        const slots=GOBLIN_CAMP_SLOTS.map(([dx,dy])=>[x+dx,y+dy] as const);
        if(!slots.every(([sx,sy])=>open(world,sx,sy)))continue;
        camps.push({x,y,slots});
        break;
      }
    }
  }
  return camps;
}

/** Bando de homens-lagarto: três em volta de um ponto da margem de um rio (sem fogueira nem arte no chão). */
export const LIZARD_PACK_SIZE=3;
export const LIZARD_ROAM=9*SUBDIV;
export const LIZARD_SLOTS:ReadonlyArray<readonly [number,number]>=([[0,0],[2,1],[-2,1]] as const).map(([dx,dy])=>[dx*SUBDIV,dy*SUBDIV] as const);
export interface LizardPack {
  /** Centro do bando (célula andável perto da água de rio). */
  x:number;
  y:number;
  /** Três células andáveis e livres. */
  slots:ReadonlyArray<readonly [number,number]>;
}
export function lizardRoam(x:number,y:number):Rect {
  return {x0:x-LIZARD_ROAM,y0:y-LIZARD_ROAM,x1:x+LIZARD_ROAM,y1:y+LIZARD_ROAM};
}

/** Células livres de objeto e andáveis (sem precisar limpar nada no terreno, ao contrário do acampamento). */
function freeLand(world:World,x:number,y:number):boolean {
  return open(world,x,y)&&world.generator.cellAt(x,y).object===Block.AIR;
}

/** Um bando por região onde haja rio: sorteia pontos na região, procura rio perto e escolhe a margem andável. */
export function planLizardPacks(world:World,riverAt:(x:number,y:number)=>boolean,avoid:readonly GoblinCamp[]=[]):LizardPack[] {
  if(world.profile.id!=='principal'||!world.town)return [];
  const town=world.town;
  const mx=Math.floor((town.area.x0+town.area.x1)/2);
  const my=Math.floor((town.area.y0+town.area.y1)/2);
  const r0x=Math.floor(mx/PACK_REGION),r0y=Math.floor(my/PACK_REGION);
  const packs:LizardPack[]=[];
  for(let ry=r0y-PACK_REGION_RADIUS;ry<=r0y+PACK_REGION_RADIUS;ry++){
    for(let rx=r0x-PACK_REGION_RADIUS;rx<=r0x+PACK_REGION_RADIUS;rx++){
      for(const [x,y] of regionPoint(world.seed,rx,ry,271,40)){
        if(x>=town.area.x0-24*SUBDIV&&x<=town.area.x1+24*SUBDIV&&y>=town.area.y0-24*SUBDIV&&y<=town.area.y1+24*SUBDIV)continue;
        if(!riverAt(x,y))continue;
        // Margem: primeira célula andável e livre num anel curto em volta da água.
        let spot:[number,number]|null=null;
        for(let d=1;d<=4*SUBDIV&&!spot;d++){
          for(const [ox,oy] of [[d,0],[-d,0],[0,d],[0,-d],[d,d],[-d,d],[d,-d],[-d,-d]]){
            const sx=x+ox,sy=y+oy;
            if(freeLand(world,sx,sy)&&LIZARD_SLOTS.every(([dx,dy])=>freeLand(world,sx+dx,sy+dy))){spot=[sx,sy];break;}
          }
        }
        if(!spot)continue;
        if(avoid.some(c=>Math.hypot(c.x-spot![0],c.y-spot![1])<12*SUBDIV))continue;
        packs.push({x:spot[0],y:spot[1],slots:LIZARD_SLOTS.map(([dx,dy])=>[spot![0]+dx,spot![1]+dy] as const)});
        break;
      }
    }
  }
  return packs;
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
