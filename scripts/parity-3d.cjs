/**
 * Checklist de paridade 2D × 3D do Mundo (ADR 0031, M5). Abre o jogo em 2D e em `?render=3d` nos MESMOS cenários e salva as
 * capturas lado a lado em `parity-out/` (ignorada pelo git) + `parity-out/index.html` para revisar de uma vez.
 *
 * Uso: com o servidor de desenvolvimento no ar (`npm run dev`), `npm run parity:3d` (ou `node scripts/parity-3d.cjs [url-base]`).
 * Precisa do Playwright (já instalado no ambiente de desenvolvimento) e do Pillow só para a montagem (opcional).
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'http://localhost:5173';
const OUT = path.join(__dirname, '..', 'parity-out');
const SEED = 42;
const VIEWPORT = { width: 844, height: 390 };

/** Cada cenário prepara o jogo (rodando DENTRO da página) e devolve uma nota. `window.__game` só existe em dev. */
const SCENARIOS = [
  { id: 'praca', nome: 'Praça da cidade (NPCs, bancos, poço)', prep: () => { const g = window.__game; g.player.x = 0.5; g.player.y = -6.5; } },
  { id: 'portao', nome: 'Portão e torres da cidade', prep: () => { const g = window.__game; g.player.x = 0.5; g.player.y = -2.5; } },
  { id: 'floresta', nome: 'Floresta fora da cidade (árvores, mato, pedras)', prep: async () => {
    const g = window.__game, w = g.world, m = await import('/src/world/blocks.ts'); const [gx, gy] = w.outsideGate();
    let best = null, bestN = -1; // o trecho de 20 × 12 células com mais árvores e sem água no centro
    for (let dy = -10; dy <= 70; dy += 4) for (let dx = -60; dx <= 60; dx += 4) {
      const cx = gx + dx, cy = gy + dy; if (w.getGround(cx, cy) === m.Block.WATER) continue;
      let n = 0; for (let y = cy - 6; y <= cy + 6; y++) for (let x = cx - 10; x <= cx + 10; x++) if (m.blockDef(w.getObject(x, y)).shape === 'tree') n++;
      if (n > bestN) { bestN = n; best = [cx, cy]; }
    }
    g.player.x = best[0] + 0.5; g.player.y = best[1] + 0.5; } },
  { id: 'agua', nome: 'Água, margem e areia (brilhos)', prep: () => { const g = window.__game, [gx, gy] = g.world.outsideGate(); g.player.x = gx + 0.5; g.player.y = gy + 10.5; } },
  { id: 'item', nome: 'Item caído no chão', prep: () => { const g = window.__game; g.player.x = 0.5; g.player.y = -6.5; g.drops.spawn(g.player.x + 4, g.player.y + 1, [{ item: 'wheat', count: 2 }]); } },
  { id: 'noite', nome: 'Meia-noite na praça (luz do jogador e lampiões)', prep: () => { const g = window.__game; g.time = 0.0; g.player.x = 0.5; g.player.y = -6.5; } },
  { id: 'interior', nome: 'Interior: ferraria', prep: () => { const g = window.__game, r = g.world.interiors.find((i) => i.def.id === 'smithy') || g.world.interiors[0]; g.player.x = r.entry[0] + 0.5; g.player.y = r.entry[1] + 0.5; } },
  { id: 'covil', nome: 'Entrada do covil (farol da dungeon)', prep: () => { const g = window.__game, c = g.world.cave; g.player.x = c.outside[0] + 0.5; g.player.y = c.outside[1] + 2.5; } },
  { id: 'dungeon', nome: 'Dentro do labirinto (paredes empilhadas, penumbra)', prep: () => {
    const g = window.__game, w = g.world, d = w.dungeon;
    for (let dy = 0; dy < d.h; dy++) for (let dx = 0; dx < d.w; dx++) { const x = d.area.x0 + dx, y = d.area.y0 + dy; if (w.inDungeon(x, y) && w.standHeight(x, y) !== null && w.getObject(x, y) === 0) { g.player.x = x + 0.5; g.player.y = y + 0.5; return; } } } },
  { id: 'construcao', nome: 'Construção: parede fina, pilar, porta', prep: async () => {
    const g = window.__game, w = g.world, m = await import('/src/world/blocks.ts'); const [gx, gy] = w.outsideGate(); const x = gx + 2, y = gy + 8;
    for (let i = -1; i <= 1; i++) { w.setObject(x + i, y, m.Block.OAK_PLANKS); w.setLevel(x + i, y, 1, m.Block.OAK_PLANKS); }
    w.setObject(x, y, m.Block.OAK_DOOR); w.setObject(x + 4, y, m.Block.STONE); w.setLevel(x + 4, y, 1, m.Block.STONE);
    g.player.x = x + 0.5; g.player.y = y + 3.5; } },
];

async function shot(browser, mode, sc) {
  const page = await browser.newPage({ viewport: VIEWPORT });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(`${BASE}/?seed=${SEED}${mode === '3d' ? '&render=3d' : ''}`);
  await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
  await page.waitForTimeout(3500);
  await page.evaluate(sc.prep);
  await page.waitForTimeout(3000);
  const file = path.join(OUT, `${sc.id}-${mode}.png`);
  await page.screenshot({ path: file });
  const stats = mode === '3d' ? await page.evaluate(() => window.__game.rendererStats) : null; // chamadas/triângulos do quadro inteiro (cena + luz)
  await page.close();
  return { file, errs, stats };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const rows = [];
  let failed = 0;
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  for (const sc of SCENARIOS) {
    if (only && !only.includes(sc.id)) continue;
    const a = await shot(browser, '2d', sc);
    const b = await shot(browser, '3d', sc);
    const errs = [...a.errs.map((e) => '2D: ' + e), ...b.errs.map((e) => '3D: ' + e)];
    if (errs.length) failed++;
    rows.push({ sc, errs, stats: b.stats });
    console.log(`${errs.length ? '✗' : '✓'} ${sc.id.padEnd(11)} ${sc.nome}${b.stats ? `  [3D: ${b.stats.calls} calls, ${Math.round(b.stats.triangles / 100) / 10}k tri]` : ''}${errs.length ? '\n    ' + errs.join('\n    ') : ''}`);
  }
  const html = `<!doctype html><meta charset="utf-8"><title>Paridade 2D × 3D</title><style>body{font:14px system-ui;background:#111;color:#eee;margin:16px}figure{margin:0 0 24px}img{width:48%;border:1px solid #444}figcaption{margin:6px 0}</style><h1>Paridade 2D × 3D — seed ${SEED}</h1><p>Esquerda: 2D (10 células de altura). Direita: 3D (14, escala K = 1). Diferenças de tamanho são esperadas; confira o que aparece, a posição e os efeitos.</p>` +
    rows.map(({ sc, errs }) => `<figure><figcaption><b>${sc.nome}</b>${errs.length ? ' — <span style="color:#f66">erros: ' + errs.join(' | ') + '</span>' : ''}</figcaption><img src="${sc.id}-2d.png"> <img src="${sc.id}-3d.png"></figure>`).join('');
  fs.writeFileSync(path.join(OUT, 'index.html'), html);
  console.log(`\n${rows.length - failed}/${rows.length} cenários sem erros. Capturas e index.html em ${path.relative(process.cwd(), OUT)}/`);
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
