/**
 * Aviso de aparelho sem WebGL (v0.93.107). O Canvas 2D foi removido (v0.93.105): sem WebGL o jogo não abre, então a tela precisa dizer o
 * motivo provável, o que tentar e deixar tentar de novo ou copiar os detalhes. Sem `alert`/`confirm` (o iframe do Artifact os bloqueia): é
 * uma camada própria na página. `unsupportedInfo` é puro (testado); `showUnsupported` monta o DOM.
 */
export type UnsupportedCause = 'no-webgl' | 'load-failed';

export interface UnsupportedInfo {
  title: string;
  lead: string;
  /** Dicas por navegador/aparelho, na ordem do que mais costuma resolver. */
  tips: string[];
}

/** Texto do aviso: o motivo e as dicas para o navegador/aparelho (`ua` = user agent). */
export function unsupportedInfo(cause: UnsupportedCause, ua: string): UnsupportedInfo {
  if (cause === 'load-failed') {
    return {
      title: 'Não deu para carregar o gráfico',
      lead: 'O Orvalis desenha o mundo em 3D e o módulo gráfico não chegou ao aparelho (conexão instável ou bloqueio). Seu progresso está salvo.',
      tips: ['Verifique a conexão e toque em "Tentar de novo".', 'Se continuar, tente outro navegador.'],
    };
  }
  const ios = /iPhone|iPad|iPod/i.test(ua);
  const firefox = /Firefox\//i.test(ua);
  const chromium = /Chrome\/|Chromium\/|Edg\//i.test(ua);
  const tips: string[] = [];
  if (ios) tips.push('iPhone/iPad: atualize o iOS e use o Safari ou o Chrome (o modo de economia de energia às vezes desliga o WebGL).');
  else if (chromium) tips.push('No Chrome/Edge: Configurações → Sistema → ative "Usar aceleração gráfica quando disponível" e reinicie o navegador.');
  else if (firefox) tips.push('No Firefox: Configurações → Geral → Desempenho → desmarque "Usar configurações de desempenho recomendadas" e marque "Usar aceleração de hardware quando disponível".');
  else tips.push('Ative a aceleração gráfica (de hardware) nas configurações do navegador e reinicie-o.');
  tips.push('Atualize o navegador e o driver de vídeo, ou tente outro navegador (Chrome, Edge, Firefox ou Safari).');
  tips.push('Dentro de um aplicativo (redes sociais, leitor de e-mail), abra o link no navegador do aparelho.');
  return {
    title: 'O Orvalis precisa de WebGL',
    lead: 'O jogo desenha o mundo em 3D e este navegador ou aparelho não oferece WebGL (ou ele está desligado).',
    tips,
  };
}

/** Linhas de diagnóstico para copiar e mandar (sem dados pessoais). */
export function unsupportedDetails(cause: UnsupportedCause, ua: string, url: string): string {
  return [`Orvalis — aviso: ${cause}`, `Navegador: ${ua}`, `Endereço: ${url}`].join('\n');
}

export function showUnsupported(cause: UnsupportedCause): void {
  const info = unsupportedInfo(cause, navigator.userAgent);
  const box = document.createElement('div');
  box.setAttribute('role', 'alert');
  box.setAttribute('style', 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:16px;background:#120f2c;z-index:99;overflow:auto;font:600 15px/1.5 Nunito,system-ui,sans-serif;color:#f4efe0');
  const card = document.createElement('div');
  card.setAttribute('style', 'max-width:460px;width:100%;background:#1f1a44;border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:20px 22px;box-shadow:0 8px 30px rgba(0,0,0,.4)');
  const h = document.createElement('h1');
  h.textContent = info.title;
  h.setAttribute('style', 'margin:0 0 8px;font-size:22px;color:#ffd46b');
  const p = document.createElement('p');
  p.textContent = info.lead;
  p.setAttribute('style', 'margin:0 0 10px');
  const ul = document.createElement('ul');
  ul.setAttribute('style', 'margin:0 0 14px;padding-left:20px;font-weight:600;color:#d9d3f0');
  for (const t of info.tips) { const li = document.createElement('li'); li.textContent = t; li.setAttribute('style', 'margin:4px 0'); ul.appendChild(li); }
  const row = document.createElement('div');
  row.setAttribute('style', 'display:flex;gap:10px;flex-wrap:wrap');
  const btn = (label: string, primary: boolean, on: () => void): HTMLButtonElement => {
    const b = document.createElement('button');
    b.textContent = label;
    b.setAttribute('style', `touch-action:manipulation;border:0;border-radius:12px;padding:10px 16px;font:800 15px Nunito,system-ui,sans-serif;cursor:pointer;${primary ? 'background:#ffd46b;color:#2a1c05' : 'background:rgba(255,255,255,.12);color:#f4efe0'}`);
    b.addEventListener('click', on);
    return b;
  };
  const copy = btn('Copiar detalhes', false, () => {
    const text = unsupportedDetails(cause, navigator.userAgent, location.href);
    const done = (): void => { copy.textContent = 'Copiado!'; };
    try { void navigator.clipboard.writeText(text).then(done, () => { copy.textContent = 'Não foi possível copiar'; }); } catch { copy.textContent = 'Não foi possível copiar'; }
  });
  row.append(btn('Tentar de novo', true, () => window.location.reload()), copy);
  card.append(h, p, ul, row);
  box.appendChild(card);
  document.body.appendChild(box);
}
