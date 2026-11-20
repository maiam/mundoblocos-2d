import { T } from './voxel';

/**
 * Regras de colocação da Laje de Rocha (ADR 0056), no modelo do Minecraft: uma laje ocupa meia célula (inferior = metade de baixo, superior = metade de cima) e duas lajes
 * na mesma célula viram a laje dupla (cubo inteiro). Sem DOM, testável. Só existe um material de laje, então não há mistura de materiais na célula.
 *
 *  • Clicar com laje no **topo de uma laje inferior** ou na **face de baixo de uma laje superior** funde na mesma célula (laje dupla; gasta 1 laje).
 *  • Senão põe na célula vizinha da face apontada: **superior** se clicou na face de baixo de um bloco, ou na metade de cima (`hy ≥ 0,5`) de uma lateral; **inferior** no resto.
 */
export type SlabPlacement = { merge: boolean; block: number };

/**
 * `targetId` = bloco apontado; `ny` = normal Y da face clicada (+1 topo, −1 base, 0 lateral); `hy` = altura 0–1 do ponto clicado dentro da célula apontada
 * (ausente = inferior nas laterais).
 */
export function resolveSlabPlacement(targetId: number, ny: number, hy: number | undefined): SlabPlacement {
  if (targetId === T.SLAB && ny === 1) return { merge: true, block: T.SLAB_DOUBLE };
  if (targetId === T.SLAB_TOP && ny === -1) return { merge: true, block: T.SLAB_DOUBLE };
  const top = ny === -1 || (ny === 0 && (hy ?? 0) >= 0.5);
  return { merge: false, block: top ? T.SLAB_TOP : T.SLAB };
}
