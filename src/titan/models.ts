import type { Box } from './lantern';
import { isMarco, isPanel, marcoTurn, PANEL_HEIGHT, T } from './voxel';

/**
 * Caixas dos modelos 3D pequenos (ADR 0058): a mira acerta a caixa do objeto (com folga `pad` de toque), não a célula inteira. Marco de Margem: 0,56 × 0,629 × 0,43 m, a largura vira
 * profundidade nos giros ímpares; Painel de Junco: 1,00 × 0,944 × 0,224 m, ao longo de X (`T.PAINEL`) ou de Z (`T.PAINEL_Z`). Pivô no centro da base da célula. Sem DOM.
 */
export const MARCO_SIZE = { w: 0.56, d: 0.43, h: 0.629 } as const;
export const PANEL_SIZE = { w: 1, d: 0.224, h: PANEL_HEIGHT } as const;

export function modelBox(id: number, x: number, y: number, z: number, pad = 0): Box {
  const cx = x + 0.5, cz = z + 0.5;
  let hx: number, hz: number, h: number;
  if (isMarco(id)) { const odd = marcoTurn(id) % 2 === 1; hx = (odd ? MARCO_SIZE.d : MARCO_SIZE.w) / 2; hz = (odd ? MARCO_SIZE.w : MARCO_SIZE.d) / 2; h = MARCO_SIZE.h; }
  else if (isPanel(id)) { const alongX = id === T.PAINEL; hx = (alongX ? PANEL_SIZE.w : PANEL_SIZE.d) / 2; hz = (alongX ? PANEL_SIZE.d : PANEL_SIZE.w) / 2; h = PANEL_SIZE.h; }
  else return [x, y, z, x + 1, y + 1, z + 1];
  return [cx - hx - pad, y - pad, cz - hz - pad, cx + hx + pad, y + h + pad, cz + hz + pad];
}
