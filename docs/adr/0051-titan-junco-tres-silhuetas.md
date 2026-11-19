# ADR 0051 — Titã: Junco de Vidro com três silhuetas

**Status:** aceito (arte entregue pelo dono do produto no Drive em 19/11/2026: `Tita_Junco_de_Vidro_Sprites_16px.zip`; docs 02, 03 e 04 do Drive). Estende a ADR 0045.

## Decisão
1. **Atlas** `src/assets/titan-junco-variantes-16px.webp` (48 × 16 px, RGBA, alfa binário, WebP sem perdas): colunas 0, 1 e 2 = **broto baixo**, **haste bifurcada** e **tufo aberto**, 16 × 16 cada, com o pé centrado na linha de baixo. Importado só em `render/art/titan.ts` (`titanReedUrl` agora aponta para ele).
2. **Silhueta por coordenada** (`titan/reeds.ts: reedVariant`, função pura, sem DOM): a mesma célula tem sempre a mesma silhueta, em qualquer sessão. Rotação e tamanho continuam pelo hash anterior.
3. **Renderer:** uma `InstancedMesh` por silhueta (3 no total), mesmo material, mesmo plano 1 × 1 cruzado, âncora na base, balanço leve no shader (`uTime`), `Nearest`, sem mipmaps. Só o UV de cada geometria muda (terço do atlas). `setReeds` reparte as plantas pelos três grupos.
4. **Sem mudar** o domínio: a célula lógica (mira, coleta, queda como item, save, `GENERATOR_VERSION`, `TITAN_SAVE_VERSION`) é a mesma. O ícone do item na hotbar (id 12) continua o do atlas de itens.
5. O sprite antigo (`titan-reed-16px.webp`) deixa de ser importado; o script `make-titan-fabricacao.py` ainda o gera (fonte do ícone), sem entrar no bundle.

## Consequências
- Junco 3D (GLB de 650 triângulos) continua só como referência de arte. Ícone dedicado de chão (lascas) e vagalumes seguem como evolução.
