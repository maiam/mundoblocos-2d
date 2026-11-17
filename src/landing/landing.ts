import { auth, type AuthResult } from '../auth/session';
import { HERO_BODIES, HERO_NAMES } from '../game/entities';
import { NPCS } from '../game/npcs';
import { ITEMS, type ItemId, TOOLS } from '../world/items';
import { CharacterPreview } from '../render/characterPreview';
import { art } from '../render/art';
import { getTownImages } from '../render/blockArt';
import './landing.css';

/**
 * Landing page do Orvalis (v0.93.128): a porta do jogo. Explica o que é o Orvalis, mostra o mundo, os personagens e os itens — com a arte do próprio jogo, num visual
 * de **pintura a óleo** (papel/tela com textura, pinceladas por filtro SVG, molduras de tinta dourada) — e tem um botão **Jogar**; só ao tocar nele o jogo segue para a escolha
 * de personagem. A barra do topo já traz **Entrar** e **Cadastrar** (casca em `auth/session.ts`: hoje respondem "em breve"). Só interface: nenhuma regra do jogo.
 */
export interface LandingHandlers {
  /** "Jogar": a landing some e o jogo segue (escolha de personagem / continuar). */
  onPlay(): void;
}

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const FONTS = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600&family=IM+Fell+English+SC&family=Nunito:wght@600;800&display=swap';

/** Pincel de óleo: deforma de leve as bordas (pinceladas) e põe grão de tinta; usado nas molduras e na arte do alto, não nos textos. */
const FILTERS = `
<svg class="lp-defs" width="0" height="0" aria-hidden="true" focusable="false">
  <filter id="orv-oil" x="-4%" y="-4%" width="108%" height="108%">
    <feTurbulence type="fractalNoise" baseFrequency="0.016 0.024" numOctaves="2" seed="7" result="warp"/>
    <feDisplacementMap in="SourceGraphic" in2="warp" scale="12" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" result="grain"/>
    <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.32  0 0 0 0 0.2  0 0 0 0.32 0" result="g2"/>
    <feComposite in="g2" in2="d" operator="in" result="g3"/>
    <feBlend in="d" in2="g3" mode="multiply"/>
  </filter>
  <filter id="orv-brush" x="-6%" y="-30%" width="112%" height="160%">
    <feTurbulence type="fractalNoise" baseFrequency="0.03 0.09" numOctaves="3" seed="11" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
</svg>`;

const ABOUT = [
  { title: 'Explore', text: 'Um mundo de blocos gerado sem fim: florestas, rios, mar e montanhas, uma Cidade do Despertar com castelo e muralha, uma vila camponesa e cavernas cheias de aranhas.' },
  { title: 'Construa e cultive', text: 'Corte árvores, quebre pedra, erga cercas e casas bloco a bloco, are a terra, plante trigo, batata e tomate, cozinhe no caldeirão e crie animais.' },
  { title: 'Aventure-se', text: 'Lobos, aranhas, homens-lagarto e goblins rondam o mundo. Na Guilda dos Aventureiros você aceita missões, ganha moedas e faz nome na cidade.' },
  { title: 'Jogue com amigos', text: 'Entre numa sala compartilhada e construa junto: o mundo, os bichos e as obras ficam salvos no servidor.' },
];

const CITY: Array<[string, string, string]> = [
  ['castle', 'O Castelo', 'Ao norte, guarda a história de Orvalis.'],
  ['guild', 'A Guilda dos Aventureiros', 'Missões, contratos e o Mestre Aldric.'],
  ['smithy', 'A Ferraria', 'O ferreiro Black forja ferramentas e armas.'],
  ['inn', 'A Hospedaria', 'Descanso e conversa para quem chega.'],
  ['florist', 'A Floricultura', 'As 15 Flores Fofas para enfeitar o seu mundo.'],
  ['watchtower', 'A Guarita', 'Os guardas vigiam a muralha e o portão.'],
];

const ITEM_ICONS = ['wheat', 'bread', 'apple', 'potato', 'tomato', 'carrot', 'milk', 'egg', 'cheese', 'apple_pie', 'silk', 'fang', 'wolf_pelt', 'copper_coin'];
const NPC_SHOWN = ['black', 'rosendo', 'bento', 'dante', 'silvano', 'caio', 'noel', 'aurelio'];

function section(id: string, eyebrow: string, title: string, body: string): string {
  return `<section class="lp-section" id="${id}"><div class="lp-wrap">
    <p class="lp-eyebrow">${esc(eyebrow)}</p><h2 class="lp-h2"><span>${esc(title)}</span></h2>${body}</div></section>`;
}

function frame(src: string | undefined, label: string, caption = ''): string {
  if (!src) return '';
  return `<figure class="lp-frame"><div class="lp-frame-art"><img src="${esc(src)}" alt="${esc(label)}" loading="lazy" draggable="false"></div>
    <figcaption><b>${esc(label)}</b>${caption ? `<span>${esc(caption)}</span>` : ''}</figcaption></figure>`;
}

function buildHtml(): string {
  const a = art();
  const town = getTownImages();
  const city = CITY.map(([key, name, text]) => frame(town.get(key)?.src, name, text)).join('');
  const heroes = HERO_BODIES.map((b) => `<figure class="lp-hero-card"><div class="lp-hero-canvas"><canvas data-hero="${b}" aria-label="${esc(HERO_NAMES[b])}"></canvas></div><figcaption>${esc(HERO_NAMES[b])}</figcaption></figure>`).join('');
  const npcs = NPC_SHOWN.map((id) => {
    const n = NPCS.find((x) => x.id === id);
    const src = (a.portraits as Record<string, string> | undefined)?.[id];
    if (!n || !src) return '';
    return `<figure class="lp-portrait"><div class="lp-portrait-art"><img src="${esc(src)}" alt="${esc(n.name)}" loading="lazy" draggable="false"></div><figcaption><b>${esc(n.name)}</b><span>${esc(n.who.replace(/\s*\(.*\)\s*$/, ''))}</span></figcaption></figure>`;
  }).join('');
  const tools = (Object.keys(TOOLS) as Array<keyof typeof TOOLS>).map((t) => {
    const src = a.toolIcons?.[t];
    return src ? `<li><img src="${esc(src)}" alt="" loading="lazy" draggable="false"><span>${esc(TOOLS[t].name)}</span></li>` : '';
  }).join('');
  const items = ITEM_ICONS.map((id) => {
    const src = (a.itemIcons as Record<string, string | undefined>)[id];
    return src ? `<li><img src="${esc(src)}" alt="" loading="lazy" draggable="false"><span>${esc(ITEMS[id as ItemId]?.name ?? id)}</span></li>` : '';
  }).join('');
  const flowers = (a.flowerIcons ?? []).map((src) => `<img src="${esc(src)}" alt="" loading="lazy" draggable="false">`).join('');
  const crafts = (['campfire', 'cauldron', 'oven', 'chair'] as const).map((k) => {
    const c = a.craftables?.[k];
    const label = { campfire: 'Fogueira', cauldron: 'Caldeirão', oven: 'Forno', chair: 'Cadeira' }[k];
    return c ? `<li><img src="${esc(c.icon)}" alt="" loading="lazy" draggable="false"><span>${label}</span></li>` : '';
  }).join('');
  const treeFrames = (['oak', 'cherry', 'birch', 'apple'] as const).map((k) => {
    const src = a.trees?.[k];
    const label = { oak: 'Carvalho', cherry: 'Cerejeira', birch: 'Bétula', apple: 'Macieira' }[k];
    return frame(src, label);
  }).join('');
  const aboutCards = ABOUT.map((c) => `<article class="lp-card"><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p></article>`).join('');
  return `
    ${FILTERS}
    <header class="lp-bar" role="banner">
      <a class="lp-logo" href="#topo" aria-label="Orvalis"><span class="lp-logo-mark" aria-hidden="true"></span><span>Orvalis</span></a>
      <nav class="lp-nav" aria-label="Seções"><a href="#jogo">O jogo</a><a href="#cidade">A cidade</a><a href="#personagens">Personagens</a><a href="#itens">Itens</a></nav>
      <div class="lp-auth" data-auth>
        <button type="button" class="lp-btn lp-btn-ghost" data-act="login">Entrar</button>
        <button type="button" class="lp-btn lp-btn-solid" data-act="signup">Cadastrar</button>
      </div>
    </header>
    <main id="topo">
      <section class="lp-hero">
        <div class="lp-hero-art" aria-hidden="true">${(() => { const c = town.get('castle'); return c ? `<img class="lp-hero-castle" src="${esc(c.src)}" alt="" draggable="false">` : ''; })()}</div>
        <div class="lp-hero-text">
          <p class="lp-eyebrow">Um mundo de blocos pintado à mão</p>
          <h1 class="lp-title">Orvalis</h1>
          <p class="lp-lede">Acorde na Cidade do Despertar sem lembrar de quem é. Explore, construa, cultive e aventure-se — sozinha ou com amigos.</p>
          <div class="lp-cta"><button type="button" class="lp-play" data-act="play">Jogar</button><a class="lp-more" href="#jogo">Conhecer o jogo ↓</a></div>
        </div>
      </section>
      ${section('jogo', 'O jogo', 'O que é o Orvalis', `<p class="lp-intro">Orvalis é um jogo de aventura e construção em visão de cima, com blocos de um quarto de célula, ciclo de dia e noite, plantações que crescem e uma cidade viva, com moradores que têm rotina, memória e pedidos.</p><div class="lp-cards">${aboutCards}</div>`)}
      ${section('cidade', 'O mundo', 'A Cidade do Despertar', `<p class="lp-intro">É aqui que a história começa: uma cidade murada, igual em todos os mundos, onde cada construção tem uma razão para você voltar.</p><div class="lp-frames">${city}</div><div class="lp-frames lp-frames-trees">${treeFrames}</div>`)}
      ${section('personagens', 'Gente', 'Personagens', `<p class="lp-intro">Escolha o seu aventureiro entre seis personagens e conheça os moradores da cidade — cada um com nome, rotina e histórias para contar.</p><div class="lp-heroes">${heroes}</div><h3 class="lp-h3">Os moradores</h3><div class="lp-portraits">${npcs}</div>`)}
      ${section('itens', 'Mochila', 'Itens e elementos', `<p class="lp-intro">Ferramentas para cada trabalho, comida que enche a barriga, espólios de monstros e 15 flores fofas para enfeitar a sua casa.</p>
        <div class="lp-shelves"><div class="lp-shelf"><h3 class="lp-h3">Ferramentas</h3><ul class="lp-icons">${tools}</ul></div>
        <div class="lp-shelf"><h3 class="lp-h3">Colheita e espólios</h3><ul class="lp-icons">${items}</ul></div>
        <div class="lp-shelf"><h3 class="lp-h3">Para a casa</h3><ul class="lp-icons">${crafts}</ul></div></div>
        <h3 class="lp-h3">As 15 Flores Fofas</h3><div class="lp-flowers">${flowers}</div>`)}
      <section class="lp-section lp-final"><div class="lp-wrap"><h2 class="lp-h2"><span>Pronta para acordar?</span></h2><p class="lp-intro">O mundo está esperando. Escolha o seu personagem e comece.</p><button type="button" class="lp-play" data-act="play">Jogar</button></div></section>
    </main>
    <footer class="lp-footer"><div class="lp-wrap"><span class="lp-logo-text">Orvalis</span><small>Pintado à mão, bloco a bloco.</small></div></footer>
    <div class="lp-modal" data-modal hidden role="dialog" aria-modal="true" aria-labelledby="lp-modal-title"><div class="lp-modal-box">
      <button type="button" class="lp-modal-close" data-act="close" aria-label="Fechar">×</button>
      <h2 id="lp-modal-title" class="lp-modal-title">Entrar</h2>
      <form class="lp-form" novalidate>
        <label data-only="signup">Nome<input name="name" type="text" autocomplete="nickname" maxlength="16" placeholder="Como quer ser chamada"></label>
        <label>E-mail<input name="email" type="email" autocomplete="email" placeholder="voce@exemplo.com"></label>
        <label>Senha<input name="password" type="password" autocomplete="current-password" placeholder="••••••••"></label>
        <p class="lp-form-msg" role="status" hidden></p>
        <button type="submit" class="lp-btn lp-btn-solid lp-btn-wide">Entrar</button>
        <button type="button" class="lp-btn lp-btn-ghost lp-btn-wide" data-act="switch"></button>
      </form>
      <p class="lp-modal-note">As contas chegam em breve. Por enquanto, jogue como visitante: o progresso fica salvo neste aparelho.</p>
      <button type="button" class="lp-link" data-act="guest">Jogar como visitante</button>
    </div></div>`;
}

/** Mostra a landing por cima de tudo. Devolve como removê-la (para os personagens animados e a página). */
export function showLanding(h: LandingHandlers): () => void {
  if (!document.querySelector('link[data-lp-fonts]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONTS;
    link.dataset.lpFonts = '1';
    document.head.appendChild(link);
  }
  const root = document.createElement('div');
  root.className = 'lp';
  root.innerHTML = buildHtml();
  document.body.appendChild(root);

  const previews: CharacterPreview[] = [];
  root.querySelectorAll<HTMLCanvasElement>('canvas[data-hero]').forEach((c) => {
    const p = new CharacterPreview(c, { still: false });
    p.setBody(c.dataset.hero as (typeof HERO_BODIES)[number]);
    p.start();
    previews.push(p);
  });

  const modal = root.querySelector<HTMLElement>('[data-modal]')!;
  const form = modal.querySelector<HTMLFormElement>('.lp-form')!;
  const msg = modal.querySelector<HTMLElement>('.lp-form-msg')!;
  let mode: 'login' | 'signup' = 'login';
  const setMode = (m: 'login' | 'signup'): void => {
    mode = m;
    modal.querySelector('.lp-modal-title')!.textContent = m === 'login' ? 'Entrar' : 'Criar conta';
    form.querySelector<HTMLButtonElement>('[type=submit]')!.textContent = m === 'login' ? 'Entrar' : 'Cadastrar';
    form.querySelector<HTMLButtonElement>('[data-act=switch]')!.textContent = m === 'login' ? 'Ainda não tenho conta' : 'Já tenho conta';
    form.querySelectorAll<HTMLElement>('[data-only=signup]').forEach((el) => { el.hidden = m !== 'signup'; });
    msg.hidden = true;
  };
  const openModal = (m: 'login' | 'signup'): void => { setMode(m); modal.hidden = false; form.querySelector<HTMLInputElement>('input:not([hidden])')?.focus(); };
  const closeModal = (): void => { modal.hidden = true; };
  const play = (): void => { destroy(); h.onPlay(); };

  const renderAuth = (): void => {
    const box = root.querySelector<HTMLElement>('[data-auth]')!;
    const u = auth.user();
    box.innerHTML = u
      ? `<span class="lp-user">Olá, ${esc(u.name)}</span><button type="button" class="lp-btn lp-btn-ghost" data-act="logout">Sair</button>`
      : '<button type="button" class="lp-btn lp-btn-ghost" data-act="login">Entrar</button><button type="button" class="lp-btn lp-btn-solid" data-act="signup">Cadastrar</button>';
  };
  const offAuth = auth.onChange(renderAuth);

  root.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!t) { if (e.target === modal) closeModal(); return; }
    switch (t.dataset.act) {
      case 'play': case 'guest': play(); break;
      case 'login': openModal('login'); break;
      case 'signup': openModal('signup'); break;
      case 'switch': setMode(mode === 'login' ? 'signup' : 'login'); break;
      case 'close': closeModal(); break;
      case 'logout': void auth.signOut(); break;
    }
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const email = String(f.get('email') ?? '').trim(), password = String(f.get('password') ?? ''), name = String(f.get('name') ?? '').trim();
    let r: AuthResult;
    r = mode === 'login' ? await auth.signIn({ email, password }) : await auth.signUp({ name, email, password });
    if (r.ok) { closeModal(); renderAuth(); return; }
    msg.hidden = false;
    msg.textContent = r.reason === 'coming-soon' ? 'As contas ainda não estão disponíveis. Jogue como visitante por enquanto.' : r.reason === 'network' ? 'Sem conexão com o servidor. Tente de novo.' : 'Confira os dados e tente de novo.';
  });
  const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape' && !modal.hidden) closeModal(); };
  document.addEventListener('keydown', onKey);

  function destroy(): void {
    offAuth();
    document.removeEventListener('keydown', onKey);
    for (const p of previews) p.stop();
    root.remove();
  }
  return destroy;
}
