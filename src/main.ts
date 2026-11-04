import './style.css';
import { Game } from './game/game';
import { SaveStore } from './game/save';
import { loadArtPack } from './render/art';
import { loadBlockArt } from './render/blockArt';
import { resolveWorldId, WORLD_PROFILES } from './world/profiles';
import { ScreenMode } from './game/screenMode';
import { seedFromString } from './world/random';
import { NetSession } from './net/session';
import { SocketTransport } from './net/socket';

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
  onCreate: (name: string) => goOnline(name),
  onJoin: (name: string, code: string) => goOnline(name, code),
  onLeave: () => leaveRoom('Você saiu da sala'),
} : undefined;
let net: NetSession | null = null;

/** Conecta ao servidor e entra (com código) ou cria uma sala; o jogo troca para o mundo da sala no `welcome`. */
function goOnline(name: string, code?: string): void {
  try { localStorage.setItem(NAME_KEY, name); } catch { /* sem armazenamento: só não lembra o nome */ }
  const s = new NetSession(new SocketTransport());
  s.onError = (message) => {
    if (net === s) { game?.notify(message); return; }
    game?.notify(message); // entrada recusada: continua no mundo de antes
    s.onClose = null;
    s.leave();
  };
  s.onClose = () => {
    if (net === s) leaveRoom('Conexão com a sala perdida');
    else game?.notify('Não foi possível conectar ao servidor.');
  };
  s.onWelcome = (seed) => {
    net = s;
    game?.destroy(); // salva o mundo de antes
    game = new Game(canvas, seed, screenMode, profile, { net: s, online, notice: `Sala ${s.room} · passe o código aos amigos` });
    if (import.meta.env.DEV) (window as unknown as { __game: Game }).__game = game;
  };
  s.join(name, code);
}

/** Sai da sala e volta ao mundo que estava jogando sozinho (salvo). */
function leaveRoom(notice: string): void {
  const s = net;
  net = null;
  if (s) { s.onClose = null; s.leave(); }
  start(soloSeed, notice);
}

function start(seed: number, notice?: string): void {
  soloSeed = seed;
  game?.destroy(); // salva o mundo que estava aberto
  const url = new URL(window.location.href);
  url.searchParams.set('seed', String(seed));
  window.history.replaceState(null, '', url);
  game = new Game(canvas, seed, screenMode, profile, {
    save: store.load(seed),
    store,
    notice,
    online,
    // Toda seed começa na Cidade do Despertar (igual em todas): o aviso confirma que o mundo é outro.
    onNewWorld: () => {
      const next = randomSeed();
      start(next, `Novo mundo criado · semente ${next}`);
    },
    onRestart: () => {
      game?.destroy();
      game = null;
      store.clear(seed);
      start(seed, 'Mundo recomeçado do zero');
    },
  });
  // Só em desenvolvimento: acesso para testes automatizados no navegador.
  if (import.meta.env.DEV) (window as unknown as { __game: Game }).__game = game;
}

const param = new URLSearchParams(window.location.search).get('seed');
// Pacote de arte do mundo (só a arte dele) → imagens dos blocos (antes de montar chão e cubos) → jogo.
void loadArtPack(profile.id)
  .then(() => loadBlockArt())
  .then(() => start(param ? seedFromString(param) : store.lastSeed() ?? randomSeed()));
