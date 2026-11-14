export type MinimapMarkerKind = 'town' | 'dungeon' | 'tent' | 'friend';

export interface MinimapMarker {
  kind: MinimapMarkerKind;
  x: number;
  y: number;
  /** Marcador que fica na borda quando está longe (cidade, tenda). */
  pinned?: boolean;
}

export const MARKER_COLOR: Record<MinimapMarkerKind, string> = {
  town: '#ffd46b', dungeon: '#e8574a', tent: '#f3e3c0', friend: '#7fd4ff',
};

/** Desenha o marcador (estrela = cidade, quadrado = covil, triângulo = tenda, bolinha = amigo) centrado em (x, y). */
export function drawMarkerShape(ctx: CanvasRenderingContext2D, kind: MinimapMarkerKind, x: number, y: number, r: number, line: number): void {
  ctx.lineWidth = line;
  ctx.strokeStyle = '#2a1a48';
  ctx.fillStyle = MARKER_COLOR[kind];
  ctx.beginPath();
  if (kind === 'town') {
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4 - Math.PI / 2;
      const rr = k % 2 === 0 ? r * 1.6 : r * 0.6;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
  } else if (kind === 'tent') {
    ctx.moveTo(x, y - r * 1.3);
    ctx.lineTo(x + r * 1.2, y + r);
    ctx.lineTo(x - r * 1.2, y + r);
    ctx.closePath();
  } else if (kind === 'dungeon') {
    ctx.rect(x - r, y - r, r * 2, r * 2);
  } else {
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();
}
