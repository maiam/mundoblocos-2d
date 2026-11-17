import { APPEARANCE_BODIES, type AppearanceBody } from '../net/protocol';
import { CUBE_FRONT, SUBDIV, TILE } from '../config';
import { Block } from '../world/blocks';
import { hash2 } from '../world/random';
import { type Hit, MONSTER_STATS, rollDamage, weaponPower } from '../world/progression';
import type { World } from '../world/world';
import type { Player } from './player';
import { BREED_COOLDOWN, Breeder, COURTSHIP_SECONDS } from './breeder';
import { Sheep } from './sheep';
import { BABY_KIND, type BabyKind, FarmAnimal, type FarmKind } from './horse';
import { Villager } from './villager';
import type { MemoryBook } from './npcBrain/memory';
import { EMPTY_LOG, type MissionLog } from './npcBrain/missions';
import type { QuestLog, QuestMark } from './npcBrain/quests';
import { GUILD_MASTER, type Look, makeResidents, type ResidentDef } from './residents';
import { FLORIST_KEEPER, MERCHANT, NPC_IDS, type NpcId, SMITH } from './npcs';
import { interiorFloor } from '../world/interiors';
import { type FlowField, hasPoses, Monster, MONSTERS, type PoseKind } from './monster';
import { wolfPacks, wolfRoam } from '../world/wolves';
import { goblinRoam, GOBLIN_PACK_SIZE, LIZARD_PACK_SIZE, lizardRoam } from '../world/goblins';
import { inRect, type MonsterKind, type Rect } from '../world/dungeon';
import { type Facing, type Walker } from './walker';

import { type AnimalKind, TOOLS, type ToolId } from '../world/items';
import type { CharacterId } from '../world/profiles';

/** Ferramentas com folha de ação (golpe/arar). */
/** Ferramentas com folha de ação (`TOOLS[t].swings`). */
export type SwingTool = 'sword' | 'axe' | 'hoe' | 'shovel' | 'pickaxe';

/**
 * Personagem pronto (folhas desenhadas inteiras): Heroína, Herói, Hood, Gino ou Mila.  Personagem novo: acrescente em `APPEARANCE_BODIES` (rede) e o nome aqui; arte em `render/art` + `SPECS`.
 */
export type HeroBody = AppearanceBody;
export const HERO_BODIES: readonly HeroBody[] = APPEARANCE_BODIES;
/** Personagens prontos com folha de sentar (só eles sentam em cadeiras e bancos; dono do produto, 07/11: todos os quatro). */
export const SIT_BODIES = ['heroine', 'hero', 'hood', 'gino', 'mila', 'grewn'] as const;
export type SitBody = (typeof SIT_BODIES)[number];
export function canSit(body: HeroBody): body is SitBody {
  return (SIT_BODIES as readonly string[]).includes(body);
}
/** Nome de cada personagem pronto na tela de escolha. */
export const HERO_NAMES: Record<HeroBody, string> = { heroine: 'Heroína', hero: 'Herói', hood: 'Hood', gino: 'Gino', mila: 'Mila', grewn: 'Grewn' };

/** Estados de pose com folha própria (o `walk` é a folha do próprio tipo). */
export type PoseState = 'idle' | 'run' | 'alert' | 'attack' | 'hurt';
export type ActorKind = HeroBody | `${HeroBody}-${ToolId}` | `${HeroBody}-${SwingTool}-attack` | `${SitBody}-sit` | 'goddess' | 'goddess-iso' | 'goddess-iso-idle' | 'goddess-iso-sit' | 'sheep' | 'lamb' | 'love-hearts' | FarmKind | BabyKind | `npc-${NpcId}` | MonsterKind | `${PoseKind}-${PoseState}` | 'capybara' | 'capybara-idle';

/** O que o render precisa para desenhar um ator (desacoplado da lógica). */
export interface Actor {
  kind: ActorKind;
  x: number;
  y: number;
  visualZ: number;
  facing: Facing;
  moving: boolean;
  walkTime: number;
  /** Ovelha apaixonada: desenha coração flutuando. */
  inLove?: boolean;
  /** Quadro da animação de namoro (0..3). */
  frame?: number;
  /** Monstro: piscando após levar golpe. */
  hurt?: boolean;
  /** Fração (0..1) da animação de ação em andamento: folhas de ação com mais de 4 quadros escolhem a coluna por aqui (`frame` segue valendo para as de 4). */
  phase?: number;
  /** Monstro ferido: fração de vida restante (barra acima dele). */
  hp?: number;
  /** Monstro derrotado: progresso 0..1 da animação de morte (encolhe e desbota). */
  dying?: number;
  /** Nome escrito acima da cabeça (outros jogadores no multiplayer). */
  label?: string;
  /** Sinal de missão sobre a cabeça (ADR 0034): ! oferece, ? em andamento, ? dourado = pode entregar. */
  mark?: QuestMark;
  /** Troca de cores do desenho (morador sorteado, ADR 0034): aplicada no shader do billboard. */
  look?: Look;
  /** NPC saindo/entrando pela porta dos fundos (nível 1 da IA dos NPCs): 0 = à vista … 1 = sumiu; o desenho desbota. */
  fade?: number;
  /** Tamanho relativo do desenho (ex.: coraçõezinhos do namoro, pelo tamanho do animal). */
  scale?: number;
}

/** Recalcula o mapa de distâncias da dungeon a cada … (s). */
const FLOW_EVERY = 0.25;
/** Monstro só renasce com a personagem a mais de … células do ponto de nascimento. */
const RESPAWN_CLEARANCE = 10 * SUBDIV;
/** Monstro mais longe que isto (células, em x ou y) de todo jogador não é simulado. */
const ACTIVE_RADIUS = 48 * SUBDIV;
/** Bandos (acampamentos de goblin e homens-lagarto): nascem com um jogador a até … células e somem com todos além de …. */
const PACK_SPAWN_RADIUS = 56 * SUBDIV;
const PACK_DROP_RADIUS = 80 * SUBDIV;

const FLOCK_SIZE = 4;
type VillageKind = 'sheep' | 'cow' | 'chicken' | 'capybara' | 'horse';
/** Quantos animais de cada espécie (cavalo, galinha, capivara, ovelha, vaca) nascem na Vila Camponesa. */
export const VILLAGE_ANIMALS_EACH = 3;
/**
 * Faixas de grama da vila (células da vila, 48 × 48; ver `docs/domains/village.md`) onde cada espécie nasce: galinhas no quintal do galinheiro
 * (nordeste), vacas no gramado do oeste, ovelhas no do leste, capivaras na faixa ao norte das casas e cavalos no gramado do sudeste, junto ao muro
 * (v0.93.106: 3 de cada espécie).
 */
const VILLAGE_PENS: ReadonlyArray<{ kind: 'sheep' | 'cow' | 'chicken' | 'capybara' | 'horse'; count: number; salt: number; x0: number; y0: number; x1: number; y1: number }> = [
  { kind: 'chicken', count: VILLAGE_ANIMALS_EACH, salt: 97, x0: 33, y0: 9, x1: 45, y1: 15 },
  { kind: 'cow', count: VILLAGE_ANIMALS_EACH, salt: 91, x0: 3, y0: 30, x1: 12, y1: 35 },
  { kind: 'sheep', count: VILLAGE_ANIMALS_EACH, salt: 71, x0: 33, y0: 29, x1: 44, y1: 34 },
  { kind: 'capybara', count: VILLAGE_ANIMALS_EACH, salt: 103, x0: 8, y0: 6, x1: 16, y1: 9 },
  { kind: 'horse', count: VILLAGE_ANIMALS_EACH, salt: 81, x0: 30, y0: 40, x1: 44, y1: 42 },
];
/** Alcance do golpe de espada (células, do centro dos pés) e abertura do arco (cosseno mínimo). */
export const SWORD_REACH = 1.45 * SUBDIV;
const SWORD_ARC_COS = 0.3;
const FACING_VEC: Record<Facing, [number, number]> = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
/** Caixa de toque (altura, meia-largura em células) de adulto e filhote, pelo tamanho do desenho. */
const PICK_BOX: Record<AnimalKind, [[number, number], [number, number]]> = {
  sheep: [[1.15, 0.45], [0.85, 0.35]],
  horse: [[1.5, 0.55], [1.05, 0.4]],
  cow: [[1.25, 0.5], [0.95, 0.4]],
  chicken: [[0.8, 0.3], [0.65, 0.26]],
  capybara: [[0.95, 0.45], [0.95, 0.45]],
};
/** Quadros dos coraçõezinhos do namoro (folha `love-hearts`, `scripts/extract-love.py`). */
const LOVE_FRAMES = 16;
/** Tamanho dos coraçõezinhos por espécie (acompanha o tamanho do animal). */
const LOVE_SCALE: Record<AnimalKind, number> = { sheep: 1, cow: 1.05, chicken: 0.7, horse: 1.25, capybara: 1 };
/** Distância (células) em que dois animais apaixonados se encontram. */
const PAIR_RANGE = 6 * SUBDIV;
/** Distância (células) para começar a namorar. */
const COURT_DISTANCE = 1.5 * SUBDIV;
/** Distância (células) em que um morador parado percebe a jogadora e se vira para ela (ADR 0034, nível 2). */
export const NOTICE_RANGE = 3 * SUBDIV;
/** Moradores sorteados (ADR 0034): quantos na cidade e na vila. */
export const RESIDENTS_TOWN = 8;
export const RESIDENTS_VILLAGE = 5;
/** Limite de ovelhas para a população não explodir. */
export const MAX_SHEEP = 16;
/** Limite por espécie (filhotes contam): a população não explode. */
export const MAX_PER_SPECIES: Record<AnimalKind, number> = { sheep: MAX_SHEEP, horse: 6, cow: 10, chicken: 12, capybara: 6 };

/**
 * Desenho do personagem pronto: golpe (`<corpo>-<ferramenta>-attack`), andando com a ferramenta na mão
 * (`<corpo>-<ferramenta>`) ou de mãos vazias. O mesmo para a personagem deste aparelho e para os outros da sala.
 */
export function heroActorKind(body: HeroBody, equipped: ToolId | null, attackTool: ToolId | null, attacking: boolean): ActorKind {
  if (attacking && attackTool && TOOLS[attackTool].swings) return `${body}-${attackTool as SwingTool}-attack`;
  return equipped ? `${body}-${equipped}` : body;
}

/** Animal guardado (sala do servidor): espécie, posição, filhote e idade, e a "casa" do passeio. */
export interface AnimalSave {
  k: AnimalKind;
  x: number;
  y: number;
  baby: boolean;
  age: number;
  hx: number;
  hy: number;
}

const ANIMAL_KINDS = new Set<string>(['sheep', 'horse', 'cow', 'chicken', 'capybara']);
const finiteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 2 ** 30;

/** Alvo distante: monstros sem ninguém por perto só passeiam. */
const NOBODY = { x: 1e9, y: 1e9 };

/**
 * Entidades vivas (personagem, animais, moradores, monstros): atualização, colisão entre elas, reprodução, combate e
 * ocupação de células. Estado de execução, não persistido.
 *
 * Roda nos dois lados do multiplayer (ADR 0016, Etapa 3), com as mesmas regras:
 * - no aparelho (jogo sozinho): `player` = a personagem; tudo é simulado aqui;
 * - na sala do servidor (`Room`): sem `player`; os jogadores entram como `avatars` (posição que cada um manda), que os
 *   monstros perseguem e mordem (`onBite`) e de onde saem os golpes (`strikeFrom`);
 * - no aparelho dentro da sala: `remote` = animais e monstros são só o espelho do que a sala manda
 *   (`CreatureMirror`): nada de passeio, namoro, mordida ou renascimento aqui; os moradores seguem locais.
 */
export class Entities {
  readonly npcs: Sheep[] = [];
  /** Cavalos do campo (passeiam; golpe os tira do mundo, como as ovelhas). */
  /** Cavalo, vacas e galinhas (passeiam pelo campo). */
  readonly horses: FarmAnimal[] = [];
  /** Moradores da cidade (só andam por ruas e praças; o golpe não os atinge). */
  readonly villagers: Villager[] = [];
  /** O que os moradores lembram da jogadora (ADR 0034, nível 3): vai no salvamento do jogador; a sala não guarda. */
  memory: MemoryBook = {};
  /** Missões (ADR 0034): estado salvo no jogador; o `Game` o muda ao aceitar/entregar. */
  quests: QuestLog = {};
  /** Sinal sobre a cabeça dos NPCs com missão (o `Game` o recalcula todo quadro a partir do estado e do inventário). */
  marks: Record<string, QuestMark> = {};
  /** Corrente de missões do Capítulo 1 (estado salvo no jogador; o `Game` a muda). */
  missions: MissionLog = EMPTY_LOG();
  /** Hora do mundo (0..1) para a agenda dos moradores (o `Game` a atualiza todo quadro; -1 = sem relógio: sem rotina, como na sala). */
  time = -1;
  /** Monstros da dungeon (presos no interior dela). */
  readonly monsters: Monster[] = [];
  /** Monstros derrotados tocando a animação de morte. */
  readonly dying: Array<{ kind: MonsterKind; x: number; y: number; facing: Facing; t: number }> = [];
  /** Renascimentos agendados (todos os tipos, inclusive a Rainha, cada um no seu tempo). */
  readonly respawns: Array<{ kind: MonsterKind; x: number; y: number; bounds: Rect; timer: number }> = [];
  /** Chamado quando um monstro é derrotado (o Game solta os espólios). */
  onMonsterKilled: ((m: Monster) => void) | null = null;
  /** Dano que entrou (para os números na tela): onde, quanto, se foi crítico e em quem ('enemy' ou 'player'). */
  onDamage: ((x: number, y: number, hit: Hit, target: 'enemy' | 'player') => void) | null = null;
  /** Mapa de distâncias (passos) até a personagem dentro da dungeon; null fora dela. */
  private flow: Int32Array | null = null;
  private flowArea: Rect | null = null;
  private flowTimer = 0;

  /** Jogadores da sala (servidor): alvos dos monstros e origem dos golpes; bloqueiam como a personagem. */
  readonly avatars: Player[] = [];
  /** Mordida num jogador da sala (servidor): quem decide é a sala, o dano é calculado no aparelho dele. */
  onBite: ((target: Player, m: Monster) => void) | null = null;
  /** Aparelho na sala: animais e monstros vêm da sala (sem simulação local deles). */
  remote = false;
  /** Atores extras desenhados com os demais (espelho da sala: coraçõezinhos do namoro). */
  extra: Actor[] = [];

  /** Personagem pronto quando não há `look`: Heroína ou Herói (escolhido na tela de personagem; salvo). */
  body: HeroBody = 'heroine';

  constructor(
    /** A personagem deste aparelho; null na sala do servidor (só `avatars`). */
    private readonly player: Player | null,
    private readonly rand: () => number = Math.random,
    /** Personagem jogável do mundo (perfil). */
    private readonly character: CharacterId = 'heroine',
  ) {}

  /** Rebanho inicial perto de (x, y): posições pela seed, em grama andável a 2–8 células. */
  spawnFlock(world: World, x: number, y: number): void {
    const grass = new Set<number>([Block.GRASS]);
    for (let i = 0; i < 400 && this.npcs.length < FLOCK_SIZE; i++) {
      const a = hash2(world.seed, i, 71) * Math.PI * 2;
      const r = (2 + hash2(world.seed, i, 72) * 6) * SUBDIV;
      const cx = Math.floor(x + Math.cos(a) * r);
      const cy = Math.floor(y + Math.sin(a) * r);
      if (!world.isWalkable(cx, cy) || !grass.has(world.getGround(cx, cy))) continue;
      const sheep = new Sheep(cx + 0.5, cy + 0.5);
      if (this.all().some((w) => sheep.overlapsAt(sheep.x, sheep.y, w))) continue;
      this.npcs.push(sheep);
    }
  }

  /** Um cavalo perto de (x, y): posição pela seed, em grama andável a 3–9 células. */
  spawnHorse(world: World, x: number, y: number): void {
    this.spawnAnimals(world, 'horse', x, y, 1, 81);
  }

  /** `count` animais de um tipo perto de (x, y): posições pela seed (`salt` separa os tipos), em grama andável. */
  spawnAnimals(world: World, kind: FarmKind, x: number, y: number, count: number, salt: number): void {
    let placed = 0;
    for (let i = 0; i < 400 && placed < count; i++) {
      const a = hash2(world.seed, i, salt) * Math.PI * 2;
      const r = (3 + hash2(world.seed, i, salt + 1) * 6) * SUBDIV;
      const cx = Math.floor(x + Math.cos(a) * r);
      const cy = Math.floor(y + Math.sin(a) * r);
      if (!world.isWalkable(cx, cy) || world.getGround(cx, cy) !== Block.GRASS) continue;
      const animal = new FarmAnimal(kind, cx + 0.5, cy + 0.5, this.rand);
      if (this.all().some((w) => animal.overlapsAt(animal.x, animal.y, w))) continue;
      this.horses.push(animal);
      placed++;
    }
  }

  /**
   * Animais domésticos na Vila Camponesa (`world/village.ts`, v0.93.91; v0.93.106: 3 de cada, cavalos incluídos): ovelhas, vacas, galinhas, capivaras e cavalos nascem DENTRO da vila, cada
   * espécie numa faixa de grama da planta dela (`VILLAGE_PENS`, em células da vila); a posição sai da seed, só em grama andável e livre.
   * Devolve quantos de cada espécie nasceram.
   */
  spawnVillageAnimals(world: World, have: Partial<Record<VillageKind, number>> = {}): Record<VillageKind, number> {
    const v = world.village;
    const placed: Record<VillageKind, number> = { sheep: have.sheep ?? 0, cow: have.cow ?? 0, chicken: have.chicken ?? 0, capybara: have.capybara ?? 0, horse: have.horse ?? 0 };
    if (!v) return placed;
    for (const pen of VILLAGE_PENS) {
      for (let i = 0; i < 400 && placed[pen.kind] < pen.count; i++) {
        const lx = pen.x0 + Math.floor(hash2(world.seed, i, pen.salt) * (pen.x1 - pen.x0 + 1));
        const ly = pen.y0 + Math.floor(hash2(world.seed, i, pen.salt + 1) * (pen.y1 - pen.y0 + 1));
        const cx = v.area.x0 + lx, cy = v.area.y0 + ly;
        if (!world.isWalkable(cx, cy) || world.getGround(cx, cy) !== Block.GRASS || world.getObject(cx, cy) !== Block.AIR) continue;
        const animal = pen.kind === 'sheep' ? new Sheep(cx + 0.5, cy + 0.5) : new FarmAnimal(pen.kind, cx + 0.5, cy + 0.5, this.rand);
        if (this.all().some((w) => animal.overlapsAt(animal.x, animal.y, w))) continue;
        if (animal instanceof Sheep) this.npcs.push(animal); else this.horses.push(animal);
        placed[pen.kind]++;
      }
    }
    return placed;
  }

  /**
   * Ajusta os animais da vila de uma sala GRAVADA ANTES da v0.93.106 (snapshot < 7) para 3 de cada espécie: o que está dentro da vila passa a ser,
   * no máximo, `VILLAGE_ANIMALS_EACH` por espécie (sobram os filhotes e os mais longe do centro da faixa), o cavalo que nascia no campo diante
   * do portão some (os cavalos moram na vila agora) e o que falta nasce nas faixas (`VILLAGE_PENS`). Bichos fora da vila (soltos, comprados,
   * crias que saíram) não são tocados, a não ser o cavalo do campo. Devolve quantos foram tirados e quantos nasceram.
   */
  reconcileVillageAnimals(world: World): { removed: number; spawned: number } {
    const v = world.village;
    if (!v) return { removed: 0, spawned: 0 };
    const inVillage = (a: Breeder): boolean => inRect(v.area, Math.floor(a.x), Math.floor(a.y));
    let removed = 0;
    const kindOf = (a: Breeder): VillageKind => a.species as VillageKind;
    // O cavalo antigo do campo (fora da vila) sai; os cavalos moram na vila.
    const outside = this.horses.filter((h) => h.kind === 'horse' && !inVillage(h));
    for (const h of outside) { this.horses.splice(this.horses.indexOf(h), 1); removed++; }
    const have: Record<VillageKind, number> = { sheep: 0, cow: 0, chicken: 0, capybara: 0, horse: 0 };
    for (const kind of Object.keys(have) as VillageKind[]) {
      const inside = this.breeders().filter((a) => kindOf(a) === kind && inVillage(a));
      // adultos primeiro; os que passam de 3 saem
      inside.sort((a, b) => Number(a.baby) - Number(b.baby));
      for (const extra of inside.slice(VILLAGE_ANIMALS_EACH)) {
        if (extra instanceof Sheep) this.npcs.splice(this.npcs.indexOf(extra), 1); else this.horses.splice(this.horses.indexOf(extra as FarmAnimal), 1);
        this.courting.delete(extra);
        removed++;
      }
      have[kind] = Math.min(inside.length, VILLAGE_ANIMALS_EACH);
    }
    const before = this.breeders().length;
    this.spawnVillageAnimals(world, have);
    return { removed, spawned: this.breeders().length - before };
  }

  /**
   * Moradores da cidade (`game/npcs.ts`): o **ferreiro Black** dentro da Ferraria e os 15 NPCs comuns, cada um perto de um
   * ponto fixo das ruas — os dois primeiros na praça inicial, um no caminho até o castelo, um no pátio do castelo e os
   * outros espalhados (`homesFor`: células de rua sorteadas pela posição, a pelo menos 16 células umas das outras; a
   * cidade é igual em toda seed, então os pontos também). Os comuns só andam por ruas/praças dentro da muralha.
   */
  spawnVillagers(world: World): void {
    const t = world.town;
    if (!t) return;
    const a = t.area;
    const onStreet = (cx: number, cy: number): boolean =>
      cx > a.x0 && cx < a.x1 && cy > a.y0 && cy < t.gate.y0 && t.street[(cy - a.y0) * t.w + (cx - a.x0)] === 1;
    // O mercador mora no Mercado (atrás dos balcões); sem o cômodo (grade antiga sem interiores), passeia pelas ruas como os outros.
    const market = world.interiors.find((l) => l.def.id === 'market');
    // A florista (Rosendo) mora na Floricultura (v0.93.110), com o mesmo recuo do mercador: sem o cômodo, passeia pelas ruas.
    const florist = world.interiors.find((l) => l.def.id === 'florist');
    const common = NPC_IDS.filter((id) => id !== SMITH && !(id === MERCHANT && market?.keeper) && !(id === FLORIST_KEEPER && florist?.keeper));
    type Person = { at: [number, number]; npc: NpcId; walk: (cx: number, cy: number) => boolean };
    const homes = homesFor(world, common.length, onStreet);
    const people: Person[] = common.map((npc, i) => ({ at: homes[i], npc, walk: onStreet }));
    // Ferreiro: dentro da Ferraria, atrás do balcão (só anda nas linhas do ofício); sem interior, diante da porta.
    const forge = world.interiors.find((l) => l.def.building === Block.SMITHY);
    const smithy = t.buildings.find((b) => b.id === Block.SMITHY);
    if (forge?.keeper) {
      const k = forge.keeper;
      const walk = (cx: number, cy: number) => cy >= k.rows[0] && cy <= k.rows[1] && interiorFloor(forge, cx, cy);
      people.push({ at: k.at, npc: SMITH, walk });
    } else if (smithy?.door) {
      people.push({ at: smithy.door, npc: SMITH, walk: onStreet });
    }
    if (market?.keeper) {
      const k = market.keeper;
      const walk = (cx: number, cy: number) => cy >= k.rows[0] && cy <= k.rows[1] && interiorFloor(market, cx, cy);
      people.push({ at: k.at, npc: MERCHANT, walk });
    }
    if (florist?.keeper) {
      const k = florist.keeper;
      const walk = (cx: number, cy: number) => cy >= k.rows[0] && cy <= k.rows[1] && interiorFloor(florist, cx, cy);
      people.push({ at: k.at, npc: FLORIST_KEEPER, walk });
    }
    // O Mestre da Guilda mora atrás do balcão da Guilda (v0.93.120), com o mesmo recuo do mercador; sem o cômodo, não existe.
    const guild = world.interiors.find((l) => l.def.id === 'guild');
    if (guild?.keeper) {
      const k = guild.keeper;
      this.placeVillager(world, k.at[0], k.at[1], GUILD_MASTER.base, (cx, cy) => cy >= k.rows[0] && cy <= k.rows[1] && interiorFloor(guild, cx, cy), GUILD_MASTER);
    }
    people.forEach(({ at: [hx, hy], npc, walk }) => {
      const v = this.placeVillager(world, hx, hy, npc, walk);
      if (v && npc === MERCHANT) v.setHome(hx + 0.5, hy + 0.5); // porta dos fundos do Mercado: o ponto do posto dele, junto das prateleiras
    });
  }

  /** Posta um morador na célula andável e livre mais perto de (hx, hy) (até 12 células); devolve-o, ou null se não coube. */
  private placeVillager(world: World, hx: number, hy: number, npc: NpcId, walk: (cx: number, cy: number) => boolean, resident: ResidentDef | null = null): Villager | null {
    for (let r = 0; r <= 12; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const cx = hx + dx;
          const cy = hy + dy;
          if (!walk(cx, cy) || !world.isWalkable(cx, cy)) continue;
          const v = new Villager(cx + 0.5, cy + 0.5, npc, walk, this.rand, resident);
          if (this.all().some((w) => v.overlapsAt(v.x, v.y, w))) continue;
          this.villagers.push(v);
          return v;
        }
      }
    }
    return null;
  }

  /**
   * Moradores sorteados (ADR 0034, `game/residents.ts`): `RESIDENTS_TOWN` nas ruas da cidade e `RESIDENTS_VILLAGE` pelos caminhos da vila, cada um
   * "primo" de um morador comum (cores trocadas no shader), com nome, profissão e falas próprias — sempre os mesmos para a mesma seed. Chamar
   * depois de `spawnVillagers` (eles se espalham longe dos 16 nomeados). Só no aparelho (a sala não simula moradores).
   */
  spawnResidents(world: World, townCount = RESIDENTS_TOWN, villageCount = RESIDENTS_VILLAGE): void {
    const t = world.town;
    let townNames: ResidentDef[] = [];
    if (t) {
      const a = t.area;
      const onStreet = (cx: number, cy: number): boolean =>
        cx > a.x0 && cx < a.x1 && cy > a.y0 && cy < t.gate.y0 && t.street[(cy - a.y0) * t.w + (cx - a.x0)] === 1;
      const taken = this.villagers.map((v): [number, number] => [v.cellX, v.cellY]);
      const homes = homesFor(world, townCount, onStreet, taken, HOME_SPACING / 2);
      townNames = makeResidents(world.seed, 'town', townCount);
      townNames.forEach((r, i) => this.placeVillager(world, homes[i][0], homes[i][1], r.base, onStreet, r));
    }
    const vl = world.village;
    if (vl && villageCount > 0) {
      const { x0, y0, x1, y1 } = vl.area;
      // Anda pelos caminhos de terra e pela grama dentro do muro (animais e cercas bloqueiam pelo mapa).
      const inside = (cx: number, cy: number): boolean => cx > x0 && cx < x1 && cy > y0 && cy < y1;
      const cells: Array<[number, number, number]> = [];
      for (let cy = y0 + 1; cy < y1; cy++) for (let cx = x0 + 1; cx < x1; cx++) if (vl.ground[(cy - y0) * vl.w + (cx - x0)] === Block.PATH) cells.push([cx, cy, hash2(world.seed ^ 0x51a9, cx, cy)]);
      cells.sort((p, q) => p[2] - q[2]);
      const homes: Array<[number, number]> = [];
      for (const [cx, cy] of cells) {
        if (homes.length >= villageCount) break;
        if (homes.every(([hx, hy]) => Math.hypot(hx - cx, hy - cy) >= 4 * SUBDIV)) homes.push([cx, cy]);
      }
      makeResidents(world.seed, 'village', villageCount, townNames.map((r) => r.name)).forEach((r, i) => { if (homes[i]) this.placeVillager(world, homes[i][0], homes[i][1], r.base, inside, r); });
    }
  }

  /**
   * Bichos do mundo (os mesmos em qualquer aparelho e na sala, pela seed): rebanho, cavalo, vacas e galinhas no campo
   * diante do portão (mundos com animais) e os monstros da dungeon.
   */
  spawnWildlife(world: World, stream = false): void {
    if (world.profile.sheep) {
      const [gx, gy] = world.outsideGate();
      const inVillage = !!world.village; // com a vila (grade fina), ovelha, vaca, galinha, capivara e cavalo nascem nela
      const town = !!world.town;
      // (grade fina, ADR 0032: as distâncias em células × SUBDIV; no padrão, iguais)
      const s = SUBDIV;
      if (inVillage) this.spawnVillageAnimals(world);
      else this.spawnFlock(world, gx, gy + (town ? 8 : 0) * s);
      if (!inVillage) {
        this.spawnHorse(world, gx + 9 * s, gy + (town ? 10 : 2) * s);
        this.spawnAnimals(world, 'cow', gx - 9 * s, gy + (town ? 10 : 2) * s, 2, 91);
        this.spawnAnimals(world, 'chicken', gx - 6 * s, gy + (town ? 6 : 1) * s, 4, 97);
        this.spawnAnimals(world, 'capybara', gx - 8 * s, gy + (town ? 4 : 1) * s, 3, 103);
      }
    }
    this.spawnMonsters(world);
    this.spawnWolves(world);
    // Com `stream` (jogo e sala), os bandos nascem perto dos jogadores em `updatePacks`; sem ele, todos de uma vez (testes).
    if (!stream) { this.spawnGoblins(world); this.spawnLizards(world); }
  }

  /** Monstros nos pontos da dungeon (posições pela seed; o sorteio do passeio usa `rand`). */
  spawnMonsters(world: World): void {
    const d = world.dungeon;
    if (!d) return;
    // O chefe fica na câmara da Rainha; os demais andam pelo labirinto inteiro.
    for (const s of d.spawns) this.monsters.push(new Monster(s.kind, s.x, s.y, s.kind === 'spider-boss' ? d.bossRoom : d.interior, this.rand));
  }

  /** Bandos de lobos pelo mapa (`world/wolves.ts`; posições pela seed): cada lobo passeia perto da toca do bando. */
  spawnWolves(world: World): void {
    for (const w of wolfPacks(world)) this.monsters.push(new Monster(w.kind, w.x, w.y, wolfRoam(w.homeX, w.homeY), this.rand, w.homeX, w.homeY));
  }

  /**
   * Exactly seven goblins around each deterministic campfire in the open world. Sem `wake`, todos os acampamentos (testes e
   * mundos pequenos); com `wake`, só os que passam no teste (o streaming de `updatePacks`).
   */
  spawnGoblins(world:World,wake?:(x:number,y:number)=>boolean):void {
    for(const camp of world.goblinCamps){
      if(wake&&!wake(camp.x+0.5,camp.y+0.5))continue;
      if(world.getObject(camp.x,camp.y)!==Block.CAMPFIRE)continue;
      const bounds=goblinRoam(camp.x,camp.y);
      const existing=this.monsters.filter(m=>m.kind==='goblin' &&
        Math.abs(m.homeX-(camp.x+0.5))<=5*SUBDIV &&
        Math.abs(m.homeY-(camp.y+0.5))<=5*SUBDIV);
      if(existing.length>=GOBLIN_PACK_SIZE)continue;
      for(const [x,y] of camp.slots){
        if(!world.isWalkable(x,y))continue;
        const px=x+0.5,py=y+0.5;
        if(existing.some(m=>Math.hypot(m.homeX-px,m.homeY-py)<0.2))continue;
        this.monsters.push(new Monster('goblin',px,py,bounds,this.rand,px,py));
      }
      this.livePacks.add(`g:${camp.x},${camp.y}`);
    }
  }

  /** Bandos de três homens-lagarto na margem dos rios (mesma regra de `wake`). */
  spawnLizards(world:World,wake?:(x:number,y:number)=>boolean):void {
    for(const pack of world.lizardPacks){
      if(wake&&!wake(pack.x+0.5,pack.y+0.5))continue;
      const bounds=lizardRoam(pack.x,pack.y);
      const existing=this.monsters.filter(m=>m.kind==='lizard' &&
        Math.abs(m.homeX-(pack.x+0.5))<=5*SUBDIV && Math.abs(m.homeY-(pack.y+0.5))<=5*SUBDIV);
      if(existing.length>=LIZARD_PACK_SIZE)continue;
      for(const [x,y] of pack.slots){
        if(!world.isWalkable(x,y))continue;
        const px=x+0.5,py=y+0.5;
        if(existing.some(m=>Math.hypot(m.homeX-px,m.homeY-py)<0.2))continue;
        this.monsters.push(new Monster('lizard',px,py,bounds,this.rand,px,py));
      }
      this.livePacks.add(`l:${pack.x},${pack.y}`);
    }
  }

  /** Bandos que estão no jogo agora (chave `g:x,y` / `l:x,y`): o resto do mundo só existe no plano da seed. */
  private readonly livePacks=new Set<string>();
  private packTimer=0;

  /**
   * Streaming dos bandos (v0.93.60): com ~170 acampamentos e bandos de rio no mundo, só vivem os que têm um jogador a até
   * `PACK_SPAWN_RADIUS`; quando todos se afastam além de `PACK_DROP_RADIUS` o bando sai (com os renascimentos pendentes) e
   * volta completo na próxima aproximação. Roda a cada 0,5 s.
   */
  private updatePacks(dt:number,world:World):void {
    this.packTimer-=dt;
    if(this.packTimer>0)return;
    this.packTimer=0.5;
    const hs=this.hunters();
    if(!hs.length)return;
    const near=(x:number,y:number,r:number)=>hs.some(h=>Math.abs(h.x-x)<=r&&Math.abs(h.y-y)<=r);
    this.spawnGoblins(world,(x,y)=>near(x,y,PACK_SPAWN_RADIUS)&&!this.livePacks.has(`g:${Math.floor(x)},${Math.floor(y)}`));
    this.spawnLizards(world,(x,y)=>near(x,y,PACK_SPAWN_RADIUS)&&!this.livePacks.has(`l:${Math.floor(x)},${Math.floor(y)}`));
    for(const key of [...this.livePacks]){
      const [kind,xy]=key.split(':');
      const [x,y]=xy.split(',').map(Number);
      if(near(x+0.5,y+0.5,PACK_DROP_RADIUS))continue;
      const mk=kind==='g'?'goblin':'lizard';
      const mine=(hx:number,hy:number)=>Math.abs(hx-(x+0.5))<=5*SUBDIV&&Math.abs(hy-(y+0.5))<=5*SUBDIV;
      for(let i=this.monsters.length-1;i>=0;i--){
        const m=this.monsters[i];
        if(m.kind===mk&&mine(m.homeX,m.homeY))this.monsters.splice(i,1);
      }
      for(let i=this.respawns.length-1;i>=0;i--){
        const r=this.respawns[i];
        if(r.kind===mk&&mine(r.x,r.y))this.respawns.splice(i,1);
      }
      this.livePacks.delete(key);
    }
  }

  /** When old saves replace the generated campfire tile with a player edit,
   * keep the goblins and respawns consistent with the actual world object.
   */
  reconcileGoblinCamps(world:World):void {
    const allowed=new Set(world.goblinCamps.filter(c=>
      world.getObject(c.x,c.y)===Block.CAMPFIRE).map(c=>c.x+','+c.y));
    const known=(x:number,y:number)=>world.goblinCamps.some(c=>
      Math.hypot(c.x+0.5-x,c.y+0.5-y)<=5*SUBDIV &&
      allowed.has(c.x+','+c.y));
    for(let i=this.monsters.length-1;i>=0;i--){
      const m=this.monsters[i];
      if(m.kind==='goblin'&&!known(m.homeX,m.homeY))this.monsters.splice(i,1);
    }
    for(let i=this.respawns.length-1;i>=0;i--){
      const r=this.respawns[i];
      if(r.kind==='goblin'&&!known(r.x,r.y))this.respawns.splice(i,1);
    }
  }

  /** Quem os monstros perseguem e mordem: a personagem (aparelho) ou os jogadores da sala (servidor). */
  private hunters(): Player[] {
    return this.player ? [this.player, ...this.avatars] : this.avatars;
  }

  private all(): Walker[] {
    return [...this.hunters(), ...this.npcs, ...this.horses, ...this.villagers.filter((v) => !v.hidden), ...this.monsters];
  }

  /** Alvo de um monstro: o jogador mais perto dentro do limite dele (senão o mais perto de todos). */
  private targetOf(m: Monster): { x: number; y: number } {
    let best: Player | null = null;
    let bestD = Infinity;
    let bestInside = false;
    for (const h of this.hunters()) {
      if (h.dead) continue;
      const inside = inRect(m.bounds, Math.floor(h.x), Math.floor(h.y));
      const d = Math.hypot(h.x - m.x, h.y - m.y);
      if ((inside && !bestInside) || (inside === bestInside && d < bestD)) { best = h; bestD = d; bestInside = inside; }
    }
    return best ?? NOBODY;
  }

  /** Bloqueio entre entidades; se já estavam sobrepostas, deixa se afastar. */
  readonly blocker = (self: Walker, x: number, y: number): boolean => {
    for (const other of this.all()) {
      if (other === self) continue;
      // Par apaixonado pode encostar um no outro para namorar.
      if (self instanceof Breeder && self.partner === other) continue;
      if (self.overlapsAt(x, y, other) && !self.overlapsAt(self.x, self.y, other)) return true;
    }
    return false;
  };

  update(dt: number, world: World): void {
    // Moradores: no aparelho dentro da sala quem manda neles é a sala (o espelho só os move); sozinho e na sala, rodam aqui.
    if (!this.remote) {
      for (const v of this.villagers) {
        v.update(dt, world, this.blocker, this.time, v.leader ?? this.player ?? undefined);
        // Nível 2 (ADR 0034): parado e com alguém por perto (a jogadora ou, na sala, um avatar), o morador se vira para a pessoa mais perto.
        if (v.hidden || v.moving || v.talking) continue;
        let near: Player | null = null, nd = NOTICE_RANGE;
        for (const h of this.hunters()) { const d = Math.hypot(h.x - v.x, h.y - v.y); if (d <= nd) { near = h; nd = d; } }
        if (near) v.faceTo(near.x, near.y);
      }
    }
    if (!this.remote) this.updateCreatures(dt, world);
    for (let i = this.dying.length - 1; i >= 0; i--) {
      this.dying[i].t += dt / MONSTERS[this.dying[i].kind].deathSeconds;
      if (this.dying[i].t >= 1) this.dying.splice(i, 1);
    }
    if (this.remote) return;
    this.updateRespawns(dt);
    this.updatePacks(dt, world);
    // Ordem importa: concluir antes de (re)começar, senão o par namoraria de novo.
    this.finishCourtships(world);
    this.formPairs();
    this.startCourtships();
  }

  /** Animais passeiam; monstros perseguem o jogador mais perto e mordem quem estiver encostado. */
  private updateCreatures(dt: number, world: World): void {
    for (const s of this.npcs) s.update(dt, world, this.blocker);
    for (const h of this.horses) h.update(dt, world, this.blocker);
    this.updateFlow(dt, world);
    const flow = this.flow ? this.flowAt : undefined;
    // Monstro longe de todo mundo (> `ACTIVE_RADIUS`) fica parado: só passeia quando alguém pode vê-lo.
    const awake = (m: Monster) => this.hunters().some((h) => Math.abs(h.x - m.x) <= ACTIVE_RADIUS && Math.abs(h.y - m.y) <= ACTIVE_RADIUS);
    for (const m of this.monsters) if (awake(m)) m.update(dt, world, this.targetOf(m), this.blocker, flow);
    // Mordidas: monstro encostado e pronto morde (um alvo por vez; quem leva fica invencível por um instante).
    for (const m of this.monsters) {
      if (!awake(m)) continue;
      for (const h of this.hunters()) {
        if (h.dead || !m.tryBite(h)) continue;
        if (h === this.player) this.biteFrom(m.kind, m.x, m.y, world);
        else this.onBite?.(h, m);
        break;
      }
    }
  }

  /**
   * Mordida de um monstro `kind` vindo de (x, y) na personagem deste aparelho: dano pela fórmula (ataque do monstro −
   * defesa dela). No jogo sozinho vem do `update`; na sala, da mensagem `bite` (a sala decide quando morde).
   */
  biteFrom(kind: MonsterKind, x: number, y: number, world: World): void {
    const p = this.player;
    if (!p || p.dead) return;
    const hit = rollDamage(MONSTER_STATS[kind].attack, p.stats.defense, this.rand);
    if (p.hurt(hit.amount, x, y, world, this.blocker)) this.onDamage?.(p.x, p.y, hit, 'player');
  }

  /** Animais que se reproduzem (ovelhas + animais do campo). */
  private breeders(): Breeder[] {
    return [...this.npcs, ...this.horses];
  }

  /** Animais que comem e se reproduzem (para alimentar à frente da personagem). */
  get animals(): readonly Breeder[] {
    return this.breeders();
  }

  /** Animais como estão (para guardar): os filhotes nascidos e quem já cresceu continuam ao voltar. */
  saveAnimals(): AnimalSave[] {
    return this.breeders().map((a) => ({
      k: a.species, x: Math.round(a.x * 100) / 100, y: Math.round(a.y * 100) / 100, baby: a.baby, age: Math.round(a.age),
      hx: Math.round(a.homeX * 100) / 100, hy: Math.round(a.homeY * 100) / 100,
    }));
  }

  /**
   * Troca os animais pelos guardados (lista malformada é ignorada item a item; o limite por espécie vale). Quem cai
   * em célula onde não se anda (o mundo mudou) vai para a andável mais perto. Retorna quantos voltaram.
   */
  restoreAnimals(list: unknown, world: World): number {
    if (!Array.isArray(list)) return 0;
    this.npcs.length = 0;
    this.horses.length = 0;
    this.courting.clear();
    for (const a of list as Array<Partial<AnimalSave>>) {
      if (!a || !ANIMAL_KINDS.has(a.k as string) || !finiteNum(a.x) || !finiteNum(a.y) || !finiteNum(a.hx) || !finiteNum(a.hy)) continue;
      const k = a.k as AnimalKind;
      if (this.count(k) >= MAX_PER_SPECIES[k]) continue;
      let [x, y] = [a.x, a.y];
      if (!world.isWalkable(Math.floor(x), Math.floor(y))) [x, y] = world.nearestWalkable(Math.floor(x), Math.floor(y)).map((v) => v + 0.5);
      const baby = a.baby === true;
      const animal = k === 'sheep'
        ? new Sheep(x, y, a.hx, a.hy, this.rand, baby)
        : new FarmAnimal(k, x, y, this.rand, baby, a.hx, a.hy);
      animal.age = finiteNum(a.age) ? Math.max(0, a.age) : 0;
      if (animal instanceof Sheep) this.npcs.push(animal);
      else this.horses.push(animal as FarmAnimal);
    }
    return this.breeders().length;
  }

  /** Quantos animais da espécie existem (filhotes contam). */
  count(species: AnimalKind): number {
    return this.breeders().filter((b) => b.species === species).length;
  }

  /** Apaixonados e livres procuram o mais próximo da mesma espécie na mesma situação. */
  private formPairs(): void {
    const all = this.breeders();
    for (const a of all) {
      if (!a.inLove || a.partner || a.baby || a.courtship > 0) continue;
      if (this.count(a.species) >= MAX_PER_SPECIES[a.species]) continue;
      let best: Breeder | null = null;
      let bestD = PAIR_RANGE;
      for (const b of all) {
        if (b === a || b.species !== a.species || !b.inLove || b.partner || b.baby || b.courtship > 0) continue;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < bestD) { best = b; bestD = d; }
      }
      if (best) { a.partner = best; best.partner = a; }
    }
  }

  /** Par próximo o bastante: param, se viram um para o outro e namoram. */
  private startCourtships(): void {
    for (const a of this.breeders()) {
      const b = a.partner;
      if (!b || a.courtship > 0 || b.partner !== a || this.courting.has(a) || this.courting.has(b)) continue;
      if (Math.hypot(a.x - b.x, a.y - b.y) > COURT_DISTANCE) continue;
      a.courtship = b.courtship = COURTSHIP_SECONDS;
      this.courting.add(a);
      const aLeft = a.x <= b.x;
      a.facing = aLeft ? 'right' : 'left';
      b.facing = aLeft ? 'left' : 'right';
    }
  }

  /** Pares que começaram a namorar (o filhote nasce quando o namoro termina). */
  private readonly courting = new Set<Breeder>();

  /** Fim do namoro: nasce um filhote entre os dois; ambos entram em espera. */
  private finishCourtships(world: World): void {
    for (const a of [...this.courting]) {
      const b = a.partner;
      if (!b || b.partner !== a) {
        this.courting.delete(a);
        continue;
      }
      if (a.courtship > 0 || b.courtship > 0) continue;
      this.courting.delete(a);
      this.spawnBaby(world, (a.x + b.x) / 2, (a.y + b.y) / 2, a);
      for (const s of [a, b]) {
        s.love = 0;
        s.cooldown = BREED_COOLDOWN;
        s.partner = null;
      }
    }
  }

  /** Filhote da espécie do pai/mãe na célula andável mais perto do casal (até 2 células). */
  private spawnBaby(world: World, x: number, y: number, parent: Breeder): void {
    const cx = Math.floor(x);
    const cy = Math.floor(y);
    for (let r = 0; r <= 2; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (!world.isWalkable(cx + dx, cy + dy)) continue;
          const bx = cx + dx + 0.5;
          const by = cy + dy + 0.5;
          if (parent instanceof FarmAnimal) this.horses.push(new FarmAnimal(parent.kind, bx, by, this.rand, true, parent.homeX, parent.homeY));
          else this.npcs.push(new Sheep(bx, by, parent.homeX, parent.homeY, this.rand, true));
          return;
        }
      }
    }
  }

  /**
   * Entidades (exceto a personagem) dentro do arco do golpe (espada ou machado): à frente, até SWORD_REACH
   * da borda do corpo (monstro grande é atingido de mais longe).
   */
  strikeTargets(facing: Facing, from: { x: number; y: number } | null = this.player): Array<Breeder | Monster> {
    const [fx, fy] = FACING_VEC[facing];
    const p = from;
    if (!p) return [];
    return [...this.npcs, ...this.horses, ...this.monsters].filter((s) => {
      const dx = s.x - p.x;
      const dy = s.y - p.y;
      const d = Math.hypot(dx, dy);
      const body = s instanceof Monster ? s.spec.halfW : 0;
      if (d - body > SWORD_REACH) return false;
      return d < 0.35 + body || (dx * fx + dy * fy) / d >= SWORD_ARC_COS;
    });
  }

  /**
   * Golpe (espada ou machado): aplica o acerto a cada alvo no arco e retorna quantos foram atingidos.
   * Animais somem (sem animação de morte ainda). Monstros levam o dano da fórmula (ataque + poder da arma − defesa,
   * com variação e crítico — `world/progression.ts`), piscam e recuam; sem vida, somem.
   */
  strike(facing: Facing, world?: World, tool: ToolId | null = this.player?.attackTool ?? this.player?.equipped ?? null): number {
    const p = this.player;
    if (!p) return 0;
    return this.strikeFrom(p, facing, p.stats.attack + weaponPower(tool), world);
  }

  /** Golpe de quem está em `from` com força `attack` (ataque + poder da arma): a personagem ou um jogador da sala. */
  strikeFrom(from: { x: number; y: number }, facing: Facing, attack: number, world?: World): number {
    const hit = this.strikeTargets(facing, from);
    for (const s of hit) {
      if (!(s instanceof Monster)) {
        this.removeAnimal(s);
        continue;
      }
      const dmg = rollDamage(attack, MONSTER_STATS[s.kind].defense, this.rand);
      // Recuo proporcional: golpe forte (dano alto perto da vida máxima) e crítico empurram mais.
      const knock = Math.min(2, 0.8 + Math.min(0.7, dmg.amount / s.maxHp) + (dmg.crit ? 0.5 : 0));
      if (world) s.takeHit(dmg.amount, from.x, from.y, world, this.blocker, knock);
      else s.hp -= dmg.amount;
      this.onDamage?.(s.x, s.y, dmg, 'enemy');
      if (s.dead) this.killMonster(s);
    }
    return hit.length;
  }

  /** Monstro derrotado: sai do jogo, toca a animação de morte, solta espólios e agenda o renascimento. */
  private killMonster(m: Monster): void {
    const i = this.monsters.indexOf(m);
    if (i < 0) return;
    this.monsters.splice(i, 1);
    this.dying.push({ kind: m.kind, x: m.x, y: m.y, facing: m.facing, t: 0 });
    this.respawns.push({ kind: m.kind, x: m.homeX, y: m.homeY, bounds: m.bounds, timer: MONSTERS[m.kind].respawn });
    this.onMonsterKilled?.(m);
  }

  /** Renasce quando o tempo passou e a personagem está longe do ponto (senão tenta de novo em 5 s). */
  private updateRespawns(dt: number): void {
    for (let i = this.respawns.length - 1; i >= 0; i--) {
      const r = this.respawns[i];
      r.timer -= dt;
      if (r.timer > 0) continue;
      const m = new Monster(r.kind, r.x, r.y, r.bounds, this.rand);
      const near = this.hunters().some((p) => Math.hypot(p.x - r.x, p.y - r.y) < RESPAWN_CLEARANCE);
      if (near || this.all().some((w) => m.overlapsAt(m.x, m.y, w))) {
        r.timer = 5;
        continue;
      }
      this.respawns.splice(i, 1);
      this.monsters.push(m);
    }
  }

  /** Mapa de distâncias pelo chão da dungeon até o jogador mais perto (BFS a partir de todos lá dentro). */
  private updateFlow(dt: number, world: World): void {
    const d = world.dungeon;
    const inside = d ? this.hunters().filter((p) => !p.dead && inRect(d.area, Math.floor(p.x), Math.floor(p.y))) : [];
    if (!d || inside.length === 0) {
      this.flow = null;
      return;
    }
    this.flowTimer -= dt;
    if (this.flow && this.flowTimer > 0) return;
    this.flowTimer = FLOW_EVERY;
    const a = d.area;
    const w = a.x1 - a.x0 + 1;
    const h = a.y1 - a.y0 + 1;
    const dist = this.flow && this.flow.length === w * h ? this.flow.fill(-1) : new Int32Array(w * h).fill(-1);
    const q = new Int32Array(w * h);
    let head = 0;
    let tail = 0;
    for (const p of inside) {
      const start = (Math.floor(p.y) - a.y0) * w + (Math.floor(p.x) - a.x0);
      if (dist[start] === 0) continue;
      dist[start] = 0;
      q[tail++] = start;
    }
    while (head < tail) {
      const i = q[head++];
      const x = i % w;
      const y = (i - x) / w;
      for (let k = 0; k < 4; k++) {
        const nx = x + (k === 0 ? 1 : k === 1 ? -1 : 0);
        const ny = y + (k === 2 ? 1 : k === 3 ? -1 : 0);
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (dist[j] >= 0 || world.standHeight(a.x0 + nx, a.y0 + ny) !== 0) continue;
        dist[j] = dist[i] + 1;
        q[tail++] = j;
      }
    }
    this.flow = dist;
    this.flowArea = a;
  }

  private readonly flowAt: FlowField = (x, y) => {
    const a = this.flowArea;
    if (!this.flow || !a || x < a.x0 || y < a.y0 || x > a.x1 || y > a.y1) return -1;
    return this.flow[(y - a.y0) * (a.x1 - a.x0 + 1) + (x - a.x0)];
  };

  /** Remove um animal e desfaz vínculos (par, namoro) de quem dependia dele. */
  private removeAnimal(s: Breeder): void {
    const list: Breeder[] = s instanceof FarmAnimal ? this.horses : this.npcs;
    const i = list.indexOf(s);
    if (i < 0) return;
    list.splice(i, 1);
    this.courting.delete(s);
    for (const o of this.breeders()) {
      if (o.partner === s) {
        o.partner = null;
        o.courtship = 0;
        this.courting.delete(o);
      }
    }
  }

  /** Animal sob o ponto (em células), considerando a altura do sprite; o mais à frente vence. */
  animalAt(wx: number, wy: number): Breeder | null {
    let hit: Breeder | null = null;
    for (const s of this.breeders()) {
      const [h0, half0] = PICK_BOX[s.species][s.baby ? 1 : 0];
      const h = h0 * SUBDIV, half = half0 * SUBDIV;
      const lift = (s.visualZ * CUBE_FRONT) / TILE;
      if (Math.abs(wx - s.x) < half && wy > s.y - lift - h && wy < s.y - lift + 0.2) {
        if (!hit || s.y > hit.y) hit = s;
      }
    }
    return hit;
  }

  /** Morador sob o ponto (em células), pela altura do sprite; o mais à frente vence. */
  villagerAt(wx: number, wy: number): Villager | null {
    let hit: Villager | null = null;
    for (const v of this.villagers) {
      if (v.hidden) continue;
      const lift = (v.visualZ * CUBE_FRONT) / TILE;
      if (Math.abs(wx - v.x) < 0.45 && wy > v.y - lift - 2.1 && wy < v.y - lift + 0.2 && (!hit || v.y > hit.y)) hit = v;
    }
    return hit;
  }

  /**
   * Morador logo à frente da personagem (no arco para onde ela olha), para conversar: até 1,8 célula; quem tem ofício
   * atende do outro lado do balcão (até 3,2).
   */
  villagerInFront(): Villager | null {
    const p = this.player;
    if (!p) return null;
    const [fx, fy] = FACING_VEC[p.facing];
    let best: Villager | null = null;
    let bestD = Infinity;
    for (const v of this.villagers) {
      if (v.hidden) continue;
      const dx = v.x - p.x;
      const dy = v.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > (v.role ? 3.2 : 1.8) * SUBDIV || d >= bestD) continue;
      if (d < 0.4 * SUBDIV || (dx * fx + dy * fy) / d >= 0.3) { best = v; bestD = d; }
    }
    return best;
  }

  /** Outra entidade (não a personagem deste aparelho) ocupa a célula? (assento já tomado). */
  occupiesOther(cx: number, cy: number): boolean {
    return this.all().some((w) => w !== this.player && w.occupies(cx, cy));
  }

  /** Alguma entidade ocupa a célula? (não se coloca bloco nem se cava sob elas). */
  occupies(cx: number, cy: number): boolean {
    return this.all().some((w) => w.occupies(cx, cy));
  }

  settleAll(world: World): void {
    for (const w of this.all()) w.settle(world);
  }

  get actors(): Actor[] {
    const out: Actor[] = [...this.extra];
    const p = this.player;
    if (p) {
      const b = this.body;
      const sitting = p.sitting && canSit(b);
      // Deusa isométrica (Santuário solo): caminhada em movimento, idle parada (a folha de sentar fica registrada para quando houver assento).
      const kind: ActorKind = this.character === 'goddess-iso' ? (p.moving ? 'goddess-iso' : 'goddess-iso-idle')
        : this.character === 'goddess' ? 'goddess'
        : sitting ? `${b as SitBody}-sit` : heroActorKind(b, p.equipped, p.attackTool, p.attacking);
      out.unshift({
        kind, x: p.x, y: p.y, visualZ: p.visualZ, facing: p.facing, moving: p.moving, walkTime: p.walkTime,
        frame: sitting ? p.sitFrame : p.attacking ? p.attackFrame : undefined,
        phase: !sitting && p.attacking ? p.attackPhase : undefined,
        hurt: p.invuln > 0,
      });
    }
    for (const s of this.npcs) {
      out.push({
        kind: s.baby ? 'lamb' : 'sheep',
        x: s.x, y: s.y, visualZ: s.visualZ, facing: s.facing, moving: s.moving, walkTime: s.walkTime,
        inLove: s.inLove && s.courtship <= 0,
      });
    }
    for (const h of this.horses) {
      out.push({
        kind: h.baby ? BABY_KIND[h.kind] : h.kind === 'capybara' && !h.moving ? 'capybara-idle' : h.kind, x: h.x, y: h.y, visualZ: h.visualZ, facing: h.facing,
        moving: h.moving, walkTime: h.walkTime, inLove: h.inLove && h.courtship <= 0,
      });
    }
    // Namoro (todas as espécies): o casal de frente e os coraçõezinhos subindo entre os dois; o filhote nasce no fim.
    for (const a of this.courting) {
      const b = a.partner;
      if (!b || a.courtship <= 0) continue;
      const progress = 1 - a.courtship / COURTSHIP_SECONDS;
      out.push({
        kind: 'love-hearts',
        x: (a.x + b.x) / 2,
        y: Math.max(a.y, b.y) + 0.05, // à frente do casal
        visualZ: Math.max(a.visualZ, b.visualZ),
        facing: 'down',
        moving: false,
        walkTime: 0,
        frame: Math.min(LOVE_FRAMES - 1, Math.floor(progress * LOVE_FRAMES)),
        scale: LOVE_SCALE[a.species],
      });
    }
    for (const v of this.villagers) {
      if (v.hidden) continue;
      out.push({
        kind: `npc-${v.npc}`, x: v.x, y: v.y, visualZ: v.visualZ, facing: v.facing, moving: v.moving, walkTime: v.walkTime, fade: v.fade > 0 ? v.fade : undefined, look: v.look ?? undefined,
        mark: this.marks[v.resident?.id ?? v.npc],
      });
    }
    for (const m of this.monsters) {
      const state=hasPoses(m.kind)?m.visualState:null;
      const kind:ActorKind=state
        ? (state==='walk'?m.kind:`${m.kind}-${state}` as ActorKind)
        : m.kind;
      out.push({
        kind, x: m.x, y: m.y, visualZ: m.visualZ, facing: m.facing, moving: m.moving, walkTime: m.walkTime,
        frame:state==='attack'||state==='alert'||state==='hurt'?m.visualFrame:undefined,
        hurt:state==='hurt'?false:m.hurt>0,
        hp: m.hp < m.maxHp ? m.hp / m.maxHp : undefined,
      });
    }
    for (const d of this.dying) {
      out.push({ kind: d.kind, x: d.x, y: d.y, visualZ: 0, facing: d.facing, moving: false, walkTime: 0, dying: d.t });
    }
    return out;
  }
}

/**
 * Pontos de casa dos moradores comuns: os fixos (praça inicial ×2, meio do caminho até o castelo, pátio do castelo) e,
 * para os demais, células de rua escolhidas pelo sorteio da posição, a pelo menos `HOME_SPACING` células das já
 * escolhidas. Determinístico (a cidade é igual em toda seed).
 */
export const HOME_SPACING = 16 * SUBDIV;
export function homesFor(
  world: World, n: number, onStreet: (cx: number, cy: number) => boolean, taken: Array<[number, number]> = [], spacing = HOME_SPACING,
): Array<[number, number]> {
  const t = world.town!;
  const [sx, sy] = t.start;
  const [kx, ky] = t.castleDoor;
  const homes: Array<[number, number]> = taken.length ? [] : [[sx - 5, sy - 1], [sx + 5, sy - 3], [Math.round((sx + kx) / 2), Math.round((sy + ky) / 2)], [kx + 3, ky + 2]].slice(0, n) as Array<[number, number]>;
  const a = t.area;
  const cells: Array<[number, number, number]> = [];
  for (let cy = a.y0; cy < t.gate.y0; cy++) for (let cx = a.x0; cx <= a.x1; cx++) if (onStreet(cx, cy)) cells.push([cx, cy, hash2(7919, cx, cy)]);
  cells.sort((p, q) => p[2] - q[2]);
  for (const [cx, cy] of cells) {
    if (homes.length >= n) break;
    if (homes.every(([hx, hy]) => Math.hypot(hx - cx, hy - cy) >= spacing) && taken.every(([hx, hy]) => Math.hypot(hx - cx, hy - cy) >= spacing)) homes.push([cx, cy]);
  }
  while (homes.length < n) homes.push(taken.length ? cells[homes.length % cells.length].slice(0, 2) as [number, number] : homes[homes.length % 4]); // cidade pequena demais: repete pontos
  return homes;
}
