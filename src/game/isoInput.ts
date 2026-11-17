/**
 * Direção de tela → direção do mundo na vista isométrica (câmera a 45° de azimute, ADR 0036).
 * Na tela, "direita" é (+x, −y) do mundo e "baixo" (rumo à câmera) é (+x, +y); girar a entrada em 45° faz a seta para cima andar para o
 * fundo da tela (−x, −y), a de baixo para a frente (+x, +y), e assim por diante — sem isso a tecla "direita" andava na diagonal da tela.
 * Preserva o módulo (rotação pura); o `Walker` limita a 1.
 */
export function screenToWorldIso(ix: number, iy: number): [number, number] {
  const k = Math.SQRT1_2;
  return [(ix + iy) * k, (iy - ix) * k];
}
