import { CUBE_FRONT, TILE } from '../config';
import type { Actor } from '../game/entities';
import { Block, type BlockId } from '../world/blocks';
import { ActorSprites } from '../render/character';
import { type CubeView, cubeEdges } from '../render/materialsV2';
import { cubeSpriteV2, drawCubeParts, qaMaterial, type Sprite } from '../render/textures';

/**
 * Cena dos materiais V2 (`?materiais=1`, só em desenvolvimento; ADR 0023): dois painéis lado a lado com as mesmas peças —
 * atlas legado e materiais V2 — para conferir cada material migrado no jogo, não na arte solta (a comparação de frente
 * 16 × 18 já foi decidida: 18). Cada painel tem chão plano (só topo), um platô de cubos de materiais diferentes, um
 * degrau, pilhas (inclusive de materiais misturados), a heroína no chão e em cima de um cubo, e (tecla/botão Grade) a
 * grade das células com a linha de apoio. No painel V2 os cubos formam uma massa: sem risco entre eles (ADR 0023). Desenha por conta própria (os dois atlas lado a lado); para escala
 * de sprites no renderizador real há a cena `?escala=1` (ADR 0022; já mostra a arte V2, que é o padrão).
 */
const COLS = 6;
const ROWS = 7;
const PANELS: Array<{ title: string; mode: 'legacy' | 'v2'; front: number }> = [
  { title: 'Atlas legado', mode: 'legacy', front: CUBE_FRONT },
  { title: 'Materiais V2', mode: 'v2', front: CUBE_FRONT },
];
/** Chão do painel: linhas de cima em grama, depois terra arada, caminho, areia e pedra (encontros retos: sem transição ainda — Etapa 3). */
const GROUND: BlockId[] = [Block.GRASS, Block.GRASS, Block.GRASS, Block.TILLED, Block.PATH, Block.SAND, Block.STONE];
/** Última linha: as cinco pedras do jogo lado a lado (chão plano contínuo; Bruta, Tijolo, Chão, Lisa, Polida). */
const STONE_ROW: BlockId[] = [Block.STONE, Block.STONE_BRICK, Block.STONE_FLOOR, Block.STONE_SMOOTH, Block.STONE_POLISHED, Block.STONE_BRICK];
/** Cubos: [coluna, linha, blocos de baixo para cima]. */
const CUBES: Array<[number, number, BlockId[]]> = [
  [1, 1, [Block.SAND]], [2, 1, [Block.STONE_BRICK]], [3, 1, [Block.STONE_FLOOR]], [4, 1, [Block.STONE_SMOOTH]], // platô de 4×2, materiais misturados
  [1, 2, [Block.OAK_PLANKS]], [2, 2, [Block.STONE_POLISHED]], [3, 2, [Block.STONE]], [4, 2, [Block.STONE_BRICK]],
  [5, 2, [Block.GRASS, Block.GRASS]], // degrau ao lado do platô
  [0, 4, [Block.OAK_LOG, Block.OAK_LOG]], [1, 4, [Block.OAK_PLANKS, Block.OAK_LOG]], // pilhas de madeira (tora e tábuas)
  [4, 4, [Block.GRASS, Block.GRASS, Block.GRASS]], [5, 4, [Block.GRASS, Block.GRASS, Block.GRASS]],
  [2, 5, [Block.GRASS]], // o cubo onde a heroína sobe
  [1, 3, [Block.PATH]], [2, 3, [Block.TILLED]], [3, 3, [Block.TILLED]], // prolongam o platô: frente de terra com franja
];
/** Mapa do layout para as bordas do cubo V2 (mesma lógica do jogo, `cubeEdges`). */
const VIEW: CubeView = {
  height: (x, y) => CUBES.find((c) => c[0] === x && c[1] === y)?.[2].length ?? 0,
  v2: (x, y, level) => !!CUBES.find((c) => c[0] === x && c[1] === y)?.[2][level],
};

export function showMaterialsScene(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d')!;
  const sprites = new ActorSprites();
  let grid = false;
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
        const g = part(r === ROWS - 1 ? STONE_ROW[c] : GROUND[r], p.mode);
        if (g) ctx.drawImage(g.ground, ox + c * S, oy + r * S, S, S);
      }
      // Cubos e personagens em ordem de linha (o de baixo cobre o de cima), pilha de baixo para cima.
      for (let r = 0; r < ROWS; r++) {
        for (const [c, cr, ids] of CUBES) {
          if (cr !== r) continue;
          ids.forEach((id, k) => {
            // V2: cubo da massa (bordas pelos vizinhos); legado: cubo inteiro de cada vez.
            const s = p.mode === 'v2' ? cubeSpriteV2(id, k, cubeEdges(VIEW, c, cr, k)) : part(id, 'legacy')?.cube;
            if (!s) return;
            // Bordas arredondadas juntas (como no jogo): sem fresta entre cubos em qualquer zoom.
            const x0 = Math.round(ox + c * S), x1 = Math.round(ox + (c + 1) * S);
            const wy = r * TILE + s.oy - k * p.front;
            const rowY = (v: number) => Math.round(oy + v * zoom);
            drawCubeParts(ctx, s, x0, x1, rowY(wy), rowY(wy + TILE), rowY(wy + s.h));
          });
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
        for (const [c, r, ids] of CUBES) {
          const n = ids.length;
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
