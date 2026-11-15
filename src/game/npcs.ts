/**
 * Moradores da Cidade do Despertar (v0.92.0): quem são, como se chamam e o que dizem. **Fonte única de nomes e falas**
 * (a tabela de nomes está em `docs/domains/npc.md`). Cada NPC é uma folha pronta (`npc-<id>`, `assets-src/npcs`) com o
 * retrato da caixa de conversa (`portrait-<id>`, `scripts/make-portraits.py`).
 *
 * NPC novo: folha em `assets-src/npcs/<id>.png` → `process-sprite.py` + `make-portraits.py` (OPERATIONS) → id e dados
 * aqui → import em `render/art/principal.ts` e entrada em `SPECS` (`render/character.ts`).
 */

/** Ofício que dá fala e lugar próprios: o ferreiro (Ferraria), o mercador (Mercado, v0.93.57; tocar nele abre a loja), o florista e o Mestre da Guilda (v0.93.120). */
export type NpcRole = 'smith' | 'merchant' | 'florist' | 'guild';

export interface NpcDef {
  id: string;
  /** Nome mostrado na plaquinha da caixa de conversa. */
  name: string;
  /** Quem é, em uma linha (só documentação). */
  who: string;
  role?: NpcRole;
  /**
   * Falas (cada toque conta a próxima, em roda). Uma fala é um texto corrido: a caixa de conversa o divide em páginas
   * pelo que cabe (setinha ▼ = tem mais).
   */
  lines: readonly string[];
}

export const NPCS = [
  {
    id: 'black', name: 'Black', who: 'Ferreiro (mora na Ferraria)', role: 'smith',
    lines: [
      'Bem-vinda à Ferraria! Logo vou forjar ferramentas e armas para você. Por enquanto, traga o que tiver de bom e vamos conversando.',
      'Ferro, pedra e bastante paciência: é assim que nasce uma boa lâmina. Volte quando as aranhas e os lobos derem trabalho.',
    ],
  },
  {
    id: 'dante', name: 'Dante', who: 'Arquivista da cidade (cabelo preto e branco)',
    lines: [
      'Guardo os registros da cidade. Dizem que aqui dentro da muralha nada se quebra e nada se constrói — e o chão ao redor do muro também é protegido.',
      'Anotei uma coisa curiosa: chão que você quebra e deixa aberto por um dia inteiro volta a ser chão sozinho, igual ao dos vizinhos.',
    ],
  },
  {
    id: 'silvano', name: 'Silvano', who: 'Herbalista (cabelo verde, bolsa de couro)',
    lines: [
      'Semente só pega em terra arada. Use a enxada, vire a terra e plante: trigo, batata, tomate e cenoura.',
      'Capim arrancado às vezes solta uma hortaliça. Mexa nele antes de passar adiante!',
    ],
  },
  {
    id: 'morgan', name: 'Morgan', who: 'Estudioso do castelo (casaco roxo)',
    lines: [
      'O castelo ao norte guarda a história de Orvalis. Ainda não recebo visitas, mas um dia a porta vai se abrir.',
      'Cada mundo tem a sua cidade. O nosso é o Mundo da Cidade 1: só florestas, rios, mar e praias.',
    ],
  },
  {
    id: 'aurelio', name: 'Aurélio', who: 'Cortesão sempre sorridente (casaco azul-marinho)',
    lines: [
      'Que dia lindo para um passeio! Veja só: a macieira dá maçãs, e depois de colhidas elas voltam com o tempo.',
      'Maçã se come para matar a fome. Fome vazia tira vida, então não esqueça de se alimentar!',
    ],
  },
  {
    id: 'rubem', name: 'Rubem', who: 'Aventureiro (cabelo vermelho, jaqueta marrom)',
    lines: [
      'Os lobos andam em bandos de uma cor só, marrom, cinza ou branco. Eles só atacam se você chegar a três passos, então passe longe!',
      'Se um lobo vier atrás de você, corra: você é mais rápida que ele. Espada e machado dão conta, mas leve vida cheia.',
    ],
  },
  {
    id: 'rosendo', name: 'Rosendo', who: 'Jardineiro e florista (cabelo rosa, colete verde) — mora na Floricultura', role: 'florist',
    lines: [
      'Gosto de flor e de árvore. Carvalho, bétula, cerejeira e macieira crescem todas por aqui, misturadas.',
      'Tora de cerejeira, de bétula ou de carvalho: cada árvore derrubada dá a sua madeira. Dá para fazer tábuas com elas!',
    ],
  },
  {
    id: 'teodoro', name: 'Teodoro', who: 'Pescador alegre (camisa azul)',
    lines: [
      'Os rios e o mar têm margem de areia. A água não deixa ninguém quebrá-la, mas buraco aberto perto dela se enche sozinho!',
      'Quer atravessar um rio? Jogue terra, pedra ou madeira na água: ela vira chão firme.',
    ],
  },
  {
    id: 'bento', name: 'Bento', who: 'Padeiro e mercador (colete marrom) — mora no Mercado', role: 'merchant',
    lines: [
      'Trigo, ovos, leite e maçãs: com isso se faz muita coisa boa no caldeirão e no forno. Pão alimenta bem!',
      'Ovelha e vaca gostam de trigo, galinha prefere semente e o cavalo adora cenoura. Alimente e veja os corações!',
    ],
  },
  {
    id: 'solano', name: 'Solano', who: 'Construtor (camisa laranja)',
    lines: [
      'Quer construir? Madeira de qualquer árvore, pedra, terra e areia servem de bloco. A porta vai entre dois batentes de madeira ou pedra.',
      'Baú, porta, cadeira e cerca por enquanto só saem de tábua de carvalho. Quem sabe um dia haja de outras madeiras!',
    ],
  },
  {
    id: 'nilo', name: 'Nilo', who: 'Tratador de cavalos (cabelo castanho-escuro, olhos fechados)',
    lines: [
      'Os animais do campo ficam ao sul do portão: ovelhas, vacas, galinhas e um cavalo. Cuide bem deles.',
      'Dê a comida certa e eles se apaixonam. Daí nasce um filhote, que cresce em alguns dias.',
    ],
  },
  {
    id: 'marlon', name: 'Marlon', who: 'Marinheiro (cabelo azul-petróleo, colete marinho)',
    lines: [
      'O mar é grande e cheio de segredos. Por enquanto só dá para andar pela praia, mas quem sabe um dia haja barcos.',
      'Nas margens a espuma é branquinha. Bonito de ver ao entardecer, não acha?',
    ],
  },
  {
    id: 'lavinio', name: 'Lavínio', who: 'Sonhador (cabelo lavanda)',
    lines: [
      'À noite o mundo fica silencioso. Uma tenda armada lá fora vira o seu ponto de renascer: durma tranquila!',
      'Fico imaginando o que existe além do mapa. Dizem que há outros mundos ligados por portais.',
    ],
  },
  {
    id: 'caio', name: 'Caio', who: 'Caçador (cabelo preto, túnica verde)',
    lines: [
      'Há uma caverna lá fora, cheia de aranhas, com uma Rainha lá no fundo. A espada é a sua melhor amiga.',
      'Das aranhas saem seda e presas; dos lobos, pelagem e presas. Ainda não sei fazer nada com isso, mas guarde!',
    ],
  },
  {
    id: 'noel', name: 'Noel', who: 'Guarda da muralha (cabelo azul-marinho, colete vinho)',
    lines: [
      'Eu vigio a muralha. Não se constrói nem se quebra nada nela, nem no pedaço de terra colado a ela.',
      'O portão fica ao sul. Lá fora a vida é mais selvagem: leve ferramentas e olhe os arredores antes de se afastar.',
    ],
  },
  {
    id: 'leandro', name: 'Leandro', who: 'Viajante (cabelo loiro, camisa azul)',
    lines: [
      'Já andei por muitos lugares! Cada pessoa que chega à cidade traz um jeito novo de explorar.',
      'Dica de viajante: arme uma tenda antes de se aventurar. Se algo der errado, é lá que você volta a si.',
    ],
  },
] as const satisfies readonly NpcDef[];

export type NpcId = (typeof NPCS)[number]['id'];
export const NPC_IDS: readonly NpcId[] = NPCS.map((n) => n.id);

const BY_ID = new Map<string, NpcDef>(NPCS.map((n) => [n.id, n]));

export function npcDef(id: NpcId): NpcDef {
  return BY_ID.get(id)!;
}

/** O ferreiro (único com ofício por enquanto). */
export const SMITH: NpcId = 'black';
/** O florista fixo da Floricultura (v0.93.110): atrás do balcão; tocar nele abre a loja das 15 Flores Fofas. Era o Jardineiro da rua. */
export const FLORIST_KEEPER: NpcId = 'rosendo';
/** O mercador fixo do Mercado (v0.93.57): atrás dos balcões; tocar nele abre a loja. */
export const MERCHANT: NpcId = 'bento';
