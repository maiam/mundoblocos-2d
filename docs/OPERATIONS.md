# Operações

- Requisitos: Node 22+, npm.
- `npm run dev` (servidor local), `npm test`, `npm run build` → `dist/` estático (`base: './'`, pode ser
  servido de qualquer subcaminho/CDN).
- `npm run build:artifact` → `artifact/mundoblocos.html` (arquivo único, JS/CSS inline, sem esqueleto `<html>`),
  usado para publicar como Artifact do claude.ai. Versão publicada: https://claude.ai/artifact/FKYk57NzSCjDA4rQH2RgLn
  (privada; compartilhar pelo menu Share). Republicar após mudanças. `artifact/` não é versionado.
- Sprite da personagem: `python3 scripts/process-sprite.py` (requer Pillow e numpy) regenera
  `src/assets/heroine.png` a partir de `assets-src/heroine-sheet.png`.
- Não há variáveis de ambiente nem `env.example` (nenhuma configuração externa necessária).
- Fonte Nunito via Google Fonts (com fallback `system-ui` se offline).
