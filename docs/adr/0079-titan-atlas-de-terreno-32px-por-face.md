# ADR 0079 — Titã: atlas de terreno de 32 px com textura própria por face (v0.138.0)

**Status:** Aceita. Arte do dono do produto (pasta "Pranchas individuais de texturas" do Drive: 19 blocos em 32 × 32 px, cada um com topo, lateral e base próprios e amostras de emenda). Decisão do dono do produto: **as texturas de 32 px substituem também os blocos existentes**. Estende o ADR 0053 (itens em 32 px) ao terreno.

## Decisão
1. **Atlas novo** (`src/assets/titan-atlas-32px.webp`, 288 × 216 px, **42 KB**): 8 colunas, tile de 32 px com 2 px de borda duplicada (passo 36), WebP sem perdas, filtro Nearest (como antes). `scripts/make-titan-atlas32.py` o monta a partir das texturas planas (`assets-src/titan/texturas32/`, cópia do ZIP do Drive) e de `src/titan/tiles.json`, que guarda a **ordem dos 41 tiles** e é lida pelo script **e** pelo TypeScript (`voxel.ts`, `mesher.ts`): uma só fonte da ordem.
2. **Textura por face:** `tileFor(id, face)` devolve o tile de topo, lateral ou base de cada bloco (`BLOCK_TILES`; `tileIndex(nome)` pelo nome do tile, que falha cedo se o nome não existe). Substitui o atlas de 16 px, com um tile por bloco, em **todos** os blocos do terreno: areia ocre e úmida, rocha escura, gelo fosco, rocha-mãe, rocha e gelo com veio, veio de cobre, depósito de brasa, revestimento de carapaça, braseiro (lateral comum aos dois estados, topos apagado e aceso), veio de âmbar e bloco de âmbar compactado (que trocam a arte provisória do ADR 0073).
3. **Laje** (`11-laje-de-rocha`): topo 32 × 32 e lateral 32 × 16, guardada na **metade de cima** do tile (o mesher já usa os 16 px de cima na laje de meia altura); a laje dupla é da família da rocha escura (cubo com as texturas dela). A rocha-mãe é só mais escura (`TINT`).
4. **Fora do atlas** (decisão registrada): o **Lago Escuro** segue com o atlas próprio de 32 px do ADR 0057 (o pacote novo traz superfície A/B e vista de baixo, sem a lateral exposta; trocar exige decisão de arte); a **Mesa, a lanterna, o Marco e o Painel** são modelos 3D com UV próprio (as amostras do pacote são só materiais). O atlas de 16 px (`titan-atlas-16px.webp`) fica no repositório só como legado dos scripts antigos (não é mais carregado).

## Revisão (v0.142.0)
O dono do produto revisou **Areia Ocre, Areia Úmida, Rocha Escura e Rocha com Veio** (texturas seamless: bordas opostas coincidem nos dois eixos; o veio termina no interior da face). Os 12 PNGs desses blocos em `assets-src/titan/texturas32/` foram trocados e o atlas regravado (44 KB). Nenhuma regra mudou; `tiles.json` e os nomes são os mesmos. Na v0.143.0 a **Laje de Rocha Escura** também foi revista (`11-laje-de-rocha/topo` e `lateral`; a `base` fica só como fonte).

## Consequências
- Mais definição em todo o terreno, com a mesma contagem de triângulos; o custo é o atlas (42 KB e ~0,25 MB de textura na GPU).
- Pendências: aceite visual em aparelho e à noite (luz de lanterna sobre as texturas novas); trocar as texturas dos modelos 3D e o lago quando houver UV e a lateral; os scripts `make-titan-veins/veio-cobre/braseiro/ambar.py` ficam como histórico.
- Testes: `mesher.test.ts` (UV no atlas novo e tiles únicos) e os testes de `tileFor` por nome. Conferido a 740 × 360: fileira com rocha, gelo, rocha-mãe, veios, cobre, depósito, laje, carapaça e braseiro, e o terreno da chegada.
