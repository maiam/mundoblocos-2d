// Renderiza as peças da cerca do modelo do Blockbench (assets-src/cerca-betula/*.bbmodel) com Three.js no Chromium do Playwright.
// Uso (feito por scripts/extract-fence-model.py): node scripts/fence-model/render.cjs <pasta-de-trabalho> <saida>
// A pasta de trabalho tem model.json, top-<madeira>.png e front-<madeira>.png; saída = <madeira>-<peça>.png (128 × 232, base da estaca em (64, 208)).
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const [work, out] = process.argv.slice(2);
const here = __dirname, three = path.resolve(here, '../../node_modules/three/build');
const files = { '/render.html': path.join(here, 'render.html'), '/three.module.js': path.join(three, 'three.module.js'), '/three.core.js': path.join(three, 'three.core.js') };
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  const f = files[u] || path.join(work, path.basename(u));
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
(async () => {
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 200, height: 260 } });
  p.on('pageerror', (e) => console.log('ERRO', e.message));
  fs.mkdirSync(out, { recursive: true });
  for (const wood of ['carvalho', 'betula', 'cerejeira']) {
    for (const piece of ['horizontal', 'vertical', 'post', 'armn', 'arms']) {
      await p.goto(`http://localhost:${port}/render.html?piece=${piece}&wood=${wood}`);
      await p.waitForFunction('window.done', null, { timeout: 30000 });
      await p.locator('#c').screenshot({ path: path.join(out, `${wood}-${piece}.png`), omitBackground: true });
    }
  }
  await b.close(); server.close();
})();
