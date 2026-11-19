import './titan.css';
import { titanAtlasUrl, titanCracksUrl, titanHotbarUrl, titanLanternAtlasUrl } from '../render/art/titan';
import { TitanRenderer } from '../render/titanRenderer';
import { seedFromString } from '../world/random';
import { breakOrCollect, placeFromSlot } from './actions';
import { breakTotalMs, DRAG_TOLERANCE_PX } from './breaking';
import { type GestureTarget, InteractionGesture } from './gesture';
import { CRAFT_SLOTS, CRAFT_START, HOTBAR, OUTPUT, SLOTS } from './inventory';
import { ITEM_NAMES } from './items';
import { LANTERN_PAD_MOUSE, LANTERN_PAD_TOUCH } from './lantern';
import { EYE_HEIGHT, lookVector, raycast, stepBody, type Hit } from './physics';
import { startPerfHud } from '../dev/perfHud';
import { TitanPerf } from './perf';
import { advanceDay, parseHora, phaseName } from './sky';
import { T } from './voxel';
import { autoEditStep, buildLanternScene, SCENE_NOTE } from './scene';
import { defaultTitanStorage, MemoryTitanStorage, type TitanStorage } from './save';
import { flush, hasPendingState, openSession, type TitanSession, UnsupportedVersionError } from './session';

/**
 * Titã — jogo solo em primeira pessoa (ADR 0039): liga entrada (teclado/mouse/toque), laço de quadros, renderer, mira e gravação.
 * Regras de edição ficam no `TitanVolume`; física e mira em `physics.ts`; aqui só há DOM. Desktop: clique esquerdo coloca, direito remove.
 */
const AUTOSAVE_AFTER_EDIT_MS = 700;
const AUTOSAVE_PLAYER_MS = 5000;
const RETRY_MS = 3000;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, parent?: HTMLElement, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined) e.textContent = text;
  parent?.appendChild(e);
  return e;
};

async function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

export async function startTitan(canvas: HTMLCanvasElement, search: string, storageArg?: TitanStorage): Promise<void> {
  const q = new URLSearchParams(search);
  // `?cena=lanternas[&n=12]`: cena de desenvolvimento para medir luz e malhas com várias lanternas — **nada é gravado** (armazenamento em memória).
  const scene = q.get('cena') === 'lanternas';
  const storage = storageArg ?? (scene ? new MemoryTitanStorage() : defaultTitanStorage());
  // `?fps=1`: painel de desempenho (FPS, GPU, memória) com o tempo de cada etapa do Titã: luz, malha, geometria, desenho.
  const perf = q.get('fps') === '1' || scene ? new TitanPerf() : null;
  document.body.classList.add('titan');
  const ui = el('div', 'titan-ui', document.body);
  const toast = (msg: string, ms = 3500): void => {
    const t = el('div', 'titan-toast', ui, msg);
    window.setTimeout(() => t.remove(), ms);
  };

  const probe = document.createElement('canvas');
  if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) { toast('Este aparelho não oferece WebGL: o Titã não abre aqui.', 60000); return; }

  const param = q.get('seed') ?? (scene ? '42' : null);
  let session: TitanSession;
  try {
    session = await openSession(storage, param ? seedFromString(param) : null, () => Math.floor(Math.random() * 2 ** 31));
  } catch (e) {
    toast(e instanceof UnsupportedVersionError ? e.message : 'Não foi possível abrir a partida salva.', 60000);
    return;
  }
  const [atlas, hotbarAtlas, cracksAtlas, lanternAtlas] = await Promise.all([loadImage(titanAtlasUrl), loadImage(titanHotbarUrl), loadImage(titanCracksUrl), loadImage(titanLanternAtlasUrl)]);
  const vol = session.volume;
  const inv = session.inventory;
  const spots = scene ? buildLanternScene(session, Math.max(1, Math.min(64, Number(q.get('n')) || 12))) : [];
  if (perf) { perf.count('lanterns', spots.length); vol.onLightMs = (ms) => perf.record('light', ms); }
  // `?hora=manha|tarde|noite`: congela só a visualização (teste); a hora do jogo continua correndo e é a que vai no save
  const forcedHour = parseHora(q.get('hora'));
  const view = new TitanRenderer(canvas, vol, atlas, hotbarAtlas, cracksAtlas, lanternAtlas, perf);
  view.setSky(forcedHour ?? session.time);
  view.setItems(session.items.remaining());
  if (perf) startPerfHud(() => view.gpuStats(), () => ({ samples: perf.samples('draw'), count: perf.samples('draw').length }), {
    line: () => perf.line(),
    lines: () => [...(scene ? [`cena: ${spots.length} lanternas${autoEdit ? ' · editando sem parar' : ''}`] : []), ...perf.reportLines()],
    report: () => ({ cena: scene ? 'lanternas' : null, lanternas: spots.length, ...perf.report() }),
    style: { top: '64px', whiteSpace: 'normal', maxWidth: 'min(70vw, 560px)' },
  });

  // ---- HUD ----
  const cross = el('div', 'titan-cross', ui);
  const status = el('div', 'titan-status', ui);
  const seedLine = el('span', '', status);
  seedLine.innerHTML = `Titã · Margem Silenciosa · semente <b>${session.seed}</b> · gerador v${vol.gen.version}`;
  const saveLine = el('span', '', status, scene ? SCENE_NOTE : 'salvo');
  const posLine = el('span', '', status);
  const skyLine = el('span', '', status);
  const label = el('div', 'titan-label', ui);
  const hotbar = el('div', 'titan-hotbar', ui);
  /** Espaço da interface: ícone do atlas da hotbar (por id do item), quantidade e tecla. */
  const mkSlot = (parent: HTMLElement, index: number, key?: string): HTMLButtonElement => {
    const b = el('button', 'titan-slot', parent);
    b.type = 'button';
    b.dataset.slot = String(index);
    if (key) el('span', 'key', b, key);
    el('i', 'titan-icon', b);
    el('em', 'count', b);
    b.addEventListener('click', () => tapSlot(index));
    return b;
  };
  const hotSlots = Array.from({ length: HOTBAR }, (_, i) => mkSlot(hotbar, i, String(i + 1)));

  // ---- Mochila: 24 espaços (4 fileiras de 6), fabricação 2 × 2, receita ----
  const panel = el('div', 'titan-panel', ui);
  panel.hidden = true;
  const head = el('div', 'titan-panelhead', panel);
  el('b', '', head, 'Mochila');
  const closeBtn = el('button', 'titan-btn', head, 'Fechar');
  closeBtn.type = 'button';
  const body = el('div', 'titan-panelbody', panel);
  const bagGrid = el('div', 'titan-bag', body);
  const bagSlots = Array.from({ length: SLOTS - HOTBAR }, (_, i) => mkSlot(bagGrid, HOTBAR + i));
  const craftBox = el('div', 'titan-craft', body);
  el('small', '', craftBox, 'Fabricação');
  const craftRow = el('div', 'titan-craftrow', craftBox);
  const craftGrid = el('div', 'titan-craftgrid', craftRow);
  const craftSlots = Array.from({ length: CRAFT_SLOTS }, (_, i) => mkSlot(craftGrid, CRAFT_START + i));
  el('span', 'arrow', craftRow, '→');
  const outSlot = mkSlot(craftRow, OUTPUT);
  outSlot.classList.add('out');
  const recipeBtn = el('button', 'titan-btn', craftBox, 'Receita da lanterna');
  recipeBtn.type = 'button';
  el('small', 'hint', craftBox, 'Cápsula + fragmento de rocha + fragmento de gelo, em qualquer posição.');
  let bagOpen = false;
  let sel: number | null = null; // espaço escolhido para mover (destaque azul-gelo)

  /** Redesenha todos os espaços a partir do inventário (é barato: 36 espaços). */
  function refresh(): void {
    const draw = (b: HTMLButtonElement, i: number, forced?: { item: number; count: number } | null): void => {
      const st = forced === undefined ? inv.get(i) : forced;
      const icon = b.querySelector('i') as HTMLElement;
      const count = b.querySelector('em') as HTMLElement;
      b.classList.toggle('empty', !st);
      if (st) {
        const idx = st.item - 1, col = idx % 4, row = (idx / 4) | 0;
        icon.style.backgroundImage = `url(${titanHotbarUrl})`;
        icon.style.backgroundPosition = `calc(-${col * 16}px * var(--s)) calc(-${row * 16}px * var(--s))`;
        icon.style.visibility = 'visible';
        count.textContent = st.count > 1 ? String(st.count) : '';
        b.setAttribute('aria-label', `${ITEM_NAMES[st.item]}${st.count > 1 ? ` × ${st.count}` : ''}`);
      } else { icon.style.visibility = 'hidden'; count.textContent = ''; b.setAttribute('aria-label', 'vazio'); }
      b.dataset.sel = String(sel === i);
    };
    hotSlots.forEach((b, i) => { draw(b, i); b.setAttribute('aria-pressed', String(i === session.selected)); });
    bagSlots.forEach((b, i) => draw(b, HOTBAR + i));
    craftSlots.forEach((b, i) => draw(b, CRAFT_START + i));
    const r = inv.craftResult();
    draw(outSlot, OUTPUT, r ? { item: r, count: 1 } : null);
    const held = inv.get(session.selected);
    label.textContent = held ? ITEM_NAMES[held.item] : '';
  }

  function tapSlot(i: number): void {
    if (i === OUTPUT) {
      if (!inv.takeResult()) notice(inv.craftResult() ? 'Mochila cheia' : 'Monte a receita primeiro');
      refresh();
      return;
    }
    if (!bagOpen) { if (i < HOTBAR) select(i); return; }
    if (sel === null) { if (inv.get(i)) sel = i; }
    else if (sel === i) sel = null;
    else { if (!inv.move(sel, i)) notice('Não dá para mover para lá'); sel = null; }
    refresh();
  }
  recipeBtn.addEventListener('click', () => { if (!inv.fillRecipe()) notice('Falta algum ingrediente, ou a grade não está vazia'); refresh(); });

  function toggleBag(open: boolean): void {
    if (open === bagOpen) return;
    bagOpen = open;
    panel.hidden = !open;
    sel = null;
    if (open) { if (document.pointerLockElement) document.exitPointerLock(); gesture.cancel(); keys.clear(); }
    else {
      if (!inv.returnCraft()) notice('Sem espaço: os itens ficam na grade');
      if (!coarse) void canvas.requestPointerLock?.();
    }
    refresh();
  }
  closeBtn.addEventListener('click', () => toggleBag(false));
  const menu = el('div', 'titan-menu', ui);
  let autoEdit = false;
  if (scene) {
    const ae = el('button', 'titan-btn', menu, 'Editar sem parar: desligado');
    ae.type = 'button';
    ae.addEventListener('click', () => { autoEdit = !autoEdit; ae.textContent = `Editar sem parar: ${autoEdit ? 'ligado' : 'desligado'}`; });
  }
  const newBtn = el('button', 'titan-btn', menu, 'Nova partida');
  if (scene) newBtn.hidden = true;
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
    session.selected = ((i % HOTBAR) + HOTBAR) % HOTBAR;
    playerDirty = true;
    refresh();
  }

  let lastNotice = '', lastNoticeAt = 0;
  function notice(msg: string): void {
    const now = performance.now();
    if (msg === lastNotice && now - lastNoticeAt < 1500) return;
    lastNotice = msg; lastNoticeAt = now;
    toast(msg, 1800);
  }

  // ---- Início (ponteiro preso no desktop) ----
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  if (coarse) document.body.classList.add('titan-touch-on');
  const start = el('div', 'titan-start', ui);
  const box = el('div', '', start);
  el('h1', '', box, 'Titã');
  el('p', '', box, session.resumed ? 'Sua partida foi encontrada. Continue de onde parou.' : 'Uma costa de areia ocre e um lago escuro sob a névoa da tarde.');
  el('p', '', box, coarse ? 'Esquerda: andar · direita: toque curto coloca, segurar quebra, arrastar gira a câmera · botões: pular e mochila.' : 'WASD anda · Espaço pula · mouse olha · clique curto coloca, segurar quebra · 1–7 ou roda troca o bloco · E abre a mochila.');
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
  document.addEventListener('pointerlockchange', () => { if (!coarse && !document.pointerLockElement && playing && !bagOpen) { playing = false; start.hidden = false; go.textContent = 'Continuar'; } });
  if (session.relocated) toast('A posição salva estava obstruída: você voltou a um ponto seguro.');

  // ---- Entrada ----
  const keys = new Set<string>();
  const input = { jump: false, stickX: 0, stickY: 0 };
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code >= 'Digit1' && e.code <= 'Digit9') { const n = Number(e.code.slice(5)) - 1; if (n < HOTBAR) select(n); }
    if (e.code === 'KeyE' && playing) toggleBag(!bagOpen);
    if (e.code === 'Escape' && bagOpen) toggleBag(false);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); gesture.cancel(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') gesture.cancel(); });
  // mouse capturado: clique primário curto coloca, segurar quebra (ADR 0042); o movimento relativo da mira conta como arrasto; o botão direito não faz nada
  let mouseAcc = 0;
  document.addEventListener('mousemove', (e) => {
    if (!document.pointerLockElement) return;
    look(e.movementX * 0.0022, e.movementY * 0.0022);
    if (gesture.activePointer === 'mouse') { mouseAcc += Math.hypot(e.movementX, e.movementY); gesture.drag('mouse', mouseAcc); }
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('mousedown', (e) => {
    if (!document.pointerLockElement || bagOpen || e.button !== 0) return;
    mouseAcc = 0;
    gesture.press('mouse', e.timeStamp, toTarget(target)); // o tempo vem do evento (monotônico), não do quadro
  });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) gesture.release('mouse', e.timeStamp, toTarget(target)); });
  window.addEventListener('wheel', (e) => { if (document.pointerLockElement && !bagOpen && e.deltaY) select(session.selected + (e.deltaY > 0 ? 1 : -1)); }, { passive: true });
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
  // Colocar e quebrar não têm mais botões: a área de interação (metade direita) coloca ao tocar e quebra ao segurar; arrastar gira a câmera
  const mk = (txt: string): HTMLButtonElement => { const b = el('button', 'titan-btn', acts, txt); b.type = 'button'; return b; };
  const bJump = mk('Pular'), bBag = mk('Mochila');
  bBag.addEventListener('click', () => toggleBag(!bagOpen));
  const hold = (b: HTMLElement, on: () => void, off: () => void): void => {
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); on(); });
    for (const t of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) b.addEventListener(t, off);
  };
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
  // área de interação do toque (metade direita): toque curto coloca, segurar quebra, arrastar gira a câmera (zona morta de 10 px: sem girar enquanto ainda pode ser toque)
  let lookId = -1, lx = 0, ly = 0, sx = 0, sy = 0, exceeded = false;
  lookPad.addEventListener('pointerdown', (e) => {
    if (lookId >= 0 || !playing || bagOpen) return; // um segundo dedo na área não arma nada
    lookId = e.pointerId; lookPad.setPointerCapture(e.pointerId);
    lx = sx = e.clientX; ly = sy = e.clientY;
    gesture.press(e.pointerId, e.timeStamp, toTarget(target));
    exceeded = gesture.state === 'CAMERA_DRAG'; // sem alvo na mira o gesto é só câmera, sem zona morta
  });
  lookPad.addEventListener('pointermove', (e) => {
    if (e.pointerId !== lookId) return;
    const dist = Math.hypot(e.clientX - sx, e.clientY - sy);
    gesture.drag(e.pointerId, dist);
    if (!exceeded && dist > DRAG_TOLERANCE_PX) { exceeded = true; lx = e.clientX; ly = e.clientY; } // a câmera passa a girar daqui, sem salto
    if (exceeded) look((e.clientX - lx) * 0.006, (e.clientY - ly) * 0.006);
    lx = e.clientX; ly = e.clientY;
  });
  lookPad.addEventListener('pointerup', (e) => { if (e.pointerId !== lookId) return; lookId = -1; gesture.release(e.pointerId, e.timeStamp, toTarget(target)); });
  // ponteiro cancelado ou captura perdida: limpa o gesto sem agir
  for (const t of ['pointercancel', 'lostpointercapture'] as const) lookPad.addEventListener(t, (e) => { if ((e as PointerEvent).pointerId === lookId) { lookId = -1; gesture.cancel(); } });

  // ---- Ações: gesto primário (ADR 0042) ----
  let target: Hit | null = null;
  const toTarget = (h: Hit | null): GestureTarget | null => {
    if (!h) return null;
    if (h.item) return { x: h.x, y: h.y, z: h.z, nx: h.nx, ny: h.ny, nz: h.nz, kind: 'shard', item: h.item };
    const id = vol.get(h.x, h.y, h.z);
    return { x: h.x, y: h.y, z: h.z, nx: h.nx, ny: h.ny, nz: h.nz, kind: id === T.LANTERN ? 'lantern' : 'block', block: id };
  };
  const ring = el('div', 'titan-collect', ui); // indicador discreto de recolhimento (lanterna e lasca): anel em volta da mira
  ring.hidden = true;
  const gesture = new InteractionGesture({
    totalMs: (t) => breakTotalMs(t.kind, t.block),
    // as ações validam espaço antes de mudar mundo e inventário (tudo ou nada); mundo e inventário saem juntos no próximo save
    place: (t) => { const r = placeFromSlot(session, t, session.selected); if (r.msg) notice(r.msg); if (r.ok) { onEdited(); refresh(); } return { ok: r.ok }; },
    complete: (t) => {
      const r = breakOrCollect(session, t);
      if (r.msg) notice(r.msg);
      if (r.ok) { if (t.item) view.setItems(session.items.remaining()); onEdited(); refresh(); }
      return { ok: r.ok };
    },
    effect: (t, p, stage) => {
      if (!t) { view.setCrack(null); ring.hidden = true; return; }
      if (t.kind === 'block') { view.setCrack(t, stage); ring.hidden = true; } // rachaduras progressivas só em blocos; sem refazer malha
      else { view.setCrack(null); ring.hidden = false; ring.style.setProperty('--p', String(p)); }
    },
  });

  // ---- Gravação ----
  let lastSavedTime = session.time;
  let lastEdit = 0, lastPlayerSave = performance.now(), playerDirty = false, saving: Promise<void> | null = null, failed = false, retryAt = 0;
  const setSave = (txt: string, err = false): void => { saveLine.textContent = txt; saveLine.className = err ? 'err' : ''; };
  function onEdited(): void { lastEdit = performance.now(); setSave('alterações pendentes…'); }
  function saveNow(): Promise<void> {
    if (saving) return saving;
    setSave('salvando…');
    playerDirty = false; // o que se mexer durante a gravação continua pendente para a próxima
    lastPlayerSave = performance.now();
    lastSavedTime = session.time;
    saving = flush(storage, session).then(
      // edição feita durante a gravação não foi confirmada: continua pendente e entra na próxima gravação automática
      () => { failed = false; if (vol.hasDirty || hasPendingState(session)) { lastEdit = performance.now(); setSave('alterações pendentes…'); } else setSave('salvo ✓'); },
      (e) => { failed = true; playerDirty = true; retryAt = performance.now() + RETRY_MS; setSave('falha ao salvar — tentando de novo (o último estado confirmado está preservado)', true); console.error('Titã: falha ao salvar', e); },
    ).finally(() => { saving = null; });
    return saving;
  }
  const onHide = (): void => { if (vol.hasDirty || hasPendingState(session) || playerDirty) void saveNow(); };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') onHide(); });
  window.addEventListener('pagehide', onHide);

  select(session.selected);
  void saveNow(); // grava o cabeçalho da partida nova já na abertura (a seed passa a existir no banco)

  // ---- Laço ----
  let last = performance.now(), nextAuto = 0, autoStep = 0;
  const frame = (now: number): void => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const b = session.body;
    const active = playing && !bagOpen;
    if (active) {
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
    } else if (b.y < 200) stepBody(vol, b, { dirX: 0, dirZ: 0, jump: false }, dt); // parado: só assenta no chão
    // relógio do dia: só corre com o jogo ativo (a aba oculta para os quadros; a tela de pausa também para a hora); a hora forçada só muda a visualização
    if (playing) {
      session.time = advanceDay(session.time, dt);
      if (((session.time - lastSavedTime + 1) % 1) > 0.01) playerDirty = true; // ~12 s de jogo (1/100 do dia de 20 min): grava a hora junto da posição
    }
    view.setSky(forcedHour ?? session.time);
    skyLine.textContent = forcedHour !== null ? `hora fixa: ${phaseName(forcedHour)} (teste, não é gravada)` : phaseName(session.time);
    if (autoEdit && now > nextAuto) { nextAuto = now + 120; autoEditStep(session, spots, autoStep++); } // estresse de luz + malha (só na cena de teste)
    const eye = { x: b.x, y: b.y + EYE_HEIGHT, z: b.z };
    const [dx, dy, dz] = lookVector(session.yaw, session.pitch);
    target = active ? raycast(vol, eye.x, eye.y, eye.z, dx, dy, dz, 6, session.items, coarse ? LANTERN_PAD_TOUCH : LANTERN_PAD_MOUSE) : null;
    if (active) gesture.update(now, toTarget(target)); else gesture.cancel(); // mochila aberta ou pausa: o gesto em andamento é cancelado
    view.render(eye, session.yaw, session.pitch, target, now / 1000);
    cross.hidden = !active;
    posLine.textContent = `x ${b.x.toFixed(1)} · y ${b.y.toFixed(1)} · z ${b.z.toFixed(1)}`;
    // autosave: pequena espera depois de editar; posição de tempos em tempos; nova tentativa após falha
    if (!saving) {
      if (failed ? now >= retryAt : ((vol.hasDirty || hasPendingState(session)) && now - lastEdit > AUTOSAVE_AFTER_EDIT_MS) || (playerDirty && now - lastPlayerSave > AUTOSAVE_PLAYER_MS)) void saveNow();
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  if (import.meta.env.DEV) (window as unknown as { __titan: unknown }).__titan = { session, view, vol, storage, saveNow, begin, toggleBag, refresh, perf, gesture, get target() { return target; } };
}
