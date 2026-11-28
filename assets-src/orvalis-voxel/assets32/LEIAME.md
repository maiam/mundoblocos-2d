# Assets32px — artes de 32 × 32 px do Drive (Banco de Assets › itens-de-minecraft › `Assets32px`)

Importado em 28/11/2026 (ADR 0143). São as **123** artes de 32 px do pacote que têm correspondente no jogo (o Drive tem 375 no total, a maior parte ainda sem uso: iluminação, velas, fogueiras, lã, vidros, barris, estantes, pedregulho e musgo…). Cada arquivo mantém o nome do Drive (`orvalis_<nome>_32x32.png`); o par de 16 px está em `catalogo/` e `cultivos/` com o mesmo nome (`_16x16.png`).

**Regra (ADR 0143):** o jogo usa a arte de **32 px quando ela existe** e a de **16 px como alternativa padrão** (dobrada por vizinho mais próximo, sem suavizar). Quem decide é cada script de arte, sempre na mesma ordem: 32 px do pacote → 16 px do catálogo.

| O que | Como entra | Script |
|---|---|---|
| Tiles de terreno (tábuas, toras, folhas, pedra, solo, argila, abóbora, melancia, mesa, laje…) | manifesto `tiles.json` (tile → arquivo; `"crop": "baixo"` = a lateral da laje, só a metade de baixo vale) | `make-titan-atlas32.py` (atlas de 32 px) |
| Ícones de bloco (cubo e degrau isométricos) | os mesmos tiles | `make-orvalis-voxel-arte.py` |
| Ícones de item (haste, bola de argila, tijolo, trigo, cenoura, batata, tomate, botes, cerca, portão, porta, alçapão) | `assets-src/titan/arte32/itens.json` (id → arquivo) | `make-titan-arte32.py` + `make-titan-item-masks.py` |
| Degrau e mureta de pedra, degrau/cerca/porta/alçapão de madeira | tira de tiles de 32 px | `make-orvalis-degrau.py`, `make-orvalis-mureta.py`, `make-orvalis-madeira-familia.py`, `make-orvalis-porta-madeira.py` |
| Horta (trigo, cenoura, batata, tomate, beterraba) e caules de abóbora e melancia | atlas de 49 quadros de 32 px | `make-orvalis-horta.py` |

**Fora do jogo (por ora):** lã, vidro, terracota, tapetes, barris, baús, estantes de livros, molduras, placas, camas, velas, fogueiras, lampiões, tochas, lâmpadas e ametistas (sem bloco ou item no Orvalis), as pedras derivadas (pedregulho, musgo, tijolo rachado) e a água (o pacote não traz a água animada). Quando um deles virar bloco ou item, o ADR da entrega diz como a arte entra; esta pasta continua sendo a fonte.
