# ADR 0007 — Assets em WebP

**Status:** aceito (2026-11-02)

## Contexto
Os sprites entram embutidos no bundle (`?inline`) para o build de arquivo único do Artifact. Em PNG somavam
3,4 MB, e o artefato chegou a 4,7 MB (base64), o que pesa no carregamento pelo celular.

## Decisão
- Os scripts de arte continuam gerando PNG (ferramentas e inspeção simples); `scripts/optimize-assets.py`
  converte `src/assets/*.png` em WebP e remove os PNG.
- Sprites e atlas: WebP com perdas q90 e alfa sem perdas (comparação lado a lado sem diferença visível);
  ícones: WebP sem perdas.
- O código importa só `*.webp?inline` (desde a ADR 0010, apenas nos pacotes `render/art/<mundo>.ts`; sprites em q84/alfa q85). Os ícones do PWA (`public/`) seguem em PNG por compatibilidade.

## Consequências
- Assets: 3,4 MB → 1,1 MB; artefato: 4,7 MB → 1,5 MB.
- Esquecer o passo de otimização deixa PNG soltos que o código não importa: está no `CLAUDE.md` e no
  pipeline de `OPERATIONS.md`.
- Navegadores sem WebP (muito antigos) não são alvo.
