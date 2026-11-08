# ADR 0023 — Padrão de Materiais V2: texturas planas, geometria do motor

- **Status:** aceita; **em validação** (Etapas 0 e 1 na v0.81.0; frente decidida na v0.81.1: **18**; o jogo continua
  no atlas legado)
- **Data:** 2026-11-07
- **Pedido:** o dono do produto e a área de arte definiram o "Padrão Oficial de Materiais e Blocos V2" (pacote em
  [`docs/materiais-v2/`](../materiais-v2/README.md)). O dono aprovou a recomendação de implementar por etapas, comparando
  frente 16 × 18 numa cena antes de decidir.
- **Substitui em parte:** ADR 0006 (materiais tirados da prancha de cubos 3/4) — vale para os materiais ainda não
  migrados.

## Decisão

1. **A arte entrega material, não cubo.** Cada material é uma pasta `assets-src/materiais/<material>/` com PNGs
   128×128: `top.png` (repetível nos 4 lados), `front.png` opcional (também seamless nas 4 bordas, usada inteira e
   fatiada por nível; **sem ela a frente repete o topo**) e, opcional, `front_overlay.png` (franja com alfa nos **32 px** de cima da janela). Contrato: `assets-src/materiais/CONTRATO.md`.
2. **O motor monta a geometria.** `composeCube(drawTop, drawFront, outline)`: topo 32×32, frente `CUBE_FRONT` = **18**
   px, âncora na base da frente (`oy = -18`). Ordem interna: frente → franja → sombra da
   frente → topo → aresta/contorno (contrato de geometria § 5). Chão plano desenha só o topo.
3. **Pipeline único:** `scripts/build-materials.py` valida (tamanho, opacidade, franja, emenda relativa) e gera
   `src/assets/materials-v2.webp` + `materials-v2.json` (linhas `top` 64, `front` 36, `overlay` 36). Franja acima de
   32 px é recusada (`import-material.py --fit-fringe` guarda os 32 px de baixo do desenho).
4. **Composição por bloco em `render/materialsV2.ts` (`V2_BLOCKS`)**: topo, frente e franja podem vir de materiais
   diferentes (grama = topo de grama + frente de terra + franja de grama). É aparência: regras do bloco seguem em
   `world/blocks.ts`.
5. **Validação atrás de chave**: `?blocos=v2` troca chão e cubo dos blocos-piloto (areia, terra, grama, Pedra Bruta) no mundo, com a
   frente de 18; `?materiais=1` (só em desenvolvimento, `dev/materialsScene.ts`) põe legado e V2 lado a lado. Sem chave o atlas V2 nem baixa.
6. **Transições horizontais (Etapa 3) só na camada de chão plano**, entre topos da mesma altura; nunca sobre o topo de
   cubos empilhados (onde há degrau vale borda/relevo, não máscara). As máscaras das 47 combinações saem de **~13
   formas desenhadas**, giradas/espelhadas pelo script: **máscara é forma, não textura** (exceção registrada em
   CONVENTIONS à regra "texturas sempre na direção desenhada").

## Decisões do dono do produto (2026-11-07, v0.81.1)

- **Frente fica em 18** (o pacote propunha 16). Na cena lado a lado a diferença é de 2 px por nível (pilha de 3: 86 ×
  80 px) e não se notou; o ganho do 16 era só a janela 2:1 do pipeline, resolvida lendo 128×72. Mudar custaria rever
  câmera, elevação, portas, paredes, cerca, celestiais e a ADR 0022. Cada fatia da frente tem 72 linhas da fonte (64×36 no
  atlas, 32×18 no mundo); a franja continua até 32 px da fonte (8 px no mundo).
- **Franja da grama reduzida ao padrão de 32 px** (veio com 60).
- **Sem frente própria, a frente sempre repete o topo** (regra geral, no pipeline).

## Massa contínua de cubos (2026-11-07, v0.82.0)

Pedido do dono do produto: cubos vizinhos e níveis empilhados não podem mostrar riscos entre si, nem na vertical nem na
horizontal, nem entre materiais diferentes. Só os blocos V2:

- **O contorno é da silhueta da massa, não de cada cubo.** `cubeEdges` (`render/materialsV2.ts`, puro e testado) decide
  por cubo, olhando altura e material dos vizinhos, em quais lados há contorno, filete de luz e canto arredondado:
  - no topo, só nas bordas (norte, oeste, leste) cujo vizinho **não é V2 no mesmo plano**; um platô de 6×2 cubos vira
    uma superfície só;
  - na frente, só nas laterais cujo vizinho não continua a frente; o pé (`base`) só no nível 0; entre níveis não há linha;
  - **material diferente também some** (pedra sobre terra, terra ao lado de areia); vizinho que não é V2 (bloco antigo)
    mantém o contorno;
  - ficam a aresta clara entre o topo e a frente do mesmo cubo (o "vinco") e o contorno em degraus (a borda do mais
    baixo com o mais alto).
- **Frente contínua na vertical**: `front.png` é uma textura seamless nas 4 bordas usada **inteira**; cada nível lê uma
  fatia de 72 linhas (18 px no mundo), o de baixo no começo e cada um acima na fatia anterior, voltando ao fim da
  textura. Colocar um bloco em cima não muda os de baixo. A franja (grama) só vai no nível mais alto.
- **Desenho sem fresta**: `cubeSpriteV2` (variantes em cache por bloco, nível e bordas) e `drawCubeParts` desenham
  topo e frente com bordas arredondadas iguais às dos vizinhos; esticar o sprite inteiro deixava uma linha do topo do
  nível de baixo aparecendo sob o de cima. O nível coberto não desenha o topo, e sim a continuação da parede.
- Custo medido: nenhum perceptível (81 cubos na tela, 60 quadros por segundo nos dois caminhos). As bordas são lidas do
  mundo a cada quadro, então colocar ou quebrar um bloco atualiza os vizinhos sem invalidar nada.
- **Chão V2 sem grade por célula** (v0.82.1): as linhas fracas em cada célula do chão vinham da "grade sutil de
  blocos" que o `chunkRenderer` desenha sobre todo chão (1 px por célula, alfa 0,07), não da arte. `continuousGround`
  (em `BlockTextures`) lista os chãos V2 e o `chunkRenderer` não desenha a grade neles; o chão antigo mantém a grade.
- Caminho de Terra e Terra Arada entram como blocos V2 (só o topo; a frente repete o topo). Blocos antigos seguem como
  são até migrar.

## Por que assim

- O pacote pede compatibilidade gradual e reversível (01, "Reversibilidade"; 05, Fase D): a chave mantém o jogo
  intacto e deixa comparar no próprio motor.
- Frente 16 × 18 é escolha artística (01, "Por que 16?"): decidir olhando a cena, não a prancha. Mudar `CUBE_FRONT`
  afeta câmera, empilhamento, portas, paredes e celestiais (usos listados em NEXT_STEPS, Fase V).
- Misturar só no chão plano evita a máscara atravessar degraus (04, § 5) e mantém o custo no cache do chunk.

## Relação com a ADR 0022

A ADR 0022 (escala visual) fixa `CUBE_FRONT` 18 e criou a cena `?escala=1` com o renderizador real. Esta ADR não muda
nada disso: com a frente decidida em 18 (v0.81.1), as duas ADRs ficam alinhadas.

## Consequências

- `composeCube` não mudou de assinatura (o parâmetro de altura da frente usado na comparação saiu com a decisão).
- A arte oficial de terra, grama (com franja), areia e Pedra Bruta chegou na mesma versão (`scripts/import-material.py`);
  `make-provisional-materials.py` fica para testar materiais futuros antes da arte.
- O atlas V2 sai **sem perdas** e reduzido como ladrilho (o WebP com perdas e a redução do quadro solto criavam fio nas
  emendas). É pequeno (~42 kB) e fora do orçamento de início enquanto a chave estiver desligada.
- Pendências: frentes próprias quando a arte quiser, transições (Etapa 3), migração por lotes e retirada do atlas legado (Etapa 5).
