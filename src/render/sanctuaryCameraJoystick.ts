/** Parâmetros da câmera livre do palco 3D (azimute, elevação, zoom). O joystick experimental foi removido (limpeza do Santuário antigo). */
export interface SanctuaryOrbit {
  azimuthDeg: number; elevationDeg: number; zoom: number;
  /** Escala da altura dos cubos, apenas no palco visual. 1 = bloco original. */
  blockHeight: number;
  /** Escala da largura/profundidade da célula renderizada. 1 = célula original. */
  cellSize: number;
}
export const SANCTUARY_DEFAULT_CAMERA: SanctuaryOrbit = { azimuthDeg: 35, elevationDeg: 50, zoom: 0.95, blockHeight: 0.5, cellSize: 0.8 };
/** Comparação aprovada para a câmera inclinada — não muda a visão original. */
export const CAMERA_OPTION_2: SanctuaryOrbit = { azimuthDeg: 36, elevationDeg: 40, zoom: 1.91, blockHeight: 0.5, cellSize: 0.5 };
