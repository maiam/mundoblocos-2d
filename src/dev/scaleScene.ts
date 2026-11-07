import { CHUNK_SIZE, LOAD_MARGIN, TILE } from '../config';
import type { Actor } from '../game/entities';
import { Camera } from '../game/camera';
import { Player } from '../game/player';
import { actorHeight, CHARACTER_H } from '../render/character';
import { Renderer } from '../render/renderer';
import { Block } from '../world/blocks';
import { townSolid } from '../world/town';
import { WORLD_PROFILES, type WorldProfile } from '../world/profiles';
import { World } from '../world/world';
import { SCALE_ACTORS, SCALE_OBJECTS, scaleBounds } from './scaleLayout';

/**
 * Cena de escala (ADR 0022) — SÓ em desenvolvimento (`?escala=1`, carregada por `import()` protegido por
 * `import.meta.env.DEV`): o renderizador, os sprites e as escalas reais do jogo, numa fila de comparação sobre a grade.
 * Nada aqui desenha ou posiciona por conta própria: ator = `Actor` comum, objeto = bloco colocado no `World`. Só as
 * marcações de depuração (grade, âncoras, células bloqueadas, alturas) são desenhadas por cima.
 *
 * Reproduzível: seed, câmera, hora do dia, relógio de animação e `Math.random` fixos (a captura é sempre a mesma).
 * Teclas: G grade · A âncoras · B células bloqueadas e colisão · L nomes e alturas · + / − zoom · setas movem.
 */

const SEED = 20261107;
/** Hora do dia sem tinta (dia claro, ver `render/daycycle.ts`). */
const TIME = 0.5;
/** Quadro fixo da caminhada (parado). */
const ELAPSED = 0;
/** Quantas células a fila fica abaixo do portão da cidade: depois do fim da estrada de terra, num gramado limpo. */
const BELOW_GATE = 14;

/** Gerador pseudoaleatório fixo no lugar de `Math.random` (partículas do bioma): a captura não varia. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** Terreno plano de grama com a cidade (a mesma de sempre) ao norte: o resto do mapa é um gramado limpo. */
const profile = (): WorldProfile => ({
  ...WORLD_PROFILES.principal,
  terrain: { kind: 'flat', ground: Block.GRASS },
  dungeon: false,
  sheep: false,
  hunger: false,
  minimap: false,
});

export interface ScaleScene {
  /** true quando o chão da fila já foi todo desenhado (as capturas esperam por isso). */
  readonly ready: () => boolean;
  destroy(): void;
}

export function startScaleScene(canvas: HTMLCanvasElement): ScaleScene {
  Math.random = seeded(SEED);
  const world = new World(SEED, profile());
  const [gx, gy] = world.outsideGate();
  const { cols, rows } = scaleBounds();
  const ox = Math.round(gx - cols / 2);
  const oy = gy + BELOW_GATE;

  // Objetos do mundo: colocados no mapa como o jogo faz (lotes de várias células com `TOWN_PART`; só as fileiras
  // bloqueadas da frente — `townSolid` —, o quintal de trás da casa continua andável).
  for (const o of SCALE_OBJECTS) {
    const w = o.w ?? 1;
    const d = Math.min(o.d ?? 1, townSolid(o.block));
    for (let j = 0; j < d; j++) {
      for (let i = 0; i < w; i++) world.setObject(ox + o.col + i, oy + o.row - j, i === 0 && j === 0 ? o.block : Block.TOWN_PART);
    }
  }

  const actors: Actor[] = SCALE_ACTORS.map((a) => ({
    kind: a.kind, x: ox + a.col + 0.5, y: oy + a.row + 0.5, visualZ: 0, facing: 'down', moving: false, walkTime: 0,
  }));
  const player = new Player(ox + 0.5, oy + 0.5);
  const renderer = new Renderer(canvas, world);
  const camera = new Camera();
  const ctx = canvas.getContext('2d')!;

  const flags = { grid: true, anchors: true, blocked: true, labels: true };
  const resize = (): void => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    camera.resize(canvas.clientWidth, canvas.clientHeight);
  };
  resize();
  // A fila toda na tela: o zoom base do jogo (~10 células na vertical) é para o jogador, aqui cabe a fila inteira.
  const fit = (): void => {
    camera.zoomMul = 1;
    camera.resize(canvas.clientWidth, canvas.clientHeight);
    camera.zoom = Math.min(canvas.clientWidth / ((cols + 2) * TILE), canvas.clientHeight / ((rows + 4) * TILE));
  };
  fit();
  camera.x = (ox + cols / 2) * TILE;
  camera.y = (oy + rows / 2) * TILE;
  let frames = 0;
  let stable = 0;

  const key = (e: KeyboardEvent): void => {
    const k = e.key.toLowerCase();
    if (k === 'g') flags.grid = !flags.grid;
    else if (k === 'a') flags.anchors = !flags.anchors;
    else if (k === 'b') flags.blocked = !flags.blocked;
    else if (k === 'l') flags.labels = !flags.labels;
    else if (k === '+' || k === '=') camera.zoom *= 1.15;
    else if (k === '-') camera.zoom /= 1.15;
    else if (k === '0') { fit(); camera.x = (ox + cols / 2) * TILE; camera.y = (oy + rows / 2) * TILE; }
    else if (k === 'arrowleft') camera.x -= TILE;
    else if (k === 'arrowright') camera.x += TILE;
    else if (k === 'arrowup') camera.y -= TILE;
    else if (k === 'arrowdown') camera.y += TILE;
  };
  window.addEventListener('keydown', key);
  const onResize = (): void => { resize(); fit(); };
  window.addEventListener('resize', onResize);

  let raf = 0;
  const loop = (): void => {
    world.ensureChunks(camera.visibleChunks(LOAD_MARGIN), 8);
    renderer.draw(camera, {
      player, actors, showChunkBorders: false, hover: null, breaking: null, drops: [], focus: null, hoverSheep: null,
      hurtFlash: 0, inDungeon: false, entrance: null, time: TIME, elapsed: ELAPSED, dt: 0,
    });
    overlay();
    frames++;
    stable = frames > 8 ? stable + 1 : 0;
    raf = requestAnimationFrame(loop);
  };

  const sx = (wx: number): number => camera.worldToScreenX(wx * TILE);
  const sy = (wy: number): number => camera.worldToScreenY(wy * TILE);

  /** Marcações de depuração por cima do quadro real (nada disso existe no jogo normal). */
  function overlay(): void {
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const [wx0, wy0] = camera.screenToWorld(0, 0);
    const [wx1, wy1] = camera.screenToWorld(camera.width, camera.height);
    const x0 = Math.floor(wx0 / TILE);
    const x1 = Math.ceil(wx1 / TILE);
    const y0 = Math.floor(wy0 / TILE);
    const y1 = Math.ceil(wy1 / TILE);
    if (flags.blocked) {
      // Célula bloqueada = não andável (cubos, árvores, objetos, `TOWN_PART`); a colisão vem do mapa, não da imagem.
      ctx.fillStyle = 'rgba(255, 60, 60, 0.38)';
      ctx.strokeStyle = 'rgba(255, 60, 60, 0.9)';
      ctx.lineWidth = 1.5;
      for (let y = oy; y < oy + rows; y++) {
        for (let x = ox; x < ox + cols; x++) {
          if (world.isWalkable(x, y)) continue;
          ctx.fillRect(sx(x), sy(y), camera.zoom * TILE, camera.zoom * TILE);
          ctx.strokeRect(sx(x), sy(y), camera.zoom * TILE, camera.zoom * TILE);
        }
      }
    }
    if (flags.grid) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.beginPath();
      for (let x = x0; x <= x1; x++) { ctx.moveTo(sx(x), 0); ctx.lineTo(sx(x), camera.height); }
      for (let y = y0; y <= y1; y++) { ctx.moveTo(0, sy(y)); ctx.lineTo(camera.width, sy(y)); }
      ctx.stroke();
      // Uma altura de personagem (2,2 células) ao lado da fila, para a régua visual.
      const rx = sx(ox - 0.7);
      ctx.strokeStyle = '#ffd34d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rx, sy(oy + 0.5));
      ctx.lineTo(rx, sy(oy + 0.5) - CHARACTER_H * camera.zoom);
      ctx.stroke();
    }
    ctx.font = `700 ${Math.max(9, Math.round(camera.zoom * 7))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    for (const a of actors) {
      const h = actorHeight(a.kind) * camera.zoom;
      if (flags.blocked && a.kind === 'heroine') {
        // Caixa de colisão de quem anda (`Walker`: meia-largura × meia-profundidade em células).
        ctx.strokeStyle = '#7dffb0';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx(a.x - player.spec.halfW), sy(a.y - player.spec.halfD), 2 * player.spec.halfW * camera.zoom * TILE, 2 * player.spec.halfD * camera.zoom * TILE);
      }
      if (flags.anchors) {
        ctx.fillStyle = '#ff2d55';
        ctx.beginPath();
        ctx.arc(sx(a.x), sy(a.y), Math.max(2.5, camera.zoom * 1.6), 0, Math.PI * 2);
        ctx.fill();
        // Altura desenhada: traço no topo do desenho.
        ctx.strokeStyle = '#4dd2ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx(a.x) - 7 * camera.zoom, sy(a.y) - h);
        ctx.lineTo(sx(a.x) + 7 * camera.zoom, sy(a.y) - h);
        ctx.stroke();
      }
    }
    if (flags.labels) {
      for (const [i, a] of SCALE_ACTORS.entries()) {
        const text = `${a.label} ${(actorHeight(actors[i].kind) / TILE).toFixed(2).replace('.', ',')}`;
        label(text, sx(actors[i].x), sy(actors[i].y) + 11 * camera.zoom);
      }
      for (const o of SCALE_OBJECTS) {
        label(o.label, sx(ox + o.col + (o.w ?? 1) / 2), sy(oy + o.row + 1) + 11 * camera.zoom);
      }
    }
    if (flags.anchors) {
      // Âncora dos objetos: o canto inferior esquerdo da célula principal.
      ctx.fillStyle = '#ff2d55';
      for (const o of SCALE_OBJECTS) {
        ctx.beginPath();
        ctx.arc(sx(ox + o.col), sy(oy + o.row + 1), Math.max(2.5, camera.zoom * 1.6), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function label(text: string, x: number, y: number): void {
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(20, 16, 50, 0.9)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = '#fff';
    ctx.fillText(text, x, y);
  }

  loop();
  (window as unknown as { __scale: unknown }).__scale = { world, camera, actors, chunk: CHUNK_SIZE };
  return {
    ready: () => stable > 10,
    destroy: () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', key);
      window.removeEventListener('resize', onResize);
    },
  };
}
