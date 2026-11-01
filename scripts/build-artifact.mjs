// Gera um HTML de arquivo único (JS e CSS inline) a partir do build do Vite,
// para publicar como Artifact do claude.ai ou abrir offline. Fonte: dist/.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const assets = join('dist', 'assets');
const files = readdirSync(assets);
const js = files.filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(assets, f), 'utf8')).join('\n');
const css = files.filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(assets, f), 'utf8')).join('\n');
const safe = (s) => s.replace(/<\/script/gi, '<\\/script');

// Sem <!doctype>/<html>/<head>/<body>: o host do Artifact adiciona o esqueleto.
const html = `<title>MundoBlocos 2D</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;800&display=swap">
<style>${css}</style>
<canvas id="world"></canvas>
<script type="module">${safe(js)}</script>
`;
mkdirSync('artifact', { recursive: true });
writeFileSync(join('artifact', 'mundoblocos.html'), html);
console.log(`artifact/mundoblocos.html (${(html.length / 1024).toFixed(1)} kB)`);
