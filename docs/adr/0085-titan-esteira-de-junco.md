# ADR 0085 — Titã: Esteira de Junco (v0.146.0)

**Status:** Aceita. Etapa 3 da rodada "cultivo e oficina da Margem" (ADR 0083, 0084). Decisão do dono do produto: usar como referência as placas de pressão do Minecraft **sem** as regras de pressão.

## Decisão
1. **Bloco `T.MAT` (id 30) e item `Item.ESTEIRA` (id 31):** peça fina de piso de **1/16 m** (`MAT_HEIGHT`). Entra na **malha do terreno** (não é modelo 3D): topo = trama seamless, laterais = a faixa de cima da borda (`half = 3` do `Builder`). Tiles novos no fim do `tiles.json` (`20-esteira-de-junco/topo` e `lateral`; 43 tiles); `T_MAX` e `isItem` sobem para 30 e 31.
2. **Sem colisão:** `isSolid` é falso (como a lanterna e o Marco): o corpo e os animais atravessam, `blockSpan` = [0, 0]. É **alvo da mira** pela própria caixa fina (`raycast` acerta só a faixa de 1/16 m; o raio passa por cima e por baixo), ocupa a célula (não se coloca outro bloco nela) e **não bloqueia luz**. Quebra rápida (0,35 s, `isCollectBlock`) e devolve a esteira como item solto (ADR 0082).
3. **Apoio (`matSupported`):** só se coloca sobre piso firme (cubo inteiro, laje superior ou dupla; laje inferior e ar não servem). Quebrar o piso derruba a esteira como item solto (`releaseMat`).
4. **Receita** `esteira` na Mesa de Trabalho: 3 Hastes Secas → 1 (grupo Construção). Som de areia. **Sem sinal nem detecção de entidades**: nada das placas de pressão além da geometria e do apoio.
5. **Ícone provisório** (`scripts/make-titan-esteira-icone.py`: a trama projetada em losango com 3 px de espessura; entra no atlas por `make-titan-arte32.py`). O desenho final do dono do produto pode trocar o arquivo.

## Consequências
- A largura é a célula inteira (peças vizinhas formam piso contínuo e escondem a lateral entre si); a esteira não tem variação de giro (a trama é seamless).
- Pendências: aceite no toque (mirar numa peça tão fina; a folga de toque vale só para cima); ícone final.
- Testes: `esteira.test.ts` (+8: propriedades, receita, apoio, mira fina, malha, quebra/queda, save); `mesher`, `margem` e `recipes` ajustados (43 tiles, item 31, catálogo). Conferido a 740 × 360: piso 3 × 3 com a lateral fina e o ícone na hotbar.
