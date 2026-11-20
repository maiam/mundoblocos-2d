/**
 * Braseiro de Rocha (ADR 0065): bloco de rocha com cuba. Apagado (`T.BRAZIER`) não serve de estação; uma **Brasa de Âmbar** o acende (`T.BRAZIER_LIT`) com `BRAZIER_CHARGES` preparações (Lingote de Cobre,
 * carne assada); cada fabricação no braseiro gasta uma carga e, ao zerar, ele apaga e volta a `T.BRAZIER`. As cargas ficam em `TitanSession.braziers` (chave `x,y,z`) e vão no save. Sem DOM.
 */
/** Preparações por brasa (provisório, ADR 0065). */
export const BRAZIER_CHARGES = 8;
export const brazierKey = (x: number, y: number, z: number): string => `${x},${y},${z}`;
