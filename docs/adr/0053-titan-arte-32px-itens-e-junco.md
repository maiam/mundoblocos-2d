# ADR 0053 — Titã: arte de 32 × 32 px nos itens e no junco

**Status:** aceito (dono do produto, 19/11/2026: pranchas de fragmentos, lanterna e Junco de Vidro em 32 px no Drive; critério da nota "Referência de arte" em `domains/titan.md`). Estende as ADR 0045, 0047 e 0051.

## Decisão
1. **Atlas de itens 128 × 128** (`src/assets/titan-itens-32px.webp`, 4 × 4 células de **32 px**, índice = id do item − 1, WebP sem perdas), gerado por `scripts/make-titan-arte32.py` a partir da base de 16 px (`titan-hotbar-sprites-16px.webp`, de `make-titan-fabricacao.py`) **ampliada 2× pelo vizinho mais próximo** e, por cima, a arte nova de 32 px: **fragmento de rocha (5), fragmento de gelo (6) e lanterna (8)** (`assets-src/titan/arte32/`). Os demais itens seguem com a arte antiga, ampliada, até haver arte nova (densidade de pixel mista, transitória).
2. **Escala inteira sempre.** A interface mostra uma célula de 32 px em **64 px** (desktop e tablet, `--ic: 64px`) ou **32 px** (celular e telas ≤ 820 px de largura ou ≤ 460 px de altura, `--ic: 32px`); a lista de receitas e a prévia usam 32 px (`--icm`). `image-rendering: pixelated`; nunca 1,5×. O slot é `--ic + 8px`.
3. **Junco de Vidro 32 px** (`titan-junco-variantes-32px.webp`, 128 × 32: 3 silhuetas + 1 coluna vazia, `REED_COLUMNS = 4`), no mesmo plano cruzado, âncora e balanço da ADR 0051; `Nearest`, sem mipmaps. O ícone do item na hotbar (id 12) ainda é o antigo.
4. **Drops no mundo** (lascas) leem o mesmo atlas por UV normalizado (4 × 4): ganham a arte nova sem mudar o renderer.
5. **Sem mudar** ids, `TITAN_SAVE_VERSION` ou `GENERATOR_VERSION`. O piloto de ícones 3/4 (laje, mesa, lanterna 16 px) segue não integrado; a lanterna de 32 px o substitui no item 8.

## Consequências
- Itens 1–4, 7, 9–13 ainda em 16 px ampliado: próximas rodadas de arte. Os arquivos de 16 px do junco e do item antigo (`titan-reed-16px.webp`, atlas de 16 px) deixam de ser importados.
- Desktop/tablet: slots de 72 px (hotbar de ~700 px); conferido a 740 × 360, 1024 × 768 e 1280 × 720, sem estouro do painel.
