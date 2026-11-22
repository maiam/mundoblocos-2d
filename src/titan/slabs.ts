import { T } from './voxel';

/**
 * Regras de colocação da Laje de Rocha (ADR 0056), no modelo do Minecraft: uma laje ocupa meia célula (inferior = metade de baixo, superior = metade de cima) e duas lajes
 * na mesma célula viram a laje dupla (cubo inteiro). Sem DOM, testável. Só existe um material de laje, então não há mistura de materiais na célula.
 *
 *  • Clicar com laje no **topo de uma laje inferior** ou na **face de baixo de uma laje superior** funde na mesma célula (laje dupla; gasta 1 laje).
 *  • Senão põe na célula vizinha da face apontada: **superior** se clicou na face de baixo de um bloco, ou na metade de cima (`hy ≥ 0,5`) de uma lateral; **inferior** no resto.
 */
export type SlabPlacement = { merge: boolean; block: number };

/** Família de cada laje: a inferior, a superior e o que a fusão vira (a de rocha vira a laje dupla; a de junco, o Bloco de Junco, ADR 0100). */
const FAMILY = {
  rock: { bottom: T.SLAB, top: T.SLAB_TOP, whole: T.SLAB_DOUBLE },
  reed: { bottom: T.REED_SLAB, top: T.REED_SLAB_TOP, whole: T.REED_BLOCK },
} as const;

/**
 * `targetId` = bloco apontado; `ny` = normal Y da face clicada (+1 topo, −1 base, 0 lateral); `hy` = altura 0–1 do ponto clicado dentro da célula apontada
 * (ausente = inferior nas laterais); `held` = a laje na mão (inferior de rocha ou de junco). Só funde com a laje **da mesma família**.
 */
export function resolveSlabPlacement(targetId: number, ny: number, hy: number | undefined, held: number = T.SLAB): SlabPlacement {
  const f = held === T.REED_SLAB || held === T.REED_SLAB_TOP ? FAMILY.reed : FAMILY.rock;
  if (targetId === f.bottom && ny === 1) return { merge: true, block: f.whole };
  if (targetId === f.top && ny === -1) return { merge: true, block: f.whole };
  const top = ny === -1 || (ny === 0 && (hy ?? 0) >= 0.5);
  return { merge: false, block: top ? f.top : f.bottom };
}
