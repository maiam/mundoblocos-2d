import type { Facing } from '../game/walker';

/**
 * Personagem modular (ADR 0017): leitura pura do `manifesto.json` gerado por `scripts/export-personagem.py`.
 * Sem DOM — o desenho fica em `modularCharacter.ts`.
 */

/** Ação no manifesto: folha com uma linha por direção e uma coluna por quadro. */
export interface ModularAction {
  quadros: number;
  fps: number;
  ciclo: boolean;
  /** Tamanho do quadro na folha exportada (px). */
  quadro: [number, number];
  /** Âncora (raiz no chão) em px do quadro exportado, já deslocada pelo recorte. */
  ancora: [number, number];
  /** px de mundo por px da folha exportada (escala fixa do mestre). */
  escalaMundo: number;
}

export interface ModularPiece {
  encaixe: string;
  id: string;
  status: string;
  /** ação → parte → arquivo. */
  folhas: Record<string, Record<string, string>>;
}

export interface ModularManifest {
  versao: string;
  direcoes: string[];
  ordem: string[];
  ordemPorDirecao: Record<string, string[]>;
  acoes: Record<string, ModularAction>;
  pecas: ModularPiece[];
}

/** Aparência: encaixe → id da peça. `corpo` ausente = `base`. Encaixe ausente = sem peça. */
export type ModularLook = Partial<Record<string, string>>;

/** Direção do jogo → nome da linha no manifesto (contrato: frente, esquerda, direita, costas). */
const DIRECTION: Record<Facing, string> = { down: 'frente', left: 'esquerda', right: 'direita', up: 'costas' };

export interface ModularLayer {
  parte: string;
  arquivo: string;
}

export interface ModularFrame {
  acao: string;
  action: ModularAction;
  /** Linha (direção) e coluna (quadro) na folha. */
  row: number;
  col: number;
  /** Partes de trás para a frente. */
  layers: ModularLayer[];
}

function piecesFor(m: ModularManifest, look: ModularLook): ModularPiece[] {
  const want = { corpo: 'base', ...look };
  const out: ModularPiece[] = [];
  for (const [encaixe, id] of Object.entries(want)) {
    if (!id) continue;
    const p = m.pecas.find((q) => q.encaixe === encaixe && q.id === id);
    if (p) out.push(p);
  }
  return out;
}

/**
 * Quadro a desenhar: andando = caminhada; parado = repouso se todas as peças o têm, senão quadro 0 da caminhada.
 * `undefined` se não houver corpo para a ação.
 */
export function modularFrame(
  m: ModularManifest, look: ModularLook, facing: Facing, moving: boolean, walkTime: number, elapsed: number,
): ModularFrame | undefined {
  const pieces = piecesFor(m, look);
  const has = (acao: string) => m.acoes[acao] && pieces.length > 0 && pieces.every((p) => p.folhas[acao]);
  let acao = 'caminhada';
  let t = walkTime;
  if (!moving && has('repouso')) {
    acao = 'repouso';
    t = elapsed;
  }
  const action = m.acoes[acao];
  if (!action || !pieces.some((p) => p.encaixe === 'corpo' && p.folhas[acao])) return undefined;
  const raw = Math.floor(t * action.fps);
  const col = !moving && acao === 'caminhada' ? 0
    : action.ciclo ? raw % action.quadros : Math.min(action.quadros - 1, raw);
  const dir = DIRECTION[facing];
  const order = m.ordemPorDirecao[dir] ?? m.ordem;
  const layers: ModularLayer[] = [];
  for (const parte of order) {
    for (const p of pieces) {
      const arquivo = p.folhas[acao]?.[parte];
      if (arquivo) layers.push({ parte, arquivo });
    }
  }
  return { acao, action, row: Math.max(0, m.direcoes.indexOf(dir)), col, layers };
}

/** Lê a aparência de teste da URL: `?personagem=chibi&cabelo=…&tronco=…&pernas=…&pes=…`. Sem `personagem=chibi` → null. */
export function lookFromSearch(search: string): ModularLook | null {
  const q = new URLSearchParams(search);
  if (q.get('personagem')?.toLowerCase() !== 'chibi') return null;
  const look: ModularLook = { corpo: 'base', cabelo: q.get('cabelo') ?? 'curto-castanho' };
  for (const encaixe of ['tronco', 'pernas', 'pes']) {
    const v = q.get(encaixe);
    if (v) look[encaixe] = v;
  }
  return look;
}

/** Encaixes que o jogador escolhe ao montar o chibi (o corpo é sempre `base`), na ordem da tela. */
export const LOOK_SLOTS = ['cabelo', 'tronco', 'pernas', 'pes'] as const;
export type LookSlot = (typeof LOOK_SLOTS)[number];
/** Encaixes que podem ficar vazios (descalço). */
const OPTIONAL_SLOTS: ReadonlySet<string> = new Set(['pes']);

/** Ids das peças de um encaixe, na ordem do manifesto; `null` no fim = "sem peça" (só nos encaixes opcionais). */
export function lookOptions(m: ModularManifest, encaixe: string): (string | null)[] {
  const ids: (string | null)[] = m.pecas.filter((p) => p.encaixe === encaixe).map((p) => p.id);
  if (OPTIONAL_SLOTS.has(encaixe)) ids.push(null);
  return ids;
}

/** Aparência inicial: a primeira peça de cada encaixe. */
export function defaultLook(m: ModularManifest): ModularLook {
  const look: ModularLook = { corpo: 'base' };
  for (const s of LOOK_SLOTS) {
    const id = lookOptions(m, s)[0];
    if (id) look[s] = id;
  }
  return look;
}

/** Aparência sorteada (`rand` em [0, 1)). */
export function randomLook(m: ModularManifest, rand: () => number): ModularLook {
  const look: ModularLook = { corpo: 'base' };
  for (const s of LOOK_SLOTS) {
    const opts = lookOptions(m, s);
    const id = opts[Math.floor(rand() * opts.length) % opts.length];
    if (id) look[s] = id;
  }
  return look;
}

/**
 * Aparência vinda de fora (salvamento, rede) só com peças que existem no manifesto; null se não houver nada válido.
 * Peça desconhecida (removida numa versão nova da arte) volta para a padrão do encaixe — exceto nos opcionais.
 */
export function cleanLook(m: ModularManifest, raw: unknown): ModularLook | null {
  if (!raw || typeof raw !== 'object') return null;
  const src = raw as Record<string, unknown>;
  const look: ModularLook = { corpo: 'base' };
  for (const s of LOOK_SLOTS) {
    const opts = lookOptions(m, s);
    const v = src[s];
    if (typeof v === 'string' && opts.includes(v)) look[s] = v;
    else if (!OPTIONAL_SLOTS.has(s) && opts[0]) look[s] = opts[0];
  }
  return look;
}

/** Nome legível de uma peça: `blusa-ocre` → "Blusa ocre"; sem peça → "Descalço" (pés) ou "Nenhum". */
export function pieceLabel(encaixe: string, id: string | null): string {
  if (!id) return encaixe === 'pes' ? 'Descalço' : 'Nenhum';
  const words = id.replace(/-/g, ' ').replace('lilas', 'lilás').replace('ardosia', 'ardósia');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
