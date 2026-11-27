/**
 * Quadros do líquido (ADR 0132), puros: o atlas da água do Orvalis tem uma linha de 4 células quadradas por quadro (topo, topo, lateral, lateral); o do Titã, uma só (2 quadros por deslocamento em U).
 * O renderer lê o número de quadros pela proporção da imagem e desloca o UV em V.
 */
/** Quadros do atlas: cada linha tem 4 células de lado largura/4; a imagem tem tantas linhas quantos quadros. */
export const liquidRowsOf = (img: { width: number; height: number }): number => Math.max(1, Math.round(img.height / (img.width / 4)));
/** Tempo (s) de cada quadro da água animada. */
export const LIQUID_FRAME_S = 0.4;
/** Deslocamento V do quadro no instante `time`: a linha 0 é a de cima da imagem (v mais alto, com `flipY`). */
export const liquidRowOffset = (time: number, rows: number): number => 1 - (Math.floor(time / LIQUID_FRAME_S) % rows + 1) / rows;
