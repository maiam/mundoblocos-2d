import './titan.css';
import { titanAtlasUrl } from '../render/art/titan';
import { TitanRenderer } from '../render/titanRenderer';
import { seedFromString } from '../world/random';
import { canPlaceAt, EYE_HEIGHT, lookVector, raycast, stepBody, type Hit } from './physics';
import { defaultTitanStorage, type TitanStorage } from './save';
import { flush, openSession, type TitanSession, UnsupportedVersionError } from './session';
import { BLOCK_NAMES, PLACEABLE, T } from './voxel';

/**
 * Titã — jogo solo em primeira pessoa (ADR 0039): liga entrada (teclado/mouse/toque), laço de quadros, renderer, mira e gravação.
 * Regras de edição ficam no `TitanVolume`; física e mira em `physics.ts`; aqui só há DOM. Desktop: clique esquerdo coloca, direito remove.
 */
const AUTOSAVE_AFTER_EDIT_MS = 700;
const AUTOSAVE_PLAYER_MS = 5000;
const RETRY_MS = 3000;
const REPEAT_MS = 240;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, parent?: HTMLElement, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined) e.textContent = text;
  parent?.appendChild(e);
  return e;
};

async function loadAtlas(): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = titanAtlasUrl;
  await img.decode();
  return img;
}

export async function startTitan(canvas: HTMLCanvasElement, search: string, storage: TitanStorage = defaultTitanStorage()): Promise<void> {
  document.body.classList.add('titan');
  const ui = el('div', 'titan-ui', document.body);
  const toast = (msg: string, ms = 3500): void => {
    const t = el('div', 'titan-toast', ui, msg);
    window.setTimeout(() => t.remove(), ms);
  };

  const probe = document.createElement('canvas');
  if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) { toast('Este aparelho não oferece WebGL: o Titã não abre aqui.', 60000); return; }

  const param = new URLSearchParams(search).get('seed');
  let session: TitanSession;
  try {
    session = await openSession(storage, param ? seedFromString(param) : null, () => Math.floor(Math.random() * 2 ** 31));
  } catch (e) {
    toast(e instanceof UnsupportedVersionError ? e.message : 'Não foi possível abrir a partida salva.', 60000);
    return;
  }
  const atlas = await loadAtlas();
  const vol = session.volume;
  const view = new TitanRenderer(canvas, vol, atlas);

  // ---- HUD ----
  const cross = el('div', 'titan-cross', ui);
  const status = el('div', 'titan-status', ui);
  const seedLine = el('span', '', status);
  seedLine.innerHTML = `Titã · Margem Silenciosa · semente <b>${session.seed}</b> · gerador v${vol.gen.version}`;
  const saveLine = el('span', '', status, 'salvo');
  const posLine = el('span', '', status);
  const label = el('div', 'titan-label', ui);
  const hotbar = el('div', 'titan-hotbar', ui);
  const slots = PLACEABLE.map((id, i) => {
    const b = el('button', 'titan-slot', hotbar);
    b.type = 'button';
    b.setAttribute('aria-label', BLOCK_NAMES[id]);
    const tile = id === T.SAND ? 0 : id === T.DAMP_SAND ? 2 : id === T.DARK_ROCK ? 4 : 5;
    const S = 3, col = tile % 4, row = (tile / 4) | 0; // atlas 80 × 40 ampliado 3×: tile de 16 px = 48 px
    b.style.backgroundImage = `url(${titanAtlasUrl})`;
    b.style.backgroundSize = `${80 * S}px ${40 * S}px`;
    b.style.backgroundPosition = `-${(col * 20 + 2) * S}px -${(row * 20 + 2) * S}px`;
    el('span', '', b, String(i + 1));
    b.addEventListener('click', () => select(i));
    return b;
  });
  const menu = el('div', 'titan-menu', ui);
  const newBtn = el('button', 'titan-btn', menu, 'Nova partida');
  newBtn.type = 'button';
  let confirming = 0;
  newBtn.addEventListener('click', () => {
    if (!confirming) { newBtn.textContent = 'Confirmar? Toque de novo'; confirming = window.setTimeout(() => { confirming = 0; newBtn.textContent = 'Nova partida'; }, 4000); return; }
    clearTimeout(confirming);
    void saveNow().finally(() => {
      const u = new URL(window.location.href);
      u.searchParams.set('seed', String(Math.floor(Math.random() * 2 ** 31)));
      window.location.assign(u);
    });
  });

  function select(i: number): void {
    session.selected = ((i % PLACEABLE.length) + PLACEABLE.length) % PLACEABLE.length;
    slots.forEach((s, k) => s.setAttribute('aria-pressed', String(k === session.selected)));
    label.textContent = BLOCK_NAMES[PLACEABLE[session.selected]];
    playerDirty = true;
  }

  // ---- Início (ponteiro preso no desktop) ----
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  if (coarse) document.body.classList.add('titan-touch-on');
  const start = el('div', 'titan-start', ui);
  const box = el('div', '', start);
  el('h1', '', box, 'Titã');
  el('p', '', box, session.resumed ? 'Sua partida foi encontrada. Continue de onde parou.' : 'Uma costa de areia ocre e um lago escuro sob a névoa da tarde.');
  el('p', '', box, coarse ? 'Esquerda: andar · direita: olhar · botões: colocar, quebrar e pular.' : 'WASD anda · Espaço pula · mouse olha · clique esquerdo coloca · clique direito remove · 1–4 ou roda troca o bloco.');
  const go = el('button', 'titan-btn', box, session.resumed ? 'Continuar' : 'Começar');
  go.type = 'button';
  let playing = false;
  const begin = (): void => {
    playing = true;
    start.hidden = true;
    if (!coarse) void canvas.requestPointerLock?.();
  };
  go.addEventListener('click', begin);
  canvas.addEventListener('click', () => { if (!coarse && !document.pointerLockElement) begin(); });
  document.addEventListener('pointerlockchange', () => { if (!coarse && !document.pointerLockElement && playing) { playing = false; start.hidden = false; go.textContent = 'Continuar'; } });
  if (session.relocated) toast('A posição salva estava obstruída: você voltou a um ponto seguro.');

  // ---- Entrada ----
  const keys = new Set<string>();
  const input = { jump: false, place: false, remove: false, stickX: 0, stickY: 0 };
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code >= 'Digit1' && e.code <= 'Digit9') { const n = Number(e.code.slice(5)) - 1; if (n < PLACEABLE.length) select(n); }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());
  document.addEventListener('mousemove', (e) => { if (document.pointerLockElement) look(e.movementX * 0.0022, e.movementY * 0.0022); });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('mousedown', (e) => {
    if (!document.pointerLockElement) return;
    if (e.button === 0) { input.place = true; act('place'); }
    if (e.button === 2) { input.remove = true; act('remove'); }
  });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) input.place = false; if (e.button === 2) input.remove = false; });
  window.addEventListener('wheel', (e) => { if (document.pointerLockElement && e.deltaY) select(session.selected + (e.deltaY > 0 ? 1 : -1)); }, { passive: true });
  function look(dx: number, dy: number): void {
    session.yaw -= dx;
    session.pitch = Math.max(-1.55, Math.min(1.55, session.pitch - dy));
    playerDirty = true;
  }

  // toque (paisagem; ainda sem validação em aparelho real — NEXT_STEPS)
  const touch = el('div', 'titan-touch', ui);
  const stick = el('div', 'titan-stick', touch);
  const knob = el('i', '', stick);
  const lookPad = el('div', 'titan-look', touch);
  const acts = el('div', 'titan-acts', touch);
  const mk = (txt: string): HTMLButtonElement => { const b = el('button', 'titan-btn', acts, txt); b.type = 'button'; return b; };
  const bPlace = mk('Colocar'), bRemove = mk('Quebrar'), bJump = mk('Pular');
  const hold = (b: HTMLElement, on: () => void, off: () => void): void => {
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); on(); });
    for (const t of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) b.addEventListener(t, off);
  };
  hold(bPlace, () => { input.place = true; act('place'); }, () => { input.place = false; });
  hold(bRemove, () => { input.remove = true; act('remove'); }, () => { input.remove = false; });
  hold(bJump, () => { input.jump = true; }, () => { input.jump = false; });
  let stickId = -1;
  const moveStick = (e: PointerEvent): void => {
    const r = stick.getBoundingClientRect();
    let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const m = Math.hypot(dx, dy);
    if (m > 1) { dx /= m; dy /= m; }
    input.stickX = dx; input.stickY = dy;
    knob.style.transform = `translate(${dx * 36}px, ${dy * 36}px)`;
  };
  const endStick = (e: PointerEvent): void => { if (e.pointerId !== stickId) return; stickId = -1; input.stickX = input.stickY = 0; knob.style.transform = ''; };
  stick.addEventListener('pointerdown', (e) => { if (stickId >= 0) return; stickId = e.pointerId; stick.setPointerCapture(e.pointerId); moveStick(e); });
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) moveStick(e); });
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) stick.addEventListener(t, endStick);
  let lookId = -1, lx = 0, ly = 0;
  lookPad.addEventListener('pointerdown', (e) => { if (lookId >= 0) return; lookId = e.pointerId; lookPad.setPointerCapture(e.pointerId); lx = e.clientX; ly = e.clientY; });
  lookPad.addEventListener('pointermove', (e) => { if (e.pointerId !== lookId) return; look((e.clientX - lx) * 0.006, (e.clientY - ly) * 0.006); lx = e.clientX; ly = e.clientY; });
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) lookPad.addEventListener(t, (e) => { if ((e as PointerEvent).pointerId === lookId) lookId = -1; });

  // ---- Ações ----
  let target: Hit | null = null;
  function act(kind: 'place' | 'remove'): void {
    if (!playing || !target) return;
    if (kind === 'remove') {
      if (vol.remove(target.x, target.y, target.z)) onEdited();
    } else {
      const x = target.x + target.nx, y = target.y + target.ny, z = target.z + target.nz;
      if (canPlaceAt(vol, session.body, x, y, z) && vol.place(x, y, z, PLACEABLE[session.selected])) onEdited();
    }
  }

  // ---- Gravação ----
  let lastEdit = 0, lastPlayerSave = performance.now(), playerDirty = false, saving: Promise<void> | null = null, failed = false, retryAt = 0;
  const setSave = (txt: string, err = false): void => { saveLine.textContent = txt; saveLine.className = err ? 'err' : ''; };
  function onEdited(): void { lastEdit = performance.now(); setSave('alterações pendentes…'); }
  function saveNow(): Promise<void> {
    if (saving) return saving;
    setSave('salvando…');
    playerDirty = false; // o que se mexer durante a gravação continua pendente para a próxima
    lastPlayerSave = performance.now();
    saving = flush(storage, session).then(
      // edição feita durante a gravação não foi confirmada: continua pendente e entra na próxima gravação automática
      () => { failed = false; if (vol.hasDirty) { lastEdit = performance.now(); setSave('alterações pendentes…'); } else setSave('salvo ✓'); },
      (e) => { failed = true; playerDirty = true; retryAt = performance.now() + RETRY_MS; setSave('falha ao salvar — tentando de novo (o último estado confirmado está preservado)', true); console.error('Titã: falha ao salvar', e); },
    ).finally(() => { saving = null; });
    return saving;
  }
  const onHide = (): void => { if (vol.hasDirty || playerDirty) void saveNow(); };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') onHide(); });
  window.addEventListener('pagehide', onHide);

  select(session.selected);
  void saveNow(); // grava o cabeçalho da partida nova já na abertura (a seed passa a existir no banco)

  // ---- Laço ----
  let last = performance.now(), nextRepeat = 0;
  const frame = (now: number): void => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const b = session.body;
    if (playing) {
      let fx = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - input.stickY;
      let sx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + input.stickX;
      const m = Math.hypot(fx, sx);
      if (m > 1) { fx /= m; sx /= m; }
      // frente = (−sin yaw, −cos yaw); direita = (cos yaw, −sin yaw)
      const dirX = -Math.sin(session.yaw) * fx + Math.cos(session.yaw) * sx;
      const dirZ = -Math.cos(session.yaw) * fx - Math.sin(session.yaw) * sx;
      const moved = dirX !== 0 || dirZ !== 0;
      stepBody(vol, b, { dirX, dirZ, jump: keys.has('Space') || input.jump }, dt);
      if (moved || !b.onGround) playerDirty = true;
      if ((input.place || input.remove) && now > nextRepeat) { nextRepeat = now + REPEAT_MS; if (!target) { /* nada apontado */ } else act(input.place ? 'place' : 'remove'); }
    } else if (b.y < 200) stepBody(vol, b, { dirX: 0, dirZ: 0, jump: false }, dt); // parado: só assenta no chão
    const eye = { x: b.x, y: b.y + EYE_HEIGHT, z: b.z };
    const [dx, dy, dz] = lookVector(session.yaw, session.pitch);
    target = playing ? raycast(vol, eye.x, eye.y, eye.z, dx, dy, dz, 6) : null;
    view.render(eye, session.yaw, session.pitch, target, now / 1000);
    cross.hidden = !playing;
    posLine.textContent = `x ${b.x.toFixed(1)} · y ${b.y.toFixed(1)} · z ${b.z.toFixed(1)}`;
    // autosave: pequena espera depois de editar; posição de tempos em tempos; nova tentativa após falha
    if (!saving) {
      if (failed ? now >= retryAt : (vol.hasDirty && now - lastEdit > AUTOSAVE_AFTER_EDIT_MS) || (playerDirty && now - lastPlayerSave > AUTOSAVE_PLAYER_MS)) void saveNow();
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  if (import.meta.env.DEV) (window as unknown as { __titan: unknown }).__titan = { session, view, vol, storage, saveNow, begin, get target() { return target; } };
}
