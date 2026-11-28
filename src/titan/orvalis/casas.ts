import { doorId, doorRight, T, trapdoorId, woodStairId } from '../voxel';

/**
 * **Casas e Celeiro da Aldeia da Costa** (ADR 0149, `COSTA_GENERATOR_VERSION` 102). Função pura de `(x, y, z)`: cada
 * construção ocupa a base edificável do pacote (`COSTA_PLAN.bases`, piso de tábuas em Y 70) e sobe em carvalho:
 * toras nos 4 cantos, tábuas nas paredes, **porta de carvalho na entrada** (duas folhas no Celeiro), **alçapões
 * de carvalho nas janelas** (folha em pé rente à face de fora; usar o alçapão a abre), **telhado de duas águas de
 * degraus** com a cumeeira de tábuas e o oitão fechado. O interior fica vazio (só o piso). Nada aqui é regra de
 * jogo: é o desenho do mapa; mexeu → `COSTA_GENERATOR_VERSION` nova.
 *
 * Direções: `idx` dos giros do motor — 0 = +Z (sul), 1 = +X (leste), 2 = −Z (norte), 3 = −X (oeste).
 * Porta e degrau: o giro é o da direção para onde a porta/o degrau baixo olha (a porta fica rente a essa borda;
 * o degrau baixo olha para baixo da água do telhado). Alçapão aberto: o giro com a folha rente à borda −Z, −X, +Z, +X
 * (0, 1, 2, 3), isto é, o oposto da direção.
 */
export type Side = 'N' | 'S' | 'L' | 'O'; // norte (−Z), sul (+Z), leste (+X), oeste (−X)

export interface Building {
  nome: string;
  /** Caixa da base `[x0, z0, x1, z1]` (inclusive): as paredes ficam no contorno. */
  caixa: readonly [number, number, number, number];
  /** Parede da entrada. */
  door: Side;
  /** 1 = porta simples no meio; 2 = porta dupla (Celeiro). */
  doors: 1 | 2;
  /** Altura das paredes (blocos acima do piso). */
  wall: number;
  /** Eixo da cumeeira: `x` (águas para norte e sul) ou `z` (águas para leste e oeste). */
  ridge: 'x' | 'z';
  /** Paredes com janelas (a da entrada só as tem se for uma parede de beiral). */
  windows: readonly Side[];
}

const SIDE_TURN: Record<Side, number> = { S: 0, L: 1, N: 2, O: 3 };

export const FLOOR_Y = 70;

/** Os quatro edifícios, na ordem de `COSTA_PLAN.bases` (Casa 1, Casa 2, Casa 3, Celeiro). Entradas voltadas para as trilhas. */
export const COSTA_BUILDINGS: readonly Omit<Building, 'caixa'>[] = [
  { nome: 'Casa 1', door: 'N', doors: 1, wall: 3, ridge: 'x', windows: ['N', 'S', 'L', 'O'] },
  { nome: 'Casa 2', door: 'L', doors: 1, wall: 3, ridge: 'z', windows: ['N', 'S', 'L', 'O'] },
  { nome: 'Casa 3', door: 'O', doors: 1, wall: 3, ridge: 'z', windows: ['N', 'S', 'L', 'O'] },
  { nome: 'Celeiro', door: 'S', doors: 2, wall: 4, ridge: 'z', windows: ['L', 'O'] },
];

/** Posições (a partir do canto) das janelas numa parede de comprimento `len`; a porta, no meio, nunca cai numa janela. */
export function windowOffsets(len: number): readonly number[] {
  if (len >= 9) return [2, len - 3];
  if (len >= 7) return [1, len - 2];
  if (len >= 5) return [Math.floor(len / 2)];
  return [];
}

/** Id do bloco do edifício na célula, ou 0 se a célula não é dele (o gerador cai no terreno). */
export function buildingBlockAt(b: Building, x: number, y: number, z: number): number {
  const [x0, z0, x1, z1] = b.caixa;
  const dy = y - FLOOR_Y; // 1 = primeira fiada acima do piso
  if (dy < 1 || x < x0 || x > x1 || z < z0 || z > z1) return 0;
  const lx = x - x0, lz = z - z0, w = x1 - x0 + 1, d = z1 - z0 + 1;
  const onN = z === z0, onS = z === z1, onO = x === x0, onL = x === x1;
  // ---- paredes ----
  if (dy <= b.wall) {
    if (!(onN || onS || onO || onL)) return 0;
    if ((onN || onS) && (onO || onL)) return T.LOG_OAK; // cantos
    const side: Side = onN ? 'N' : onS ? 'S' : onO ? 'O' : 'L';
    const along = side === 'N' || side === 'S' ? lx : lz, len = side === 'N' || side === 'S' ? w : d;
    if (side === b.door) {
      const mid = Math.floor(len / 2), cells = b.doors === 2 ? [mid - 1, mid] : [mid];
      const k = cells.indexOf(along);
      if (k >= 0 && dy <= 2) {
        // porta rente à face de fora; na porta dupla as dobradiças ficam nas pontas (a folha do lado direito de quem olha de fora tem a dobradiça à direita)
        const turn = SIDE_TURN[side], [rx, rz] = doorRight(turn), towardRight = (side === 'N' || side === 'S' ? rx : rz) > 0; // o `along` crescente vai para a direita?
        const hingeRight = b.doors === 2 && (k === 1) === towardRight;
        return doorId(turn, hingeRight, false, dy === 2);
      }
    } else if (b.windows.includes(side) && dy === 2 && windowOffsets(len).includes(along)) {
      return trapdoorId(0, (SIDE_TURN[side] + 2) % 4, true, false); // janela fechada: folha em pé rente à face de fora
    }
    return T.PLANKS_OAK;
  }
  // ---- telhado de duas águas ----
  const across = b.ridge === 'x' ? lz : lx, span = b.ridge === 'x' ? d : w; // posição e largura no sentido da água
  const alongR = b.ridge === 'x' ? lx : lz, lenR = b.ridge === 'x' ? w : d;
  const k = dy - b.wall - 1; // fiada do telhado (0 = beiral)
  const kmax = Math.floor((span - 1) / 2);
  if (k > kmax) return 0;
  const lowSide = across <= span - 1 - across ? (b.ridge === 'x' ? 'N' : 'O') : (b.ridge === 'x' ? 'S' : 'L'); // lado da água em que a célula está
  const dist = Math.min(across, span - 1 - across); // 0 = beiral
  const gable = alongR === 0 || alongR === lenR - 1;
  if (dist === k && !(span % 2 === 1 && k === kmax)) return woodStairId(0, SIDE_TURN[lowSide as Side]);
  if (span % 2 === 1 && k === kmax && dist === kmax) return T.PLANKS_OAK; // cumeeira
  if (gable && dist > k) return T.PLANKS_OAK; // oitão fechado
  return 0;
}
