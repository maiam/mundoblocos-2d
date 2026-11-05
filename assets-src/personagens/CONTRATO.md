# Contrato de arte de personagens modulares — v02

Fechado em 05/11/2026 entre a área de arte e o motor (ADR 0017). Vale para o **humano chibi v02** em diante.
É um contrato **de piloto**: o primeiro conjunto testado no cenário pode ajustar números marcados como
_provisório_; qualquer ajuste é registrado aqui e em `contrato.json` (subir a versão do contrato).

A parte que máquina lê fica em `humano-chibi/entrega/v02/contrato.json`; o catálogo de peças em
`humano-chibi/catalogo.json`. O validador/exportador é `scripts/export-personagem.py` (`docs/OPERATIONS.md`).

## 1. Pastas

```
assets-src/personagens/
  CONTRATO.md                  este documento (versionado)
  humano-chibi/
    README.md                  índice da coleção (versionado)
    catalogo.json              peças, partes, ações prontas e status (versionado)
    entrega/v02/               PNGs no contrato + contrato.json — o que o jogo pode usar (versionado)
    previas/v02/               comparações e animações escolhidas, cada arquivo ≤ 1 MB (versionado)
    _trabalho/v02/             Krita, ORA, prompts, estudos, intermediários (NÃO sobe para o git)
    _arquivo/v01/              histórico v01 completo (NÃO sobe para o git)
```

- A arte **trabalha em `_trabalho/`, publica em `entrega/` e atualiza `catalogo.json`**. Só o que está em
  `entrega/` pode ir para o jogo.
- `_trabalho/` e `_arquivo/` existem só no computador da arte: **manter cópia em nuvem** (Drive/iCloud).
- `.kra`, `.ora` e autosaves nunca sobem, em qualquer pasta (proteção no `.gitignore`). O `.gitignore` não filtra
  por tamanho: o limite de 1 MB das prévias é conferido pelo validador.

## 2. Quadro, âncora e escala

- **Quadro mestre: 384 × 512 px**, PNG RGBA transparente, sem fundo e **sem sombra** (o jogo desenha a sombra).
- **Âncora: (192, 471)** = raiz que prende o personagem ao mundo (o ponto do chão sob o personagem). Não é a
  borda inferior do desenho: pés, corpo e cabeça se movem dentro do quadro conforme a pose. Regra: **nos quadros
  de contato, o pé de apoio toca a linha y = 471**, e o personagem não sobe nem desce aos poucos ao longo do ciclo.
- **Escala fixa do mestre** (não depende do recorte): o corpo-base de pé, do topo da cabeça (sem cabelo) à sola,
  mede **360 px** no mestre e vale **2,2 células** no mundo (mesma altura da heroína atual) — _provisório_.
  Todos os quadros de todas as peças usam essa escala; o exportador a preserva.
- **Área habitual do corpo** (referência para desenhar, não limite): x 112–272, y 96–480.
- **Limite rígido**: a **caixa da ação** em `contrato.json` (dentro do quadro). Uma caixa por ação, comum a todas
  as direções, quadros e peças. O validador **recusa** a peça com pixel fora da caixa; aumentar a caixa é decisão
  explícita (muda tamanho da imagem e deslocamento da âncora, exige reexportar a ação inteira — a escala não muda).

## 3. Direções, ações e tempo

- Atlas por parte e ação: **uma linha por direção, nesta ordem: frente, esquerda, direita, costas**; uma coluna por
  quadro. Tamanho = (384 × quadros) × (512 × 4).
- Cada direção é **desenhada de verdade** (nada de espelhar): repartido do cabelo e itens na mão mudam de lado.
- Cada ação declara no `contrato.json`: número de quadros, quadros por segundo (**uniforme na ação**), se repete em
  ciclo, caixa e quadros de contato. Ações iniciais (_provisório_):

| Ação | Quadros | Velocidade | Ciclo |
|---|---|---|---|
| `caminhada` | 8 | 8/s | sim |
| `repouso` | 16 (2 s) | 8/s | sim |

- Piscada, expressões, transições e ferramentas vêm depois do piloto; não bloqueiam o primeiro teste.

## 4. Encaixes, peças e partes (três tipos de nome)

| Tipo | O que é | Exemplos |
|---|---|---|
| **Encaixe** | onde a peça vai no personagem | `corpo`, `cabelo`, `tronco`, `pernas`, `pes`, `maos` |
| **Peça** | item do catálogo, num encaixe | `base`, `curto-castanho`, `blusa-ocre`, `shorts-marinho` |
| **Parte** | camada de desenho que a peça fornece | `cabelo-tras`, `cabelo-frente`, `tronco`, `tronco-frente` |

Partes anatômicas (`antebraco_E` etc.) são de um rig futuro e não aparecem nos nomes de entrega.

- Uma peça fornece uma ou mais partes. Ex.: `cabelo/curto-castanho` → `cabelo-tras` + `cabelo-frente`;
  `corpo/base` → `corpo` + `cabeca`. Quem não tem uma parte simplesmente não a fornece.
- **A ordem de desenho é das partes, não das peças**: `contrato.json` → `ordem` (de trás para a frente). Uma direção
  pode ter ordem própria (`ordemPorDirecao`), valendo para a direção inteira. **Nunca muda quadro a quadro**: se uma
  peça cruza o corpo dentro da mesma direção (manga diante do braço, item na mão), ela é dividida em parte de trás e
  parte da frente (`tronco` + `tronco-frente`).
- Parte nova = entra primeiro na lista `ordem` do contrato (o validador recusa parte desconhecida).
- Ordem inicial (_provisório_, confirmada pelo piloto): `cabelo-tras`, `corpo`, `pes`, `pernas`, `tronco`,
  `tronco-frente`, `cabeca`, `rosto`, `cabelo-frente`.
- O corpo-base é **neutro**: não traz roupa embutida (nada da regata/shorts verdes do v01); roupa só por peça.

## 5. Arquivos

```
entrega/v02/<encaixe>/<peca>/<acao>__<parte>.png
ex.: entrega/v02/cabelo/curto-castanho/caminhada__cabelo-frente.png
     entrega/v02/corpo/base/repouso__cabeca.png
```

Nomes em minúsculas, sem acento, palavras separadas por hífen. Cada peça listada em `catalogo.json` com encaixe,
partes, ações entregues e status (`rascunho`, `revisao`, `aprovada`).

## 6. Contato dos pés

A arte indica, em `contrato.json` → ação → `contato`, cada quadro de contato: direção, quadro, **qual pé** (`E`/`D`,
lado anatômico do personagem) e uma **caixa em volta desse pé** no mestre. O validador confere que o pixel mais baixo
do corpo-base (com cada peça de `pes`) **dentro dessa caixa** fica a até **±2 px da linha 471, medido no mestre**.
Qual pé apoia, deslizamento e qualidade da marcha continuam sendo **revisão visual**.

## 7. Exportação (feita pelo motor, não pela arte)

`scripts/export-personagem.py` valida a entrega e gera, por parte e ação, uma folha WebP recortada na caixa da ação
e reduzida (`escalaExportacao`), mais um `manifesto.json` com tamanho do quadro, âncora já deslocada pelo recorte,
escala de mundo, quadros, velocidade, ciclo e ordem. O motor desenha cada quadro no **tamanho dele × escala**,
nunca esticando o quadro para uma altura fixa.

Até o piloto aprovar, a exportação não entra em `src/assets/` nem no carregamento do jogo.

## 8. Sequência

1. Contrato + exportador mínimo (este passo).
2. Piloto artístico: corpo-base neutro + caminhada nas 4 direções; um cabelo (trás/frente), um tronco, umas pernas,
   um par de pés.
3. Teste no cenário (escala, perspectiva, encaixe) — pode acontecer só com a caminhada.
4. Ajustes do contrato (subir versão).
5. Repousos e transições; ampliar a biblioteca; ferramentas por último.
