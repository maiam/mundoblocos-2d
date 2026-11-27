import type { ModelData } from './art/titan';

/**
 * Modelos da flora marinha do Orvalis (ADR 0135), sem arquivo: dois planos cruzados na diagonal da célula (como a planta do Minecraft), com a textura de 16 × 16 da célula do atlas de itens (a mesma `hotbarTex`).
 * Células do atlas: 115 = erva marinha baixa, 119 = erva alta (base), 120 = erva alta (topo), 121 = alga (corpo), 122 = alga (ponta); as quatro últimas **não são itens**, só a textura. O material tem `alphaTest` e `DoubleSide`.
 */
export const FLORA_CELLS = { ervaMarinha: 115, ervaAlta: 119, ervaAltaTopo: 120, alga: 121, algaTopo: 122 } as const;
export type FloraKind = keyof typeof FLORA_CELLS;
/** Altura do desenho: a erva baixa fica a 80 % da célula; o resto enche a célula. */
const HEIGHT: Record<FloraKind, number> = { ervaMarinha: 0.8, ervaAlta: 1, ervaAltaTopo: 1, alga: 1, algaTopo: 1 };
const H = 0.46; // meia diagonal: o plano vai quase de canto a canto, sem sair da célula

/** UV da célula `item` (4 colunas × `rows` linhas) para o ponto (u, v) do sprite, v = 1 no alto: o mesmo mapeamento do item na mão. */
const cellUv = (item: number, rows: number, u: number, v: number): [number, number] => [(((item - 1) % 4) + u) / 4, 1 - ((((item - 1) / 4) | 0) + (1 - v)) / rows];

export function floraModel(kind: FloraKind, rows: number): ModelData {
  const item = FLORA_CELLS[kind], h = HEIGHT[kind], pos: number[] = [], nrm: number[] = [], uv: number[] = [], idx: number[] = [];
  for (const [ax, az] of [[1, 1], [1, -1]] as const) { // dois planos: as duas diagonais da célula
    const b = pos.length / 3;
    pos.push(-H * ax, 0, -H * az, H * ax, 0, H * az, H * ax, h, H * az, -H * ax, h, -H * az);
    for (let i = 0; i < 4; i++) nrm.push(0, 1, 0);
    uv.push(...cellUv(item, rows, 0, 0), ...cellUv(item, rows, 1, 0), ...cellUv(item, rows, 1, h), ...cellUv(item, rows, 0, h));
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  return { size: [1, 1, 1], pos, nrm, uv, idx };
}
