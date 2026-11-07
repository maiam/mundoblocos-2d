import { lookFromSearch, type ModularLook } from './render/modular';
import { art } from './render/art';
import { TitleScreen } from './game/title';
import './style.css';
import { Game } from './game/game';
import type { HeroBody } from './game/entities';
import { SaveStore } from './game/save';
import { loadArtPack } from './render/art';
import { loadBlockArt } from './render/blockArt';
import { resolveWorldId, WORLD_PROFILES } from './world/profiles';
import { ScreenMode } from './game/screenMode';
import { seedFromString } from './world/random';
import { NetSession } from './net/session';
import { fetchRoomCounts, GAME_SITE, onlineAvailable, SocketTransport } from './net/socket';

const canvas = document.getElementById('world') as HTMLCanvasElement;
const screenMode = new ScreenMode();
// Mundo: fixo no build (VITE_WORLD, artefato próprio) → subdomínio → ?mundo= → principal.
const profile = WORLD_PROFILES[resolveWorldId(window.location.hostname, window.location.search, import.meta.env.VITE_WORLD)];
document.title = profile.name;
let game: Game | null = null;
/** Salvamento automático deste mundo (um por seed; o último jogado continua ao abrir sem ?seed=). */
const store = new SaveStore(profile.id);
const randomSeed = (): number => Math.floor(Math.random() * 2 ** 31);
/** Mundo jogado sozinho (volta para ele ao sair da sala). */
let soloSeed = 0;

// ---- Multiplayer (ADR 0016): só no mundo principal ----
const NAME_KEY = 'mundoblocos:nome';
const savedName = (): string => { try { return localStorage.getItem(NAME_KEY) ?? ''; } catch { return ''; } };
const online = profile.id === 'principal' ? {
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
    const look = game?.entities.look ?? null; // mesma aparência do jogo sozinho
    game?.destroy(); // salva o mundo de antes
    game = new Game(canvas, seed, screenMode, profile, { net: s, online, look, notice: `${s.roomName} · tudo o que se faz aqui fica salvo` });
    if (import.meta.env.DEV) (window as unknown as { __game: Game }).__game = game;
  };
  s.join(name, room);
}

/** Sai da sala e volta ao mundo que estava jogando sozinho (salvo). */
function leaveRoom(notice: string): void {
  const s = net;
  net = null;
  game?.sendBag(true); // a bolsa vai para a sala antes de fechar a conexão
  if (s) { s.onClose = null; s.leave(); }
  start(soloSeed, notice);
}

/** Abre um mundo (salvo, se houver). `look` = aparência de um mundo novo; sem ela, a do jogo que estava aberto. */
function start(seed: number, notice?: string, look?: ModularLook | null, body?: HeroBody): void {
  soloSeed = seed;
  const keepLook = look !== undefined ? look : game?.entities.look ?? null;
  const keepBody = body ?? game?.entities.body ?? 'heroine';
  game?.destroy(); // salva o mundo que estava aberto
  const url = new URL(window.location.href);
  url.searchParams.set('seed', String(seed));
  window.history.replaceState(null, '', url);
  game = new Game(canvas, seed, screenMode, profile, {
    save: store.load(seed),
    store,
    look: keepLook,
    body: keepBody,
    notice,
    online,
    // Novo mundo: abre a escolha de personagem (por cima do jogo; "Voltar" volta ao mundo de antes). Toda seed começa
    // na Cidade do Despertar (igual em todas): o aviso confirma que o mundo é outro.
    onNewWorld: () => chooseCharacterForNewWorld(),
    onRestart: () => {
      const look = game?.entities.look ?? null; // recomeça com a mesma aparência
      const body = game?.entities.body;
      game?.destroy();
      game = null;
      store.clear(seed);
      start(seed, 'Mundo recomeçado do zero', look, body);
    },
  });
  // Atalho de teste (ADR 0017): `?personagem=chibi&tronco=…&pernas=…&pes=…&cabelo=…` troca a aparência.
  const fromUrl = lookFromSearch(window.location.search);
  if (fromUrl) game.entities.look = fromUrl;
  // Só em desenvolvimento: acesso para testes automatizados no navegador.
  if (import.meta.env.DEV) (window as unknown as { __game: Game }).__game = game;
}

/** "Novo mundo" no menu: escolha de personagem (Chibi, Heroína ou Herói) e só então o mundo novo. */
function chooseCharacterForNewWorld(): void {
  const title = new TitleScreen({
    canContinue: false,
    name: savedName(),
    manifest: art().modular?.manifest,
    creatorOnly: true,
    onBack: () => title.destroy(),
    onContinue: () => title.destroy(),
    onStart: (look, name, body) => {
      if (name) try { localStorage.setItem(NAME_KEY, name); } catch { /* sem armazenamento */ }
      title.destroy();
      const next = randomSeed();
      start(next, `Novo mundo criado · semente ${next}`, look, body);
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
  game = new Game(canvas, last ?? 1, screenMode, profile, { showcase: true });
  const title = new TitleScreen({
    canContinue,
    name: savedName(),
    manifest: art().modular?.manifest,
    onContinue: () => {
      title.destroy();
      start(last!);
    },
    onStart: (look, name, body) => {
      if (name) try { localStorage.setItem(NAME_KEY, name); } catch { /* sem armazenamento */ }
      title.destroy();
      const seed = randomSeed();
      start(seed, name ? `Bem-vindo a Orvalis, ${name}!` : 'Bem-vindo a Orvalis!', look, body);
    },
  });
}

const query = new URLSearchParams(window.location.search);
const param = query.get('seed');
// Link direto para um mundo (?seed=), atalho de teste (?personagem=) ou outro mundo (Santuário): entra sem a tela.
const skipTitle = !!param || query.has('personagem') || profile.id !== 'principal';
// Pacote de arte do mundo (só a arte dele) → imagens dos blocos (antes de montar chão e cubos) → jogo.
void loadArtPack(profile.id)
  .then(() => loadBlockArt())
  .then(() => (skipTitle ? start(param ? seedFromString(param) : store.lastSeed() ?? randomSeed()) : showTitle()));
