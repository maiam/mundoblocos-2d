/** Interface HTML sobreposta ao canvas. Apenas apresentação; estado vem do Game. */

export type ActionMode = 'break' | 'place';

export interface HudState {
  seed: number;
  block: [number, number];
  chunk: [number, number];
  biome: string;
  loaded: number;
  fps: number;
  zoom: number;
  time: number;
  selected: number;
  selectedName: string;
  mode: ActionMode;
  chunkBorders: boolean;
  hoverName: string | null;
}

export interface HudHandlers {
  icons: string[];
  onSelect(i: number): void;
  onToggleChunks(): void;
  onNewWorld(): void;
  onToggleMode(): void;
  onSkipTime(): void;
}

const PERIODS: [number, string][] = [
  [0.22, 'Noite'],
  [0.3, 'Aurora'],
  [0.7, 'Dia'],
  [0.8, 'Crepúsculo'],
  [1.01, 'Noite'],
];

function periodName(t: number): string {
  return PERIODS.find(([limit]) => t < limit)![1];
}

export class Hud {
  private readonly root: HTMLElement;
  private readonly fields: Record<string, HTMLElement> = {};
  private readonly slots: HTMLButtonElement[] = [];
  private readonly btnChunks: HTMLButtonElement;
  private readonly btnMode: HTMLButtonElement;
  private last = '';

  constructor(h: HudHandlers) {
    this.root = document.createElement('div');
    this.root.className = 'hud';
    this.root.innerHTML = `
      <section class="panel info">
        <h1>Mundo<span>Blocos</span></h1>
        <dl>
          <dt>Bioma</dt><dd data-f="biome"></dd>
          <dt>Bloco</dt><dd data-f="block"></dd>
          <dt>Chunk</dt><dd data-f="chunk"></dd>
          <dt>Chunks carregados</dt><dd data-f="loaded"></dd>
          <dt>Período</dt><dd data-f="time"></dd>
          <dt>Seed</dt><dd data-f="seed"></dd>
          <dt>FPS</dt><dd data-f="fps"></dd>
        </dl>
      </section>
      <section class="panel actions">
        <button data-a="chunks" title="Mostrar/ocultar bordas dos chunks (G)">Chunks <kbd>G</kbd></button>
        <button data-a="mode" title="Alternar quebrar/colocar (F)"></button>
        <button data-a="time" title="Avançar período do dia (T)">Tempo <kbd>T</kbd></button>
        <button data-a="new" title="Gerar um novo mundo">Novo mundo</button>
      </section>
      <div class="tooltip" data-f="hover"></div>
      <nav class="hotbar"></nav>
      <p class="help">WASD/setas: mover · arrastar: mover · roda/Q/E: zoom · clique esq.: quebrar · clique dir.: colocar · 1–9: bloco</p>
    `;
    document.body.appendChild(this.root);
    this.root.querySelectorAll<HTMLElement>('[data-f]').forEach((el) => (this.fields[el.dataset.f!] = el));
    const hotbar = this.root.querySelector('.hotbar')!;
    h.icons.forEach((src, i) => {
      const b = document.createElement('button');
      b.className = 'slot';
      b.innerHTML = `<img alt="" src="${src}"><span>${i + 1}</span>`;
      b.addEventListener('click', () => h.onSelect(i));
      hotbar.appendChild(b);
      this.slots.push(b);
    });
    const btn = (a: string) => this.root.querySelector<HTMLButtonElement>(`[data-a="${a}"]`)!;
    this.btnChunks = btn('chunks');
    this.btnMode = btn('mode');
    this.btnChunks.addEventListener('click', h.onToggleChunks);
    this.btnMode.addEventListener('click', h.onToggleMode);
    btn('time').addEventListener('click', h.onSkipTime);
    btn('new').addEventListener('click', h.onNewWorld);
  }

  update(s: HudState): void {
    const key = JSON.stringify([s.block, s.biome, s.loaded, s.fps, s.selected, s.mode, s.chunkBorders, s.hoverName, periodName(s.time)]);
    if (key === this.last) return;
    this.last = key;
    this.fields.biome.textContent = s.biome;
    this.fields.block.textContent = `${s.block[0]}, ${s.block[1]}`;
    this.fields.chunk.textContent = `${s.chunk[0]}, ${s.chunk[1]}`;
    this.fields.loaded.textContent = String(s.loaded);
    this.fields.time.textContent = periodName(s.time);
    this.fields.seed.textContent = String(s.seed);
    this.fields.fps.textContent = String(s.fps);
    this.fields.hover.textContent = s.hoverName && s.hoverName !== 'Ar' ? s.hoverName : '';
    this.slots.forEach((b, i) => b.classList.toggle('active', i === s.selected));
    this.btnChunks.classList.toggle('on', s.chunkBorders);
    this.btnMode.innerHTML = s.mode === 'break' ? 'Quebrar <kbd>F</kbd>' : `Colocar: ${s.selectedName} <kbd>F</kbd>`;
  }

  destroy(): void {
    this.root.remove();
  }
}
