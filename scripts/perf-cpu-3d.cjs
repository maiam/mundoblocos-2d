/**
 * Custo de JS por quadro do render 2D × 3D do Mundo (ADR 0031, M5). Mede o tempo que `renderer.draw` gasta NA THREAD DO JS em
 * 4 cenários (praça, noite, floresta densa, dentro do labirinto), 7 s cada. É a parte do custo que NÃO depende da GPU: o que o
 * celular paga de CPU para montar o quadro. Não mede o desenho na GPU (isso é o painel `?fps=1` num aparelho real).
 *
 * Uso: com `npm run dev` no ar, `npm run perf:cpu:3d` (ou `node scripts/perf-cpu-3d.cjs [url-base]`). Precisa do Playwright.
 * Compare médias entre máquinas só em proporção 3D ÷ 2D; o valor absoluto muda com a CPU.
 */
const { chromium } = require('playwright');
const SC = {
  praca: () => { const g = window.__game; g.player.x = 0.5; g.player.y = -6.5; },
  noite: () => { const g = window.__game; g.time = 0.0; g.player.x = 0.5; g.player.y = -6.5; },
  floresta: async () => {
    const g = window.__game, w = g.world, m = await import('/src/world/blocks.ts'); const [gx, gy] = w.outsideGate();
    let best = null, bestN = -1;
    for (let dy = -10; dy <= 70; dy += 4) for (let dx = -60; dx <= 60; dx += 4) {
      const cx = gx + dx, cy = gy + dy; if (w.getGround(cx, cy) === m.Block.WATER) continue;
      let n = 0; for (let y = cy - 6; y <= cy + 6; y++) for (let x = cx - 10; x <= cx + 10; x++) if (m.blockDef(w.getObject(x, y)).shape === 'tree') n++;
      if (n > bestN) { bestN = n; best = [cx, cy]; }
    }
    g.player.x = best[0] + 0.5; g.player.y = best[1] + 0.5; },
  dungeon: () => { const g = window.__game, w = g.world, d = w.dungeon;
    for (let dy = 0; dy < d.h; dy++) for (let dx = 0; dx < d.w; dx++) { const x = d.area.x0 + dx, y = d.area.y0 + dy; if (w.inDungeon(x, y) && w.standHeight(x, y) !== null && w.getObject(x, y) === 0) { g.player.x = x + 0.5; g.player.y = y + 0.5; return; } } },
};
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
  const rows = [];
  for (const name of Object.keys(SC)) for (const mode of ['2d', '3d']) {
    const p = await b.newPage({ viewport: { width: 844, height: 390 } });
    await p.goto((process.argv[2] || 'http://localhost:5173') + '/?seed=42' + (mode === '3d' ? '&render=3d' : '')); await p.waitForFunction(() => window.__game, null, { timeout: 90000 }); await p.waitForTimeout(3500);
    await p.evaluate(SC[name]); await p.waitForTimeout(3500);
    const r = await p.evaluate(async () => {
      const rend = window.__game.renderer, orig = rend.draw.bind(rend), t = [];
      rend.draw = (...a) => { const s = performance.now(); orig(...a); t.push(performance.now() - s); };
      await new Promise((res) => setTimeout(res, 7000));
      rend.draw = orig;
      t.sort((a, b) => a - b); const n = t.length;
      return { n, avg: t.reduce((s, v) => s + v, 0) / n, p50: t[Math.floor(n * 0.5)], p95: t[Math.floor(n * 0.95)], max: t[n - 1], gpu: window.__game.rendererStats };
    });
    rows.push({ name, mode, ...r });
    console.log(`${name.padEnd(9)} ${mode}  quadros=${String(r.n).padStart(3)}  JS/quadro: média ${r.avg.toFixed(2)} ms · p50 ${r.p50.toFixed(2)} · p95 ${r.p95.toFixed(2)} · máx ${r.max.toFixed(1)}${r.gpu ? `  | ${r.gpu.calls} calls, ${(r.gpu.triangles/1000).toFixed(1)}k tri, ${r.gpu.textures} tex` : ''}`);
    await p.close();
  }
  await b.close();
})();
