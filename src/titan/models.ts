import type { Box } from './lantern';
import { BED_HEIGHT, BRAZIER_HEIGHT, CHEST_HEIGHT, isWallTorch, wallTorchTurn, isBrazier, chestTurn, isBed, isChest, isLadder, isMarco, isPanel, ladderFacing, ladderTurn, marcoTurn, PANEL_HEIGHT, T } from './voxel';

/**
 * Caixas dos modelos 3D pequenos (ADR 0058): a mira acerta a caixa do objeto (com folga `pad` de toque), não a célula inteira. Marco de Margem: 0,56 × 0,629 × 0,43 m, a largura vira
 * profundidade nos giros ímpares; Painel de Junco: 1,00 × 0,944 × 0,224 m, ao longo de X (`T.PAINEL`) ou de Z (`T.PAINEL_Z`). Pivô no centro da base da célula. Sem DOM.
 */
export const MARCO_SIZE = { w: 0.56, d: 0.43, h: 0.629 } as const;
export const PANEL_SIZE = { w: 1, d: 0.224, h: PANEL_HEIGHT } as const;

/** Placa da Escada de Junco (ADR 0088): 0,63 de largura, 1 m de altura e 0,12 m de fundo, encostada na borda da célula do lado do apoio. */
/** Caixas de mira da Tocha (ADR 0121): em pé 0,25 × 0,72; de parede 0,25 de largura e 0,45 de alcance. */
export const TORCH_BOX = { w: 0.25, h: 0.72, reach: 0.45 } as const;
export const LADDER_SIZE = { w: 0.63, d: 0.12, h: 1 } as const;

/** Baú de Rocha e Junco (ADR 0089): 0,95 de largura e 0,946 de fundo, 0,73 m de altura; a largura vira profundidade nos giros ímpares. */
export const CHEST_SIZE = { w: 0.95, d: 0.946, h: CHEST_HEIGHT } as const;

/** Braseiro de Rocha (ADR 0092): 0,935 m de lado e 0,774 m de altura (as duas variantes). */
export const BRAZIER_SIZE = { w: 0.935, d: 0.935, h: BRAZIER_HEIGHT } as const;

export function modelBox(id: number, x: number, y: number, z: number, pad = 0): Box {
  const cx = x + 0.5, cz = z + 0.5;
  let hx: number, hz: number, h: number;
  if (isMarco(id)) { const odd = marcoTurn(id) % 2 === 1; hx = (odd ? MARCO_SIZE.d : MARCO_SIZE.w) / 2; hz = (odd ? MARCO_SIZE.w : MARCO_SIZE.d) / 2; h = MARCO_SIZE.h; }
  else if (isPanel(id)) { const alongX = id === T.PAINEL; hx = (alongX ? PANEL_SIZE.w : PANEL_SIZE.d) / 2; hz = (alongX ? PANEL_SIZE.d : PANEL_SIZE.w) / 2; h = PANEL_SIZE.h; }
  else if (isBed(id)) return [x - pad, y - pad, z - pad, x + 1 + pad, y + BED_HEIGHT + pad, z + 1 + pad]; // cada metade da cama: a célula inteira até 0,45 m
  else if (isBrazier(id)) { hx = BRAZIER_SIZE.w / 2; hz = BRAZIER_SIZE.d / 2; h = BRAZIER_SIZE.h; }
  else if (isChest(id)) { const odd = chestTurn(id) % 2 === 1; hx = (odd ? CHEST_SIZE.d : CHEST_SIZE.w) / 2; hz = (odd ? CHEST_SIZE.w : CHEST_SIZE.d) / 2; h = CHEST_SIZE.h; }
  else if (id === T.TORCH) { hx = hz = TORCH_BOX.w / 2; h = TORCH_BOX.h; } // tocha em pé (ADR 0121): caixa de mira um pouco maior que o modelo
  else if (isWallTorch(id)) {
    // presa à parede: ocupa [apoio, apoio + 0,45] ao longo da chama e 0,2 de largura, entre 0,2 e 0,9 de altura
    const [fx, fz] = ladderFacing(wallTorchTurn(id)), ax = fx === 0 ? [cx - TORCH_BOX.w / 2, cx + TORCH_BOX.w / 2] : fx > 0 ? [x, x + TORCH_BOX.reach] : [x + 1 - TORCH_BOX.reach, x + 1];
    const az = fz === 0 ? [cz - TORCH_BOX.w / 2, cz + TORCH_BOX.w / 2] : fz > 0 ? [z, z + TORCH_BOX.reach] : [z + 1 - TORCH_BOX.reach, z + 1];
    return [ax[0] - pad, y + 0.2 - pad, az[0] - pad, ax[1] + pad, y + 0.9 + pad, az[1] + pad];
  } else if (isLadder(id)) {
    // a face de apoio fica na borda oposta à frente: a placa ocupa [apoio, apoio + 0,12] ao longo da frente e a largura inteira de lado
    const [fx, fz] = ladderFacing(ladderTurn(id)), hw = LADDER_SIZE.w / 2;
    const ax = fx === 0 ? [cx - hw, cx + hw] : fx > 0 ? [x, x + LADDER_SIZE.d] : [x + 1 - LADDER_SIZE.d, x + 1];
    const az = fz === 0 ? [cz - hw, cz + hw] : fz > 0 ? [z, z + LADDER_SIZE.d] : [z + 1 - LADDER_SIZE.d, z + 1];
    return [ax[0] - pad, y - pad, az[0] - pad, ax[1] + pad, y + LADDER_SIZE.h + pad, az[1] + pad];
  } else return [x, y, z, x + 1, y + 1, z + 1];
  return [cx - hx - pad, y - pad, cz - hz - pad, cx + hx + pad, y + h + pad, cz + hz + pad];
}
