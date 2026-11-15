/**
 * Moradores sorteados (ADR 0034, v0.93.113): além dos 16 NPCs nomeados, a cidade e a vila ganham gente "genérica" — um **primo** de um dos moradores
 * comuns (mesma folha e retrato, **cores trocadas no shader** do billboard por `Look`), com **nome, profissão e personalidade** sorteados pela seed
 * (e falas por profissão). Módulo **puro** (sem DOM nem `Math.random`): o mesmo mundo sorteia sempre as mesmas pessoas. O `Villager` só executa.
 */
import { hash2 } from '../world/random';
import { NPCS, NPC_IDS, FLORIST_KEEPER, MERCHANT, SMITH, type NpcId } from './npcs';

/** Troca de cores do desenho (aplicada no shader: ver `three/actorBillboards.ts`): giro de matiz (voltas, 0..1) e multiplicadores de saturação e brilho. */
export interface Look {
  hue: number;
  sat: number;
  val: number;
}

export type ResidentPlace = 'town' | 'village';
export type Personality = 'alegre' | 'timido' | 'curioso' | 'ranzinza' | 'sonhador';

export interface ResidentDef {
  /** Id único do mundo (`r<n>`), só para teste/depuração. */
  id: string;
  /** Folha e retrato emprestados (um morador comum). */
  base: NpcId;
  name: string;
  /** Profissão, em palavras (aparece nas falas). */
  profession: string;
  personality: Personality;
  look: Look;
  /** Falas em roda (profissão + jeito de ser). */
  lines: readonly string[];
}

/** Nomes sorteados (nenhum repete o de um NPC nomeado). */
export const RESIDENT_NAMES = [
  'Adalto', 'Beatriz', 'Cecília', 'Davi', 'Elisa', 'Fausto', 'Gael', 'Heloísa', 'Ivo', 'Júlia', 'Lara', 'Mateus',
  'Nina', 'Osvaldo', 'Paulina', 'Quitéria', 'Rui', 'Sônia', 'Tomás', 'Ulisses', 'Vera', 'Yara', 'Zeca', 'Amélia',
  'Bruno', 'Clara', 'Dora', 'Estevão', 'Flávia', 'Geraldo', 'Helena', 'Inês', 'Jonas', 'Lúcia', 'Murilo', 'Nair',
  'Otávio', 'Pietra', 'Renato', 'Sara', 'Tiago', 'Vitória', 'Abel', 'Berta', 'Cíntia', 'Dario', 'Eugênia', 'Fabrício',
] as const;

interface Profession { name: string; lines: readonly [string, string] }

const TOWN_PROFESSIONS: readonly Profession[] = [
  { name: 'guarda de rua', lines: ['Faço a ronda das ruas. A muralha protege a cidade, e eu protejo o caminho até a porta de casa.', 'Dizem que quem acende a lamparina cedo dorme tranquilo. Eu só confiro se todas estão acesas.'] },
  { name: 'escriba', lines: ['Copio cartas e registros para a Guilda. Tinta, pena e muita paciência: é só disso que preciso.', 'Anoto tudo o que acontece na cidade. Se algo importante te acontecer, eu escrevo!'] },
  { name: 'alfaiate', lines: ['Costuro capas e coletes para o povo da cidade. Cor boa não sai de moda, sabia?', 'Um bom tecido dura anos. Cuide do que veste e ele cuida de você.'] },
  { name: 'cozinheiro', lines: ['Cozinho para a Hospedaria. Pão quentinho e sopa de legumes sempre dão ânimo a quem viaja.', 'O segredo de um bom caldo? Trigo fresco, hortaliça da horta e tempo no fogo.'] },
  { name: 'mensageiro', lines: ['Levo recados de uma ponta à outra da cidade. Quem anda muito conhece cada pedra da rua!', 'Já entreguei carta até no castelo. A porta não abriu, mas o guarda leu o envelope.'] },
  { name: 'pedreiro', lines: ['Assentei muita pedra nestas ruas. Repare: nenhuma está torta.', 'Pedra, areia e terra: com isso se faz casa, muro e calçada. Bloco bem posto não cai.'] },
  { name: 'lampadeiro', lines: ['Cuido dos postes de luz da cidade. De noite a rua fica bonita, toda acesa.', 'Limpo o vidro de cada lanterna toda semana. Luz suja não ilumina direito.'] },
  { name: 'aprendiz de ferreiro', lines: ['Quero aprender com o Black a forjar espada. Por enquanto só varro a Ferraria.', 'Ferro quente é coisa séria. Já queimei a ponta do cabelo duas vezes!'] },
];

const VILLAGE_PROFESSIONS: readonly Profession[] = [
  { name: 'agricultor', lines: ['Planto trigo e hortaliça na vila. Terra arada, semente e água: o resto é esperar.', 'Colheita boa é a que se divide. Leve um pouco de trigo para os bichos!'] },
  { name: 'pastor', lines: ['Cuido das ovelhas da vila. Elas gostam de trigo e de sombra, nessa ordem.', 'Ovelha tosquiada dá lã de novo, sabia? A paciência é toda a ciência do pastor.'] },
  { name: 'lenhador', lines: ['Derrubo árvores e racho lenha para o inverno. Cada tora serve a uma casa.', 'Árvore derrubada pede árvore plantada. Sempre deixo uma muda no lugar.'] },
  { name: 'tecelão', lines: ['Tenho um tear na casa de palha. Fio por fio sai uma manta quentinha.', 'A lã das ovelhas daqui é macia. Dá pano bom para qualquer estação.'] },
  { name: 'ordenhador', lines: ['Tiro o leite das vacas toda manhã, bem cedo, antes de o sol esquentar.', 'Vaca calma dá leite bom. Falo baixinho com elas, e elas gostam.'] },
  { name: 'cuidador de galinhas', lines: ['Recolho os ovos do galinheiro. Cada galinha tem o seu jeitinho de botar.', 'Semente de trigo para elas, e ovo fresco para a gente. Troca justa!'] },
];

const PERSONALITIES: readonly Personality[] = ['alegre', 'timido', 'curioso', 'ranzinza', 'sonhador'];

const OPENER: Record<Personality, string> = {
  alegre: 'Que alegria te ver por aqui!',
  timido: 'Ah... oi. Desculpe, não vi você chegar.',
  curioso: 'Ei, você! De onde veio? Conta tudo!',
  ranzinza: 'Humpf. O que você quer?',
  sonhador: 'Hmm... ah, olá. Estava longe daqui.',
};

const CLOSER: Record<Personality, string> = {
  alegre: 'Passe sempre por aqui, vai ser um prazer!',
  timido: 'Bem... é só isso. Obrigado por ouvir.',
  curioso: 'E você, o que anda fazendo de interessante?',
  ranzinza: 'Agora, com licença, tenho o que fazer.',
  sonhador: 'Às vezes penso em como seria viver além do mapa...',
};

/** Giros de matiz permitidos (em voltas): longe o bastante da cor de origem para o "primo" parecer outra pessoa. */
const HUES = [0.09, 0.17, 0.25, 0.33, 0.42, 0.5, 0.58, 0.67, 0.75, 0.83, 0.92];
const SATS = [0.9, 1, 1.1];
const VALS = [0.86, 0.95, 1.04];

/** Folhas que um sorteado pode emprestar: os moradores comuns (sem ofício). */
export const RESIDENT_BASES: readonly NpcId[] = NPC_IDS.filter((id) => id !== SMITH && id !== MERCHANT && id !== FLORIST_KEEPER);

/** Cores neutras (sem troca): o desenho original. */
export const NO_LOOK: Look = { hue: 0, sat: 1, val: 1 };

/**
 * Sorteia `count` moradores de um lugar (`salt` separa cidade de vila). Nomes e (folha, cores) não se repetem dentro do mesmo sorteio;
 * mesma seed + mesmo lugar + mesmo `count` = as mesmas pessoas. `avoidNames`: nomes já usados no mundo (a vila não repete os da cidade).
 */
export function makeResidents(seed: number, place: ResidentPlace, count: number, avoidNames: Iterable<string> = []): ResidentDef[] {
  const salt = place === 'town' ? 0x7e51 : 0x51a9;
  const professions = place === 'town' ? TOWN_PROFESSIONS : VILLAGE_PROFESSIONS;
  const pick = (n: number, i: number, k: number): number => Math.floor(hash2(seed ^ salt, i * 131 + k, 977 + k) * n);
  const usedNames = new Set<string>(avoidNames);
  const usedLooks = new Set<string>();
  const out: ResidentDef[] = [];
  for (let i = 0; i < count; i++) {
    let name = '';
    for (let t = 0; t < RESIDENT_NAMES.length; t++) {
      const cand = RESIDENT_NAMES[(pick(RESIDENT_NAMES.length, i, 1) + t) % RESIDENT_NAMES.length];
      if (!usedNames.has(cand)) { name = cand; break; }
    }
    usedNames.add(name);
    let base = RESIDENT_BASES[0], look = NO_LOOK;
    for (let t = 0; t < RESIDENT_BASES.length * HUES.length; t++) {
      const b = RESIDENT_BASES[(pick(RESIDENT_BASES.length, i, 2) + t) % RESIDENT_BASES.length];
      const h = HUES[(pick(HUES.length, i, 3) + Math.floor(t / RESIDENT_BASES.length)) % HUES.length];
      if (usedLooks.has(`${b}|${h}`)) continue;
      usedLooks.add(`${b}|${h}`);
      base = b;
      look = { hue: h, sat: SATS[pick(SATS.length, i, 4)], val: VALS[pick(VALS.length, i, 5)] };
      break;
    }
    const prof = professions[pick(professions.length, i, 6)];
    const personality = PERSONALITIES[pick(PERSONALITIES.length, i, 7)];
    out.push({
      id: `r${place === 'town' ? 't' : 'v'}${i}`,
      base, name, profession: prof.name, personality, look,
      lines: [`${OPENER[personality]} ${prof.lines[0]}`, `${prof.lines[1]} ${CLOSER[personality]}`],
    });
  }
  return out;
}

/** O sorteado conhece o nome de um NPC nomeado? (teste de colisão de nomes) */
export const NAMED_NPC_NAMES: ReadonlySet<string> = new Set(NPCS.map((n) => n.name));
