# Operações

- Requisitos: Node 22+, npm.
- `npm run dev` (servidor local), `npm test`, `npm run build` → `dist/` estático (`base: './'`, pode ser
  servido de qualquer subcaminho/CDN).
- `npm run build:artifact` → `artifact/mundoblocos.html` (arquivo único, JS/CSS inline, sem esqueleto `<html>`),
  usado para publicar como Artifact do claude.ai. Versão publicada: https://claude.ai/artifact/FKYk57NzSCjDA4rQH2RgLn
  (privada; compartilhar pelo menu Share). Republicar após mudanças. `artifact/` não é versionado.
- Sprites (requer Pillow e numpy):
  `python3 scripts/process-sprite.py assets-src/heroine-sheet.png src/assets/heroine.png 144`
  `python3 scripts/process-sprite.py assets-src/sheep-sheet.png src/assets/sheep.png 96 23 128`
- Não há variáveis de ambiente nem `env.example` (nenhuma configuração externa necessária).
- Fonte Nunito via Google Fonts (com fallback `system-ui` se offline).
