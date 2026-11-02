// Gera um HTML de arquivo único (JS e CSS inline) a partir do build do Vite,
// para publicar como Artifact do claude.ai ou abrir offline. Fonte: dist/.
// Uso: node scripts/build-artifact.mjs [nome-do-arquivo] [título]
//   mundo principal: mundoblocos "MundoBlocos 2D" (padrão)
//   Santuário:       santuario "Santuário Celestial" (build com VITE_WORLD=santuario)
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const name = process.argv[2] ?? 'mundoblocos';
const title = process.argv[3] ?? 'MundoBlocos 2D';
const assets = join('dist', 'assets');
const files = readdirSync(assets);
const js = files.filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(assets, f), 'utf8')).join('\n');
const css = files.filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(assets, f), 'utf8')).join('\n');
const safe = (s) => s.replace(/<\/script/gi, '<\\/script');

// Sem <!doctype>/<html>/<head>/<body>: o host do Artifact adiciona o esqueleto.
const html = `<title>${title}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;800&display=swap">
<style>${css}</style>
<canvas id="world"></canvas>
<script type="module">${safe(js)}</script>
`;
mkdirSync('artifact', { recursive: true });
writeFileSync(join('artifact', `${name}.html`), html);
console.log(`artifact/${name}.html (${(html.length / 1024).toFixed(1)} kB)`);
