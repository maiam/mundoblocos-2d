import './titan.css';
import { titanAtlasUrl, titanCracksUrl, titanHotbarUrl, titanLanternAtlasUrl, titanReedUrl, titanCultivoUrl, titanWorkbenchAtlasUrl, titanBasaltUrl, titanLakeUrl, titanLake8Url, orvalisWaterUrl, orvalisWater8Url, titanAtlas8Url, titanMargemAtlasUrl, titanEscadaAtlasUrl, titanBauAtlasUrl, titanBraseiroAtlasUrl, titanJuncoTileUrl, titanDegrauPedraUrl, titanMuretaPedraUrl, orvalisHortaUrl, titanPortaUrl, titanCamaAtlasUrl, titanHudUrl, titanNozAtlasUrl, titanFarejadorAtlasUrl, orvalisFazendaUrls } from '../render/art/titan';
import { TitanRenderer } from '../render/titanRenderer';
import { seedFromString } from '../world/random';
import { COOK_TIME_S, type FurnaceSlot, prepsLeft } from './furnace';
import { tickFurnaces } from './session';
import { durabilityHue, durabilityRatio, maxDurability } from './wear';
import { canPlantNut, useDoor, chestAt, chestMoveIn, chestTakeOut, useBed, furnaceAt, furnaceMoveIn, furnaceTakeOut, breakOrCollect, collectNearby, dieAndRespawn, eatFromSlot, placeFromSlot } from './actions';
import { eyesSubmerged } from './underwater';
import { creatureAim, farejadorPose, KINDS, stepFarejador } from './creature';
import { ATTACK_COOLDOWN_S, ATTACK_REACH, attackCreature, attackFauna, tickRespawn } from './combat';
import { BABY_SCALE, FAUNA_KINDS, faunaAim, faunaPose, isBreedFood, maxHp, stepFauna, tickBreeding, type FaunaKind } from './fauna';
import { feedFaunaFromSlot } from './faunaFeed';
import { addExhaustion, canSprint, EXHAUSTION, fallDamage, HUNGER_ENABLED, hurt as hurtVitals, isDead, updatePlayerVitals } from './vitals';
import { blockedReason, CRAFT_MESSAGES, craft, GROUP_NAMES, previewCells, RECIPES, stationMet, type Group, type Recipe, type Station } from './recipes';
import { breakTotalMs, DRAG_TOLERANCE_PX, toolAdvantage } from './breaking';
import { gameAudio, HIT_INTERVAL_MS } from './gameAudio';
import { FootstepClock, surfaceOf } from './sounds';
import { rayThrough } from './aim';
import { isoCamera, isoQuarterOf, isoRay, isoYawOf, ISO_RAY_MAX, ISO_REACH, stepIsoYaw } from './iso';
import { type GestureTarget, InteractionGesture } from './gesture';
import { BENCH_OUT, BENCH_SLOTS, BENCH_START, HOTBAR, SLOTS } from './inventory';
import { CHEST_SLOTS } from './chest';
import { aimsLiquid, isBoatItem, blockOfItem, foodOf, isBucket, Item, ITEM_NAMES } from './items';
import { stepFishing } from './fishing';
import { dismountBoat, mountBoat } from './actions';
import { stepCoral } from './coral';
import { BOAT_NAMES, BOAT_REACH, boatAim, boatSeat, stepBoat } from './boat';
import { LANTERN_PAD_MOUSE, LANTERN_PAD_TOUCH } from './lantern';
import { EYE_HEIGHT, lookVector, raycast, stepBody, type Hit } from './physics';
import { startPerfHud } from '../dev/perfHud';
import { TitanPerf } from './perf';
import { smoothRain } from './weather';
import { advanceDay, canSleep, FIXED_HOURS, parseHora, phaseName, saturnVisibility } from './sky';
import { SLEEP_APPLY_MS, SLEEP_CONTROL_MS, SLEEP_TOTAL_MS, sleepCue, sleepVeil } from './sleep';
import { lidSound } from './lid';
import { isDoor, isBed, isBrazier, isChest, isCollectBlock, isCraftingTable, isFurnace, T } from './voxel';
import { autoEditStep, buildLanternScene, SCENE_NOTE } from './scene';
import { texturesCaption, texturesSession } from './texturas';
import { defaultTitanStorage, MemoryTitanStorage, type TitanStorage } from './save';
import type { VoxelWorld } from './terrain';
import { ORVALIS_GENERATOR_VERSION, OrvalisGenerator, orvalisGeneratorFor } from './orvalis/generator';
import { fetchRoomCounts, onlineAvailable } from '../net/socket';
import { TitanClient } from '../net/titan/client';
import { TitanLoopbackServer } from '../net/titan/loopback';
import { TitanSocket } from '../net/titan/socket';
import { TITAN_MAX_PLAYERS, titanRoomById, titanRoomsOf, type WireHit } from '../net/titan/protocol';
import { flush, hasPendingState, openSession, type TitanSession, UnsupportedVersionError, visibleItems, discoverRecipes, standingReeds, standingNuts, standingCrops, isRaining, tickWeather, tickCrops, tickRegrow } from './session';

/**
 * Titã — jogo solo em primeira pessoa (ADR 0039): liga entrada (teclado/mouse/toque), laço de quadros, renderer, mira e gravação.
 * Regras de edição ficam no `TitanVolume`; física e mira em `physics.ts`; aqui só há DOM. Desktop: clique esquerdo coloca, direito remove.
 */
const AUTOSAVE_AFTER_EDIT_MS = 700;
const AUTOSAVE_PLAYER_MS = 5000;
const RETRY_MS = 3000;
/** Farejadores (ADR 0074): só os que estão a até `SIM_RADIUS` m do viajante (ou em ação) são simulados; só os `SHOW_MAX` mais próximos, a até `SHOW_RADIUS` m, vão para o desenho. */
const SPRINT_HOLD_MS = 200; // ADR 0076
let sprintOn = false;
const SIM_RADIUS = 56, SHOW_RADIUS = 64, SHOW_MAX = 8;
/** Fauna de fazenda (ADR 0124): só os animais a até `FAUNA_SIM_RADIUS` m passeiam; os `FAUNA_SHOW_MAX` mais próximos, a até `FAUNA_SHOW_RADIUS` m, vão para o desenho. */
const FAUNA_SIM_RADIUS = 48, FAUNA_SHOW_RADIUS = 64, FAUNA_SHOW_MAX = 40;

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

export async function startTitan(canvas: HTMLCanvasElement, search: string, storageArg?: TitanStorage, world: VoxelWorld = 'titan'): Promise<void> {
  const q = new URLSearchParams(search);
  const orvalis = world === 'orvalis'; // Orvalis em voxel (ADR 0105): o mesmo motor com outro gerador, outro banco, céu azul e a água do Orvalis; sem salas por enquanto
  // `?cena=lanternas[&n=12]`: cena de desenvolvimento para medir luz e malhas com várias lanternas — **nada é gravado** (armazenamento em memória).
  const scene = q.get('cena') === 'lanternas';
  // `?cena=texturas` (só no `npm run dev`): vitrine plana de blocos para conferir a arte do atlas no motor; nada é gravado (ADR 0105)
  const texScene = import.meta.env.DEV && q.get('cena') === 'texturas';
  // `?sala=101`: entra numa sala cooperativa do servidor (ADR 0104); `&loopback=1` usa um servidor em memória na própria página (teste). Sala = nada é gravado neste aparelho.
  const firstRoom = titanRoomsOf(world)[0]; // a primeira sala do mundo (Titã 1 ou Orvalis 1, ADR 0138)
  const roomId = Number(q.get('sala')), room = (() => { const r = titanRoomById(roomId); return r && r.world === world ? r : null; })(); // só vale a sala do mundo em que se joga
  const storage = storageArg ?? (scene || texScene || room ? new MemoryTitanStorage() : defaultTitanStorage(world));
  let client: TitanClient | null = null;
  // `?fps=1`: painel de desempenho (FPS, GPU, memória) com o tempo de cada etapa do Titã: luz, malha, geometria, desenho.
  const perf = q.get('fps') === '1' || scene ? new TitanPerf() : null;
  document.body.classList.add('titan');
  const ui = el('div', 'titan-ui', document.body);
  const veil = el('div', 'titan-veil', ui);
  const sleepEl = el('div', 'titan-sleep', ui); // véu escuro do sono na cama (ADR 0093)
  const hurt = el('div', 'titan-hurt', ui); // clarão vermelho ao tomar dano (ADR 0059)
  ui.style.setProperty('--hud', `url(${titanHudUrl})`); // véu carvão-violeta da imersão (ADR 0057): primeiro filho, abaixo de todos os controles; sem toque
  ui.style.setProperty('--basalt', `url(${titanBasaltUrl})`); // fundo e moldura dos painéis (ADR 0049)
  const toast = (msg: string, ms = 3500): void => {
    const t = el('div', 'titan-toast', ui, msg);
    window.setTimeout(() => t.remove(), ms);
  };

  const probe = document.createElement('canvas');
  if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) { toast(`Este aparelho não oferece WebGL: ${orvalis ? 'o Orvalis' : 'o Titã'} não abre aqui.`, 60000); return; }

  const aviso = q.get('aviso'); // veio de uma sala que recusou: explica e limpa o endereço
  if (aviso) { toast(aviso.slice(0, 160), 9000); const u = new URL(window.location.href); u.searchParams.delete('aviso'); window.history.replaceState(null, '', u); }
  const param = q.get('seed') ?? (scene ? '42' : null);
  let session: TitanSession;
  try {
    if (room) {
      const loop = q.get('loopback') === '1' ? new TitanLoopbackServer() : null;
      if (loop) { window.setInterval(() => loop.tick(0.1), 100); if (import.meta.env.DEV) (window as unknown as { __titanLoop: unknown }).__titanLoop = loop; }
      let nick = q.get('nome') ?? '';
      try { nick = nick || window.localStorage.getItem('orvalis-titan-nome') || ''; } catch { /* sem armazenamento */ }
      nick = nick || `Viajante${Math.floor(100 + Math.random() * 900)}`;
      const waiting = el('div', 'titan-toast', ui, `Entrando na sala ${room.name}…`); // tela de espera: some ao abrir ou ao falhar
      client = new TitanClient(loop ? loop.connect() : new TitanSocket());
      const timeout = new Promise<never>((_, rej) => window.setTimeout(() => rej(new Error('O servidor não respondeu a tempo.')), 10000));
      try { session = await Promise.race([client.connect(nick, room.id), timeout]); } finally { waiting.remove(); }
    } else if (texScene) session = texturesSession(42, world);
    else session = orvalis
      ? await openSession(storage, param ? seedFromString(param) : null, () => Math.floor(Math.random() * 2 ** 31), orvalisGeneratorFor, ORVALIS_GENERATOR_VERSION, (s, v) => new OrvalisGenerator(s, v))
      : await openSession(storage, param ? seedFromString(param) : null, () => Math.floor(Math.random() * 2 ** 31));
  } catch (e) {
    if (room) { // a sala recusou ou não respondeu: volta ao modo solo com um aviso (nada de página parada)
      const msg = e instanceof Error ? e.message : '';
      const why = /não encontrada/i.test(msg) ? `O servidor ainda não tem as salas do ${orvalis ? 'Orvalis' : 'Titã'}.` : /versão/i.test(msg) ? 'O servidor está em outra versão do jogo.' : msg || 'Não foi possível entrar na sala.';
      const u = new URL(window.location.href);
      u.searchParams.delete('sala'); u.searchParams.delete('loopback'); u.searchParams.set('aviso', `${why} Jogando sozinho.`);
      window.location.replace(u);
      return;
    }
    toast(e instanceof UnsupportedVersionError ? e.message : 'Não foi possível abrir a partida salva.', 60000);
    return;
  }
  const [atlas, hotbarAtlas, cracksAtlas, lanternAtlas, workbenchAtlas, escadaImg, bauImg, camaImg, braseiroImg, juncoImg, degrauPedraImg, muretaPedraImg, hortaImg, portaImg, reedImg, cultivoImg, lakeImg, margemImg, nozImg, farejadorImg, atlas8Img, lake8Img] = await Promise.all([loadImage(titanAtlasUrl), loadImage(titanHotbarUrl), loadImage(titanCracksUrl), loadImage(titanLanternAtlasUrl), loadImage(titanWorkbenchAtlasUrl), loadImage(titanEscadaAtlasUrl), loadImage(titanBauAtlasUrl), loadImage(titanCamaAtlasUrl), loadImage(titanBraseiroAtlasUrl), loadImage(titanJuncoTileUrl), loadImage(titanDegrauPedraUrl), loadImage(titanMuretaPedraUrl), loadImage(orvalisHortaUrl), loadImage(titanPortaUrl), loadImage(titanReedUrl), loadImage(titanCultivoUrl), loadImage(orvalis ? orvalisWaterUrl : titanLakeUrl), loadImage(titanMargemAtlasUrl), loadImage(titanNozAtlasUrl), loadImage(titanFarejadorAtlasUrl), loadImage(titanAtlas8Url), loadImage(orvalis ? orvalisWater8Url : titanLake8Url)]);
  const vol = session.volume;
  const inv = session.inventory;
  const spots = scene ? buildLanternScene(session, Math.max(1, Math.min(64, Number(q.get('n')) || 12))) : [];
  if (perf) { perf.count('lanterns', spots.length); vol.onLightMs = (ms) => perf.record('light', ms); }
  // `?hora=manha|tarde|noite`: congela só a visualização (teste); a hora do jogo continua correndo e é a que vai no save
  const forcedHour = parseHora(q.get('hora')) ?? (texScene ? FIXED_HOURS.tarde : null); // a vitrine fica à tarde, para a cor não variar entre testes
  // `?saturno=1`: força Saturno à vista (teste visual da imagem rara); nada é gravado
  const forcedSaturn = q.get('saturno') === '1' ? 1 : null;
  const fazenda = orvalis ? (Object.fromEntries(await Promise.all((Object.keys(orvalisFazendaUrls) as FaunaKind[]).map(async (k) => [k, await loadImage(orvalisFazendaUrls[k])] as const))) as Record<FaunaKind, HTMLImageElement>) : undefined; // 4 atlas de 64 × 64 (ADR 0124)
  const view = new TitanRenderer(canvas, vol, atlas, hotbarAtlas, cracksAtlas, lanternAtlas, { workbenchAtlas, escadaAtlas: escadaImg, bauAtlas: bauImg, camaAtlas: camaImg, braseiroAtlas: braseiroImg, juncoTile: juncoImg, degrauPedra: degrauPedraImg, muretaPedra: muretaPedraImg, horta: hortaImg, porta: portaImg, reed: reedImg, cultivo: cultivoImg, lake: lakeImg, margemAtlas: margemImg, nozAtlas: nozImg, farejadorAtlas: farejadorImg, fazenda, iso: { atlas: atlas8Img, lake: lake8Img } }, perf);
  if (import.meta.env.DEV) (window as unknown as { __titan: unknown }).__titan = { session, view }; // só no dev (como o window.__game do mundo 2.5D): testes de navegador
  if (orvalis) view.setPalette('orvalis');
  const forcedRain = q.get('chuva') === '1'; // teste: força a chuva (só visual e som; não grava)
  let rainLevel = forcedRain || isRaining(session) ? 1 : 0;
  view.setSky(forcedHour ?? session.time, rainLevel, session.days);
  view.setItems(visibleItems(session));
  view.setReeds(standingReeds(session));
  view.setNuts(standingNuts(session));
  view.setCrops(standingCrops(session));
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
  seedLine.innerHTML = `${orvalis ? 'Orvalis · Ilha das Florestas' : 'Titã · Margem Silenciosa'} · semente <b>${session.seed}</b> · gerador v${vol.gen.version}`;
  const saveLine = el('span', '', status, scene || texScene ? SCENE_NOTE : room ? `${room.name} · online` : 'salvo');
  if (texScene) el('div', 'titan-texnames', ui, texturesCaption().join('\n')); // legenda da vitrine (ordem dos blocos e tile no atlas)
  const posLine = el('span', '', status);
  const skyLine = el('span', '', status);
  // ---- Vida, ar e fome (ADR 0059): 10 marcas de 2 pontos (meia marca = 1) acima da hotbar; o ar só aparece com a cabeça no lago ou enchendo ----
  const vitals = session.vitals;
  const hud = el('div', 'titan-vitals', ui);
  const marksOf = (parent: HTMLElement): HTMLElement[] => Array.from({ length: 10 }, () => el('i', 'titan-mark', parent));
  const healthMarks = marksOf(el('div', 'titan-bar', hud));
  const hungerBar = el('div', 'titan-bar', hud);
  const hungerMarks = marksOf(hungerBar);
  hungerBar.hidden = !HUNGER_ENABLED; // sem comida no jogo a fome fica oculta (vitals.ts)
  const airBar = el('div', 'titan-airbar', ui);
  const airMarks = marksOf(airBar);
  airBar.hidden = true;
  const hudKey = { health: -1, hunger: -1, air: -1 };
  /** Pinta uma fileira: `row` do atlas (0 ar, 1 vida, 2 fome); a marca i vale `points − 2i`: ≥ 2 cheia, 1 parcial, ≤ 0 vazia. */
  const paintMarks = (marks: HTMLElement[], row: number, points: number): void => marks.forEach((m, i) => { const p = points - i * 2, col = p >= 2 ? 0 : p === 1 ? 1 : 2; m.style.backgroundPosition = `calc(${-col} * var(--hudm)) calc(${-row} * var(--hudm))`; });
  function paintVitals(submerged: boolean): void {
    const h = Math.ceil(vitals.health - 1e-9), f = Math.ceil(vitals.hunger - 1e-9), a = Math.ceil((vitals.air / vitals.maxAir) * 20 - 1e-6);
    if (h !== hudKey.health) { hudKey.health = h; paintMarks(healthMarks, 1, h); }
    if (f !== hudKey.hunger) { hudKey.hunger = f; paintMarks(hungerMarks, 2, f); }
    if (a !== hudKey.air) { hudKey.air = a; paintMarks(airMarks, 0, a); }
    airBar.hidden = !(submerged || vitals.air < vitals.maxAir - 0.01);
  }
  paintVitals(false);
  const onHurt = (): void => { hurt.classList.remove('on'); void hurt.offsetWidth; hurt.classList.add('on'); gameAudio.playHurt(); playerDirty = true; };
  let airTop = session.body.y, wasAir = false; // queda: o ponto mais alto desde que saiu do chão (a água amortece)
  const label = el('div', 'titan-label', ui);
  const hotbar = el('div', 'titan-hotbar', ui);
  /** Espaço da interface: ícone do atlas da hotbar (por id do item), quantidade e tecla. */
  const mkSlot = (parent: HTMLElement, index: number, key?: string, tap: (i: number) => void = (i) => tapSlot(i)): HTMLButtonElement => {
    const b = el('button', 'titan-slot', parent);
    b.type = 'button';
    b.dataset.slot = String(index);
    if (key) el('span', 'key', b, key);
    el('i', 'titan-icon', b);
    el('em', 'count', b);
    el('b', 'titan-dur', b).hidden = true; // barra de durabilidade (ADR 0067): só depois do primeiro desgaste
    b.addEventListener('click', () => tap(index));
    return b;
  };
  const hotSlots = Array.from({ length: HOTBAR }, (_, i) => mkSlot(hotbar, i, String(i + 1)));

  // ---- Bolsa e livro de receitas (ADR 0047): grupos à esquerda (a bolsa é o último), receitas no centro, grade de fabricação e item final à direita ----
  const hbMenu = el('button', 'titan-btn titan-hbmenu', ui, '☰'); // abre a tela direto; fica à direita da hotbar, fora dos nove espaços
  hbMenu.type = 'button';
  hbMenu.setAttribute('aria-label', 'Bolsa e receitas');
  const panel = el('div', 'titan-panel', ui);
  panel.hidden = true;
  const top = el('div', 'titan-bagtop', panel);
  const cats = el('nav', 'titan-cats', top);
  type Cat = 'todas' | Group | 'bag';
  const catDefs: Array<[Cat, string]> = [['todas', 'Todas'], ['construcao', GROUP_NAMES.construcao], ['utilidades', GROUP_NAMES.utilidades], ['materiais', GROUP_NAMES.materiais], ['ferramentas', GROUP_NAMES.ferramentas], ['bag', 'Bolsa']];
  const catBtns = new Map<Cat, HTMLButtonElement>();
  for (const [id, name] of catDefs) { const b = el('button', 'titan-cat', cats, name); b.type = 'button'; catBtns.set(id, b); b.addEventListener('click', () => { cat = id; sel = null; refresh(); }); }
  const center = el('section', 'titan-center', top);
  const tools = el('div', 'titan-tools', center);
  const searchBox = el('input', 'titan-search', tools);
  searchBox.type = 'search'; searchBox.placeholder = 'Buscar'; searchBox.setAttribute('aria-label', 'Buscar receita'); searchBox.autocomplete = 'off';
  const onlyBtn = el('button', 'titan-btn titan-only', tools, 'Só fabricáveis');
  onlyBtn.type = 'button';
  const rgrid = el('div', 'titan-rgrid', center);
  const bagGrid = el('div', 'titan-bag', center); // grupo "Bolsa": os 27 espaços (3 × 9)
  const bagSlots = Array.from({ length: SLOTS - HOTBAR }, (_, i) => mkSlot(bagGrid, HOTBAR + i));
  const right = el('aside', 'titan-right', top);
  const rhead = el('div', 'titan-rhead', right);
  el('small', 'th', rhead, 'Fabricação');
  const closeBtn = el('button', 'titan-btn titan-x', rhead, '✕');
  closeBtn.type = 'button'; closeBtn.setAttribute('aria-label', 'Fechar');
  const detail = el('div', 'titan-detail', right); // receita escolhida: ingredientes na grade e o item final
  // grupo "Bolsa": os 27 espaços + a grade 3 × 3 de montagem, a **única** grade (ADR 0050); a Mesa de Trabalho só é exigida por algumas receitas, na hora de retirar a saída
  const benchBox = el('div', 'titan-detail titan-manual titan-bench', right);
  el('small', '', benchBox, 'Montar 3 × 3');
  const benchGrid = el('div', 'titan-benchgrid', benchBox);
  const benchSlots = Array.from({ length: BENCH_SLOTS }, (_, i) => mkSlot(benchGrid, BENCH_START + i));
  el('span', 'arrow', benchBox, '↓');
  const benchOut = mkSlot(benchBox, BENCH_OUT);
  benchOut.classList.add('out');
  // painel do Braseiro (ADR 0068): entrada, combustível e saída guardados no bloco; fogo e cozimento correm com a tela fechada
  const furnaceBox = el('div', 'titan-detail titan-manual titan-furnace', right);
  furnaceBox.hidden = true;
  const fTitle = el('small', '', furnaceBox, 'Braseiro de Rocha'); // vira 'Fornalha' na do Orvalis (ADR 0120)
  // como a Fornalha do Minecraft: entrada em cima, chama no meio e combustível embaixo à esquerda; seta de progresso e o resultado grande à direita
  const fGrid = el('div', 'titan-fgrid', furnaceBox);
  const fSlot = (parent: HTMLElement, kind: FurnaceSlot, label: string): HTMLButtonElement => {
    const wrap = el('div', 'titan-fcol', parent);
    el('small', 'flabel', wrap, label);
    const b = el('button', 'titan-slot titan-fslot', wrap);
    b.type = 'button';
    el('i', 'titan-icon', b); el('em', 'count', b);
    b.addEventListener('click', () => tapFurnace(kind));
    return b;
  };
  const fLeft = el('div', 'titan-fleft', fGrid);
  const fIn = fSlot(fLeft, 'input', 'Entrada');
  const fFlame = el('div', 'titan-fflame', fLeft);
  const fFuel = fSlot(fLeft, 'fuel', 'Combustível');
  const fCook = el('div', 'titan-farrow', fGrid);
  const fOut = fSlot(fGrid, 'output', 'Resultado');
  fOut.classList.add('out');
  const fHint = el('small', 'hint', furnaceBox, 'Toque numa pilha da bolsa e depois em Entrada ou Combustível. Uma Brasa de Âmbar rende 4 preparações e o Bloco de Âmbar, 36; a carga só gasta ao cozinhar.');
  // painel do Baú de Rocha e Junco (ADR 0089): 18 espaços guardados no bloco; a bolsa fica à vista para mover as pilhas (toque na pilha e depois no espaço do baú, ou toque no espaço do baú para tirar)
  const chestBox = el('div', 'titan-detail titan-manual titan-chest', right);
  chestBox.hidden = true;
  el('small', '', chestBox, 'Baú de Rocha e Junco');
  const chestGrid = el('div', 'titan-chestgrid', chestBox);
  const chestSlots = Array.from({ length: CHEST_SLOTS }, (_, i) => mkSlot(chestGrid, i, undefined, (n) => tapChest(n)));
  el('small', 'hint', chestBox, 'Toque numa pilha da bolsa e depois num espaço do baú para guardá-la; toque num espaço do baú para tirar a pilha. Quebrar o baú derruba o que estiver dentro.');
  const benchName = el('b', 'rname', benchBox, '');
  const benchWhy = el('small', 'hint', benchBox, '');
  let stationAt: { x: number; y: number; z: number; kind: 'workbench' | 'brazier' | 'furnace' | 'chest' } | null = null;
  let bagOpen = false;
  let sel: number | null = null; // espaço escolhido para mover (destaque azul-gelo)
  let cat: Cat = 'todas', query = '', onlyOk = false, selRecipe: string | null = null;
  const norm = (t: string): string => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  searchBox.addEventListener('input', () => { query = norm(searchBox.value.trim()); refresh(); });
  onlyBtn.addEventListener('click', () => { onlyOk = !onlyOk; refresh(); });
  /** Contexto de fabricação: a bolsa pessoal (`null`) ou a Mesa de Trabalho em uso. Muda na hora que a mesa sai do alcance ou some. */
  const ctxStation = (): Station | null => (stationAt && stationAt.kind !== 'chest' ? stationAt.kind : null); // o baú não fabrica: conta como a bolsa pessoal
  const stationName = (k: Station | 'chest' | null): string => (k === 'brazier' ? 'Braseiro de Rocha aceso' : k === 'furnace' ? 'Fornalha' : k === 'chest' ? 'Baú' : 'Mesa de Trabalho');

  /** Redesenha todos os espaços e o livro de receitas a partir do inventário (barato: 36 espaços e 4 receitas). */
  function refresh(): void {
    const draw = (b: HTMLButtonElement, i: number, forced?: { item: number; count: number; wear?: number } | null): void => {
      const st = forced === undefined ? inv.get(i) : forced;
      const icon = b.querySelector('i') as HTMLElement;
      const count = b.querySelector('em') as HTMLElement;
      b.classList.toggle('empty', !st);
      if (st) {
        const idx = st.item - 1, col = idx % 4, row = (idx / 4) | 0;
        icon.style.backgroundImage = `url(${titanHotbarUrl})`;
        icon.style.backgroundPosition = `calc(${-col} * var(--ic)) calc(${-row} * var(--ic))`; // célula de 32 px do atlas, na escala inteira da interface (ADR 0053)
        icon.style.visibility = 'visible';
        count.textContent = st.count > 1 ? String(st.count) : '';
        b.setAttribute('aria-label', `${ITEM_NAMES[st.item]}${st.count > 1 ? ` × ${st.count}` : ''}${maxDurability(st.item) !== null ? ` · durabilidade ${maxDurability(st.item)! - (st.wear ?? 0)}/${maxDurability(st.item)}` : ''}`);
      } else { icon.style.visibility = 'hidden'; count.textContent = ''; b.setAttribute('aria-label', 'vazio'); }
      const bar = b.querySelector('.titan-dur') as HTMLElement | null;
      const ratio = st ? durabilityRatio(st.item, st.wear) : null;
      if (bar) { bar.hidden = ratio === null; if (ratio !== null) { bar.style.setProperty('--r', String(ratio)); bar.style.setProperty('--h', String(durabilityHue(ratio))); } }
      b.dataset.sel = String(sel === i);
    };
    hotSlots.forEach((b, i) => { draw(b, i); b.setAttribute('aria-pressed', String(i === session.selected)); });
    bagSlots.forEach((b, i) => draw(b, HOTBAR + i));
    benchSlots.forEach((b, i) => draw(b, BENCH_START + i));
    const chestNow = stationAt?.kind === 'chest' ? chestAt(session, stationAt.x, stationAt.y, stationAt.z) : null;
    chestSlots.forEach((b, i) => draw(b, -1 - i, chestNow ? chestNow[i] : null)); // índices negativos: nunca coincidem com a pilha escolhida (`sel`)
    const brec = inv.benchRecipe();
    const needStation = !!brec && !stationMet(brec, ctxStation()); // receita da Mesa (ou do Braseiro) montada fora dela: a saída fica bloqueada
    const br = brec && !needStation ? { ...brec.result } : null;
    draw(benchOut, BENCH_OUT, br);
    benchName.textContent = brec ? `${brec.name}${brec.result.count > 1 ? ` ×${brec.result.count}` : ''}` : '';
    benchWhy.textContent = needStation ? `Precisa de ${brec!.station === 'brazier' ? 'um Braseiro aceso' : 'a Mesa de Trabalho'}` : 'Toque na pilha e na célula; na saída, fabrica.';
    benchOut.classList.toggle('ready', !!br);
    for (const id of discoverRecipes(session)) toast(orvalis ? (id === 'mesa' ? 'Receitas de madeira: tábuas, hastes e a Mesa de Carpintaria. Abra a bolsa (☰ ou E).' : 'Receitas da mesa: use a Mesa de Carpintaria (F ou botão Usar).') : id === 'mesa' ? 'Nova receita: Mesa de Trabalho (4 blocos de rocha escura). Abra a bolsa (☰ ou E).' : id === 'braseiro' ? 'Receitas do Braseiro: acenda um Braseiro de Rocha com uma Brasa de Âmbar e use-o (F ou botão Usar).' : 'Receitas da mesa: use a Mesa de Trabalho (F ou botão Usar).', 3500);
    if (bagOpen) drawBook();
    const held = inv.get(session.selected);
    label.textContent = held ? `${ITEM_NAMES[held.item]}${maxDurability(held.item) !== null ? ` · ${maxDurability(held.item)! - (held.wear ?? 0)}/${maxDurability(held.item)}` : ''}` : '';
  }

  /** Receitas visíveis: as descobertas (as da mesa também ficam à mostra na bolsa, bloqueadas com o motivo), filtradas por grupo, busca e "só fabricáveis". */
  function visibleRecipes(): Recipe[] {
    const at = ctxStation();
    return RECIPES.filter((r) => (r.world ?? 'titan') === session.volume.gen.world) // cada mundo mostra só as suas receitas (ADR 0107)
      .filter((r) => r.station !== 'brazier' && r.station !== 'furnace') // as do braseiro e as da fornalha ficam no painel deles (entrada → saída), não em cartões
      .filter((r) => (r.station === 'brazier' ? session.known.has('braseiro') || at === 'brazier' : r.station === 'workbench' ? session.known.has('bancada') || at === 'workbench' : session.known.has('mesa')))
      .filter((r) => cat === 'todas' || cat === 'bag' || r.group === cat)
      .filter((r) => !query || norm(r.name).includes(query))
      .filter((r) => !onlyOk || blockedReason(inv, r, at) === null);
  }
  const BADGE: Record<string, string> = { station: '▣', missing: '×', full: '⇩' };

  function drawBook(): void {
    const at = ctxStation();
    if (stationAt?.kind === 'brazier' || stationAt?.kind === 'furnace' || stationAt?.kind === 'chest') cat = 'bag'; // no braseiro e no baú a mochila fica à vista para mover as pilhas
    for (const [id, b] of catBtns) b.classList.toggle('on', id === cat);
    onlyBtn.classList.toggle('on', onlyOk);
    onlyBtn.setAttribute('aria-pressed', String(onlyOk));
    const slots = cat === 'bag';
    tools.hidden = rgrid.hidden = slots;
    bagGrid.hidden = !slots; // "Bolsa": os 27 espaços para mover os itens
    const furn = stationAt?.kind === 'brazier' || stationAt?.kind === 'furnace';
    const chest = stationAt?.kind === 'chest';
    benchBox.hidden = !slots || furn || chest; // e a grade 3 × 3 de montagem (no braseiro e no baú, o painel deles)
    furnaceBox.hidden = !(slots && furn);
    chestBox.hidden = !(slots && chest);
    top.classList.toggle('furn', !!(slots && (furn || chest))); // o braseiro ganha uma coluna mais larga (a bolsa quebra em menos colunas)
    detail.hidden = slots;
    if (slots) return; // nesse grupo as grades são slots fixos (já desenhados acima)
    // centro: grade de receitas (ícone do resultado; ×N no canto; selo quando bloqueada)
    rgrid.textContent = '';
    const list = visibleRecipes();
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
    // direita: os ingredientes na grade de fabricação (2 × 2 na bolsa, 3 × 3 na mesa; "tenho / preciso" em cada um) e o item final embaixo, com nome; tocar nele fabrica
    detail.textContent = '';
    const r = RECIPES.find((q) => q.id === selRecipe);
    if (!r) { el('small', 'hint', detail, 'Toque numa receita para ver o que ela pede.'); return; }
    const reason = blockedReason(inv, r, at);
    el('small', !stationMet(r, at) ? 'station lack' : 'station', detail, r.station === 'personal' ? 'Fabricação pessoal' : at === r.station ? `${stationName(at)} · ativo` : `Use ${r.station === 'brazier' ? 'um Braseiro aceso' : 'a Mesa de Trabalho'}`);
    // grade 3 × 3 sempre (ADR 0050): uma célula por unidade pedida; o número é quanto do que você tem cabe a ela (tem 9 de 4 → 3, 2, 2, 2)
    const cells = previewCells(inv, r);
    const igrid = el('div', 'titan-igrid', detail);
    for (let k = 0; k < 9; k++) {
      const g = cells[k];
      const cell = el('div', g ? (g.share >= 1 ? 'titan-icell ok' : 'titan-icell lack') : 'titan-icell', igrid);
      if (!g) continue;
      iconOf(cell, g.item, 'md');
      el('em', 'count', cell, String(g.share));
      cell.title = `${ITEM_NAMES[g.item]}: tenho ${g.have}, preciso ${g.need}`;
      cell.setAttribute('aria-label', cell.title);
    }
    el('span', 'arrow', detail, '↓');
    const res = el('button', reason === null ? 'titan-result ok' : 'titan-result off', detail);
    res.type = 'button';
    iconOf(res, r.result.item, 'md');
    if (r.result.count > 1) el('em', 'count', res, String(r.result.count));
    res.setAttribute('aria-label', `Fabricar ${r.result.count > 1 ? `${r.result.count} × ` : ''}${r.name}`);
    res.addEventListener('click', () => doCraft(r));
    el('b', 'rname', detail, `${r.name}${r.result.count > 1 ? ` ×${r.result.count}` : ''}`);
    if (reason && reason !== 'ok') el('small', 'why', detail, CRAFT_MESSAGES[reason]);
    else el('small', 'tip', detail, 'Toque no item para fabricar');
  }
  function iconOf(parent: HTMLElement, item: number, size: 'md'): void {
    const i = el('i', `titan-icon ${size}`, parent);
    const idx = item - 1;
    i.style.backgroundImage = `url(${titanHotbarUrl})`;
    i.style.backgroundPosition = `${-(idx % 4) * 32}px ${-((idx / 4) | 0) * 32}px`; // `md` = 32 px fixos (1×): a célula do atlas, sem ampliar
  }
  /** Fabricar: revalida estação, alcance, materiais e espaço **a cada toque**; consome e entrega numa operação só. Falhou → nada muda e o motivo aparece. */
  function doCraft(r: Recipe): void {
    const at = ctxStation();
    if (at && at !== 'personal' && !stationInReach()) { closeStation(`${stationName(at)} fora de alcance`); return; }
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
  /** Estação na mira (Mesa de Trabalho ou Braseiro) ao alcance de uso. */
  const benchAimed = (): { x: number; y: number; z: number; kind: 'workbench' | 'brazier' | 'furnace' | 'chest' | 'bed' | 'door' } | null => {
    if (!target || target.item) return null;
    const id = vol.get(target.x, target.y, target.z), kind = isCraftingTable(id) ? 'workbench' : isBrazier(id) ? 'brazier' : isFurnace(id) ? 'furnace' : isChest(id) ? 'chest' : isBed(id) ? 'bed' : isDoor(id) ? 'door' : null;
    if (!kind) return null;
    return Math.hypot(target.x + 0.5 - session.body.x, target.y + 0.5 - (session.body.y + EYE_HEIGHT), target.z + 0.5 - session.body.z) <= USE_REACH ? { x: target.x, y: target.y, z: target.z, kind } : null;
  };
  /** Toque num espaço do braseiro: com uma pilha da mochila escolhida leva para entrada/combustível; sem escolha (ou na saída) tira para a mochila. */
  function tapFurnace(kind: FurnaceSlot): void {
    if (!stationAt || (stationAt.kind !== 'brazier' && stationAt.kind !== 'furnace')) return;
    if (!stationInReach()) { closeStation(`${stationName(stationAt.kind)} fora de alcance`); return; }
    const { x, y, z } = stationAt;
    if (client) { // na sala o braseiro é do mundo: a sala faz a troca e devolve a bolsa e o estado (ADR 0104)
      const slot = kind !== 'output' && sel !== null ? sel : null;
      sel = null;
      void (slot !== null && kind !== 'output' ? client.furnaceIn(x, y, z, kind, slot) : client.furnaceOut(x, y, z, kind)).then((r) => { if (r.msg) notice(r.msg); refresh(); });
      return;
    }
    const r = kind !== 'output' && sel !== null ? furnaceMoveIn(session, x, y, z, kind, sel) : furnaceTakeOut(session, x, y, z, kind);
    if (r.msg) notice(r.msg);
    if (r.ok) { sel = null; onEdited(); }
    refresh();
  }
  /** Toque num espaço do baú: com uma pilha da mochila escolhida guarda-a (a pilha inteira, tudo ou nada); sem escolha tira a pilha do espaço para a mochila. */
  function tapChest(i: number): void {
    if (!stationAt || stationAt.kind !== 'chest') return;
    if (!stationInReach()) { closeStation('Baú fora de alcance'); return; }
    const { x, y, z } = stationAt;
    if (client) {
      const slot = sel;
      sel = null;
      void (slot !== null ? client.chestIn(x, y, z, slot) : client.chestOut(x, y, z, i)).then((r) => { if (r.msg) notice(r.msg); refresh(); });
      return;
    }
    const r = sel !== null ? chestMoveIn(session, x, y, z, sel) : chestTakeOut(session, x, y, z, i);
    if (r.msg) notice(r.msg);
    if (r.ok) { sel = null; onEdited(); }
    refresh();
  }
  let chestKeyShown = '';
  /** Redesenha os 18 espaços do baú só quando algo mudou; chamado a cada quadro com a tela aberta. */
  function paintChest(): void {
    if (!stationAt || stationAt.kind !== 'chest') return;
    const c = chestAt(session, stationAt.x, stationAt.y, stationAt.z);
    if (!c) return;
    const key = c.map((s) => (s ? `${s.item}:${s.count}:${s.wear ?? 0}` : '-')).join('|');
    if (key === chestKeyShown) return;
    chestKeyShown = key;
    refresh();
  }
  let furnaceKeyShown = '';
  /** Redesenha o painel do braseiro (espaços e barras) só quando algo mudou; chamado a cada quadro com a tela aberta. */
  function paintFurnace(): void {
    if (!stationAt || (stationAt.kind !== 'brazier' && stationAt.kind !== 'furnace')) return;
    fTitle.textContent = stationAt.kind === 'furnace' ? 'Fornalha' : 'Braseiro de Rocha';
    const f = furnaceAt(session, stationAt.x, stationAt.y, stationAt.z);
    if (!f) return;
    const key = `${f.input?.item}:${f.input?.count}|${f.fuel?.item}:${f.fuel?.count}|${f.output?.item}:${f.output?.count}|${Math.round(f.burnLeft)}|${Math.round(f.cook * 4)}`;
    if (key === furnaceKeyShown) return;
    furnaceKeyShown = key;
    const paint = (b: HTMLButtonElement, st: { item: number; count: number } | null): void => {
      const icon = b.querySelector('i') as HTMLElement, count = b.querySelector('em') as HTMLElement;
      b.classList.toggle('empty', !st);
      if (st) { const idx = st.item - 1; icon.style.backgroundImage = `url(${titanHotbarUrl})`; icon.style.backgroundPosition = `calc(${-(idx % 4)} * var(--icm)) calc(${-((idx / 4) | 0)} * var(--icm))`; icon.style.visibility = 'visible'; count.textContent = st.count > 1 ? String(st.count) : ''; b.setAttribute('aria-label', `${ITEM_NAMES[st.item]} × ${st.count}`); }
      else { icon.style.visibility = 'hidden'; count.textContent = ''; b.setAttribute('aria-label', 'vazio'); }
    };
    paint(fIn, f.input); paint(fFuel, f.fuel); paint(fOut, f.output);
    fFlame.style.setProperty('--p', String(f.burnTotal > 0 ? f.burnLeft / f.burnTotal : 0));
    fCook.style.setProperty('--p', String(f.cook / COOK_TIME_S));
    fHint.textContent = f.burnLeft > 0 ? `Carga: ${prepsLeft(f)} ${prepsLeft(f) === 1 ? 'preparação' : 'preparações'} (${f.fuel ? `mais ${f.fuel.count} no combustível` : 'sem combustível reserva'})` : f.fuel ? 'Sem carga acesa: ao cozinhar, uma unidade do combustível é gasta.' : stationAt.kind === 'furnace' ? 'Sem carga. Coloque carvão vegetal, tora ou tábuas no combustível e algo para cozinhar.' : 'Sem carga. Coloque Brasa de Âmbar no combustível e algo para cozinhar.';
  }
  function stationInReach(): boolean {
    if (!stationAt) return false;
    const b = session.body;
    const blk = vol.get(stationAt.x, stationAt.y, stationAt.z);
    return (stationAt.kind === 'workbench' ? isCraftingTable(blk) : stationAt.kind === 'chest' ? isChest(blk) : stationAt.kind === 'furnace' ? isFurnace(blk) : isBrazier(blk)) && Math.hypot(stationAt.x + 0.5 - b.x, stationAt.y + 0.5 - (b.y + EYE_HEIGHT), stationAt.z + 0.5 - b.z) <= USE_REACH + 1.5;
  }
  /** Sono (ADR 0093): `sleepStart` = instante do início (0 = acordado); a noite passa em `SLEEP_APPLY_MS` e o controle volta em `SLEEP_CONTROL_MS`. */
  let sleepPrevMs = -1, lidWasOpen = false;
  let sleepStart = 0, sleepApplied = false, sleepBed: { x: number; y: number; z: number } | null = null;
  function applyBed(x: number, y: number, z: number): void {
    const r = useBed(session, x, y, z);
    if (r.msg) notice(r.msg);
    if (r.ok) { onEdited(); playerDirty = true; }
  }
  function openStation(): void {
    const at = benchAimed();
    if (!at || bagOpen || !playing) return;
    if (client && (at.kind === 'door' || at.kind === 'bed')) { // a sala decide (porta; cama marca o ponto de retorno, sem dormir ainda)
      void client.use(at.x, at.y, at.z).then((r) => { if (r.msg) notice(r.msg); if (r.ok && at.kind === 'door') gameAudio.playDoor(!!r.open); });
      return;
    }
    if (at.kind === 'door') { // a porta abre e fecha na hora, sem tela (ADR 0102)
      const r = useDoor(session, at.x, at.y, at.z);
      if (r.msg) notice(r.msg);
      if (r.ok) { gameAudio.playDoor(!!r.open); onEdited(); }
      return;
    }
    if (at.kind === 'bed') { // a cama não abre tela: marca o ponto de retorno e, à noite, dorme até o amanhecer (ADR 0090)
      if (canSleep(session.time, isRaining(session))) { // à noite (ou na chuva, a partir do pôr do sol): o véu escurece, a noite passa com a tela preta e ele clareia (ADR 0093)
        if (sleepStart) return;
        sleepStart = performance.now(); sleepApplied = false; sleepPrevMs = -1; sleepBed = { x: at.x, y: at.y, z: at.z };
        keys.clear(); gesture.cancel();
        return;
      }
      applyBed(at.x, at.y, at.z);
      return;
    }
    stationAt = { x: at.x, y: at.y, z: at.z, kind: at.kind };
    toggleBag(true);
  }
  function closeStation(msg?: string): void {
    if (msg) notice(msg);
    if (bagOpen) toggleBag(false);
  }
  useBtn.addEventListener('click', openStation);

  /** Come a comida do espaço escolhido (ADR 0060): toque no espaço, tecla Q ou toque no mundo com a comida na mão. */
  function eatSelected(): void {
    const r = eatFromSlot(session, session.selected);
    if (r.msg) notice(r.msg);
    if (r.ok) { gameAudio.playEat(); playerDirty = true; paintVitals(false); refresh(); if (client) { client.syncBag(); client.sendState(); } } // na sala a bolsa e a fome seguem na hora (a comida é local)
  }
  function tapSlot(i: number): void {
    if (i === BENCH_OUT) { takeBench(); return; }
    if (!bagOpen || cat !== 'bag') { if (i < HOTBAR) { if (i === session.selected && !bagOpen && foodOf(inv.get(i)?.item ?? 0)) eatSelected(); else select(i); } return; } // tocar de novo no espaço de comida escolhido: come // só em "Bolsa" os toques movem itens
    if (sel === null) { if (inv.get(i)) sel = i; }
    else if (sel === i) sel = null;
    else { if (!inv.move(sel, i)) notice('Não dá para mover para lá'); sel = null; }
    refresh();
  }

  /** Recolhe a saída da bancada 3 × 3: revalida a mesa e o alcance **a cada toque**; consome os ingredientes e entrega o resultado juntos; se falhar, tudo continua na grade. */
  function takeBench(): void {
    if (stationAt && !stationInReach()) { closeStation(`${stationName(stationAt.kind)} fora de alcance`); return; } // fechar devolve a grade à bolsa
    const r = inv.benchRecipe();
    const res = inv.takeBenchResult(ctxStation());
    if (res === 'ok') { notice(`Fabricado: ${r!.result.count > 1 ? `${r!.result.count} × ` : ''}${r!.name}`); onEdited(); }
    else notice(res === 'full' ? 'Mochila cheia: libere espaço para o resultado' : res === 'station' ? (r?.station === 'brazier' ? 'Precisa de um Braseiro aceso' : 'Precisa da Mesa de Trabalho') : 'Monte uma receita primeiro');
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
      inv.returnCraft(); // legado: posições da antiga grade 2 × 2
      if (inv.returnBench() > 0) notice('Sem espaço: os itens ficam na grade 3 × 3');
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
  // ---- Vista (ADR 0106): primeira pessoa ou isométrica 2:1 (blocos de 8 × 8 px, câmera em 4 vistas de 90°) ----
  let iso = false;
  try { iso = window.localStorage.getItem('orvalis-titan-visao') === 'iso'; } catch { /* sem armazenamento */ }
  if (q.get('visao') === 'iso') iso = true; else if (q.get('visao') === 'pessoa') iso = false; // atalho de teste
  let isoQuarter = isoQuarterOf(session.yaw), isoYaw = isoYawOf(isoQuarter), facing = session.yaw;
  const viewBtn = el('button', 'titan-btn', menu); viewBtn.type = 'button'; menu.prepend(viewBtn); // o primeiro botão do canto superior direito
  const rotL = el('button', 'titan-btn titan-rot', menu, '⟲'), rotR = el('button', 'titan-btn titan-rot', menu, '⟳');
  rotL.type = rotR.type = 'button'; rotL.title = 'Girar a câmera (Z)'; rotR.title = 'Girar a câmera (X)';
  menu.insertBefore(rotL, viewBtn.nextSibling); menu.insertBefore(rotR, rotL.nextSibling);
  const paintView = (): void => { viewBtn.textContent = `Visão: ${iso ? 'isométrica' : '1ª pessoa'}`; rotL.hidden = rotR.hidden = !iso; document.body.classList.toggle('titan-iso', iso); };
  paintView();
  if (iso) view.setViewMode('iso');
  /** Gira a câmera isométrica um quarto de volta (+1 anti-horário visto de cima, −1 horário); a transição é suave e só nas vistas de 90° o losango é 2:1 exato. */
  const rotateIso = (dir: 1 | -1): void => { if (iso) isoQuarter += dir; };
  rotL.addEventListener('click', () => rotateIso(1)); rotR.addEventListener('click', () => rotateIso(-1));
  viewBtn.addEventListener('click', () => setIso(!iso)); viewBtn.title = 'Alternar a vista (V)';
  const soundBtn = el('button', 'titan-btn', menu); // mudo: lembrado neste aparelho (localStorage pode falhar: o jogo não depende dele)
  soundBtn.type = 'button';
  try { gameAudio.muted = window.localStorage.getItem('orvalis-titan-som') === 'off'; } catch { /* sem armazenamento */ }
  const paintSound = (): void => { soundBtn.textContent = `Som: ${gameAudio.muted ? 'desligado' : 'ligado'}`; };
  paintSound();
  soundBtn.addEventListener('click', () => {
    gameAudio.muted = !gameAudio.muted;
    try { window.localStorage.setItem('orvalis-titan-som', gameAudio.muted ? 'off' : 'on'); } catch { /* sem armazenamento */ }
    paintSound();
    if (!gameAudio.muted) gameAudio.playItemPickup(); // confirma que o som voltou
  });
  // Lista de salas (ADR 0104): o botão mostra quantos jogam agora (`GET /salas`, a cada 20 s); dentro da sala, quantos estão aqui; com a conexão perdida, oferece reconectar
  const roomBtn = el('button', 'titan-btn', menu);
  roomBtn.type = 'button';
  roomBtn.hidden = scene || texScene || !firstRoom; // salas por mundo (ADR 0104, 0138)
  let roomCount: { players: number; max: number } | null = null, roomLost = false, roomSupported = true;
  const paintRoomBtn = (): void => {
    const max = roomCount?.max ?? TITAN_MAX_PLAYERS;
    roomBtn.disabled = !room && !roomSupported;
    roomBtn.textContent = !room && !roomSupported ? `Salas do ${orvalis ? 'Orvalis' : 'Titã'}: servidor sem suporte ainda` : roomLost ? 'Reconectar à sala' : room ? `Sair da sala (${(client?.remotes.size ?? 0) + 1}/${max})` : `Jogar na sala: ${firstRoom.name}${roomCount ? ` (${roomCount.players}/${roomCount.max})` : ''}`;
  };
  paintRoomBtn();
  if (!scene && !room && onlineAvailable(window.location.hostname)) { // fora do site oficial o servidor recusa a conexão: não consulta
    const poll = (): void => { void fetchRoomCounts().then((c) => { roomCount = c?.[firstRoom.id] ?? null; roomSupported = c === null || !!c[firstRoom.id]; paintRoomBtn(); }); }; // /salas respondeu sem a sala do Titã = o servidor ainda não a tem
    poll(); window.setInterval(poll, 20000);
  }
  roomBtn.addEventListener('click', () => { if (roomLost) { window.location.reload(); return; } const u = new URL(window.location.href); if (room) { u.searchParams.delete('sala'); u.searchParams.delete('loopback'); } else u.searchParams.set('sala', String(firstRoom.id)); window.location.assign(u); });
  const newBtn = el('button', 'titan-btn', menu, 'Nova partida');
  if (scene || texScene || room) newBtn.hidden = true;
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

  /** O alvo no formato da rede (sem os campos só do aparelho). */
  const wireHit = (t: Hit): WireHit => ({ x: t.x, y: t.y, z: t.z, nx: t.nx, ny: t.ny, nz: t.nz, ...(t.hy !== undefined ? { hy: t.hy } : {}), ...(t.item !== undefined ? { item: t.item } : {}) });
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
  // modo de mira no toque (ADR 0076): 'dedo' = a ação é no ponto tocado (padrão, ADR 0075); 'central' = mira + no centro e arrastar só gira (como no PC); lembrado no aparelho
  let aimMode: 'dedo' | 'central' = 'dedo';
  try { if (window.localStorage.getItem('orvalis-titan-mira') === 'central') aimMode = 'central'; } catch { /* sem armazenamento */ }
  const aimBtn = el('button', 'titan-btn', menu);
  aimBtn.type = 'button'; aimBtn.hidden = !coarse;
  const fingerMode = (): boolean => iso || (coarse && aimMode === 'dedo'); // na isométrica a ação é sempre no ponto do mouse ou do dedo
  const paintAim = (): void => { aimBtn.textContent = `Mira: ${aimMode === 'dedo' ? 'no dedo' : 'central'}`; document.body.classList.toggle('titan-aim-finger', fingerMode()); };
  paintAim();
  aimBtn.addEventListener('click', () => {
    aimMode = aimMode === 'dedo' ? 'central' : 'dedo';
    try { window.localStorage.setItem('orvalis-titan-mira', aimMode); } catch { /* sem armazenamento */ }
    fingerNdc = null; touchRing.hidden = true; paintAim();
  });
  const start = el('div', 'titan-start', ui);
  const box = el('div', '', start);
  el('h1', '', box, orvalis ? 'Orvalis' : 'Titã');
  el('p', '', box, session.resumed ? 'Sua partida foi encontrada. Continue de onde parou.' : orvalis ? 'Uma ilha de campos, bosques de sakura e rios, cercada de mar.' : 'Uma costa de areia ocre e um lago escuro sob a névoa da tarde.');
  el('p', '', box, coarse ? 'Joystick: andar (empurre até o fim para correr) · toque curto onde quiser coloca, segurar quebra (o anel mostra o progresso), arrastar gira a câmera · "Mira" no menu troca para a mira central · botão ⤒ pula · ☰ abre a bolsa.' : 'WASD anda · Espaço pula · mouse olha · clique curto coloca, segurar quebra · 1–9 ou roda troca o bloco · E ou ☰ abre a bolsa.');
  const go = el('button', 'titan-btn', box, session.resumed ? 'Continuar' : 'Começar');
  go.type = 'button';
  let playing = false;
  const begin = (): void => {
    playing = true;
    start.hidden = true;
    if (!coarse && !iso) void canvas.requestPointerLock?.(); // na isométrica o cursor fica livre (a mira é o ponto do mouse)
  };
  go.addEventListener('click', begin);
  canvas.addEventListener('click', () => { if (!coarse && !iso && !document.pointerLockElement) begin(); });
  document.addEventListener('pointerlockchange', () => { if (!coarse && !iso && !document.pointerLockElement && playing && !bagOpen) { playing = false; start.hidden = false; go.textContent = 'Continuar'; } });
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
    if (e.code === 'KeyQ' && playing && !bagOpen) eatSelected();
    if (iso && playing && !bagOpen) { if (e.code === 'KeyZ') rotateIso(1); else if (e.code === 'KeyX') rotateIso(-1); } // girar a câmera isométrica
    if (e.code === 'KeyV' && playing && !bagOpen) setIso(!iso); // alternar a vista sem soltar o mouse (V)
    if (e.code === 'Escape' && bagOpen) toggleBag(false);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); gesture.cancel(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') gesture.cancel(); });
  // mouse capturado: clique primário curto coloca, segurar quebra (ADR 0042); o movimento relativo da mira conta como arrasto; o botão direito não faz nada
  let mouseAcc = 0;
  let isoDown = { x: 0, y: 0 }; // onde o mouse foi pressionado na isométrica (o arrasto cancela a ação)
  const mouseNdc = (e: MouseEvent): void => { // o ponto do mouse sobre o canvas em −1…1 (fora do canvas, ou sobre a interface, não há alvo)
    const r = canvas.getBoundingClientRect();
    fingerNdc = e.target === canvas ? { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -(((e.clientY - r.top) / r.height) * 2 - 1) } : null;
  };
  document.addEventListener('mousemove', (e) => {
    if (iso && !coarse) { mouseNdc(e); if (gesture.activePointer === 'mouse') gesture.drag('mouse', Math.hypot(e.clientX - isoDown.x, e.clientY - isoDown.y)); return; }
    if (!document.pointerLockElement) return;
    look(e.movementX * 0.0022, e.movementY * 0.0022);
    if (gesture.activePointer === 'mouse') { mouseAcc += Math.hypot(e.movementX, e.movementY); gesture.drag('mouse', mouseAcc); }
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('selectstart', (e) => { if ((e.target as HTMLElement | null)?.tagName !== 'INPUT') e.preventDefault(); }); // pressionar e segurar no celular não pode virar seleção de texto (o jogo não tem campos de texto)
  canvas.addEventListener('mousedown', (e) => {
    if ((!document.pointerLockElement && !(iso && !coarse && playing)) || bagOpen || e.button !== 0) return;
    if (iso) { mouseNdc(e); isoDown = { x: e.clientX, y: e.clientY }; computeAim(); } // o alvo é o que está sob o mouse agora
    mouseAcc = 0;
    gesture.press('mouse', e.timeStamp, toTarget(target)); // o tempo vem do evento (monotônico), não do quadro
  });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) gesture.release('mouse', e.timeStamp, toTarget(target)); });
  window.addEventListener('wheel', (e) => { if ((document.pointerLockElement || (iso && playing)) && !bagOpen && e.deltaY) select(session.selected + (e.deltaY > 0 ? 1 : -1)); }, { passive: true });
  function look(dx: number, dy: number): void {
    if (iso) return; // a câmera isométrica só gira em passos de 90° (botões ⟲ ⟳ ou Z/X)
    session.yaw -= dx;
    session.pitch = Math.max(-1.55, Math.min(1.55, session.pitch - dy));
    playerDirty = true;
  }
  /** Alterna entre a primeira pessoa e a isométrica 2:1 (botão do menu, ADR 0106): a escolha fica lembrada neste aparelho; o giro da isométrica parte da vista de 90° mais próxima do olhar atual. */
  function setIso(on: boolean): void {
    if (on === iso) return;
    iso = on;
    try { window.localStorage.setItem('orvalis-titan-visao', iso ? 'iso' : 'pessoa'); } catch { /* sem armazenamento */ }
    gesture.cancel(); fingerNdc = null; touchRing.hidden = true; keys.clear();
    if (iso) { // o cursor fica livre; a vista parte do quarto de volta mais perto do olhar de agora
      if (document.pointerLockElement) document.exitPointerLock();
      isoQuarter = isoQuarterOf(session.yaw); isoYaw = session.yaw; facing = session.yaw;
    } else if (playing && !coarse) void canvas.requestPointerLock?.(); // volta ao mouse capturado (o clique no botão é o gesto que o permite)
    view.setViewMode(iso ? 'iso' : 'fp');
    paintView(); paintAim(); computeAim();
  }

  // toque (paisagem; ainda sem validação em aparelho real — NEXT_STEPS)
  const touch = el('div', 'titan-touch', ui);
  const lookPad = el('div', 'titan-look', touch); // a tela toda (menos os controles, que ficam por cima): o dedo age no ponto tocado (ADR 0075)
  touch.addEventListener('contextmenu', (e) => e.preventDefault()); // segurar não abre o menu do navegador (ADR 0077)
  const touchRing = el('div', 'titan-touchring', touch); // anel no ponto do toque: azul ao tocar, enche ao quebrar
  touchRing.hidden = true;
  // joystick analógico (ADR 0075, revisto na ADR 0081): arrastar o miolo anda; empurrar até o fim para a frente por 0,2 s liga a corrida
  const stick = el('div', 'titan-stick', touch); const knob = el('i', '', stick);
  let stickId = -1;
  let fwdSince = 0; // instante em que o joystick passou a ficar todo para a frente (0 = fora dessa posição)
  const moveStick = (e: PointerEvent): void => {
    const r = stick.getBoundingClientRect();
    let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
    input.stickX = dx; input.stickY = dy; knob.style.transform = `translate(${dx * 36}px, ${dy * 36}px)`;
    if (dy <= -0.85) { if (!fwdSince) fwdSince = performance.now(); } else fwdSince = 0;
  };
  const endStick = (e: PointerEvent): void => { if (e.pointerId !== stickId) return; stickId = -1; fwdSince = 0; input.stickX = input.stickY = 0; knob.style.transform = ''; };
  stick.addEventListener('pointerdown', (e) => { if (stickId >= 0) return; e.preventDefault(); stickId = e.pointerId; stick.setPointerCapture(e.pointerId); moveStick(e); });
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) moveStick(e); });
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) stick.addEventListener(t, endStick);
  const acts = el('div', 'titan-acts', touch);
  // Colocar e quebrar não têm mais botões: a área de interação (metade direita) coloca ao tocar e quebra ao segurar; arrastar gira a câmera
  const mk = (txt: string): HTMLButtonElement => { const b = el('button', 'titan-btn', acts, txt); b.type = 'button'; return b; };
  const bJump = mk('⤒'); bJump.classList.add('jump'); bJump.setAttribute('aria-label', 'Pular'); // seta para cima, como o Minecraft de toque; a bolsa abre pelo ☰ ao lado da hotbar
  const hold = (b: HTMLElement, on: () => void, off: () => void): void => {
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); on(); });
    for (const t of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) b.addEventListener(t, off);
  };
  hold(bJump, () => { input.jump = true; }, () => { input.jump = false; });
  // área de interação do toque (a tela toda, ADR 0075): a ação acontece **onde o dedo toca** (sem mirar o centro): toque curto coloca, segurar quebra (anel de progresso no dedo), arrastar gira a câmera (zona morta de 10 px: sem girar enquanto ainda pode ser toque)
  let lookId = -1, lx = 0, ly = 0, sx = 0, sy = 0, exceeded = false;
  const setFinger = (e: PointerEvent): void => {
    const r = canvas.getBoundingClientRect();
    fingerNdc = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -(((e.clientY - r.top) / r.height) * 2 - 1) };
    touchRing.style.left = `${e.clientX}px`; touchRing.style.top = `${e.clientY}px`;
  };
  lookPad.addEventListener('pointerdown', (e) => {
    if (lookId >= 0 || !playing || bagOpen) return; // um segundo dedo na área não arma nada
    lookId = e.pointerId; lookPad.setPointerCapture(e.pointerId);
    lx = sx = e.clientX; ly = sy = e.clientY;
    setFinger(e); computeAim(); // o alvo é o que está sob o dedo agora, não o do quadro anterior
    gesture.press(e.pointerId, e.timeStamp, toTarget(target));
    exceeded = gesture.state === 'CAMERA_DRAG'; // sem alvo sob o dedo o gesto é só câmera, sem zona morta
    touchRing.hidden = !fingerMode(); touchRing.style.setProperty('--p', '0');
  });
  lookPad.addEventListener('pointermove', (e) => {
    if (e.pointerId !== lookId) return;
    setFinger(e);
    const dist = Math.hypot(e.clientX - sx, e.clientY - sy);
    gesture.drag(e.pointerId, dist);
    if (!exceeded && dist > DRAG_TOLERANCE_PX) { exceeded = true; lx = e.clientX; ly = e.clientY; } // a câmera passa a girar daqui, sem salto
    if (exceeded) look((e.clientX - lx) * 0.006, (e.clientY - ly) * 0.006);
    lx = e.clientX; ly = e.clientY;
  });
  lookPad.addEventListener('pointerup', (e) => { if (e.pointerId !== lookId) return; lookId = -1; computeAim(); gesture.release(e.pointerId, e.timeStamp, toTarget(target)); endFinger(); });
  // ponteiro cancelado ou captura perdida: limpa o gesto sem agir
  for (const t of ['pointercancel', 'lostpointercapture'] as const) lookPad.addEventListener(t, (e) => { if ((e as PointerEvent).pointerId === lookId) { lookId = -1; gesture.cancel(); endFinger(); } });
  /** Dedo levantado: some o anel e o alvo volta ao nada (no toque não há mira central). */
  function endFinger(): void { fingerNdc = null; touchRing.hidden = true; }

  // ---- Ações: gesto primário (ADR 0042) ----
  let target: Hit | null = null;
  /** Toque (ADR 0075): ponto da tela sob o dedo em −1…1 (`null` = sem dedo: no toque não há alvo nem mira central). */
  let fingerNdc: { x: number; y: number } | null = null;
  /** Recalcula o alvo (bloco, lasca ou animal) e o rótulo: no PC e no tablet sem dedo, o raio do centro da tela; no toque (ADR 0075), o raio que passa pelo dedo, e sem dedo nada. */
  function computeAim(): void {
    const act = playing && !bagOpen, b = session.body, eye = { x: b.x, y: b.y + EYE_HEIGHT, z: b.z };
    // isométrica (ADR 0106): o raio é paralelo ao olhar da câmera e passa pelo ponto do mouse ou do dedo; começa perto do plano do jogador e só vale a até `ISO_REACH` dos olhos dele
    let o = eye, reach = 6, creatureReach = ATTACK_REACH;
    let ray: [number, number, number] | null;
    if (!act) ray = null;
    else if (iso) {
      if (fingerNdc) { const r = isoRay(isoCamera([b.x, b.y + 0.9, b.z], session.yaw, canvas.clientWidth || 2, canvas.clientHeight || 1), fingerNdc.x, fingerNdc.y); o = { x: r.origin[0], y: r.origin[1], z: r.origin[2] }; ray = [r.dir[0], r.dir[1], r.dir[2]]; reach = creatureReach = ISO_RAY_MAX; } else ray = null;
    } else ray = fingerMode() ? (fingerNdc ? rayThrough(session.yaw, session.pitch, fingerNdc.x, fingerNdc.y, (canvas.clientWidth || 2) / (canvas.clientHeight || 1), view.fov) : null) : lookVector(session.yaw, session.pitch);
    if (!ray) { target = null; aimCreature = null; aimFauna = null; } else {
      const [dx, dy, dz] = ray;
      target = raycast(vol, o.x, o.y, o.z, dx, dy, dz, reach, session.items, coarse ? LANTERN_PAD_TOUCH : LANTERN_PAD_MOUSE, aimsLiquid(session.inventory.get(session.selected)?.item)); // balde ou vara na mão: a mira acerta o líquido (ADR 0091, 0133); cheio, é por ele que se olha a cavidade
      if (iso && target && Math.hypot(target.x + 0.5 - eye.x, target.y + 0.5 - eye.y, target.z + 0.5 - eye.z) - 0.5 > ISO_REACH) target = null; // longe demais para alcançar
      const blockDist = target ? Math.max(0, Math.hypot(target.x + 0.5 - o.x, target.y + 0.5 - o.y, target.z + 0.5 - o.z) - 0.5) : Infinity;
      aimCreature = creatureAim(session.creatures, o.x, o.y, o.z, dx, dy, dz, creatureReach, blockDist);
      if (iso && aimCreature) { const c = session.creatures[aimCreature.index]; if (!c || Math.hypot(c.body.x - b.x, c.body.y - b.y, c.body.z - b.z) > ATTACK_REACH) aimCreature = null; } // animal na mira: mais perto que o bloco apontado (ADR 0069)
      aimFauna = session.fauna.length ? faunaAim(session.fauna, o.x, o.y, o.z, dx, dy, dz, creatureReach, blockDist) : null; // fauna de fazenda: a caixa de acerto da Wiki (ADR 0124)
      if (iso && aimFauna) { const c = session.fauna[aimFauna.index]; if (!c || Math.hypot(c.body.x - b.x, c.body.y - b.y, c.body.z - b.z) > ATTACK_REACH) aimFauna = null; }
      if (aimCreature && aimFauna) { if (aimFauna.dist < aimCreature.dist) aimCreature = null; else aimFauna = null; } // vence o mais perto
      if (session.boats.length && !session.boatRide) { // bote na mira (ADR 0137): vence o bloco atrás dele e só perde para um animal mais perto; o toque embarca, segurar recolhe
        const ba = boatAim(session.boats, o.x, o.y, o.z, dx, dy, dz, BOAT_REACH, blockDist), bt = ba ? session.boats[ba.index] : null;
        if (ba && bt && (!aimCreature || ba.dist < aimCreature.dist) && (!aimFauna || ba.dist < aimFauna.dist)) { aimCreature = null; aimFauna = null; target = { x: Math.floor(bt.x), y: Math.floor(bt.y), z: Math.floor(bt.z), nx: 0, ny: 1, nz: 0, item: `bt:${bt.id}` }; }
      }
    }
    const c = aimCreature ? session.creatures[aimCreature.index] : null, fa = aimFauna ? session.fauna[aimFauna.index] : null, txt = c ? `${KINDS[c.kind].name} · ${c.hp}/${KINDS[c.kind].hp}` : fa ? `${FAUNA_KINDS[fa.kind].name}${fa.baby ? ' (filhote)' : fa.love > 0 ? ' ♥' : ''} · ${fa.hp}/${maxHp(fa)}` : null;
    const boatTxt = target?.item?.startsWith('bt:') ? (BOAT_NAMES[session.boats.find((e) => `bt:${e.id}` === target?.item)?.kind ?? 0]) : null, shown = txt ?? boatTxt;
    if (shown !== lastAimText) { lastAimText = shown; if (shown) label.textContent = shown; else refresh(); }
  }
  /** Animal na mira (ADR 0069): vence o bloco que está atrás dele; o toque curto o golpeia. */
  let aimCreature: { index: number; dist: number } | null = null;
  let aimFauna: { index: number; dist: number } | null = null; // fauna de fazenda na mira (ADR 0124)
  let nextAttackAt = 0;
  let boatsDrawn = false;
  let boatJumpHeld = false; // borda do pulo para desembarcar (ADR 0137)
  const toTarget = (h: Hit | null): GestureTarget | null => {
    if (aimFauna) { const c = session.fauna[aimFauna.index]; return c ? { x: Math.floor(c.body.x), y: Math.floor(c.body.y), z: Math.floor(c.body.z), nx: 0, ny: 1, nz: 0, kind: 'creature', item: `f:${aimFauna.index}` } : null; }
    if (aimCreature) { const c = session.creatures[aimCreature.index]; return c ? { x: Math.floor(c.body.x), y: Math.floor(c.body.y), z: Math.floor(c.body.z), nx: 0, ny: 1, nz: 0, kind: 'creature', item: String(aimCreature.index) } : null; }
    if (!h) return null;
    if (h.item) return { x: h.x, y: h.y, z: h.z, nx: h.nx, ny: h.ny, nz: h.nz, hy: h.hy, kind: 'shard', item: h.item };
    const id = vol.get(h.x, h.y, h.z);
    return { x: h.x, y: h.y, z: h.z, nx: h.nx, ny: h.ny, nz: h.nz, hy: h.hy, kind: isCollectBlock(id) ? 'lantern' : 'block', block: id }; // lanterna, Marco e Painel: recolhimento curto, sem rachaduras
  };
  /** Golpe no animal (toque curto): pausa de 0,6 s entre golpes; desgasta a arma; abatido solta carne e placa. */
  function strike(index: number): boolean {
    const nowMs = performance.now();
    if (nowMs < nextAttackAt) return false;
    nextAttackAt = nowMs + ATTACK_COOLDOWN_S * 1000;
    addExhaustion(vitals, EXHAUSTION.attack); // atacar cansa (Wiki, ADR 0130)
    if (client) { // na sala o golpe vai ao servidor, que confere alcance, pausa e espólio (ADR 0104)
      const id = session.creatures[index]?.id;
      if (!id) return false;
      gameAudio.playStrike(); view.swingHand();
      void client.strike(id).then((r) => { if (r.msg) notice(r.msg); refresh(); });
      return true;
    }
    const r = attackCreature(session, index);
    if (!r.ok) return false;
    gameAudio.playStrike();
    view.swingHand();
    if (r.broken) gameAudio.playToolBreak();
    if (r.msg) notice(r.msg);
    if (r.dead) { view.setItems(visibleItems(session)); }
    onEdited(); refresh();
    return true;
  }
  /** Golpe na fauna de fazenda (ADR 0124): mesma pausa e desgaste do golpe no Farejador; o espólio cai no chão. */
  function strikeFauna(index: number): boolean {
    const nowMs = performance.now();
    if (nowMs < nextAttackAt) return false;
    nextAttackAt = nowMs + ATTACK_COOLDOWN_S * 1000;
    addExhaustion(vitals, EXHAUSTION.attack);
    const r = attackFauna(session, index);
    if (!r.ok) return false;
    gameAudio.playStrike();
    view.swingHand();
    if (r.broken) gameAudio.playToolBreak();
    if (r.msg) notice(r.msg);
    if (r.dead) view.setItems(visibleItems(session));
    onEdited(); refresh();
    return true;
  }
  let hitAt = 0; // instante do último golpe de som durante a quebra (0 = nenhum)
  window.addEventListener('pointerdown', () => { gameAudio.unlock(); }, { capture: true, passive: true }); // iOS/Safari só liberam o som dentro de um gesto
  window.addEventListener('keydown', () => { gameAudio.unlock(); }, { capture: true, passive: true });
  const ring = el('div', 'titan-collect', ui); // indicador discreto de recolhimento (lanterna e lasca): anel em volta da mira
  ring.hidden = true;
  const gesture = new InteractionGesture({
    totalMs: (t) => { // com picareta na mão a rocha cede mais depressa e o veio de cobre se quebra (ADR 0063)
      const ms = breakTotalMs(t.kind, t.block, toolAdvantage(session.inventory.get(session.selected)?.item, t.block));
      if (ms === null && t.kind === 'block' && (t.block === T.VEIN_COPPER || t.block === T.EMBER_VEIN)) notice('Só pó nos dedos. Falta uma picareta.');
      return ms;
    },
    // as ações validam espaço antes de mudar mundo e inventário (tudo ou nada); mundo e inventário saem juntos no próximo save
    place: (t) => {
      if (t.kind === 'shard' && t.item?.startsWith('bt:')) { const r = mountBoat(session, t.item.slice(3)); if (r.msg) notice(r.msg); if (r.ok) { view.setBoats(session.boats); refresh(); } return { ok: r.ok }; } // tocar no bote embarca (ADR 0137)
      if (t.kind === 'creature' && t.item?.startsWith('f:')) { // fauna de fazenda: comida da espécie na mão alimenta; qualquer outra coisa golpeia (ADR 0125)
        const fi = Number(t.item.slice(2)), fa = session.fauna[fi], held = session.inventory.get(session.selected);
        if (fa && held && isBreedFood(fa.kind, held.item)) { const r = feedFaunaFromSlot(session, fi); if (r.msg) notice(r.msg); if (r.consumed) { view.swingHand(); onEdited(); refresh(); } return { ok: r.ok }; }
        return { ok: strikeFauna(fi) };
      }
      if (t.kind === 'creature') return { ok: strike(Number(t.item)) };
      if (t.kind === 'block' && isDoor(vol.get(t.x, t.y, t.z)) && benchAimed()) { openStation(); return { ok: true }; } // tocar/clicar na porta (ao alcance) abre ou fecha, com qualquer coisa na mão (ADR 0102)
      if (fingerMode() && t.kind === 'block' && benchAimed()) { openStation(); return { ok: true }; } // no toque, tocar na Mesa ou no Braseiro (ao alcance) abre a estação
      const held = session.inventory.get(session.selected); // antes de gastar a unidade: o som depende do que foi posto
      if (client && !(held && foodOf(held.item))) { // na sala a ação vai ao servidor e só vale com a resposta dele (ADR 0104)
        const b0 = held ? blockOfItem(held.item) : null, bucket = !!held && isBucket(held.item), bucketEmpty = held?.item === Item.BALDE;
        void client.place(wireHit(t), session.selected).then((r) => { if (r.msg) notice(r.msg); if (!r.ok) return; if (bucket) { if (bucketEmpty) gameAudio.playWaterScoop(); else gameAudio.playWaterPour(); } else if (b0 === T.LANTERN) gameAudio.playLanternPlace(); else gameAudio.playBlockPlace(surfaceOf(b0 ?? undefined) ?? 'rock'); refresh(); });
        return { ok: true };
      }
      if (held && foodOf(held.item) && !(held.item === Item.NOZ && t.kind === 'block' && canPlantNut(session, t))) { eatSelected(); return { ok: true }; } // comida na mão: o toque no mundo também come (a noz, só se não houver onde plantá-la)
      const r = placeFromSlot(session, t, session.selected);
      if (r.msg) notice(r.msg);
      if (r.ok) {
        const b = held ? blockOfItem(held.item) : null;
        if (isBoatItem(held?.item)) { gameAudio.playWaterPour(); view.setBoats(session.boats); } // bote na água (ADR 0137)
        else if (held?.item === Item.VARA_PESCA) { if (session.fishing) gameAudio.playWaterPour(); else gameAudio.playWaterScoop(); view.setItems(visibleItems(session)); } // lançar e recolher a linha (ADR 0133)
        else if (held && isBucket(held.item)) { if (held.item === Item.BALDE) gameAudio.playWaterScoop(); else gameAudio.playWaterPour(); } // recolher e despejar têm som de água (ADR 0095)
        else if (b === T.LANTERN) gameAudio.playLanternPlace(); else gameAudio.playBlockPlace(surfaceOf(b ?? undefined) ?? 'rock');
        onEdited(); refresh();
      }
      return { ok: r.ok };
    },
    complete: (t) => {
      if (client) { // quebrar na sala: o servidor confere alcance e regras; o item solto chega por `drops`
        void client.breakAt(wireHit(t)).then((r) => { if (r.msg) notice(r.msg); if (r.ok && t.kind === 'block') { const m = surfaceOf(t.block); if (m) gameAudio.playBreak(m); } });
        return { ok: true };
      }
      const r = breakOrCollect(session, t);
      if (r.msg) notice(r.msg);
      if (r.broken) gameAudio.playToolBreak(); // a ferramenta quebrou (ADR 0067)
      if (r.ok) { if (t.kind === 'block') { addExhaustion(vitals, EXHAUSTION.breakBlock); const m = surfaceOf(t.block); if (m) gameAudio.playBreak(m); } else if (t.kind === 'lantern' && t.block === T.LANTERN) gameAudio.playLanternPickup(); else gameAudio.playItemPickup(); view.setItems(visibleItems(session)); onEdited(); refresh(); } // a lasca de um veio aparece no mesmo quadro
      return { ok: r.ok };
    },
    effect: (t, p, stage) => {
      if (!t) { view.setCrack(null); ring.hidden = true; hitAt = 0; return; }
      if (t.kind === 'block') {
        view.setCrack(t, stage); ring.hidden = true;
        const now = performance.now(); // golpe seco a cada 250 ms enquanto a rocha racha; o primeiro vem junto do primeiro estágio
        const m = surfaceOf(t.block);
        if (m && now - hitAt >= HIT_INTERVAL_MS) { hitAt = now; gameAudio.playHit(m, p); }
      } // rachaduras progressivas só em blocos; sem refazer malha
      else { view.setCrack(null); ring.hidden = false; ring.style.setProperty('--p', String(p)); }
    },
  });

  // ---- Sala (ADR 0104): o aparelho espelha o mundo da sala; o que muda chega por mensagem ----
  if (client) {
    client.events = {
      onWorld: () => { view.setItems(visibleItems(session)); view.setReeds(standingReeds(session)); view.setNuts(standingNuts(session)); view.setCrops(standingCrops(session)); },
      onBag: () => { if (inited) { gameAudio.playItemPickup(); refresh(); } },
      onPlayers: () => { view.setRemotePlayers([...client!.remotes.values()]); paintRoomBtn(); },
      onHurt: (d, kind) => { hurtVitals(vitals, d); onHurt(); notice(kind === 'grande' ? 'O Farejador grande te acertou: 2 corações.' : 'O Farejador pequeno te acertou.'); },
      onRespawn: () => { dying = false; airTop = session.body.y; wasAir = false; steps.reset(); view.setItems(visibleItems(session)); paintVitals(false); refresh(); },
      onClose: (why) => { roomLost = true; paintRoomBtn(); toast(`Sala: ${why}. Use o ☰ para reconectar.`, 60000); },
    };
    view.setRemotePlayers([...client.remotes.values()]);
  }
  let inited = true, lastStateAt = 0, lastBagAt = 0, dying = false;
  // ---- Gravação ----
  let dropFull = false;
  let lastSavedTime = session.time;
  let lastEdit = 0, lastPlayerSave = performance.now(), playerDirty = false, saving: Promise<void> | null = null, failed = false, retryAt = 0;
  const setSave = (txt: string, err = false): void => { if (client) return; saveLine.textContent = txt; saveLine.className = err ? 'err' : ''; };
  function onEdited(): void { lastEdit = performance.now(); setSave('alterações pendentes…'); view.setReeds(standingReeds(session)); view.setNuts(standingNuts(session)); view.setCrops(standingCrops(session)); } // o junco e a planta somem onde se construiu; a colhida perde os frutos
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
  /** Morreu: os itens caem onde estava e o jogador renasce na chegada (ADR 0059). */
  function die(): void {
    if (client) { // na sala a morte solta as pilhas lá; o renascer volta em `respawn` (ADR 0104)
      if (dying) return;
      dying = true;
      void client.die().then((r) => { if (r.ok) notice('Você desmaiou. Seus itens ficaram onde caiu.'); else dying = false; }).catch(() => { dying = false; });
      window.setTimeout(() => { dying = false; }, 4000); // reserva: o renascer (`respawn`) já limpa a espera
      return;
    }
    const n = dieAndRespawn(session);
    airTop = session.body.y; wasAir = false;
    steps.reset();
    view.setItems(visibleItems(session)); onEdited(); refresh();
    paintVitals(false);
    notice(n ? 'Você desmaiou e voltou à chegada. Seus itens ficaram onde caiu.' : 'Você desmaiou e voltou à chegada.');
  }
  const steps = new FootstepClock();
  let lastAimText: string | null = null;
  const fauna = { shown: false, counter: { n: 0 }, moving: new Map<string, boolean>() }; // fauna de fazenda: o que está desenhado e quem anda (estado de execução, ADR 0124)
  let nextScrape = 0; // instante do próximo raspar de pata de um Farejador em investida
  const frame = (now: number): void => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const b = session.body;
    let sleeping = false;
    if (sleepStart) { // véu do sono (ADR 0093)
      const ms = now - sleepStart;
      const cue = sleepCue(sleepPrevMs, ms); sleepPrevMs = ms; // sons do sono (ADR 0096)
      if (cue === 'down') gameAudio.playSleepDown(); else if (cue === 'wake') gameAudio.playWake();
      if (!sleepApplied && ms >= SLEEP_APPLY_MS) { sleepApplied = true; if (sleepBed) applyBed(sleepBed.x, sleepBed.y, sleepBed.z); }
      sleepEl.style.opacity = String(sleepVeil(ms));
      sleeping = ms < SLEEP_CONTROL_MS;
      if (ms >= SLEEP_TOTAL_MS) { sleepStart = 0; sleepEl.style.opacity = '0'; }
    }
    const active = playing && !bagOpen && !sleeping;
    const chestOpen = bagOpen && stationAt?.kind === 'chest';
    view.setOpenChest(chestOpen ? stationAt : null); // a tampa do baú abre com o painel (ADR 0093)
    const lid = lidSound(lidWasOpen, chestOpen); lidWasOpen = chestOpen; // e range ao abrir e bate ao fechar (ADR 0096)
    if (lid === 'open') gameAudio.playChestOpen(); else if (lid === 'close') gameAudio.playChestClose();
    if (iso) { isoYaw = stepIsoYaw(isoYaw, isoYawOf(isoQuarter), dt); session.yaw = isoYaw; } // a câmera isométrica gira em passos de 90° e o andar é relativo a ela
    if (active) {
      let fx = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - input.stickY;
      let sx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + input.stickX;
      const m = Math.hypot(fx, sx);
      if (m > 1) { fx /= m; sx /= m; }
      // frente = (−sin yaw, −cos yaw); direita = (cos yaw, −sin yaw)
      const dirX = -Math.sin(session.yaw) * fx + Math.cos(session.yaw) * sx;
      const dirZ = -Math.cos(session.yaw) * fx - Math.sin(session.yaw) * sx;
      const moved = dirX !== 0 || dirZ !== 0;
      if (iso && moved) facing = Math.atan2(-dirX, -dirZ); // o boneco olha para onde anda
      let px = b.x, pz = b.z;
      const wasOnGround = b.onGround;
      const sprint = canSprint(vitals) && fwdSince > 0 && now - fwdSince >= SPRINT_HOLD_MS && moved && (sprintOn || Math.hypot(b.vx, b.vz) > 1); // com fome ≤ 6 não corre (Wiki, ADR 0130); // joystick todo à frente por 0,2 s: corre enquanto estiver andando (parado ou preso numa parede, a corrida cai)
      sprintOn = sprint; view.setSprint(sprint);
      const ride = session.boatRide, boat = ride ? session.boats.find((e) => e.id === ride.id) : undefined, jumpNow = keys.has('Space') || input.jump;
      if (ride && !boat) session.boatRide = null;
      if (ride && boat) { // a bordo (ADR 0137): W e S remam, A e D giram o leme, pular desembarca; o corpo segue o assento (sem passos, sem queda, sem fôlego gasto na água)
        if (jumpNow && !boatJumpHeld) { dismountBoat(session); notice('Desembarcou'); }
        else { ride.speed = stepBoat(vol, boat, ride.speed, { forward: fx, turn: -sx }, dt); const p = boatSeat(boat); b.x = p.x; b.y = p.y; b.z = p.z; b.vx = b.vy = b.vz = 0; b.onGround = true; b.inLiquid = false; }
        px = b.x; pz = b.z; playerDirty = true; view.setBoats(session.boats);
      } else stepBody(vol, b, { dirX, dirZ, jump: jumpNow, sprint, pitch: iso ? undefined : session.pitch }, dt);
      boatJumpHeld = jumpNow;
      if (wasOnGround && !b.onGround && b.vy > 0) addExhaustion(vitals, sprintOn ? EXHAUSTION.sprintJump : EXHAUSTION.jump); // cansaço: pular e andar gastam fome (ADR 0060)
      addExhaustion(vitals, Math.hypot(b.x - px, b.z - pz) * (sprintOn ? EXHAUSTION.sprintPerBlock : EXHAUSTION.walkPerBlock));
      if (moved || !b.onGround) playerDirty = true;
      // queda: dano = ⌈altura − 3⌉ ao pousar no chão; cair na água não machuca
      if (b.inLiquid || b.onLadder) { airTop = b.y; wasAir = false; } // a água e a escada amortecem
      else if (b.onGround) { if (wasAir) { const d = fallDamage(airTop - b.y); if (d > 0) { hurtVitals(vitals, d); onHurt(); } } airTop = b.y; wasAir = false; }
      else { wasAir = true; airTop = Math.max(airTop, b.y); }
      // ar, regeneração e (sem comida) vida: os olhos dentro do lago gastam o fôlego; sem ar, 1 coração por segundo
      const underwater = eyesSubmerged(b.y + EYE_HEIGHT, vol.get(Math.floor(b.x), Math.floor(b.y + EYE_HEIGHT), Math.floor(b.z)), T.LAKE); // `eyesSubmerged` já conta a planta aquática (ADR 0135)
      const hb = vitals.health;
      updatePlayerVitals(vitals, dt, underwater);
      if (vitals.health < hb) { onHurt(); }
      if (vitals.health !== hb) playerDirty = true;
      paintVitals(underwater);
      if (isDead(vitals)) die();
      if (steps.step(Math.hypot(b.x - px, b.z - pz), b.onGround && !b.inLiquid)) { // um passo a cada ~2,4 blocos no chão; o timbre vem do bloco sob os pés
        const m = surfaceOf(vol.get(Math.floor(b.x), Math.floor(b.y - 0.01), Math.floor(b.z)));
        if (m) gameAudio.playFootstep(m);
      }
    } else { sprintOn = false; view.setSprint(false); if (b.y < 200) stepBody(vol, b, { dirX: 0, dirZ: 0, jump: false }, dt); } // parado: só assenta no chão
    if (session.boats.length || boatsDrawn) { view.setBoats(session.boats); boatsDrawn = session.boats.length > 0; } // os botes acompanham a lista (ADR 0137)
    if (client && playing) { // posição ~10×/s e a bolsa mexida na interface a cada segundo
      if (now - lastStateAt >= 100) { lastStateAt = now; client.sendState(); }
      if (now - lastBagAt >= 1000) { lastBagAt = now; client.syncBag(); }
    }
    // relógio do dia: só corre com o jogo ativo (a aba oculta para os quadros; a tela de pausa também para a hora); a hora forçada só muda a visualização
    if (playing) {
      const before = session.time;
      session.time = advanceDay(session.time, dt);
      if (session.time < before) { session.days++; playerDirty = true; } // virou o dia: o contador vai no save
      if (((session.time - lastSavedTime + 1) % 1) > 0.01) playerDirty = true; // ~12 s de jogo (1/100 do dia de 20 min): grava a hora junto da posição
    }
    if (session.creatures.length) {
      for (const fj of session.creatures) {
        if (!active) break;
        if (fj.phase === 'wander' && Math.hypot(fj.body.x - b.x, fj.body.z - b.z) > SIM_RADIUS) continue; // animal longe e sossegado: não gasta tempo de simulação
        if (client) continue; // na sala os bichos são da sala (mensagem `creatures`); aqui só se desenha
        const ev = stepFarejador(fj, vol, { x: b.x, y: b.y, z: b.z }, dt);
        if (ev.hit) { hurtVitals(vitals, ev.damage); onHurt(); notice(fj.kind === 'grande' ? 'O Farejador grande te acertou: 2 corações.' : 'O Farejador pequeno te acertou.'); }
        if (ev.phase === 'charge' || (fj.phase === 'charge' && now >= nextScrape)) { nextScrape = now + 520; gameAudio.playScrape(); }
      }
      const shown = session.creatures.filter((fj) => Math.hypot(fj.body.x - b.x, fj.body.z - b.z) <= SHOW_RADIUS).sort((p, q) => Math.hypot(p.body.x - b.x, p.body.z - b.z) - Math.hypot(q.body.x - b.x, q.body.z - b.z)).slice(0, SHOW_MAX); // só os mais próximos vão para o desenho (cada rig tem ~24 mil triângulos)
      view.setFarejadores(shown.map((fj) => ({ x: fj.body.x, y: fj.body.y, z: fj.body.z, yaw: fj.yaw, scale: KINDS[fj.kind].scale, pose: farejadorPose(fj, Math.hypot(fj.body.vx, fj.body.vz) > 0.05) })));
    }
    if (active && session.coralWatch.size && stepCoral(session, dt)) onEdited(); // bloco de coral vivo sem água morre (ADR 0136)
    if (active) { const fe = stepFishing(session, dt); if (fe === 'bite') { notice('Fisgou! Toque para recolher'); gameAudio.playWaterPour(); } else if (fe === 'lost') { notice('A linha se soltou'); view.setItems(visibleItems(session)); } } // pescaria (ADR 0133)
    if (session.fauna.length || fauna.shown) { // fauna de fazenda (ADR 0124): passeia perto do viajante e foge ao ser ferida
      for (const fa of session.fauna) {
        if (!active) break;
        if (fa.phase === 'wander' && Math.hypot(fa.body.x - b.x, fa.body.z - b.z) > FAUNA_SIM_RADIUS) continue;
        fauna.moving.set(fa.id, stepFauna(fa, vol, dt).moving);
      }
      if (active) { const born = tickBreeding(session.fauna, fauna.counter); if (born.length) { session.metaRev++; notice('Nasceu um filhote'); } }
      const near = session.fauna.filter((fa) => Math.hypot(fa.body.x - b.x, fa.body.z - b.z) <= FAUNA_SHOW_RADIUS).sort((p, q) => Math.hypot(p.body.x - b.x, p.body.z - b.z) - Math.hypot(q.body.x - b.x, q.body.z - b.z)).slice(0, FAUNA_SHOW_MAX);
      view.setFauna(near.map((fa) => ({ kind: fa.kind, x: fa.body.x, y: fa.body.y, z: fa.body.z, yaw: fa.yaw, scale: fa.baby ? BABY_SCALE : 1, pose: faunaPose(fa, fauna.moving.get(fa.id) ?? false) })));
      fauna.shown = near.length > 0;
    }
    if (!client && playing && session.furnaces.size && tickFurnaces(session, dt)) { onEdited(); if (bagOpen) refresh(); } // o braseiro corre com a tela aberta ou fechada (só não com o jogo parado)
    if (!client && playing && tickWeather(session, dt, Math.random)) playerDirty = true; // a chuva liga e desliga sozinha (ADR 0118); na sala é do servidor
    if (bagOpen) { paintFurnace(); paintChest(); }
    if (!client && active && session.respawn.size) tickRespawn(session, dt); // o animal abatido volta à toca depois de um tempo
    if (!client && active && session.crops.size && tickCrops(session, dt, Math.random, b)) { view.setCrops(standingCrops(session)); playerDirty = true; } // o junco cultivado cresce por sorteio (ADR 0083)
    if (!client && active && session.regrow.size && tickRegrow(session, dt)) { view.setNuts(standingNuts(session)); playerDirty = true; } // a planta colhida volta a dar frutos
    if (!client && playing && session.drops.size) {
      // lascas soltas por veios: coleta por proximidade (mochila cheia deixa a lasca no lugar, com um aviso por aproximação)
      const c = collectNearby(session, b.x, b.y, b.z, dt);
      if (c.collected || c.moved) { view.setItems(visibleItems(session)); if (c.collected) { gameAudio.playItemPickup(); onEdited(); refresh(); } }
      if (c.full && !dropFull) notice('Mochila cheia');
      dropFull = c.full;
    }
    rainLevel = smoothRain(rainLevel, forcedRain || isRaining(session), dt);
    view.setSky(forcedHour ?? session.time, rainLevel, session.days);
    gameAudio.setRain(rainLevel);
    view.setSaturn(orvalis ? 0 : forcedSaturn ?? saturnVisibility(session.days, forcedHour ?? session.time, session.seed)); // raro: poucos dias, janela curta
    skyLine.textContent = forcedHour !== null ? `hora fixa: ${phaseName(forcedHour)} (teste, não é gravada)` : phaseName(session.time) + (isRaining(session) || forcedRain ? ' · chuva' : '');
    if (autoEdit && now > nextAuto) { nextAuto = now + 120; autoEditStep(session, spots, autoStep++); } // estresse de luz + malha (só na cena de teste)
    const eye = { x: b.x, y: b.y + EYE_HEIGHT + (b.stepSmooth ?? 0), z: b.z }; // só a câmera desliza ao subir degrau (ADR 0103); a mira segue a física
    computeAim();
    if (fingerMode()) { // anel no dedo: enche enquanto quebra (ADR 0075)
      touchRing.classList.toggle('on', gesture.state === 'ARMED' || gesture.state === 'BREAKING' || gesture.state === 'ATTACKING');
      touchRing.style.setProperty('--p', String(gesture.progress));
    }
    useBtn.hidden = fingerMode() || !(active && benchAimed()); // mirar na mesa, dentro do alcance, oferece "Usar" (no toque, tocar na estação a abre)
    if (stationAt && bagOpen && !stationInReach()) closeStation(isCraftingTable(vol.get(stationAt.x, stationAt.y, stationAt.z)) || isBrazier(vol.get(stationAt.x, stationAt.y, stationAt.z)) || isFurnace(vol.get(stationAt.x, stationAt.y, stationAt.z)) || isChest(vol.get(stationAt.x, stationAt.y, stationAt.z)) ? `${stationName(stationAt.kind)} fora de alcance` : 'A estação sumiu');
    if (active) gesture.update(now, toTarget(target)); else gesture.cancel(); // mochila aberta ou pausa: o gesto em andamento é cancelado
    view.setHeld(session.inventory.get(session.selected)?.item ?? null);
    view.setHandMotion(Math.hypot(b.vx, b.vz), b.onGround, active && gesture.state === 'BREAKING'); // golpe no animal: cada golpe (`strike`) dispara o seu balanço, no ritmo da pausa entre golpes
    if (iso) view.setAvatar(b.x, b.y, b.z, facing);
    view.render(eye, session.yaw, session.pitch, aimCreature ? null : target, now / 1000);
    veil.style.opacity = String(view.submersion); // 0 fora d'água; entra e sai em ~150 ms
    cross.hidden = !active;
    posLine.textContent = `x ${b.x.toFixed(1)} · y ${b.y.toFixed(1)} · z ${b.z.toFixed(1)}`;
    // autosave: pequena espera depois de editar; posição de tempos em tempos; nova tentativa após falha
    if (!saving) {
      if (failed ? now >= retryAt : ((vol.hasDirty || hasPendingState(session)) && now - lastEdit > AUTOSAVE_AFTER_EDIT_MS) || (playerDirty && now - lastPlayerSave > AUTOSAVE_PLAYER_MS)) void saveNow();
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  if (import.meta.env.DEV) (window as unknown as { __titan: unknown }).__titan = { client, session, view, vol, storage, saveNow, begin, toggleBag, refresh, perf, gesture, get target() { return target; } };
}
