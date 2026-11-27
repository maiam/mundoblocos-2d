// Pacote do multiplayer para o servidor (ADR 0016, 0104 e 0115): src/net/titan/index.ts (+ as regras do Titã que a sala usa) num
// único arquivo CommonJS para Node, sem dependências → dist-net/orvalis-net.cjs. O servidor (maiam/orvalis-servidor)
// copia este arquivo para vendor/ com `npm run sync-net` (ver README dele). O cabeçalho diz de qual versão/commit veio.
import { build } from 'esbuild';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
let commit = 'desconhecido';
try { commit = execSync('git rev-parse --short HEAD').toString().trim(); } catch { /* fora de um repositório git */ }
await build({
  entryPoints: ['src/net/titan/index.ts'],
  outfile: 'dist-net/orvalis-net.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  legalComments: 'none',
  banner: { js: `// Gerado por mundoblocos-2d v${version} (${commit}) — npm run build:net. NÃO EDITE: atualize pelo jogo.` },
});
console.log(`dist-net/orvalis-net.cjs (v${version}, ${commit})`);
