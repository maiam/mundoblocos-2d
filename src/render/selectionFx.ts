import { hash2 } from '../world/random';

/**
 * Seleção de células na tela (cantoneiras do alvo, moldura do cursor, rachaduras de quebra): o MESMO desenho para o `Renderer` 2D
 * e para a camada 2D do render 3D (ADR 0031, M5). Cada função recebe o retângulo do alvo em pixels de CSS (`SelectionRect`) e o zoom
 * da câmera; quem chama calcula o retângulo (no 2D pelo sprite, no 3D pela silhueta do bloco visto de cima).
 */
export interface SelectionRect { sx: number; sy: number; w: number; h: number }

/**
 * Seleção do alvo à frente: cantoneiras que "respiram" ao redor do bloco do topo (ou da célula), douradas se há ação possível,
 * rosadas se não.
 */
export function drawFocusBrackets(ctx: CanvasRenderingContext2D, r: SelectionRect, zoom: number, valid: boolean, elapsed: number): void {
  const { sx, sy, w, h } = r;
  const pulse = 1 + 0.06 * Math.sin(elapsed * 5);
  const cx = sx + w / 2;
  const cy = sy + h / 2;
  const hw = (w / 2) * pulse + 2;
  const hh = (h / 2) * pulse + 2;
  const len = Math.min(w, h) * 0.28;
  ctx.save();
  ctx.lineWidth = Math.max(2.5, zoom * 1.4);
  ctx.lineCap = 'round';
  ctx.strokeStyle = valid ? '#ffe9a8' : 'rgba(255, 150, 170, 0.9)';
  ctx.shadowColor = valid ? 'rgba(255, 212, 107, 0.95)' : 'rgba(255, 80, 120, 0.7)';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  for (const [sxn, syn] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
    const x = cx + sxn * hw;
    const y = cy + syn * hh;
    ctx.moveTo(x, y - syn * len);
    ctx.lineTo(x, y);
    ctx.lineTo(x - sxn * len, y);
  }
  ctx.stroke();
  ctx.restore();
}

/** Moldura do cursor (mouse): branca se a ação é possível, rosada se não. */
export function drawHoverFrame(ctx: CanvasRenderingContext2D, r: SelectionRect, valid: boolean): void {
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = valid ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 120, 140, 0.9)';
  ctx.shadowColor = valid ? 'rgba(160, 220, 255, 0.9)' : 'rgba(255, 80, 120, 0.8)';
  ctx.shadowBlur = 8;
  ctx.strokeRect(r.sx + 1, r.sy + 1, r.w - 2, r.h - 2);
  ctx.restore();
}

/**
 * Rachaduras que crescem com o progresso + anel de carregamento. `cell` é a célula (só semeia as rachaduras, determinísticas).
 * `ringOnly`: só o anel (o 3D com "sensação" desenha o desgaste em pixels no próprio bloco, `three/breakCracks.ts`; as fissuras radiais
 * por cima liam como listras).
 */
export function drawBreakingCracks(ctx: CanvasRenderingContext2D, r: SelectionRect, zoom: number, progress: number, cell: { x: number; y: number }, ringOnly = false): void {
  const { sx, sy, w, h } = r;
  const cx = sx + w / 2;
  const cy = sy + h / 2;
  const p = Math.min(1, progress);
  if (!ringOnly) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(sx, sy, w, h);
    ctx.clip();
    ctx.fillStyle = `rgba(20, 12, 40, ${0.25 * p})`;
    ctx.fillRect(sx, sy, w, h);
    // Rachaduras determinísticas a partir do centro; mais ramos conforme avança.
    ctx.strokeStyle = `rgba(30, 18, 50, ${0.5 + 0.4 * p})`;
    ctx.lineWidth = Math.max(1.5, zoom);
    ctx.lineCap = 'round';
    const branches = Math.ceil(p * 7);
    const reach = Math.max(w, h) * 0.55 * p;
    for (let i = 0; i < branches; i++) {
      const a = (i / 7) * Math.PI * 2 + hash2(cell.x * 31 + i, cell.y, 5) * 0.8;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      let px = cx;
      let py = cy;
      for (let k = 1; k <= 3; k++) {
        const jitter = (hash2(cell.x + k, cell.y + i, 9) - 0.5) * 0.9;
        px = cx + Math.cos(a + jitter) * reach * (k / 3);
        py = cy + Math.sin(a + jitter) * reach * (k / 3);
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  const ringR = Math.max(14, Math.min(w, h) * 0.32);
  ctx.save();
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(28, 22, 64, 0.55)';
  ctx.beginPath();
  ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#ffd46b';
  ctx.shadowColor = 'rgba(255, 212, 107, 0.8)';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, ringR, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
