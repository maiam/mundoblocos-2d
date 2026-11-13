import { Block, blockDef, type BlockId } from '../world/blocks';
import { skyAt } from './daycycle';
import { hexToRgb, mix } from './color';
import { glowLightFor, type LightSource } from './lighting';

/**
 * Luz e escuridão do Mundo no 3D (ADR 0031, M3.3; clima padrão decidido pelo dono do produto em 13/11/2026: **só à noite e na
 * dungeon** — o dia continua claro como no 2D). Funções PURAS: o brilho ambiente pela hora do dia, a cor da escuridão e a
 * coleta das fontes de luz na área visível. O desenho é o `SanctuaryLighting` (sobreposição com buracos de luz).
 */

/** Escuridão mínima à meia-noite (brilho ambiente); `AMBIENT_PRESETS.noite` do Santuário é 0,18. */
export const NIGHT_AMBIENT = 0.24;
/** Dentro do covil, penumbra fixa (como a vinheta do 2D), seja dia ou noite. */
export const DUNGEON_AMBIENT = 0.3;
/** Abaixo disso a luz fica ligada; a partir daqui é dia pleno e a camada nem é desenhada. */
export const DAY_AMBIENT = 0.985;

export interface WorldAmbient {
  /** 0 = escuridão total fora das luzes; 1 = dia pleno. */
  ambient: number;
  /** Cor da escuridão (índigo da noite, puxada para a tinta do céu no pôr do sol). */
  dark: string;
  /** A camada de luz precisa ser desenhada? */
  active: boolean;
}

/** Brilho ambiente pela hora (`time`: 0 = meia-noite, 0,5 = meio-dia; o mesmo `skyAt` do 2D) e se está no covil. */
export function worldAmbient(time: number, inDungeon: boolean): WorldAmbient {
  const sky = skyAt(time);
  // tintA vai de 0 (dia) a 0,5 (meia-noite): normaliza para 0..1 e interpola até o brilho da noite.
  const night = Math.min(1, sky.tintA / 0.5);
  let ambient = 1 - night * (1 - NIGHT_AMBIENT);
  if (inDungeon) ambient = Math.min(ambient, DUNGEON_AMBIENT);
  return { ambient, dark: mix('#0a0820', sky.tint, 0.18), active: ambient < DAY_AMBIENT };
}

/** Cor de uma luz (0–1) a partir da cor do brilho do bloco (`#rrggbb`); um dourado quente se a cor não for lida. */
export function lightColorFrom(hex: string | undefined): [number, number, number] {
  if (!hex || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex.trim())) return [1, 0.85, 0.6];
  const [r, g, b] = hexToRgb(hex.trim());
  return [r / 255, g / 255, b / 255];
}

/** O que cada luz do Mundo precisa saber do bloco (da tabela de brilhos da arte). */
export interface GlowInfo {
  /** Cor do brilho em hex (`textures.glowColor`). */
  color?: string;
  /** Onde fica a chama em relação ao centro da base, em células (`textures.glowAt`; y negativo = acima). */
  at?: [number, number];
}

/** Luz de um bloco que brilha na célula (x, y) ou null. Chama na face sul da célula, na altura de `at` (ou 0,9 célula). */
export function glowSource(id: BlockId, x: number, y: number, info: GlowInfo | undefined): LightSource | null {
  if (id === Block.AIR || !info) return null;
  const base = blockDef(id).glow ? glowLightFor(id) : null;
  const fallback = { radius: 4, flicker: 0.08 }; // lampiões e afins: não são `glow` de bloco, mas a arte os faz brilhar
  const p = base ?? fallback;
  const at = info.at ?? [0, -0.9];
  const color = base ? base.color : lightColorFrom(info.color);
  return { x: x + 0.5 + at[0], z: y + 1, height: Math.max(0.2, -at[1]), radius: p.radius, color, flicker: p.flicker };
}

/** Todas as luzes de blocos na área visível `[x0, x1] × [y0, y1]` (células). */
export function collectWorldLights(
  view: { x0: number; y0: number; x1: number; y1: number },
  objectAt: (x: number, y: number) => BlockId,
  infoFor: (id: BlockId) => GlowInfo | undefined,
): LightSource[] {
  const out: LightSource[] = [];
  for (let y = Math.floor(view.y0); y <= Math.ceil(view.y1); y++) {
    for (let x = Math.floor(view.x0); x <= Math.ceil(view.x1); x++) {
      const id = objectAt(x, y);
      if (id === Block.AIR) continue;
      const l = glowSource(id, x, y, infoFor(id));
      if (l) out.push(l);
    }
  }
  return out;
}
