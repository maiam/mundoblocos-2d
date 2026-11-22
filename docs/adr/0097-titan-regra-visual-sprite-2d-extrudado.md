# ADR 0097 — Titã: regra visual de armas, ferramentas e itens = sprite 2D extrudado de 16 × 16 (v0.158.0)

**Status:** Aceita. Pedido do dono do produto (documento "Técnicas" do Drive e a pasta "Armas, Ferramentas e Itens: Sprite 2D Extrudado", com as artes da Adaga e da Picareta de Rocha e de Cobre e do Balde). **Substitui** os itens 3D na mão dos ADRs 0071 (adaga GLB), 0078 (picareta GLB) e 0095 (balde com malha própria); o resto desses ADRs segue valendo (pose, golpe, som da água).

## A regra
Espadas, picaretas, machados, pás, arcos, maças, nozes e todo item que se segura **não são modelos 3D esculpidos**:
1. Partem de uma **imagem PNG plana de 16 × 16 pixels**.
2. Em tempo real o jogo lê essa grade e cria uma **malha poligonal com 1/16 de bloco de espessura**: frente, verso e **só as bordas laterais externas**, onde o pixel opaco toca o transparente. É um adesivo grosso de 1 pixel de profundidade, nunca cubinhos empilhados.
3. **Exceção** (do documento): o **Tridente** e a **Besta carregada** usam modelos 3D de poucas caixas finas na mão. A categoria `model` de `heldCategory` fica reservada a elas; hoje nenhum item a usa.

## Decisão (implementação)
- **Já era a técnica do ADR 0087** (`titan/extrude.ts`: um quadrado por pixel opaco na frente e no verso, uma tira lateral por vizinho transparente, espessura 1/16, máscara embutida em `itemMasks.json`, nunca lendo canvas). A espessura é 1/16 do item **em qualquer resolução**; o motor aceita a grade de 16 ou de 32.
- **Padrão de arte = 16 × 16** (escolhido pelo dono). Os itens antigos seguem em 32 × 32 até serem redesenhados. `itemMasks.json` ganha `small` (máscaras de 16 × 16) e `itemMask(item)` lê primeiro `small`; o atlas de itens de 32 px recebe a arte de 16 ampliada **2× sem suavização** (a interface continua em escala inteira, ADR 0053).
- **Pipeline:** `scripts/make-titan-sprites16.py` reduz a ilustração do pacote (`assets-src/titan/sprites16/<Nome>_Arte.png`) ao 16 × 16 (recorte da caixa, lado maior a 16 px, erosão de 1 px da franja, média em área com alfa pré-multiplicado, saturação e contraste leves, alfa binário) e grava `assets-src/titan/arte16/*_Item_16px.png` + `itens.json` (id → arquivo); `make-titan-arte32.py` e `make-titan-item-masks.py` leem essa tabela. **Convenção de orientação do Minecraft:** arma e ferramenta na diagonal, **cabo no canto de baixo à esquerda** (o pivô do golpe), então a adaga, que vem com a ponta embaixo, gira 180° no script.
- **Itens convertidos:** Picareta de Rocha (20), Adaga de Rocha (22), Picareta de Cobre (23), Adaga de Cobre (24), Balde de Cobre vazio (35) e cheio (36). Armas e ferramentas na mão são `tool` (sprite extrudado com pivô no cabo; escala 0,34); o balde é item plano.
- **Removido:** os GLB de arquivo na mão (`titan-adaga-rocha.glb`, `titan-picareta-rocha.glb`), o carregador `render/heldItem.ts`, a malha embutida do balde (`HELD_MESHES`, `buildHeldMesh`, `titan-balde*.json`, atlas e o estilo `bucket`), os scripts `export-titan-adaga.py`, `export-titan-picareta.py`, `extract-titan-balde.py` e `make-titan-balde-icone.py`, os ícones de 32 px desses itens e os dois testes que conferiam os GLB. Os GLB de origem do balde ficam em `assets-src/titan/balde/` como referência; o histórico do Git guarda o resto.
- O repouso do estilo `tool` desceu um pouco (y −0,3) e a escala de 0,42 para 0,34 porque os sprites novos ocupam o 16 × 16 inteiro.

## Consequências
- Peso: sai ≈ 700 KB de GLB, JSON e atlas do pacote. Nada novo em save, gerador ou protocolo.
- Arte nova de arma, ferramenta ou item **começa em 16 × 16**: entre na tabela `ITEMS` de `make-titan-sprites16.py` (ou desenhe o PNG de 16 direto em `arte16/` e liste em `itens.json`), rode os três scripts e confira na mão e no inventário. Os sprites atuais são reduções automáticas das ilustrações: o dono pode trocar os PNGs de 16 × 16 por arte feita à mão sem mexer em código.
- Pendências: os estilos de golpe `dagger` e `pick` (afinados para o GLB) ficaram sem uso, pois todas as ferramentas usam `tool`; avaliar poses próprias por tipo (adaga que corta, picareta que desce) com o pivô no cabo; contorno escuro de 1 px nos sprites (hoje sem); arco, machado, pá e maça ainda não existem.
- Testes: `extrude.test.ts` (+3: armas e balde com arte de 16 × 16 e sem modelo; malha = 2 quadrados por pixel opaco + uma tira por vizinho transparente, espessura 1/16, nada interno; a mesma espessura em 16 e em 32); `heldPose.test.ts` sem os dois testes de GLB. Conferido a 740 × 360: os seis itens na mão e no inventário.
