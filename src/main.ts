import './style.css';
import { Game } from './game/game';
import { SaveStore } from './game/save';
import { loadArtPack } from './render/art';
import { loadBlockArt } from './render/blockArt';
import { resolveWorldId, WORLD_PROFILES } from './world/profiles';
import { ScreenMode } from './game/screenMode';
import { seedFromString } from './world/random';

const canvas = document.getElementById('world') as HTMLCanvasElement;
const screenMode = new ScreenMode();
// Mundo: fixo no build (VITE_WORLD, artefato próprio) → subdomínio → ?mundo= → principal.
const profile = WORLD_PROFILES[resolveWorldId(window.location.hostname, window.location.search, import.meta.env.VITE_WORLD)];
document.title = profile.name;
let game: Game | null = null;
/** Salvamento automático deste mundo (um por seed; o último jogado continua ao abrir sem ?seed=). */
const store = new SaveStore(profile.id);
const randomSeed = (): number => Math.floor(Math.random() * 2 ** 31);

function start(seed: number, notice?: string): void {
  game?.destroy(); // salva o mundo que estava aberto
  const url = new URL(window.location.href);
  url.searchParams.set('seed', String(seed));
  window.history.replaceState(null, '', url);
  game = new Game(canvas, seed, screenMode, profile, {
    save: store.load(seed),
    store,
    notice,
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
