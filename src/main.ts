import { DEFAULT_SUBDIV, SUBDIV } from './config';
import { TitleScreen } from './game/title';
import './style.css';
import { Game } from './game/game';
import { HERO_BODIES, type HeroBody } from './game/entities';
import { SaveStore } from './game/save';
import { loadArtPack } from './render/art';
import { loadBlockArt, loadMaterialsV2 } from './render/blockArt';
import { blocksV2FromSearch } from './render/materialsV2';
import { resolveWorldId, WORLD_PROFILES } from './world/profiles';
import { chooseWorldRenderer, useSolidPhysics } from './render/rendererChoice';
import { parseWallThickness } from './world/walls';
import { parseAmbient } from './render/lighting';
import { ScreenMode } from './game/screenMode';
import { seedFromString } from './world/random';
import { NetSession } from './net/session';
import type { RendererFactory } from './render/rendererContract';
import { fetchRoomCounts, GAME_SITE, onlineAvailable, SocketTransport } from './net/socket';

let canvas = document.getElementById('world') as HTMLCanvasElement;
/** Um canvas que recebeu contexto 2D não aceita WebGL (e vice-versa): cada Game ganha um canvas novo, senão a vitrine
 *  do título (2D) travava a entrada no 3D até reiniciar. */
function freshCanvas(): HTMLCanvasElement {
  const next = document.createElement('canvas');
  next.id = canvas.id;
  next.className = canvas.className;
  const style = canvas.getAttribute('style');
  if (style) next.setAttribute('style', style);
  canvas.replaceWith(next);
  canvas = next;
  return next;
}
const screenMode = new ScreenMode();
// Mundo: fixo no build (VITE_WORLD, artefato próprio) → subdomínio → ?mundo= → principal.
const baseProfile = WORLD_PROFILES[resolveWorldId(window.location.hostname, window.location.search, import.meta.env.VITE_WORLD)];
/** Protótipo da grade fina (ADR 0032; só dev, `?grade=2`): mesmo mundo, sem salvar e sem sala. */
const gridProto = SUBDIV !== DEFAULT_SUBDIV && baseProfile.id === 'principal';
const profile = baseProfile;
document.title = profile.name;
let game: Game | null = null;
/** Renderer 2.5D carregado sob demanda (Santuário; Mundo só em desenvolvimento com `?render=3d`): sem Three.js no pacote do principal. */
let threeRendererFactory: RendererFactory | undefined;
/** Física sem degrau do jogador: só no Mundo com o renderer 3D (ADR 0031, M6) e sem `?fisica=degrau`. O Santuário tem a regra dele. */
const solidPhysics = (): boolean => profile.id === 'principal' && !!threeRendererFactory && useSolidPhysics(window.location.search, '3d');
/** Salvamento automático deste mundo (um por seed; o último jogado continua ao abrir sem ?seed=). */
const store = new SaveStore(profile.id, gridProto ? null : undefined);
const randomSeed = (): number => Math.floor(Math.random() * 2 ** 31);
/** Mundo jogado sozinho (volta para ele ao sair da sala). */
let soloSeed = 0;

// ---- Multiplayer (ADR 0016): só no mundo principal ----
const NAME_KEY = 'mundoblocos:nome';
const savedName = (): string => { try { return localStorage.getItem(NAME_KEY) ?? ''; } catch { return ''; } };
const online = profile.id === 'principal' && !gridProto ? {
  get name() { return savedName(); },
  // Artifact e prévias: o servidor recusa a conexão; o menu mostra o link do site em vez de botões que falhariam.
  available: onlineAvailable(window.location.hostname),
  site: GAME_SITE,
  counts: fetchRoomCounts,
  onJoin: (name: string, room: number) => goOnline(name, room),
  onLeave: () => leaveRoom('Você saiu da sala'),
} : undefined;
let net: NetSession | null = null;

/** Espera pela sala antes de desistir de uma tentativa (s): o servidor pode estar acordando/reiniciando. */
const CONNECT_TIMEOUT_MS = 10_000;
/** Tentativa em andamento (uma por vez: um novo toque em criar/entrar cancela a anterior). */
let connecting: { session: NetSession; timer: number } | null = null;

/**
 * Conecta ao servidor e entra numa sala fixa (`ROOMS`); o jogo troca para o mundo da sala no `welcome`.
 * Sem resposta em `CONNECT_TIMEOUT_MS` (ou conexão que cai antes da sala), tenta mais uma vez sozinho e, se de novo
 * nada, avisa — a conexão nunca fica presa em "Conectando…".
 */
function goOnline(name: string, room: number, attempt = 1): void {
  try { localStorage.setItem(NAME_KEY, name); } catch { /* sem armazenamento: só não lembra o nome */ }
  if (connecting) { clearTimeout(connecting.timer); connecting.session.onClose = null; connecting.session.leave(); }
  const s = new NetSession(new SocketTransport());
  const giveUp = () => {
    if (connecting?.session !== s) return;
    clearTimeout(connecting.timer);
    connecting = null;
    s.onClose = null;
    s.leave();
    if (attempt === 1) {
      game?.notify('Conectando… (tentando de novo)');
      goOnline(name, room, 2);
    } else game?.notify('O servidor não respondeu. Tente de novo em instantes.');
  };
  connecting = { session: s, timer: window.setTimeout(giveUp, CONNECT_TIMEOUT_MS) };
  s.onError = (message) => {
    if (connecting?.session === s) { clearTimeout(connecting.timer); connecting = null; }
    if (net === s) { game?.notify(message); return; }
    game?.notify(message); // entrada recusada: continua no mundo de antes
    s.onClose = null;
    s.leave();
  };
  s.onClose = () => {
    if (net === s) leaveRoom('Conexão com a sala perdida');
    else giveUp();
  };
  s.onWelcome = (seed) => {
    if (connecting?.session === s) { clearTimeout(connecting.timer); connecting = null; }
    net = s;
    // Mesmo personagem do jogo sozinho.
    const body = game?.entities.body;
    game?.destroy(); // salva o mundo de antes
    game = new Game(freshCanvas(), seed, screenMode, profile, { net: s, online, body, rendererFactory: threeRendererFactory, solidPhysics: solidPhysics(), notice: `${s.roomName} · tudo o que se faz aqui fica salvo` });
    if (import.meta.env.DEV) (window as unknown as { __game: Game }).__game = game;
  };
  // Como os outros vão me ver: o mesmo personagem do jogo.
  s.join(name, room, { body: game?.entities.body ?? 'heroine' });
}

/** Sai da sala e volta ao mundo que estava jogando sozinho (salvo). */
function leaveRoom(notice: string): void {
  const s = net;
  net = null;
  game?.sendBag(true); // a bolsa vai para a sala antes de fechar a conexão
  if (s) { s.onClose = null; s.leave(); }
  start(soloSeed, notice);
}

/** Abre um mundo (salvo, se houver). `body` = personagem de um mundo novo; sem ele, o do jogo que estava aberto. */
function start(seed: number, notice?: string, body?: HeroBody): void {
  soloSeed = seed;
  const keepBody = body ?? game?.entities.body ?? 'heroine';
  game?.destroy(); // salva o mundo que estava aberto
  const url = new URL(window.location.href);
  url.searchParams.set('seed', String(seed));
  window.history.replaceState(null, '', url);
  game = new Game(freshCanvas(), seed, screenMode, profile, {
    save: store.load(seed),
    store,
    body: keepBody,
    rendererFactory: threeRendererFactory,
    solidPhysics: solidPhysics(),
    notice,
    online,
    // Novo mundo: abre a escolha de personagem (por cima do jogo; "Voltar" volta ao mundo de antes). Toda seed começa
    // na Cidade do Despertar (igual em todas): o aviso confirma que o mundo é outro.
    onNewWorld: () => chooseCharacterForNewWorld(),
    onRestart: () => {
      const body = game?.entities.body;
      game?.destroy();
      game = null;
      store.clear(seed);
      start(seed, 'Mundo recomeçado do zero', body);
    },
  });
  // Atalho de teste: `?personagem=mila` (ou heroine, hero, hood, gino) escolhe o personagem pronto.
  const fromUrl = new URLSearchParams(window.location.search).get('personagem');
  if (fromUrl && (HERO_BODIES as readonly string[]).includes(fromUrl)) game.entities.body = fromUrl as HeroBody;
  // Só em desenvolvimento: acesso para testes automatizados no navegador.
  if (import.meta.env.DEV) (window as unknown as { __game: Game }).__game = game;
  // Painel de desempenho (`?fps=1`, dev e piloto): FPS, tempo de quadro, GPU e memória; toque = copia o relatório.
  if (new URLSearchParams(window.location.search).get('fps') === '1') void import('./dev/perfHud').then((m) => m.startPerfHud(() => game?.rendererStats ?? null, () => game?.drawTimes ?? { samples: [], count: 0 }));
}

/** "Novo mundo" no menu: escolha de personagem (Heroína, Herói, Hood, Gino ou Mila) e só então o mundo novo. */
function chooseCharacterForNewWorld(): void {
  const title = new TitleScreen({
    canContinue: false,
    name: savedName(),
    creatorOnly: true,
    onBack: () => title.destroy(),
    onContinue: () => title.destroy(),
    onStart: (name, body) => {
      if (name) try { localStorage.setItem(NAME_KEY, name); } catch { /* sem armazenamento */ }
      title.destroy();
      const next = randomSeed();
      start(next, `Novo mundo criado · semente ${next}`, body);
    },
  });
}

/**
 * Tela de entrada com o mundo em vitrine atrás (Cidade do Despertar, igual em toda seed): Novo jogo → montar o
 * personagem → mundo novo; Continuar → último mundo salvo.
 */
function showTitle(): void {
  const last = store.lastSeed();
  const canContinue = last !== null && store.load(last) !== null;
  game = new Game(freshCanvas(), last ?? 1, screenMode, profile, { showcase: true });
  const title = new TitleScreen({
    canContinue,
    name: savedName(),
    onContinue: () => {
      title.destroy();
      start(last!);
    },
    onStart: (name, body) => {
      if (name) try { localStorage.setItem(NAME_KEY, name); } catch { /* sem armazenamento */ }
      title.destroy();
      const seed = randomSeed();
      start(seed, name ? `Bem-vindo a Orvalis, ${name}!` : 'Bem-vindo a Orvalis!', body);
    },
  });
}

const query = new URLSearchParams(window.location.search);
const param = query.get('seed');
// Link direto para um mundo (?seed=), atalho de teste (?personagem=) ou outro mundo (Santuário): entra sem a tela.
const skipTitle = !!param || query.has('personagem') || profile.id !== 'principal' || gridProto;
// Padrão de Materiais V2 (ADR 0023): é o padrão do jogo desde 08/11; `?blocos=legado` volta ao atlas antigo (só para
// comparar) e `?materiais=1` abre a cena de comparação (desenvolvimento).
const materialsScene = import.meta.env.DEV && query.has('materiais');
const blocksV2 = blocksV2FromSearch(window.location.search);
// Pacote de arte do mundo (só a arte dele) → imagens dos blocos (antes de montar chão e cubos) → jogo.
void loadArtPack(profile.id)
  .then(() => loadBlockArt())
  .then(() => loadMaterialsV2(blocksV2))
  .then(async () => {
    // Three.js is now the official Santuário renderer. The exact same Game,
    // save format, two-level construction, actions, player and HUD are kept.
    // The principal world never loads this module (separate Vite chunk).
    // ?render=2d remains a safe fallback for devices without WebGL.
    if (import.meta.env.VITE_WORLD !== 'principal' && profile.id === 'santuario' && query.get('render') !== '2d') {
      const probe = document.createElement('canvas');
      const supported = !!(probe.getContext('webgl2') || probe.getContext('webgl'));
      if (supported) {
        try {
          const mod = await import('./render/sanctuaryThreeRenderer');
          // Vista oblíqua é o padrão (ADR 0026, v0.93.10); `?vista=inclinada` volta à câmera inclinada a 67°.
          const view = query.get('vista') === 'inclinada' ? 'tilt' : 'oblique';
          threeRendererFactory = (target, world) => new mod.SanctuaryThreeRenderer(target, world, { view, wallTest: query.get('paredes') === 'teste', ambient: parseAmbient(query.get('luz')) ?? undefined, wallThickness: parseWallThickness(query.get('espessura')) ?? undefined, testScale: ['atual', 'proposta', 'core', 'grade'].includes(query.get('escala') ?? '') ? (query.get('escala') as 'atual' | 'proposta' | 'core' | 'grade') : undefined });
        } catch (error) {
          console.error('Santuário Three.js: usando renderizador 2D de reserva', error);
        }
      } else console.warn('WebGL indisponível: Santuário usará Canvas 2D.');
    }

    // Mundo em 2.5D (ADR 0031, M6 — a virada): o 3D é o padrão quando há WebGL; `?render=2d` e aparelhos sem WebGL ficam no Canvas 2D
    // (reserva até o M7). Falha ao carregar o módulo também cai no 2D. Online e solo usam o mesmo renderer.
    if (profile.id === 'principal') {
      const probe = document.createElement('canvas');
      const webgl = !!(probe.getContext('webgl2') || probe.getContext('webgl'));
      if (chooseWorldRenderer(window.location.search, webgl) === '3d') {
        try {
          const mod = await import('./render/worldThreeRenderer');
          threeRendererFactory = (target, world) => new mod.WorldThreeRenderer(target, world);
        } catch (error) {
          console.error('Mundo em 3D indisponível: usando o Canvas 2D de reserva', error);
        }
      } else if (!webgl) console.warn('WebGL indisponível: o Mundo usará Canvas 2D.');
    }

    // Só em desenvolvimento (ADR 0022): `?escala=1` abre a cena de comparação de escala com o renderizador real.
    // O `import()` fica dentro de `import.meta.env.DEV`: o build de produção não contém a cena.
    if (import.meta.env.DEV && query.has('escala') && profile.id === 'principal') {
      void import('./dev/scaleScene').then((m) => {
        (window as unknown as { __scaleScene: unknown }).__scaleScene = m.startScaleScene(canvas);
      });
      return;
    }
    // Só em desenvolvimento (ADR 0023): `?materiais=1` põe o atlas legado e os materiais V2 lado a lado.
    if (import.meta.env.DEV && materialsScene) {
      void import('./dev/materialsScene').then((m) => m.showMaterialsScene(canvas));
      return;
    }
    if (skipTitle) start(param ? seedFromString(param) : store.lastSeed() ?? randomSeed());
    else showTitle();
  });
