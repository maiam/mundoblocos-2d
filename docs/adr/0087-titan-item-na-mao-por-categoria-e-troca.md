# ADR 0087 — Titã: item na mão por categoria e animação de troca (v0.148.0)

**Status:** Aceita. Pedido do dono do produto (especificação de exibição na mão do Minecraft); escopo escolhido: as 4 categorias + a troca. Estende as ADRs 0071 e 0078 (item na mão por GLB).

## Decisão
1. **Categorias** (`titan/heldKinds.ts`, puro; o renderer pergunta sempre por `heldCategory`): **mão vazia** (braço de 0,25 × 0,75 × 0,25, base no ombro), **bloco** (cubo de 0,22 com as texturas do terreno do bloco que o item coloca, girado 45°; só cubo inteiro: `heldBlockOf`), **item plano** (sprite extrudado, escala 0,28, quase de frente: comida, fragmentos, lingote, esteira, lanterna, mesa, laje, Marco, Painel) e **ferramenta** (sprite extrudado com o **pivô no cabo**, escala 0,42: as ferramentas de cobre) e **modelo** (GLB próprio: Adaga e Picareta de Rocha, como antes). Tamanhos menores que os 0,4 e 0,68 do Minecraft porque a câmera da mão do Titã é mais aberta.
2. **Extrusão sem ler canvas** (`titan/extrude.ts`, puro): frente e verso por pixel opaco mais a tirinha lateral onde o vizinho é transparente, espessura 1/16 (como no ItemModelGenerator). A máscara de pixels vem de `src/titan/itemMasks.json`, gerado por `scripts/make-titan-item-masks.py` a partir do atlas de itens (alfa > 128, 8 KB); ler `getImageData` no jogo é proibido (pode ser bloqueado no Artifact). As UVs apontam para a célula do item no atlas de itens existente, sem textura nova. **Ícone novo ou trocado → rode `make-titan-arte32.py` e depois `make-titan-item-masks.py`.**
3. **Pose:** `HandKind` ganha `hand`, `block`, `flat` e `tool`, com repouso e amplitudes de golpe em `STYLES`; as curvas de golpe e o balanço são os de sempre. Malhas feitas uma vez por item e guardadas (`held`); o bloco reaproveita o material do terreno e o resto usa um material próprio de luz do dia (`patchDayLight`).
4. **Troca de item** (`EquipAnim`, puro): o antigo afunda 0,6 m em 0,12 s, a troca acontece no fundo e o novo sobe em 0,15 s; trocar de novo no meio da subida volta a afundar sem salto. A primeira escolha da partida não anima.

## Consequências
- Mão vazia e todos os itens passam a aparecer; custo: ~31 malhas pequenas sob demanda (até ~3.000 triângulos cada, só uma desenhada).
- Pendências: ajuste fino de poses no toque real; o braço usa uma cor de pele provisória; item novo com ícone em atlas novo exige regerar a máscara.
- Testes: `extrude.test.ts` (+8: máscara, quadrados, orçamento por item, categorias, tiles) e `heldPose.test.ts` (+4: troca e estilos). Conferido a 740 × 360: cubos, planos, ferramentas de cobre, Adaga e mão vazia.
