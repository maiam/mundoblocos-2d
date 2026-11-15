import { describe, expect, it } from 'vitest';
import { unsupportedDetails, unsupportedInfo } from './unsupported';

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const FIREFOX = 'Mozilla/5.0 (Windows NT 10.0; rv:130.0) Gecko/20100101 Firefox/130.0';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

describe('aviso de aparelho sem WebGL', () => {
  it('as dicas acompanham o navegador (Chrome/Edge, Firefox, iOS) e sempre sugerem atualizar ou trocar de navegador', () => {
    expect(unsupportedInfo('no-webgl', CHROME).tips[0]).toContain('Chrome/Edge');
    expect(unsupportedInfo('no-webgl', FIREFOX).tips[0]).toContain('Firefox');
    expect(unsupportedInfo('no-webgl', IOS).tips[0]).toContain('iOS');
    expect(unsupportedInfo('no-webgl', 'outro').tips[0]).toContain('aceleração gráfica');
    for (const ua of [CHROME, FIREFOX, IOS]) expect(unsupportedInfo('no-webgl', ua).tips.some((t) => t.includes('outro navegador'))).toBe(true);
  });

  it('falha ao carregar o módulo tem texto próprio (conexão) e avisa que o progresso está salvo', () => {
    const i = unsupportedInfo('load-failed', CHROME);
    expect(i.title).toContain('carregar');
    expect(i.lead).toContain('salvo');
    expect(i.tips.join(' ')).toContain('Tentar de novo');
  });

  it('os detalhes copiáveis têm a causa, o navegador e o endereço', () => {
    const t = unsupportedDetails('no-webgl', CHROME, 'https://exemplo/?seed=1');
    expect(t).toContain('no-webgl');
    expect(t).toContain('Chrome/130');
    expect(t).toContain('https://exemplo/?seed=1');
  });
});
