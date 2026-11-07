// Gera o Artifact a partir do build do Vite (ADR 0013): um HTML com o código (JS e CSS) embutido + as imagens como
// ARQUIVOS SEPARADOS ao lado dele. As imagens são referenciadas pelo nome, relativo à página (o Vite gera
// `new URL("x.webp", import.meta.url)`, e num <script type="module"> embutido import.meta.url é o endereço da página).
// O navegador guarda as imagens em cache entre versões e o jogo só espera o que precisa para começar.
// Uso: node scripts/build-artifact.mjs [nome] [título]
//   mundo principal: mundoblocos "Orvalis" (padrão; o nome do arquivo segue o do repositório)
//   Santuário:       santuario "Santuário Celestial" (build com VITE_WORLD=santuario)
// Saída: artifact/<nome>.html, artifact/<nome>-assets/* e artifact/<nome>-files.json (mapa para publicar:
// caminho publicado → arquivo local; passe-o em `files` ao publicar a página).
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, copyFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const name = process.argv[2] ?? 'mundoblocos';
const title = process.argv[3] ?? 'Orvalis';
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

// Imagens (e qualquer outro arquivo que não seja JS/CSS) ao lado da página, com o mesmo nome do build.
const outDir = join('artifact', `${name}-assets`);
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const manifest = {};
let total = 0;
for (const f of files) {
  if (f.endsWith('.js') || f.endsWith('.css')) continue;
  copyFileSync(join(assets, f), join(outDir, f));
  manifest[f] = join(outDir, f);
  total += statSync(join(assets, f)).size;
}
writeFileSync(join('artifact', `${name}-files.json`), JSON.stringify(manifest, null, 1));
// Fora do orçamento de início: arte da dungeon e dos monstros (carrega em segundo plano) e folhas de moradores, roupas, expressões,
// animais do campo e filhotes, folhas do Herói, interiores, a tira das paredes e o personagem modular em teste (o jogo não espera por elas: cada um aparece quando a folha chega — render/character.ts).
const later = Object.keys(manifest).filter((f) => /^(dungeon|spider|villager|outfit|expr|horse|cow|chicken|foal|calf|chick|love-hearts|hero-|hood|interior|chibi|crop-|wheat-crop|walls-)/.test(f)).reduce((s, f) => s + statSync(join(assets, f)).size, 0);
const kb = (n) => `${(n / 1024).toFixed(1)} kB`;
console.log(`artifact/${name}.html (${kb(html.length)}) + ${Object.keys(manifest).length} arquivos em ${outDir} (${kb(total)})`);
const start = html.length + total - later;
console.log(`início (página + imagens que o jogo espera): ~${kb(start)} · depois do início: ${kb(later)}`);
// Orçamento (ADR 0013): o que precisa baixar para começar a jogar fica abaixo de 3 MB; o total pode crescer.
if (start > 3 * 1024 * 1024) console.warn(`⚠ início acima do orçamento de 3 MB (${kb(start)}): carregue mais arte em segundo plano`);
