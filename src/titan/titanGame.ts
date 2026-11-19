import './titan.css';
import { titanAtlasUrl, titanCracksUrl, titanHotbarUrl, titanLanternAtlasUrl, titanReedUrl, titanWorkbenchAtlasUrl } from '../render/art/titan';
import { TitanRenderer } from '../render/titanRenderer';
import { seedFromString } from '../world/random';
import { breakOrCollect, collectNearby, placeFromSlot } from './actions';
import { blockedReason, CRAFT_MESSAGES, craft, GROUP_NAMES, ingredientStatus, RECIPES, STATION_NAMES, type Group, type Recipe, type Station } from './recipes';
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
import { flush, hasPendingState, openSession, type TitanSession, UnsupportedVersionError, visibleItems, discoverRecipes, standingReeds } from './session';

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
  const [atlas, hotbarAtlas, cracksAtlas, lanternAtlas, workbenchAtlas, reedImg] = await Promise.all([loadImage(titanAtlasUrl), loadImage(titanHotbarUrl), loadImage(titanCracksUrl), loadImage(titanLanternAtlasUrl), loadImage(titanWorkbenchAtlasUrl), loadImage(titanReedUrl)]);
  const vol = session.volume;
  const inv = session.inventory;
  const spots = scene ? buildLanternScene(session, Math.max(1, Math.min(64, Number(q.get('n')) || 12))) : [];
  if (perf) { perf.count('lanterns', spots.length); vol.onLightMs = (ms) => perf.record('light', ms); }
  // `?hora=manha|tarde|noite`: congela só a visualização (teste); a hora do jogo continua correndo e é a que vai no save
  const forcedHour = parseHora(q.get('hora'));
  const view = new TitanRenderer(canvas, vol, atlas, hotbarAtlas, cracksAtlas, lanternAtlas, { workbenchAtlas, reed: reedImg }, perf);
  view.setSky(forcedHour ?? session.time);
  view.setItems(visibleItems(session));
  view.setReeds(standingReeds(session));
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

  // ---- Bolsa e livro de receitas (ADR 0047): categorias à esquerda, receitas no centro, ingredientes e Fabricar à direita; a bolsa (3 × 9) fica embaixo, alinhada à hotbar ----
  const hbMenu = el('button', 'titan-btn titan-hbmenu', ui, '☰'); // abre a bolsa direto; fica à direita da hotbar, fora dos nove espaços
  hbMenu.type = 'button';
  hbMenu.setAttribute('aria-label', 'Bolsa e receitas');
  const panel = el('div', 'titan-panel', ui);
  panel.hidden = true;
  const top = el('div', 'titan-bagtop', panel);
  const cats = el('nav', 'titan-cats', top);
  type Cat = 'todas' | Group | 'manual';
  const catDefs: Array<[Cat, string]> = [['todas', 'Todas'], ['construcao', GROUP_NAMES.construcao], ['utilidades', GROUP_NAMES.utilidades], ['materiais', GROUP_NAMES.materiais], ['manual', 'Manual 2 × 2']];
  const catBtns = new Map<Cat, HTMLButtonElement>();
  for (const [id, name] of catDefs) { const b = el('button', 'titan-cat', cats, name); b.type = 'button'; catBtns.set(id, b); b.addEventListener('click', () => { cat = id; refresh(); }); }
  const center = el('section', 'titan-center', top);
  const tools = el('div', 'titan-tools', center);
  const searchBox = el('input', 'titan-search', tools);
  searchBox.type = 'search'; searchBox.placeholder = 'Buscar'; searchBox.setAttribute('aria-label', 'Buscar receita'); searchBox.autocomplete = 'off';
  const onlyBtn = el('button', 'titan-btn titan-only', tools, 'Só fabricáveis');
  onlyBtn.type = 'button';
  const closeBtn = el('button', 'titan-btn titan-x', tools, '✕');
  closeBtn.type = 'button'; closeBtn.setAttribute('aria-label', 'Fechar');
  const rgrid = el('div', 'titan-rgrid', center);
  const manual = el('div', 'titan-craft titan-manual', center);
  el('small', '', manual, 'Montagem manual 2 × 2');
  const craftRow = el('div', 'titan-craftrow', manual);
  const craftGrid = el('div', 'titan-craftgrid', craftRow);
  const craftSlots = Array.from({ length: CRAFT_SLOTS }, (_, i) => mkSlot(craftGrid, CRAFT_START + i));
  el('span', 'arrow', craftRow, '→');
  const outSlot = mkSlot(craftRow, OUTPUT);
  outSlot.classList.add('out');
  el('small', 'hint', manual, 'Quatro blocos de rocha escura, em qualquer posição, formam a Mesa de Trabalho.');
  const detail = el('aside', 'titan-detail', top);
  const bagGrid = el('div', 'titan-bag', panel);
  const bagSlots = Array.from({ length: SLOTS - HOTBAR }, (_, i) => mkSlot(bagGrid, HOTBAR + i));
  let stationAt: { x: number; y: number; z: number } | null = null;
  let bagOpen = false;
  let sel: number | null = null; // espaço escolhido para mover (destaque azul-gelo)
  let cat: Cat = 'todas', query = '', onlyOk = false, selRecipe: string | null = null;
  const norm = (t: string): string => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  searchBox.addEventListener('input', () => { query = norm(searchBox.value.trim()); refresh(); });
  onlyBtn.addEventListener('click', () => { onlyOk = !onlyOk; refresh(); });
  /** Contexto de fabricação: a bolsa pessoal (`null`) ou a Mesa de Trabalho em uso. Muda na hora que a mesa sai do alcance ou some. */
  const ctxStation = (): Station | null => (stationAt ? 'workbench' : null);

  /** Redesenha todos os espaços e o livro de receitas a partir do inventário (barato: 36 espaços e 4 receitas). */
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
    draw(outSlot, OUTPUT, inv.craftResult());
    for (const id of discoverRecipes(session)) toast(id === 'mesa' ? 'Nova receita: Mesa de Trabalho (4 blocos de rocha escura). Abra a bolsa (☰ ou E).' : 'Receitas da mesa: use a Mesa de Trabalho (F ou botão Usar).', 3500);
    if (bagOpen) drawBook();
    const held = inv.get(session.selected);
    label.textContent = held ? ITEM_NAMES[held.item] : '';
  }

  /** Receitas visíveis: as descobertas (as da mesa também ficam à mostra na bolsa, bloqueadas com o motivo), filtradas por grupo, busca e "só fabricáveis". */
  function visibleRecipes(): Recipe[] {
    const at = ctxStation();
    return RECIPES.filter((r) => (r.station === 'workbench' ? session.known.has('bancada') || at === 'workbench' : session.known.has('mesa')))
      .filter((r) => cat === 'todas' || cat === 'manual' || r.group === cat)
      .filter((r) => !query || norm(r.name).includes(query))
      .filter((r) => !onlyOk || blockedReason(inv, r, at) === null);
  }
  const BADGE: Record<string, string> = { station: '▣', missing: '×', full: '⇩' };

  function drawBook(): void {
    const at = ctxStation();
    for (const [id, b] of catBtns) b.classList.toggle('on', id === cat);
    onlyBtn.classList.toggle('on', onlyOk);
    onlyBtn.setAttribute('aria-pressed', String(onlyOk));
    const isManual = cat === 'manual';
    searchBox.hidden = onlyBtn.hidden = isManual;
    rgrid.hidden = isManual;
    manual.hidden = !isManual;
    // grade de receitas
    rgrid.textContent = '';
    const list = visibleRecipes();
    if (!isManual) {
      if (selRecipe === null || !list.some((r) => r.id === selRecipe)) selRecipe = list[0]?.id ?? null;
      if (!list.length) el('small', 'hint', rgrid, session.known.has('mesa') ? 'Nenhuma receita neste filtro.' : 'Colete rocha escura para descobrir a primeira receita.');
      for (const r of list) {
        const reason = blockedReason(inv, r, at);
        const c = el('button', 'titan-rcell', rgrid);
        c.type = 'button';
        c.classList.toggle('sel', r.id === selRecipe);
        c.classList.toggle('off', reason !== null);
        iconOf(c, r.result.item, 'md');
        if (r.result.count > 1) el('em', 'count', c, String(r.result.count));
        if (reason && reason !== 'ok') el('span', 'badge', c, BADGE[reason]);
        c.setAttribute('aria-label', `${r.name}${reason && reason !== 'ok' ? ` — ${CRAFT_MESSAGES[reason]}` : ''}`);
        c.addEventListener('click', () => { selRecipe = r.id; drawBook(); });
      }
    }
    // detalhe: resultado, estação, Tenho / Preciso e Fabricar
    detail.textContent = '';
    const r = isManual ? undefined : RECIPES.find((q) => q.id === selRecipe);
    if (!r) { el('small', 'hint', detail, isManual ? 'Arraste itens da bolsa para a grade 2 × 2 (1 por espaço) e pegue o resultado.' : 'Toque numa receita para ver o que ela pede.'); return; }
    const reason = blockedReason(inv, r, at);
    const head = el('div', 'titan-dhead', detail);
    iconOf(head, r.result.item, 'md');
    el('b', '', head, `${r.name}${r.result.count > 1 ? ` ×${r.result.count}` : ''}`);
    const stn = r.station === 'workbench' ? (at === 'workbench' ? 'Mesa · ativa' : 'Mesa · use a mesa') : 'Bolsa';
    const meta = el('div', 'titan-dmeta', detail);
    el('small', r.station === 'workbench' && at !== 'workbench' ? 'station lack' : 'station', meta, stn);
    el('small', 'th', meta, 'Tenho / Preciso');
    meta.title = r.station === 'workbench' ? `${STATION_NAMES.workbench}` : STATION_NAMES.personal;
    for (const g of ingredientStatus(inv, r)) {
      const row = el('span', g.have >= g.need ? 'ing ok' : 'ing lack', detail);
      iconOf(row, g.item, 'sm');
      el('em', '', row, ITEM_NAMES[g.item]);
      el('b', '', row, `${g.have} / ${g.need}`);
    }
    const btn = el('button', 'titan-btn titan-fab', detail, r.result.count > 1 ? `Fabricar ×${r.result.count}` : 'Fabricar');
    btn.type = 'button';
    btn.disabled = reason !== null;
    if (reason && reason !== 'ok') el('small', 'why', detail, CRAFT_MESSAGES[reason]);
    btn.addEventListener('click', () => doCraft(r));
  }
  function iconOf(parent: HTMLElement, item: number, size: 'sm' | 'md'): void {
    const i = el('i', `titan-icon ${size}`, parent);
    const idx = item - 1, k = size === 'md' ? 'var(--s3)' : 'var(--s2)';
    i.style.backgroundImage = `url(${titanHotbarUrl})`;
    i.style.backgroundPosition = `calc(-${(idx % 4) * 16}px * ${k}) calc(-${((idx / 4) | 0) * 16}px * ${k})`;
  }
  /** Fabricar: revalida estação, alcance, materiais e espaço **a cada toque**; consome e entrega numa operação só. Falhou → nada muda e o motivo aparece. */
  function doCraft(r: Recipe): void {
    const at = ctxStation();
    if (at === 'workbench' && !stationInReach()) { closeStation('Mesa fora de alcance'); return; }
    const res = craft(inv, r, at);
    if (!res.ok) notice(CRAFT_MESSAGES[res.reason as 'station' | 'missing' | 'full']);
    else { notice(`Fabricado: ${r.result.count > 1 ? `${r.result.count} × ` : ''}${r.name}`); onEdited(); }
    refresh();
  }

  // ---- Mesa de Trabalho: mirar → Usar (botão ou F) → mesma tela, com a estação ativa; sair do alcance ou perder a mesa encerra ----
  const USE_REACH = 5;
  const useBtn = el('button', 'titan-btn titan-use', ui, coarse0() ? 'Usar' : 'Usar [F]');
  useBtn.type = 'button';
  useBtn.hidden = true;
  function coarse0(): boolean { return window.matchMedia?.('(pointer: coarse)').matches ?? false; }
  const benchAimed = (): { x: number; y: number; z: number } | null => {
    if (!target || target.item || vol.get(target.x, target.y, target.z) !== T.WORKBENCH) return null;
    return Math.hypot(target.x + 0.5 - session.body.x, target.y + 0.5 - (session.body.y + EYE_HEIGHT), target.z + 0.5 - session.body.z) <= USE_REACH ? { x: target.x, y: target.y, z: target.z } : null;
  };
  function stationInReach(): boolean {
    if (!stationAt) return false;
    const b = session.body;
    return vol.get(stationAt.x, stationAt.y, stationAt.z) === T.WORKBENCH && Math.hypot(stationAt.x + 0.5 - b.x, stationAt.y + 0.5 - (b.y + EYE_HEIGHT), stationAt.z + 0.5 - b.z) <= USE_REACH + 1.5;
  }
  function openStation(): void {
    const at = benchAimed();
    if (!at || bagOpen || !playing) return;
    stationAt = at;
    toggleBag(true);
  }
  function closeStation(msg?: string): void {
    if (msg) notice(msg);
    if (bagOpen) toggleBag(false);
  }
  useBtn.addEventListener('click', openStation);

  function tapSlot(i: number): void {
    if (i === OUTPUT) {
      if (!inv.takeResult()) notice(inv.craftResult() ? 'Mochila cheia' : 'Monte uma receita primeiro');
      refresh();
      return;
    }
    if (!bagOpen) { if (i < HOTBAR) select(i); return; }
    if (sel === null) { if (inv.get(i)) sel = i; }
    else if (sel === i) sel = null;
    else { if (!inv.move(sel, i)) notice('Não dá para mover para lá'); sel = null; }
    refresh();
  }

  function toggleBag(open: boolean): void {
    if (open === bagOpen) return;
    bagOpen = open;
    panel.hidden = !open;
    document.body.classList.toggle('titan-bag-open', open); // com a bolsa aberta, toques e gestos ficam na interface (o toque do mundo some)
    sel = null;
    if (!open) stationAt = null;
    if (open) { if (document.pointerLockElement) document.exitPointerLock(); gesture.cancel(); keys.clear(); }
    else {
      searchBox.blur();
      if (!inv.returnCraft()) notice('Sem espaço: os itens ficam na grade');
      if (!coarse) void canvas.requestPointerLock?.();
    }
    refresh();
  }
  const toggleFromMenu = (): void => { if (bagOpen) toggleBag(false); else { stationAt = null; toggleBag(true); } };
  closeBtn.addEventListener('click', () => toggleBag(false));
  hbMenu.addEventListener('click', toggleFromMenu);
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
  el('p', '', box, coarse ? 'Esquerda: andar · direita: toque curto coloca, segurar quebra, arrastar gira a câmera · botão Pular · ☰ abre a bolsa.' : 'WASD anda · Espaço pula · mouse olha · clique curto coloca, segurar quebra · 1–9 ou roda troca o bloco · E ou ☰ abre a bolsa.');
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
    if ((e.target as HTMLElement | null)?.tagName === 'INPUT') { if (e.code === 'Escape' || e.code === 'Enter') (e.target as HTMLElement).blur(); return; } // digitando na busca: nada de atalhos
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code >= 'Digit1' && e.code <= 'Digit9') { const n = Number(e.code.slice(5)) - 1; if (n < HOTBAR) select(n); }
    if (e.code === 'KeyE' && playing) toggleFromMenu();
    if (e.code === 'KeyF' && playing && !bagOpen) openStation();
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
  document.addEventListener('selectstart', (e) => { if ((e.target as HTMLElement | null)?.tagName !== 'INPUT') e.preventDefault(); }); // pressionar e segurar no celular não pode virar seleção de texto (o jogo não tem campos de texto)
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
  const bJump = mk('Pular'); // a bolsa abre pelo ☰ ao lado da hotbar
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
      if (r.ok) { view.setItems(visibleItems(session)); onEdited(); refresh(); } // a lasca de um veio aparece no mesmo quadro
      return { ok: r.ok };
    },
    effect: (t, p, stage) => {
      if (!t) { view.setCrack(null); ring.hidden = true; return; }
      if (t.kind === 'block') { view.setCrack(t, stage); ring.hidden = true; } // rachaduras progressivas só em blocos; sem refazer malha
      else { view.setCrack(null); ring.hidden = false; ring.style.setProperty('--p', String(p)); }
    },
  });

  // ---- Gravação ----
  let dropFull = false;
  let lastSavedTime = session.time;
  let lastEdit = 0, lastPlayerSave = performance.now(), playerDirty = false, saving: Promise<void> | null = null, failed = false, retryAt = 0;
  const setSave = (txt: string, err = false): void => { saveLine.textContent = txt; saveLine.className = err ? 'err' : ''; };
  function onEdited(): void { lastEdit = performance.now(); setSave('alterações pendentes…'); view.setReeds(standingReeds(session)); } // o junco some onde se construiu
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
    if (playing && session.drops.size) {
      // lascas soltas por veios: coleta por proximidade (mochila cheia deixa a lasca no lugar, com um aviso por aproximação)
      const c = collectNearby(session, b.x, b.y, b.z);
      if (c.collected || c.moved) { view.setItems(visibleItems(session)); if (c.collected) { onEdited(); refresh(); } }
      if (c.full && !dropFull) notice('Mochila cheia');
      dropFull = c.full;
    }
    view.setSky(forcedHour ?? session.time);
    skyLine.textContent = forcedHour !== null ? `hora fixa: ${phaseName(forcedHour)} (teste, não é gravada)` : phaseName(session.time);
    if (autoEdit && now > nextAuto) { nextAuto = now + 120; autoEditStep(session, spots, autoStep++); } // estresse de luz + malha (só na cena de teste)
    const eye = { x: b.x, y: b.y + EYE_HEIGHT, z: b.z };
    const [dx, dy, dz] = lookVector(session.yaw, session.pitch);
    target = active ? raycast(vol, eye.x, eye.y, eye.z, dx, dy, dz, 6, session.items, coarse ? LANTERN_PAD_TOUCH : LANTERN_PAD_MOUSE) : null;
    useBtn.hidden = !(active && benchAimed()); // mirar na mesa, dentro do alcance, oferece "Usar"
    if (stationAt && bagOpen && !stationInReach()) closeStation(vol.get(stationAt.x, stationAt.y, stationAt.z) === T.WORKBENCH ? 'Mesa fora de alcance' : 'A mesa sumiu');
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
