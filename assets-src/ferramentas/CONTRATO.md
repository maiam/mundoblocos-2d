# Contrato de arte das ferramentas — v01

Fechado em 06/11/2026 entre a área de arte e o motor (ADR 0018). Vale para **toda ferramenta nova ou nível novo de
ferramenta** (madeira, pedra, presa, Coração da Rainha…) antes de ela entrar no jogo. Números marcados _provisório_
podem mudar no primeiro piloto; qualquer ajuste é registrado aqui e no `catalogo.json` (sobe a versão do contrato).

## 1. Por que este contrato existe (análise da entrega de 06/11/2026)

Chegaram 5 pranchas de ícones: **madeira**, **madeira + Coração da Rainha**, **madeira + presa**,
**presa + Coração da Rainha** e **pedra + madeira** (esta não estava na lista do pedido). Em cada uma: machado,
espada, enxada, pá e picareta. Elas **podem entrar como ícones** (bolsa, grade, itens caídos), mas **não entram no
movimento**:

- No jogo de hoje a ferramenta na mão **não é uma camada**: ela vem pintada junto com a heroína em cada folha
  (`heroine-<ferramenta>.webp` para andar segurando e `heroine-<ferramenta>-attack.webp` para o golpe, 4×4 quadros
  cada, nas 4 direções). Um nível novo exigiria redesenhar **10 folhas da heroína inteira por nível** (5 ferramentas ×
  andar + golpe), e de novo para cada personagem futuro.
- O chibi modular (ADR 0017) ainda não tem ferramenta nenhuma.
- As pranchas não seguem um formato comum: ordem e arranjo diferentes (fileira única × 3 + 2), ferramentas ora
  na diagonal, ora em pé, escala diferente entre níveis, e a de pedra veio com fundo enevoado. A enxada dos níveis
  de presa parece uma foice (confunde com outra ferramenta).

Por isso a ferramenta passa a ser **um item com ficha de dados + ícone + camada de mão**, desenhada uma vez por
nível e reaproveitada por qualquer personagem que siga a grade de poses.

## 2. Ficha de dados de cada ferramenta (o que a arte entrega junto com os desenhos)

Cada ferramenta é a combinação **tipo × material**. O id é `<tipo>-<material>` (minúsculas, sem acento, hífen).

| Campo | O que é | Exemplo |
|---|---|---|
| `tipo` | um dos 5 tipos do jogo: `machado`, `espada`, `enxada`, `pa`, `picareta` | `machado` |
| `material` | nível: `madeira`, `pedra`, `madeira-presa`, `madeira-coracao`, `presa-coracao` (novo nível = nova linha no catálogo) | `madeira-presa` |
| `nome` | nome no jogo (pt-BR) | `Machado de Presa` |
| `receita` | ingredientes propostos (o dono do produto confirma) | 3 Tábuas + 2 Presas |
| `status` | `rascunho`, `revisao`, `aprovada` | `revisao` |
| `arquivos` | ícone e camadas de mão entregues (seção 4) | — |

Os **números de jogo** (poder do golpe, velocidade de quebra, durabilidade) **não são da arte**: ficam em
`src/world/items.ts` e `src/world/progression.ts`, decididos pelo dono do produto. A arte só garante que o desenho
de cada nível é reconhecível (mesma silhueta do tipo, material diferente).

O que **cada tipo faz** não muda com o material (fonte de verdade: `TOOLS` em `src/world/items.ts`):

| Tipo | Ação no jogo | Golpe/animação |
|---|---|---|
| Machado | golpeia animais/monstros; corta madeira, árvores e plantas | golpe por cima (machado erguido) |
| Espada | golpeia animais/monstros; não quebra nada | golpe em arco |
| Enxada | ara terra/grama; quebra plantas | arar (lâmina para baixo, perpendicular ao cabo) |
| Pá | vira caminho de terra; cava terra/areia | cavar |
| Picareta | quebra pedra e blocos (menos madeira) | minerar (picareta erguida) |

## 3. Ícone (bolsa, grade, item caído)

- **Uma prancha por material**, PNG RGBA transparente, **sem fundo e sem sombra**, **5 ferramentas numa fileira, nesta
  ordem: machado, espada, enxada, pá, picareta**, com espaço vazio entre elas (nenhum pixel encostando no vizinho).
- **Todas em pé**, cabeça da ferramenta para cima, cabo para baixo (como a prancha de madeira enviada) — mesma
  orientação em todos os níveis.
- **Mesma escala entre níveis**: o cabo de cada tipo tem o mesmo comprimento em todas as pranchas (as diferenças de
  material ficam na cabeça/lâmina). Referência _provisória_: célula de 300 × 420 px por ferramenta.
- Alfa limpo: nada de névoa, brilho fraco ou pontinhos no fundo (o motor apaga alfa < 60, mas névoa forte como a da
  prancha de pedra precisa ser limpa na origem).
- Arquivo: `assets-src/ferramentas/icones/<material>.png`. O motor recorta cada ícone para 64 × 64.

## 4. Ferramenta na mão (andar segurando e golpe) — camada, não personagem

A ferramenta é desenhada **sozinha**, numa folha transparente **com a mesma grade, o mesmo quadro e a mesma âncora
da pose do personagem**, para ser empilhada sobre ele:

- **Pose-base sem ferramenta** (entregue uma vez por personagem e ação): o personagem fazendo o gesto com a mão
  fechada vazia. Para a heroína, as 10 poses atuais sem a ferramenta pintada; para o chibi, as ações do contrato
  v02/v03 (`assets-src/personagens/CONTRATO.md`).
- **Camadas da ferramenta** por material e tipo, uma folha por ação, mesma grade da pose:
  - `andar` (segurando): 4 quadros × 4 direções (frente, esquerda, direita, costas) — heroína; 8 × 4 no chibi.
  - `golpe`: os quadros da ação do tipo (machado, espada, enxada, pá, picareta), 4 direções.
  - Duas partes quando a ferramenta passa por trás do corpo: `ferramenta-tras` (desenhada antes do personagem) e
    `ferramenta-frente` (depois). A ordem vale para a direção inteira, nunca muda quadro a quadro (mesma regra de
    `tronco`/`tronco-frente`).
- **Cada direção desenhada de verdade** (nada de espelhar: a mão que segura muda de lado).
- O pixel da ferramenta tem que encaixar na mão da pose-base em todos os quadros (a mão fecha sobre o cabo).
- Escala e âncora: as da folha da pose (heroína: quadro da folha atual; chibi: mestre 384 × 512, âncora (192, 471),
  caixa da ação no `contrato.json`). Golpes que levantam a ferramenta acima da cabeça precisam de **caixa maior na
  ação** (a picareta da heroína chega a 362/288 da altura) — isso é decidido no contrato da ação, não por ferramenta.

Arquivos:

```
assets-src/ferramentas/
  CONTRATO.md                         este documento
  catalogo.json                       materiais, tipos, nomes, receitas propostas e status
  icones/<material>.png               prancha de ícones (seção 3)
  mao/<personagem>/<material>/<tipo>/<acao>__<parte>.png
     ex.: mao/heroina/madeira-presa/machado/andar__ferramenta-frente.png
          mao/chibi/madeira/picareta/golpe__ferramenta-tras.png
  entrega-AAAA-MM-DD/                 pranchas recebidas como vieram (histórico, referência)
```

## 5. Checagem antes de pedir para entrar no jogo

1. Ficha preenchida no `catalogo.json` (tipo, material, nome, receita proposta, status).
2. Prancha de ícones no formato da seção 3 (ordem, em pé, escala, alfa limpo).
3. Camadas de mão das ações `andar` e `golpe` do tipo, para o personagem jogável alvo, alinhadas à pose-base.
4. Prévia (GIF/PNG ≤ 1 MB) do personagem andando e golpeando com a ferramenta nas 4 direções.
5. Só então o motor importa: ícone → `toolIcons`; camadas → render por cima da pose; números → `items.ts`/
   `progression.ts`. Sem o item 3, a ferramenta pode entrar **só como ícone/receita**, desenhada na mão com a arte do
   tipo atual — e isso fica avisado no CHANGELOG.

## 6. Sequência sugerida

1. Arte refaz as 5 pranchas de ícones no formato da seção 3 (as enviadas servem de base de estilo).
2. Pose-base sem ferramenta da heroína (10 folhas) ou, se o chibi virar o personagem principal antes, as poses
   de ação do chibi (contrato v03).
3. Camadas de mão do nível **madeira** (piloto) → motor liga a camada → conferência no cenário.
4. Demais níveis só como camadas (cada nível novo = 5 ícones + camadas, sem redesenhar personagem).
