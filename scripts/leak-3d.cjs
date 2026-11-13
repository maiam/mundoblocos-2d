/**
 * Teste de vazamento do render 3D do Mundo (ADR 0031, M5): anda ~36 saltos de ~65 células (≈ 140 chunks novos) com `?render=3d` e, a
 * cada passo, coleta o lixo e registra texturas e geometrias da GPU, memória do JS e os chunks vivos. Passa se, depois de aquecer, as
 * contagens ficam planas (o chão, os cubos e os objetos de chunks que saíram da tela são liberados).
 *
 * Uso: com `npm run dev` no ar, `npm run leak:3d` (ou `node scripts/leak-3d.cjs [url-base]`). Precisa do Playwright; usa `--expose-gc`.
 */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--enable-precise-memory-info','--js-flags=--expose-gc'] });
  const p = await b.newPage({ viewport: { width: 844, height: 390 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto((process.argv[2] || 'http://localhost:5173') + '/?seed=42&render=3d'); await p.waitForFunction(() => window.__game, null, { timeout: 90000 }); await p.waitForTimeout(4000);
  const rows = [];
  for (let step = 0; step < 36; step++) {
    // anda 60 células em linha reta por vez (≈ 4 chunks novos), em duas direções para voltar a áreas conhecidas no fim
    await p.evaluate((s) => { const g = window.__game; const dir = s < 24 ? 1 : -1; g.player.x += dir * 60; g.player.y += (s % 2 ? 20 : -20); }, step);
    await p.waitForTimeout(1500);
    const m = await p.evaluate(() => { if (window.gc) window.gc(); const st = window.__game.renderer.stats(); const r = window.__game.renderer; return { tex: st.textures, geo: st.geometries, heap: Math.round(performance.memory.usedJSHeapSize / 1048576), floor: r.floorChunks, sprites: r.sprites.count, blocks: r.blocks.count }; });
    rows.push(m);
    if (step % 4 === 3) console.log(String(step + 1).padStart(2), JSON.stringify(m));
  }
  const a = rows.slice(6, 12), z = rows.slice(-6);
  const avg = (xs, k) => xs.reduce((s, r) => s + r[k], 0) / xs.length;
  console.log('média passos 7–12 → últimos 6: tex', avg(a,'tex').toFixed(0), '→', avg(z,'tex').toFixed(0), '| geo', avg(a,'geo').toFixed(0), '→', avg(z,'geo').toFixed(0), '| heap(MB, após gc)', avg(a,'heap').toFixed(0), '→', avg(z,'heap').toFixed(0));
  const flat = avg(z,'tex') <= avg(a,'tex') * 1.05 && avg(z,'geo') <= avg(a,'geo') * 1.05 && avg(z,'heap') <= avg(a,'heap') * 1.5 + 5;
  console.log(flat ? 'OK: sem crescimento depois do aquecimento' : 'ATENÇÃO: recursos crescendo — possível vazamento');
  console.log(errs.join('|') || 'sem erros');
  await b.close();
  process.exit(flat && !errs.length ? 0 : 1);
})();
