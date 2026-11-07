import { APPEARANCE_BODIES, type AppearanceBody } from '../net/protocol';
import type { ModularLook } from '../render/modular';
import { CUBE_FRONT, TILE } from '../config';
import { Block } from '../world/blocks';
import { hash2 } from '../world/random';
import { type Hit, MONSTER_STATS, rollDamage, weaponPower } from '../world/progression';
import type { World } from '../world/world';
import type { Player } from './player';
import { BREED_COOLDOWN, Breeder, COURTSHIP_SECONDS } from './breeder';
import { Sheep } from './sheep';
import { BABY_KIND, type BabyKind, FarmAnimal, type FarmKind } from './horse';
import { type ExpressionId, ROLE_LOOK, TOWNSFOLK_BASES, Villager, type VillagerBase, villagerExpression, villagerOutfit, type OutfitId, type VillagerRole } from './villager';
import { interiorFloor } from '../world/interiors';
import { type FlowField, Monster, MONSTERS } from './monster';
import { inRect, type MonsterKind, type Rect } from '../world/dungeon';
import { type Facing, type Walker } from './walker';

import { type AnimalKind, TOOLS, type ToolId } from '../world/items';
import type { CharacterId } from '../world/profiles';

/** Ferramentas com folha de ação (golpe/arar). */
/** Ferramentas com folha de ação (`TOOLS[t].swings`). */
export type SwingTool = 'sword' | 'axe' | 'hoe' | 'shovel' | 'pickaxe';

/**
 * Personagem pronto (folhas desenhadas inteiras): Heroína, Herói, Hood ou Gino. O chibi modular é outro caminho
 * (`look`). Personagem novo: acrescente em `APPEARANCE_BODIES` (rede) e o nome aqui; arte em `render/art` + `SPECS`.
 */
export type HeroBody = AppearanceBody;
export const HERO_BODIES: readonly HeroBody[] = APPEARANCE_BODIES;
/** Nome de cada personagem pronto na tela de escolha. */
export const HERO_NAMES: Record<HeroBody, string> = { heroine: 'Heroína', hero: 'Herói', hood: 'Hood', gino: 'Gino' };

export type ActorKind = HeroBody | `${HeroBody}-${ToolId}` | `${HeroBody}-${SwingTool}-attack` | 'goddess' | 'sheep' | 'lamb' | 'love-hearts' | FarmKind | BabyKind | `villager-${VillagerBase}` | MonsterKind;

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
  /** Monstro ferido: fração de vida restante (barra acima dele). */
  hp?: number;
  /** Monstro derrotado: progresso 0..1 da animação de morte (encolhe e desbota). */
  dying?: number;
  /** Morador: roupa desenhada por cima da folha-base (mesma grade). */
  outfit?: OutfitId;
  /** Morador: expressão (rosto em camada, com franja e efeitos por cima). */
  expression?: ExpressionId;
  /** Nome escrito acima da cabeça (outros jogadores no multiplayer). */
  label?: string;
  /** Tamanho relativo do desenho (ex.: coraçõezinhos do namoro, pelo tamanho do animal). */
  scale?: number;
  /** Personagem modular em teste (ADR 0017): peças por encaixe; o render desenha o chibi no lugar da heroína. */
  look?: ModularLook;
}

/** Recalcula o mapa de distâncias da dungeon a cada … (s). */
const FLOW_EVERY = 0.25;
/** Monstro só renasce com a personagem a mais de … células do ponto de nascimento. */
const RESPAWN_CLEARANCE = 10;

const FLOCK_SIZE = 4;
/** Alcance do golpe de espada (células, do centro dos pés) e abertura do arco (cosseno mínimo). */
export const SWORD_REACH = 1.45;
const SWORD_ARC_COS = 0.3;
const FACING_VEC: Record<Facing, [number, number]> = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
/** Caixa de toque (altura, meia-largura em células) de adulto e filhote, pelo tamanho do desenho. */
const PICK_BOX: Record<AnimalKind, [[number, number], [number, number]]> = {
  sheep: [[1.15, 0.45], [0.85, 0.35]],
  horse: [[1.5, 0.55], [1.05, 0.4]],
  cow: [[1.25, 0.5], [0.95, 0.4]],
  chicken: [[0.8, 0.3], [0.65, 0.26]],
};
/** Quadros dos coraçõezinhos do namoro (folha `love-hearts`, `scripts/extract-love.py`). */
const LOVE_FRAMES = 16;
/** Tamanho dos coraçõezinhos por espécie (acompanha o tamanho do animal). */
const LOVE_SCALE: Record<AnimalKind, number> = { sheep: 1, cow: 1.05, chicken: 0.7, horse: 1.25 };
/** Distância (células) em que dois animais apaixonados se encontram. */
const PAIR_RANGE = 6;
/** Distância (células) para começar a namorar. */
const COURT_DISTANCE = 1.5;
/** Limite de ovelhas para a população não explodir. */
export const MAX_SHEEP = 16;
/** Limite por espécie (filhotes contam): a população não explode. */
export const MAX_PER_SPECIES: Record<AnimalKind, number> = { sheep: MAX_SHEEP, horse: 6, cow: 10, chicken: 12 };

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

const ANIMAL_KINDS = new Set<string>(['sheep', 'horse', 'cow', 'chicken']);
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

  /** Aparência modular em teste (`?personagem=chibi`); null = personagem pronto (`body`). */
  look: ModularLook | null = null;
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
      const r = 2 + hash2(world.seed, i, 72) * 6;
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
      const r = 3 + hash2(world.seed, i, salt + 1) * 6;
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
   * Moradores da cidade: um de cada personagem-base livre (`TOWNSFOLK_BASES`, sem os reservados aos ofícios), em pontos
   * fixos (praça inicial, caminho até o castelo, pátio do castelo), cada um com uma roupa casual sorteada pela seed, e o
   * **ferreiro** com o visual único do ofício (`ROLE_LOOK`) dentro da Ferraria. Os comuns só andam por ruas/praças dentro
   * da muralha (nunca pelo portão).
   */
  spawnVillagers(world: World): void {
    const t = world.town;
    if (!t) return;
    const a = t.area;
    const onStreet = (cx: number, cy: number): boolean =>
      cx > a.x0 && cx < a.x1 && cy > a.y0 && cy < t.gate.y0 && t.street[(cy - a.y0) * t.w + (cx - a.x0)] === 1;
    const [sx, sy] = t.start;
    const [kx, ky] = t.castleDoor;
    type Person = { at: [number, number]; base: VillagerBase; outfit: OutfitId; expression: ExpressionId; walk: (cx: number, cy: number) => boolean; role?: VillagerRole };
    const homes: Array<[number, number]> = [[sx - 5, sy - 1], [sx + 5, sy - 3], [Math.round((sx + kx) / 2), Math.round((sy + ky) / 2)], [kx + 3, ky + 2]];
    const people: Person[] = TOWNSFOLK_BASES.map((base, i) => ({ at: homes[i % homes.length], base, outfit: villagerOutfit(world.seed, i), expression: villagerExpression(world.seed, i), walk: onStreet }));
    const smithLook = ROLE_LOOK.smith;
    // Ferreiro: dentro da Ferraria, atrás do balcão (só anda nas linhas do ofício); sem interior, diante da porta.
    const forge = world.interiors.find((l) => l.def.building === Block.SMITHY);
    const smithy = t.buildings.find((b) => b.id === Block.SMITHY);
    if (forge?.keeper) {
      const k = forge.keeper;
      const walk = (cx: number, cy: number) => cy >= k.rows[0] && cy <= k.rows[1] && interiorFloor(forge, cx, cy);
      people.push({ at: k.at, ...smithLook, walk, role: 'smith' });
    } else if (smithy?.door) {
      people.push({ at: smithy.door, ...smithLook, walk: onStreet, role: 'smith' });
    }
    people.forEach(({ at: [hx, hy], base, outfit, expression, walk, role }) => {
      // Rua/praça andável e livre mais perto do ponto.
      for (let r = 0; r <= 12; r++) {
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
            const cx = hx + dx;
            const cy = hy + dy;
            if (!walk(cx, cy) || !world.isWalkable(cx, cy)) continue;
            const v = new Villager(cx + 0.5, cy + 0.5, base, outfit, walk, this.rand, role, expression);
            if (this.all().some((w) => v.overlapsAt(v.x, v.y, w))) continue;
            this.villagers.push(v);
            return;
          }
        }
      }
    });
  }

  /**
   * Bichos do mundo (os mesmos em qualquer aparelho e na sala, pela seed): rebanho, cavalo, vacas e galinhas no campo
   * diante do portão (mundos com animais) e os monstros da dungeon.
   */
  spawnWildlife(world: World): void {
    if (world.profile.sheep) {
      const [gx, gy] = world.outsideGate();
      const town = !!world.town;
      this.spawnFlock(world, gx, gy + (town ? 8 : 0));
      this.spawnHorse(world, gx + 9, gy + (town ? 10 : 2));
      this.spawnAnimals(world, 'cow', gx - 9, gy + (town ? 10 : 2), 2, 91);
      this.spawnAnimals(world, 'chicken', gx - 6, gy + (town ? 6 : 1), 4, 97);
    }
    this.spawnMonsters(world);
  }

  /** Monstros nos pontos da dungeon (posições pela seed; o sorteio do passeio usa `rand`). */
  spawnMonsters(world: World): void {
    const d = world.dungeon;
    if (!d) return;
    // O chefe fica na câmara da Rainha; os demais andam pelo labirinto inteiro.
    for (const s of d.spawns) this.monsters.push(new Monster(s.kind, s.x, s.y, s.kind === 'spider-boss' ? d.bossRoom : d.interior, this.rand));
  }

  /** Quem os monstros perseguem e mordem: a personagem (aparelho) ou os jogadores da sala (servidor). */
  private hunters(): Player[] {
    return this.player ? [this.player, ...this.avatars] : this.avatars;
  }

  private all(): Walker[] {
    return [...this.hunters(), ...this.npcs, ...this.horses, ...this.villagers, ...this.monsters];
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
    for (const v of this.villagers) v.update(dt, world, this.blocker);
    if (!this.remote) this.updateCreatures(dt, world);
    for (let i = this.dying.length - 1; i >= 0; i--) {
      this.dying[i].t += dt / MONSTERS[this.dying[i].kind].deathSeconds;
      if (this.dying[i].t >= 1) this.dying.splice(i, 1);
    }
    if (this.remote) return;
    this.updateRespawns(dt);
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
    for (const m of this.monsters) m.update(dt, world, this.targetOf(m), this.blocker, flow);
    // Mordidas: monstro encostado e pronto morde (um alvo por vez; quem leva fica invencível por um instante).
    for (const m of this.monsters) {
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
      if (world) s.takeHit(dmg.amount, from.x, from.y, world, this.blocker);
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
      const [h, half] = PICK_BOX[s.species][s.baby ? 1 : 0];
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
      const dx = v.x - p.x;
      const dy = v.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > (v.role ? 3.2 : 1.8) || d >= bestD) continue;
      if (d < 0.4 || (dx * fx + dy * fy) / d >= 0.3) { best = v; bestD = d; }
    }
    return best;
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
      const kind: ActorKind = this.character === 'goddess' ? 'goddess' : heroActorKind(b, p.equipped, p.attackTool, p.attacking);
      out.unshift({
        kind, x: p.x, y: p.y, visualZ: p.visualZ, facing: p.facing, moving: p.moving, walkTime: p.walkTime,
        frame: p.attacking ? p.attackFrame : undefined,
        hurt: p.invuln > 0,
        look: this.character === 'heroine' && this.look ? this.look : undefined,
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
        kind: h.baby ? BABY_KIND[h.kind] : h.kind, x: h.x, y: h.y, visualZ: h.visualZ, facing: h.facing,
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
      out.push({
        kind: `villager-${v.base}`, x: v.x, y: v.y, visualZ: v.visualZ, facing: v.facing, moving: v.moving, walkTime: v.walkTime,
        outfit: v.outfit, expression: v.expression,
      });
    }
    for (const m of this.monsters) {
      out.push({
        kind: m.kind, x: m.x, y: m.y, visualZ: m.visualZ, facing: m.facing, moving: m.moving, walkTime: m.walkTime,
        hurt: m.hurt > 0, hp: m.hp < m.maxHp ? m.hp / m.maxHp : undefined,
      });
    }
    for (const d of this.dying) {
      out.push({ kind: d.kind, x: d.x, y: d.y, visualZ: 0, facing: d.facing, moving: false, walkTime: 0, dying: d.t });
    }
    return out;
  }
}
