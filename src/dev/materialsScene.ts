import { CUBE_FRONT, TILE } from '../config';
import type { Actor } from '../game/entities';
import { Block, type BlockId } from '../world/blocks';
import { ActorSprites } from '../render/character';
import { qaMaterial, type Sprite } from '../render/textures';

/**
 * Cena dos materiais V2 (`?materiais=1`, só em desenvolvimento; ADR 0023): dois painéis lado a lado com as mesmas peças —
 * atlas legado e materiais V2 — para conferir cada material migrado no jogo, não na arte solta (a comparação de frente
 * 16 × 18 já foi decidida: 18). Cada painel tem chão plano (só topo), cubos soltos, pilha de 3, a heroína no chão e em cima de um
 * cubo, e a grade das células com a linha de apoio. Desenha por conta própria (os dois atlas lado a lado); para escala
 * de sprites no renderizador real há a cena `?escala=1` (ADR 0022, com `&blocos=v2` para a arte V2).
 */
const COLS = 6;
const ROWS = 7;
const PANELS: Array<{ title: string; mode: 'legacy' | 'v2'; front: number }> = [
  { title: 'Atlas legado', mode: 'legacy', front: CUBE_FRONT },
  { title: 'Materiais V2', mode: 'v2', front: CUBE_FRONT },
];
/** Chão do painel: linhas de cima em grama, depois terra, areia e pedra (encontros retos: sem transição ainda — Etapa 3). */
const GROUND: BlockId[] = [Block.GRASS, Block.GRASS, Block.GRASS, Block.DIRT, Block.SAND, Block.SAND, Block.STONE];
/** Cubos: [coluna, linha, bloco, altura da pilha]. */
const CUBES: Array<[number, number, BlockId, number]> = [
  [1, 2, Block.SAND, 1], [2, 2, Block.DIRT, 1], [3, 2, Block.GRASS, 1],
  [4, 4, Block.GRASS, 3], [1, 5, Block.DIRT, 2], [2, 5, Block.GRASS, 1], [4, 2, Block.STONE, 1],
];

export function showMaterialsScene(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d')!;
  const sprites = new ActorSprites();
  let grid = true;
  let raf = 0;
  const parts = new Map<string, { cube: Sprite; ground: HTMLCanvasElement } | null>();
  const part = (id: BlockId, mode: 'legacy' | 'v2') => {
    const k = `${id}:${mode}`;
    if (!parts.has(k)) parts.set(k, qaMaterial(id, mode));
    return parts.get(k)!;
  };
  const hero = (x: number, y: number, z: number): Actor =>
    ({ kind: 'heroine', x, y, visualZ: z, facing: 'down', moving: false, walkTime: 0 });

  const bar = document.createElement('div');
  bar.style.cssText = 'position:fixed;right:8px;top:8px;display:flex;gap:6px;z-index:5;font:12px system-ui';
  const btn = (label: string, on: () => void) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'padding:6px 10px;border-radius:8px;border:0;background:#fff8;touch-action:manipulation';
    b.onclick = on;
    bar.append(b);
    return b;
  };
  btn('Grade', () => (grid = !grid));
  btn('Sair da cena', () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('materiais');
    window.location.href = url.toString();
  });
  document.body.append(bar);

  const frame = (now: number) => {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }
    const pw = COLS * TILE;
    const ph = ROWS * TILE + 2 * TILE; // espaço para o título e a pilha
    const gap = TILE * 0.6;
    const zoom = Math.max(0.5, Math.min((w - 16) / (PANELS.length * pw + (PANELS.length - 1) * gap), (h - 40) / ph));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.fillStyle = '#20263a';
    ctx.fillRect(0, 0, w, h);
    const left = (w - (PANELS.length * pw + (PANELS.length - 1) * gap) * zoom) / 2;
    PANELS.forEach((p, i) => {
      const ox = left + i * (pw + gap) * zoom;
      const oy = 8 + TILE * 1.8 * zoom;
      ctx.fillStyle = '#fff';
      ctx.font = `${Math.max(11, 12 * zoom)}px system-ui`;
      ctx.fillText(p.title, ox, oy - TILE * 1.2 * zoom);
      const S = TILE * zoom;
      // Chão plano: só o topo (contrato de geometria § 6).
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const g = part(GROUND[r], p.mode);
        if (g) ctx.drawImage(g.ground, ox + c * S, oy + r * S, S, S);
      }
      // Cubos e personagens em ordem de linha (o de baixo cobre o de cima), pilha de baixo para cima.
      for (let r = 0; r < ROWS; r++) {
        for (const [c, cr, id, n] of CUBES) {
          if (cr !== r) continue;
          const q = part(id, p.mode);
          if (!q) continue;
          for (let k = 0; k < n; k++) {
            const s = q.cube;
            ctx.drawImage(s.canvas, ox + (c * TILE + s.ox) * zoom, oy + (r * TILE + s.oy - k * p.front) * zoom, s.w * zoom, s.h * zoom);
          }
        }
        if (r === 3) draw(hero(0.5, 3.6, 0), ox, oy, zoom, p.front, now); // no chão
        if (r === 5) draw(hero(2.5, 5.55, 1), ox, oy, zoom, p.front, now); // em cima do cubo de grama
      }
      if (grid) {
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        for (let c = 0; c <= COLS; c++) line(ox + c * S, oy, ox + c * S, oy + ROWS * S);
        for (let r = 0; r <= ROWS; r++) line(ox, oy + r * S, ox + COLS * S, oy + r * S);
        ctx.setLineDash([]);
        ctx.lineWidth = 2;
        // Linha de apoio (base da frente) e topo de cada pilha: o cubo de 1 nível mede 32 × (32 + frente).
        ctx.strokeStyle = '#ff5a7a';
        for (const [c, r, , n] of CUBES) {
          line(ox + c * S, oy + (r + 1) * S, ox + (c + 1) * S, oy + (r + 1) * S);
          ctx.strokeStyle = '#ffd25a';
          line(ox + c * S, oy + (r * TILE - n * p.front) * zoom, ox + (c + 1) * S, oy + (r * TILE - n * p.front) * zoom);
          ctx.strokeStyle = '#ff5a7a';
        }
      }
      ctx.fillStyle = '#cfd6ff';
      ctx.font = `${Math.max(10, 10 * zoom)}px system-ui`;
      ctx.fillText(`cubo ${TILE}×${TILE + p.front} · pilha de 3 = ${TILE + 3 * p.front} px`, ox, oy + ROWS * S + 14 * Math.max(1, zoom * 0.8));
    });
    raf = requestAnimationFrame(frame);
  };
  const line = (x0: number, y0: number, x1: number, y1: number) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  };
  const draw = (a: Actor, ox: number, oy: number, zoom: number, front: number, now: number) =>
    sprites.get(a.kind).draw(ctx, ox + a.x * TILE * zoom, oy + (a.y * TILE - a.visualZ * front) * zoom, zoom, a, now / 1000);
  raf = requestAnimationFrame(frame);
  return () => {
    cancelAnimationFrame(raf);
    bar.remove();
  };
}
